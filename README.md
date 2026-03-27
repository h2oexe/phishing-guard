# PhishGuard

PhishGuard, Outlook içindeki e-postaları yerel olarak analiz eden, phishing ve dolandırıcılık riskini kullanıcıya sade bir şekilde gösteren kural tabanlı bir masaüstü güvenlik yardımcısıdır.

## Bileşenler

- `phishguard/`
  Analiz motoru, kural sistemi, extractor ve skorlayıcı
- `outlook/vba_integration/`
  Outlook VBA köprüsü ve otomatik kategori uygulama akışı
- `addin/`
  Outlook sağ panel eklentisi ve admin panel arayüzü
- `local_service/`
  Add-in ve admin panelin konuştuğu yerel HTTPS servis
- `data/runtime_config.json`
  Çalışan konfigürasyon, admin ayarları ve değişiklik geçmişi

## Temel Özellikler

- Yerel analiz, dış servise veri çıkışı yok
- Normalize edilmiş `0-100` risk skoru
- `Düşük / Orta / Yüksek Risk` sınıflandırması
- Outlook içinde otomatik kategori çubuğu
- Sağ panelde ayrıntılı açıklama
- Admin panelden:
  - kural ağırlığı değiştirme
  - etiket yönetimi
  - alan adı / keyword / phrase yönetimi
  - özel kural ekleme
  - parola koruması
  - değişiklik geçmişi
  - fabrika ayarlarına dönüş

## Çalışma Akışı

### 1. Outlook otomatik analiz

- Mail seçildiğinde veya ayrı pencerede açıldığında VBA köprüsü devreye girer.
- Mail verisi JSON olarak dışa aktarılır.
- Python analiz motoru çalışır.
- Sonuca göre Outlook kategorisi uygulanır:
  - `PhishGuard - Güvendesiniz`
  - `PhishGuard - Orta Risk`
  - `PhishGuard - Yüksek Risk`

### 2. Outlook sağ panel

- Kullanıcı `Risk Analizi` butonuna basınca task pane açılır.
- Panel, yerel servise mevcut maili gönderir.
- Risk skoru, özet açıklama ve kullanıcı dostu işaretler gösterilir.

### 3. Admin panel

- Admin panel yerel servis üzerinden açılır.
- Ayarlar `runtime_config.json` içine kaydedilir.
- Yeni eklenen özel etiketler artık sadece etiket listesinde değil:
  - `Kural Motoru` bölümünde ağırlık kartı olarak
  - `Kayıtlar` bölümünde özel ifade listesi olarak
  görünür.

## Hızlı Başlatma

### Analyzer örnekleri

```powershell
python -m phishguard.main sample_emails\phishing_sample.json
python -m phishguard.main sample_emails\normal_sample.json
python run_samples.py
```

### Outlook export analizi

```powershell
python analyze_outlook_export.py
```

### Yerel servis

```powershell
python "C:\Users\stajyer_it1\Desktop\phish\local_service\server.py" --host localhost --port 3000 --cert-file "C:\Users\stajyer_it1\Desktop\phish\local_service\certs\localhost-cert.pem" --key-file "C:\Users\stajyer_it1\Desktop\phish\local_service\certs\localhost-key.pem"
```

### Admin panel

- `https://localhost:3000/admin/`

### Outlook add-in yükleme

- `https://aka.ms/olksideload`

## Ortam Değişkenleri

Çok kullanıcılı kurulum için önce şu kullanıcı ortam değişkenleri kontrol edilir:

- `PHISHGUARD_ROOT`
- `PHISHGUARD_PYTHON`

Kolay kurulum:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_phishguard_env.ps1
```

## Aktif Konfigürasyon

Kod içindeki başlangıç ayarları:

- `phishguard/config.py`

Çalışan gerçek ayarlar:

- `data/runtime_config.json`

Yani admin panelden yapılan değişiklikler doğrudan `config.py` dosyasına değil, `runtime_config.json` içine yazılır.
