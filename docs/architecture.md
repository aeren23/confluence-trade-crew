# Architecture

## 1. Genel Bakış

Bu proje, kripto para piyasalarında teknik analiz, haber/sentiment analizi ve risk
değerlendirmesini bir araya getiren, **multi-agent** bir karar destek (decision-support)
sistemidir. Sistem **otonom trade yapmaz** — kullanıcıya analiz ve öneri sunar, kullanıcı
kendi kararını kendi verir ve işlemleri manuel olarak sisteme kaydeder.

Proje üç ana katmandan oluşur:

1. **Frontend (React + lightweight-charts)** — kullanıcı arayüzü, chart ve chat
2. **API Layer (.NET / ASP.NET Core)** — entity'ler, iş mantığı, trade lifecycle, veri
   kalıcılığı (tek otorite)
3. **AI Service (Python / FastAPI + CrewAI)** — multi-agent analiz motoru, stateless

Bunların altında, AI Service'in kullandığı bir **iç MCP server** bulunur; bu server
piyasa verisi, indikatör hesaplama ve haber/sentiment araçlarını agent'lara "tool" olarak
sunar.

Proje **kişisel kullanım ve portfolyo amaçlıdır**. SaaS, multi-tenant auth, hosted
deployment kapsam dışıdır. Kullanıcı, repoyu kendi makinesinde/sunucusunda
docker-compose ile ayağa kaldırır ve kendi API key'lerini (Claude, exchange, haber
servisleri) kendisi sağlar ("bring your own keys").

---

## 2. Yüksek Seviye Mimari Diyagramı

```
┌─────────────────────────────────────────────────────────────────────┐
│                          React Frontend                                │
│  ┌──────────────────┐        ┌──────────────────────────────────┐   │
│  │  Chart View        │        │  Chat / Analysis Panel             │   │
│  │  (lightweight-     │        │  - Pair sorgusu                    │   │
│  │   charts)          │        │  - Agent çıktıları (TA/News/Risk)  │   │
│  │  - OHLCV candles   │        │  - Manuel trade giriş/çıkış formu  │   │
│  │  - İndikatör       │        │  - Geçmiş analiz & trade listesi   │   │
│  │    overlay'leri    │        │                                     │   │
│  │  - Annotation'lar  │        │                                     │   │
│  └──────────────────┘        └──────────────────────────────────┘   │
└────────────────────────────────┬──────────────────────────────────────┘
                                  │ REST (HTTPS)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     .NET API (ASP.NET Core)                           │
│                     -- Tek veri otoritesi --                          │
│                                                                         │
│  Controllers:                                                          │
│   - AnalysisController   → AI Service'e proxy + sonucu DB'ye kaydeder │
│   - TradeController       → manuel trade CRUD (entry/exit)            │
│   - PortfolioController   → bakiye, performans metrikleri             │
│   - PairController        → desteklenen pariteler, ayarlar            │
│                                                                         │
│  Domain / Entities:                                                    │
│   - Trade, Analysis, Pair, UserSettings                               │
│                                                                         │
│  Repository Layer → PostgreSQL                                        │
└──────────────────┬──────────────────────────────────┬─────────────────┘
                    │ HTTP (internal)                  │
                    ▼                                  ▼
┌─────────────────────────────────────────┐   ┌──────────────────────┐
│        Python AI Service (FastAPI)        │   │   PostgreSQL          │
│        -- Stateless --                    │   │   (Docker volume)     │
│                                            │   │                       │
│  Endpoint: POST /analyze                  │   │  Tablolar:            │
│   { symbol, timeframe, balance, risk_pct }│   │   - trades            │
│                                            │   │   - analyses          │
│  ┌──────────────────────────────────────┐│   │   - pairs             │
│  │     CrewAI Orchestration               ││   │   - user_settings     │
│  │                                         ││   └──────────────────────┘
│  │   ┌─────────────┐                     ││
│  │   │ Data Agent   │ (önce çalışır)      ││
│  │   └──────┬──────┘                     ││
│  │          │ (OHLCV + context)           ││
│  │   ┌──────┴───────┬──────────────┐     ││
│  │   ▼               ▼              ▼     ││
│  │ ┌─────────┐ ┌──────────┐  ┌──────────┐││
│  │ │TA Agent │ │News Agent│  │ (paralel) │││
│  │ └────┬────┘ └────┬─────┘  └──────────┘││
│  │      │           │                     ││
│  │      └─────┬─────┘                     ││
│  │             ▼                          ││
│  │      ┌────────────┐                    ││
│  │      │ Risk Agent  │ (TA çıktısına      ││
│  │      │             │  bağımlı)          ││
│  │      └──────┬──────┘                    ││
│  │             ▼                          ││
│  │   ┌────────────────────┐               ││
│  │   │ Orchestrator/       │               ││
│  │   │ Synthesis Agent     │               ││
│  │   └──────────┬──────────┘               ││
│  └──────────────┼──────────────────────────┘│
│                  │ MCP tool calls             │
│                  ▼                            │
│  ┌──────────────────────────────────────┐   │
│  │       İç MCP Server (Python)           │   │
│  │                                         │   │
│  │  Data Tools                            │   │
│  │   - get_ohlcv(symbol, tf, limit)       │   │
│  │     → ccxt → Binance API               │   │
│  │                                         │   │
│  │  Indicator Tools                       │   │
│  │   - calculate_indicator(...)            │   │
│  │     → pandas-ta                        │   │
│  │   - detect_divergence(...)             │   │
│  │   - get_support_resistance(...)        │   │
│  │   - get_volatility_metrics(...)        │   │
│  │     (ATR bazlı)                        │   │
│  │                                         │   │
│  │  News Tools                            │   │
│  │   - get_pair_news(symbol)              │   │
│  │     → CryptoPanic API (opsiyonel key)  │   │
│  │   - get_market_news(topic)             │   │
│  │     → web search (fallback / default)  │   │
│  └──────────────────────────────────────┘   │
└───────────────────────────────────────────────┘
```

