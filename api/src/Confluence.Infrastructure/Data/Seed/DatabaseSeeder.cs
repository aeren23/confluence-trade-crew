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

        // ── Preset Strategy Templates ──────────────────────────────────────────
        // These are read-only strategies. Users can create custom ones.
        var now = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        modelBuilder.Entity<StrategyTemplate>().HasData(
            new StrategyTemplate
            {
                Id = new Guid("11111111-1111-1111-1111-111111111101"),
                Name = "scalp",
                DisplayName = "Scalp Trading",
                Description = "Ultra short-term trades. Focuses on 15m momentum with 5m/1m timing. High frequency, tight stops, aggressive risk profile.",
                IsPreset = true,
                TimeframesJson = "[\"1m\",\"5m\",\"15m\"]",
                RiskProfile = "aggressive",
                MinimumRR = 1.5m,
                NewsWeight = 0.05m,
                TimeframeWeightsJson = "{\"15m\":0.50,\"5m\":0.30,\"1m\":0.20}",
                IconEmoji = "⚡",
                ColorHex = "#F59E0B",
                CreatedAt = now,
                UpdatedAt = now
            },
            new StrategyTemplate
            {
                Id = new Guid("11111111-1111-1111-1111-111111111102"),
                Name = "intraday",
                DisplayName = "Intraday",
                Description = "Same-day trades. Uses 4h trend, 1h setup, 15m entry timing. Balanced risk with news awareness.",
                IsPreset = true,
                TimeframesJson = "[\"15m\",\"1h\",\"4h\"]",
                RiskProfile = "moderate",
                MinimumRR = 1.2m,
                NewsWeight = 0.15m,
                TimeframeWeightsJson = "{\"4h\":0.40,\"1h\":0.35,\"15m\":0.25}",
                IconEmoji = "📊",
                ColorHex = "#60A5FA",
                CreatedAt = now,
                UpdatedAt = now
            },
            new StrategyTemplate
            {
                Id = new Guid("11111111-1111-1111-1111-111111111103"),
                Name = "swing",
                DisplayName = "Swing Trading",
                Description = "Multi-day trades. Daily macro trend with 4h setup and 1h entry. Higher R:R targets, significant news weight.",
                IsPreset = true,
                TimeframesJson = "[\"1h\",\"4h\",\"1d\"]",
                RiskProfile = "moderate",
                MinimumRR = 2.0m,
                NewsWeight = 0.25m,
                TimeframeWeightsJson = "{\"1d\":0.40,\"4h\":0.35,\"1h\":0.25}",
                IconEmoji = "📈",
                ColorHex = "#34D399",
                CreatedAt = now,
                UpdatedAt = now
            },
            new StrategyTemplate
            {
                Id = new Guid("11111111-1111-1111-1111-111111111104"),
                Name = "position",
                DisplayName = "Position Trading",
                Description = "Long-term trend following. Weekly macro + daily setup. Conservative risk, high R:R requirements, fundamental-heavy.",
                IsPreset = true,
                TimeframesJson = "[\"4h\",\"1d\",\"1w\"]",
                RiskProfile = "conservative",
                MinimumRR = 3.0m,
                NewsWeight = 0.35m,
                TimeframeWeightsJson = "{\"1w\":0.40,\"1d\":0.35,\"4h\":0.25}",
                IconEmoji = "🏛️",
                ColorHex = "#A78BFA",
                CreatedAt = now,
                UpdatedAt = now
            }
        );
    }
}
