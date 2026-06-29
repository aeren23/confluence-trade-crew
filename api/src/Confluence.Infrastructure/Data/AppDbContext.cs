using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace Confluence.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Pair> Pairs => Set<Pair>();
    public DbSet<Analysis> Analyses => Set<Analysis>();
    public DbSet<AnalysisAccuracy> AnalysisAccuracies => Set<AnalysisAccuracy>();
    public DbSet<Trade> Trades => Set<Trade>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<StrategyTemplate> StrategyTemplates => Set<StrategyTemplate>();
    public DbSet<TradeReview> TradeReviews => Set<TradeReview>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Apply all configurations from the assembly (Fluent API)
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        
        // Seed initial data
        Seed.DatabaseSeeder.Seed(modelBuilder);
    }
}
