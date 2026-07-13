"""
LLM provider configuration — Strategy Pattern.

All LLM provider selection is driven by environment variables.
Each agent can optionally use a different model via per-agent overrides.
If no override is set, the default provider/model is used.

Environment Variables:
    LLM_DEFAULT_PROVIDER: CrewAI model string prefix (e.g. "anthropic", "openai", "ollama")
    LLM_DEFAULT_MODEL: Model identifier without provider prefix (e.g. "claude-sonnet-4-20250514")
    LLM_<AGENT>_MODEL: Per-agent override in "provider/model" format (e.g. "openai/gpt-4o")
    LLM_TEMPERATURE: Sampling temperature (default 0.1 for deterministic analysis)
    LLM_MAX_TOKENS: Maximum output tokens (default 4096)

Usage:
    config = LLMConfig()
    model_string = config.get_model_string("technical_analysis")
    # Returns e.g. "anthropic/claude-sonnet-4-20250514"
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMConfig(BaseSettings):
    """
    LLM provider configuration loaded from environment variables.

    Strategy Pattern: the provider/model combination is selected entirely
    via environment variables. No code changes needed to switch providers.
    """

    # Default provider — used as prefix for CrewAI model string
    llm_default_provider: str = "anthropic"
    llm_default_model: str = "claude-sonnet-4-20250514"

    # Per-agent model overrides (empty string = use default)
    # Format: "provider/model" e.g. "openai/gpt-4o", "ollama/llama3"
    llm_data_agent_model: str = ""
    llm_ta_agent_model: str = ""
    llm_news_agent_model: str = ""
    llm_risk_agent_model: str = ""
    llm_orchestrator_model: str = ""
    llm_onchain_agent_model: str = ""        # On-Chain Agent override (defaults to LLM_DEFAULT)
    llm_review_agent_model: str = ""         # Trade Review override
    llm_market_structure_agent_model: str = ""  # Market Structure Agent (Faz 1)
    llm_liquidity_agent_model: str = ""      # Liquidity Agent (Faz 4)

    # Common LLM parameters
    llm_temperature: float = 0.1  # Low for deterministic analysis output
    llm_max_tokens: int = 4096

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Agent name → env override field mapping
    _AGENT_OVERRIDE_MAP: dict[str, str] = {
        "data": "llm_data_agent_model",
        "technical_analysis": "llm_ta_agent_model",
        "news": "llm_news_agent_model",
        "risk": "llm_risk_agent_model",
        "orchestrator": "llm_orchestrator_model",
        "onchain": "llm_onchain_agent_model",
        "review": "llm_review_agent_model",
        "market_structure": "llm_market_structure_agent_model",  # Faz 1
        "liquidity": "llm_liquidity_agent_model",  # Faz 4
    }

    def get_model_string(self, agent_name: str) -> str:
        """
        Returns the full CrewAI model string for a given agent.

        If a per-agent override is configured, returns it directly.
        Otherwise, constructs "{provider}/{model}" from defaults.

        Args:
            agent_name: One of "data", "technical_analysis", "news",
                        "risk", "orchestrator".

        Returns:
            CrewAI-compatible model string, e.g. "anthropic/claude-sonnet-4-20250514".
        """
        field_name = self._AGENT_OVERRIDE_MAP.get(agent_name, "")
        if field_name:
            override = getattr(self, field_name, "")
            if override:
                return override

        return f"{self.llm_default_provider}/{self.llm_default_model}"
