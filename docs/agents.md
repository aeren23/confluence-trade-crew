# Agents

## 1. Genel Bakış

Bu doküman, Python AI Service içinde CrewAI ile orkestre edilen agent'ların rollerini,
girdi/çıktı şemalarını, birbirleriyle olan bağımlılıklarını ve kullandıkları MCP
tool'larını tanımlar. Tüm agent'lar `architecture.md`'de tanımlanan İç MCP Server
üzerinden veri/hesaplama tool'larına erişir.

**Ortak tasarım ilkeleri:**

- Her agent'ın çıktısı **standart bir zarf (envelope)** içinde döner: `sentiment`,
  `sentiment_score`, `confidence` alanları her agent'ta ortak bulunur, ardından
  agent'a özel alanlar gelir. Bu, Orchestrator'ın farklı agent çıktılarını tek bir
  mantıkla işleyebilmesini sağlar.
- Hiçbir agent **otonom trade kararı vermez**; hepsi "bilgi/değerlendirme" üretir,
  nihai sentez Orchestrator'da, nihai karar kullanıcıda.
- Agent'lar MCP tool'larını **salt okunur** kullanır (veri çekme, hesaplama) — yazma
  (trade kaydı vb.) bu agent pipeline'ının sorumluluğunda değildir, `.NET API`
  katmanındadır.

---

## 2. Ortak Çıktı Zarfı (Output Envelope)

Her agent'ın (Orchestrator hariç) çıktısı şu temel alanları içerir:

```json
{
  "agent": "data | technical_analysis | news | risk",
  "sentiment": "bullish | bearish | neutral",
  "sentiment_score": -1.0,
  "confidence": 0.0,
  "summary": "kısa, insan tarafından okunabilir özet (1-2 cümle)",
  "details": { }
}
```

- **`sentiment_score`**: -1.0 (tamamen bearish) ile +1.0 (tamamen bullish) arası.
  `neutral` genellikle -0.2 ile +0.2 aralığına denk gelir.
- **`confidence`**: 0.0-1.0 arası, agent'ın kendi çıktısına ne kadar güvendiği (örn.
  veri yetersizse veya çelişkili sinyaller varsa düşük confidence).
- **`details`**: agent'a özel alanlar — aşağıda her agent için ayrıca tanımlanır.

---

## 3. Data Agent

### Rol

Pipeline'ın ilk adımı. Kullanıcının istediği parite ve zaman dilimi için ham piyasa
verisini (OHLCV) çeker, temel veri kalitesi kontrolü yapar ve diğer agent'ların
kullanacağı ortak veri bağlamını (data context) hazırlar.

### Input

```json
{
  "symbol": "BTC/USDT",
  "timeframe": "4h",
  "limit": 200
}
```

### Kullandığı MCP Tool'lar

- `get_ohlcv(symbol, timeframe, limit)` — Binance'den OHLCV verisi (ccxt)

### Output

```json
{
  "agent": "data",
  "sentiment": "neutral",
  "sentiment_score": 0.0,
  "confidence": 1.0,
  "summary": "200 mumluk 4 saatlik BTC/USDT verisi başarıyla alındı, son fiyat: 67,420",
  "details": {
    "symbol": "BTC/USDT",
    "timeframe": "4h",
    "candle_count": 200,
    "latest_price": 67420.0,
    "latest_timestamp": "2026-06-13T08:00:00Z",
    "data_quality": "ok | gap_detected | insufficient_data",
    "ohlcv_ref": "agent pipeline içinde paylaşılan referans (DataFrame/JSON)"
  }
}
```

> **Not**: `sentiment` ve `sentiment_score` Data Agent için anlamsız olduğundan
> sabit `neutral` / `0.0` döner — ortak zarf formatına uyum için bulunur, Orchestrator
> bu agent'ın skorunu sentez hesaplamasına dahil etmez.

### Bağımlılık

Yok — pipeline'ın ilk adımı. Diğer tüm agent'lar bu agent'ın `details.ohlcv_ref`
çıktısına bağımlıdır.

