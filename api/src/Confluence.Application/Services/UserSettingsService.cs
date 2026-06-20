using Confluence.Application.DTOs.Settings;
using Confluence.Application.Interfaces;
using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Confluence.Application.Services;

public class UserSettingsService : IUserSettingsService
{
    private readonly DbContext _context;

    public UserSettingsService(DbContext context)
    {
        _context = context;
    }

    public async Task<UserSettingsDto> GetSettingsAsync()
    {
        var settings = await _context.Set<UserSettings>().FirstAsync(s => s.Id == 1);
        
        return new UserSettingsDto
        {
            DefaultBalance = settings.DefaultBalance,
            DefaultRiskPercentage = settings.DefaultRiskPercentage,
            PreferredTimeframe = settings.PreferredTimeframe,
            RiskProfile = settings.RiskProfile
        };
    }

    public async Task<UserSettingsDto> UpdateSettingsAsync(UserSettingsDto request)
    {
        var settings = await _context.Set<UserSettings>().FirstAsync(s => s.Id == 1);
        
        settings.DefaultBalance = request.DefaultBalance;
        settings.DefaultRiskPercentage = request.DefaultRiskPercentage;
        settings.PreferredTimeframe = request.PreferredTimeframe;
        settings.RiskProfile = request.RiskProfile;
        settings.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return request;
    }
}
