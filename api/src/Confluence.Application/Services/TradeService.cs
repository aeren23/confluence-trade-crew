using System.Text.Json;
using Confluence.Application.Common;
using Confluence.Application.DTOs.Trade;
using Confluence.Application.Interfaces;
using Confluence.Domain.Entities;
using Confluence.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Confluence.Application.Services;

public class TradeService : ITradeService
{
    private readonly DbContext _context;
    private readonly IPairService _pairService;
    private readonly ISnapshotService _snapshotService;

    public TradeService(DbContext context, IPairService pairService, ISnapshotService snapshotService)
    {
        _context = context;
        _pairService = pairService;
        _snapshotService = snapshotService;
    }

    public async Task<TradeResponseDto> CreateTradeAsync(TradeCreateDto request)
    {
        // Ensure pair exists
        var parts = request.Symbol.Split('/');
        var baseAsset = parts.Length > 0 ? parts[0] : request.Symbol;
        var quoteAsset = parts.Length > 1 ? parts[1] : "USDT";
        await _pairService.GetOrCreatePairAsync(request.Symbol, baseAsset, quoteAsset);

        var trade = new Trade
        {
            AnalysisId = request.AnalysisId,
            Symbol = request.Symbol,
            Direction = request.Direction,
            Status = TradeStatus.Open,
            EntryPrice = request.EntryPrice,
            EntryAmount = request.EntryAmount,
            Leverage = request.Leverage,
            StopLoss = request.StopLoss,
            TakeProfit = request.TakeProfit,
            EntryAt = request.EntryAt,
            Notes = request.Notes,
            Tags = request.Tags
        };

        // Execution Quality
        var plannedEntryPrice = request.PlannedEntryPrice ?? await ExtractPlannedEntryPriceAsync(request.AnalysisId);
        trade.PlannedEntryPrice = plannedEntryPrice;
        
        var execQual = CalculateExecutionQuality(request.EntryPrice, plannedEntryPrice);
        trade.EntrySlippagePct = execQual.slippagePct;
        trade.ExecutionQuality = execQual.quality;

        _context.Set<Trade>().Add(trade);
        await _context.SaveChangesAsync();
        
        // Save Entry Snapshot
        if (!string.IsNullOrEmpty(request.EntrySnapshotBase64))
        {
            trade.EntrySnapshotUrl = await _snapshotService.SaveSnapshotAsync(request.EntrySnapshotBase64, trade.Id, "entry");
            await _context.SaveChangesAsync();
        }

        return MapToDto(trade);
    }

    public async Task<TradeResponseDto?> GetTradeByIdAsync(Guid id)
    {
        var trade = await _context.Set<Trade>().FindAsync(id);
        return trade == null ? null : MapToDto(trade);
    }

    public async Task<PagedResult<TradeResponseDto>> GetTradesAsync(string? status, string? symbol, int page, int pageSize)
    {
        var query = _context.Set<Trade>().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TradeStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(t => t.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(symbol))
        {
            query = query.Where(t => t.Symbol == symbol);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(t => t.EntryAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => MapToDto(t))
            .ToListAsync();

        return new PagedResult<TradeResponseDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<TradeResponseDto> CloseTradeAsync(Guid id, TradeCloseDto request)
    {
        var trade = await _context.Set<Trade>().FindAsync(id);
        if (trade == null)
            throw new KeyNotFoundException($"Trade with ID {id} not found.");

        if (trade.Status == TradeStatus.Closed)
            throw new InvalidOperationException("Trade is already closed.");

        trade.ExitPrice = request.ExitPrice;
        trade.ExitAt = request.ExitAt;
        trade.Status = TradeStatus.Closed;
        trade.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.ExitNotes))
        {
            var exitNote = $"[EXIT] {request.ExitNotes.Trim()}";
            trade.Notes = string.IsNullOrWhiteSpace(trade.Notes)
                ? exitNote
                : $"{trade.Notes}{Environment.NewLine}{exitNote}";
        }

        // Calculate PnL
        var positionValue = trade.EntryAmount * trade.EntryPrice;

        trade.PnlQuote = trade.Direction == TradeDirection.Long
            ? (request.ExitPrice - trade.EntryPrice) * trade.EntryAmount * trade.Leverage
            : (trade.EntryPrice - request.ExitPrice) * trade.EntryAmount * trade.Leverage;

        if (positionValue > 0)
        {
            trade.PnlPercentage = (trade.PnlQuote / positionValue) * 100;
        }
        
        // Save Exit Snapshot
        if (!string.IsNullOrEmpty(request.ExitSnapshotBase64))
        {
            trade.ExitSnapshotUrl = await _snapshotService.SaveSnapshotAsync(request.ExitSnapshotBase64, trade.Id, "exit");
        }

        await _context.SaveChangesAsync();

        return MapToDto(trade);
    }

