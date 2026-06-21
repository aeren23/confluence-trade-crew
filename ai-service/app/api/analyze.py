"""
Analyze router.

Exposes the POST /analyze endpoint called by the .NET API.
Routes to MultiTimeframeOrchestrator when `timeframes` is provided,
otherwise falls back to the standard AnalysisOrchestrator (single-TF).
"""

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.request import AnalysisRequest
from app.schemas.response import AnalysisResponse
from app.services.analysis_orchestrator import AnalysisOrchestrator
from app.services.multi_tf_orchestrator import MultiTimeframeOrchestrator

router = APIRouter(prefix="/analyze", tags=["Analysis"])


def _get_orchestrator(request: AnalysisRequest) -> AnalysisOrchestrator | MultiTimeframeOrchestrator:
    """
    Return the appropriate orchestrator based on the request.

    Multi-timeframe analysis is triggered when `timeframes` contains 2+ entries.
    Single-timeframe falls back to the standard AnalysisOrchestrator.
    """
    if request.timeframes and len(request.timeframes) >= 2:
        return MultiTimeframeOrchestrator()
    return AnalysisOrchestrator()


@router.post(
    "",
    response_model=AnalysisResponse,
    summary="Trigger Multi-Agent Analysis",
    description=(
        "Kicks off the CrewAI pipeline (Data, TA, News, Risk, Orchestrator) for the given symbol. "
        "When `timeframes` contains 2+ entries, a Multi-Timeframe Confluence analysis is performed "
        "in parallel across all requested timeframes."
    ),
)
async def analyze(request: AnalysisRequest) -> AnalysisResponse:
    """Handle the analysis request, routing to appropriate orchestrator."""
    orchestrator = _get_orchestrator(request)
    try:
        return await orchestrator.run_analysis(request) if isinstance(orchestrator, AnalysisOrchestrator) \
            else await orchestrator.run_multi_tf_analysis(request)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Analysis pipeline failed: {str(exc)}",
        )
