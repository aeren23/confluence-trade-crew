# MCP Tools — İç MCP Server

## 1. Genel Bakış

Bu doküman, Python AI Service içindeki agent'ların (CrewAI) kullandığı **İç MCP
Server**'ın tool tanımlarını içerir. Server, `architecture.md`'de belirtildiği gibi
**stdio transport** ile çalışır — AI Service tarafından subprocess olarak başlatılır,
agent'lar bu process ile MCP protokolü üzerinden konuşur.

Tool'lar üç kategoriye ayrılır:

- **Data Tools** — borsa verisi (ccxt → Binance)
- **Indicator Tools** — teknik indikatör hesaplama ve analiz (pandas-ta + custom logic)
- **News Tools** — haber/sentiment kaynakları (CryptoPanic + web search)

Her tool tanımı şu bilgileri içerir: amaç, input şeması (JSON Schema benzeri),
output şeması, hata durumları ve hangi agent(lar) tarafından kullanıldığı
(`agents.md` ile çapraz referans).

---

## 2. Ortak Kurallar

- Tüm sayısal fiyat/hacim değerleri `float` olarak döner, birim her zaman quote
  asset (örn. `USDT`) cinsindendir.
- Zaman damgaları ISO 8601 formatında (`"2026-06-13T08:00:00Z"`) döner.
- `ohlcv_ref` alanı: `get_ohlcv` tool'unun döndürdüğü, sonraki tool çağrılarında
  (`calculate_indicator`, `detect_divergence`, `get_support_resistance`,
  `get_volatility_metrics`) referans olarak geçilen bir tanımlayıcıdır. İç MCP
  server, bir analiz oturumu sırasında bu referansa karşılık gelen OHLCV verisini
  bellekte (in-memory cache) tutar; oturum bitiminde temizlenir. Bu, aynı 200
  mumluk veri setinin her tool çağrısında tekrar Binance'den çekilmesini önler.
- Hata durumlarında tool, MCP standart hata formatında (`isError: true` ve açıklayıcı
  `content`) döner; agent bu durumu kendi `confidence` değerine yansıtır
  (`agents.md` § Hata Durumları).

---

## 3. Data Tools

### 3.1 `get_ohlcv`

**Amaç**: Belirtilen parite ve zaman dilimi için OHLCV (Open-High-Low-Close-Volume)
verisini Binance'den çeker.

**Kullanan agent**: Data Agent

**Input Şeması**:

```json
{
  "symbol": "string, örn. 'BTC/USDT' (ccxt formatı)",
  "timeframe": "string, örn. '15m', '1h', '4h', '1d'",
  "limit": "integer, varsayılan 200, maksimum 1000"
}
```

**Output Şeması**:

```json
{
  "ohlcv_ref": "string — sonraki çağrılarda kullanılacak referans ID (örn. UUID)",
  "symbol": "BTC/USDT",
  "timeframe": "4h",
  "candle_count": 200,
  "candles": [
    {
      "timestamp": "2026-06-13T00:00:00Z",
      "open": 67100.0,
      "high": 67550.0,
      "low": 66900.0,
      "close": 67420.0,
      "volume": 1245.32
    }
  ],
  "latest_price": 67420.0,
  "data_quality": "ok | gap_detected | insufficient_data"
}
```

**Notlar**:

- `data_quality: gap_detected` — beklenen mum sayısından az veri döndüyse veya
  ardışık mumlar arasında zaman tutarsızlığı varsa işaretlenir (örn. Binance'in o
  parite için yeterli geçmiş verisi yoksa).
- `data_quality: insufficient_data` — `candle_count < 50` ise (çoğu indikatör için
  minimum eşik) işaretlenir.

**Hata Durumları**:

