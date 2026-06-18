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

    public TradeService(DbContext context, IPairService pairService)
    {
        _context = context;
        _pairService = pairService;
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
            Notes = request.Notes
        };

        _context.Set<Trade>().Add(trade);
        await _context.SaveChangesAsync();

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

        // Calculate PnL
        var positionValue = trade.EntryAmount * trade.EntryPrice;

        trade.PnlQuote = trade.Direction == TradeDirection.Long
            ? (request.ExitPrice - trade.EntryPrice) * trade.EntryAmount * trade.Leverage
            : (trade.EntryPrice - request.ExitPrice) * trade.EntryAmount * trade.Leverage;

        if (positionValue > 0)
        {
            trade.PnlPercentage = (trade.PnlQuote / positionValue) * 100;
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
            CreatedAt = trade.CreatedAt,
            UpdatedAt = trade.UpdatedAt
        };
    }
}
