"""
Multi-Timeframe Orchestrator service.

Runs independent TA analyses for each requested timeframe in parallel,
then aggregates results into a weighted Confluence Score.

News Agent runs only ONCE (news is timeframe-agnostic).
Risk Agent uses the primary timeframe's result for position sizing.

Architecture note:
  - Each timeframe spawns a lightweight crew with: DataAgent + TAAgent only.
  - A shared NewsAgent + RiskAgent run once on the primary timeframe.
  - The final AnalysisResponse is assembled from all results.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from dataclasses import dataclass

from app.crew import ConfluenceTradeCrew
from app.llm import LLMConfig, LLMFactory
from app.mcp_server import ohlcv_cache
from app.schemas.request import AnalysisRequest, DEFAULT_TIMEFRAME_WEIGHTS
from app.schemas.response import (
    AnalysisResponse,
    AgentOutput,
    SynthesisOutput,
    Annotation,
    MultiTimeframeConfluence,
    TimeframeResult,
)
from app.services.analysis_orchestrator import AnalysisOrchestrator

logger = logging.getLogger(__name__)

# Confluence alignment thresholds
_ALIGNMENT_ALIGNED_THRESHOLD = 0.60     # All TFs weighted average must be on the same side
_ALIGNMENT_CONFLICTING_THRESHOLD = 0.30 # Enough opposing TFs to call "conflicting"

# Sentiment label thresholds (matches orchestrator prompt)
_BULLISH_THRESHOLD = 0.25
_BEARISH_THRESHOLD = -0.25


@dataclass
class _SingleTFResult:
    """Internal holder for one timeframe's raw pipeline result."""

    timeframe: str
    raw_json: str
    error: str | None = None


def _sentiment_label(score: float) -> str:
    """Map a float score to a sentiment string using standard thresholds."""
    if score > _BULLISH_THRESHOLD:
        return "bullish"
    if score < _BEARISH_THRESHOLD:
        return "bearish"
    return "neutral"


def _determine_alignment(per_timeframe: list[TimeframeResult]) -> str:
    """
    Determine alignment label based on how much timeframes agree.

    aligned:     >= 75% of weighted votes in same direction
    mixed:       between 25% and 75% agreement
    conflicting: < 25% agreement (roughly half bullish, half bearish)
    """
    if not per_timeframe:
        return "mixed"

    total_weight = sum(tf.weight for tf in per_timeframe)
    if total_weight == 0:
        return "mixed"

    bullish_weight = sum(tf.weight for tf in per_timeframe if tf.ta_sentiment == "bullish")
    bearish_weight = sum(tf.weight for tf in per_timeframe if tf.ta_sentiment == "bearish")

    dominant_weight = max(bullish_weight, bearish_weight)
    agreement_ratio = dominant_weight / total_weight

    if agreement_ratio >= 0.75:
        return "aligned"
    if agreement_ratio >= 0.40:
        return "mixed"
    return "conflicting"


def _extract_key_indicators(ta_details: dict) -> dict:
    """Extract a compact indicator snapshot from TA agent details for the TF result."""
    indicators = ta_details.get("indicators", {})
    return {
        "rsi": indicators.get("rsi", {}).get("value"),
        "rsi_state": indicators.get("rsi", {}).get("state"),
        "trend": ta_details.get("trend"),
        "macd_cross": indicators.get("macd", {}).get("cross"),
        "ema_20_position": indicators.get("ema_20", {}).get("price_vs_ema"),
        "adx": indicators.get("adx", {}).get("value"),
        "volatility": ta_details.get("volatility"),
    }


