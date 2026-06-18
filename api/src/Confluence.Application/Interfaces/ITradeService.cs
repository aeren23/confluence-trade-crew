using Confluence.Application.Common;
using Confluence.Application.DTOs.Trade;

namespace Confluence.Application.Interfaces;

public interface ITradeService
{
    Task<TradeResponseDto> CreateTradeAsync(TradeCreateDto request);
    Task<TradeResponseDto?> GetTradeByIdAsync(Guid id);
    Task<PagedResult<TradeResponseDto>> GetTradesAsync(string? status, string? symbol, int page, int pageSize);
    Task<TradeResponseDto> CloseTradeAsync(Guid id, TradeCloseDto request);
    Task DeleteTradeAsync(Guid id);
}
