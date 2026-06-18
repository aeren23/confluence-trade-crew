using Confluence.Application.DTOs.Trade;
using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Confluence.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TradeController : ControllerBase
{
    private readonly ITradeService _tradeService;

    public TradeController(ITradeService tradeService)
    {
        _tradeService = tradeService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTrade([FromBody] TradeCreateDto request)
    {
        var result = await _tradeService.CreateTradeAsync(request);
        return CreatedAtAction(nameof(GetTradeById), new { id = result.Id }, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetTrades([FromQuery] string? status, [FromQuery] string? symbol, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _tradeService.GetTradesAsync(status, symbol, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTradeById(Guid id)
    {
        var result = await _tradeService.GetTradeByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPut("{id}/close")]
    public async Task<IActionResult> CloseTrade(Guid id, [FromBody] TradeCloseDto request)
    {
        try
        {
            var result = await _tradeService.CloseTradeAsync(id, request);
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

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTrade(Guid id)
    {
        try
        {
            await _tradeService.DeleteTradeAsync(id);
            return NoContent();
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
}