---

## 3. Katmanların Sorumlulukları

### 3.1 React Frontend

- **Chart View**: Binance'den çekilen OHLCV verisini `lightweight-charts` ile candlestick
  olarak render eder. Agent'ların ürettiği indikatör değerlerini (RSI, MACD, Bollinger
  Bands vb.) overlay/sub-pane olarak gösterir. Orchestrator'ın işaret ettiği
  divergence/support-resistance noktalarını annotation olarak çizer.
- **Chat / Analysis Panel**: Kullanıcı bir parite (örn. `BTC/USDT`) ve opsiyonel
  parametreler (bakiye, risk yüzdesi) girer. `.NET API` üzerinden analiz isteği
  tetiklenir, sonuç agent bazında (Data, TA, News, Risk, Orchestrator özeti) ayrı ayrı
  ve nihai sentez olarak gösterilir.
- **Trade Formu**: Kullanıcı, önerilen bir analizi "uyguladım" diyerek manuel giriş
  bilgisi (entry price, miktar, yön — long/short, stop-loss, take-profit) girer. Pozisyon
  kapandığında yine manuel olarak exit bilgisi (exit price, tarih) girilir.
- **Geçmiş / Performans**: `.NET API`'den gelen trade listesini ve özet metrikleri
  (toplam işlem, kazanan/kaybeden oranı, net getiri) gösterir.

Frontend, **yalnızca `.NET API` ile konuşur**; Python AI Service'e veya MCP server'a
doğrudan erişimi yoktur.

### 3.2 .NET API (ASP.NET Core) — Tek Veri Otoritesi

