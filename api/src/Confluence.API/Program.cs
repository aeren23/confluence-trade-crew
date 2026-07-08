using Confluence.API.Extensions;
using Confluence.API.Middleware;
using Confluence.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using StackExchange.Redis;
using Confluence.API.Hubs;
using Confluence.API.BackgroundServices;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Add API-specific services
builder.Services.AddScoped<Confluence.Application.Interfaces.ISnapshotService, Confluence.API.Services.SnapshotService>();

// Add SignalR & Redis Telemetry
builder.Services.AddSignalR();
builder.Services.AddSingleton<IConnectionMultiplexer>(sp => 
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var redisConnString = configuration.GetConnectionString("Redis") ?? "localhost:6379";
    return ConnectionMultiplexer.Connect(redisConnString);
});
builder.Services.AddHostedService<RedisTelemetrySubscriber>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionMiddleware>();

app.UseStaticFiles();

app.UseCors();

app.UseAuthorization();

app.MapControllers();
app.MapHub<AnalysisHub>("/hubs/analysis");

// Auto-migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.Run();