### Hata Durumları

- `data_quality: insufficient_data` dönerse (örn. yeni listelenen bir coin, 200 mum
  yoksa), Orchestrator nihai sonuçta bunu kullanıcıya açıkça belirtir ve diğer
  agent'ların `confidence` değerleri otomatik olarak düşürülür.

---

## 4. Technical Analysis Agent

### Rol

Data Agent'tan gelen OHLCV verisi üzerinde teknik indikatörleri hesaplatır, trend ve
momentum durumunu yorumlar, divergence (uyumsuzluk) ve destek/direnç seviyelerini
tespit eder.

### Input

```json
{
  "ohlcv_ref": "<Data Agent'tan gelen referans>",
  "symbol": "BTC/USDT",
  "indicators": ["rsi", "macd", "bollinger", "ema_20", "ema_50", "adx", "atr"]
}
```

> `indicators` listesi varsayılan bir set içerir; agent, piyasa koşuluna göre ek
> indikatör çağırabilir (örn. trend belirsizse ADX'e ek olarak ADX süresi/yön
> değişimi).

### Kullandığı MCP Tool'lar

- `calculate_indicator(ohlcv_ref, indicator_name, params)` — pandas-ta tabanlı
  hesaplama (her indikatör için ayrı çağrı veya toplu çağrı)
- `detect_divergence(ohlcv_ref, indicator_data)` — fiyat ile indikatör arasında
  bullish/bearish divergence tespiti
- `get_support_resistance(ohlcv_ref)` — yerel min/maks ve hacim bazlı seviyeler

### Output

```json
{
  "agent": "technical_analysis",
  "sentiment": "bullish",
  "sentiment_score": 0.45,
  "confidence": 0.8,
  "summary": "RSI aşırı satım bölgesinden dönüyor, fiyat EMA20'nin üzerine geçti, ancak ADX trend gücünün henüz zayıf olduğunu gösteriyor.",
  "details": {
    "trend": {
      "direction": "up | down | sideways",
      "strength": "weak | moderate | strong",
      "adx": 18.4
    },
    "momentum": {
      "rsi": 38.2,
      "rsi_state": "oversold | neutral | overbought",
      "macd": {
        "value": -12.3,
        "signal": -18.1,
        "histogram": 5.8,
        "cross": "bullish_cross | bearish_cross | none"
      }
    },
    "volatility": {
      "atr": 850.0,
      "bollinger": {
        "upper": 68900.0,
        "middle": 67200.0,
        "lower": 65500.0,
        "price_position": "inside | upper_band | lower_band"
      }
    },
    "divergence": [
      {
        "type": "bullish_divergence",
        "indicator": "rsi",
        "description": "Fiyat düşük dip yaparken RSI yükselen dip yaptı"
      }
    ],
    "support_resistance": {
      "support_levels": [65500.0, 64200.0],
      "resistance_levels": [68900.0, 70000.0]
    }
  }
}
```

### Bağımlılık

Data Agent'a bağımlı. News Agent ile **paralel** çalışır (birbirine bağımlı değil).
Risk Agent bu agent'ın `details.volatility` ve `details.support_resistance`
çıktılarına bağımlıdır.

---

## 5. News Agent

### Rol

İki katmanlı haber/sentiment analizi yapar: (1) sorgulanan paritenin kendisine özel
haberler, (2) genel kripto piyasasını etkileyen makro gelişmeler. Çıktısı, hem genel
sentiment hem de bir **risk eşiği** (`risk_threshold`) içerir.

### Input

```json
{
  "symbol": "BTC/USDT",
  "base_asset": "BTC"
}
```

### Kullandığı MCP Tool'lar

- `get_pair_news(symbol)` — CryptoPanic API (kullanıcı key sağlamışsa); sağlanmamışsa
  bu adım atlanır ve sadece `get_market_news` kullanılır
- `get_market_news(topic)` — web search ile global makro/regülasyon haberleri
  (örn. "crypto regulation", "Fed interest rate crypto", "Bitcoin ETF")

