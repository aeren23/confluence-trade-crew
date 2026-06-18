using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Confluence.Infrastructure.Data.Configurations;

public class AnalysisConfiguration : IEntityTypeConfiguration<Analysis>
{
    public void Configure(EntityTypeBuilder<Analysis> builder)
    {
        builder.ToTable("analyses");
        
        builder.HasKey(a => a.Id);
        
        builder.Property(a => a.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");
            
        builder.Property(a => a.Symbol)
            .HasColumnName("symbol")
            .HasMaxLength(20)
            .IsRequired();
            
        builder.Property(a => a.Timeframe)
            .HasColumnName("timeframe")
            .HasMaxLength(10)
            .IsRequired();
            
        builder.Property(a => a.RequestedBalance)
            .HasColumnName("requested_balance")
            .HasColumnType("numeric(20,8)")
            .IsRequired();
            
        builder.Property(a => a.RequestedRiskPercentage)
            .HasColumnName("requested_risk_percentage")
            .HasColumnType("numeric(5,2)")
            .IsRequired();
            
        builder.Property(a => a.OverallSentiment)
            .HasColumnName("overall_sentiment")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();
            
        builder.Property(a => a.OverallSentimentScore)
            .HasColumnName("overall_sentiment_score")
            .HasColumnType("numeric(4,3)")
            .IsRequired();
            
        builder.Property(a => a.Confidence)
            .HasColumnName("confidence")
            .HasColumnType("numeric(4,3)")
            .IsRequired();
            
        builder.Property(a => a.ConflictsDetected)
            .HasColumnName("conflicts_detected")
            .IsRequired();
            
        builder.Property(a => a.LatestPrice)
            .HasColumnName("latest_price")
            .HasColumnType("numeric(20,8)")
            .IsRequired();
            
        builder.Property(a => a.ResultJson)
            .HasColumnName("result_json")
            .HasColumnType("jsonb")
            .IsRequired();
            
        builder.Property(a => a.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .IsRequired();
            
        // Indexes
        builder.HasIndex(a => new { a.Symbol, a.CreatedAt }).IsDescending(false, true);
        builder.HasIndex(a => a.CreatedAt);
        // GIN index for JSONB requires a special extension or raw SQL in EF Core migrations, 
        // but we can register it here as a regular index and manually alter it if needed, 
        // or just let it be a B-Tree if PostgreSQL supports it over JSONB for simple equality. 
        // Npgsql supports GIN indexes like this:
        builder.HasIndex(a => a.ResultJson).HasMethod("gin");
    }
}
