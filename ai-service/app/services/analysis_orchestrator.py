"""
Analysis Orchestrator service.

Wires the API request into the CrewAI pipeline, manages the LLM Factory,
and ensures proper cleanup of the OHLCV cache.
"""

import json
import logging
from datetime import datetime, timezone

from app.crew import ConfluenceTradeCrew
from app.llm import LLMConfig, LLMFactory
from app.mcp_server import ohlcv_cache
from app.schemas.request import AnalysisRequest
from app.schemas.response import (
    AnalysisResponse,
    AgentOutput,
    SynthesisOutput,
    Annotation,
    RangeTrade,
    RangeTradeBreakoutAlert,
)

# Risk profile → R:R thresholds and TA neutral zone width
# neutral_hi: higher = wider WAIT zone = fewer trades
# rr_minimum:  minimum Risk:Reward to allow a directional trade
# rr_ideal:    R:R threshold for full position size (below = reduced size)
_RISK_PROFILES = {
    "conservative": {"rr_minimum": 1.5, "rr_ideal": 2.0, "neutral_lo": -0.35, "neutral_hi": 0.35},
    "moderate":     {"rr_minimum": 1.0, "rr_ideal": 1.5, "neutral_lo": -0.25, "neutral_hi": 0.25},
    "aggressive":   {"rr_minimum": 0.5, "rr_ideal": 0.8, "neutral_lo": -0.15, "neutral_hi": 0.15},
    "neutral":      {"rr_minimum": 1.2, "rr_ideal": 1.8, "neutral_lo": -0.30, "neutral_hi": 0.30},
}


