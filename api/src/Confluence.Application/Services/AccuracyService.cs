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

        var entryPrice = analysis.LatestPrice;
        if (entryPrice <= 0)
            throw new InvalidOperationException("Analysis does not have a valid entry price to check against.");

        var predictedDirection = analysis.OverallSentiment.ToString().ToLower(); // "bullish", "bearish", "neutral"

        // Parse SL/TP from ResultJson
        decimal? sl = null;
        decimal? tp1 = null;
        decimal? tp2 = null;

        if (!string.IsNullOrWhiteSpace(analysis.ResultJson))
        {
            try
            {
                using var docRes = JsonDocument.Parse(analysis.ResultJson);
                var rootRes = docRes.RootElement;
                if (rootRes.TryGetProperty("agents", out var agents) && 
                    agents.TryGetProperty("risk", out var risk) && 
                    risk.TryGetProperty("details", out var details) && 
                    details.TryGetProperty("levels", out var levels))
                {
                    if (levels.TryGetProperty("stop_loss", out var s) && s.ValueKind == JsonValueKind.Number) sl = s.GetDecimal();
                    if (levels.TryGetProperty("take_profit_1", out var t1) && t1.ValueKind == JsonValueKind.Number) tp1 = t1.GetDecimal();
                    else if (levels.TryGetProperty("take_profit", out var t) && t.ValueKind == JsonValueKind.Number) tp1 = t.GetDecimal();
                    if (levels.TryGetProperty("take_profit_2", out var t2) && t2.ValueKind == JsonValueKind.Number) tp2 = t2.GetDecimal();
                    
                    // Note: We keep entryPrice as LatestPrice (the moment analysis was requested) for accuracy check 
                    // since the bot uses market entries for tracking. 
                }
            }
            catch { /* Ignore parsing errors */ }
        }

        // Get OHLCV Klines from Binance API starting from Analysis Creation
        var formattedSymbol = analysis.Symbol.Replace("/", "").ToUpper(); // e.g., "BTCUSDT"
        var startTimeMs = new DateTimeOffset(analysis.CreatedAt).ToUnixTimeMilliseconds();
        
        var response = await _httpClient.GetAsync($"/api/v3/klines?symbol={formattedSymbol}&interval=5m&startTime={startTimeMs}&limit=500");
        response.EnsureSuccessStatusCode();
        
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var klines = doc.RootElement;

        bool hitEntry = true; // Assume entry is hit instantly for market analysis
        bool hitSl = false;
        bool hitTp1 = false;
        bool hitTp2 = false;
        decimal currentPrice = entryPrice;

        foreach (var kline in klines.EnumerateArray())
        {
            if (kline.GetArrayLength() < 5) continue;
            var high = decimal.Parse(kline[2].GetString()!);
            var low = decimal.Parse(kline[3].GetString()!);
            currentPrice = decimal.Parse(kline[4].GetString()!); // Close price

            if (hitEntry && !hitSl)
            {
                if (predictedDirection == "bullish")
                {
                    if (sl.HasValue && low <= sl.Value) hitSl = true;
                    if (!hitTp1 && tp1.HasValue && high >= tp1.Value) hitTp1 = true;
                    if (!hitTp2 && tp2.HasValue && high >= tp2.Value) hitTp2 = true;

                    // Pessimistic execution logic (if both hit in same candle, assume SL hit first)
                    if (hitSl && hitTp1) hitTp1 = false;
                    if (hitSl && hitTp2) hitTp2 = false;
                }
                else if (predictedDirection == "bearish")
                {
                    if (sl.HasValue && high >= sl.Value) hitSl = true;
                    if (!hitTp1 && tp1.HasValue && low <= tp1.Value) hitTp1 = true;
                    if (!hitTp2 && tp2.HasValue && low <= tp2.Value) hitTp2 = true;

                    if (hitSl && hitTp1) hitTp1 = false;
                    if (hitSl && hitTp2) hitTp2 = false;
                }
            }
            if (hitSl) break;
        }

        // Calculate changes based on final/current price
        var changePct = ((currentPrice - entryPrice) / entryPrice) * 100m;

        bool isAccurate = false;
        bool wasMissedOpp = false;

        if (predictedDirection == "bullish" || predictedDirection == "bearish")
        {
            // Now accurate if TP1 was hit before SL!
            isAccurate = hitTp1;
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
            accuracyRecord.HitEntry = hitEntry;
            accuracyRecord.HitStopLoss = hitSl;
            accuracyRecord.HitTakeProfit1 = hitTp1;
            accuracyRecord.HitTakeProfit2 = hitTp2;
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
                HitEntry = hitEntry,
                HitStopLoss = hitSl,
                HitTakeProfit1 = hitTp1,
                HitTakeProfit2 = hitTp2,
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
