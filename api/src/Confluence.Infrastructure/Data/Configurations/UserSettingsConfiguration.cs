using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Confluence.Infrastructure.Data.Configurations;

public class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> builder)
    {
        builder.ToTable("user_settings", t => 
        {
            t.HasCheckConstraint("CK_UserSettings_Singleton", "id = 1");
        });
        
        builder.HasKey(u => u.Id);
        
        builder.Property(u => u.Id)
            .HasColumnName("id")
            .HasColumnType("smallint")
            .HasDefaultValue((short)1)
            .ValueGeneratedNever();
            
        builder.Property(u => u.DefaultBalance)
            .HasColumnName("default_balance")
            .HasColumnType("numeric(20,8)")
            .HasDefaultValue(1000m)
            .IsRequired();
            
        builder.Property(u => u.DefaultRiskPercentage)
            .HasColumnName("default_risk_percentage")
            .HasColumnType("numeric(5,2)")
            .HasDefaultValue(2.0m)
            .IsRequired();
            
        builder.Property(u => u.PreferredTimeframe)
            .HasColumnName("preferred_timeframe")
            .HasMaxLength(10)
            .HasDefaultValue("4h")
            .IsRequired();

        builder.Property(u => u.RiskProfile)
            .HasColumnName("risk_profile")
            .HasMaxLength(20)
            .HasDefaultValue("moderate")
            .IsRequired();
            
        builder.Property(u => u.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("now()")
            .IsRequired();
    }
}
