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
    /// <summary>
    /// Optional strategy template configuration forwarded to the AI service.
    /// Keys: timeframe_weights (dict), news_weight (float), minimum_rr (float).
    /// When null, the AI service uses default scoring weights.
    /// </summary>
    public Dictionary<string, object>? StrategyConfig { get; set; }
}
