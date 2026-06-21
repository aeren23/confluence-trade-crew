using Confluence.Application.DTOs.Analysis;
using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Confluence.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly IAnalysisService _analysisService;

    public AnalysisController(IAnalysisService analysisService)
    {
        _analysisService = analysisService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateAnalysis([FromBody] AnalysisRequestDto request)
    {
        var result = await _analysisService.CreateAnalysisAsync(request);
        return CreatedAtAction(nameof(GetAnalysisById), new { id = result.Id }, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAnalyses(
        [FromQuery] string? symbol,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? direction = null,
        [FromQuery] bool conflictsOnly = false,
        [FromQuery] decimal? minConfidence = null)
    {
        var result = await _analysisService.GetAnalysesAsync(symbol, page, pageSize, direction, conflictsOnly, minConfidence);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAnalysisById(Guid id)
    {
        var result = await _analysisService.GetAnalysisByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }
}
