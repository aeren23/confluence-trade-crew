# Project Log

| Date | Time | Action | Files Modified | Rationale / Result |
| :--- | :--- | :--- | :--- | :--- |
| 2026-06-13 | 11:35:00 | Initialize state control & logging | `docs/state.md`, `docs/rules/*`, `.cursorrules` | Established strict tracking methodology to prevent context loss between agent sessions. |
| 2026-06-13 | 11:45:00 | Setup Phase 2 repository scaffold | `docker-compose.yml`, `README.md`, `api/Dockerfile`, `frontend/package.json` | Created base multi-container architecture. Set up root-level configurations. |
| 2026-06-13 | 12:15:00 | Setup Frontend design system | `frontend/src/index.css`, `frontend/src/App.jsx` | Built vanilla CSS foundation with dark theme tokens and responsive utility classes. |
| 2026-06-13 | 13:45:00 | Setup Phase 3 .NET API | `api/src/*` (Domain, Application, Infrastructure, API) | Scaffolded Clean Architecture backend with MediatR, EF Core, and PostgreSQL integration. |
| 2026-06-13 | 14:15:00 | Implement core domain and migrations | `api/src/Confluence.Infrastructure/Data/*`, `api/src/Confluence.Domain/*` | Created Pair, UserSettings, Trade entities and corresponding EF Core configurations. Seeded initial DB. |
| 2026-06-13 | 15:30:00 | Implement controllers & endpoints | `api/src/Confluence.API/Controllers/*`, `api/src/Confluence.Application/DTOs/*` | Built endpoints for Analysis, Portfolio, Trades, and Settings. Implemented PnL calculation on trade closure. |
| 2026-06-15 | 10:20:00 | Initialize Phase 4 AI Service | `ai-service/app/mcp_server/*`, `ai-service/app/crew/*` | Created FastAPI skeleton, basic stdio MCP server, and CrewAI v2 agents layout. |
| 2026-06-15 | 11:00:00 | Refactor AI service architecture | `ai-service/app/*` | Implemented Strategy Pattern for LLM providers (Anthropic, OpenAI, GitHub). Removed restrictive Pydantic output schemas from sub-agents to fix ReAct loop errors. Configured Orchestrator to output structured JSON matching the architecture spec. |
| 2026-06-16 | 13:55:00 | Phase 4.2 Pipeline Reliability Fixes | `ai-service/app/mcp_server/cache.py`, `ai-service/app/mcp_server/tools/news_tools.py`, `ai-service/app/crew/prompts/*`, `ai-service/test_analysis.py`, `ai-service/.env`, `docs/state.md` | Fixed 5 critical pipeline bugs: Replaced in-memory cache with Parquet file cache to survive MCP subprocess restarts. Replaced rate-limited DuckDuckGo search with a multi-source RSS cascading fetcher. Increased max_iter (5 to 15) and added graceful degradation instructions to all agents. Disabled noisy OTEL telemetry. Removed duplicate indicator function. State file updated to reflect completion of Phase 4 and start of Phase 5. |
| 2026-06-16 | 15:45:00 | Phase 4.3 & 4.4 Logic Hardening | `orchestrator.py`, `news_agent.py`, `risk_agent.py`, `indicator_tools.py` | Fixed agent hallucinations and math errors: Corrected sentiment weighted average formula, redefined conflict logic, forced confidence drop for missing news, implemented dynamic leverage (1 / (StopLoss% * 1.5)), enforced stop-loss offset from TA support levels, and fixed pandas-ta bollinger bands mapping. |
| 2026-07-14 | 03:30:00 | AI Logic & Frontend UI Fixes | `news_agent.py`, `liquidity_agent.py`, `orchestrator.py`, `SynthesisPanel.jsx` | Fixed News agent logic inversion hallucinations. Fixed Liquidity agent 'balanced' contradiction. Fixed TP parsing in React UI for hypothetical scenarios. |
| 2026-06-16 | 16:25:00 | Phase 4.5 Real-Time Telemetry | `docker-compose.yml`, `requirements.txt`, `telemetry_publisher.py`, `confluence_crew.py`, `AnalysisHub.cs`, `RedisTelemetrySubscriber.cs`, `Program.cs` | Implemented a highly scalable live-log system using Redis Pub/Sub. The CrewAI agents now push step callbacks to a Redis channel. A .NET BackgroundService subscribes to this channel and broadcasts the messages to the React frontend via SignalR WebSockets, creating a 'ChatGPT-like' transparent agent thought process UI. |
| 2026-06-16 | 16:40:00 | Phase 5 React Frontend (Clean Architecture) | `frontend/src/` | Refactored the React frontend using strict SOLID principles. Implemented Vanilla CSS Modules instead of Tailwind to fully decouple presentation from logic. Created `apiClient.js` and `signalrClient.js` to isolate HTTP/WebSocket dependencies. Built custom hooks (`useAnalysisLogic`, `useBinanceData`) to orchestrate state via Zustand. Developed smart/dumb components including a live `TelemetryConsole`, interactive `TradingChart` with Binance integration, and a `SynthesisPanel`. |
| 2026-06-18 | 01:05:00 | Fix Frontend Binance API SSL Error | `frontend/src/hooks/useBinanceData.js`, `docs/state.md` | Changed the Binance public data fetch endpoint from `api.binance.com` to `data-api.binance.vision` to bypass network-level blocking and `ERR_SSL_PROTOCOL_ERROR` commonly encountered with Turkish ISPs or local antiviruses. Updated state checklist. |
| 2026-06-18 | 01:08:00 | Add Backend Binance Proxy | `api/src/Confluence.API/Controllers/PairController.cs`, `frontend/src/hooks/useBinanceData.js` | Built a backend proxy endpoint `GET /api/pair/klines` to circumvent persistent browser-level SSL/CORS blocking of Binance endpoints. Frontend now calls local API instead of querying Binance directly. |
| 2026-06-18 | 01:13:00 | Bypass Docker SSL MITM Validation | `api/src/Confluence.API/Controllers/PairController.cs` | Disabled SSL certificate validation specifically for the Binance HTTP Client in the proxy. This prevents the Linux Docker container from rejecting forged MITM certificates injected by host-level Antivirus (e.g. Kaspersky) or ISP firewalls. |
| 2026-06-18 | 01:17:00 | Bypass ISP DNS Hijacking | `api/src/Confluence.API/Controllers/PairController.cs` | Bypassed strict 'Güvenli İnternet' / ISP DNS hijacking that redirects Binance domains to block-pages. The proxy now hits AWS IP addresses (`54.92.21.250` and `52.89.214.223`) directly while forcing the `Host` header. This completely circumvents deep packet inspection at the DNS level. |
| 2026-06-18 | 01:28:00 | Implement Mock Data Fallback | `api/src/Confluence.API/Controllers/PairController.cs` | Since the ISP aggressively drops packets even when hitting Binance direct IP addresses, implemented a dynamic Mock OHLCV data generator as the ultimate fallback in the API proxy. This guarantees the frontend UI chart will always load and not crash with a 500 error, allowing local development and testing to continue despite extreme network restrictions. |
| 2026-06-18 | 01:36:00 | Add Fast-Fail Timeout & Logging | `api/src/Confluence.API/Controllers/PairController.cs` | Added a 3-second timeout to the HttpClient to prevent 200+ second hangs waiting for blocked Binance endpoints, significantly speeding up the mock data fallback loading time. Added ILogger to make mock data usage visible in Docker console logs. |
| 2026-06-18 | 01:56:00 | WARP SOCKS5 Proxy for Docker Containers | `docker-compose.yml`, `data_tools.py`, `PairController.cs` | Configured Cloudflare WARP SOCKS5 proxy routing (`host.docker.internal:40000`) for both `ai-service` and `api` Docker containers via `HTTPS_PROXY`/`NO_PROXY` env vars. Rewrote ccxt exchange config to pass proxies dict. Rewrote PairController to use `WebProxy` with domain names instead of hardcoded IPs and increased timeout to 8s for proxy handshake. |
| 2026-06-18 | 01:56:00 | Mock Data UI Indicator | `PairController.cs`, `useBinanceData.js`, `TradingChart.jsx`, `TradingChart.module.css` | Added `X-Data-Source` response header (`binance-live` or `mock-generated`) to the klines proxy endpoint. Frontend reads this header, exposes `isMockData` from the hook, and renders an amber `SIMULATED DATA` banner at the bottom of the chart when mock data is active. A pulsing green `LIVE` badge appears when real Binance data is served. |
| 2026-06-18 | 01:56:00 | Fix Live Telemetry Stream | `telemetry_publisher.py`, `confluence_crew.py`, `analysis_orchestrator.py` | Fixed two bugs preventing the Live Telemetry Stream from working: (1) `TelemetryPublisher.connect()` was never called — publisher always had `self._redis = None`. (2) CrewAI `step_callbacks` are synchronous; the old code used `asyncio.get_running_loop()` which always raised `RuntimeError`. Rewrote publisher with a lazy sync Redis client (`publish_sync()`) for step_callbacks. Added `await telemetry.connect()/close()` lifecycle calls in `analysis_orchestrator.py`. |
| 2026-06-18 | 02:05:00 | Answered network configuration and testing queries | None | Explained proxy behavior when switching to mobile data and outlined test scenarios. |
| 2026-06-18 | 02:08:00 | Disabled SOCKS5 Proxy for Direct Mobile Data Testing | `docker-compose.yml`, `docs/state.md` | Commented out proxy variables in docker-compose.yml to allow direct connections via mobile data. Restarted Docker containers. |
| 2026-06-18 | 02:20:00 | Enhanced Live Telemetry Console | `confluence_crew.py`, `telemetry_publisher.py`, `analysis_orchestrator.py`, `TelemetryConsole.jsx`, `TelemetryConsole.module.css` | Fixed root cause of "Processing..." fallback: CrewAI step objects carry thoughts in `.log` not `.thought`. Rewrote `_make_step_callback` to parse AgentAction/AgentFinish/log/output correctly. Added `status` field to payloads. Added pipeline lifecycle events (start/finish) in orchestrator. Rewrote TelemetryConsole with per-agent color accents, distinct badges (Thought/Tool/Done/Pipeline), collapsible long messages, event counter stats bar. |
| 2026-06-18 | 02:35:00 | Enhanced SynthesisPanel to Show Indicator Values | `orchestrator.py`, `SynthesisPanel.jsx`, `SynthesisPanel.module.css` | Expanded the orchestrator JSON schema's `technical_analysis.details` to include a full `indicators` block (RSI, MACD, Bollinger, EMA-20, EMA-50, ADX, ATR). Added step 6 instruction to extract numeric values from the TA agent's text report. Added an indicators table UI to the TA card in SynthesisPanel, with per-indicator rows showing value + colored state pill. |
| 2026-06-18 | 02:47:00 | Fix: Direction-Aware Risk Agent (Critical) | `risk_agent.py`, `orchestrator.py`, `SynthesisPanel.jsx`, `SynthesisPanel.module.css` | Root cause: risk_agent.py only described 'long position' calculations — every BEARISH analysis produced long SL/TP (SL below, TP above). Rewrote risk_agent.py to determine LONG/SHORT/NEUTRAL from TA sentiment_score and apply direction-correct SL/TP rules. Added self-check step. Added `position_direction` to orchestrator schema and Trade Direction badge (▲/▼/◆) to frontend. |
| 2026-06-18 | 02:47:00 | Fix: False Conflict Detection | `orchestrator.py` | LLM triggered conflict for TA=-0.40 / News=0.00. Added strict numerical formula and 4 concrete TRUE/FALSE examples to conflict rule. |
| 2026-06-18 | 02:47:00 | Fix: Repetitive Generic News Headlines | `news_tools.py`, `news_agent.py` | Removed `or all_items` RSS fallback that caused same generic headlines for every asset. Empty list now returned when no keyword match. Improved news_agent.py scoring rules for pair-specific vs macro separation. Fixed len(w) > 3 filter that excluded BTC/ETH. |
| 2026-06-18 | 02:47:00 | Fix: EMA-50/ADX/ATR Extraction | `orchestrator.py` | Added per-indicator pattern examples to Step 6 extraction instructions. Added 'id' field support to calculate_indicator to prevent EMA 20 and EMA 50 from overwriting each other. |
| 2026-06-18 | 03:13:00 | Fix: SynthesisPanel Neutral Levels UI | `SynthesisPanel.jsx`, `SynthesisPanel.module.css` | Updated the Risk card to display both Hypothetical Long and Hypothetical Short Stop-Loss/Take-Profit levels in a side-by-side grid when the trade direction is WAIT (neutral). |
| 2026-06-18 | 13:21:00 | Fix: Orchestrator extraction | `orchestrator.py` | Added 'hypothetical_scenarios' to the orchestrator JSON schema and prompt so that the frontend actually receives the hypotheticals calculated by the Risk agent. |
| 2026-06-18 | 13:21:00 | Fix: Pydantic MCP Tool Schema | `indicator_tools.py` | Changed calculate_indicator from taking raw `dict` to a strict Pydantic `IndicatorRequest` model to explicitly enforce 'id' field to LLM, fixing the EMA-50 overwrite bug. |
| 2026-06-18 | 14:14:00 | Fix: MCP Indicator dict parsing | `indicator_tools.py` | Fixed `AttributeError: 'dict' object has no attribute 'name'` by explicitly instantiating `IndicatorRequest(**ind)` in the processing loop since FastMCP/Pydantic list parsing passed raw dicts at runtime. |
| 2026-06-18 | 14:30:00 | Fix: RSS Keyword Expansion | `news_tools.py` | Mapped common crypto tickers (btc -> bitcoin, eth -> ethereum, etc.) in `topic_keywords` so RSS feeds match articles using full names, fixing the 'empty news' issue for BTC/ETH. |
| 2026-06-18 | 14:30:00 | Fix: Hypothetical Chart Annotations | `orchestrator.py` | Added explicit instructions to Orchestrator Step 7 to create horizontal line annotations for BOTH Hypothetical Long and Short SL/TP levels when the trade direction is WAIT, so they render on the frontend chart. |
| 2026-06-18 | 14:53:00 | Fix: MCP Server Schema Definition | `server.py` | Added missing `id` property to the hardcoded `inputSchema` for `calculate_indicator` in `server.py`. The LLM was stripping the `id` param because it was missing from the strict JSON Schema definition, causing the EMA 50 overwrite bug to persist despite previous Pydantic fixes. |
| 2026-06-18 | 15:03:00 | Feature: Unified News Engine | `news_tools.py`, `news_agent.py` | Overhauled `get_pair_news` to merge CryptoPanic premium data with free generic RSS/DuckDuckGo sources. The news agent is no longer artificially restricted when an API key is missing. |

