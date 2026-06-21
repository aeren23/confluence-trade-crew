using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Confluence.Infrastructure.Data.Configurations;

public class AnalysisAccuracyConfiguration : IEntityTypeConfiguration<AnalysisAccuracy>
{
    public void Configure(EntityTypeBuilder<AnalysisAccuracy> builder)
    {
        builder.ToTable("analysis_accuracies");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(a => a.AnalysisId)
            .HasColumnName("analysis_id")
            .IsRequired();

        builder.Property(a => a.CheckInterval)
            .HasColumnName("check_interval")
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(a => a.PriceAtCheck)
            .HasColumnName("price_at_check")
            .HasColumnType("numeric(20,8)")
            .IsRequired();

        builder.Property(a => a.PriceChangePct)
            .HasColumnName("price_change_pct")
            .HasColumnType("numeric(10,4)")
            .IsRequired();

        builder.Property(a => a.PredictedDirection)
            .HasColumnName("predicted_direction")
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(a => a.IsAccurate)
            .HasColumnName("is_accurate")
            .IsRequired();

        builder.Property(a => a.WasMissedOpportunity)
            .HasColumnName("was_missed_opportunity")
            .IsRequired();

        builder.Property(a => a.PotentialPnlPct)
            .HasColumnName("potential_pnl_pct")
            .HasColumnType("numeric(10,4)")
            .IsRequired(false);

        builder.Property(a => a.CheckedAt)
            .HasColumnName("checked_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        // Foreign Key
        builder.HasOne(a => a.Analysis)
            .WithMany()
            .HasForeignKey(a => a.AnalysisId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(a => new { a.AnalysisId, a.CheckInterval }).IsUnique();
        builder.HasIndex(a => a.CheckedAt);
    }
}
