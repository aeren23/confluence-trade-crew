using Confluence.Application.DTOs.Trade;

namespace Confluence.Application.Interfaces;

public interface ITradeReviewService
{
    Task<TradeReviewResponseDto> GenerateReviewAsync(Guid tradeId);
    Task<List<TradeReviewResponseDto>> GetReviewsByTradeAsync(Guid tradeId);
}