---
### 2026-06-18 16:30:00 — Cursor Agent
* **Action/Task:** Implemented modular multi-provider LLM configuration and GitHub Models distribution to resolve rate limit.
* **Files Affected:** `ai-service/app/config.py`, `ai-service/app/llm/factory.py`, `ai-service/requirements.txt`, `.env.example`, `docs/state.md`, `docs/project_log.md`
* **Details/Decisions:** Added `gemini_api_key` to `Settings`. Added `google-generativeai>=0.8.0` to requirements for native `gemini/` provider. Enhanced `LLMFactory` with a `_PROVIDER_KEY_MAP` that automatically resolves the correct API key env var from the model string prefix — enabling zero-code provider switching. Rewrote `.env.example` with a comprehensive quick-switch reference (Anthropic, OpenAI, Gemini, GitHub Models, Ollama) and the recommended 5-model GitHub distribution (gpt-4.1-nano / Mistral-Small-3.1 / Meta-Llama-3.1-8B / Llama-3.3-70B / gpt-4.1-mini) that spreads 750 Low-tier requests/day across all agents.
* **Issues & Resolutions:** GitHub Models enforces per-model `UserByModelByDay` quotas (150 req/day per Low-tier model on Copilot Pro/Student). Distributing one model per agent multiplies effective daily capacity by 5×.

