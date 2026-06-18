using Confluence.Domain.Enums;

namespace Confluence.Application.DTOs.Analysis;

public class AnalysisResponseDto
{
    public Guid Id { get; set; }
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
    
    public DateTime CreatedAt { get; set; }
}
