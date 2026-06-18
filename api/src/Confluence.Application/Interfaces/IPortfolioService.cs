using Confluence.Application.DTOs.Portfolio;

namespace Confluence.Application.Interfaces;

public interface IPortfolioService
{
    Task<PortfolioSummaryDto> GetSummaryAsync();
}
