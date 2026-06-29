using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Confluence.Infrastructure.Data.Configurations;

public class TradeReviewConfiguration : IEntityTypeConfiguration<TradeReview>
{
    public void Configure(EntityTypeBuilder<TradeReview> builder)
    {
        builder.ToTable("trade_reviews");

        builder.HasKey(r => r.Id);
        
        builder.Property(r => r.TradeId)
            .IsRequired()
            .HasColumnName("trade_id");
            
        builder.Property(r => r.Verdict)
            .IsRequired()
            .HasMaxLength(20)
            .HasColumnName("verdict");
            
        builder.Property(r => r.ExecutionScore)
            .HasColumnType("numeric(3,2)")
            .HasColumnName("execution_score");
            
        builder.Property(r => r.PlanAdherence)
            .HasColumnName("plan_adherence");
            
        builder.Property(r => r.PlanAdherenceExplanation)
            .HasColumnType("text")
            .HasColumnName("plan_adherence_explanation");
            
        builder.Property(r => r.SlTpRational)
            .HasColumnName("sl_tp_rational");
            
        builder.Property(r => r.SlTpAnalysis)
            .HasColumnType("text")
            .HasColumnName("sl_tp_analysis");
            
        builder.Property(r => r.TimingVerdict)
            .HasMaxLength(20)
            .HasColumnName("timing_verdict");
            
        builder.Property(r => r.TimingExplanation)
            .HasColumnType("text")
            .HasColumnName("timing_explanation");
            
        builder.Property(r => r.ImprovementAdvice)
            .HasColumnType("text")
            .HasColumnName("improvement_advice");
            
        builder.Property(r => r.FullReviewJson)
            .HasColumnType("jsonb")
            .HasColumnName("full_review_json");
            
        builder.Property(r => r.CreatedAt)
            .HasColumnName("created_at");

        // Relationship
        builder.HasOne(r => r.Trade)
            .WithMany(t => t.Reviews)
            .HasForeignKey(r => r.TradeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
