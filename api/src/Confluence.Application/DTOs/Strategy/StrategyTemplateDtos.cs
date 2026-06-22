namespace Confluence.Application.DTOs.Strategy;

public class StrategyTemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsPreset { get; set; }
    public List<string> Timeframes { get; set; } = [];
    public string RiskProfile { get; set; } = string.Empty;
    public decimal MinimumRR { get; set; }
    public decimal NewsWeight { get; set; }
    public Dictionary<string, decimal> TimeframeWeights { get; set; } = [];
    public string IconEmoji { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateStrategyDto
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Timeframes { get; set; } = [];
    public string RiskProfile { get; set; } = "moderate";
    public decimal MinimumRR { get; set; } = 1.5m;
    public decimal NewsWeight { get; set; } = 0.20m;
    public Dictionary<string, decimal> TimeframeWeights { get; set; } = [];
    public string IconEmoji { get; set; } = "📊";
    public string ColorHex { get; set; } = "#60A5FA";
}

public class UpdateStrategyDto
{
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public List<string>? Timeframes { get; set; }
    public string? RiskProfile { get; set; }
    public decimal? MinimumRR { get; set; }
    public decimal? NewsWeight { get; set; }
    public Dictionary<string, decimal>? TimeframeWeights { get; set; }
    public string? IconEmoji { get; set; }
    public string? ColorHex { get; set; }
}
