using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Confluence.Infrastructure.Data.Seed;

public static class DatabaseSeeder
{
    public static void Seed(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Pair>().HasData(
            new Pair { Symbol = "BTC/USDT", BaseAsset = "BTC", QuoteAsset = "USDT", IsActive = true, IsFavorite = true, CreatedAt = DateTime.UtcNow },
            new Pair { Symbol = "ETH/USDT", BaseAsset = "ETH", QuoteAsset = "USDT", IsActive = true, IsFavorite = false, CreatedAt = DateTime.UtcNow }
        );

        modelBuilder.Entity<UserSettings>().HasData(
            new UserSettings 
            { 
                Id = 1, 
                DefaultBalance = 1000m, 
                DefaultRiskPercentage = 2.0m, 
                PreferredTimeframe = "4h",
                PreferredSymbol = "BTC/USDT",
                RiskProfile = "moderate",
                UpdatedAt = DateTime.UtcNow 
            }
        );
    }
}
