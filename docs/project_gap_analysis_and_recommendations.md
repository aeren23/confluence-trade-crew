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
| **Portfolio** | GET summary | PortfolioPage | DONE — gelişmiş metrikler, equity curve, breakdown ve heatmap ile tam kullanılıyor |

### Portfolio Eksikleri — DONE

`PortfolioService` şu anda yalnızca temel özetler sunuyor:

- toplam trade sayısı
- açık/kapalı trade sayısı
- win/loss sayısı
- win rate
- toplam PnL

Dokümantasyonda geçen performans katmanı eklendi. Çözülen metrikler:

- DONE: günlük / haftalık / aylık performans
- DONE: en kârlı pair
- DONE: ortalama trade süresi
- DONE: max drawdown
- DONE: win/loss streak
- DONE: expectancy
- DONE: average R:R
- DONE: best / worst trade
- DONE: calendar heatmap
- DONE: risk of ruin
- DONE: Sharpe / Sortino benzeri oranlar

---

## 2. Dokümantasyonda Tanımlı Ama Eksik veya Yarım Özellikler

### 2.1 `latest_price` Alanı — DONE

DONE: `analyses.latest_price` artık AI servis çıktısından çok aşamalı fallback ile parse edilip kaydediliyor.

### 2.2 Phase 6 Doğrulamaları — DONE

DONE: Tüm entegrasyon, DB persistence ve relationship doğrulamaları, API key fallback testleri ve uçtan uca walkthrough başarıyla tamamlandı.

### 2.3 `result_json` Sorgulanabilirliği — DONE

DONE: `result_json` için GIN index initial migration içinde mevcut. Ek olarak analiz geçmişi API'sine direction/conflict/minConfidence filtreleri eklendi:

- DONE: belirli agent confidence değerine göre analiz arama
- DONE: conflict içeren analizleri listeleme
- DONE: geçmişte LONG/SHORT/WAIT önerilen analizleri bulma
- TODO (ileri): News risk threshold'a göre detaylı filtreleme

---

## 3. Frontend'de Henüz Tam Sunulmayan Özellikler

| Özellik | Dokümantasyon / Entity | Mevcut Durum |
|---|---|---|
| Analizden açılan trade'ler | `trades.analysis_id` | DONE — AnalysisDetailPage'de linked trades kartı var |
| Trade'den ilgili analize dönüş | `analysis_id` FK | DONE — TradesPage'de analysis link'i var |
| İndikatör overlay'leri | `architecture.md` Chart View | DONE — EMA/BB overlay, RSI/MACD sub-pane eklendi |
| Trade notes | `Trade.Notes` | DONE — create notes, exit notes, list preview ve expand eklendi |
| Pair deactivation | `Pair.IsActive` | DONE — SettingsPage activate/deactivate/favorite/default pair yönetimi eklendi |
| Portfolio analytics | Portfolio endpoint | DONE — gelişmiş metrikler, heatmap ve breakdown görünümleri eklendi |

---

## 4. Kısa Vadeli Geliştirme Önerileri

### 4.1 Analysis ↔ Trade İlişkisini UI'da Güçlendirme — DONE

Analiz detay sayfasında:

- "Bu analizden açılan trade'ler" kartı
- trade durumları: open / closed
- PnL özeti

Trade detayında:

- "Bu trade hangi analizden açıldı?"
- ilgili AnalysisDetailPage link'i
- analiz anındaki sentiment, confidence, R:R özeti

Bu, `.NET` tarafındaki `analysis_id` alanını gerçek bir kullanıcı deneyimine dönüştürür.

### 4.2 Trade Notes Alanı — DONE

`Trade.Notes` entity'de var fakat journal deneyimi için daha merkezi olmalı:

- DONE: trade açarken not girme
- DONE: trade kapatırken exit notu
- DONE: trade listesinde kısa not preview
- DONE: listede tam not expand görünümü

### 4.3 `latest_price` Kaydı — DONE

Analysis kayıtlarında gerçek fiyat tutulmalı. Bu sayede:

- geçmiş analiz listesinde analiz fiyatı gösterilebilir
- analiz sonrası fiyat performansı ölçülebilir
- model accuracy tracking için altyapı hazırlanır

### 4.4 Portfolio Detayları — DONE

PortfolioPage şunlarla güçlendirilebilir:

- DONE: equity curve
- DONE: monthly PnL
- DONE: daily / weekly PnL
- DONE: best / worst trade
- DONE: best / worst symbol
- DONE: average hold duration
- DONE: average R:R
- DONE: expectancy
- DONE: calendar heatmap
- DONE: risk of ruin
- DONE: Sharpe / Sortino

### 4.5 Pair Yönetimi — DONE

SettingsPage içinde:

- DONE: pair pasifleştirme
- DONE: pair tekrar aktifleştirme
- DONE: favori pair işaretleme
- DONE: varsayılan pair seçimi

---

## 5. Orta Vadeli Geliştirme Önerileri — DONE

### 5.1 Multi-Timeframe Confluence — DONE

