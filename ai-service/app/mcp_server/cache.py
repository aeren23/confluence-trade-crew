"""
File-based OHLCV cache for the MCP server.

Persists OHLCV DataFrames as Parquet files on disk, keyed by UUID reference.
This survives subprocess restarts — critical because CrewAI's MCPServerStdio
spawns a new Python subprocess for every tool call, so in-memory state cannot
be shared between tool invocations.

Cache directory: <tempdir>/ohlcv_cache/<uuid>.parquet
Cache is cleared (all files deleted) after each analysis session completes.

See mcp_tools.md § 2 for the ohlcv_ref pattern.
"""

import logging
import tempfile
import time
import uuid
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

# Cache directory inside the system's temp folder
_CACHE_DIR_NAME = "ohlcv_cache"


def _get_cache_dir() -> Path:
    """Return the cache directory path, creating it if it doesn't exist."""
    cache_dir = Path(tempfile.gettempdir()) / _CACHE_DIR_NAME
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


class OHLCVCache:
    """
    File-based session cache for OHLCV data.

    Stores DataFrames as Parquet files on disk so they survive subprocess
    restarts (CrewAI's MCPServerStdio spawns a new process per tool call).

    - store(df)  → writes <uuid>.parquet, returns UUID ref string
    - get(ref)   → reads <uuid>.parquet back into DataFrame; None if missing
    - clear()    → deletes all .parquet files in the cache directory
    """

    def store(self, df: pd.DataFrame) -> str:
        """
        Serialize a DataFrame to a Parquet file and return its UUID reference.

        Args:
            df: OHLCV DataFrame with columns [timestamp, open, high, low, close, volume].

        Returns:
            UUID string that downstream tools use to retrieve this dataset.
        """
        ref = str(uuid.uuid4())
        cache_path = _get_cache_dir() / f"{ref}.parquet"
        df.to_parquet(cache_path, engine="pyarrow", index=False)
        logger.debug("OHLCVCache: stored %d rows → %s", len(df), cache_path)
        return ref

    def get(self, ref: str) -> pd.DataFrame | None:
        """
        Retrieve a DataFrame from the Parquet cache by its UUID reference.

        Args:
            ref: UUID string returned by store().

        Returns:
            DataFrame if found, None if the ref is unknown or file was deleted.
        """
        cache_path = _get_cache_dir() / f"{ref}.parquet"
        if not cache_path.exists():
            logger.warning("OHLCVCache: ref '%s' not found in cache", ref)
            return None
        df = pd.read_parquet(cache_path, engine="pyarrow")
        logger.debug("OHLCVCache: loaded %d rows ← %s", len(df), cache_path)
        return df

    def clear(self, max_age_seconds: int = 3600) -> None:
        """
        Garbage collect cached Parquet files older than max_age_seconds.

        Called after each analysis session to prevent unbounded disk growth
        while preserving files that are actively being used by concurrent
        multi-timeframe or multi-tenant analysis tasks.
        """
        cache_dir = _get_cache_dir()
        deleted_count = 0
        current_time = time.time()
        
        for parquet_file in cache_dir.glob("*.parquet"):
            try:
                # Check if file is older than max_age_seconds
                if current_time - parquet_file.stat().st_mtime > max_age_seconds:
                    parquet_file.unlink()
                    deleted_count += 1
            except OSError as exc:
                logger.warning("OHLCVCache: failed to delete %s: %s", parquet_file, exc)
        logger.debug("OHLCVCache: garbage collected %d old file(s)", deleted_count)

    @property
    def size(self) -> int:
        """Number of cached DataFrames currently on disk."""
        return len(list(_get_cache_dir().glob("*.parquet")))


# Module-level singleton — imported by data_tools.py and indicator_tools.py
ohlcv_cache = OHLCVCache()