Bu katman projenin "iskeleti"dir: tüm kalıcı veri buradan geçer, iş kuralları burada
uygulanır. Python AI Service tamamen stateless olduğu için, analiz sonuçlarının
kaydedilmesi, trade lifecycle yönetimi ve performans hesaplamaları `.NET API`'nin
sorumluluğundadır.

**Sorumluluklar:**

- Kullanıcıdan gelen analiz isteğini doğrular (parite geçerli mi, bakiye/risk yüzdesi
  mantıklı mı) ve Python AI Service'e forward eder.
- AI Service'ten dönen analiz sonucunu `analyses` tablosuna kaydeder (geçmiş analiz
  takibi için — "geçen hafta BTC için ne demiştin" sorgusunu mümkün kılar).
- Manuel trade kayıtlarını (`trades` tablosu) yönetir: oluşturma (entry), güncelleme
  (exit), silme.
- Kapanan trade'ler için kar/zarar (PnL) hesaplar (entry/exit price, miktar, yön
  bazında).
- Portföy/performans özetini hesaplar: toplam işlem sayısı, kazanan/kaybeden oranı,
  net getiri (mutlak ve yüzde).
- Kullanıcı ayarlarını (`user_settings`) tutar: varsayılan risk yüzdesi, bakiye, takip
  edilen pariteler.

**Mimari yaklaşım:** Onion/Clean Architecture (kullanıcının önceki E-Commerce
projesindeki gibi — CQRS/MediatR opsiyonel, projenin boyutuna göre basitleştirilebilir
ama katman ayrımı korunur: `Domain`, `Application`, `Infrastructure`, `API`).

### 3.3 Python AI Service (FastAPI + CrewAI) — Stateless Akıl Katmanı

Bu servis, **kendi veritabanına yazmaz**. Görevi: bir analiz isteği almak, multi-agent
pipeline'ı çalıştırmak, yapılandırılmış bir sonuç döndürmek.

**Endpoint:**

```
POST /analyze
{
  "symbol": "BTC/USDT",
  "timeframe": "4h",
  "balance": 1000.0,
  "risk_percentage": 2.0
}
```

**Yanıt (özet şema):**

```json
{
  "symbol": "BTC/USDT",
  "timestamp": "...",
  "agents": {
    "data": { ... ham OHLCV özeti ... },
    "technical_analysis": {
      "sentiment": "bullish | bearish | neutral",
      "sentiment_score": 0.0,
      "indicators": { "rsi": 28.4, "macd": {...}, ... },
      "divergence": [...],
      "support_resistance": [...]
    },
    "news": {
      "sentiment": "bullish | bearish | neutral",
      "sentiment_score": 0.0,
      "risk_threshold": "low | medium | high",
      "key_factors": ["..."]
    },
    "risk": {
      "sentiment": "...",
      "risk_threshold": "low | medium | high",
      "position_size": 0.0,
      "suggested_leverage": "1x-3x",
      "stop_loss": 0.0,
      "take_profit": 0.0
    }
  },
  "synthesis": {
    "overall_sentiment": "bullish | bearish | neutral",
    "summary": "...",
    "annotations": [ ... chart üzerinde gösterilecek noktalar ... ]
  }
}
```

Agent'ların standart çıktı şemaları (`sentiment`, `sentiment_score`, `risk_threshold`
alanları her agent'ta ortak) `agents.md` dosyasında detaylandırılır.

### 3.4 İç MCP Server (Python)

AI Service'in agent'ları, dış dünyaya (Binance, haber kaynakları) doğrudan erişmek
yerine bu MCP server üzerinden tool çağrısı yapar. Bu ayrım şu faydaları sağlar:

- **Test edilebilirlik**: Tool'lar agent mantığından bağımsız test edilebilir.
- **Yeniden kullanılabilirlik**: Aynı tool'lar ileride farklı bir agent framework'üne
  geçilse de korunur.
- **Genişletilebilirlik**: İleri versiyonlarda yeni veri kaynakları (örn. on-chain
  veri, farklı borsalar) yeni tool olarak eklenir, agent mantığı değişmez.

