using Confluence.Application.DTOs.Settings;
using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Confluence.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly IUserSettingsService _userSettingsService;

    public SettingsController(IUserSettingsService userSettingsService)
    {
        _userSettingsService = userSettingsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var result = await _userSettingsService.GetSettingsAsync();
        return Ok(result);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] UserSettingsDto request)
    {
        var result = await _userSettingsService.UpdateSettingsAsync(request);
        return Ok(result);
    }
}
