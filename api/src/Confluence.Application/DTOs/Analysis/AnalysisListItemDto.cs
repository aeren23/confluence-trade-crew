using Confluence.Domain.Enums;

namespace Confluence.Application.DTOs.Analysis;

public class AnalysisListItemDto
{
    public Guid Id { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string Timeframe { get; set; } = string.Empty;
    public Sentiment OverallSentiment { get; set; }
    public decimal OverallSentimentScore { get; set; }
    public decimal Confidence { get; set; }
    public DateTime CreatedAt { get; set; }
}
