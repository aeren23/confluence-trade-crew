using Confluence.Domain.Enums;

namespace Confluence.Domain.Entities;

public class Trade
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? AnalysisId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public TradeDirection Direction { get; set; }
    public TradeStatus Status { get; set; } = TradeStatus.Open;
    
    public decimal EntryPrice { get; set; }
    public decimal EntryAmount { get; set; }
    public decimal Leverage { get; set; } = 1.0m;
    
    public decimal? StopLoss { get; set; }
    public decimal? TakeProfit { get; set; }
    
    public DateTime EntryAt { get; set; } = DateTime.UtcNow;
    
    public decimal? ExitPrice { get; set; }
    public DateTime? ExitAt { get; set; }
    
    public decimal? PnlQuote { get; set; }
    public decimal? PnlPercentage { get; set; }
    
    public string? Notes { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public Analysis? Analysis { get; set; }
}
