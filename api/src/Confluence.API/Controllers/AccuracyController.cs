using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Confluence.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccuracyController : ControllerBase
{
    private readonly IAccuracyService _accuracyService;

    public AccuracyController(IAccuracyService accuracyService)
    {
        _accuracyService = accuracyService;
    }

    [HttpPost("evaluate/{analysisId}")]
    public async Task<IActionResult> EvaluateAnalysis(Guid analysisId, [FromQuery] string intervalLabel = "on-demand")
    {
        try
        {
            var result = await _accuracyService.EvaluateAnalysisAccuracyAsync(analysisId, intervalLabel);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("analysis/{analysisId}")]
    public async Task<IActionResult> GetAccuracyForAnalysis(Guid analysisId)
    {
        var result = await _accuracyService.GetAccuracyForAnalysisAsync(analysisId);
        return Ok(result);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetGlobalStats()
    {
        var result = await _accuracyService.GetGlobalAccuracyStatsAsync();
        return Ok(result);
    }
}
