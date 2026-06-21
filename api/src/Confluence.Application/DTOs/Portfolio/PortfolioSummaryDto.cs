namespace Confluence.Application.DTOs.Portfolio;

public class PortfolioSummaryDto
{
    public int TotalTrades { get; set; }
    public int OpenTrades { get; set; }
    public int ClosedTrades { get; set; }

    public int WinCount { get; set; }
    public int LossCount { get; set; }
    public decimal WinRate { get; set; }

    public decimal TotalPnlQuote { get; set; }
    public decimal TotalPnlPercentage { get; set; }

    // Advanced metrics
    public decimal AvgWin { get; set; }
    public decimal AvgLoss { get; set; }
    public decimal AvgRiskReward { get; set; }
    public decimal Expectancy { get; set; }
    public decimal MaxDrawdown { get; set; }
    public decimal RecoveryFactor { get; set; }
    public decimal AvgHoldDurationHours { get; set; }
    public int LongestWinStreak { get; set; }
    public int LongestLossStreak { get; set; }
    public string? BestSymbol { get; set; }
    public string? WorstSymbol { get; set; }
    public Guid? BestTradeId { get; set; }
    public string? BestTradeSymbol { get; set; }
    public decimal? BestTradePnl { get; set; }
    public Guid? WorstTradeId { get; set; }
    public string? WorstTradeSymbol { get; set; }
    public decimal? WorstTradePnl { get; set; }
    public decimal RiskOfRuin { get; set; }
    public decimal SharpeRatio { get; set; }
    public decimal SortinoRatio { get; set; }
    public decimal ProfitFactor { get; set; }

    public List<MonthlyPnlDto> MonthlyBreakdown { get; set; } = [];
    public List<WeeklyPnlDto> WeeklyBreakdown { get; set; } = [];
    public List<DailyPnlDto> DailyBreakdown { get; set; } = [];
    public List<EquityPointDto> EquityCurve { get; set; } = [];
}