DONE: Çoklu timeframe confluence engine kuruldu (ui toggle, orchestrator multi-TF logic, EF Core MTF tracking, ConfluenceGauge component). 4h, 1h, 15m, 1d gibi farklı zaman dilimleri entegre edilerek tek bir confluence skoru elde edilmektedir.

### 5.2 Model Accuracy Tracking — DONE

DONE: Model doğruluk takip sistemi kuruldu. Binance public API'si kullanılarak analizlerin ardından gerçekleşen fiyat hareketleri (1h, 4h, 24h vb. sonrasındaki fiyatlar) on-demand sorgulanır ve hedeflere ulaşma oranı (accuracy score) hesaplanır. Global istatistikler ve analiz detay kartları eklendi.

### 5.3 Analiz Karşılaştırma — DONE

DONE: Side-by-side karşılaştırma sayfası (`ComparePage.jsx`) ve geçmiş analiz listesinden checkbox ile analiz seçimi entegre edildi. Kullanıcılar iki analizin parametrelerini, sentiment ve confidence değişimlerini yan yana inceleyebilir.

### 5.4 Alert ve Bildirim Sistemi — DONE

DONE: Dashboard üzerinde yüksek güvenli ve nötr olmayan sinyalleri listeleyen canlı `AlertWidget.jsx` entegrasyonu sağlandı. (E-posta, Telegram ve Discord entegrasyonları sonraki aşamalar için planlandı).

### 5.5 Chart Indicator Sub-Panes — DONE

AI çıktısında indikatörler zaten mevcut. Frontend'de bunlar görselleştirilebilir:

- DONE: RSI sub-pane
- DONE: MACD histogram
- DONE: Bollinger band overlay
- DONE: EMA 20 / EMA 50 overlay
- TODO: ATR / volatility badge

---

## 6. Uzun Vadeli ve Farklılaştırıcı Özellikler

### 6.1 Backtest Mode

Geçmiş veriler üzerinde pipeline simüle edilebilir:

- belirli tarih aralığı seç
- belirli pair/timeframe seç
- agent o dönemde ne önerirdi?
- öneriler kârlı mıydı?

Bu özellik projenin araştırma ve portfolyo değerini ciddi artırır.

### 6.2 On-Chain Data Integration — DONE

Yeni MCP tool'lar ile:

- exchange inflow/outflow
- whale transfers
- funding rates
- open interest
- liquidation heatmaps
- stablecoin supply changes

TA + News + On-chain üçlüsü çok daha güçlü bir karar destek sistemi oluşturur.

### 6.3 Strategy Templates — DONE

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

- DONE: equity curve
- DONE: calendar heatmap
- DONE: average winner / average loser
- DONE: expectancy
- DONE: max drawdown
- DONE: risk of ruin
- DONE: Sharpe / Sortino benzeri oranlar
- DONE: tag sistemi: breakout, reversal, trend-following, news-driven
- setup screenshot veya chart snapshot
- execution quality: entry planlanan seviyeye göre iyi mi kötü mü?

---

## 8. Önceliklendirilmiş Roadmap Önerisi

### Öncelik 1 — Mevcut Entity'leri Tam Ürüne Dönüştürme

1. DONE: `latest_price` gerçek değerle kaydedilsin
2. DONE: Analysis ↔ Trade ilişkisi UI'da görünür olsun
3. DONE: Trade notes alanı tam kullanılsın
4. DONE: Portfolio metrikleri zenginleştirilsin
5. DONE: Pair deactivation eklensin

### Öncelik 2 — Trading Advisor Kalitesini Artırma — DONE

1. DONE: Multi-timeframe confluence
2. DONE: model accuracy tracking
3. DONE: analysis comparison
4. DONE: alert sistemi
5. DONE: indicator overlays

### Öncelik 3 — Farklılaştırıcı Özellikler

1. backtest mode
2. DONE: on-chain data MCP tools
3. DONE: strategy templates
4. trade review assistant
5. public MCP integration

---

## 9. Sonuç

Proje mimarisi sağlam ve entity yapısı doğru kurulmuş durumda. `.NET` tarafındaki ana entity'ler frontend'de büyük ölçüde kullanılıyor; ancak bazı entity alanları ve ilişkiler henüz tam bir kullanıcı deneyimine dönüşmemiş durumda.

En kritik eksikler:

1. DONE: Analysis ↔ Trade ilişkisinin UI'da yeterince görünür olmaması
2. DONE: Portfolio metriklerinin sığ kalması
3. DONE: `latest_price` alanının gerçek değerle beslenmemesi
4. DONE: indikatörlerin chart üzerinde sub-pane / overlay olarak sunulmaması
5. DONE: geçmiş analizlerin doğruluğunu ölçen model accuracy tracking'in olmaması

Projeyi daha ilgi çekici hale getirecek en güçlü özellikler:

1. DONE: Multi-timeframe confluence
2. DONE: model accuracy tracking
3. DONE: equity curve ve gelişmiş portfolio analytics
4. DONE: alert sistemi
5. backtest mode

