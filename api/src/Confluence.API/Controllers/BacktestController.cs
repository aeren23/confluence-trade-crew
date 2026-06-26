using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Confluence.Application.DTOs;
using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Confluence.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BacktestController : ControllerBase
    {
        private readonly IAiServiceClient _aiServiceClient;
        private readonly IStrategyService _strategyService;

        public BacktestController(IAiServiceClient aiServiceClient, IStrategyService strategyService)
        {
            _aiServiceClient = aiServiceClient;
            _strategyService = strategyService;
        }

        [HttpPost("run")]
        public async Task<IActionResult> RunBacktest([FromBody] BacktestRequestDto request)
        {
            object? strategyConfig = null;

            if (request.StrategyId.HasValue)
            {
                var strategy = await _strategyService.GetByIdAsync(request.StrategyId.Value);
                if (strategy != null)
                {
                    strategyConfig = new
                    {
                        minimumRR = strategy.MinimumRR,
                        newsWeight = strategy.NewsWeight,
                        timeframes = strategy.Timeframes,
                        timeframeWeights = strategy.TimeframeWeights
                    };
                }
            }

            var aiRequest = new BacktestAiRequest
            {
                Symbol = request.Symbol,
                Timeframe = request.Timeframe,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                InitialBalance = request.InitialBalance,
                RiskPercentage = request.RiskPercentage,
                MaxTrades = request.MaxTrades,
                TradingFeePercentage = request.TradingFeePercentage,
                StrategyConfig = strategyConfig
            };

            try
            {
                var result = await _aiServiceClient.RunBacktestAsync(aiRequest);
                return Content(result, "application/json");
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(500, new { error = "AI Service Backtest Failed", details = ex.Message });
            }
        }
    }
}
