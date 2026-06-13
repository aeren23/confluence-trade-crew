# Database Schema

## 1. Overview

This document defines the PostgreSQL schema owned by the **.NET API** layer (the
single source of truth, as defined in `architecture.md`). The Python AI Service is
stateless and does not access this database directly — all persistence happens
through the .NET API.

The schema supports:

- Storing the results of multi-agent analyses (`analyses`) for later reference
  (e.g. "what did you say about BTC last week?").
- Manual trade journaling (`trades`) — entry/exit recorded by the user, with
  automatic PnL calculation on close.
- User-level configuration (`user_settings`) — default balance, risk percentage,
  tracked pairs.
- A reference table of supported pairs (`pairs`).

This is a **single-user** system (see `architecture.md` § 7, Out of Scope). There is
no `users` table with authentication; a single implicit user context is assumed. If
multi-user support is added later, a `users` table and a `user_id` foreign key can be
introduced across these tables without breaking the core structure.

---

## 2. Entity-Relationship Overview

```
┌────────────────┐       ┌──────────────────┐
│   user_settings  │       │       pairs        │
│  (singleton row) │       │  (reference table) │
└────────────────┘       └─────────┬──────────┘
                                     │
                                     │ symbol (FK, soft reference)
                                     ▼
┌────────────────────────┐   ┌────────────────────────┐
│        analyses           │   │          trades           │
│  (one row per analysis    │   │  (one row per manual      │
│   request, full agent      │   │   trade entry/exit)       │
│   output as JSON)          │   │                            │
└─────────────┬────────────┘   └─────────────┬────────────┘
              │                                │
              │ analysis_id (nullable FK)      │
              └────────────────────────────────┘
              (a trade MAY reference the analysis
               that informed the user's decision)
```

---

## 3. Table: `pairs`

Reference table of trading pairs the system has been used with. Populated
lazily (on first analysis request for a new pair) rather than pre-seeded, though a
small default set (e.g. `BTC/USDT`, `ETH/USDT`) may be seeded on first run for
convenience.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` | Internal identifier |
| `symbol` | `VARCHAR(20)` | `UNIQUE NOT NULL` | ccxt-style symbol, e.g. `'BTC/USDT'` |
| `base_asset` | `VARCHAR(10)` | `NOT NULL` | e.g. `'BTC'` |
| `quote_asset` | `VARCHAR(10)` | `NOT NULL` | e.g. `'USDT'` |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Soft flag, e.g. to hide delisted pairs from UI dropdowns |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Indexes**:

- `UNIQUE INDEX` on `symbol` (already covered by the `UNIQUE` constraint)

---

## 4. Table: `analyses`

Stores the full result of a single multi-agent analysis run (as returned by the
Python AI Service's `POST /analyze` endpoint, per `architecture.md` § 3.3). The
entire agent output is persisted as JSON to preserve full fidelity for later
inspection, while a few denormalized columns are extracted for indexing/querying.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `symbol` | `VARCHAR(20)` | `NOT NULL` | e.g. `'BTC/USDT'` |
| `timeframe` | `VARCHAR(10)` | `NOT NULL` | e.g. `'4h'` |
| `requested_balance` | `NUMERIC(20,8)` | `NOT NULL` | Balance value used for this analysis request |
| `requested_risk_percentage` | `NUMERIC(5,2)` | `NOT NULL` | Risk % used for this request |
| `overall_sentiment` | `VARCHAR(10)` | `NOT NULL` | `'bullish' \| 'bearish' \| 'neutral'`, denormalized from `synthesis.overall_sentiment` |
| `overall_sentiment_score` | `NUMERIC(4,3)` | `NOT NULL` | Denormalized from `synthesis.overall_sentiment_score`, range -1.000 to 1.000 |
| `confidence` | `NUMERIC(4,3)` | `NOT NULL` | Denormalized from `synthesis.confidence` |
| `conflicts_detected` | `BOOLEAN` | `NOT NULL DEFAULT false` | Denormalized from `synthesis.conflicts_detected` |
| `latest_price` | `NUMERIC(20,8)` | `NOT NULL` | Price at time of analysis (from Data Agent output) |
| `result_json` | `JSONB` | `NOT NULL` | Full response from the AI Service (`agents` + `synthesis` + `annotations`, per `agents.md`) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Indexes**:

- `INDEX` on `(symbol, created_at DESC)` — for "show me past analyses for BTC/USDT,
  most recent first"
- `INDEX` on `created_at` — for general chronological listing
- `GIN INDEX` on `result_json` — optional, enables querying inside the JSON
  (e.g. filter by `result_json->'agents'->'news'->>'risk_threshold'`) if needed
  later

**Notes**:

- `result_json` is the canonical record of what each agent said. The denormalized
  columns (`overall_sentiment`, `latest_price`, etc.) exist purely for fast
  filtering/sorting without parsing JSON on every query.
- This table is **append-only** in normal operation — analyses are never updated,
  only created. (No `updated_at` column.)

---

## 5. Table: `trades`

Stores manually-entered trade positions. A trade is created when the user decides to
act on an analysis (or independently), and updated once when the position is closed.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `analysis_id` | `UUID` | `NULL`, `FOREIGN KEY → analyses(id)` | Optional reference to the analysis that informed this trade |
| `symbol` | `VARCHAR(20)` | `NOT NULL` | e.g. `'BTC/USDT'` |
| `direction` | `VARCHAR(5)` | `NOT NULL`, `CHECK (direction IN ('long','short'))` | |
| `status` | `VARCHAR(10)` | `NOT NULL DEFAULT 'open'`, `CHECK (status IN ('open','closed'))` | |
| `entry_price` | `NUMERIC(20,8)` | `NOT NULL` | |
| `entry_amount` | `NUMERIC(20,8)` | `NOT NULL` | Position size in base asset (e.g. amount of BTC) |
| `leverage` | `NUMERIC(5,2)` | `NOT NULL DEFAULT 1.0` | e.g. `3.0` for 3x |
| `stop_loss` | `NUMERIC(20,8)` | `NULL` | Optional, user-defined or copied from analysis suggestion |
| `take_profit` | `NUMERIC(20,8)` | `NULL` | Optional |
| `entry_at` | `TIMESTAMPTZ` | `NOT NULL` | When the position was opened (user-provided, may differ from `created_at`) |
| `exit_price` | `NUMERIC(20,8)` | `NULL` | Set on close |
| `exit_at` | `TIMESTAMPTZ` | `NULL` | Set on close |
| `pnl_quote` | `NUMERIC(20,8)` | `NULL` | Profit/loss in quote asset (e.g. USDT), computed on close |
| `pnl_percentage` | `NUMERIC(8,4)` | `NULL` | Profit/loss as a percentage of position value, computed on close |
| `notes` | `TEXT` | `NULL` | Free-form user notes |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Updated when the trade is closed or edited |

**Indexes**:

- `INDEX` on `(status, symbol)` — for "show all open positions" / "show open
  positions for BTC/USDT"
- `INDEX` on `(status, entry_at DESC)` — for chronological trade history listing
- `INDEX` on `analysis_id` — for "show trades derived from this analysis"

**PnL Calculation (performed by the .NET API on close)**:

```
position_value_quote = entry_amount * entry_price

