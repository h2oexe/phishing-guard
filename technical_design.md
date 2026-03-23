# Balıkçı Technical Design

## 1. Amaç
Bu doküman, Balıkçı MVP'sinin teknik tasarımını tanımlar. Amaç, Outlook içindeki e-postaların yerel olarak analiz edilmesi, risk skorunun hesaplanması ve sonucun kullanıcıya düşük gecikmeyle gösterilmesidir.

Bu doküman ürün gereksinimlerini tekrar etmek yerine, implementasyon için gerekli teknik kararları netleştirmeyi hedefler.

## 2. MVP Teknik Kararı
MVP için önerilen yaklaşım:

- Outlook tarafında VBA entegrasyonu kullanılacak
- Analiz motoru yerel Python uygulaması olarak çalışacak
- Outlook, analiz için gerekli mail verisini JSON benzeri yapı halinde analiz motoruna verecek
- Analiz motoru sonucu standart bir sonuç nesnesi olarak dönecek

Not:
Eğer şirket cihazlarında Python runtime kurulumu veya yerel process çağırma kısıtlıysa, aynı mimari C# ile yeniden uygulanabilir. Bu nedenle iş mantığı teknoloji bağımsız tutulmalıdır.

### 2.1 3 Haftalık Teknik Kapsam Dondurma
3 haftalık teslim süresi nedeniyle MVP teknik kapsamı aşağıdaki şekilde dondurulmalıdır:

Zorunlu bileşenler:
- Outlook'tan temel alanları okuma
- Yerel analyzer motoru
- Temel parser ve extractor
- Kural motoru
- Skorlayıcı
- Basit sonuç arayüzü

Ertelenen teknik başlıklar:
- Gelişmiş lookalike algoritmaları
- Asenkron veya çok süreçli mimari
- Büyük ölçekli loglama altyapısı
- Gelişmiş ayar ekranları
- Geniş konfigürasyon yönetimi

### 2.2 Tavsiye Edilen İnşa Sırası
Entegrasyon riskini yönetmek için aşağıdaki sıra izlenmelidir:

1. Önce analyzer motoru Outlook'tan bağımsız çalıştırılmalı
2. Örnek input dosyalarıyla parser, rules ve scorer doğrulanmalı
3. Sonuç nesnesi stabil hale getirilmeli
4. Ardından Outlook entegrasyonu bağlanmalı
5. En son kullanıcı arayüzü cilalanmalı

## 3. Sistem Bileşenleri

### 3.1 Outlook Integration
Sorumluluklar:
- Seçilen veya açılan maili tespit etmek
- Gerekli alanları toplamak
- Analizi tetiklemek
- Sonucu kullanıcı arayüzünde göstermek

Toplanacak alanlar:
- `subject`
- `sender_name`
- `sender_email`
- `sender_domain`
- `body_text`
- `body_html`
- `attachments`
- `message_id` varsa benzersiz kimlik amacıyla kullanılabilir

### 3.2 Analyzer Core
Sorumluluklar:
- Input verisini normalize etmek
- Linkleri çıkarmak
- Link ve domain sinyallerini üretmek
- Attachment sinyallerini üretmek
- Metin tabanlı sinyalleri üretmek
- Kural motorunu çalıştırmak
- Skor hesaplamak
- Kullanıcıya gösterilecek nedenleri üretmek

### 3.3 UI Layer
Sorumluluklar:
- Risk seviyesini göstermek
- Kısa bir güvenlik mesajı göstermek
- Temel nedenleri listelemek
- Gerekirse detay görünümüne geçmek

## 4. Veri Akışı
Önerilen akış:

1. Kullanıcı Outlook içinde mail seçer veya açar
2. VBA gerekli alanları okur
3. Mail verisi normalize edilmiş bir input nesnesine dönüştürülür
4. Analiz motoru input nesnesini işler
5. Feature extraction yapılır
6. Rule engine tetiklenir
7. Scorer nihai skoru hesaplar
8. Sonuç nesnesi Outlook katmanına geri verilir
9. Outlook paneli sonucu kullanıcıya gösterir

## 5. Input Veri Modeli
Önerilen input yapısı:

