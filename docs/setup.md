# Setup Guide

## 1. Overview

This guide covers how to run Confluence Trade Crew locally using Docker Compose.
The system consists of four services: a React frontend, a .NET API, a Python AI
Service (CrewAI + internal MCP server), and a PostgreSQL database.

There is no hosted/managed version — this is a self-hosted, bring-your-own-keys
project (see `architecture.md` § 6, Deployment).

---

## 2. Prerequisites

- Docker and Docker Compose (v2+)
- An Anthropic API key (required — powers the CrewAI agents)
- (Optional) A Binance API key/secret — only needed to raise rate limits; public
  OHLCV endpoints work without one
- (Optional) A CryptoPanic API key — only needed for pair-specific news; without
  it, the News Agent falls back to web search only (see `mcp_tools.md` § 5.1)

---

## 3. Project Structure

```
confluence-trade-crew/
├── frontend/           # React app (Vite + lightweight-charts)
├── api/                # .NET API (ASP.NET Core, EF Core, PostgreSQL)
├── ai-service/         # Python FastAPI service (CrewAI + internal MCP server)
├── docs/               # architecture.md, agents.md, mcp_tools.md, db_schema.md, setup.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Environment Variables

Copy `.env.example` to `.env` in the project root and fill in the values below.

| Variable | Required | Used By | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | `ai-service` | Claude API key used by all CrewAI agents |
| `POSTGRES_USER` | Yes | `db`, `api` | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | `db`, `api` | PostgreSQL password |
| `POSTGRES_DB` | Yes | `db`, `api` | Database name, e.g. `confluence` |
| `BINANCE_API_KEY` | No | `ai-service` | Optional, raises rate limits for `get_ohlcv` |
| `BINANCE_API_SECRET` | No | `ai-service` | Paired with `BINANCE_API_KEY` |
| `CRYPTOPANIC_API_KEY` | No | `ai-service` | Optional, enables pair-specific news (`get_pair_news`) |
| `API_PORT` | No | `api` | Defaults to `5000` |
| `AI_SERVICE_PORT` | No | `ai-service` | Defaults to `8000` |
| `FRONTEND_PORT` | No | `frontend` | Defaults to `3000` |

**`.env.example`**:

```env
# Required
ANTHROPIC_API_KEY=

POSTGRES_USER=confluence
POSTGRES_PASSWORD=changeme
POSTGRES_DB=confluence

# Optional - raises Binance rate limits, not required for basic usage
BINANCE_API_KEY=
BINANCE_API_SECRET=

# Optional - enables pair-specific news via CryptoPanic
# If left empty, the News Agent falls back to web search only
CRYPTOPANIC_API_KEY=

# Optional - port overrides
API_PORT=5000
AI_SERVICE_PORT=8000
FRONTEND_PORT=3000
```

---

## 5. Docker Compose Configuration

```yaml
version: "3.9"

services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  ai-service:
    build: ./ai-service
    restart: unless-stopped
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      BINANCE_API_KEY: ${BINANCE_API_KEY}
      BINANCE_API_SECRET: ${BINANCE_API_SECRET}
      CRYPTOPANIC_API_KEY: ${CRYPTOPANIC_API_KEY}
    ports:
      - "${AI_SERVICE_PORT:-8000}:8000"

  api:
    build: ./api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      ConnectionStrings__DefaultConnection: "Host=db;Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}"
      AiService__BaseUrl: "http://ai-service:8000"
    ports:
      - "${API_PORT:-5000}:5000"

  frontend:
    build: ./frontend
    restart: unless-stopped
    depends_on:
      - api
    environment:
      VITE_API_BASE_URL: "http://localhost:${API_PORT:-5000}"
    ports:
      - "${FRONTEND_PORT:-3000}:3000"

volumes:
  pgdata:
```

**Notes on the configuration**:

- `ai-service` does not depend on `db` — it is stateless and never touches
  PostgreSQL directly (per `architecture.md` § 3.3).
- The internal MCP server (per `architecture.md` § 3.4 and `mcp_tools.md`) is **not**
  a separate container — it runs as a subprocess within the `ai-service` container,
  communicating over stdio. No additional port or service entry is needed for it.
- `api` waits for `db` to be healthy before starting (`depends_on` with
  `condition: service_healthy`) to avoid migration failures on first boot.
- `VITE_API_BASE_URL` is injected at build/run time so the frontend knows where to
  reach the .NET API; adjust if running behind a reverse proxy or different host.

---

## 6. First-Time Setup Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/confluence-trade-crew.git
   cd confluence-trade-crew
   ```

2. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in at minimum `ANTHROPIC_API_KEY`,
   `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

3. Build and start all services:
   ```bash
   docker compose up --build
   ```

4. On first run, the `api` service applies database migrations automatically
   (creating the `pairs`, `user_settings`, `analyses`, and `trades` tables per
   `db_schema.md`, and seeding default pairs and settings).

5. Open the frontend in your browser:
   ```
   http://localhost:3000
   ```

6. Verify the AI Service is responding (optional health check):
   ```bash
   curl http://localhost:8000/health
   ```

---

## 7. Running an Analysis (Smoke Test)

Once everything is running, a quick end-to-end smoke test:

1. In the frontend, select `BTC/USDT`, timeframe `4h`, balance `1000`, risk `2%`.
2. Click "Analyze". This triggers the flow described in `architecture.md` § 5:
   frontend → `.NET API` → AI Service → CrewAI pipeline → result saved to
   `analyses` table → returned to frontend.
3. The chart should render candlesticks with indicator overlays and annotation
   lines (support/resistance, stop-loss/take-profit), and the chat panel should
   show per-agent summaries plus a final synthesis.
4. If you want to test the trade journal, use the "Open Position" form to log a
   manual entry, then later "Close Position" to verify PnL calculation
   (`db_schema.md` § 5).

---

## 8. Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ai-service` fails to start with an authentication error | `ANTHROPIC_API_KEY` missing or invalid | Check `.env`, restart with `docker compose up --build ai-service` |
| News Agent results always show `source: "unavailable"` for pair-specific news | `CRYPTOPANIC_API_KEY` not set | Expected behavior without a key — News Agent falls back to web search (`mcp_tools.md` § 5.1) |
| `get_ohlcv` returns rate limit errors for very frequent requests | No Binance API key set, hitting public rate limits | Add `BINANCE_API_KEY` / `BINANCE_API_SECRET` to `.env` |
| `api` fails to start, migration errors | `db` not healthy yet on first boot | Ensure `depends_on: condition: service_healthy` is present; try `docker compose up` again after `db` is fully initialized |
| Frontend shows network errors when calling the API | `VITE_API_BASE_URL` mismatch (e.g. custom port) | Update `API_PORT` in `.env` and rebuild the `frontend` service |

---

## 9. Stopping and Resetting

Stop all services (data is preserved in the `pgdata` volume):

```bash
docker compose down
```

Stop and remove all data (full reset, including the database):

```bash
docker compose down -v
```