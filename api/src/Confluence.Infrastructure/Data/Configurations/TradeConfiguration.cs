using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Confluence.Infrastructure.Data.Configurations;

public class TradeConfiguration : IEntityTypeConfiguration<Trade>
{
    public void Configure(EntityTypeBuilder<Trade> builder)
    {
        builder.ToTable("trades", t => 
        {
            t.HasCheckConstraint("CK_Trade_Direction", "direction IN ('Long', 'Short')");
            t.HasCheckConstraint("CK_Trade_Status", "status IN ('Open', 'Closed')");
        });
        
        builder.HasKey(t => t.Id);
        
        builder.Property(t => t.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");
            
        builder.Property(t => t.AnalysisId)
            .HasColumnName("analysis_id");
            
        builder.Property(t => t.Symbol)
            .HasColumnName("symbol")
            .HasMaxLength(20)
            .IsRequired();
            
        builder.Property(t => t.Direction)
            .HasColumnName("direction")
            .HasConversion<string>()
            .HasMaxLength(10)
            .IsRequired();
            
        builder.Property(t => t.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(10)
            .HasDefaultValue(Confluence.Domain.Enums.TradeStatus.Open)
            .IsRequired();
            
        builder.Property(t => t.EntryPrice)
            .HasColumnName("entry_price")
            .HasColumnType("numeric(20,8)")
            .IsRequired();
            
        builder.Property(t => t.EntryAmount)
            .HasColumnName("entry_amount")
            .HasColumnType("numeric(20,8)")
            .IsRequired();
            
        builder.Property(t => t.Leverage)
            .HasColumnName("leverage")
            .HasColumnType("numeric(5,2)")
            .HasDefaultValue(1.0m)
            .IsRequired();
            
        builder.Property(t => t.StopLoss)
            .HasColumnName("stop_loss")
            .HasColumnType("numeric(20,8)");
            
        builder.Property(t => t.TakeProfit)
            .HasColumnName("take_profit")
            .HasColumnType("numeric(20,8)");
            
        builder.Property(t => t.EntryAt)
            .HasColumnName("entry_at")
            .HasDefaultValueSql("now()")
            .IsRequired();
            
        builder.Property(t => t.ExitPrice)
            .HasColumnName("exit_price")
            .HasColumnType("numeric(20,8)");
            
        builder.Property(t => t.ExitAt)
            .HasColumnName("exit_at");
            
        builder.Property(t => t.PnlQuote)
            .HasColumnName("pnl_quote")
            .HasColumnType("numeric(20,8)");
            
        builder.Property(t => t.PnlPercentage)
            .HasColumnName("pnl_percentage")
            .HasColumnType("numeric(10,2)");
            
        builder.Property(t => t.Notes)
            .HasColumnName("notes")
            .HasColumnType("text");
            
        builder.Property(t => t.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .IsRequired();
            
        builder.Property(t => t.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("now()")
            .IsRequired();
            
        // Relationships
        builder.HasOne(t => t.Analysis)
            .WithMany()
            .HasForeignKey(t => t.AnalysisId)
            .OnDelete(DeleteBehavior.SetNull);
            
        // Indexes
        builder.HasIndex(t => new { t.Status, t.Symbol });
        builder.HasIndex(t => new { t.Status, t.EntryAt }).IsDescending(false, true);
        builder.HasIndex(t => t.AnalysisId);
    }
}
