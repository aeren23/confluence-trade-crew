namespace Confluence.Application.DTOs.Portfolio;

public class DailyPnlDto
{
    public DateTime Date { get; set; }
    public decimal Pnl { get; set; }
    public int TradeCount { get; set; }
    public int WinCount { get; set; }
}
