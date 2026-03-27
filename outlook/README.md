# PhishGuard Outlook Entegrasyonu

Bu klasör, PhishGuard MVP için kullanılan kararlı Outlook/VBA köprüsünü içerir.

## Amaç

Seçili Outlook e-postasını yerel analiz servisine uygun biçimde dışa aktarmak, analiz sonucunu üretmek ve Outlook içinde görünür hale getirmektir.

## Üretilen Dosyalar

VBA köprüsü aşağıdaki dosyaları yazar:

```text
<PHISHGUARD_ROOT>\outlook\last_selected_mail.json
<PHISHGUARD_ROOT>\outlook\last_analysis_result.json
```

## Önemli Dosyalar

- `vba_integration/ExportSelectedMail.bas`
- `vba_integration/ThisOutlookSession_snippet.txt`
- `../setup_phishguard_env.ps1`

## Gerekli Ortam Değişkenleri

VBA köprüsü önce aşağıdaki kullanıcı ortam değişkenlerini kontrol eder:

- `PHISHGUARD_ROOT`
- `PHISHGUARD_PYTHON`

Önerilen tek seferlik kurulum:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_phishguard_env.ps1
```

Eğer Python `py -3` ile erişilemiyorsa:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_phishguard_env.ps1 -PythonExe "C:\Path\To\python.exe"
```

## Manuel Çalıştırma

1. Outlook'u açın.
2. `Alt + F11` ile VBA düzenleyicisini açın.
3. `ExportSelectedMail.bas` dosyasını içe aktarın.
4. Outlook'ta bir e-posta seçin.
5. `ExportCurrentSelectedMail` makrosunu çalıştırın.
6. Çıktı dosyalarının oluştuğunu doğrulayın.

## Otomatik Mod

Mail seçildiğinde veya ayrı pencerede açıldığında otomatik analiz için:

1. `ThisOutlookSession` bölümünü açın.
2. `vba_integration/ThisOutlookSession_snippet.txt` içeriğini yapıştırın.
3. Outlook'u kapatıp yeniden açın.

Bu mod açıkken PhishGuard seçilen e-postayı sessizce analiz eder ve Outlook kategorisi uygular:

- `PhishGuard - Düşük Risk`
- `PhishGuard - Orta Risk`
- `PhishGuard - Yüksek Risk`

## Dışa Aktarılan Alanlar

- `subject`
- `sender_name`
- `sender_email`
- `sender_domain`
- `body_text`
- `body_html`
- `attachments`

## Çalışma Akışı

`ExportCurrentSelectedMail` çalıştığında:

1. Outlook seçili maili `last_selected_mail.json` dosyasına aktarır.
2. VBA yerel Python analiz motorunu çağırır.
3. Analiz motoru `last_analysis_result.json` dosyasını üretir.
4. İstenirse Outlook özet popup'ı gösterir.

Otomatik mod açıksa aynı akış sessizce çalışır ve sonuca göre Outlook kategorisi güncellenir.

## Varsayılan Yedek Değerler

Ortam değişkenleri yoksa köprü şu yedek değerleri kullanır:

- repo kökü: `%USERPROFILE%\Desktop\phish`
- Python başlatıcı: `py -3`

## İlgili Arayüz

Daha zengin yan panel deneyimi `addin/` klasörü altındaki Outlook add-in akışında bulunur.
