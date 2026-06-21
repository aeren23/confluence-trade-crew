namespace Confluence.Application.DTOs.Portfolio;

public class MonthlyPnlDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Pnl { get; set; }
    public int TradeCount { get; set; }
    public int WinCount { get; set; }
}
