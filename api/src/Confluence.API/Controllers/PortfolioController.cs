using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Confluence.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PortfolioController : ControllerBase
{
    private readonly IPortfolioService _portfolioService;

    public PortfolioController(IPortfolioService portfolioService)
    {
        _portfolioService = portfolioService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var result = await _portfolioService.GetSummaryAsync();
        return Ok(result);
    }
}
