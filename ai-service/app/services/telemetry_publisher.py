"""
Telemetry Publisher — publishes CrewAI step logs to Redis Pub/Sub.

The .NET API subscribes to this channel (RedisTelemetrySubscriber) and
streams the messages to the React frontend via SignalR WebSockets.

IMPORTANT: CrewAI step_callbacks are called SYNCHRONOUSLY (not async).
This publisher provides both a sync and async publish path:
- publish_sync()  — for use inside step_callbacks (thread-safe, fire-and-forget)
- publish()       — async version for use in FastAPI request handlers
"""

import asyncio
import json
import logging
import os
import threading
from typing import Any

import redis as redis_sync
import redis.asyncio as redis_async

logger = logging.getLogger(__name__)


class TelemetryPublisher:
    """
    Publishes CrewAI step execution logs to a Redis Pub/Sub channel.
    The .NET API subscribes to this channel and streams the logs to
    the React frontend via SignalR WebSockets.

    Provides both sync and async publish methods because CrewAI step_callbacks
    are synchronous while FastAPI handlers are async.
    """

    def __init__(self):
        self.redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        self.channel = "analysis_telemetry"
        # Async client (for FastAPI context)
        self._redis_async: redis_async.Redis | None = None
        # Sync client (for CrewAI step_callbacks running in threads)
        self._redis_sync: redis_sync.Redis | None = None
        self._sync_lock = threading.Lock()

    def _get_sync_client(self) -> redis_sync.Redis | None:
        """Lazily create a sync Redis client (thread-safe)."""
        if self._redis_sync is None:
            with self._sync_lock:
                if self._redis_sync is None:
                    try:
                        client = redis_sync.from_url(self.redis_url)
                        client.ping()
                        self._redis_sync = client
                        logger.info("Sync Redis client connected for telemetry.")
                    except Exception as e:
                        logger.warning(f"Failed to connect sync Redis for telemetry: {e}")
                        return None
        return self._redis_sync

    async def connect(self):
        """Lazily connect the async Redis client."""
        if self._redis_async is None:
            try:
                self._redis_async = redis_async.from_url(self.redis_url)
                await self._redis_async.ping()
                logger.info("Async Redis client connected for telemetry.")
            except Exception as e:
                logger.warning(f"Failed to connect async Redis for telemetry: {e}")
                self._redis_async = None

    async def close(self):
        """Close async Redis connection."""
        if self._redis_async:
            await self._redis_async.aclose()
            self._redis_async = None

    def publish_sync(self, session_id: str, agent: str, message: str, step_type: str = "thought", status: str = ""):
        """
        Synchronous publish — safe to call from CrewAI step_callbacks.

        Args:
            session_id: The UUID of the analysis session.
            agent: The name of the agent.
            message: The content of the thought or tool execution.
            step_type: 'thought', 'tool', 'finished', or 'pipeline'.
            status: Optional short status label shown as a badge in the UI.
        """
        if not session_id:
            return

        client = self._get_sync_client()
        if not client:
            return

        payload = {
            "sessionId": session_id,
            "agent": agent,
            "type": step_type,
            "message": message,
            "status": status,
        }

        try:
            client.publish(self.channel, json.dumps(payload))
        except Exception as e:
            logger.debug(f"Failed to sync-publish telemetry to Redis: {e}")

    async def publish(self, session_id: str, agent: str, message: str, step_type: str = "thought", status: str = ""):
        """
        Async publish — for use in FastAPI request handlers.

        Args:
            session_id: The UUID of the analysis session.
            agent: The name of the agent.
            message: The content of the thought or tool execution.
            step_type: 'thought', 'tool', 'finished', or 'pipeline'.
            status: Optional short status label shown as a badge in the UI.
        """
        if not session_id:
            return

        # Lazy connect if needed
        if self._redis_async is None:
            await self.connect()

        if not self._redis_async:
            return

        payload = {
            "sessionId": session_id,
            "agent": agent,
            "type": step_type,
            "message": message,
            "status": status,
        }

        try:
            await self._redis_async.publish(self.channel, json.dumps(payload))
        except Exception as e:
            logger.debug(f"Failed to async-publish telemetry to Redis: {e}")


# Global singleton
telemetry = TelemetryPublisher()
