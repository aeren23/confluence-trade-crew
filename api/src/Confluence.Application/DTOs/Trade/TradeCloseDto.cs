namespace Confluence.Application.DTOs.Trade;

public class TradeCloseDto
{
    public decimal ExitPrice { get; set; }
    public DateTime ExitAt { get; set; } = DateTime.UtcNow;
    public string? ExitNotes { get; set; }
    
    /// <summary>Base64-encoded PNG chart snapshot at exit time</summary>
    public string? ExitSnapshotBase64 { get; set; }
}