Tool listesi ve şemaları `mcp_tools.md` dosyasında detaylandırılır.

---

## 4. Agent Akışı (Execution Flow)

CrewAI ile **kısmen paralel, kısmen sıralı** bir akış kurgulanır:

```
1. Data Agent çalışır (ilk adım, herkes buna bağımlı)
       │
       ▼
2. Technical Analysis Agent  ──┐
   News Agent                  ├── PARALEL çalışır (ikisi de Data Agent
                                │   çıktısına bağımlı, birbirine bağımlı değil)
       │                        │
       └────────────┬──────────┘
                     ▼
3. Risk Agent (TA Agent'ın volatilite/seviye çıktısına bağımlı,
   News Agent'ın risk_threshold'unu da girdi olarak alır)
                     │
                     ▼
4. Orchestrator / Synthesis Agent
   (tüm agent çıktılarını birleştirir, nihai özet ve
    chart annotation'larını üretir)
```

**Neden bu sıralama:**

- Data Agent'sız hiçbir agent çalışamaz (hepsi OHLCV verisine ihtiyaç duyar) → her zaman
  ilk adım.
- TA Agent ve News Agent birbirinden bağımsız bilgi kaynaklarıdır (biri fiyat/indikatör,
  diğeri haber/sentiment) → paralel çalıştırılarak toplam süre kısaltılır.
