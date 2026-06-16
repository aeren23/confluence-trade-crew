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
        try:
            # 1. Initialize Crew with LLM Factory and optional session_id
            crew_wrapper = ConfluenceTradeCrew(
                llm_factory=self.llm_factory,
                session_id=request.session_id,
            )
            crew_instance = crew_wrapper.crew()

            # 2. Kickoff execution
            # CrewAI v2 kickoff accepts a dict of inputs that get interpolated into prompts
            result = await crew_instance.kickoff_async(
                inputs={
                    "symbol": request.symbol,
                    "timeframe": request.timeframe,
                    "balance": request.balance,
                    "risk_percentage": request.risk_percentage,
                    "limit": 100,
                }
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
