namespace Confluence.Domain.Entities;

/// <summary>
/// Represents a reusable trading strategy profile that configures
/// the analysis pipeline (timeframes, risk, weights, etc.).
/// Preset strategies are read-only; users can create custom ones.
/// </summary>
public class StrategyTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Machine key, e.g. "scalp", "intraday", "swing", "position".</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>User-facing display name, e.g. "Scalp Trading".</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Short description shown in tooltips/cards.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>When true, strategy cannot be modified or deleted by the user.</summary>
    public bool IsPreset { get; set; } = false;

    /// <summary>JSON array of timeframes to analyze, e.g. ["15m","1h","4h"].</summary>
    public string TimeframesJson { get; set; } = "[]";

    /// <summary>Risk profile identifier: conservative | moderate | aggressive.</summary>
    public string RiskProfile { get; set; } = "moderate";

    /// <summary>Minimum acceptable Risk:Reward ratio for a valid signal.</summary>
    public decimal MinimumRR { get; set; } = 1.5m;

    /// <summary>Weight given to news agent output in the final confluence score (0.0–1.0).</summary>
    public decimal NewsWeight { get; set; } = 0.20m;

    /// <summary>
    /// JSON object of per-timeframe weights, e.g. {"4h": 0.40, "1h": 0.35, "15m": 0.25}.
    /// Must sum to ≤1.0; remaining weight is distributed evenly if any TF is missing.
    /// </summary>
    public string TimeframeWeightsJson { get; set; } = "{}";

    /// <summary>Emoji icon for UI display.</summary>
    public string IconEmoji { get; set; } = "📊";

    /// <summary>Hex color code used for UI accent, e.g. "#60A5FA".</summary>
    public string ColorHex { get; set; } = "#60A5FA";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
