namespace Confluence.Application.Interfaces;

public interface IAiServiceClient
{
    /// <summary>
    /// Call the Python FastAPI AI Service POST /analyze endpoint.
    /// When <paramref name="timeframes"/> contains 2+ entries, the AI service performs
    /// Multi-Timeframe Confluence analysis and returns a confluence score alongside
    /// the standard agent outputs.
    /// </summary>
    Task<string> AnalyzeAsync(
        string symbol,
        string timeframe,
        decimal balance,
        decimal riskPercentage,
        string sessionId,
        string riskProfile = "moderate",
        IEnumerable<string>? timeframes = null);
}
