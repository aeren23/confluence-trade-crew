# Confluence Trade Crew

A multi-agent crypto trading analysis and decision-support system. **Not an automated trading bot** — it provides analysis and recommendations; you make the final call and manually log your trades.

## What It Does

Enter a trading pair (e.g. `BTC/USDT`), your available balance, and risk tolerance. The system runs a CrewAI multi-agent pipeline:

1. **Data Agent** — fetches OHLCV market data from Binance
2. **Technical Analysis Agent** — computes RSI, MACD, Bollinger Bands, EMA, ADX, ATR; detects divergence and support/resistance levels
3. **News Agent** — gathers pair-specific news (CryptoPanic) and macro sentiment (web search)
4. **Risk Agent** — calculates position sizing, suggested leverage range, stop-loss and take-profit levels
5. **Orchestrator** — synthesizes all outputs into a final structured recommendation with chart annotations

Results are displayed in a trading-style UI with candlestick charts, indicator overlays, and an analysis panel. You can then manually log trades against any analysis.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, lightweight-charts, Zustand |
| API | ASP.NET Core (.NET 8), EF Core, PostgreSQL |
| AI Service | Python 3.12, FastAPI, CrewAI v2 |
| Internal MCP | Python MCP SDK (stdio transport) |
| Data Sources | ccxt (Binance), pandas-ta, CryptoPanic, web search |
| Deployment | Docker Compose |

## Quick Start

> For full details, see [`docs/setup.md`](docs/setup.md).

### Prerequisites

- Docker and Docker Compose (v2+)
- An Anthropic API key (**required** — powers all CrewAI agents)
- Binance API key/secret (optional — raises rate limits for market data)
- CryptoPanic API key (optional — enables pair-specific news)

### 1. Clone

```bash
git clone https://github.com/<your-username>/confluence-trade-crew.git
cd confluence-trade-crew
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY at minimum
```

### 3. Run

```bash
docker compose up --build
```

### 4. Open

- Frontend: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:5000/health](http://localhost:5000/health)
- AI Service health: [http://localhost:8000/health](http://localhost:8000/health)

## Project Structure

```
confluence-trade-crew/
├── frontend/           # React app (Vite + lightweight-charts)
├── api/                # .NET 8 API (ASP.NET Core, EF Core, PostgreSQL)
├── ai-service/         # Python FastAPI service (CrewAI + internal MCP server)
├── docs/               # architecture.md, agents.md, mcp_tools.md, db_schema.md, setup.md
├── docker-compose.yml
├── .env.example
└── README.md
```

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/architecture.md`](docs/architecture.md) | System architecture, layer responsibilities, data flow |
| [`docs/agents.md`](docs/agents.md) | CrewAI agent definitions, I/O schemas, pipeline |
| [`docs/mcp_tools.md`](docs/mcp_tools.md) | Internal MCP server tool definitions |
| [`docs/db_schema.md`](docs/db_schema.md) | PostgreSQL schema, indexes, PnL calculation |
| [`docs/setup.md`](docs/setup.md) | Full setup guide, env vars, smoke tests, troubleshooting |

## Key Design Decisions

- **Not a trading bot** — analysis only, manual trade journaling.
- **Single-user, self-hosted** — bring your own API keys, no SaaS.
- **Stateless AI layer** — the Python service writes no data; PostgreSQL is owned entirely by the .NET API.
- **Internal MCP server** — runs as a subprocess inside the `ai-service` container (stdio transport), not a separate service.

## Resetting

```bash
# Stop, preserve data
docker compose down

# Full reset (deletes database)
docker compose down -v
```