class MultiTimeframeOrchestrator:
    """
    Orchestrates multi-timeframe analysis by running parallel single-TF pipelines
    and computing an aggregate Confluence Score.

    Single-Responsibility: This class only handles multi-TF coordination.
    Single-TF analysis is delegated to the existing AnalysisOrchestrator.
    """

    # Maximum number of timeframes that can be analyzed in one request
    _MAX_TIMEFRAMES = 4

    def __init__(self) -> None:
        self._single_tf_orchestrator = AnalysisOrchestrator()
        self._llm_config = LLMConfig()

    async def run_multi_tf_analysis(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Execute multi-timeframe analysis and return an enriched AnalysisResponse.

        Steps:
        1. Run the primary TF through the full pipeline (Data+TA+News+Risk+Orchestrator).
        2. Run remaining TFs through lightweight Data+TA-only pipelines in parallel.
        3. Compute weighted Confluence Score from all TA results.
        4. Attach MultiTimeframeConfluence to the primary TF's AnalysisResponse.

        Args:
            request: AnalysisRequest with `timeframes` list set.

        Returns:
            AnalysisResponse with `multi_timeframe_confluence` populated.
        """
        timeframes = request.timeframes or [request.timeframe]

        # Cap timeframe count to prevent excessive API usage
        timeframes = timeframes[: self._MAX_TIMEFRAMES]

        # Deduplicate while preserving order
        seen: set[str] = set()
        unique_timeframes: list[str] = []
        for tf in timeframes:
            if tf not in seen:
                seen.add(tf)
                unique_timeframes.append(tf)

        logger.info(
            "Starting MTF analysis for %s across timeframes: %s",
            request.symbol,
            unique_timeframes,
        )

        # Step 1: Run primary TF through full pipeline (includes News + Risk)
        primary_tf = request.timeframe if request.timeframe in unique_timeframes else unique_timeframes[0]
        primary_request = request.model_copy(update={"timeframe": primary_tf, "timeframes": None})
        primary_response = await self._single_tf_orchestrator.run_analysis(primary_request)

        # Step 2: Run remaining TFs in parallel (Data + TA only via lightweight crew)
        secondary_timeframes = [tf for tf in unique_timeframes if tf != primary_tf]
        secondary_results = await self._run_secondary_timeframes(request, secondary_timeframes)

        # Step 3: Build per-timeframe results list
        timeframe_weights = {
            tf: DEFAULT_TIMEFRAME_WEIGHTS.get(tf, 1.0 / len(unique_timeframes))
            for tf in unique_timeframes
        }

        # Normalise weights so they sum to 1.0
        weight_sum = sum(timeframe_weights.values())
        if weight_sum > 0:
            timeframe_weights = {tf: w / weight_sum for tf, w in timeframe_weights.items()}

        per_timeframe_results: list[TimeframeResult] = []

        # Primary TF result from full pipeline
        primary_ta = primary_response.agents.get("technical_analysis")
        if primary_ta:
            weight = timeframe_weights.get(primary_tf, 0.25)
            per_timeframe_results.append(TimeframeResult(
                timeframe=primary_tf,
                ta_sentiment=primary_ta.sentiment,
                ta_sentiment_score=primary_ta.sentiment_score,
                ta_confidence=primary_ta.confidence,
                weight=weight,
                weighted_score=primary_ta.sentiment_score * weight * primary_ta.confidence,
                key_indicators=_extract_key_indicators(primary_ta.details),
            ))

        # Secondary TF results
        for tf_result in secondary_results:
            if tf_result.error:
                logger.warning("Skipping %s due to error: %s", tf_result.timeframe, tf_result.error)
                continue

            ta_data = self._extract_ta_from_raw(tf_result.raw_json)
            if ta_data is None:
                continue

            weight = timeframe_weights.get(tf_result.timeframe, 0.25)
            score = ta_data.get("sentiment_score", 0.0)
            confidence = ta_data.get("confidence", 0.5)

            per_timeframe_results.append(TimeframeResult(
                timeframe=tf_result.timeframe,
                ta_sentiment=ta_data.get("sentiment", "neutral"),
                ta_sentiment_score=score,
                ta_confidence=confidence,
                weight=weight,
                weighted_score=score * weight * confidence,
                key_indicators=_extract_key_indicators(ta_data.get("details", {})),
            ))

        # Step 4: Compute confluence score
        confluence = self._compute_confluence(per_timeframe_results, primary_response)

        # Step 5: Attach to primary response
        primary_response.multi_timeframe_confluence = confluence

        return primary_response

    async def _run_secondary_timeframes(
        self,
        base_request: AnalysisRequest,
        secondary_timeframes: list[str],
    ) -> list[_SingleTFResult]:
        """
        Run lightweight Data+TA pipelines for each secondary timeframe in parallel.
        News and Risk agents are skipped for secondary TFs to reduce API cost.
        """
        if not secondary_timeframes:
            return []

        tasks = [
            self._run_lightweight_tf(base_request, tf)
            for tf in secondary_timeframes
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        output: list[_SingleTFResult] = []
        for tf, result in zip(secondary_timeframes, results):
            if isinstance(result, Exception):
                logger.error("Error analyzing TF %s: %s", tf, result)
                output.append(_SingleTFResult(timeframe=tf, raw_json="", error=str(result)))
            else:
                output.append(result)

        return output

    async def _run_lightweight_tf(
        self,
        base_request: AnalysisRequest,
        timeframe: str,
    ) -> _SingleTFResult:
        """
        Run a single timeframe through Data+TA only (no News, Risk, or Orchestrator).
        Returns the raw JSON string of the TA agent output.
        """
        try:
            llm_factory = LLMFactory(self._llm_config)
            crew_wrapper = ConfluenceTradeCrew(
                llm_factory=llm_factory,
                session_id=None,  # No telemetry for secondary TFs
            )
            crew_instance = crew_wrapper.crew()

            from app.services.analysis_orchestrator import _RISK_PROFILES
            profile = _RISK_PROFILES.get(base_request.risk_profile, _RISK_PROFILES["moderate"])

            result = await crew_instance.kickoff_async(
                inputs={
                    "symbol": base_request.symbol,
                    "timeframe": timeframe,
                    "balance": base_request.balance,
                    "risk_percentage": base_request.risk_percentage,
                    "limit": 200,
                    "rr_minimum": profile["rr_minimum"],
                    "rr_ideal": profile["rr_ideal"],
                    "neutral_lo": profile["neutral_lo"],
                    "neutral_hi": profile["neutral_hi"],
                }
            )

            return _SingleTFResult(timeframe=timeframe, raw_json=result.raw)

        except Exception as exc:
            return _SingleTFResult(timeframe=timeframe, raw_json="", error=str(exc))
        finally:
            ohlcv_cache.clear()

    def _extract_ta_from_raw(self, raw_json: str) -> dict | None:
        """
        Parse the TA agent output from the orchestrator's raw JSON.
        Returns the TA agent dict, or None if parsing fails.
        """
        if not raw_json:
            return None
        try:
            clean = raw_json.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            if clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]

            parsed = json.loads(clean.strip())
            return parsed.get("agents", {}).get("technical_analysis")
        except (json.JSONDecodeError, AttributeError) as exc:
            logger.warning("Failed to parse TA from raw JSON: %s", exc)
            return None

    def _compute_confluence(
        self,
        per_timeframe: list[TimeframeResult],
        primary_response: AnalysisResponse,
    ) -> MultiTimeframeConfluence:
        """
        Compute the final MultiTimeframeConfluence from all per-TF results.

        Confluence Score formula:
            raw_score = Σ (weighted_score_i)   # each = sentiment_score × weight × confidence
            news_adjustment = news_sentiment_score × 0.15  # news nudge (small weight)
            final_score = clamp(raw_score + news_adjustment, -1.0, 1.0)
        """
        if not per_timeframe:
            return MultiTimeframeConfluence(
                timeframes_analyzed=[],
                confluence_score=0.0,
                confluence_sentiment="neutral",
                confluence_confidence=0.5,
                alignment="mixed",
                per_timeframe=[],
                news_adjustment=0.0,
            )

        raw_score = sum(tf.weighted_score for tf in per_timeframe)

        # News adjustment: small influence (15% weight) from primary TF's news agent
        news_agent = primary_response.agents.get("news")
        news_adjustment = (news_agent.sentiment_score * 0.15) if news_agent else 0.0

        confluence_score = max(-1.0, min(1.0, raw_score + news_adjustment))

        # Weighted average confidence
        total_weight = sum(tf.weight for tf in per_timeframe)
        confluence_confidence = (
            sum(tf.ta_confidence * tf.weight for tf in per_timeframe) / total_weight
            if total_weight > 0 else 0.5
        )

        return MultiTimeframeConfluence(
            timeframes_analyzed=[tf.timeframe for tf in per_timeframe],
            confluence_score=round(confluence_score, 4),
            confluence_sentiment=_sentiment_label(confluence_score),
            confluence_confidence=round(confluence_confidence, 4),
            alignment=_determine_alignment(per_timeframe),
            per_timeframe=per_timeframe,
            news_adjustment=round(news_adjustment, 4),
        )