```json
{
  "subject": "Important account notice",
  "sender_name": "Security Team",
  "sender_email": "security@example.com",
  "sender_domain": "example.com",
  "body_text": "Please verify your account immediately",
  "body_html": "<html>...</html>",
  "links": [],
  "attachments": [
    "invoice.pdf",
    "update.docm"
  ]
}
```

Not:
- `links` alanı Outlook katmanında çıkarılabilir veya analiz motoru içinde üretilebilir
- MVP için bu işin tek bir yerde yapılması yeterlidir, ancak çift parsing'den kaçınılmalıdır

## 6. Output Veri Modeli
Önerilen çıktı yapısı:

```json
{
  "score": 72,
  "level": "High Risk",
  "summary": "Bu e-posta phishing olabilir",
  "matched_rules": [
    "DISPLAY_TARGET_MISMATCH",
    "LOOKALIKE_DOMAIN",
    "DOUBLE_EXTENSION"
  ],
  "reasons": [
    "Görünen link ile gerçek hedef farklı",
    "Gönderen domaine benzeyen şüpheli domain bulundu",
    "Çift uzantılı ek dosya tespit edildi"
  ],
  "details": {
    "sender_domain": "company-secure-support.com",
    "link_domains": [
      "secure-company-login.xyz"
    ]
  }
}
```

## 7. Önerilen Modül Yapısı
Python bazlı MVP için önerilen dosya yapısı:

