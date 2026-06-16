"""
Application settings loaded from environment variables via Pydantic Settings.
All configuration is read from the environment — never hardcoded.
See .env.example for available variables.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.
    Optional keys default to empty string; consumers must check before use.
    """

    # Required — powers all CrewAI LLM calls (default provider)
    anthropic_api_key: str = ""

    # Optional — for OpenAI provider support
    openai_api_key: str = ""

    # Optional — for GitHub Models / Copilot token support
    github_api_key: str = ""

    # Optional — raises Binance rate limits (public endpoints work without it)
    binance_api_key: str = ""
    binance_api_secret: str = ""

    # Optional — enables pair-specific news via CryptoPanic
    # If empty, News Agent falls back to web search only (see agents.md § 5)
    cryptopanic_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# Singleton instance — import this throughout the app
settings = Settings()
