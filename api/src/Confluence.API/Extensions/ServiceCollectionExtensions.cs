using Confluence.Application.Interfaces;
using Confluence.Application.Services;
using Confluence.Infrastructure.Data;
using Confluence.Infrastructure.ExternalServices;
using Microsoft.EntityFrameworkCore;

namespace Confluence.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAnalysisService, AnalysisService>();
        services.AddScoped<ITradeService, TradeService>();
        services.AddScoped<IPortfolioService, PortfolioService>();
        services.AddScoped<IPairService, PairService>();
        services.AddScoped<IUserSettingsService, UserSettingsService>();
        services.AddScoped<IAccuracyService, AccuracyService>();

        return services;
    }

    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        // Map generic DbContext to our AppDbContext
        services.AddScoped<DbContext>(provider => provider.GetRequiredService<AppDbContext>());

        // HttpClient for AI Service
        services.AddHttpClient<IAiServiceClient, AiServiceClient>(client =>
        {
            var aiServiceUrl = configuration["AiService:BaseUrl"] ?? "http://ai-service:8000";
            client.BaseAddress = new Uri(aiServiceUrl);
            client.Timeout = TimeSpan.FromMinutes(15); // CrewAI pipeline can take 5–10 minutes with multiple LLM calls
        });

        // HttpClient for Binance Public API (Accuracy Tracking)
        services.AddHttpClient("BinanceClient", client =>
        {
            client.BaseAddress = new Uri("https://api.binance.com");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        return services;
    }
}
