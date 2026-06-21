# Project Gap Analysis & Recommendations

Bu doküman, proje dokümantasyonu ve mevcut kod yapısı incelenerek çıkarılan eksik özellikleri, entity kullanım durumunu ve gelecek geliştirme önerilerini özetler.

---

## 1. .NET Entity'leri ve Kullanım Durumu

| Entity | Backend Endpoint | Frontend Sayfası | Durum |
|---|---|---|---|
| **Pair** | GET, POST | SettingsPage, ControlPanel | Tam kullanılıyor |
| **UserSettings** | GET, PUT | SettingsPage | Tam kullanılıyor |
| **Analysis** | GET list, GET by id, POST | HistoryPage, AnalysisDetailPage, DashboardPage | Tam kullanılıyor |
| **Trade** | POST, GET list, GET by id, PUT close, DELETE | TradesPage, OpenTrades widget, TradeForm | Tam kullanılıyor |
| **Portfolio** | GET summary | PortfolioPage | Kısmen kullanılıyor |

### Portfolio Eksikleri

`PortfolioService` şu anda yalnızca temel özetler sunuyor:

- toplam trade sayısı
- açık/kapalı trade sayısı
- win/loss sayısı
- win rate
- toplam PnL

Dokümantasyonda geçen performans katmanı daha zengin olabilir. Eksik görülen metrikler:

- günlük / haftalık / aylık performans
- en kârlı pair
- ortalama trade süresi
- max drawdown
- win/loss streak
- expectancy
- average R:R

---

## 2. Dokümantasyonda Tanımlı Ama Eksik veya Yarım Özellikler

### 2.1 `latest_price` Alanı

`analyses.latest_price` dokümantasyonda gerçek analiz anı fiyatını tutmalı. Mevcut uygulamada bu alanın `0` kalma riski var; AI servis çıktısından veya Data Agent sonucundan parse edilip kaydedilmesi gerekir.

### 2.2 Phase 6 Doğrulamaları

`docs/state.md` içinde Phase 6 hâlâ tamamlanmamış görünüyor:

- PostgreSQL persistence ve relationship doğrulaması
- API key fallback testleri
- uçtan uca walkthrough
- final dokümantasyon güncellemesi

### 2.3 `result_json` Sorgulanabilirliği

`db_schema.md` içinde `result_json` için opsiyonel GIN index öneriliyor. Bu henüz kritik değil, fakat ileride şu sorgular için yararlı olur:

- News risk threshold'a göre filtreleme
- belirli agent confidence değerine göre analiz arama
- conflict içeren analizleri listeleme
- geçmişte LONG önerilen analizleri bulma

---

## 3. Frontend'de Henüz Tam Sunulmayan Özellikler

| Özellik | Dokümantasyon / Entity | Mevcut Durum |
|---|---|---|
| Analizden açılan trade'ler | `trades.analysis_id` | AnalysisDetailPage'de gösterilmiyor |
| Trade'den ilgili analize dönüş | `analysis_id` FK | TradesPage'de analiz link'i sınırlı / eksik |
| İndikatör overlay'leri | `architecture.md` Chart View | RSI/MACD/Bollinger sub-pane yok |
| Trade notes | `Trade.Notes` | TradeForm ve TradesPage'de daha görünür olmalı |
| Pair deactivation | `Pair.IsActive` | UI'da pair pasifleştirme yok |
| Portfolio analytics | Portfolio endpoint | Basit özet düzeyinde |

---

## 4. Kısa Vadeli Geliştirme Önerileri

### 4.1 Analysis ↔ Trade İlişkisini UI'da Güçlendirme

Analiz detay sayfasında:

- "Bu analizden açılan trade'ler" kartı
- trade durumları: open / closed
- PnL özeti

Trade detayında:

- "Bu trade hangi analizden açıldı?"
- ilgili AnalysisDetailPage link'i
- analiz anındaki sentiment, confidence, R:R özeti

Bu, `.NET` tarafındaki `analysis_id` alanını gerçek bir kullanıcı deneyimine dönüştürür.

### 4.2 Trade Notes Alanı

`Trade.Notes` entity'de var fakat journal deneyimi için daha merkezi olmalı:

- trade açarken not girme
- trade kapatırken exit notu
- trade listesinde kısa not preview
- detayda tam not görünümü

### 4.3 `latest_price` Kaydı

Analysis kayıtlarında gerçek fiyat tutulmalı. Bu sayede:

- geçmiş analiz listesinde analiz fiyatı gösterilebilir
- analiz sonrası fiyat performansı ölçülebilir
- model accuracy tracking için altyapı hazırlanır

### 4.4 Portfolio Detayları

PortfolioPage şunlarla güçlendirilebilir:

- equity curve
- monthly PnL
- best / worst trade
- best / worst symbol
- average hold duration
- average R:R
- expectancy

### 4.5 Pair Yönetimi

SettingsPage içinde:

- pair pasifleştirme
- pair tekrar aktifleştirme
- favori pair işaretleme
- varsayılan pair seçimi

---

## 5. Orta Vadeli Geliştirme Önerileri

### 5.1 Multi-Timeframe Confluence

Projenin adı "Confluence Trade Crew" olduğu için en güçlü ürünleştirme fırsatı budur.

Örnek:

- 15m: momentum
- 1h: setup
- 4h: trend
- 1d: macro trend

Sistem tek timeframe yerine çoklu timeframe skorlayabilir:

```text
Confluence Score = 4h trend weight + 1h entry weight + 15m timing weight + news/risk adjustment
```

