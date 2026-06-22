# Project State & Execution Tracking

This document maintains the absolute current state of the **Confluence Trade Crew** project, tracks progress across development phases, lists solved problems, and logs architectural decisions. It must be read at the start of every execution and updated at the end of every execution in accordance with [state_control_standarts.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/rules/state_control_standarts.md).

---

## 1. Executive Summary & Current Status
* **Current Phase:** Phase 6: Integration, Testing & Validation (100% Complete)
* **Last Execution Timestamp:** 2026-06-21T22:15:00+03:00
* **Current Overall Progress:** 100% (Medium term features and Phase 6 validation completed)
* **Active Goal:** Maintenance and documentation updates.

---

## 2. Project Roadmap & Completion Status

### Phase 1: Architecture, Documentation & Standards (100% Complete)
* [x] Define high-level architecture, layer responsibilities, and execution flow (`architecture.md`).
* [x] Design database schema for PostgreSQL including singleton user settings (`db_schema.md`).
* [x] Define tool schemas, rules, and error handling for Internal MCP Server (`mcp_tools.md`).
* [x] Create step-by-step setup and smoke test guide (`setup.md`).
* [x] Define rules for coding, logging, and state control standards (`docs/rules/*`).

### Phase 2: Environment & Repository Infrastructure Setup (100% Complete)
* [x] Create root-level `.env.example` file matching setup.md § 4.
* [x] Create root-level `docker-compose.yml` — 4 services (db, ai-service, api, frontend).
* [x] Create `README.md` with project overview and quick-start guide.
* [x] Create `.gitignore` covering .NET, Python, Node, Docker, IDE files.
* [x] Create `api/Dockerfile` — multi-stage .NET 8 build.
* [x] Create `ai-service/Dockerfile` — Python 3.12-slim with healthcheck.
* [x] Create `ai-service/requirements.txt` — all Python dependencies pinned.
* [x] Create `ai-service/app/` structure with config.py, main.py (/health stub), package inits.
* [x] Create `frontend/Dockerfile` — Node 20, Vite build, static serve.
* [x] Create `frontend/package.json` — React 18, Zustand, lightweight-charts, Vite.
* [x] Create `frontend/vite.config.js` — dev proxy, chunk splitting.
* [x] Create `frontend/index.html` — SEO meta, Inter + JetBrains Mono fonts.
* [x] Create `frontend/src/index.css` — complete design system (CSS custom properties, dark theme).
* [x] Create `frontend/src/App.jsx` and `App.module.css` — Phase 2 startup screen.

### Phase 3: .NET API Layer Implementation (100% Complete)
* [x] Initialize .NET Web API project (`api/`).
* [x] Set up Clean Architecture layers (`Domain`, `Application`, `Infrastructure`, `API`).
* [x] Configure Entity Framework Core and PostgreSQL connection.
* [x] Create migrations for `pairs`, `user_settings`, `analyses`, and `trades` tables, including initial seed data.
* [x] Implement core controllers/endpoints (`AnalysisController`, `TradeController`, `PortfolioController`, `PairController`).
* [x] Implement PnL calculation logic on trade closure.

### Phase 4: Python AI Service & MCP Server Development (100% Complete)
* [x] Initialize FastAPI project with CrewAI dependencies (`ai-service/`).
* [x] Build Internal MCP Server supporting Data Tools (ccxt + Binance), Indicator Tools (pandas-ta + custom logic), and News Tools (CryptoPanic + web search).
* [x] Implement CrewAI Agents (Data Agent, TA Agent, News Agent, Risk Agent, Orchestrator).
* [x] Implement `POST /analyze` endpoint matching the architectural output schema.
* [x] Implement `/health` endpoint and verify fallback behaviors.
* [x] Refactor agent prompts to prioritize ReAct tool utilization over rigid Pydantic schemas.
* [x] Fix `ohlcv_ref` cache (in-memory → Parquet file-based, survives subprocess restarts).
* [x] Fix `get_market_news` (DuckDuckGo rate-limited → RSS cascade: CoinDesk, CoinTelegraph, Decrypt).
* [x] Fix `Maximum iterations reached` (max_iter 5→15, graceful degradation prompts).
* [x] Disable CrewAI OpenTelemetry telemetry spam (`OTEL_SDK_DISABLED=true`).
* [x] Remove duplicate `_group_levels` function in `indicator_tools.py`.
* [x] Enforce mathematical accuracy for weighted sentiment score in Orchestrator.
* [x] Fix over-sensitive conflict detection (Neutral vs Bullish is no longer a conflict).
* [x] Enforce confidence drop for unavailable News sources.
* [x] Implement dynamic leverage bounds inversely proportional to stop-loss distance.
* [x] Enforce stop-loss level to be strictly offset from support levels.