```text
phishguard/
|-- main.py
|-- models.py
|-- parser.py
|-- extractor.py
|-- rules.py
|-- scorer.py
|-- config.py
|-- utils.py
`-- sample_emails/
```

Modül sorumlulukları:

- `main.py`: giriş noktası, analiz akışı
- `models.py`: input/output veri modelleri
- `parser.py`: body ve HTML içinden link çıkarımı
- `extractor.py`: feature extraction
- `rules.py`: kural değerlendirme mantığı
- `scorer.py`: puan toplama ve risk seviyesi belirleme
- `config.py`: kural ağırlıkları, TLD listeleri, kısa link servisleri, güvenilir domainler
- `utils.py`: ortak yardımcı fonksiyonlar

### 7.1 MVP İçin Zorunlu Dosyalar
3 haftalık sürümde aşağıdaki dosyalar yeterlidir:
- `main.py`
- `models.py`
- `parser.py`
- `extractor.py`
- `rules.py`
- `scorer.py`
- `config.py`

Opsiyonel veya sonraya bırakılabilecek dosyalar:
- Gelişmiş `utils.py`
- Ayrı loglama modülü
- Ayrı UI mantık modülü

## 8. Rule Engine Tasarımı
Rule engine aşağıdaki biçimde çalışmalıdır:

1. Feature extraction çıktıları alınır
2. Her kural bağımsız bir fonksiyon olarak değerlendirilir
3. Tetiklenen kurallar standart formatta çıktı üretir
4. Scorer bu çıktıları toplar ve nihai skor üretir

Önerilen kural çıktısı:

```json
{
  "rule_id": "SHORTENER_LINK",
  "matched": true,
  "weight": 10,
  "confidence": "low",
  "reason": "Kısa link servisi kullanılıyor"
}
```

## 9. Scoring Tasarımı
Skor sistemi hem puan toplama hem de kombinasyon mantığı içermelidir.

Temel ilkeler:
- Düşük güvenli tek bir kural yüksek risk üretmemeli
- Yüksek güvenli kurallar daha ağır etkili olmalı
- Gerekirse bazı güvenli bağlamlar puanı azaltabilmeli
- Sonuç 0-100 aralığına sınırlandırılmalı

Önerilen karar mantığı:
- Sadece düşük güvenli sinyaller varsa en fazla düşük veya orta risk
- En az bir yüksek güvenli sinyal varsa orta veya yüksek risk değerlendirilebilir
- Birden fazla orta güvenli sinyal birlikteyse yüksek riske çıkabilir

### 9.1 MVP İçin Önerilen Eşikler
İlk prototip için aşağıdaki eşikler kullanılabilir:
- `0-24`: Düşük Risk
- `25-54`: Orta Risk
- `55-100`: Yüksek Risk

Bu eşikler test sonuçlarına göre güncellenmelidir.

## 10. Domain ve Link Analizi Tasarımı
MVP için aşağıdaki kontroller yeterlidir:
- URL parse etme
- Host çıkarma
- TLD çıkarma
- IP adresi kontrolü
- Kısa link domain listesi kontrolü
- Görünen metin ile hedef link karşılaştırması
- Basit lookalike kontrolü

Lookalike kontrolü için MVP yaklaşımı:
- Şirket domainine çok benzeyen varyasyonları şüpheli saymak
- Basit string benzerliği veya normalize edilmiş karşılaştırma kullanmak
- Aşırı karmaşık algoritma kullanmamak

## 11. Attachment Analizi Tasarımı
MVP için yalnızca dosya adı tabanlı kontroller yeterlidir:
- Riskli uzantılar
- Makro içerebilecek dosya tipleri
- Çift uzantı kontrolü

Örnek riskli uzantılar:
- `.exe`
- `.scr`
- `.js`
- `.vbs`
- `.bat`
- `.cmd`
- `.ps1`
- `.docm`
- `.xlsm`

## 12. Performans Hedefleri
- Tek bir mail analizi mümkünse 1 saniye civarında tamamlanmalı
- Outlook tarafında kullanıcı deneyimini bozacak bloklayıcı akışlardan kaçınılmalı
- Büyük gövdeli maillerde dahi analiz süresi makul kalmalı

## 13. Hata Yönetimi
Sistem beklenmeyen durumlarda sessizce başarısız olmamalıdır.

Temel hata yönetimi ilkeleri:
- Analiz başarısız olursa kullanıcıya teknik hata yerine sade bir uyarı verilmeli
- Bozuk veya eksik mail alanlarında sistem güvenli varsayılanlarla çalışmalı
- Loglama yapılacaksa yalnızca yerel ortamda tutulmalı

Örnek kullanıcı mesajı:
- Analiz tamamlanamadı, lütfen daha sonra tekrar deneyin

## 14. Loglama ve Gizlilik
- Ham e-posta içeriği mümkünse loglanmamalı
- Loglarda yalnızca teşhis için gerekli minimum bilgi tutulmalı
- Loglar yalnızca yerel ortamda saklanmalı
- Hassas veri içeren uzun body içerikleri kalıcı olarak yazılmamalı

## 15. Dağıtım Riskleri
MVP başlamadan önce aşağıdaki sorular netleştirilmelidir:
- Şirket cihazlarında Python kurulabilir mi
- Outlook VBA dış process çağırabilir mi
- Antivirus veya güvenlik politikaları bunu engeller mi
- UI panelin Outlook içinde hangi yöntemle gösterileceği net mi

Bu sorular netleşmezse Python yerine C# tabanlı daha bütünleşik bir çözüm düşünülmelidir.

### 15.1 Hızlı Risk Azaltma Adımı
İlk 2-3 gün içinde aşağıdaki teknik spike yapılmalıdır:
- Outlook içinden seçili mail alanları okunabiliyor mu
- VBA tarafından yerel bir analiz script'i tetiklenebiliyor mu
- Sonuç geri okunabiliyor veya en azından görüntülenebiliyor mu

Bu spike erken yapılmalıdır. Çünkü proje zaman riskinin en büyük kısmı entegrasyondadır.

## 16. Uygulama Sırası
1. Input ve output modellerini oluştur
2. Link ve attachment parsing mantığını yaz
3. Feature extraction katmanını oluştur
4. Rule engine'i ekle
5. Scorer'ı bağla
6. Örnek mail setiyle test et
7. Outlook entegrasyonunu bağla
8. UI panelini ekle

### 16.1 3 Haftalık Sprint Planı

#### Sprint 1
- Analyzer çekirdeğini ayağa kaldır
- Kuralları örnek inputlarla çalıştır
- JSON sonuç üret

#### Sprint 2
- Skorlama, açıklamalar ve kalibrasyon
- Test veri setiyle doğrulama
- Sonuçların daha kararlı hale getirilmesi

#### Sprint 3
- Outlook entegrasyonu
- Basit UI gösterimi
- Demo hazırlığı ve uçtan uca test

## 17. Açık Teknik Kararlar
İmplementasyondan önce aşağıdaki kararlar kesinleştirilmelidir:
- Analiz motoru dili: Python mı C# mı
- Outlook ile entegrasyon yöntemi
- UI panel teknolojisi
- Şirket domain ve güvenilir domain listesi
- İlk sürümde lookalike tespitin ne kadar basit veya gelişmiş olacağı
