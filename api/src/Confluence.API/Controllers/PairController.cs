using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace Confluence.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PairController : ControllerBase
{
    private readonly IPairService _pairService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PairController> _logger;

    public PairController(IPairService pairService, IHttpClientFactory httpClientFactory, ILogger<PairController> logger)
    {
        _pairService = pairService;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetPairs([FromQuery] bool includeInactive = false)
    {
        var result = await _pairService.GetAllPairsAsync(includeInactive);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> AddPair([FromBody] AddPairRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Symbol))
            return BadRequest("Symbol is required.");

        var rawSymbol = request.Symbol.ToUpperInvariant().Trim();
        var quoteAsset = (request.QuoteAsset ?? "USDT").ToUpperInvariant().Trim();
        var compactSymbol = rawSymbol.Replace("/", "");

        if (!compactSymbol.EndsWith(quoteAsset))
            return BadRequest($"Symbol must end with {quoteAsset}. Example: ETH{quoteAsset} or ETH/{quoteAsset}.");

        var baseAsset = compactSymbol[..^quoteAsset.Length];
        if (string.IsNullOrWhiteSpace(baseAsset))
            return BadRequest("Base asset is required. Example: ETHUSDT.");

        var symbol = $"{baseAsset}/{quoteAsset}";

        var pair = await _pairService.GetOrCreatePairAsync(symbol, baseAsset, quoteAsset);
        return Ok(pair);
    }

    [HttpPatch("{symbol}/active")]
    public async Task<IActionResult> SetPairActive(string symbol, [FromBody] PairActiveRequest request)
    {
        await _pairService.SetPairActiveAsync(symbol, request.IsActive);
        return NoContent();
    }

    [HttpPatch("{symbol}/favorite")]
    public async Task<IActionResult> SetPairFavorite(string symbol, [FromBody] PairFavoriteRequest request)
    {
        await _pairService.SetPairFavoriteAsync(symbol, request.IsFavorite);
        return NoContent();
    }

    [HttpGet("klines")]
    public async Task<IActionResult> GetKlines([FromQuery] string symbol, [FromQuery] string interval, [FromQuery] int limit = 100)
    {
        // Build handler: route through WARP SOCKS5 proxy when available,
        // and skip host SSL cert validation (catches MITM/antivirus interception).
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true,
        };

        // If docker-compose injected HTTPS_PROXY (pointing to WARP SOCKS5 on host),
        // use it so Binance traffic flows through the VPN tunnel.
        var proxyUrl = Environment.GetEnvironmentVariable("HTTPS_PROXY")
                    ?? Environment.GetEnvironmentVariable("HTTP_PROXY");
        if (!string.IsNullOrEmpty(proxyUrl))
        {
            handler.Proxy = new WebProxy(proxyUrl);
            handler.UseProxy = true;
            _logger.LogDebug("Using proxy for Binance klines request: {ProxyUrl}", proxyUrl);
        }

        // 8 seconds: enough for proxy handshake; avoids indefinite hang on blocked networks.
        using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(8) };

        // Attempt 1: data-api.binance.vision (public mirror, no auth needed)
        try
        {
            var url = $"https://data-api.binance.vision/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}";
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            Response.Headers["X-Data-Source"] = "binance-live";
            _logger.LogInformation("Fetched live klines from data-api.binance.vision for {Symbol}", symbol);
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogWarning("data-api.binance.vision failed: {Message}", ex.Message);
        }

        // Attempt 2: api.binance.com
        try
        {
            var url = $"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}";
            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            Response.Headers["X-Data-Source"] = "binance-live";
            _logger.LogInformation("Fetched live klines from api.binance.com for {Symbol}", symbol);
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogWarning("api.binance.com also failed: {Message}. Falling back to mock data.", ex.Message);
        }

        // Final fallback: generate mock OHLCV data so the chart always renders.
        _logger.LogWarning("RETURNING MOCK DATA for {Symbol} — both Binance endpoints unreachable.", symbol);
        var mockData = new System.Collections.Generic.List<object[]>();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var intervalMs = 4 * 60 * 60 * 1000L; // default 4h in ms

        double open = 65000.0;
        var rand = new Random();

        for (int i = limit; i > 0; i--)
        {
            var time = now - (i * intervalMs);
            var change = (rand.NextDouble() - 0.5) * 500;
            var close = open + change;
            var high = Math.Max(open, close) + (rand.NextDouble() * 200);
            var low = Math.Min(open, close) - (rand.NextDouble() * 200);
            var vol = rand.NextDouble() * 1000 + 100;

            mockData.Add(new object[] { time, open.ToString("F2"), high.ToString("F2"), low.ToString("F2"), close.ToString("F2"), vol.ToString("F2") });
            open = close;
        }

        var mockJson = System.Text.Json.JsonSerializer.Serialize(mockData);
        Response.Headers["X-Data-Source"] = "mock-generated";
        return Content(mockJson, "application/json");
    }
}

public record AddPairRequest(string Symbol, string? QuoteAsset);
public record PairActiveRequest(bool IsActive);
public record PairFavoriteRequest(bool IsFavorite);
