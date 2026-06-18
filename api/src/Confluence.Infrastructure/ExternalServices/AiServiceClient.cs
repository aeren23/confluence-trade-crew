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

    public async Task<string> AnalyzeAsync(string symbol, string timeframe, decimal balance, decimal riskPercentage, string sessionId)
    {
        var payload = new
        {
            symbol = symbol,
            timeframe = timeframe,
            balance = balance,
            risk_percentage = riskPercentage,
            session_id = sessionId
        };

        var response = await _httpClient.PostAsJsonAsync("/analyze", payload);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync();
    }
}
