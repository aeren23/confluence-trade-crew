namespace Confluence.Application.DTOs.Portfolio;

public class PortfolioSummaryDto
{
    public int TotalTrades { get; set; }
    public int OpenTrades { get; set; }
    public int ClosedTrades { get; set; }
    
    public int WinCount { get; set; }
    public int LossCount { get; set; }
    public decimal WinRate { get; set; } // Percentage
    
    public decimal TotalPnlQuote { get; set; }
    public decimal TotalPnlPercentage { get; set; }
}
