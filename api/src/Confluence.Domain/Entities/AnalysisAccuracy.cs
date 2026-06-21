using Confluence.Domain.Enums;

namespace Confluence.Domain.Entities;

/// <summary>
/// Records the accuracy of a single AI analysis prediction at a specific future time interval.
/// One analysis can have multiple accuracy records (1h, 4h, 24h checks).
/// </summary>
public class AnalysisAccuracy
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Foreign key to the analysis being evaluated.</summary>
    public Guid AnalysisId { get; set; }

    /// <summary>The time interval at which the price check was performed: "1h", "4h", or "24h".</summary>
    public string CheckInterval { get; set; } = string.Empty;

    /// <summary>The market price at the time the check was performed.</summary>
    public decimal PriceAtCheck { get; set; }

    /// <summary>Percentage price change from analysis entry price to check price.</summary>
    public decimal PriceChangePct { get; set; }

    /// <summary>The direction the AI predicted: "long", "short", or "neutral".</summary>
    public string PredictedDirection { get; set; } = string.Empty;

    /// <summary>
    /// True if the actual price movement matches the AI prediction direction.
    /// For LONG: price increased (> 0%). For SHORT: price decreased (< 0%). For NEUTRAL: minimal move (< 1%).
    /// </summary>
    public bool IsAccurate { get; set; }

    /// <summary>
    /// True when the AI recommended WAIT/NEUTRAL but the market moved significantly (> 2%).
    /// Indicates a missed trading opportunity.
    /// </summary>
    public bool WasMissedOpportunity { get; set; }

    /// <summary>
    /// Hypothetical PnL percentage if the trade had been taken at the entry price
    /// and is now at the check price (before SL/TP).
    /// </summary>
    public decimal? PotentialPnlPct { get; set; }

    /// <summary>Timestamp when the accuracy check was performed.</summary>
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Analysis Analysis { get; set; } = null!;
}