- Risk Agent, "ne kadar pozisyon açılmalı / kaldıraç ne olmalı" kararını verirken hem
  teknik volatiliteyi (TA Agent'tan ATR/destek-direnç) hem de haber kaynaklı riski (News
  Agent'tan risk_threshold) girdi olarak kullanır → bu ikisinden sonra çalışmalıdır.
- Orchestrator, en son tüm görüşleri sentezler.

CrewAI'de bu, `Process.sequential` ile birlikte TA ve News task'larının aynı "seviyede"
tanımlanıp Risk task'ının her ikisine de `context` olarak bağlanmasıyla modellenir (CrewAI
otomatik paralelleştirme yapmaz, ama bağımsız task'lar arasında veri akışı bu şekilde
kurgulanabilir; gerçek paralel çalıştırma gerekiyorsa `asyncio` ile TA ve News
agent'larının LLM çağrıları eşzamanlı tetiklenip sonuçlar Risk Agent'a birlikte
verilebilir — implementasyon detayı `agents.md`'de ele alınacaktır).

---

## 5. Veri Akışı Örneği (Uçtan Uca Senaryo)

1. Kullanıcı frontend'de "BTC/USDT, 4 saatlik, bakiye: 1000 USDT, risk: %2" girip
   "Analiz Et" butonuna basar.
2. Frontend → `.NET API`: `POST /api/analysis` isteği gider.
3. `.NET API` isteği doğrular, parite ve kullanıcı ayarlarını kontrol eder, Python AI
   Service'e `POST /analyze` isteğini forward eder.
4. AI Service'te CrewAI pipeline tetiklenir:
   - Data Agent → İç MCP `get_ohlcv("BTC/USDT", "4h", 200)` çağırır → ccxt → Binance'den
     200 mumluk veri döner.
   - TA Agent → İç MCP `calculate_indicator(...)` ile RSI, MACD, Bollinger, ATR
     hesaplatır, `detect_divergence` ve `get_support_resistance` çağırır → standart
     formatta sentiment/skor üretir.
   - News Agent (paralel) → İç MCP `get_pair_news("BTC")` (CryptoPanic, eğer key
     verilmişse) ve `get_market_news("crypto macro")` (web search fallback) çağırır →
     sentiment/skor/risk_threshold üretir.
   - Risk Agent → TA'nın ATR/seviye verisi ve News'in risk_threshold'unu girdi alır,
     bakiye + risk yüzdesine göre pozisyon büyüklüğü, önerilen kaldıraç aralığı,
     stop-loss/take-profit seviyeleri hesaplar.
   - Orchestrator → tüm çıktıları birleştirip genel sentiment ve özet metni üretir,
     chart'ta gösterilecek annotation listesini hazırlar.
5. AI Service, yapılandırılmış JSON sonucu `.NET API`'ye döner.
6. `.NET API` sonucu `analyses` tablosuna kaydeder ve frontend'e döner.
7. Frontend: chat panelinde agent bazlı + sentez sonuçları gösterilir, chart üzerinde
   indikatörler ve annotation'lar render edilir.
8. Kullanıcı öneriyi beğenirse "İşleme Gir" formunu doldurur → `.NET API`:
   `POST /api/trades` ile `trades` tablosuna entry kaydı düşer (durum: `OPEN`).
9. Pozisyon kapandığında kullanıcı `PUT /api/trades/{id}/close` ile exit bilgisini
   girer → `.NET API` PnL hesaplar, durumu `CLOSED` yapar.
10. Portföy sayfası, `.NET API`'den gelen toplam işlem/kazanma oranı/net getiri
    metriklerini gösterir.

---

## 6. Deployment ve Dağıtım Modeli

- **Hosted/SaaS deployment yoktur.** Proje GitHub'da açık kaynak olarak paylaşılır.
- Tüm sistem `docker-compose` ile tek komutla ayağa kalkar:
  - `frontend` (React, Vite build + nginx veya dev server)
  - `api` (.NET API)
  - `ai-service` (Python FastAPI + CrewAI + İç MCP server, aynı konteynerde veya ayrı
    sidecar olarak)
  - `db` (PostgreSQL, named volume ile kalıcı veri)
- Kullanıcı, kendi `.env` dosyasında şu key'leri sağlar:
  - `ANTHROPIC_API_KEY` (Claude API — agent'ların LLM çağrıları için)
  - `BINANCE_API_KEY` / `BINANCE_API_SECRET` (read-only, sadece veri çekmek için —
    opsiyonel, public endpoint'ler API key olmadan da OHLCV verir; kullanıcı kendi
    rate-limit'ini yükseltmek isterse ekler)
  - `CRYPTOPANIC_API_KEY` (opsiyonel — verilmezse News Agent web search'e düşer)
- Detaylı kurulum adımları `setup.md` dosyasında ele alınacaktır.

---

## 7. Kapsam Dışı (Gelecek Versiyonlar)

Aşağıdaki maddeler bilinçli olarak v1 kapsamı dışında tutulmuştur, ancak mimari bunlara
kapalı değildir:

- Exchange API üzerinden otomatik trade açma/kapatma ve pozisyon takibi (Position
  Monitor servisi).
- Multi-tenant kullanıcı sistemi, auth/authorization, hosted SaaS.
- Dış (public) MCP server — sistemin "tek prompt ile Claude'a eklenebilir" hale
  getirilmesi. Mimari buna uygun (AI Service zaten stateless, MCP-tool şeklinde
  tools.md'de tanımlı), ancak implementasyon yapılmayacaktır.
- Otomatik sentiment fine-tuning / kendi eğitilen modellerin entegrasyonu (ayrı bir
  proje olarak planlanmıştır).

---

## 8. Teknoloji Özeti

| Katman              | Teknoloji                                      |
|---------------------|-------------------------------------------------|
| Frontend            | React, lightweight-charts (TradingView OSS)     |
| API Layer           | ASP.NET Core (.NET), PostgreSQL (EF Core)       |
| AI Service          | Python, FastAPI, CrewAI                         |
| İç MCP Server       | Python, MCP SDK                                 |
| Veri Kaynağı        | ccxt (Binance), pandas-ta, CryptoPanic / web search |
| Veritabanı          | PostgreSQL (Docker volume)                      |
| Dağıtım             | docker-compose (yerel/self-hosted)              |