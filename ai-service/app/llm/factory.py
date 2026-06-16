"""
LLM Factory — Factory Pattern for creating CrewAI LLM instances.

Uses LLMConfig (Strategy Pattern) to determine which provider/model
to use for each agent. CrewAI handles the actual provider routing
internally based on the model string prefix.

Usage:
    from app.llm import LLMConfig, LLMFactory

    config = LLMConfig()  # Reads from environment
    factory = LLMFactory(config)

    llm = factory.create("technical_analysis")
    # → LLM(model="anthropic/claude-sonnet-4-20250514", temperature=0.1)
"""

from crewai import LLM

from app.llm.config import LLMConfig


class LLMFactory:
    """
    Factory Pattern: creates CrewAI LLM instances based on LLMConfig.

    Each call to create() returns a new LLM configured for the specified
    agent, using either the agent-specific override or the default
    provider/model combination.
    """

    def __init__(self, config: LLMConfig) -> None:
        self._config = config

    def create(self, agent_name: str) -> LLM:
        """
        Create a CrewAI LLM instance for the specified agent.

        Args:
            agent_name: One of "data", "technical_analysis", "news",
                        "risk", "orchestrator".

        Returns:
            Configured CrewAI LLM instance ready for agent use.
        """
        model_string = self._config.get_model_string(agent_name)

        return LLM(
            model=model_string,
            temperature=self._config.llm_temperature,
            max_tokens=self._config.llm_max_tokens,
        )

    @property
    def config(self) -> LLMConfig:
        """Expose the underlying config for inspection."""
        return self._config
