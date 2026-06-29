using Confluence.Application.DTOs.Trade;
using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Confluence.API.Controllers;

[ApiController]
[Route("api/trade-review")]
public class TradeReviewController : ControllerBase
{
    private readonly ITradeReviewService _tradeReviewService;

    public TradeReviewController(ITradeReviewService tradeReviewService)
    {
        _tradeReviewService = tradeReviewService;
    }

    [HttpPost("{tradeId}")]
    public async Task<IActionResult> GenerateReview(Guid tradeId)
    {
        try
        {
            var result = await _tradeReviewService.GenerateReviewAsync(tradeId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("trade/{tradeId}")]
    public async Task<IActionResult> GetReviewsByTrade(Guid tradeId)
    {
        var result = await _tradeReviewService.GetReviewsByTradeAsync(tradeId);
        return Ok(result);
    }
}