- Geçersiz `symbol` (Binance'de listelenmeyen parite) → `isError: true`,
  `"Symbol not found on Binance: <symbol>"`
- Binance API rate limit / bağlantı hatası → `isError: true`,
  `"Exchange API error: <detay>"`

---

## 4. Indicator Tools

### 4.1 `calculate_indicator`

**Amaç**: Verilen OHLCV referansı üzerinde belirtilen teknik indikatörü/indikatörleri
hesaplar (pandas-ta tabanlı).

**Kullanan agent**: Technical Analysis Agent

**Input Şeması**:

```json
{
  "ohlcv_ref": "string — get_ohlcv'den dönen referans",
  "indicators": [
    {
      "name": "rsi | macd | bollinger | ema | sma | adx | atr | stochastic",
      "params": {
        "length": "integer, opsiyonel — indikatöre özel parametre (örn. EMA için periyot)"
      }
    }
  ]
}
```

**Desteklenen indikatörler ve varsayılan parametreler**:

| İndikatör | `name` | Varsayılan Parametreler |
|---|---|---|
| RSI | `rsi` | `length: 14` |
| MACD | `macd` | `fast: 12, slow: 26, signal: 9` |
| Bollinger Bands | `bollinger` | `length: 20, std: 2` |
| EMA | `ema` | `length: 20` (TA Agent genellikle 20 ve 50 için iki ayrı çağrı yapar) |
| SMA | `sma` | `length: 50` |
| ADX | `adx` | `length: 14` |
| ATR | `atr` | `length: 14` |
| Stochastic | `stochastic` | `k: 14, d: 3, smooth_k: 3` |

**Output Şeması** (her indikatör için ayrı bir blok, `indicators` listesindeki
sıraya göre):

```json
{
  "ohlcv_ref": "...",
  "results": {
    "rsi": {
      "latest_value": 38.2,
      "series_tail": [42.1, 40.5, 39.0, 38.2],
      "state": "oversold | neutral | overbought"
    },
    "macd": {
      "macd_line": -12.3,
      "signal_line": -18.1,
      "histogram": 5.8,
      "cross": "bullish_cross | bearish_cross | none"
    },
    "bollinger": {
      "upper": 68900.0,
      "middle": 67200.0,
      "lower": 65500.0,
      "price_position": "inside | upper_band | lower_band"
    },
    "ema_20": {
      "latest_value": 67100.0,
      "price_vs_ema": "above | below"
    },
    "adx": {
      "latest_value": 18.4,
      "trend_strength": "weak | moderate | strong"
    },
    "atr": {
      "latest_value": 850.0,
      "atr_pct_of_price": 1.26
    }
  }
}
```

**Notlar**:

- `state`, `cross`, `price_position`, `trend_strength` gibi yorumlayıcı alanlar,
  ham sayısal değerin yanında **kural bazlı** (deterministik eşiklerle) hesaplanır,
  örn. RSI `< 30` → `oversold`, `> 70` → `overbought`. Bu eşikler tool içinde sabit
  kodlanır, agent prompt'unda tekrar yorumlanmasına gerek kalmaz (ama agent isterse
  ham değerleri de kullanabilir).
- ADX `trend_strength` eşikleri: `< 20` → `weak`, `20-40` → `moderate`, `> 40` →
  `strong` (yaygın teknik analiz konvansiyonu).

**Hata Durumları**:

