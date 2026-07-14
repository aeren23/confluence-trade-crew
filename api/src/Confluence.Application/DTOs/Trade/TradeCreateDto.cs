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
    public decimal? TakeProfit { get; set; } // TP1
    public decimal? TakeProfit2 { get; set; } // Primary Target
    public DateTime EntryAt { get; set; } = DateTime.UtcNow;
    
    public Guid? AnalysisId { get; set; }
    public string? Notes { get; set; }
    public string? Tags { get; set; }
    
    /// <summary>Base64-encoded PNG chart snapshot at entry time</summary>
    public string? EntrySnapshotBase64 { get; set; }
    
    /// <summary>AI-recommended entry price from the linked analysis</summary>
    public decimal? PlannedEntryPrice { get; set; }
}
