using Confluence.Application.Interfaces;
using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Net.Http;

namespace Confluence.Application.Services;

public class AccuracyService : IAccuracyService
{
    private readonly DbContext _context;
    private readonly HttpClient _httpClient;

    public AccuracyService(DbContext context, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        // Public Binance API client
        _httpClient = httpClientFactory.CreateClient("BinanceClient");
        if (_httpClient.BaseAddress == null)
        {
            _httpClient.BaseAddress = new Uri("https://api.binance.com");
        }
    }

    public async Task<AnalysisAccuracy> EvaluateAnalysisAccuracyAsync(Guid analysisId, string intervalLabel)
    {
        var analysis = await _context.Set<Analysis>().FindAsync(analysisId);
        if (analysis == null)
            throw new KeyNotFoundException($"Analysis with ID {analysisId} not found.");

        // Get current market price from Binance API
        var formattedSymbol = analysis.Symbol.Replace("/", "").ToUpper(); // e.g., "BTCUSDT"
        var response = await _httpClient.GetAsync($"/api/v3/ticker/price?symbol={formattedSymbol}");
        response.EnsureSuccessStatusCode();
        
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var currentPrice = decimal.Parse(doc.RootElement.GetProperty("price").GetString()!);

        // Calculate changes
        var entryPrice = analysis.LatestPrice;
        if (entryPrice <= 0)
            throw new InvalidOperationException("Analysis does not have a valid entry price to check against.");

        var changePct = ((currentPrice - entryPrice) / entryPrice) * 100m;
        var predictedDirection = analysis.OverallSentiment.ToString().ToLower(); // "bullish", "bearish", "neutral"

        bool isAccurate = false;
        bool wasMissedOpp = false;

        if (predictedDirection == "bullish")
        {
            isAccurate = changePct > 0;
        }
        else if (predictedDirection == "bearish")
        {
            isAccurate = changePct < 0;
        }
        else // neutral
        {
            isAccurate = Math.Abs(changePct) <= 1.0m;
            wasMissedOpp = Math.Abs(changePct) > 2.0m;
        }

        decimal? pnlPct = null;
        if (predictedDirection == "bullish") pnlPct = changePct;
        if (predictedDirection == "bearish") pnlPct = -changePct;

        // Create or update the accuracy record
        var existingRecord = await _context.Set<AnalysisAccuracy>()
            .FirstOrDefaultAsync(a => a.AnalysisId == analysisId && a.CheckInterval == intervalLabel);

        AnalysisAccuracy accuracyRecord;
        if (existingRecord != null)
        {
            accuracyRecord = existingRecord;
            accuracyRecord.PriceAtCheck = currentPrice;
            accuracyRecord.PriceChangePct = changePct;
            accuracyRecord.IsAccurate = isAccurate;
            accuracyRecord.WasMissedOpportunity = wasMissedOpp;
            accuracyRecord.PotentialPnlPct = pnlPct;
            accuracyRecord.CheckedAt = DateTime.UtcNow;
            _context.Update(accuracyRecord);
        }
        else
        {
            accuracyRecord = new AnalysisAccuracy
            {
                AnalysisId = analysisId,
                CheckInterval = intervalLabel,
                PriceAtCheck = currentPrice,
                PriceChangePct = changePct,
                PredictedDirection = predictedDirection,
                IsAccurate = isAccurate,
                WasMissedOpportunity = wasMissedOpp,
                PotentialPnlPct = pnlPct,
                CheckedAt = DateTime.UtcNow
            };
            _context.Set<AnalysisAccuracy>().Add(accuracyRecord);
        }

        await _context.SaveChangesAsync();
        return accuracyRecord;
    }

    public async Task<IEnumerable<AnalysisAccuracy>> GetAccuracyForAnalysisAsync(Guid analysisId)
    {
        return await _context.Set<AnalysisAccuracy>()
            .Where(a => a.AnalysisId == analysisId)
            .OrderByDescending(a => a.CheckedAt)
            .ToListAsync();
    }

    public async Task<object> GetGlobalAccuracyStatsAsync()
    {
        var records = await _context.Set<AnalysisAccuracy>().ToListAsync();
        if (!records.Any())
            return new { totalEvaluated = 0, winRate = 0m, averagePnlPct = 0m };

        // We only calculate stats on Bullish/Bearish predictions (Neutral is harder to evaluate as 'win/loss')
        var actionableRecords = records.Where(r => r.PredictedDirection != "neutral").ToList();
        
        var total = actionableRecords.Count;
        var wins = actionableRecords.Count(r => r.IsAccurate);
        var winRate = total > 0 ? (decimal)wins / total * 100m : 0m;
        
        var avgPnl = total > 0 ? actionableRecords.Average(r => r.PotentialPnlPct ?? 0m) : 0m;

        return new
        {
            totalEvaluated = total,
            winRate = Math.Round(winRate, 2),
            averagePnlPct = Math.Round(avgPnl, 2),
            missedOpportunities = records.Count(r => r.WasMissedOpportunity)
        };
    }
}
