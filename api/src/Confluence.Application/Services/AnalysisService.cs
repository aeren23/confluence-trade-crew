using System.Text.Json;
using Confluence.Application.Common;
using Confluence.Application.DTOs.Analysis;
using Confluence.Application.Interfaces;
using Confluence.Domain.Entities;
using Confluence.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Confluence.Application.Services;

public class AnalysisService : IAnalysisService
{
    private readonly DbContext _context;
    private readonly IAiServiceClient _aiServiceClient;
    private readonly IPairService _pairService;

    public AnalysisService(DbContext context, IAiServiceClient aiServiceClient, IPairService pairService)
    {
        _context = context;
        _aiServiceClient = aiServiceClient;
        _pairService = pairService;
    }

    public async Task<AnalysisResponseDto> CreateAnalysisAsync(AnalysisRequestDto request)
    {
        // 1. Ensure pair exists/is active
        var parts = request.Symbol.Split('/');
        var baseAsset = parts.Length > 0 ? parts[0] : request.Symbol;
        var quoteAsset = parts.Length > 1 ? parts[1] : "USDT"; // Default
        
        await _pairService.GetOrCreatePairAsync(request.Symbol, baseAsset, quoteAsset);

        // 2. Call AI Service
        var resultJson = await _aiServiceClient.AnalyzeAsync(
            request.Symbol, 
            request.Timeframe, 
            request.Balance, 
            request.RiskPercentage,
            request.SessionId);

        // 3. Parse result
        var cleanJson = resultJson.Trim();
        if (cleanJson.StartsWith("```json"))
            cleanJson = cleanJson.Substring(7);
        if (cleanJson.EndsWith("```"))
            cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);
        cleanJson = cleanJson.Trim();

        using var document = JsonDocument.Parse(cleanJson);
        var root = document.RootElement;
        var synthesis = root.GetProperty("synthesis");

        var overallSentimentStr = synthesis.GetProperty("overall_sentiment").GetString() ?? "Neutral";
        var sentiment = Enum.TryParse<Sentiment>(overallSentimentStr, true, out var s) ? s : Sentiment.Neutral;
        
        var score = synthesis.GetProperty("overall_sentiment_score").GetDecimal();
        var confidence = synthesis.GetProperty("confidence").GetDecimal();
        var conflicts = synthesis.GetProperty("conflicts_detected").GetBoolean();

        // 4. Extract latest price from annotations or default to 0 for now
        // In a real scenario, this might come from the result JSON or a market data service.
        var latestPrice = 0m; 

        // 5. Save Analysis to DB
        var analysis = new Analysis
        {
            Symbol = request.Symbol,
            Timeframe = request.Timeframe,
            RequestedBalance = request.Balance,
            RequestedRiskPercentage = request.RiskPercentage,
            OverallSentiment = sentiment,
            OverallSentimentScore = score,
            Confidence = confidence,
            ConflictsDetected = conflicts,
            LatestPrice = latestPrice,
            ResultJson = cleanJson
        };

        _context.Set<Analysis>().Add(analysis);
        await _context.SaveChangesAsync();

        // 6. Return response
        return new AnalysisResponseDto
        {
            Id = analysis.Id,
            Symbol = analysis.Symbol,
            Timeframe = analysis.Timeframe,
            RequestedBalance = analysis.RequestedBalance,
            RequestedRiskPercentage = analysis.RequestedRiskPercentage,
            OverallSentiment = analysis.OverallSentiment,
            OverallSentimentScore = analysis.OverallSentimentScore,
            Confidence = analysis.Confidence,
            ConflictsDetected = analysis.ConflictsDetected,
            LatestPrice = analysis.LatestPrice,
            ResultJson = analysis.ResultJson,
            CreatedAt = analysis.CreatedAt
        };
    }

    public async Task<AnalysisResponseDto?> GetAnalysisByIdAsync(Guid id)
    {
        var analysis = await _context.Set<Analysis>().FindAsync(id);
        if (analysis == null) return null;

        return new AnalysisResponseDto
        {
            Id = analysis.Id,
            Symbol = analysis.Symbol,
            Timeframe = analysis.Timeframe,
            RequestedBalance = analysis.RequestedBalance,
            RequestedRiskPercentage = analysis.RequestedRiskPercentage,
            OverallSentiment = analysis.OverallSentiment,
            OverallSentimentScore = analysis.OverallSentimentScore,
            Confidence = analysis.Confidence,
            ConflictsDetected = analysis.ConflictsDetected,
            LatestPrice = analysis.LatestPrice,
            ResultJson = analysis.ResultJson,
            CreatedAt = analysis.CreatedAt
        };
    }

    public async Task<PagedResult<AnalysisListItemDto>> GetAnalysesAsync(string? symbol, int page, int pageSize)
    {
        var query = _context.Set<Analysis>().AsQueryable();

        if (!string.IsNullOrWhiteSpace(symbol))
        {
            query = query.Where(a => a.Symbol == symbol);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AnalysisListItemDto
            {
                Id = a.Id,
                Symbol = a.Symbol,
                Timeframe = a.Timeframe,
                OverallSentiment = a.OverallSentiment,
                OverallSentimentScore = a.OverallSentimentScore,
                Confidence = a.Confidence,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return new PagedResult<AnalysisListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
}
