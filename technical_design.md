# PhishGuard Technical Design

## Amaç

Bu doküman, PhishGuard'ın güncel teknik mimarisini özetler. Sistem hem Outlook içinde görünür bir kullanıcı deneyimi üretir hem de yerel, açıklanabilir bir phishing analiz hattı sunar.

## Mimari Bileşenler

### 1. Analyzer Core

Konum:

- `phishguard/`

Sorumluluklar:

- mail verisini parse etmek
- link ve attachment sinyallerini çıkarmak
- metin tabanlı phrase eşleşmelerini üretmek
- kuralları çalıştırmak
- skoru normalize etmek
- kullanıcıya uygun özet üretmek

Ana dosyalar:

- `parser.py`
- `extractor.py`
- `rules.py`
- `scorer.py`
- `config_store.py`

### 2. Outlook VBA Bridge

Konum:

- `outlook/vba_integration/ExportSelectedMail.bas`
- `outlook/vba_integration/ThisOutlookSession_snippet.txt`

Sorumluluklar:

- Outlook içinden seçili maili okumak
- yerel analyzer'ı tetiklemek
- sonucu Outlook kategorisi olarak göstermek
- otomatik analiz deneyimi sağlamak

### 3. Outlook Add-in Panel

Konum:

- `addin/manifest.xml`
- `addin/web/taskpane.html`
- `addin/web/taskpane.css`
- `addin/web/taskpane.js`

Sorumluluklar:

- detaylı risk panelini göstermek
- skor, özet ve kullanıcı dostu işaretleri sunmak
- add-in açıkken manuel/yeniden analiz imkanı vermek

### 4. Admin Panel

Konum:

- `addin/web/admin/index.html`
- `addin/web/admin/admin.css`
- `addin/web/admin/admin.js`

Sorumluluklar:

- kural ağırlıklarını yönetmek
- phrase/domain listelerini güncellemek
- özel kural ve etiket tanımlamak
- sürüm notu girmek
- parola ve yönetim araçlarını yönetmek
- değişiklik geçmişini göstermek

### 5. Local Service

Konum:

- `local_service/server.py`

Sorumluluklar:

- add-in ve admin panel için HTTPS servis sağlamak
- `/api/analyze`
- `/api/meta`
- `/api/admin/*`
  endpointlerini yönetmek

## Konfigürasyon Modeli

### Varsayılan Konfigürasyon

- `phishguard/config.py`

### Çalışan Konfigürasyon

- `data/runtime_config.json`

Admin panel tüm değişiklikleri `runtime_config.json` içine yazar. Çalışan sistem bu dosyayı okur ve varsayılan ayarların üzerine uygular.

## Skor Mantığı

- Kuralların ham ağırlıkları toplanır.
- Aktif kuralların en yüksek ağırlıklarına göre normalize baz hesaplanır.
- Son skor `0-100` aralığına normalize edilir.
- Son kullanıcı panelinde yalnızca normalize skor gösterilir.

Bu yüzden admin panelde görülen ham ağırlık toplamı `100`'ü aşabilir; kullanıcıya çıkan skor ise aşmaz.

## Özel Kural Akışı

Admin panelden yeni bir etiket eklendiğinde sistem artık bunu yalnızca görüntü etiketi olarak değil, özel kural olarak işler.

Örnek:

- `DENEME_ETIKET`

Bu kayıt:

- `Etiketler` bölümünde tanımlanır
- `Kural Motoru` bölümünde ağırlık alır
- `Kayıtlar` bölümünde kendi phrase listesi alanına sahip olur
- phrase eşleşirse analiz sonucunda gerçek kural olarak döner

## Outlook Gösterim Mantığı

### Hızlı görünür uyarı

VBA tarafı, sonuç seviyesine göre Outlook kategorisi uygular:

- Güvendesiniz
- Orta Risk
- Yüksek Risk

### Detay paneli

Add-in tarafı kullanıcıya:

- skor
- açıklama
- işaretler
- düz dilde nedenler

gösterir.

## Güvenlik İlkeleri

- analiz yerelde yapılır
- mail verisi dış servise gönderilmez
- admin panel parola ile korunabilir
- parola düz metin olarak değil `hash + salt` şeklinde saklanır

## Güncel Teslim Kapsamı

Sistemde şu anda çalışan ana başlıklar:

- Outlook otomatik kategori analizi
- Outlook sağ panel
- normalize skor
- admin panel
- sürüm yönetimi
- değişiklik geçmişi
- fabrika ayarı
- özel kural desteği
