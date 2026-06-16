"""
Confluence Trade Crew — AI Service entry point.

Endpoints:
  GET  /health  → liveness check
  POST /analyze → trigger multi-agent analysis pipeline

Note: The CrewAI pipeline and MCP server are implemented in Phase 4.
This stub provides the server structure and health endpoint for Phase 2.
"""

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

# Disable OpenTelemetry SDK before any crewai import to suppress
# ConnectionResetError telemetry spam when the endpoint is unreachable.
os.environ.setdefault("OTEL_SDK_DISABLED", "true")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Confluence Trade Crew — AI Service",
    description=(
        "Stateless multi-agent crypto analysis engine. "
        "Receives an analysis request from the .NET API, runs the CrewAI pipeline "
        "(Data → TA + News → Risk → Orchestrator), and returns a structured result. "
        "See docs/agents.md and docs/mcp_tools.md for full schema documentation."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow the .NET API (and frontend during development) to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restricted to internal Docker network in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """
    Liveness endpoint. Returns 200 OK when the service is running.
    Used by Docker Compose healthchecks and the .NET API startup validation.
    """
    return {"status": "ok", "service": "ai-service"}


# Register Phase 4 /analyze endpoint
from app.api.analyze import router as analyze_router
app.include_router(analyze_router)
