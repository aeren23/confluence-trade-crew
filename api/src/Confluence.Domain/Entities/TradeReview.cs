using Confluence.Domain.Enums;

namespace Confluence.Domain.Entities;

public class TradeReview
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TradeId { get; set; }
    
    // Overall review verdict: "good", "fair", "poor"
    public string Verdict { get; set; } = string.Empty;
    // 0.0 – 1.0 execution quality score
    public decimal ExecutionScore { get; set; }
    
    // AI-generated structured review
    public bool PlanAdherence { get; set; }
    public string PlanAdherenceExplanation { get; set; } = string.Empty;
    
    public bool SlTpRational { get; set; }
    public string SlTpAnalysis { get; set; } = string.Empty;
    
    public string TimingVerdict { get; set; } = string.Empty;
    public string TimingExplanation { get; set; } = string.Empty;
    
    public string ImprovementAdvice { get; set; } = string.Empty;
    
    // Full AI output for reference/debugging
    public string FullReviewJson { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Trade? Trade { get; set; }
}
