namespace Confluence.Application.DTOs.Trade;

public class TradeCloseDto
{
    public decimal ExitPrice { get; set; }
    public DateTime ExitAt { get; set; } = DateTime.UtcNow;
}