    public async Task DeleteTradeAsync(Guid id)
    {
        var trade = await _context.Set<Trade>().FindAsync(id);
        if (trade == null)
            throw new KeyNotFoundException($"Trade with ID {id} not found.");

        if (trade.Status != TradeStatus.Open)
            throw new InvalidOperationException("Only open trades can be deleted.");

        _context.Set<Trade>().Remove(trade);
        await _context.SaveChangesAsync();
    }

    public async Task<List<TradeResponseDto>> GetTradesByAnalysisAsync(Guid analysisId)
    {
        var trades = await _context.Set<Trade>()
            .Where(t => t.AnalysisId == analysisId)
            .OrderByDescending(t => t.EntryAt)
            .ToListAsync();

        return trades.Select(MapToDto).ToList();
    }

    private static TradeResponseDto MapToDto(Trade trade)
    {
        return new TradeResponseDto
        {
            Id = trade.Id,
            AnalysisId = trade.AnalysisId,
            Symbol = trade.Symbol,
            Direction = trade.Direction,
            Status = trade.Status,
            EntryPrice = trade.EntryPrice,
            EntryAmount = trade.EntryAmount,
            Leverage = trade.Leverage,
            StopLoss = trade.StopLoss,
            TakeProfit = trade.TakeProfit,
            EntryAt = trade.EntryAt,
            ExitPrice = trade.ExitPrice,
            ExitAt = trade.ExitAt,
            PnlQuote = trade.PnlQuote,
            PnlPercentage = trade.PnlPercentage,
            Notes = trade.Notes,
            Tags = trade.Tags,
            CreatedAt = trade.CreatedAt,
            UpdatedAt = trade.UpdatedAt,
            EntrySnapshotUrl = trade.EntrySnapshotUrl,
            ExitSnapshotUrl = trade.ExitSnapshotUrl,
            PlannedEntryPrice = trade.PlannedEntryPrice,
            EntrySlippagePct = trade.EntrySlippagePct,
            ExecutionQuality = trade.ExecutionQuality
        };
    }
    
    private async Task<decimal?> ExtractPlannedEntryPriceAsync(Guid? analysisId)
    {
        if (analysisId == null) return null;
        
        var analysis = await _context.Set<Analysis>().FindAsync(analysisId.Value);
        if (analysis == null || string.IsNullOrEmpty(analysis.ResultJson)) return null;
        
        using var doc = JsonDocument.Parse(analysis.ResultJson);
        var root = doc.RootElement;
        
        // Try risk_sizing.entry_price → latest_price fallback
        if (root.TryGetProperty("risk_sizing", out var risk) &&
            risk.TryGetProperty("entry_price", out var ep))
            return ep.GetDecimal();
        
        return analysis.LatestPrice > 0 ? analysis.LatestPrice : null;
    }
    
    private static (decimal? slippagePct, string? quality) CalculateExecutionQuality(decimal entryPrice, decimal? plannedPrice)
    {
        if (plannedPrice == null || plannedPrice == 0) return (null, null);
        
        var slippage = Math.Abs(entryPrice - plannedPrice.Value) / plannedPrice.Value * 100m;
        var quality = slippage < 0.3m ? "good" : slippage <= 1.0m ? "fair" : "poor";
        
        return (Math.Round(slippage, 4), quality);
    }
}
