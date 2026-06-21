namespace Confluence.Application.DTOs.Analysis;

public class AnalysisRequestDto
{
    public string Symbol { get; set; } = string.Empty;
    /// <summary>Primary / display timeframe. Used as the single TF in standard mode.</summary>
    public string Timeframe { get; set; } = string.Empty;
    /// <summary>
    /// Optional list of timeframes for Multi-Timeframe Confluence analysis.
    /// When 2+ entries are provided, the AI service runs parallel per-TF TA pipelines
    /// and returns a weighted Confluence Score in addition to the standard output.
    /// </summary>
    public List<string>? Timeframes { get; set; }
    public decimal Balance { get; set; }
    public decimal RiskPercentage { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string RiskProfile { get; set; } = "moderate";
}
