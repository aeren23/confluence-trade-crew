using System.Text.Json;
using Confluence.Application.DTOs.Trade;
using Confluence.Application.Interfaces;
using Confluence.Domain.Entities;
using Confluence.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Confluence.Application.Services;

public class TradeReviewService : ITradeReviewService
{
    private readonly DbContext _context;
    private readonly IAiServiceClient _aiServiceClient;

    public TradeReviewService(DbContext context, IAiServiceClient aiServiceClient)
    {
        _context = context;
        _aiServiceClient = aiServiceClient;
    }

    public async Task<TradeReviewResponseDto> GenerateReviewAsync(Guid tradeId)
    {
        // 1. Fetch trade with analysis
        var trade = await _context.Set<Trade>()
            .Include(t => t.Analysis)
            .FirstOrDefaultAsync(t => t.Id == tradeId);

        if (trade == null)
            throw new KeyNotFoundException($"Trade with ID {tradeId} not found.");

        if (trade.Status != TradeStatus.Closed)
            throw new InvalidOperationException("Can only review closed trades.");

        // 2. Prepare payload
        var reviewPayload = new
        {
            trade_id = trade.Id.ToString(),
            symbol = trade.Symbol,
            direction = trade.Direction.ToString(),
            entry_price = trade.EntryPrice,
            exit_price = trade.ExitPrice,
            stop_loss = trade.StopLoss,
            take_profit = trade.TakeProfit,
            leverage = trade.Leverage,
            entry_at = trade.EntryAt.ToString("O"),
            exit_at = trade.ExitAt?.ToString("O"),
            pnl_quote = trade.PnlQuote,
            pnl_percentage = trade.PnlPercentage,
            tags = trade.Tags,
            notes = trade.Notes,
            analysis_result_json = trade.Analysis?.ResultJson
        };

        // 3. Call AI Service
        var resultJson = await _aiServiceClient.ReviewTradeAsync(reviewPayload);

        // 4. Parse response
        using var document = JsonDocument.Parse(resultJson);
        var root = document.RootElement;

        var review = new TradeReview
        {
            TradeId = trade.Id,
            Verdict = root.GetProperty("verdict").GetString() ?? "fair",
            ExecutionScore = root.GetProperty("execution_score").GetDecimal(),
            PlanAdherence = root.GetProperty("plan_adherence").GetBoolean(),
            PlanAdherenceExplanation = root.GetProperty("plan_adherence_explanation").GetString() ?? "",
            SlTpRational = root.GetProperty("sl_tp_rational").GetBoolean(),
            SlTpAnalysis = root.GetProperty("sl_tp_analysis").GetString() ?? "",
            TimingVerdict = root.GetProperty("timing_verdict").GetString() ?? "optimal",
            TimingExplanation = root.GetProperty("timing_explanation").GetString() ?? "",
            ImprovementAdvice = root.GetProperty("improvement_advice").GetString() ?? "",
            FullReviewJson = resultJson
        };

        // 5. Save to DB
        _context.Set<TradeReview>().Add(review);
        await _context.SaveChangesAsync();

        // 6. Return DTO
        return MapToDto(review);
    }

    public async Task<List<TradeReviewResponseDto>> GetReviewsByTradeAsync(Guid tradeId)
    {
        var reviews = await _context.Set<TradeReview>()
            .Where(r => r.TradeId == tradeId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return reviews.Select(MapToDto).ToList();
    }

    private static TradeReviewResponseDto MapToDto(TradeReview review)
    {
        return new TradeReviewResponseDto
        {
            Id = review.Id,
            TradeId = review.TradeId,
            Verdict = review.Verdict,
            ExecutionScore = review.ExecutionScore,
            PlanAdherence = review.PlanAdherence,
            PlanAdherenceExplanation = review.PlanAdherenceExplanation,
            SlTpRational = review.SlTpRational,
            SlTpAnalysis = review.SlTpAnalysis,
            TimingVerdict = review.TimingVerdict,
            TimingExplanation = review.TimingExplanation,
            ImprovementAdvice = review.ImprovementAdvice,
            CreatedAt = review.CreatedAt
        };
    }
}
