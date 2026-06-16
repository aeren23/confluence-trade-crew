"""
Confluence Trade Crew — CrewAI definition.

Uses the CrewAI v2 decorator-based API (@CrewBase, @agent, @task, @crew).
Connects to the internal MCP server via stdio transport and passes it
to the agents via the `mcps` attribute.

LLMs are dynamically provided via the LLMFactory (Strategy Pattern),
allowing each agent to use a different provider/model if configured.
"""

import asyncio
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.mcp import MCPServerStdio

from app.crew.prompts import (
    data_agent as data_prompts,
    news_agent as news_prompts,
    orchestrator as orch_prompts,
    risk_agent as risk_prompts,
    ta_agent as ta_prompts,
)
from app.llm.factory import LLMFactory
from app.schemas.response import AgentOutput, SynthesisOutput
from app.services.telemetry_publisher import telemetry


@CrewBase
class ConfluenceTradeCrew:
    """
    Multi-agent crypto analysis crew.
    """

    def __init__(self, llm_factory: LLMFactory, session_id: str | None = None):
        self._llm_factory = llm_factory
        self._session_id = session_id
        # Setup internal MCP server transport
        self._mcp = MCPServerStdio(
            command="python",
            args=["-m", "app.mcp_server.server"],
        )

    def _make_step_callback(self, agent_name: str):
        def callback(step):
            if not self._session_id:
                return
            
            # Extract thought or tool from step
            message = "Processing..."
            step_type = "thought"
            
            if hasattr(step, "thought") and step.thought:
                message = step.thought
            elif hasattr(step, "tool") and step.tool:
                message = f"Calling tool: {step.tool}"
                step_type = "tool"
            elif isinstance(step, str):
                message = step
                
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(telemetry.publish(self._session_id, agent_name, message, step_type))
            except RuntimeError:
                # No running event loop
                asyncio.run(telemetry.publish(self._session_id, agent_name, message, step_type))
                
        return callback

    # ── Agents ─────────────────────────────────────────────────────────────

    @agent
    def data_agent(self) -> Agent:
        return Agent(
            role=data_prompts.ROLE,
            goal=data_prompts.GOAL,
            backstory=data_prompts.BACKSTORY,
            llm=self._llm_factory.create("data"),
            mcps=[self._mcp],
            max_iter=15,
            max_retry_limit=3,
            verbose=True,
            step_callback=self._make_step_callback("Data Agent"),
        )

    @agent
    def ta_agent(self) -> Agent:
        return Agent(
            role=ta_prompts.ROLE,
            goal=ta_prompts.GOAL,
            backstory=ta_prompts.BACKSTORY,
            llm=self._llm_factory.create("technical_analysis"),
            mcps=[self._mcp],
            max_iter=15,
            max_retry_limit=3,
            verbose=True,
            step_callback=self._make_step_callback("Technical Analysis Agent"),
        )

    @agent
    def news_agent(self) -> Agent:
        return Agent(
            role=news_prompts.ROLE,
            goal=news_prompts.GOAL,
            backstory=news_prompts.BACKSTORY,
            llm=self._llm_factory.create("news"),
            mcps=[self._mcp],
            max_iter=15,
            max_retry_limit=3,
            verbose=True,
            step_callback=self._make_step_callback("News Agent"),
        )

    @agent
    def risk_agent(self) -> Agent:
        return Agent(
            role=risk_prompts.ROLE,
            goal=risk_prompts.GOAL,
            backstory=risk_prompts.BACKSTORY,
            llm=self._llm_factory.create("risk"),
            mcps=[self._mcp],
            max_iter=15,
            max_retry_limit=3,
            verbose=True,
            step_callback=self._make_step_callback("Risk Agent"),
        )

    @agent
    def orchestrator_agent(self) -> Agent:
        return Agent(
            role=orch_prompts.ROLE,
            goal=orch_prompts.GOAL,
            backstory=orch_prompts.BACKSTORY,
            llm=self._llm_factory.create("orchestrator"),
            verbose=True,  # Orchestrator doesn't need MCP tools
            step_callback=self._make_step_callback("Orchestrator"),
        )

    # ── Tasks ──────────────────────────────────────────────────────────────

    @task
    def data_task(self) -> Task:
        return Task(
            description=data_prompts.TASK_DESCRIPTION,
            expected_output=data_prompts.EXPECTED_OUTPUT,
            agent=self.data_agent(),
        )

    @task
    def ta_task(self) -> Task:
        return Task(
            description=ta_prompts.TASK_DESCRIPTION,
            expected_output=ta_prompts.EXPECTED_OUTPUT,
            agent=self.ta_agent(),
            context=[self.data_task()],  # Depends on Data Agent output
        )

    @task
    def news_task(self) -> Task:
        return Task(
            description=news_prompts.TASK_DESCRIPTION,
            expected_output=news_prompts.EXPECTED_OUTPUT,
            agent=self.news_agent(),
            context=[self.data_task()],  # Only needs symbol from data/request
        )

    @task
    def risk_task(self) -> Task:
        return Task(
            description=risk_prompts.TASK_DESCRIPTION,
            expected_output=risk_prompts.EXPECTED_OUTPUT,
            agent=self.risk_agent(),
            context=[self.ta_task(), self.news_task()],  # Depends on TA and News
        )

    @task
    def synthesis_task(self) -> Task:
        return Task(
            description=orch_prompts.TASK_DESCRIPTION,
            expected_output=orch_prompts.EXPECTED_OUTPUT,
            agent=self.orchestrator_agent(),
            context=[self.data_task(), self.ta_task(), self.news_task(), self.risk_task()],
            # We don't strictly use output_pydantic here because we wrap it later,
            # but we could define a specific model. Let's just output JSON.
        )

    # ── Crew ───────────────────────────────────────────────────────────────

    @crew
    def crew(self) -> Crew:
        """
        Create the full ConfluenceTradeCrew pipeline.
        Process.sequential runs tasks in the order defined by context dependencies.
        """
        return Crew(
            agents=self.agents,  # Auto-gathered from @agent
            tasks=self.tasks,    # Auto-gathered from @task
            process=Process.sequential,
            verbose=True,
        )
