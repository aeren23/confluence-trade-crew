using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Confluence.Infrastructure.Data.Configurations;

public class PairConfiguration : IEntityTypeConfiguration<Pair>
{
    public void Configure(EntityTypeBuilder<Pair> builder)
    {
        builder.ToTable("pairs");
        
        builder.HasKey(p => p.Symbol);
        
        builder.Property(p => p.Symbol)
            .HasColumnName("symbol")
            .HasMaxLength(20)
            .IsRequired();
            
        builder.Property(p => p.BaseAsset)
            .HasColumnName("base_asset")
            .HasMaxLength(10)
            .IsRequired();
            
        builder.Property(p => p.QuoteAsset)
            .HasColumnName("quote_asset")
            .HasMaxLength(10)
            .IsRequired();
            
        builder.Property(p => p.IsActive)
            .HasColumnName("is_active")
            .HasDefaultValue(true)
            .IsRequired();
            
        builder.Property(p => p.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .IsRequired();
    }
}
