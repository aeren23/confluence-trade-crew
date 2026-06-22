using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Confluence.Infrastructure.Data.Configurations;

public class StrategyTemplateConfiguration : IEntityTypeConfiguration<StrategyTemplate>
{
    public void Configure(EntityTypeBuilder<StrategyTemplate> builder)
    {
        builder.ToTable("strategy_templates");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(s => s.Name)
            .HasColumnName("name")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(s => s.DisplayName)
            .HasColumnName("display_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(s => s.Description)
            .HasColumnName("description")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(s => s.IsPreset)
            .HasColumnName("is_preset")
            .IsRequired();

        builder.Property(s => s.TimeframesJson)
            .HasColumnName("timeframes_json")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(s => s.RiskProfile)
            .HasColumnName("risk_profile")
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(s => s.MinimumRR)
            .HasColumnName("minimum_rr")
            .HasColumnType("numeric(4,2)")
            .IsRequired();

        builder.Property(s => s.NewsWeight)
            .HasColumnName("news_weight")
            .HasColumnType("numeric(4,3)")
            .IsRequired();

        builder.Property(s => s.TimeframeWeightsJson)
            .HasColumnName("timeframe_weights_json")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(s => s.IconEmoji)
            .HasColumnName("icon_emoji")
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(s => s.ColorHex)
            .HasColumnName("color_hex")
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(s => s.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        builder.Property(s => s.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        // Unique constraint on name
        builder.HasIndex(s => s.Name).IsUnique();
        // Query by is_preset
        builder.HasIndex(s => s.IsPreset);
    }
}
