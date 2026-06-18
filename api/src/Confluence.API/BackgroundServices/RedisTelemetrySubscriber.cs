using System.Text.Json;
using Confluence.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

namespace Confluence.API.BackgroundServices;

/// <summary>
/// A background service that subscribes to the Redis 'analysis_telemetry' channel
/// and broadcasts incoming messages to connected SignalR clients.
/// </summary>
public class RedisTelemetrySubscriber : BackgroundService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IHubContext<AnalysisHub> _hubContext;
    private readonly ILogger<RedisTelemetrySubscriber> _logger;

    public RedisTelemetrySubscriber(
        IConnectionMultiplexer redis,
        IHubContext<AnalysisHub> hubContext,
        ILogger<RedisTelemetrySubscriber> logger)
    {
        _redis = redis;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RedisTelemetrySubscriber is starting.");

        try
        {
            var subscriber = _redis.GetSubscriber();
            
            // Subscribe to the channel used by the Python AI Service
            var channel = new RedisChannel("analysis_telemetry", RedisChannel.PatternMode.Literal);
            
            await subscriber.SubscribeAsync(channel, async (redisChannel, message) =>
            {
                if (message.IsNullOrEmpty) return;

                try
                {
                    // Parse the JSON message from Python
                    // Expected format: { "sessionId": "...", "agent": "...", "type": "...", "message": "..." }
                    var payload = JsonSerializer.Deserialize<JsonElement>(message.ToString());
                    
                    if (payload.TryGetProperty("sessionId", out var sessionIdProp))
                    {
                        var sessionId = sessionIdProp.GetString();
                        
                        if (!string.IsNullOrEmpty(sessionId))
                        {
                            // Broadcast to the specific SignalR group associated with the sessionId
                            await _hubContext.Clients.Group(sessionId).SendAsync("ReceiveTelemetry", payload);
                            _logger.LogDebug("Broadcasted telemetry for session {SessionId}", sessionId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error parsing or broadcasting Redis telemetry message.");
                }
            });

            _logger.LogInformation("Successfully subscribed to Redis channel: analysis_telemetry");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to subscribe to Redis telemetry channel.");
        }

        // Keep the background service running
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