- Bilinmeyen `ohlcv_ref` (cache'te yok veya süresi dolmuş) → `isError: true`,
  `"Unknown ohlcv_ref, call get_ohlcv first"`
- Desteklenmeyen indikatör adı → `isError: true`,
  `"Unsupported indicator: <name>"`
- Yetersiz veri (örn. `length: 50` istenirken sadece 30 mum varsa) → ilgili
  indikatör için `"insufficient_data_for_indicator": true` ile kısmi sonuç döner,
  genel `isError` tetiklenmez.

---

### 4.2 `detect_divergence`

**Amaç**: Fiyat hareketi ile bir momentum indikatörü (varsayılan: RSI, opsiyonel:
MACD) arasındaki bullish/bearish divergence'ları tespit eder.

**Kullanan agent**: Technical Analysis Agent

**Input Şeması**:

```json
{
  "ohlcv_ref": "string",
  "indicator": "rsi | macd",
  "lookback": "integer, varsayılan 50 — kaç mum geriye bakılacağı"
}
```

**Output Şeması**:

```json
{
  "ohlcv_ref": "...",
  "divergences": [
    {
      "type": "bullish_divergence | bearish_divergence",
      "indicator": "rsi",
      "price_points": [
        { "timestamp": "2026-06-10T12:00:00Z", "value": 65200.0 },
        { "timestamp": "2026-06-12T16:00:00Z", "value": 64900.0 }
      ],
      "indicator_points": [
        { "timestamp": "2026-06-10T12:00:00Z", "value": 28.5 },
        { "timestamp": "2026-06-12T16:00:00Z", "value": 31.2 }
      ],
      "description": "Fiyat düşük dip yaparken RSI yükselen dip yaptı (bullish divergence)"
    }
  ]
}
```

**Tespit Mantığı (Özet)**:

- Fiyat serisinde ve indikatör serisinde yerel min/maks noktaları (swing
  high/low) bulunur (basit pencere bazlı pivot tespiti, örn. 5 mumluk pencere).
- **Bullish divergence**: Fiyat daha düşük bir dip yaparken (`price_points[1].value
  < price_points[0].value`), indikatör daha yüksek bir dip yapıyorsa
  (`indicator_points[1].value > indicator_points[0].value`).
- **Bearish divergence**: Fiyat daha yüksek bir tepe yaparken indikatör daha düşük
  bir tepe yapıyorsa (ters mantık).
- En fazla son 2-3 divergence döner (en güncel ve anlamlı olanlar); `lookback`
  penceresi dışındaki pivot noktaları değerlendirmeye alınmaz.

**Hata Durumları**:

- Bilinmeyen `ohlcv_ref` → `isError: true`
- `lookback` mum sayısı yetersizse (pivot tespiti için minimum ~20 mum gerekir) →
  boş `divergences: []` listesi döner, hata değil.

---

### 4.3 `get_support_resistance`

**Amaç**: OHLCV verisi üzerinden anlamlı destek ve direnç seviyelerini tespit eder.

**Kullanan agent**: Technical Analysis Agent

**Input Şeması**:

```json
{
  "ohlcv_ref": "string",
  "method": "swing_points | volume_profile",
  "max_levels": "integer, varsayılan 3"
}
```

**Output Şeması**:

```json
{
  "ohlcv_ref": "...",
  "method_used": "swing_points",
  "support_levels": [65500.0, 64200.0, 62800.0],
  "resistance_levels": [68900.0, 70000.0, 71500.0],
  "current_price": 67420.0,
  "nearest_support": 65500.0,
  "nearest_resistance": 68900.0
}
```

**Tespit Mantığı (Özet)**:

- `swing_points` (varsayılan): Belirlenen pencere içindeki yerel min/maks fiyat
  noktaları gruplandırılır, birbirine yakın seviyeler (örn. `%0.5` tolerans içinde)
  birleştirilir, en çok "dokunulan" (test edilen) seviyeler öncelikli olarak
  döner.
- `volume_profile` (opsiyonel/ileri seviye): Hacim yoğunluğunun en yüksek olduğu
  fiyat bantları seviyeler olarak işaretlenir. v1'de implementasyonu opsiyoneldir;
  tool, `method: "volume_profile"` istenip implementasyon yoksa otomatik olarak
  `swing_points`'e düşer ve `method_used: "swing_points"` ile bunu belirtir.
- Seviyeler `current_price`'a göre `support_levels` (altında) ve
  `resistance_levels` (üstünde) olarak ayrılır, fiyata yakınlığa göre sıralanır.

**Hata Durumları**:

- Bilinmeyen `ohlcv_ref` → `isError: true`

---

### 4.4 `get_volatility_metrics`

**Amaç**: ATR bazlı volatilite metriklerini hesaplar; hem Technical Analysis Agent
hem de Risk Agent tarafından (gerektiğinde doğrulama/yeniden hesaplama için)
kullanılabilir.

**Kullanan agent**: Technical Analysis Agent (birincil), Risk Agent (opsiyonel
doğrulama)

**Input Şeması**:

```json
{
  "ohlcv_ref": "string",
  "atr_length": "integer, varsayılan 14"
}
```

**Output Şeması**:

```json
{
  "ohlcv_ref": "...",
  "atr": 850.0,
  "atr_pct_of_price": 1.26,
  "volatility_classification": "low | medium | high",
  "current_price": 67420.0
}
```

**Sınıflandırma Eşikleri (Özet)**:

- `atr_pct_of_price < 0.8` → `low`
- `0.8 <= atr_pct_of_price <= 2.0` → `medium`
- `atr_pct_of_price > 2.0` → `high`

> Bu eşikler kripto piyasası için kalibre edilmiş yaklaşık değerlerdir; ileride
> parite/zaman dilimine göre dinamikleştirilebilir (v1'de sabit).

**Hata Durumları**:

- Bilinmeyen `ohlcv_ref` → `isError: true`

---

## 5. News Tools

### 5.1 `get_pair_news`

**Amaç**: Belirtilen paritenin temel varlığına (base asset) özel son haberleri ve
CryptoPanic'in sağladığı sentiment etiketlerini getirir.

**Kullanan agent**: News Agent

**Ön Koşul**: Kullanıcı `.env`'de `CRYPTOPANIC_API_KEY` sağlamış olmalıdır. Key
yoksa bu tool çağrılmaz / çağrılırsa `source: "unavailable"` ile boş sonuç döner
(aşağıda).

**Input Şeması**:

```json
{
  "base_asset": "string, örn. 'BTC'",
  "limit": "integer, varsayılan 10"
}
```

**Output Şeması (key mevcutsa)**:

```json
{
  "source": "cryptopanic",
  "base_asset": "BTC",
  "items": [
    {
      "title": "...",
      "published_at": "2026-06-13T05:30:00Z",
      "url": "https://...",
      "votes": { "positive": 12, "negative": 3 },
      "panic_sentiment": "bullish | bearish | neutral"
    }
  ],
  "aggregate_sentiment_score": -0.1
}
```

**Output Şeması (key yoksa)**:

```json
{
  "source": "unavailable",
  "base_asset": "BTC",
  "items": [],
  "aggregate_sentiment_score": 0.0,
  "reason": "CRYPTOPANIC_API_KEY not configured"
}
```

**`aggregate_sentiment_score` Hesaplaması**:

- Her haber öğesinin `panic_sentiment` etiketi (`bullish: +1, bearish: -1, neutral:
  0`) oy sayısına (`votes.positive - votes.negative`, ağırlık olarak) göre
  ağırlıklandırılır ve normalize edilir (-1.0 ile +1.0 arası).

**Hata Durumları**:

- Geçersiz/süresi dolmuş API key → `isError: false` ama `source: "unavailable"`,
  `reason: "CryptoPanic authentication failed"` (agent bunu News Agent'ın
  `confidence`'ına yansıtır, pipeline durmaz).
- CryptoPanic API rate limit → `source: "unavailable"`, `reason: "Rate limit
  exceeded"`.

---

### 5.2 `get_market_news`

**Amaç**: Genel kripto piyasasını etkileyen makro haberleri (regülasyon, merkez
bankası kararları, büyük piyasa hareketleri) web search ile getirir.

**Kullanan agent**: News Agent

**Input Şeması**:

```json
{
  "topic": "string, örn. 'crypto market regulation', 'Fed interest rate decision crypto', 'Bitcoin ETF flows'",
  "max_results": "integer, varsayılan 5"
}
```

**Output Şeması**:

```json
{
  "source": "web_search",
  "topic": "Fed interest rate decision crypto",
  "items": [
    {
      "title": "...",
      "snippet": "...",
      "url": "https://...",
      "published_at": "2026-06-12T00:00:00Z"
    }
  ]
}
```

**Notlar**:

- Bu tool, ham arama sonuçlarını döner — **sentiment etiketleme yapmaz**.
  Sentiment yorumlaması News Agent'ın LLM çağrısında, bu sonuçlar üzerinden
  yapılır (`agents.md` § News Agent).
- `topic` parametresi News Agent tarafından dinamik olarak oluşturulur (örn.
  sorgulanan paritenin büyük bir coin olup olmamasına göre "Bitcoin ETF" veya
  genel "crypto market sentiment" gibi farklı sorgular tercih edilebilir).

**Hata Durumları**:

- Arama sonucu boşsa → `items: []`, hata değil (News Agent bu durumda
  `macro.key_factors: []` ile devam eder, `confidence` hafifçe düşer).

---

## 6. Tool — Agent Eşleştirme Tablosu (Özet)

| Tool | Kategori | Kullanan Agent(lar) | Bağımlılık |
|---|---|---|---|
| `get_ohlcv` | Data | Data Agent | — |
| `calculate_indicator` | Indicator | Technical Analysis Agent | `ohlcv_ref` |
| `detect_divergence` | Indicator | Technical Analysis Agent | `ohlcv_ref` |
| `get_support_resistance` | Indicator | Technical Analysis Agent | `ohlcv_ref` |
| `get_volatility_metrics` | Indicator | Technical Analysis Agent, Risk Agent (opsiyonel) | `ohlcv_ref` |
| `get_pair_news` | News | News Agent | `CRYPTOPANIC_API_KEY` (opsiyonel) |
| `get_market_news` | News | News Agent | — (web search) |

---

## 7. Konfigürasyon Özeti (.env ile bağlantı)

| Tool | Gerekli Ortam Değişkeni | Zorunlu mu? |
|---|---|---|
| `get_ohlcv` | `BINANCE_API_KEY` / `BINANCE_API_SECRET` | Hayır — public OHLCV endpoint'leri key'siz çalışır; key sadece rate-limit artışı için |
| `get_pair_news` | `CRYPTOPANIC_API_KEY` | Hayır — yoksa `source: "unavailable"` ile graceful degrade |
| `get_market_news` | (Claude API'nin web search yeteneği — `ANTHROPIC_API_KEY` üzerinden) | Evet, dolaylı olarak |

Detaylı kurulum adımları `setup.md`'de ele alınacaktır.