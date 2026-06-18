namespace Confluence.Application.Interfaces;

public interface IAiServiceClient
{
    // The implementation will call the Python FastAPI service POST /analyze
    Task<string> AnalyzeAsync(string symbol, string timeframe, decimal balance, decimal riskPercentage, string sessionId);
}
