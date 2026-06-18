using Confluence.Application.DTOs.Portfolio;
using Confluence.Application.Interfaces;
using Confluence.Domain.Entities;
using Confluence.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Confluence.Application.Services;

public class PortfolioService : IPortfolioService
{
    private readonly DbContext _context;

    public PortfolioService(DbContext context)
    {
        _context = context;
    }

    public async Task<PortfolioSummaryDto> GetSummaryAsync()
    {
        var allTrades = await _context.Set<Trade>().ToListAsync();
        
        var openTrades = allTrades.Count(t => t.Status == TradeStatus.Open);
        var closedTrades = allTrades.Where(t => t.Status == TradeStatus.Closed).ToList();
        
        var winCount = closedTrades.Count(t => t.PnlQuote > 0);
        var lossCount = closedTrades.Count(t => t.PnlQuote <= 0);
        var winRate = closedTrades.Count > 0 ? (decimal)winCount / closedTrades.Count * 100 : 0m;
        
        var totalPnlQuote = closedTrades.Sum(t => t.PnlQuote ?? 0m);
        var totalPnlPercentage = closedTrades.Sum(t => t.PnlPercentage ?? 0m);

        return new PortfolioSummaryDto
        {
            TotalTrades = allTrades.Count,
            OpenTrades = openTrades,
            ClosedTrades = closedTrades.Count,
            WinCount = winCount,
            LossCount = lossCount,
            WinRate = Math.Round(winRate, 2),
            TotalPnlQuote = Math.Round(totalPnlQuote, 2),
            TotalPnlPercentage = Math.Round(totalPnlPercentage, 2)
        };
    }
}