class AnalysisOrchestrator:
    """
    Orchestrates the CrewAI pipeline execution.
    """

    def __init__(self) -> None:
        # Strategy Pattern: Load LLM config and initialize Factory
        self.llm_config = LLMConfig()
        self.llm_factory = LLMFactory(self.llm_config)

    async def run_analysis(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Execute the multi-agent pipeline for a given request.

        Args:
            request: The analysis parameters (symbol, timeframe, etc.)

        Returns:
            The structured AnalysisResponse.
        """
        from app.services.telemetry_publisher import telemetry

        # Connect telemetry Redis client so step_callbacks can publish logs.
        # Both sync (step_callback) and async (this method) clients are initialized here.
        await telemetry.connect()

        try:
            # 1. Initialize Crew with LLM Factory and optional session_id
            crew_wrapper = ConfluenceTradeCrew(
                llm_factory=self.llm_factory,
                session_id=request.session_id,
            )
            crew_instance = crew_wrapper.crew()

            # Broadcast pipeline start event
            await telemetry.publish(
                request.session_id, "System",
                f"🚀 Analysis pipeline started for {request.symbol} ({request.timeframe})",
                step_type="pipeline", status="started"
            )

            # 2. Kickoff execution
            # CrewAI v2 kickoff accepts a dict of inputs that get interpolated into prompts
            profile = _RISK_PROFILES.get(request.risk_profile, _RISK_PROFILES["moderate"])

            # Strategy config overrides: when a strategy template is selected, its
            # minimum R:R and news weight take precedence over the risk profile defaults.
            rr_minimum = profile["rr_minimum"]
            if request.strategy_config and "minimum_rr" in request.strategy_config:
                rr_minimum = float(request.strategy_config["minimum_rr"])

            news_weight = 0.20  # default news influence
            if request.strategy_config and "news_weight" in request.strategy_config:
                news_weight = float(request.strategy_config["news_weight"])

            result = await crew_instance.kickoff_async(
                inputs={
                    "symbol": request.symbol,
                    "timeframe": request.timeframe,
                    "balance": request.balance,
                    "risk_percentage": request.risk_percentage,
                    "limit": 200,
                    # Risk profile thresholds — interpolated into risk_agent.py prompt
                    "rr_minimum": rr_minimum,
                    "rr_ideal": profile["rr_ideal"],
                    "neutral_lo": profile["neutral_lo"],
                    "neutral_hi": profile["neutral_hi"],
                    # Strategy-aware news weight — interpolated into orchestrator prompt
                    "news_weight": news_weight,
                }
            )

            # Broadcast pipeline finished event
            await telemetry.publish(
                request.session_id, "System",
                f"✅ All agents completed. Synthesizing final report...",
                step_type="pipeline", status="finished"
            )

            # 3. Parse the final output from Orchestrator
            # In CrewAI, the final result is the output of the last task (synthesis_task)
            raw_json = result.raw
            
            # CrewAI might wrap the JSON in markdown code blocks, strip them
            if raw_json.startswith("```json"):
                raw_json = raw_json[7:]
            if raw_json.startswith("```"):
                raw_json = raw_json[3:]
            if raw_json.endswith("```"):
                raw_json = raw_json[:-3]

            parsed_synthesis = json.loads(raw_json.strip())

            # ── Server-side safety gates ────────────────────────────────────────
            # These act as a deterministic backstop when the LLM ignores prompt rules.
            _log          = logging.getLogger(__name__)
            _profile      = _RISK_PROFILES.get(request.risk_profile, _RISK_PROFILES["moderate"])
            _rr_gate      = _profile["rr_minimum"]
            _rr_ideal     = _profile["rr_ideal"]
            _neutral_hi   = _profile["neutral_hi"]
            _risk_details = parsed_synthesis.get("agents", {}).get("risk", {}).get("details", {})
            _ta_agent     = parsed_synthesis.get("agents", {}).get("technical_analysis", {})
            _ta_score     = float(_ta_agent.get("sentiment_score", 0.0) or 0.0)
            _ta_details   = _ta_agent.get("details", {})
            _levels       = _risk_details.get("levels", {})
            _entry        = _levels.get("entry")
            _sl           = _levels.get("stop_loss")
            _direction    = _risk_details.get("position_direction", "neutral")

            # ── Gate 0 — TP Correction ──────────────────────────────────────────
            # LLMs frequently miscalculate TP1 (should be exact 1:1 from SL distance)
            # and TP2 (primary target; must be FARTHER than TP1, not closer).
            # We recompute both server-side using deterministic math.
            _tp1 = _levels.get("tp1")
            _tp2 = _levels.get("tp2") or _levels.get("take_profit")

            if _entry and _sl:
                _sl_dist = abs(_entry - _sl)

                # True 1:1 TP1 based on direction
                if _direction in ("long", "neutral"):
                    _tp1_correct = _entry + _sl_dist
                else:  # short
                    _tp1_correct = _entry - _sl_dist

                # Validate LLM's TP1: if it deviates more than 5% from the true 1:1, correct it
                if _tp1 is None or abs(_tp1 - _tp1_correct) / max(_sl_dist, 1) > 0.05:
                    _log.warning(
                        "[Gate0] TP1 corrected: LLM_tp1=%s → true_1:1=%.2f (entry=%.2f, sl_dist=%.2f)",
                        _tp1, _tp1_correct, _entry, _sl_dist,
                    )
                    _tp1 = _tp1_correct
                    _levels["tp1"] = _tp1

                # Validate TP2: must be farther from entry than TP1
                # If TP2 is between entry and TP1, pick from TA resistance/support levels
                _tp2_invalid = (
                    _tp2 is None
                    or (_direction != "short" and _tp2 <= _tp1)      # Long: tp2 must be > tp1
                    or (_direction == "short" and _tp2 >= _tp1)      # Short: tp2 must be < tp1
                )

                if _tp2_invalid:
                    # Try to pick a better TP2 from TA resistance (long) or support (short) levels
                    sr = _ta_details.get("support_resistance", {})
                    candidates = sr.get("resistance", []) if _direction != "short" else sr.get("support", [])
                    # Sort ascending (long) or descending (short) relative to entry
                    if _direction != "short":
                        candidates = sorted([c for c in candidates if c > _tp1], key=lambda x: x)
                    else:
                        candidates = sorted([c for c in candidates if c < _tp1], key=lambda x: -x)

                    _tp2_new = None
                    for lvl in candidates:
                        candidate = lvl * 0.995 if _direction != "short" else lvl * 1.005
                        cand_rr = abs(candidate - _entry) / _sl_dist if _sl_dist > 0 else 0
                        if cand_rr >= _rr_gate:
                            _tp2_new = candidate
                            break

                    # ATR fallback: 2.5 × ATR if no resistance passes
                    if _tp2_new is None:
                        _atr = _ta_details.get("atr") or (_sl_dist / 1.5)
                        _tp2_new = (_entry + 2.5 * _atr) if _direction != "short" else (_entry - 2.5 * _atr)

                    _log.warning(
                        "[Gate0] TP2 corrected: LLM_tp2=%s → corrected=%.2f (tp1=%.2f, dir=%s)",
                        _tp2, _tp2_new, _tp1, _direction,
                    )
                    _tp2 = _tp2_new
                    _levels["tp2"] = _tp2

            # ── Gate 1 — R:R Gate ───────────────────────────────────────────────
            # Override to neutral if R:R (using corrected TP2) is below profile minimum.
            _rr = None
            if _entry and _sl and _tp2:
                _sl_dist = abs(_entry - _sl)
                _rr = abs(_tp2 - _entry) / _sl_dist if _sl_dist > 0 else 0
                if _rr < _rr_gate and _direction in ("long", "short"):
                    _log.warning(
                        "[Gate1] R:R gate triggered: R:R=%.2f < threshold=%.2f — "
                        "overriding direction '%s' → 'neutral'",
                        _rr, _rr_gate, _direction,
                    )
                    _risk_details["position_direction"] = "neutral"
                    _direction = "neutral"
                elif _rr >= _rr_gate:
                    _log.info(
                        "[Gate1] R:R=%.2f passes threshold=%.2f — direction '%s' kept.",
                        _rr, _rr_gate, _direction,
                    )

            # ── Gate 2 — TA-Score Direction Gate ────────────────────────────────
            # If LLM said WAIT but TA score clearly exceeds neutral threshold,
            # AND R:R is viable (gate 1 did NOT fire), override to correct direction.
            if _direction == "neutral" and (_rr is None or _rr >= _rr_gate):
                if _ta_score > _neutral_hi:
                    _log.warning(
                        "[Gate2] TA-score gate triggered: TA_score=%.3f > neutral_hi=%.2f — "
                        "overriding 'neutral' → 'long'",
                        _ta_score, _neutral_hi,
                    )
                    _risk_details["position_direction"] = "long"
                elif _ta_score < -_neutral_hi:
                    _log.warning(
                        "[Gate2] TA-score gate triggered: TA_score=%.3f < -neutral_hi=%.2f — "
                        "overriding 'neutral' → 'short'",
                        _ta_score, _neutral_hi,
                    )
                    _risk_details["position_direction"] = "short"

            # The other tasks (Data, TA, News, Risk) output plain text now.
            # The Orchestrator converts their plain text into the 'agents' dictionary.
            agent_outputs = {}
            if "agents" in parsed_synthesis:
                for agent_name, agent_data in parsed_synthesis["agents"].items():
                    agent_outputs[agent_name] = AgentOutput(**agent_data)

            # Extract synthesis and annotations from the final task JSON
            synthesis_dict = parsed_synthesis.get("synthesis", {})
            annotations_list = parsed_synthesis.get("annotations", [])

            # Parse range_trade block when trade_mode == 'range'
            range_trade_raw = synthesis_dict.pop("range_trade", None)
            range_trade: RangeTrade | None = None
            if range_trade_raw and isinstance(range_trade_raw, dict):
                try:
                    breakout_raw = range_trade_raw.pop("breakout_alert", {})
                    alert = RangeTradeBreakoutAlert(**breakout_raw)
                    range_trade = RangeTrade(**range_trade_raw, breakout_alert=alert)
                except Exception:
                    range_trade = None  # Graceful fallback — never break the pipeline

            synthesis = SynthesisOutput(**synthesis_dict, range_trade=range_trade)
            annotations = [Annotation(**ann) for ann in annotations_list]

            # Construct final response
            return AnalysisResponse(
                symbol=request.symbol,
                timestamp=datetime.now(timezone.utc).isoformat(),
                agents=agent_outputs,
                synthesis=synthesis,
                annotations=annotations,
            )

        finally:
            # 4. Critical: Always clear the in-memory cache to prevent memory leaks
            # and ensure fresh data on the next run.
            ohlcv_cache.clear()
            # 5. Close async telemetry Redis connection.
            await telemetry.close()

