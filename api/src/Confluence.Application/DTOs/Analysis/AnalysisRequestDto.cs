namespace Confluence.Application.DTOs.Analysis;

public class AnalysisRequestDto
{
    public string Symbol { get; set; } = string.Empty;
    public string Timeframe { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal RiskPercentage { get; set; }
    public string SessionId { get; set; } = string.Empty;
}
