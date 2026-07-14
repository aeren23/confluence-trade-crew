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
    public decimal? TakeProfit { get; set; } // Legacy or TP1
    public decimal? TakeProfit2 { get; set; } // Primary Target
    
    public DateTime EntryAt { get; set; } = DateTime.UtcNow;
    
    public decimal? ExitPrice { get; set; }
    public DateTime? ExitAt { get; set; }
    
    public decimal? PnlQuote { get; set; }
    public decimal? PnlPercentage { get; set; }
    
    public string? Tags { get; set; }
    public string? Notes { get; set; }
    
    // ── Chart Snapshots ─────────────────────────────────────────
    /// <summary>Relative URL to entry chart snapshot (e.g. /snapshots/{guid}_entry.png)</summary>
    public string? EntrySnapshotUrl { get; set; }
    /// <summary>Relative URL to exit chart snapshot</summary>
    public string? ExitSnapshotUrl { get; set; }

    // ── Execution Quality ───────────────────────────────────────
    /// <summary>AI-recommended entry price at time of trade creation (from linked analysis)</summary>
    public decimal? PlannedEntryPrice { get; set; }
    /// <summary>Entry slippage in percentage: |actual - planned| / planned × 100</summary>
    public decimal? EntrySlippagePct { get; set; }
    /// <summary>Execution quality grade: "good", "fair", or "poor"</summary>
    public string? ExecutionQuality { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Analysis? Analysis { get; set; }
    public ICollection<TradeReview> Reviews { get; set; } = new List<TradeReview>();
}
