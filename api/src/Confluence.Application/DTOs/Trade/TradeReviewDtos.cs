namespace Confluence.Application.DTOs.Trade;

public class TradeReviewResponseDto
{
    public Guid Id { get; set; }
    public Guid TradeId { get; set; }
    
    public string Verdict { get; set; } = string.Empty;
    public decimal ExecutionScore { get; set; }
    
    public bool PlanAdherence { get; set; }
    public string PlanAdherenceExplanation { get; set; } = string.Empty;
    
    public bool SlTpRational { get; set; }
    public string SlTpAnalysis { get; set; } = string.Empty;
    
    public string TimingVerdict { get; set; } = string.Empty;
    public string TimingExplanation { get; set; } = string.Empty;
    
    public string ImprovementAdvice { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; }
}
