using Confluence.Application.Interfaces;
using System.Net.Http.Json;

namespace Confluence.Infrastructure.ExternalServices;

public class AiServiceClient : IAiServiceClient
{
    private readonly HttpClient _httpClient;

    public AiServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// <inheritdoc />
    public async Task<string> AnalyzeAsync(
        string symbol,
        string timeframe,
        decimal balance,
        decimal riskPercentage,
        string sessionId,
        string riskProfile = "moderate",
        IEnumerable<string>? timeframes = null,
        Dictionary<string, object>? strategyConfig = null)
    {
        var payload = new
        {
            symbol,
            timeframe,
            balance,
            risk_percentage = riskPercentage,
            session_id = sessionId,
            risk_profile = riskProfile,
            // Only include timeframes when multi-TF is requested; null omits the field.
            timeframes = timeframes?.ToList(),
            // Only include strategy_config when a strategy template is selected.
            strategy_config = strategyConfig
        };

        var response = await _httpClient.PostAsJsonAsync("/analyze", payload);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> RunBacktestAsync(object requestPayload)
    {
        var response = await _httpClient.PostAsJsonAsync("/backtest", requestPayload);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"AI Service Backtest Failed: {error}");
        }

        return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> ReviewTradeAsync(object reviewPayload)
    {
        var response = await _httpClient.PostAsJsonAsync("/review-trade", reviewPayload);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"AI Service Trade Review Failed: {error}");
        }

        return await response.Content.ReadAsStringAsync();
    }
}