Bu özellik projeyi sıradan "AI analiz botu" olmaktan çıkarıp gerçek bir confluence engine haline getirir.

### 5.2 Model Accuracy Tracking

Her analiz için sonraki fiyat performansı ölçülebilir:

- 1 saat sonra fiyat ne oldu?
- 4 saat sonra fiyat ne oldu?
- 24 saat sonra fiyat ne oldu?
- LONG önerileri ne kadar doğru?
- WAIT önerileri kaçırılmış fırsat mıydı?

Bu, agent kararlarının kalitesini ölçmek için çok değerli olur.

### 5.3 Analiz Karşılaştırma

Kullanıcı geçmiş analizleri yan yana karşılaştırabilir:

- önceki sentiment vs güncel sentiment
- confidence değişimi
- R:R değişimi
- support/resistance değişimi
- news sentiment değişimi

### 5.4 Alert ve Bildirim Sistemi

Örnek bildirimler:

- fiyat önerilen entry seviyesine geldi
- fiyat SL veya TP'ye yaklaştı
- yeni analiz önceki analizin tersine döndü
- high-confidence setup oluştu

Kanallar:

- UI notification
- Telegram bot
- email
- Discord webhook

### 5.5 Chart Indicator Sub-Panes

AI çıktısında indikatörler zaten mevcut. Frontend'de bunlar görselleştirilebilir:

- RSI sub-pane
- MACD histogram
- Bollinger band overlay
- EMA 20 / EMA 50 overlay
- ATR / volatility badge

---

## 6. Uzun Vadeli ve Farklılaştırıcı Özellikler

### 6.1 Backtest Mode

Geçmiş veriler üzerinde pipeline simüle edilebilir:

- belirli tarih aralığı seç
- belirli pair/timeframe seç
- agent o dönemde ne önerirdi?
- öneriler kârlı mıydı?

Bu özellik projenin araştırma ve portfolyo değerini ciddi artırır.

### 6.2 On-Chain Data Integration

Yeni MCP tool'lar ile:

- exchange inflow/outflow
- whale transfers
- funding rates
- open interest
- liquidation heatmaps
- stablecoin supply changes

TA + News + On-chain üçlüsü çok daha güçlü bir karar destek sistemi oluşturur.

### 6.3 Strategy Templates

Hazır profiller:

- Scalp
- Intraday
- Swing
- Position

Her strateji şunları belirleyebilir:

- timeframe set'i
- risk profile
- minimum R:R
- haber ağırlığı
- indikatör ağırlığı

### 6.4 Trade Review Assistant

Kapanmış trade'lerden sonra AI şu soruları cevaplayabilir:

- Trade plana uygun kapandı mı?
- SL/TP mantıklı mıydı?
- Erken çıkış mı yapıldı?
- Aynı setup tekrar gelirse ne değişmeli?

### 6.5 Public MCP / External Agent Integration

Mimari buna uygun. İleride sistem, Claude/Cursor gibi ajanlara public MCP server olarak bağlanabilir:

- geçmiş analiz sorgulama
- trade performansı sorgulama
- yeni analiz tetikleme
- portfolio summary alma

---

## 7. Professional Trading Journal Eksikleri

Proje trading advisor + journal olarak konumlandığı için şu özellikler ürünü daha profesyonel hale getirir:

- equity curve
- calendar heatmap
- average winner / average loser
- expectancy
- max drawdown
- risk of ruin
- Sharpe / Sortino benzeri oranlar
- tag sistemi: breakout, reversal, trend-following, news-driven
- setup screenshot veya chart snapshot
- execution quality: entry planlanan seviyeye göre iyi mi kötü mü?

---

## 8. Önceliklendirilmiş Roadmap Önerisi

### Öncelik 1 — Mevcut Entity'leri Tam Ürüne Dönüştürme

1. `latest_price` gerçek değerle kaydedilsin
2. Analysis ↔ Trade ilişkisi UI'da görünür olsun
3. Trade notes alanı tam kullanılsın
4. Portfolio metrikleri zenginleştirilsin
5. Pair deactivation eklensin

### Öncelik 2 — Trading Advisor Kalitesini Artırma

1. Multi-timeframe confluence
2. model accuracy tracking
3. analysis comparison
4. alert sistemi
5. indicator overlays

### Öncelik 3 — Farklılaştırıcı Özellikler

1. backtest mode
2. on-chain data MCP tools
3. strategy templates
4. trade review assistant
5. public MCP integration

---

## 9. Sonuç

Proje mimarisi sağlam ve entity yapısı doğru kurulmuş durumda. `.NET` tarafındaki ana entity'ler frontend'de büyük ölçüde kullanılıyor; ancak bazı entity alanları ve ilişkiler henüz tam bir kullanıcı deneyimine dönüşmemiş durumda.

En kritik eksikler:

1. Analysis ↔ Trade ilişkisinin UI'da yeterince görünür olmaması
2. Portfolio metriklerinin sığ kalması
3. `latest_price` alanının gerçek değerle beslenmemesi
4. indikatörlerin chart üzerinde sub-pane / overlay olarak sunulmaması
5. geçmiş analizlerin doğruluğunu ölçen model accuracy tracking'in olmaması

Projeyi daha ilgi çekici hale getirecek en güçlü özellikler:

1. Multi-timeframe confluence
2. model accuracy tracking
3. equity curve ve gelişmiş portfolio analytics
4. alert sistemi
5. backtest mode

