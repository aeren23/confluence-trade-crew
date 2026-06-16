"""
LLM provider configuration module.

Provides Strategy Pattern + Factory Pattern abstractions for
multi-provider LLM support. Switch providers via environment
variables — zero code changes required.
"""

from app.llm.config import LLMConfig
from app.llm.factory import LLMFactory

__all__ = ["LLMConfig", "LLMFactory"]
