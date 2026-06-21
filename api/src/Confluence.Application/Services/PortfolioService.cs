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
        var allTrades = await _context.Set<Trade>().OrderBy(t => t.EntryAt).ToListAsync();

        var openTrades    = allTrades.Where(t => t.Status == TradeStatus.Open).ToList();
        var closedTrades  = allTrades.Where(t => t.Status == TradeStatus.Closed).ToList();

        var winners = closedTrades.Where(t => (t.PnlQuote ?? 0) > 0).ToList();
        var losers  = closedTrades.Where(t => (t.PnlQuote ?? 0) <= 0).ToList();

        var winRate   = closedTrades.Count > 0 ? (decimal)winners.Count / closedTrades.Count * 100 : 0m;
        var avgWin    = winners.Count > 0 ? winners.Average(t => t.PnlQuote ?? 0) : 0m;
        var avgLoss   = losers.Count  > 0 ? Math.Abs(losers.Average(t => t.PnlQuote ?? 0)) : 0m;
        var lossRate  = 1m - (winRate / 100m);
        var expectancy = (winRate / 100m * avgWin) - (lossRate * avgLoss);

        var avgRR = (avgLoss > 0) ? Math.Round(avgWin / avgLoss, 2) : 0m;

        var equityCurve  = BuildEquityCurve(closedTrades);
        var maxDrawdown  = CalculateMaxDrawdown(equityCurve);
        var totalPnl     = closedTrades.Sum(t => t.PnlQuote ?? 0m);
        var recoveryFactor = maxDrawdown != 0 ? Math.Round(totalPnl / Math.Abs(maxDrawdown), 2) : 0m;

        var avgHoldHours = closedTrades
            .Where(t => t.ExitAt.HasValue)
            .Select(t => (t.ExitAt!.Value - t.EntryAt).TotalHours)
            .DefaultIfEmpty(0)
            .Average();

        var (longestWin, longestLoss) = CalculateStreaks(closedTrades);

        var symbolPnl = BySymbolPnl(closedTrades);
        var bestSymbol  = symbolPnl.Count > 0 ? symbolPnl.MaxBy(kv => kv.Value).Key : null;
        var worstSymbol = symbolPnl.Count > 0 ? symbolPnl.MinBy(kv => kv.Value).Key : null;

        return new PortfolioSummaryDto
        {
            TotalTrades         = allTrades.Count,
            OpenTrades          = openTrades.Count,
            ClosedTrades        = closedTrades.Count,
            WinCount            = winners.Count,
            LossCount           = losers.Count,
            WinRate             = Math.Round(winRate, 2),
            TotalPnlQuote       = Math.Round(totalPnl, 2),
            TotalPnlPercentage  = Math.Round(closedTrades.Sum(t => t.PnlPercentage ?? 0m), 2),
            AvgWin              = Math.Round(avgWin, 2),
            AvgLoss             = Math.Round(avgLoss, 2),
            AvgRiskReward       = avgRR,
            Expectancy          = Math.Round(expectancy, 2),
            MaxDrawdown         = Math.Round(maxDrawdown, 2),
            RecoveryFactor      = recoveryFactor,
            AvgHoldDurationHours = Math.Round((decimal)avgHoldHours, 1),
            LongestWinStreak    = longestWin,
            LongestLossStreak   = longestLoss,
            BestSymbol          = bestSymbol,
            WorstSymbol         = worstSymbol,
            MonthlyBreakdown    = BuildMonthlyBreakdown(closedTrades),
            EquityCurve         = equityCurve,
        };
    }

    private static List<EquityPointDto> BuildEquityCurve(List<Trade> closedTrades)
    {
        var curve = new List<EquityPointDto>();
        var cumulative = 0m;
        foreach (var trade in closedTrades.OrderBy(t => t.ExitAt ?? t.EntryAt))
        {
            cumulative += trade.PnlQuote ?? 0m;
            curve.Add(new EquityPointDto
            {
                Date           = trade.ExitAt ?? trade.EntryAt,
                CumulativePnl  = Math.Round(cumulative, 2),
            });
        }
        return curve;
    }

    private static decimal CalculateMaxDrawdown(List<EquityPointDto> curve)
    {
        if (curve.Count == 0) return 0m;
        var peak       = decimal.MinValue;
        var maxDrawdown = 0m;
        foreach (var point in curve)
        {
            if (point.CumulativePnl > peak) peak = point.CumulativePnl;
            var drawdown = peak - point.CumulativePnl;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        return maxDrawdown;
    }

    private static (int winStreak, int lossStreak) CalculateStreaks(List<Trade> closedTrades)
    {
        var ordered = closedTrades.OrderBy(t => t.ExitAt ?? t.EntryAt).ToList();
        var longestWin  = 0;
        var longestLoss = 0;
        var currentWin  = 0;
        var currentLoss = 0;
        foreach (var trade in ordered)
        {
            if ((trade.PnlQuote ?? 0) > 0)
            {
                currentWin++;
                currentLoss = 0;
                if (currentWin > longestWin) longestWin = currentWin;
            }
            else
            {
                currentLoss++;
                currentWin = 0;
                if (currentLoss > longestLoss) longestLoss = currentLoss;
            }
        }
        return (longestWin, longestLoss);
    }

    private static Dictionary<string, decimal> BySymbolPnl(List<Trade> closedTrades)
    {
        return closedTrades
            .GroupBy(t => t.Symbol)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.PnlQuote ?? 0m));
    }

    private static List<MonthlyPnlDto> BuildMonthlyBreakdown(List<Trade> closedTrades)
    {
        return closedTrades
            .GroupBy(t => new { (t.ExitAt ?? t.EntryAt).Year, (t.ExitAt ?? t.EntryAt).Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new MonthlyPnlDto
            {
                Year       = g.Key.Year,
                Month      = g.Key.Month,
                Pnl        = Math.Round(g.Sum(t => t.PnlQuote ?? 0m), 2),
                TradeCount = g.Count(),
                WinCount   = g.Count(t => (t.PnlQuote ?? 0) > 0),
            })
            .ToList();
    }
}
