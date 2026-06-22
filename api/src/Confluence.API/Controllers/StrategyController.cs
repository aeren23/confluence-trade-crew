using Confluence.Application.DTOs.Strategy;
using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Confluence.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StrategyController : ControllerBase
{
    private readonly IStrategyService _strategyService;
    private readonly ILogger<StrategyController> _logger;

    public StrategyController(IStrategyService strategyService, ILogger<StrategyController> logger)
    {
        _strategyService = strategyService;
        _logger = logger;
    }

    /// <summary>Returns all strategy templates (preset + custom). Presets are listed first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<StrategyTemplateDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var result = await _strategyService.GetAllAsync();
        return Ok(result);
    }

    /// <summary>Returns a single strategy template by ID.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(StrategyTemplateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _strategyService.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>Creates a new custom strategy template.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(StrategyTemplateDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateStrategyDto dto)
    {
        try
        {
            var result = await _strategyService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Strategy creation failed");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Updates a custom strategy template. Preset strategies cannot be modified.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(StrategyTemplateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStrategyDto dto)
    {
        try
        {
            var result = await _strategyService.UpdateAsync(id, dto);
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

    /// <summary>Deletes a custom strategy template. Preset strategies cannot be deleted.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _strategyService.DeleteAsync(id);
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
