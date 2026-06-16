import asyncio
import json
import logging
import os
from typing import Any

import redis.asyncio as redis

logger = logging.getLogger(__name__)


class TelemetryPublisher:
    """
    Publishes CrewAI step execution logs to a Redis Pub/Sub channel.
    The .NET API subscribes to this channel and streams the logs to the React frontend via SignalR.
    """

    def __init__(self):
        self.redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        self.channel = "analysis_telemetry"
        self._redis: redis.Redis | None = None

    async def connect(self):
        if not self._redis:
            try:
                self._redis = redis.from_url(self.redis_url)
                await self._redis.ping()
                logger.info("Connected to Redis for Telemetry Pub/Sub")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis for telemetry: {e}")
                self._redis = None

    async def close(self):
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    async def publish(self, session_id: str, agent: str, message: str, step_type: str = "thought"):
        """
        Publish a telemetry message to Redis.
        
        Args:
            session_id: The UUID of the analysis session.
            agent: The name of the agent (e.g. 'Data Agent', 'TA Agent').
            message: The content of the thought or tool execution.
            step_type: 'thought' or 'tool'.
        """
        if not self._redis or not session_id:
            return

        payload = {
            "sessionId": session_id,
            "agent": agent,
            "type": step_type,
            "message": message,
        }

        try:
            await self._redis.publish(self.channel, json.dumps(payload))
        except Exception as e:
            logger.debug(f"Failed to publish telemetry to Redis: {e}")

# Global singleton
telemetry = TelemetryPublisher()
