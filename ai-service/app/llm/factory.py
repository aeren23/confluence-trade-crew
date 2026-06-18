"""
LLM Factory — Factory Pattern for creating CrewAI LLM instances.

Uses LLMConfig (Strategy Pattern) to determine which provider/model
to use for each agent. CrewAI handles the actual provider routing
internally based on the model string prefix.

Supported provider prefixes and required env vars:
    anthropic/ → ANTHROPIC_API_KEY
    openai/    → OPENAI_API_KEY
    github/    → GITHUB_API_KEY  (routed via openai/ + api_base internally)
    gemini/    → GEMINI_API_KEY
    ollama/    → no key needed (local)

GitHub Models note:
    litellm's native github/ provider uses an async HTTP client that
    conflicts with CrewAI's thread-pool execution model, causing
    'NoneType has no attribute choices' errors.  We work around this
    by routing github/ models through litellm's proven openai/ provider
    with api_base set to GitHub's OpenAI-compatible inference endpoint.

Usage:
    from app.llm import LLMConfig, LLMFactory

    config = LLMConfig()  # Reads from environment
    factory = LLMFactory(config)

    llm = factory.create("technical_analysis")
    # → LLM(model="anthropic/claude-sonnet-4-20250514", temperature=0.1)
"""

import logging
import os

from crewai import LLM

from app.llm.config import LLMConfig

logger = logging.getLogger(__name__)

# GitHub Models uses an OpenAI-compatible REST endpoint.
_GITHUB_API_BASE = "https://models.github.ai/inference"


class LLMFactory:
    """
    Factory Pattern: creates CrewAI LLM instances based on LLMConfig.

    Each call to create() returns a new LLM configured for the specified
    agent, using either the agent-specific override or the default
    provider/model combination.

    API keys are resolved automatically from environment variables based
    on the provider prefix in the model string, enabling zero-code
    provider switching via .env changes.
    """

    # Maps provider prefix → environment variable name for API key lookup.
    # Add new providers here when extending support.
    _PROVIDER_KEY_MAP: dict[str, str] = {
        "anthropic": "ANTHROPIC_API_KEY",
        "openai": "OPENAI_API_KEY",
        "github": "GITHUB_API_KEY",
        "gemini": "GEMINI_API_KEY",
    }

    def __init__(self, config: LLMConfig) -> None:
        self._config = config

    def _resolve_api_key(self, provider: str) -> str | None:
        """Return the API key env var value for the given provider prefix."""
        env_var = self._PROVIDER_KEY_MAP.get(provider)
        if env_var:
            return os.getenv(env_var) or None
        return None

    def create(self, agent_name: str) -> LLM:
        """
        Create a CrewAI LLM instance for the specified agent.

        For GitHub Models, the model string is translated from
        'github/<model>' to 'openai/<model>' with api_base pointing at
        GitHub's OpenAI-compatible endpoint.  This avoids a known async
        event-loop conflict in litellm's native github/ provider when
        called from CrewAI's thread-pool executor.

        Args:
            agent_name: One of "data", "technical_analysis", "news",
                        "risk", "orchestrator".

        Returns:
            Configured CrewAI LLM instance ready for agent use.
        """
        model_string = self._config.get_model_string(agent_name)
        parts = model_string.split("/", 1)
        provider = parts[0] if len(parts) == 2 else ""
        model_name = parts[1] if len(parts) == 2 else model_string

        logger.info("LLM resolved for agent '%s': %s", agent_name, model_string)

        kwargs: dict = {
            "temperature": self._config.llm_temperature,
            "max_tokens": self._config.llm_max_tokens,
        }

        if provider == "github":
            # Route through openai/ provider → GitHub's OpenAI-compatible endpoint.
            kwargs["model"] = f"openai/{model_name}"
            kwargs["api_base"] = _GITHUB_API_BASE
            api_key = self._resolve_api_key("github")
            if api_key:
                kwargs["api_key"] = api_key
            logger.info(
                "GitHub Models routing: openai/%s @ %s", model_name, _GITHUB_API_BASE
            )
        else:
            kwargs["model"] = model_string
            api_key = self._resolve_api_key(provider)
            if api_key:
                kwargs["api_key"] = api_key

        return LLM(**kwargs)

    @property
    def config(self) -> LLMConfig:
        """Expose the underlying config for inspection."""
        return self._config
