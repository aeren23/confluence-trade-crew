"""
Analyze router.

Exposes the POST /analyze endpoint called by the .NET API.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.request import AnalysisRequest
from app.schemas.response import AnalysisResponse
from app.services.analysis_orchestrator import AnalysisOrchestrator

router = APIRouter(prefix="/analyze", tags=["Analysis"])

# Simple dependency to instantiate the orchestrator
def get_orchestrator() -> AnalysisOrchestrator:
    return AnalysisOrchestrator()


@router.post(
    "",
    response_model=AnalysisResponse,
    summary="Trigger Multi-Agent Analysis",
    description="Kicks off the CrewAI pipeline (Data, TA, News, Risk, Orchestrator) for the given symbol.",
)
async def analyze(
    request: AnalysisRequest,
    orchestrator: AnalysisOrchestrator = Depends(get_orchestrator),
):
    """
    Handle the analysis request.
    """
    try:
        response = await orchestrator.run_analysis(request)
        return response
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Analysis pipeline failed: {str(exc)}",
        )