---
### 2026-06-18 16:10:00 — Cursor Agent
* **Action/Task:** Implemented pipeline fixes for empty indicators, deep news analysis, and trading advisor reliability improvements per approved plan.
* **Files Affected:** `ta_agent.py`, `indicator_tools.py`, `analysis_orchestrator.py`, `orchestrator.py`, `news_tools.py`, `news_agent.py`, `server.py`, `tools/__init__.py`, `docs/state.md`
* **Details/Decisions:** Fixed TA prompt to require `id` on all indicators; added auto-id fallback in `IndicatorRequest`; increased candle limit to 200; added INDICATOR_DATA JSON block for Orchestrator parsing; added `analyze_volume_profile` tool; added `scrape_article` with multi-factor news scoring (recency/impact/credibility/relevance); expanded sources (CoinGecko, TheBlock); rewrote news agent for deep analysis; updated Orchestrator confidence weighting rules.
* **Issues & Resolutions:** Root cause of empty indicators was MCP schema mismatch in TA prompt example — LLM omitted `id` for RSI/MACD/etc. Resolved via prompt fix + defensive auto-id generation.

---

## Execution Log Entry — 2026-06-21 02:18 UTC

* **Phase:** Phase 6 — Professional Trading Journal Implementation
* **Action/Task:** Implemented all 11 items of the Professional Trading Journal plan (Faz 1 Backend, Faz 2 Frontend UX, Faz 3 Chart Overlays).
* **Files Affected:**
  * Backend: `AnalysisService.cs`, `Trade.cs`, `TradeCreateDto.cs`, `TradeResponseDto.cs`, `TradeConfiguration.cs`, `TradeService.cs`, `ITradeService.cs`, `TradeController.cs`, `PortfolioService.cs`, `PortfolioSummaryDto.cs`, `MonthlyPnlDto.cs`, `EquityPointDto.cs`, `AppDbContextModelSnapshot.cs`, `20260621000000_AddTagsToTrades.cs` (new), `20260621000000_AddTagsToTrades.Designer.cs` (new)
  * Frontend: `AnalysisDetailPage.jsx`, `AnalysisDetailPage.module.css`, `TradesPage.jsx`, `TradesPage.module.css`, `TradeForm.jsx`, `TradeForm.module.css`, `PortfolioPage.jsx`, `PortfolioPage.module.css`, `TradingChart.jsx`, `TradingChart.module.css`, `apiClient.js`
  * Docs: `state.md`, `project_log.md`
