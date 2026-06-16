"""
Standalone test script for the AI Service.
Runs the Orchestrator (and the full CrewAI pipeline) without needing the .NET API.
"""

import asyncio
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Disable OpenTelemetry SDK before any crewai import to suppress
# ConnectionResetError telemetry spam when the endpoint is unreachable.
os.environ.setdefault("OTEL_SDK_DISABLED", "true")

from app.schemas.request import AnalysisRequest
from app.services.analysis_orchestrator import AnalysisOrchestrator

async def main():
    print("Initializing Analysis Orchestrator...")
    orchestrator = AnalysisOrchestrator()
    
    # Fake request mimicking what .NET would send
    request = AnalysisRequest(
        symbol="BTC/USDT",
        timeframe="4h",
        balance=1000.0,
        risk_percentage=2.0
    )
    
    print(f"\nTriggering full multi-agent analysis for {request.symbol} on {request.timeframe} timeframe...")
    print("This will spin up the Data, TA, News, and Risk agents, followed by the Orchestrator.")
    print("It might take 30-90 seconds depending on the LLM API and search queries.\n")
    
    try:
        response = await orchestrator.run_analysis(request)
        
        print("\n" + "="*50)
        print("ANALYSIS COMPLETED SUCCESSFULLY")
        print("="*50)
        
        # Print the final JSON just like the API would return it
        print(json.dumps(response.model_dump(), indent=2, default=str))
        
    except Exception as e:
        print(f"\nError during analysis: {e}")

if __name__ == "__main__":
    asyncio.run(main())