### Phase 5: React Frontend Development (100% Complete)
* [x] Initialize React application using Vite (`frontend/`).
* [x] Design core layout (Chart View, Chat/Analysis Panel, Trade Form, Portfolio Dashboard).
* [x] Integrate `lightweight-charts` for candlestick visualization and overlay support.
* [x] Set up state management and API communication with the .NET backend.

### Phase 6: Integration, Testing & Validation (100% Complete)
* [x] Run local smoke tests for end-to-end analysis triggering.
* [x] Verify data persistence and schema relationships in PostgreSQL.
* [x] Validate fallback mechanism when optional API keys (Binance, CryptoPanic) are missing.
* [x] Resolve outstanding bugs and finalize documentation walkthrough.
* **Professional Trading Journal** — `latest_price` extraction, Tags entity+migration, advanced portfolio metrics (AvgRR, Expectancy, MaxDrawdown, RecoveryFactor, streaks, monthly breakdown, equity curve), by-analysis endpoint, analysis↔trade UI link, tag chip UI + filter, PortfolioPage equity curve chart, EMA/BB overlays on main chart, RSI + MACD full-series sub-panes.
* **Medium Term Features (Priority 2)** — Multi-Timeframe Confluence analysis (UI toggle, orchestrator multi-TF logic, EF Core MTF tracking), Model Accuracy Tracking (Binance public API on-demand evaluation, global stats in Portfolio, widget in detail page), Analysis Comparison (side-by-side ComparePage, History checkbox selection), Alert System (AlertWidget in Dashboard).

---

## 3. Active Tasks for Next Execution
All Phase 6 tasks are complete. The project is in steady-state maintenance mode.

### Recently Completed (2026-06-21)
1. ✅ `latest_price` extraction from AI JSON response (data agent → risk entry → annotation fallback)
2. ✅ `tags` column added to `trades` table (VARCHAR 200, comma-separated)
3. ✅ Advanced PortfolioService: AvgRR, Expectancy, MaxDrawdown, RecoveryFactor, streaks, monthly breakdown, equity curve
4. ✅ `GET /api/trade/by-analysis/{id}` endpoint
5. ✅ AnalysisDetailPage: linked trades card (direction, entry, exit, PnL, date)
6. ✅ TradesPage: analysis link icon per row (already existed), tag filter row, tag pills per row
7. ✅ TradeForm: tag chip multi-select (preset + custom)
8. ✅ PortfolioPage: equity curve (lightweight-charts line), monthly breakdown bar grid, 8× advanced stat cards
9. ✅ TradingChart: EMA-20 (yellow) + EMA-50 (orange) overlays, Bollinger bands (blue, dashed)
10. ✅ TradingChart: RSI(14) sub-pane with overbought/oversold lines
11. ✅ TradingChart: MACD(12,26,9) sub-pane with line, signal, and colored histogram
12. ✅ All indicator toggles (EMA, BB, RSI, MACD) in chart header
13. ✅ EF Core migration `20260621000000_AddTagsToTrades`
14. ✅ Multi-Timeframe Confluence (`ai-service` multi_tf_orchestrator.py, `api` Analysis/Service/DTO changes, `AddMultiTimeframeToAnalyses` migration, `frontend` ControlPanel pill toggle + chip styles, ConfluenceGauge component).
15. ✅ Model Accuracy Tracking (`AnalysisAccuracy` entity, `CreateAnalysisAccuracyTable` migration, `AccuracyService` fetching Binance price on-demand, `AccuracyDashboard` widget, Portfolio stats).
16. ✅ Analysis Comparison (`ComparePage.jsx` side-by-side comparison, `HistoryPage.jsx` checkbox selection).
17. ✅ Alert System (`AlertWidget.jsx` in Dashboard showing high-confidence, non-neutral recent signals).

### Recently Completed (2026-06-22)
18. ✅ Strategy Templates (`StrategyTemplate` entity, DB Seeding, `StrategyService`, API endpoints, ControlPanel pills, AI service weight overrides injection).
19. ✅ On-Chain & Derivatives Integration (Binance Futures tools: funding, OI, LS ratio; `OnChainAgent` with prompt; `confluence_crew` wiring; JSON schema updates; SynthesisPanel UI card).

---

## 4. Solved Problems & Challenge Log