* **Details/Decisions:**
  * `latest_price` now extracted from AI JSON via 3-level fallback (data agent → risk entry → first annotation).
  * `tags` column (VARCHAR 200) added to `trades` via explicit EF migration.
  * `PortfolioService` expanded with equity curve, monthly breakdown, MaxDrawdown, Expectancy, RecoveryFactor, AvgRR, streaks, best/worst symbol, avg hold duration.
  * New `GET /api/trade/by-analysis/{id}` endpoint returns all trades linked to an analysis.
  * `AnalysisDetailPage` fetches and displays linked trades in a dedicated card.
  * `TradesPage` adds a tag filter row (computed from loaded trades) and tag pills per row.
  * `TradeForm` adds a multi-select chip input with 7 preset tags.
  * `PortfolioPage` completely rewritten: lightweight-charts equity curve, monthly PnL bar grid, 8 advanced stat cards.
  * `TradingChart` rewritten: client-side EMA(20/50), Bollinger(20,2), RSI(14), MACD(12,26,9) calculated from klines data. RSI and MACD rendered in separate chart instances synced via `subscribeVisibleLogicalRangeChange`. All 4 indicator groups have on/off toggles in the chart header.
* **Issues & Resolutions:** None — clean implementation following the plan.

---
 
| 2026-06-21 | 21:28:00 | Feature: Medium Term Features (Priority 2) | `ai-service/app/schemas/*`, `ai-service/app/services/multi_tf_orchestrator.py`, `ai-service/app/api/analyze.py`, `api/src/Confluence.Application/DTOs/*`, `api/src/Confluence.Domain/Entities/*`, `api/src/Confluence.Application/Services/*`, `api/src/Confluence.Application/Interfaces/*`, `api/src/Confluence.API/Controllers/*`, `frontend/src/components/*`, `frontend/src/pages/*`, `frontend/src/store/*` | Implemented 4 major features: Multi-Timeframe Confluence (Orchestrator, DB tracking, UI Chips/Gauges), Model Accuracy Tracking (Binance public API checking, DB persistence, UI Dashboard), Analysis Comparison (side-by-side ComparePage, History Checkboxes), and Alert System (Dashboard widget for high-confidence signals). All completed successfully. |
| 2026-06-21 | 22:15:00 | Update documentation and status files | `docs/project_gap_analysis_and_recommendations.md`, `docs/state.md`, `docs/project_log.md` | Marked Priority 2 features (Multi-Timeframe Confluence, Accuracy Tracking, Analysis Comparison, and Alert System) as completed in the project documents. |
| 2026-06-22 | 14:50:00 | Feature: Strategy Templates & On-Chain Integration (Phase A) | `api/src/.../StrategyTemplate*`, `ai-service/app/mcp_server/tools/onchain_tools.py`, `ai-service/app/crew/prompts/onchain_agent.py`, `frontend/src/components/Analysis/ControlPanel*`, `frontend/src/components/Analysis/SynthesisPanel*` | Implemented Phase A of the long-term plan. Backend: Strategy Template CRUD and seeding. AI Service: 4 Binance Futures on-chain tools (funding, OI, LS ratio), new OnChainAgent, prompt wiring. Frontend: Strategy selector pills in ControlPanel, OnChain insights card in SynthesisPanel. State and log updated. |
## [2026-06-22 13:56] Fixed SettingsPage nested form bug breaking Custom Strategy Builder
- Analyzed backend API and confirmed it works correctly.
- Discovered that StrategyManager.jsx was rendered inside a giant <form> in SettingsPage.jsx.
- Nested forms caused the onSubmit event from the Strategy Builder to be intercepted by the outer form, silently failing to create the strategy.
- Replaced the outer <form> in SettingsPage.jsx with a <div> and bound the Save button to onClick.

## Execution Log Entry — 2026-06-25 17:05 UTC
* **Phase:** Backtest Mode Implementation
* **Action/Task:** Implemented Algorithmic Vectorized Backtest Mode bypassing slow LLM execution per candle.
* **Files Affected:** `ai-service/app/services/backtest_engine.py`, `ai-service/app/api/backtest.py`, `api/src/Confluence.API/Controllers/BacktestController.cs`, `frontend/src/pages/BacktestPage.jsx`, `frontend/src/components/Backtest/BacktestDashboard.jsx`
* **Details/Decisions:** Instead of invoking the full AI Crew for every candle in history (which is prohibitively slow and expensive), the backtest engine uses `ccxt` to bulk fetch data and `pandas` to vector-simulate the LLM synthesis math (TA scores, RSI/EMA boundaries, Minimum RR scaling) locally. The entire historical sweep completes in <1s. Connected to .NET proxy and built a React dashboard with lightweight-charts equity curve.

## Execution Log Entry — 2026-06-29 11:35 UTC
* **Phase:** Trade Review Assistant (İşlem Değerlendirme Asistanı)
* **Action/Task:** Implemented manual AI-driven trade review feature for closed trades.
* **Files Affected:** `TradeReview.cs`, `TradeReviewConfiguration.cs`, `AppDbContext.cs`, `TradeReviewService.cs`, `TradeReviewController.cs`, `trade_review_engine.py`, `review_trade.py`, `TradeReviewPanel.jsx`, `TradesPage.jsx`, `AnalysisDetailPage.jsx`.
* **Details/Decisions:** Added a `TradeReview` entity to persist AI evaluation scores. Bypassed the heavy CrewAI pipeline in favor of a direct single LLM call for fast evaluation. Integrated into the frontend as a glassmorphism panel that expands below closed trades in the Journal and Analysis Detail pages. Triggered manually by user interaction.

## Execution Log Entry — 2026-06-25 17:39 UTC
* **Phase:** Backtest Mode Improvements
* **Action/Task:** Added Optional Trading Fees and Max Trades limit for realistic simulation.
* **Files Affected:** `ai-service/app/schemas/backtest.py`, `ai-service/app/services/backtest_engine.py`, `api/src/Confluence.Application/DTOs/BacktestDto.cs`, `api/src/Confluence.API/Controllers/BacktestController.cs`, `frontend/src/pages/BacktestPage.jsx`, `frontend/src/components/Backtest/BacktestDashboard.jsx`
* **Details/Decisions:** Simulated volume-based commission deduction for entries and exits to calculate Net PnL accurately. Implemented `max_trades` loop breakout. Renamed UI "Timeframe" to "Candle Resolution" to clarify its purpose vs strategy MTF.

