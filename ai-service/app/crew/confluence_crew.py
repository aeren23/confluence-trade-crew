"""
Confluence Trade Crew — CrewAI definition.

Uses the CrewAI v2 decorator-based API (@CrewBase, @agent, @task, @crew).
Connects to the internal MCP server via stdio transport and passes it
to the agents via the `mcps` attribute.

LLMs are dynamically provided via the LLMFactory (Strategy Pattern),
allowing each agent to use a different provider/model if configured.
"""

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

    @staticmethod
    def _truncate(text: str, max_len: int = 600) -> str:
        """Truncate long text to prevent UI overflow."""
        if not text:
            return ""
        text = text.strip()
        return text[:max_len] + "..." if len(text) > max_len else text

    def _make_step_callback(self, agent_name: str):
        """Return a step_callback function for the given agent.

        CrewAI v2 step_callbacks receive either:
        - An AgentAction-like object: has .tool, .tool_input, .log (full ReAct trace)
        - An AgentFinish-like object: has .output or .return_values
        - A plain string (some CrewAI versions)

        The `.thought` attribute does NOT exist directly — the reasoning text is
        embedded inside `.log` before the `Action:` line.
        """
        def callback(step):
            if not self._session_id:
                return

            step_type = "thought"
            message = ""

            # ── Case 1: Tool call (AgentAction) ───────────────────────────────
            # Check tool first because .log also exists on AgentAction objects.
            tool_name = getattr(step, "tool", None)
            if tool_name and isinstance(tool_name, str) and tool_name not in ("", "None"):
                tool_input = getattr(step, "tool_input", "") or ""
                # tool_input can be a dict or string
                if isinstance(tool_input, dict):
                    import json as _json
                    tool_input = _json.dumps(tool_input, ensure_ascii=False)
                step_type = "tool"
                message = f"{tool_name}({self._truncate(str(tool_input), 200)})"

                # Also publish the thought/reasoning that preceded this tool call.
                # It's embedded in .log before the "Action:" line.
                log_text = getattr(step, "log", "") or ""
                thought_part = log_text.split("\nAction:")[0].strip()
                if thought_part:
                    telemetry.publish_sync(
                        self._session_id, agent_name,
                        self._truncate(thought_part), "thought"
                    )

            # ── Case 2: Final output (AgentFinish) ────────────────────────────
            elif hasattr(step, "output") and step.output:
                step_type = "finished"
                message = self._truncate(str(step.output))

            elif hasattr(step, "return_values") and step.return_values:
                step_type = "finished"
                output = step.return_values.get("output", step.return_values)
                message = self._truncate(str(output))

            # ── Case 3: Plain thought/log with no tool call ───────────────────
            elif hasattr(step, "log") and step.log:
                message = self._truncate(step.log)

            # ── Case 4: Plain string ──────────────────────────────────────────
            elif isinstance(step, str):
                message = self._truncate(step)

            else:
                # Fallback: show whatever repr we can find
                message = self._truncate(repr(step))

            if message:
                telemetry.publish_sync(self._session_id, agent_name, message, step_type)

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