| Date | Issue / Challenge | Resolution | Files Affected |
| :--- | :--- | :--- | :--- |
| **2026-06-13** | **State tracking initialization** | Created `state.md` to map out execution history and roadmap based on the architectural files. | [state.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/state.md) |
| **2026-06-13** | **State control and logging rules** | Established standards for tracking file state and logging events. | [state_control_standarts.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/rules/state_control_standarts.md), [logging_standarts.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/rules/logging_standarts.md) |
| **2026-06-13** | **Agent rules configuration** | Created `.cursorrules` in the root folder to point to existing rules, preventing redundancy. | [.cursorrules](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/.cursorrules) |
| **2026-06-13** | **Phase 2 infrastructure scaffold complete** | Created all Docker, env, README, .gitignore, and service skeleton files. Frontend design system with dark trading theme CSS tokens established. | 14 files created across root, api/, ai-service/, frontend/ |
| **2026-06-13** | **Phase 3 .NET API Complete** | Developed .NET 8 Clean Architecture API, implemented EF Core Postgres migrations, domain models, PnL calculation, and API endpoints. Repaired CS0234 EF Core reference constraint in Application layer. | `api/src/Confluence.*` (Multiple files) |
| **2026-06-15** | **Phase 4 AI Service Complete** | Implemented FastAPI Orchestrator, CrewAI v2 decorators, and standard stdio MCP Server. Built LLM Strategy Pattern for dynamic provider selection. Removed Pydantic output constraints to fix ReAct loop failures. | `ai-service/app/*` (Multiple files) |
| **2026-06-16** | **Phase 4.2 Pipeline Reliability** | Fixed 5 critical issues: (1) Parquet file-based OHLCV cache surviving subprocess restarts, (2) RSS cascade for news replacing rate-limited DuckDuckGo, (3) max_iter 5→15 + graceful degradation prompts, (4) OTEL telemetry disabled, (5) duplicate function removed. | `cache.py`, `news_tools.py`, `indicator_tools.py`, `confluence_crew.py`, all prompt files |
| **2026-06-16** | **Phase 4.3 Logic Hardening** | Hardened agent prompts to fix hallucinations: (1) Accurate weighted math for sentiment score, (2) Logical conflict detection, (3) Required confidence drop on missing data, (4) Dynamic leverage based on stop-loss/ATR, (5) Enforced stop-loss offset from Support. | `orchestrator.py`, `news_agent.py`, `risk_agent.py` |
| **2026-06-18** | **Frontend Binance API ERR_SSL_PROTOCOL_ERROR** | Switched direct Binance requests in frontend from `api.binance.com` to `data-api.binance.vision` to bypass common ISP network-level blocking and SSL interception. | `frontend/src/hooks/useBinanceData.js` |
| **2026-06-18** | **Docker containers cannot reach Binance via WARP VPN** | Root cause: Cloudflare WARP only tunnels Windows host traffic; Docker (WSL2) containers are excluded. Fix: (1) Added WARP SOCKS5 proxy (`host.docker.internal:40000`) to `docker-compose.yml` for ai-service and api. (2) Configured ccxt to use the proxy. (3) Rewrote PairController to use WebProxy with domain names instead of hardcoded IPs. | `docker-compose.yml`, `data_tools.py`, `PairController.cs` |
| **2026-06-18** | **Mock Data shown with no UI indication** | Added `X-Data-Source` response header to `/api/pair/klines`. Frontend reads header and shows amber SIMULATED DATA banner on TradingChart, and a pulsing green LIVE badge when real data is served. | `PairController.cs`, `useBinanceData.js`, `TradingChart.jsx`, `TradingChart.module.css` |
| **2026-06-18** | **Live Telemetry Stream not working** | Root cause: (1) `TelemetryPublisher.connect()` was never called, so `self._redis` was always `None`. (2) CrewAI `step_callbacks` are synchronous but code used `asyncio.get_running_loop()` which always raised `RuntimeError`. Fix: Added `publish_sync()` with a lazy sync Redis client for step_callbacks, and `connect()`/`close()` lifecycle calls in `analysis_orchestrator.py`. | `telemetry_publisher.py`, `confluence_crew.py`, `analysis_orchestrator.py` |
| **2026-06-18** | **Telemetry Console showing only 'Processing...'** | Root cause: CrewAI's step_callback passes AgentAction/AgentFinish objects, not plain strings with a `.thought` attribute. Thought text is embedded in `.log` before the `Action:` line. Rewrote `_make_step_callback` to parse `.log`, `.tool`, `.tool_input`, `.output`, and `.return_values` correctly. Added pipeline lifecycle events (start/finish). Added `status` field to telemetry payloads. | `confluence_crew.py`, `telemetry_publisher.py`, `analysis_orchestrator.py` |
| **2026-06-18** | **SynthesisPanel not displaying all available analysis data** | Frontend only showed a subset of the rich agent output returned by the AI pipeline. Rewrote SynthesisPanel to display: TA indicators (trend/momentum/volatility), support/resistance pills, news headlines, macro environment, risk sizing & leverage, stop-loss/take-profit level boxes, per-agent score bars, confidence bars, and a conflict detection banner. | `SynthesisPanel.jsx`, `SynthesisPanel.module.css` |
| **2026-06-18** | **Bearish analysis recommending Long SL/TP (direction bug)** | Risk agent prompts only described 'long position' calculations. Rewrote `risk_agent.py` to be direction-aware: reads TA sentiment_score, determines LONG/SHORT/NEUTRAL, applies correct SL/TP rules (SHORT: SL above resistance, TP above support). Added self-check step. Added `position_direction` to orchestrator schema and frontend badge. | `risk_agent.py`, `orchestrator.py`, `SynthesisPanel.jsx`, `SynthesisPanel.module.css` |
| **2026-06-18** | **False conflict detection (neutral+bearish triggered conflict)** | Orchestrator LLM ignored the rule that Neutral vs Bearish is not a conflict. Added strict numerical examples (TA=-0.40, News=0.00 → FALSE) and explicit logical formula to the conflict detection instruction. | `orchestrator.py` |
| **2026-06-18** | **Repetitive generic news headlines across different assets** | RSS fallback in `_fetch_rss_news` returned all items when no keyword match found, causing same generic crypto headlines for any asset. Removed `or all_items` fallback — now returns empty list, triggering low-confidence report from news agent. | `news_tools.py`, `news_agent.py` |
| **2026-06-18** | **Empty TA indicator values in pipeline output** | TA prompt example omitted required `id` field for non-EMA indicators, causing MCP validation failures. Fixed prompt, added auto-id fallback in `IndicatorRequest`, INDICATOR_DATA JSON block, candle limit 100→200. | `ta_agent.py`, `indicator_tools.py`, `orchestrator.py`, `analysis_orchestrator.py` |
| **2026-06-18** | **Shallow news agent analysis** | News tools returned headlines only with no article depth. Added `scrape_article`, CoinGecko/TheBlock sources, multi-factor scoring, and deep news agent prompt with classification and priced-in logic. | `news_tools.py`, `news_agent.py`, `server.py` |
| **2026-06-18** | **GitHub Models rate limit hit (`gpt-4o-mini`)** | `UserByModelByDay` quota (150 req/day) exhausted for single model. Fixed by distributing agents across 5 separate Low-tier GitHub Models (750 total req/day). Added Gemini provider support (SDK + API key). Added explicit API key passthrough in `LLMFactory` via provider→env-var map. Updated `.env.example` with full multi-provider cheat-sheet. | `config.py`, `factory.py`, `requirements.txt`, `.env.example` |
| **2026-06-21** | **Professional Trading Journal** | Backend: latest_price extraction; Tags column+migration; PortfolioService expanded (AvgRR, Expectancy, MaxDrawdown, RecoveryFactor, streaks, monthly, equity); by-analysis endpoint. Frontend: linked trades card on AnalysisDetailPage; tag filter+pills on TradesPage; tag chip form; PortfolioPage equity curve + monthly breakdown + advanced stat cards; TradingChart EMA/BB overlays + RSI + MACD sub-panes with toggle controls. | Multiple files (see project_log.md) |
| **2026-06-21** | **Documentation Update** | Marked Priority 2 features (Multi-Timeframe Confluence, Accuracy Tracking, Compare, Alerts) as completed in gap analysis documentation. | [project_gap_analysis_and_recommendations.md](file:///c:/Users/alihe/OneDrive/Masa%C3%BCst%C3%BC/confluence-trade-crew/docs/project_gap_analysis_and_recommendations.md) |

---

## 5. Architectural & Technical Decisions

* **Stateless AI Layer:** The Python FastAPI/CrewAI service is designed to be completely stateless to simplify scaling and testing. PostgreSQL data is exclusively owned and managed by the .NET API layer.
* **Internal MCP Server:** Running the MCP server as a stdio subprocess of the Python FastAPI application avoids extra networking layers and simplifies local container orchestration.
* **File-Based OHLCV Cache:** CrewAI's `MCPServerStdio` spawns a new subprocess per tool call, destroying in-memory state. We solved this by persisting DataFrames as Parquet files in the OS temp directory, keyed by UUID. The cache survives subprocess restarts and is cleared after each analysis session.
* **RSS-First News Strategy:** DuckDuckGo rate-limits IPs aggressively. We replaced it with a cascading RSS fetcher (CoinDesk → CoinTelegraph → Decrypt) that requires no auth, has no rate limits, and returns real headlines reliably. DuckDuckGo remains as a last-resort fallback.
* **Pydantic vs ReAct Conflict:** CrewAI sub-agents prioritize generating structured output over exploring tools when `output_pydantic` is used. We solved this by making sub-agents output plain text and relying solely on the final Orchestrator to format the JSON.
* **Azure OpenAI Safety Filters:** Strict words like "hallucinate" and "aggressive leverage" trigger GitHub Models content management policies. We softened the prompts to use terms like "theoretical margin estimation".
* **CrewAI Telemetry:** CrewAI uses OpenTelemetry (OTLP). Setting `OTEL_SDK_DISABLED=true` in `os.environ` before the first `crewai` import disables it completely.
