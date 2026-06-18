using Confluence.Domain.Enums;

namespace Confluence.Application.DTOs.Trade;

public class TradeCreateDto
{
    public string Symbol { get; set; } = string.Empty;
    public TradeDirection Direction { get; set; }
    public decimal EntryPrice { get; set; }
    public decimal EntryAmount { get; set; }
    public decimal Leverage { get; set; } = 1.0m;
    
    public decimal? StopLoss { get; set; }
    public decimal? TakeProfit { get; set; }
    public DateTime EntryAt { get; set; } = DateTime.UtcNow;
    
    public Guid? AnalysisId { get; set; }
    public string? Notes { get; set; }
}