### Output

```json
{
  "agent": "news",
  "sentiment": "bearish",
  "sentiment_score": -0.3,
  "confidence": 0.6,
  "summary": "Genel piyasada Fed faiz kararı öncesi temkinli bekleyiş var; BTC'ye özel olumsuz/olumlu büyük bir haber yok.",
  "details": {
    "risk_threshold": "low | medium | high",
    "pair_specific": {
      "source": "cryptopanic | unavailable",
      "key_factors": [
        "Büyük bir borsa listing/delisting haberi yok"
      ],
      "sentiment_score": -0.1
    },
    "macro": {
      "source": "web_search",
      "key_factors": [
        "Fed faiz kararı 2 gün içinde bekleniyor, piyasa risk-off modda"
      ],
      "sentiment_score": -0.4
    }
  }
}
```

- **`risk_threshold`**: Risk Agent'a doğrudan girdi olarak gider. Örn. yaklaşan büyük
  bir makro etkinlik (FOMC toplantısı, büyük bir hack haberi) varsa `high` döner ve
  Risk Agent pozisyon büyüklüğünü/kaldıraç önerisini buna göre daraltır.
- **`pair_specific.sentiment_score`** ve **`macro.sentiment_score`**'un ağırlıklı
  ortalaması üst seviye `sentiment_score`'u oluşturur (varsayılan ağırlık: %60
  pair-specific, %40 macro — agent prompt'unda parametrik tutulabilir).

### Bağımlılık

Data Agent'a bağımlı (sadece `symbol`/`base_asset` bilgisi için, OHLCV verisine
ihtiyacı yoktur). Technical Analysis Agent ile **paralel** çalışır. Risk Agent bu
agent'ın `details.risk_threshold` çıktısına bağımlıdır.

### Hata/Eksik Veri Durumları

- CryptoPanic key sağlanmamışsa: `pair_specific.source: "unavailable"`,
  `pair_specific.key_factors: []`, `pair_specific.sentiment_score: 0.0` — yalnızca
  macro katman değerlendirilir, `confidence` düşürülür (örn. 0.6 → 0.4).

---

## 6. Risk Agent

### Rol

Technical Analysis Agent'ın volatilite/seviye çıktısı ile News Agent'ın risk
eşiğini birleştirir; kullanıcının bakiyesi ve risk toleransına göre **somut, sayısal
risk önerileri** üretir: pozisyon büyüklüğü, önerilen kaldıraç aralığı, stop-loss ve
take-profit seviyeleri.

### Input

```json
{
  "balance": 1000.0,
  "risk_percentage": 2.0,
  "ta_volatility": "<TA Agent'tan details.volatility>",
  "ta_support_resistance": "<TA Agent'tan details.support_resistance>",
  "ta_sentiment_score": 0.45,
  "news_risk_threshold": "medium",
  "news_sentiment_score": -0.3,
  "current_price": 67420.0
}
```

### Kullandığı MCP Tool'lar

- `get_volatility_metrics(ohlcv_ref)` — gerekirse ek/doğrulayıcı ATR hesaplaması
  (TA Agent'ın çıktısı yetersizse veya farklı bir zaman dilimi için yeniden
  hesaplama gerekiyorsa)

> Risk Agent çoğunlukla TA ve News Agent'ların çıktıları üzerinde **deterministik
> hesaplama** yapar (LLM çağrısı, hesaplanan değerleri yorumlamak ve gerekçelendirmek
> içindir — hesaplamanın kendisi Python tarafında, prompt içinde değil, kod ile
> yapılır).

### Hesaplama Mantığı (Özet)

1. **Pozisyon büyüklüğü**: `risk_amount = balance * (risk_percentage / 100)`.
   Stop-loss mesafesi (ATR bazlı veya support/resistance bazlı) ile birleştirilerek
   `position_size = risk_amount / stop_loss_distance` hesaplanır.
