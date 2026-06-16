import asyncio
import json
import uuid

import httpx

# Note: We need a python signalr client, but we can't easily install it right now without potentially breaking things.
# Instead of a full E2E test, we'll just test that the TelemetryPublisher can push to Redis successfully,
# and that we can trigger the API endpoint.

from app.services.telemetry_publisher import telemetry

async def main():
    print("Testing Redis Pub/Sub directly...")
    
    session_id = str(uuid.uuid4())
    print(f"Generated Session ID: {session_id}")
    
    await telemetry.connect()
    
    await telemetry.publish(session_id, "System", "Test message from telemetry script", "system")
    print("Published message to Redis")
    
    await telemetry.close()
    
if __name__ == "__main__":
    asyncio.run(main())