## Execution Log Entry — 2026-06-25 18:09 UTC
* **Phase:** Backtest Mode Transparency (Phase 2)
* **Action/Task:** Added disclaimer for simulation boundaries and added SL, TP, Leverage columns to trades table.
* **Files Affected:** `ai-service/app/schemas/backtest.py`, `ai-service/app/services/backtest_engine.py`, `frontend/src/pages/BacktestPage.jsx`, `frontend/src/components/Backtest/BacktestDashboard.jsx`, `frontend/src/pages/BacktestPage.module.css`, `frontend/src/components/Backtest/BacktestDashboard.module.css`
* **Details/Decisions:** Calculated implicit leverage (`Position Size / Risk Amount`) in Python engine and passed it to frontend. Updated React UI to display SL, TP, and Lev clearly to prevent user confusion regarding "liquidation" vs "stop-loss" events. Added prominent disclaimer explaining that On-Chain and News signals are neutral in vectorized backtesting.

## Execution Log Entry — 2026-06-27 02:24 UTC
* **Phase:** Marketing & Product Educational Page
* **Action/Task:** Developed an aesthetically pleasing Landing Page explaining AI Pipeline and Risk Management philosophy.
* **Files Affected:** `frontend/src/App.jsx`, `frontend/src/pages/LandingPage.jsx`, `frontend/src/pages/LandingPage.module.css`
* **Details/Decisions:** Reconfigured React Router to serve LandingPage at `/` and wrapped all internal app pages within `/app/*` structure via `MainLayout`. Utilized dark mode, glassmorphism, and radial gradients in CSS to establish an institutional, professional UI aesthetic. Integrated educational content directly targeting amateur retail misconceptions (Leverage vs Risk, R:R 2.0).

## Execution Log Entry — 2026-06-29 12:15 UTC
* **Phase:** Chart Snapshotting & Execution Quality (Trading Journal)
* **Action/Task:** Implemented visual chart recording and execution slippage tracking for trades.
* **Files Affected:** `Trade.cs`, `TradeConfiguration.cs`, `TradeService.cs`, `SnapshotService.cs`, `ISnapshotService.cs`, `Program.cs`, `TradingChart.jsx`, `TradesPage.jsx`, `TradeForm.jsx`, `SynthesisPanel.jsx`, `SnapshotLightbox.jsx`
* **Details/Decisions:** Added fields for `entrySnapshotUrl`, `exitSnapshotUrl`, `plannedEntryPrice`, `entrySlippagePct`, and `executionQuality` to the DB. Built an `ISnapshotService` to save base64 lightweight-charts screenshots as static WebP/PNG files via `IWebHostEnvironment`. Extracted `plannedEntryPrice` directly from the AI analysis JSON. Updated the frontend to calculate slippage vs plan, assign Good/Fair/Poor execution badges, and render interactive thumbnail lightboxes inside the Trades table.

## Execution Log Entry — 2026-07-08 03:24 UTC
* **Phase:** Documentation — README Professional Overhaul
* **Action/Task:** Rewrote README.md from a minimal 104-line stub to a comprehensive, professional GitHub README.
* **Files Affected:** `README.md`, `docs/images/architecture_diagram.png` (new), `docs/images/agent_pipeline_flow.png` (new), `docs/images/ui_dashboard_mockup.png` (new), `docs/state.md`, `docs/project_log.md`
* **Details/Decisions:** 16-section structure (Hero, Architecture, AI Pipeline, Features, Tech Stack, Project Structure, Quick Start, Config, Design Decisions, Challenges Solved, Roadmap, License). 3 AI-generated images in `docs/images/`. Shields.io badges for Python 3.12, .NET 8, React 18, FastAPI, CrewAI v2, Docker, MIT. GitHub clone URL set to aeren23. Multi-provider LLM config section with 5-model GitHub distribution example. Challenges Solved table with 8 engineering decisions.

## Execution Log Entry — 2026-07-13 13:08 UTC
* **Phase:** Phase 7 — AI Pipeline Enhancement (Faz 1: Deterministic Scoring + Market Structure)
* **Action/Task:** Implemented Faz 1 of the AI pipeline strengthening roadmap. Added Market Structure Agent and 3 deterministic MCP tools to eliminate LLM variance in core TA calculations.
* **Files Affected:**
  - [NEW] `ai-service/app/mcp_server/tools/structure_tools.py` — 3 new MCP tools
  - [NEW] `ai-service/app/crew/prompts/market_structure_agent.py` — Market Structure Agent prompt
  - [MODIFIED] `ai-service/app/crew/prompts/ta_agent.py` — Rewritten to use deterministic composite score + structure context
  - [MODIFIED] `ai-service/app/crew/confluence_crew.py` — Market Structure Agent + task added, dependency graph updated
  - [MODIFIED] `ai-service/app/mcp_server/server.py` — 3 new tool definitions registered (10 total)
  - [MODIFIED] `ai-service/app/mcp_server/tools/__init__.py` — 3 new exports
  - [MODIFIED] `ai-service/app/llm/config.py` — market_structure override field + _AGENT_OVERRIDE_MAP entry
  - [MODIFIED] `.env.example` — LLM_MARKET_STRUCTURE_AGENT_MODEL + updated GitHub 8-agent distribution guide
* **Details/Decisions:**
  - `detect_market_structure`: Swing point analysis — identifies HH/HL (bullish) vs LH/LL (bearish), BOS (Break of Structure) and CHoCH (Character Change) events
  - `detect_market_regime`: ADX + EMA alignment + BB width squeeze → trending_up / trending_down / ranging / breakout classification
  - `calculate_ta_composite_score`: Fully deterministic -1.0 to +1.0 score. Same data = same score every time. Components: EMA trend (30%), RSI (15%), MACD cross (10%), BB position (15%), RSI divergence (15%), ADX multiplier.
  - TA Agent now uses composite_score as non-negotiable sentiment_score; applies CHoCH/BOS confidence adjustments.
  - Market Structure Agent runs in parallel with News + OnChain after Data Agent; TA Agent waits for it.
  - GitHub Models distribution updated: 8 agents across 5 models (750 req/day maintained).
  - TODO added to state.md: Coinglass API for real liquidation heatmap (future enhancement).

## Execution Log Entry — 2026-07-13 23:48 UTC
* **Phase:** Phase 7 — AI Pipeline Enhancement (Faz 2: Trade Mode + Range Trade)
* **Action/Task:** Implemented Faz 2: Orchestrator now determines trade_mode, generates range_trade block, and all layers (AI → Schema → UI) updated end-to-end.
* **Files Affected:**
  - [MODIFIED] `ai-service/app/crew/prompts/orchestrator.py` — trade_mode logic, market_structure agent block, range_trade synthesis
  - [MODIFIED] `ai-service/app/schemas/response.py` — RangeTrade, RangeTradeBreakoutAlert models; SynthesisOutput.trade_mode + range_trade
  - [MODIFIED] `ai-service/app/services/analysis_orchestrator.py` — range_trade + trade_mode parsing with graceful fallback
  - [MODIFIED] `frontend/src/components/Analysis/SynthesisPanel.jsx` — TradeModeBanner + RangeTradeCard components
  - [MODIFIED] `frontend/src/components/Analysis/SynthesisPanel.module.css` — trade mode banner + range trade card styles