2. **Stop-loss / Take-profit önerisi**: TA Agent'ın `support_resistance` seviyeleri
   ve ATR çarpanı (örn. `1.5 * ATR`) kullanılarak öneri seviyeleri belirlenir.
   Risk/ödül oranı (örn. minimum 1:1.5) kontrol edilir.
3. **Kaldıraç önerisi**: Volatilite (ATR'nin fiyata oranı) ve `news_risk_threshold`
   birlikte değerlendirilir:
   - Yüksek volatilite + `risk_threshold: high` → düşük kaldıraç aralığı (örn. 1x-2x)
   - Düşük volatilite + `risk_threshold: low` → daha geniş aralık (örn. 2x-5x)
   - Kaldıraç önerisi her zaman bir **aralık** olarak verilir, tek bir sayı değil;
     nihai karar kullanıcıya aittir.
4. **Genel risk sentiment'i**: TA ve News'in sentiment skorları, Risk Agent'ın kendi
   "bu pozisyon ne kadar riskli" değerlendirmesiyle birleştirilir — bu agent'ın
   `sentiment_score`'u, "trade fırsatı ne kadar iyi" değil, "**şu an risk almak ne
   kadar uygun**" eksenindedir (yüksek pozitif = "şartlar risk almaya uygun").

### Output

```json
{
  "agent": "risk",
  "sentiment": "neutral",
  "sentiment_score": 0.1,
  "confidence": 0.7,
  "summary": "Volatilite orta seviyede, makro risk eşiği orta; küçük-orta pozisyon ve düşük-orta kaldıraç önerilir.",
  "details": {
    "position_sizing": {
      "balance": 1000.0,
      "risk_percentage": 2.0,
      "risk_amount_usdt": 20.0,
      "suggested_position_size_usdt": 285.7,
      "suggested_position_size_base": 0.00424
    },
    "leverage": {
      "suggested_range": "1x-3x",
      "rationale": "Orta volatilite (ATR/fiyat oranı %1.26) ve orta makro risk nedeniyle muhafazakar aralık önerildi"
    },
    "levels": {
      "entry_reference": 67420.0,
      "stop_loss": 65950.0,
      "take_profit": 69800.0,
      "risk_reward_ratio": 1.62
    },
    "overall_risk_assessment": "medium"
  }
}
```

### Bağımlılık

Technical Analysis Agent **ve** News Agent'ın çıktılarına bağımlı. Bu nedenle
pipeline'da TA ve News'in **her ikisi de tamamlanmadan** çalışamaz — paralel
çalışan iki task'ın "join" noktasıdır.

---

## 7. Orchestrator / Synthesis Agent

### Rol

Pipeline'ın son adımı. Data, Technical Analysis, News ve Risk agent'larının tüm
çıktılarını alır; bunları birleştirip kullanıcıya sunulacak **nihai, insan
tarafından okunabilir bir sentez** üretir. Ayrıca frontend'in chart üzerinde
göstereceği annotation listesini hazırlar.

### Input

Diğer 4 agent'ın tam çıktıları (yukarıdaki şemalar).

### Kullandığı MCP Tool'lar

Yok — bu agent saf sentez/yorumlama yapar, dış veri/hesaplama tool'u çağırmaz.

### Sentez Mantığı (Özet)

1. **Genel sentiment**: TA Agent ve News Agent'ın `sentiment_score`'larının
   ağırlıklı ortalaması (varsayılan ağırlık: TA %60, News %40 — teknik sinyaller
   kısa-orta vade için daha doğrudan, haber sentiment'i bağlam sağlar).
   - Eğer TA ve News **çelişiyorsa** (örn. TA bullish, News bearish ve
     `risk_threshold: high`), Orchestrator bu çelişkiyi **açıkça** belirtir ve genel
     sentiment'i `neutral`'a yakın tutar, `confidence`'ı düşürür.
2. **Risk Agent'ın çıktısı** genel sentiment hesaplamasına dahil edilmez (Risk
   Agent'ın skoru "risk alma uygunluğu" ekseninde, "yön" ekseninde değil) — ancak
   nihai özet metninde Risk Agent'ın `overall_risk_assessment`'ı ve
   `leverage.suggested_range`'i ayrıca belirtilir.
3. **Annotation listesi**: TA Agent'ın `support_resistance` seviyeleri ve
   `divergence` noktaları, Risk Agent'ın `stop_loss`/`take_profit` seviyeleri,
   chart üzerinde çizilecek yatay çizgiler/işaretler olarak hazırlanır.

### Output

```json
{
  "synthesis": {
    "overall_sentiment": "bullish",
    "overall_sentiment_score": 0.21,
    "confidence": 0.7,
    "conflicts_detected": false,
    "summary": "Teknik göstergeler kısa vadede ılımlı yükseliş sinyali veriyor (RSI dönüşü, EMA20 üzeri), ancak yaklaşan Fed kararı nedeniyle makro ortam temkinli. Risk değerlendirmesi orta seviyede; önerilen pozisyon büyüklüğü ve 1x-3x kaldıraç aralığı bu duruma göre belirlendi. Nihai karar size ait.",
    "agent_summaries": {
      "technical_analysis": "RSI aşırı satım bölgesinden dönüyor, fiyat EMA20'nin üzerine geçti...",
      "news": "Genel piyasada Fed faiz kararı öncesi temkinli bekleyiş var...",
      "risk": "Volatilite orta seviyede, makro risk eşiği orta..."
    }
  },
  "annotations": [
    {
      "type": "horizontal_line",
      "label": "Direnç",
      "value": 68900.0,
      "style": "resistance"
    },
    {
      "type": "horizontal_line",
      "label": "Destek",
      "value": 65500.0,
      "style": "support"
    },
    {
      "type": "horizontal_line",
      "label": "Önerilen Stop-Loss",
      "value": 65950.0,
      "style": "stop_loss"
    },
    {
      "type": "horizontal_line",
      "label": "Önerilen Take-Profit",
      "value": 69800.0,
      "style": "take_profit"
    },
    {
      "type": "marker",
      "label": "Bullish Divergence (RSI)",
      "indicator": "rsi",
      "style": "divergence_bullish"
    }
  ]
}
```

### Bağımlılık

Data, Technical Analysis, News ve Risk agent'larının **tamamına** bağımlı —
pipeline'ın son adımı.

---

## 8. Pipeline Akış Diyagramı (Özet)

```
[Data Agent]
     │
     ├──────────────┬──────────────┐
     ▼               ▼              │
[TA Agent]      [News Agent]        │
     │               │              │
     └──────┬────────┘              │
            ▼                       │
      [Risk Agent]                  │
            │                       │
            └──────────┬────────────┘
                        ▼
            [Orchestrator/Synthesis]
                        │
                        ▼
                  Nihai JSON yanıt
```

---

## 9. CrewAI Implementasyon Notu

CrewAI'nin `Process.sequential` modunda, task'lar tanım sırasına göre çalışır ancak
her task'a önceki task'ların çıktıları `context` parametresiyle verilebilir. Bu
projede:

- `data_task` → bağımsız, ilk çalışır.
- `ta_task` ve `news_task` → her ikisi de `context=[data_task]` ile tanımlanır.
  CrewAI bunları sıralı çalıştırsa da (sequential mod), birbirlerinin çıktısına
  bağımlı olmadıkları için **gerçek paralel çalıştırma** isteniyorsa, bu iki agent'ın
  LLM çağrıları `asyncio.gather` ile FastAPI endpoint içinde manuel olarak eşzamanlı
  tetiklenebilir, sonuçlar birlikte `risk_task`'a girdi olarak verilir.
- `risk_task` → `context=[ta_task, news_task]`.
- `synthesis_task` → `context=[data_task, ta_task, news_task, risk_task]`.

Bu yaklaşım, CrewAI'nin agent/task soyutlamasını korurken, performans için kritik
olan TA/News paralelliğini FastAPI seviyesinde (orkestrasyon kodu içinde) sağlar.