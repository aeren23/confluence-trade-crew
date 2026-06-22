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
            request.SessionId,
            request.RiskProfile,
            request.Timeframes,
            request.StrategyConfig);

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

        // 4. Extract latest price — try multiple locations in the AI response JSON
        var latestPrice = ExtractLatestPrice(root);

        // 5. Extract Multi-Timeframe Confluence data (null for single-TF analyses)
        var (confluenceScore, confluenceAlignment, timeframesAnalyzed) =
            ExtractMultiTimeframeData(root);

        // 6. Save Analysis to DB
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
            ResultJson = cleanJson,
            TimeframesAnalyzed = timeframesAnalyzed,
            ConfluenceScore = confluenceScore,
            ConfluenceAlignment = confluenceAlignment,
        };

        _context.Set<Analysis>().Add(analysis);
        await _context.SaveChangesAsync();

        // 7. Return response
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
            TimeframesAnalyzed = analysis.TimeframesAnalyzed,
            ConfluenceScore = analysis.ConfluenceScore,
            ConfluenceAlignment = analysis.ConfluenceAlignment,
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

    public async Task<PagedResult<AnalysisListItemDto>> GetAnalysesAsync(
        string? symbol,
        int page,
        int pageSize,
        string? direction = null,
        bool conflictsOnly = false,
        decimal? minConfidence = null)
    {
        var query = _context.Set<Analysis>().AsQueryable();

        if (!string.IsNullOrWhiteSpace(symbol))
        {
            query = query.Where(a => a.Symbol == symbol);
        }

        if (conflictsOnly)
        {
            query = query.Where(a => a.ConflictsDetected);
        }

        if (minConfidence.HasValue)
        {
            query = query.Where(a => a.Confidence >= minConfidence.Value);
        }

        var normalizedDirection = NormalizeDirectionFilter(direction);
        int totalCount;
        List<AnalysisListItemDto> items;

        if (!string.IsNullOrWhiteSpace(normalizedDirection))
        {
            var filtered = (await query
                    .OrderByDescending(a => a.CreatedAt)
                    .ToListAsync())
                .Where(a => ExtractPositionDirection(a.ResultJson) == normalizedDirection)
                .ToList();

            totalCount = filtered.Count;
            items = filtered
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(MapToListItem)
                .ToList();
        }
        else
        {
            totalCount = await query.CountAsync();

            items = await query
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
        }

        return new PagedResult<AnalysisListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private static string? NormalizeDirectionFilter(string? direction)
    {
        if (string.IsNullOrWhiteSpace(direction)) return null;

        var normalized = direction.Trim().ToLowerInvariant();
        return normalized switch
        {
            "long" => "long",
            "short" => "short",
            "neutral" => "neutral",
            "wait" => "neutral",
            _ => null
        };
    }

    private static string? ExtractPositionDirection(string resultJson)
    {
        try
        {
            using var document = JsonDocument.Parse(resultJson);
            if (document.RootElement.TryGetProperty("agents", out var agents) &&
                agents.TryGetProperty("risk", out var risk) &&
                risk.TryGetProperty("details", out var details) &&
                details.TryGetProperty("position_direction", out var directionElem))
            {
                return directionElem.GetString()?.Trim().ToLowerInvariant();
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static AnalysisListItemDto MapToListItem(Analysis analysis)
    {
        return new AnalysisListItemDto
        {
            Id = analysis.Id,
            Symbol = analysis.Symbol,
            Timeframe = analysis.Timeframe,
            OverallSentiment = analysis.OverallSentiment,
            OverallSentimentScore = analysis.OverallSentimentScore,
            Confidence = analysis.Confidence,
            CreatedAt = analysis.CreatedAt
        };
    }

    /// <summary>
    /// Extracts the latest market price from the AI response JSON.
    /// Tries: agents.data.details.latest_price → agents.risk.details.levels.entry → first annotation value.
    /// </summary>
    private static decimal ExtractLatestPrice(JsonElement root)
    {
        // Primary: Data Agent's latest_price field
        if (root.TryGetProperty("agents", out var agents))
        {
            if (agents.TryGetProperty("data", out var dataAgent) &&
                dataAgent.TryGetProperty("details", out var dataDetails) &&
                dataDetails.TryGetProperty("latest_price", out var lpElem) &&
                lpElem.ValueKind == JsonValueKind.Number)
            {
                return lpElem.GetDecimal();
            }

            // Fallback 1: Risk Agent entry level
            if (agents.TryGetProperty("risk", out var riskAgent) &&
                riskAgent.TryGetProperty("details", out var riskDetails) &&
                riskDetails.TryGetProperty("levels", out var levels) &&
                levels.TryGetProperty("entry", out var entryElem) &&
                entryElem.ValueKind == JsonValueKind.Number)
            {
                return entryElem.GetDecimal();
            }
        }

        // Fallback 2: First horizontal_line annotation value
        if (root.TryGetProperty("annotations", out var annotations) &&
            annotations.ValueKind == JsonValueKind.Array)
        {
            foreach (var ann in annotations.EnumerateArray())
            {
                if (ann.TryGetProperty("value", out var valElem) &&
                    valElem.ValueKind == JsonValueKind.Number)
                {
                    return valElem.GetDecimal();
                }
            }
        }

        return 0m;
    }

    /// <summary>
    /// Extracts Multi-Timeframe Confluence data from the AI response JSON.
    /// Returns (confluenceScore, confluenceAlignment, timeframesAnalyzed) or nulls for single-TF analyses.
    /// </summary>
    private static (decimal? ConfluenceScore, string? ConfluenceAlignment, string? TimeframesAnalyzed)
        ExtractMultiTimeframeData(JsonElement root)
    {
        if (!root.TryGetProperty("multi_timeframe_confluence", out var mtfElem) ||
            mtfElem.ValueKind != JsonValueKind.Object)
        {
            return (null, null, null);
        }

        decimal? score = null;
        string? alignment = null;
        string? timeframesJson = null;

        if (mtfElem.TryGetProperty("confluence_score", out var scoreElem) &&
            scoreElem.ValueKind == JsonValueKind.Number)
        {
            score = scoreElem.GetDecimal();
        }

        if (mtfElem.TryGetProperty("alignment", out var alignElem))
        {
            alignment = alignElem.GetString();
        }

        if (mtfElem.TryGetProperty("timeframes_analyzed", out var tfElem) &&
            tfElem.ValueKind == JsonValueKind.Array)
        {
            timeframesJson = tfElem.GetRawText();
        }

        return (score, alignment, timeframesJson);
    }
}
