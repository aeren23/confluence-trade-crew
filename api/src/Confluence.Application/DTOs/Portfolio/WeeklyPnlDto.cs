namespace Confluence.Application.DTOs.Portfolio;

public class WeeklyPnlDto
{
    public int Year { get; set; }
    public int Week { get; set; }
    public decimal Pnl { get; set; }
    public int TradeCount { get; set; }
    public int WinCount { get; set; }
}
