using Confluence.Application.DTOs.Settings;

namespace Confluence.Application.Interfaces;

public interface IUserSettingsService
{
    Task<UserSettingsDto> GetSettingsAsync();
    Task<UserSettingsDto> UpdateSettingsAsync(UserSettingsDto request);
}
