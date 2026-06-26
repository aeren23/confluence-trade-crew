using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Confluence.Application.DTOs
{
    public class BacktestRequestDto
    {
        [JsonPropertyName("symbol")]
        public string Symbol { get; set; } = string.Empty;

        [JsonPropertyName("timeframe")]
        public string Timeframe { get; set; } = "1h";

        [JsonPropertyName("start_date")]
        public string StartDate { get; set; } = string.Empty;

        [JsonPropertyName("end_date")]
        public string EndDate { get; set; } = string.Empty;

        [JsonPropertyName("initial_balance")]
        public decimal InitialBalance { get; set; } = 1000m;

        [JsonPropertyName("risk_percentage")]
        public decimal RiskPercentage { get; set; } = 2.0m;

        [JsonPropertyName("max_trades")]
        public int? MaxTrades { get; set; }

        [JsonPropertyName("trading_fee_percentage")]
        public decimal TradingFeePercentage { get; set; } = 0.0m;

        [JsonPropertyName("strategy_id")]
        public Guid? StrategyId { get; set; }
    }

    public class BacktestAiRequest
    {
        [JsonPropertyName("symbol")]
        public string Symbol { get; set; } = string.Empty;

        [JsonPropertyName("timeframe")]
        public string Timeframe { get; set; } = string.Empty;

        [JsonPropertyName("start_date")]
        public string StartDate { get; set; } = string.Empty;

        [JsonPropertyName("end_date")]
        public string EndDate { get; set; } = string.Empty;

        [JsonPropertyName("initial_balance")]
        public decimal InitialBalance { get; set; }

        [JsonPropertyName("risk_percentage")]
        public decimal RiskPercentage { get; set; }

        [JsonPropertyName("max_trades")]
        public int? MaxTrades { get; set; }

        [JsonPropertyName("trading_fee_percentage")]
        public decimal TradingFeePercentage { get; set; }

        [JsonPropertyName("strategy_config")]
        public object? StrategyConfig { get; set; }
    }
}
