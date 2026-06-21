using Confluence.Domain.Enums;

namespace Confluence.Domain.Entities;

public class Analysis
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Symbol { get; set; } = string.Empty;
    public string Timeframe { get; set; } = string.Empty;
    public decimal RequestedBalance { get; set; }
    public decimal RequestedRiskPercentage { get; set; }
    
    public Sentiment OverallSentiment { get; set; }
    public decimal OverallSentimentScore { get; set; }
    public decimal Confidence { get; set; }
    public bool ConflictsDetected { get; set; }
    
    public decimal LatestPrice { get; set; }
    public string ResultJson { get; set; } = string.Empty;
    
    /// <summary>JSON array of analyzed timeframes, e.g. "['15m','1h','4h','1d']". Null for single-TF analyses.</summary>
    public string? TimeframesAnalyzed { get; set; }
    /// <summary>Weighted confluence score across all timeframes (-1.0 to 1.0). Null for single-TF analyses.</summary>
    public decimal? ConfluenceScore { get; set; }
    /// <summary>Alignment label: 'aligned' | 'mixed' | 'conflicting'. Null for single-TF analyses.</summary>
    public string? ConfluenceAlignment { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