* **Details/Decisions:**
  - trade_mode = 'trend' when ADX>25 and regime is trending_up/down.
  - trade_mode = 'range' when ADX<20 and regime is 'ranging' with no BOS. Produces range_trade block with range_high, range_low, bias, trigger, and breakout_alert.
  - trade_mode = 'breakout_watch' when BOS is detected or regime = 'breakout'. No open position — wait for breakout confirmation.
  - Bias determination in range mode: price in lower half → long_at_support; upper half → short_at_resistance; neutral near midrange → no_edge.
  - Frontend Trade Mode Banner: green/amber/purple variants with icon and description.
  - Range Trade Card: animated price marker on range bar, bias tag, trigger sentence, bull/bear breakout alert boxes.
  - SynthesisOutput.range_trade is null when trade_mode != 'range'. Graceful fallback in analysis_orchestrator ensures no pipeline break on malformed LLM output.
  - SynthesisOutput.trade_mode defaults to 'trend' (backward-compatible with existing stored analyses).

## Execution Log Entry — 2026-07-14 00:00 UTC
* **Phase:** Phase 7 — AI Pipeline Enhancement (Faz 3: Entry Timing + TP1/TP2 Graduated Take-Profit)
* **Action/Task:** Implemented Faz 3: TA Agent produces entry_timing signal, Risk Agent generates TP1 (1:1) and TP2 (primary) targets, Orchestrator propagates both with dedicated annotations, frontend displays Entry Timing Badge and dual TP rows.
* **Files Affected:**
  - [MODIFIED] `ai-service/app/crew/prompts/ta_agent.py` — Step 16 Entry Timing (immediate/wait_for_pullback/wait_for_confirmation/avoid); entry_timing field in INDICATOR_DATA JSON
  - [MODIFIED] `ai-service/app/crew/prompts/risk_agent.py` — Step 9 Graduated TP (tp1=1:1 R:R, tp2=primary target); Step 11 R/R gate uses TP2; GOAL + EXPECTED_OUTPUT updated
  - [MODIFIED] `ai-service/app/crew/prompts/orchestrator.py` — tp1/tp2 in risk.details.levels schema; entry_timing extraction from INDICATOR_DATA; TP1/TP2 annotations (take_profit_1/take_profit_2); entry_timing in agent_summaries
  - [MODIFIED] `frontend/src/components/Analysis/SynthesisPanel.jsx` — EntryTimingBadge component; TP1/TP2 rows in PositionSizingCard (1:1 tag + primary tag); entryTiming state read from synthesis.agent_summaries.entry_timing
  - [MODIFIED] `frontend/src/components/Analysis/SynthesisPanel.module.css` — .entryTimingBox, .tp1Tag, .tp2Tag styles
* **Details/Decisions:**
  - Entry timing is DETERMINISTIC based on RSI thresholds (>72 overbought for longs, <28 oversold for shorts), MACD histogram direction, BB position, volume trend, and ADX level.
  - 'immediate': all conditions aligned — enter at market.
  - 'wait_for_pullback': price extended (RSI OB, upper BB).
  - 'wait_for_confirmation': BOS/CHoCH just fired or ADX < 15.
  - 'avoid': no directional edge or conflicting signals.
  - TP1 = entry ± (1.0 * SL_distance) — 1:1 R:R. Hit this first, then move SL to break-even.
  - TP2 = resistance/support level from Step 8 — primary target. R/R gate uses TP2.
  - Backwards compatible: tp.take_profit still populated so existing stored analyses display normally.

## Execution Log Entry — 2026-07-14 00:15 UTC
* **Phase:** Phase 7 — AI Pipeline Enhancement (Faz 4: Liquidity Agent + HTF Context)
* **Action/Task:** Implemented Faz 4: Created Liquidity Agent to estimate stop hunt zones and order book bias using OI and L/S ratios. Injected Higher Time Frame (HTF) 1d context into TA Agent for lower timeframes.
* **Files Affected:**
  - [NEW] `ai-service/app/mcp_server/tools/liquidity_tools.py` — `get_liquidation_clusters` tool
  - [NEW] `ai-service/app/crew/prompts/liquidity_agent.py` — Liquidity Agent prompt generating LIQUIDITY_DATA
  - [MODIFIED] `ai-service/app/crew/confluence_crew.py` — Added `liquidity_agent` and `liquidity_task` (runs parallel)
  - [MODIFIED] `ai-service/app/mcp_server/server.py` — Registered `get_liquidation_clusters`
  - [MODIFIED] `ai-service/app/crew/prompts/data_agent.py` — Added fallback `1d` fetch for `ohlcv_ref_1d`
  - [MODIFIED] `ai-service/app/crew/prompts/ta_agent.py` — Step 7 reads `ohlcv_ref_1d` to check HTF alignment and applies confidence penalty if conflicting. Added `htf_alignment` to JSON.
  - [MODIFIED] `ai-service/app/crew/prompts/risk_agent.py` — Step 5 reads `LIQUIDITY_DATA` and adjusts SL to be BEYOND the closest major liquidity pool to avoid stop hunts.
  - [MODIFIED] `ai-service/app/crew/prompts/orchestrator.py` — Included Liquidity agent in JSON schema and extracted summary.
* **Details/Decisions:**
  - Used estimated liquidation clusters based on Long/Short ratio rather than Coinglass API (to save cost and keep within Binance public API).
  - HTF context is seamlessly injected by `DataAgent` making a second call for `1d` data, and `TAAgent` executing structure tools on `ohlcv_ref_1d`.
  - Risk SL placement now explicitly avoids liquidity zones, directly fulfilling the "stop hunt avoidance" goal.

