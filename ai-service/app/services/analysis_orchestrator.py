"""
Analysis Orchestrator service.

Wires the API request into the CrewAI pipeline, manages the LLM Factory,
and ensures proper cleanup of the OHLCV cache.
"""

import json
from datetime import datetime, timezone

from app.crew import ConfluenceTradeCrew
from app.llm import LLMConfig, LLMFactory
from app.mcp_server import ohlcv_cache
from app.schemas.request import AnalysisRequest
from app.schemas.response import AnalysisResponse, AgentOutput, SynthesisOutput, Annotation

# Risk profile → R:R thresholds and TA neutral zone width
_RISK_PROFILES = {
    "conservative": {"rr_minimum": 1.0, "rr_ideal": 1.5, "neutral_lo": -0.2, "neutral_hi": 0.2},
    "moderate":     {"rr_minimum": 0.8, "rr_ideal": 1.2, "neutral_lo": -0.3, "neutral_hi": 0.3},
    "aggressive":   {"rr_minimum": 0.6, "rr_ideal": 1.0, "neutral_lo": -0.4, "neutral_hi": 0.4},
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
            result = await crew_instance.kickoff_async(
                inputs={
                    "symbol": request.symbol,
                    "timeframe": request.timeframe,
                    "balance": request.balance,
                    "risk_percentage": request.risk_percentage,
                    "limit": 200,
                    # Risk profile thresholds — interpolated into risk_agent.py prompt
                    "rr_minimum": profile["rr_minimum"],
                    "rr_ideal": profile["rr_ideal"],
                    "neutral_lo": profile["neutral_lo"],
                    "neutral_hi": profile["neutral_hi"],
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

            # Server-side R:R gate: override direction to neutral if R:R is below
            # the profile's minimum. Acts as a safety net when the LLM ignores the prompt.
            _rr_gate = _RISK_PROFILES.get(request.risk_profile, _RISK_PROFILES["moderate"])["rr_minimum"]
            _risk_details = parsed_synthesis.get("agents", {}).get("risk", {}).get("details", {})
            _levels = _risk_details.get("levels", {})
            _entry = _levels.get("entry")
            _sl = _levels.get("stop_loss")
            _tp = _levels.get("take_profit")
            if _entry and _sl and _tp:
                _sl_dist = abs(_entry - _sl)
                _rr = abs(_tp - _entry) / _sl_dist if _sl_dist > 0 else 0
                if _rr < _rr_gate and _risk_details.get("position_direction") in ("long", "short"):
                    _risk_details["position_direction"] = "neutral"

            # The other tasks (Data, TA, News, Risk) output plain text now.
            # The Orchestrator converts their plain text into the 'agents' dictionary.
            agent_outputs = {}
            if "agents" in parsed_synthesis:
                for agent_name, agent_data in parsed_synthesis["agents"].items():
                    agent_outputs[agent_name] = AgentOutput(**agent_data)

            # Extract synthesis and annotations from the final task JSON
            synthesis_dict = parsed_synthesis.get("synthesis", {})
            annotations_list = parsed_synthesis.get("annotations", [])

            synthesis = SynthesisOutput(**synthesis_dict)
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

