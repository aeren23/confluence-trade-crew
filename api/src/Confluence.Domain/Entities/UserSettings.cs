namespace Confluence.Domain.Entities;

public class UserSettings
{
    public short Id { get; set; } = 1; // Singleton row
    public decimal DefaultBalance { get; set; }
    public decimal DefaultRiskPercentage { get; set; }
    public string PreferredTimeframe { get; set; } = string.Empty;
    public string RiskProfile { get; set; } = "moderate"; // conservative | moderate | aggressive
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