## Execution Log Entry — 2026-07-14 01:15 UTC
* **Phase:** Phase 8 — AI Pipeline Final Architecture (Real-World Trading Features)
* **Action/Task:** Implemented Faz 1: DB Expansion (Entities & DTOs)
* **Files Affected:** `Analysis.cs`, `Trade.cs`, `AnalysisResponseDto.cs`, `TradeCreateDto.cs`, `TradeResponseDto.cs`, `TradeService.cs`, `AnalysisService.cs`, EF Core Migrations
* **Details/Decisions:** 
  - Added `TradeMode`, `HtfAlignment`, `LiquidityPoolBias` to `Analysis` entity for DB-level filtering capability.
  - Added `TakeProfit2` to `Trade` entity to support the AI's graduated exit targets.
  - Updated mapping logic in `TradeService` and `AnalysisService`.
  - Generated and applied `AddAiMetadataAndTp2` EF Core Migration.

## Execution Log Entry — 2026-07-14 01:17 UTC
* **Phase:** Phase 8 — AI Pipeline Final Architecture (Real-World Trading Features)
* **Action/Task:** Implemented Faz 2: Backend Services and Auto-Tagging
* **Files Affected:** `AnalysisService.cs`, `TradeService.cs`
* **Details/Decisions:** 
  - Updated `AnalysisService.cs` to parse `TradeMode`, `HtfAlignment`, and `LiquidityPoolBias` from Orchestrator's `ResultJson`.
  - Updated `TradeService.cs` to automatically append `#StopHuntAvoided`, `#CounterTrend`, and `#RangeBounce` tags during Trade creation by evaluating the associated Analysis metadata.

## Execution Log Entry — 2026-07-14 01:24 UTC
* **Phase:** Phase 8 — AI Pipeline Final Architecture (Real-World Trading Features)
* **Action/Task:** Implemented Faz 3: Frontend Form and Table Updates
* **Files Affected:** `TradeForm.jsx`, `TradesPage.jsx`, `AnalysisDetailPage.jsx`, `AnalysisDetailPage.module.css`, `SynthesisPanel.jsx`
* **Details/Decisions:** 
  - Added `TakeProfit2` input to `TradeForm.jsx` and auto-populated it from the AI analysis via `SynthesisPanel.jsx`.
  - Updated the Trades journal table in `TradesPage.jsx` and `AnalysisDetailPage.jsx` to render `TP1 / TP2` together in the StopLoss/TakeProfit column.
  - Ensured auto-tags correctly render as custom styled chips in the frontend table.

## Execution Log Entry — 2026-07-14 02:00 UTC
* **Phase:** Phase 8 — AI Pipeline Final Architecture (Real-World Trading Features)
* **Action/Task:** Implemented Faz 4: Accuracy Service Backtest-Lite
* **Files Affected:** `AnalysisAccuracy.cs`, `AccuracyService.cs`
* **Details/Decisions:** 
  - Upgraded the accuracy tracking model by adding boolean flags (`HitEntry`, `HitStopLoss`, `HitTakeProfit1`, `HitTakeProfit2`) and created the `UpdateAccuracyTracking` EF Core Migration.
  - Rewrote `AccuracyService.cs` to fetch 5m Klines from Binance API instead of a single tick price.
  - Implemented a historical simulation loop that evaluates candles to determine if the SL or TP was hit first (resolving intra-candle collisions pessimistically).
  - Changed `IsAccurate = true` criteria from a naive snapshot of current PnL to actual trade completion logic (TP1 hit before SL).

## Execution Log Entry — 2026-07-15 15:00 UTC
* **Phase:** AI Pipeline Quality Overhaul (Faz 1-5)
* **Action/Task:** Overhauled AI tools and frontend presentation to improve signal sensitivity and fix "neutral" bias.
* **Files Affected:** `structure_tools.py`, `ta_agent.py`, `liquidity_tools.py`, `liquidity_agent.py`, `risk_agent.py`, `orchestrator.py`, `news_tools.py`, `news_agent.py`, `SynthesisPanel.jsx`, `SynthesisPanel.module.css`.
* **Details/Decisions:** 
  - Dynamic Volatility: Replaced static thresholds with ATR-adjusted dynamic bands in `structure_tools.py` and `liquidity_tools.py`.
  - Added volume trend confirmation and deeper TP horizon (depth=5) for risk target search.
  - Required Step-by-Step Chain-of-Thought in News Agent and implemented regex-based semantic pre-scoring to prevent hallucination.
  - Enhanced `SynthesisPanel.jsx` to render a `BreakoutWatchCard` for breakout modes and dim `PositionSizingCard` with a "HYPOTHETICAL" badge when the recommendation is WAIT.

## Execution Log Entry — 2026-07-15 16:30 UTC
* **Phase:** Frontend UI & Pipeline Integration Fixes
* **Action/Task:** Fixed missing TP1/TP2, added server-side direction gate, created Market Structure UI card, and integrated annotations on the chart.
* **Files Affected:** `analysis_orchestrator.py`, `SynthesisPanel.jsx`, `SynthesisPanel.module.css`, `TradingChart.jsx`.
* **Details/Decisions:** 
  - Created a TA-score-based direction gate in `analysis_orchestrator.py` to prevent LLMs from erroneously calling a WAIT when signals strongly dictate otherwise.
  - Rewrote Hypothetical Grid in `SynthesisPanel.jsx` to correctly display TP1 (1:1) and TP2 targets in separate rows.
  - Built a `MarketStructureCard` to display Phase 1's regime, structure, and BOS/CHoCH data in the UI grid.
  - Exposed AI-generated `annotations` (SL, TP, BOS, range boundaries, divergences) directly onto the lightweight-chart in `TradingChart.jsx`.

## Execution Log Entry — 2026-07-15 20:40 UTC
* **Phase:** Server-side TP Correction Gate & Risk Profile Threshold Fix
* **Action/Task:** Added Gate 0 for deterministic TP1/TP2 correction and fixed semantically inverted risk profile thresholds.
* **Files Affected:** `analysis_orchestrator.py`, `risk_agent.py`, `SettingsPage.jsx`.
* **Details/Decisions:** 
  - Gate 0 recalculates TP1 as true 1:1 R:R from SL distance and validates TP2 against TA resistance levels, preventing LLM math errors from triggering false WAIT signals via the R:R gate.
  - Fixed inverted `neutral_hi` semantics: aggressive (0.15, easiest LONG), moderate (0.25), conservative (0.35, hardest LONG).
  - Aligned `rr_minimum`/`rr_ideal`: conservative (1.5/2.0), moderate (1.0/1.5), aggressive (0.5/0.8).
  - Added missing `neutral` profile (1.2/1.8/0.30).
  - Updated `risk_agent.py` EXPECTED_OUTPUT R:R tiers to use dynamic `{rr_ideal}`/`{rr_minimum}` placeholders.
  - Updated `SettingsPage.jsx` profile card descriptions to reflect new thresholds.

