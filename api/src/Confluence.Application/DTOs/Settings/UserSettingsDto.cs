namespace Confluence.Application.DTOs.Settings;

public class UserSettingsDto
{
    public decimal DefaultBalance { get; set; }
    public decimal DefaultRiskPercentage { get; set; }
    public string PreferredTimeframe { get; set; } = string.Empty;
    public string RiskProfile { get; set; } = "moderate";
}