if direction == 'long':
    pnl_quote = (exit_price - entry_price) * entry_amount * leverage
else: # short
    pnl_quote = (entry_price - exit_price) * entry_amount * leverage

pnl_percentage = (pnl_quote / position_value_quote) * 100
```

> Leverage is applied as a simple multiplier on PnL for journaling purposes. This
> schema does **not** model liquidation prices, funding rates, or margin calls —
> those are out of scope for a manual journal (see `architecture.md` § 7).

---

## 6. Table: `user_settings`

Single-row table (singleton pattern) holding default values used to pre-fill the
analysis request form and risk calculations. Enforced as a single row via a check
constraint on a fixed `id`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SMALLINT` | `PRIMARY KEY DEFAULT 1`, `CHECK (id = 1)` | Singleton enforcement |
| `default_balance` | `NUMERIC(20,8)` | `NOT NULL DEFAULT 1000.0` | Default balance shown in the analysis form |
| `default_risk_percentage` | `NUMERIC(5,2)` | `NOT NULL DEFAULT 2.0` | Default risk % per trade |
| `preferred_timeframe` | `VARCHAR(10)` | `NOT NULL DEFAULT '4h'` | Default chart/analysis timeframe |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Notes**:

- This table is seeded with a single default row on first migration.
- Used purely for UX convenience (pre-filling forms); it does **not** gate or
  authorize any operation (no auth in v1, per `architecture.md` § 7).

---

## 7. Migration Notes

- Initial migration creates all four tables in the order: `pairs`,
  `user_settings`, `analyses`, `trades` (respecting the foreign key from `trades` to
  `analyses`).
- `pairs` is seeded with a small default set (`BTC/USDT`, `ETH/USDT`) for
  convenience; additional pairs are inserted on first use (upsert on `symbol`).
- `user_settings` is seeded with one default row (`id = 1`).
- Recommended PostgreSQL extensions: `pgcrypto` or `uuid-ossp` for
  `gen_random_uuid()` (depending on PostgreSQL version — PG 13+ has
  `gen_random_uuid()` built into `pgcrypto`; ensure the extension is enabled in the
  migration).

---

## 8. Summary Table — Relationships

| Table | Relates To | Relationship |
|---|---|---|
| `analyses` | `trades` | One analysis MAY inform zero or more trades (`trades.analysis_id` nullable FK) |
| `pairs` | `analyses`, `trades` | Soft reference via `symbol` (no FK enforced — `pairs` is a convenience/reference table, not a strict constraint, to avoid blocking analysis of a pair not yet in `pairs`) |
| `user_settings` | — | Standalone singleton, no relationships |