## Execution Log Entry — 2026-07-16 00:10 UTC
* **Phase:** End-to-End TP1/TP2 Integration Fix
* **Action/Task:** Fixed missing `tp2` field mapping in frontend trade form pre-fills and resolved `AccuracyService.cs` JSON parsing bug. Fixed TP2 front-running bug in `analysis_orchestrator.py` Gate 0.
* **Files Affected:** `SynthesisPanel.jsx`, `AnalysisDetailPage.jsx`, `AccuracyService.cs`, `analysis_orchestrator.py`.
* **Details/Decisions:**
  - Updated `openTradeForm` payload mapping in frontend to read `levels.tp1` and `levels.tp2` directly instead of old schema names.
  - Refactored `AccuracyService.cs` JSON extraction logic to look for `tp1`/`tp2` first, gracefully falling back to `take_profit_1`/`take_profit` for historical compatibility.
  - Corrected the `0.995` front-running logic in Gate 0 to ensure it does not push TP2 below TP1 for long trades.

## Execution Log Entry — 2026-07-16 00:25 UTC
* **Phase:** End-to-End API Filters & Kademeli Kar Alma
* **Action/Task:** Implemented UI/API filtering for AI metadata and 'Trade Splitting' for partial closes.
* **Files Affected:** `IAnalysisService.cs`, `AnalysisService.cs`, `AnalysisController.cs`, `HistoryPage.jsx`, `Trade.cs`, `TradeCloseDto.cs`, `TradeService.cs`, `TradesPage.jsx`, `EF Core Migrations`.
* **Details/Decisions:**
  - Added support for multiple value (comma-separated) filtering for `TradeMode`, `HtfAlignment`, and `LiquidityPoolBias` on `AnalysisService.cs`.
  - Built a custom `MultiSelectDropdown` in `HistoryPage.jsx` to select these parameters without relying on external libraries.
  - Resolved the complex Partial Close challenge by implementing a "Trade Splitting" pattern in `TradeService.cs`.
  - The trade splitting pattern clones the existing trade for the remaining unclosed amount (maintaining status `Open`) and fully closes the original trade for the requested close amount. This completely avoids breaking existing `PortfolioService` PnL logic.
  - Added `ParentTradeId` to `Trade.cs` and applied the database migration to track split lineage.
  - Added `CloseAmount` and Quick Fill (TP1/TP2, 50%/100%) buttons to `TradesPage.jsx` Close Trade Modal.

## Execution Log Entry — 2026-07-16 00:34 UTC
* **Phase:** Bug Fix
* **Action/Task:** Fixed broken/missing trade snapshots on the Trades Page.
* **Files Affected:** `api/Dockerfile`, `docker-compose.yml`.
* **Details/Decisions:**
  - Issue: `SnapshotService` was failing silently because `appuser` did not have write permissions to `/app/wwwroot` which was owned by root from the build stage. Furthermore, snapshots were lost every time the container was restarted because they were not mapped to a volume.
  - Fix: Added a `snapshots` named volume in `docker-compose.yml`.
  - Fix: Added `RUN mkdir -p wwwroot/snapshots && chown -R appuser:appgroup wwwroot` to the API Dockerfile to ensure write access.

## Execution Log Entry — 2026-07-16 01:00 UTC
* **Phase:** Bug Fix
* **Action/Task:** Fixed Multi-Timeframe OHLCV Cache Race Condition causing "Unknown" indicator values.
* **Files Affected:** `ai-service/app/mcp_server/cache.py`.
* **Details/Decisions:**
  - Issue: In Multi-Timeframe mode, `multi_tf_orchestrator.py` runs secondary timeframes concurrently. When a fast-finishing timeframe completed, its `finally` block called `OHLCVCache.clear()`, which indiscriminately wiped the entire directory. This deleted the Parquet files currently being accessed by the still-running timeframes, causing "Structure data unavailable" errors and completely empty Technical Analysis charts.
  - Fix: Refactored `OHLCVCache.clear()` into a Garbage Collection pattern. Instead of deleting all files, it checks `os.stat().st_mtime` and only unlinks files older than `max_age_seconds` (default: 3600). This perfectly preserves active session data while still protecting the disk from unbounded growth.

## Execution Log Entry — 2026-07-16 01:33 UTC
* **Phase:** Bug Fix
* **Action/Task:** Fixed Range Trade bias mathematical hallucination in Orchestrator prompt.
* **Files Affected:** `ai-service/app/crew/prompts/orchestrator.py`.
* **Details/Decisions:**
  - Issue: The Orchestrator prompt calculated "near support" as `current_price <= range_low * 1.01`. Since 1% of a $580 asset is $5.80, and the entire range was only $1.00 wide, the LLM mathematically categorized the absolute top of the range (resistance) as being "near support". This caused the UI to show "LONG BIAS" when the price was at resistance.
  - Fix: Changed the prompt logic to use `range_span = range_high - range_low` and threshold checking based on `20%` of the span (`range_low + (range_span * 0.20)`). This ensures range calculations are relative to the actual range width, regardless of the asset's nominal price.

## Execution Log Entry — 2026-07-16 01:48 UTC
* **Phase:** Logic Enhancement
* **Action/Task:** Scalp Mode Optimizations (Strict ADX & Dynamic Conflict Detection).
* **Files Affected:** `ai-service/app/crew/prompts/ta_agent.py`, `ai-service/app/crew/prompts/risk_agent.py`.
* **Details/Decisions:**
  - Issue 1 (ADX): Scalp trades were being permitted (or triggering 'wait_for_confirmation') even when ADX was extremely low (e.g. 9.68), which implies a completely dead market.
  - Fix 1: Added a strict prompt rule to `ta_agent.py` forcing an immediate `AVOID` entry timing if ADX < 12.
  - Issue 2 (Conflict): Risk Agent was using raw News Score to determine conflicts. In scalp mode (where news weight is only 5%), a strong macro news event would still trigger a false "Conflict" flag, adding noise to the analysis.
  - Fix 2: Changed `risk_agent.py` to use an `Effective_News_Score` (scaled by `{news_weight} / 0.20`). This prevents macro news from triggering conflict alarms when its actual weight in the confluence score is intentionally minimized.
