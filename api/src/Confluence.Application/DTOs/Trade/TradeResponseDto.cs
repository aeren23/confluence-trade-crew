using Confluence.Domain.Enums;

namespace Confluence.Application.DTOs.Trade;

public class TradeResponseDto
{
    public Guid Id { get; set; }
    public Guid? AnalysisId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public TradeDirection Direction { get; set; }
    public TradeStatus Status { get; set; }
    
    public decimal EntryPrice { get; set; }
    public decimal EntryAmount { get; set; }
    public decimal Leverage { get; set; }
    
    public decimal? StopLoss { get; set; }
    public decimal? TakeProfit { get; set; }
    public decimal? TakeProfit2 { get; set; }
    
    public DateTime EntryAt { get; set; }
    
    public decimal? ExitPrice { get; set; }
    public DateTime? ExitAt { get; set; }
    
    public decimal? PnlQuote { get; set; }
    public decimal? PnlPercentage { get; set; }
    
    public string? Notes { get; set; }
    public string? Tags { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // ── Snapshot & Execution Quality ──────────
    public string? EntrySnapshotUrl { get; set; }
    public string? ExitSnapshotUrl { get; set; }
    public decimal? PlannedEntryPrice { get; set; }
    public decimal? EntrySlippagePct { get; set; }
    public string? ExecutionQuality { get; set; }
}
