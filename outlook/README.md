# PhishGuard Outlook Entegrasyonu

Bu klasör, Outlook 2016 üzerinde çalışan VBA tabanlı otomatik analiz köprüsünü içerir.

## Amaç

- Mail seçildiğinde veya açıldığında analizi otomatik tetiklemek
- Sonucu Outlook içinde görünür hale getirmek
- Sağ panel açılmadan da ilk seviye risk göstergesi sunmak

## Önemli Dosyalar

- `vba_integration/ExportSelectedMail.bas`
- `vba_integration/ThisOutlookSession_snippet.txt`

## Outlook İçinde Görünen Şeyler

VBA akışı analiz sonucuna göre Outlook kategorisi uygular:

- `PhishGuard - Güvendesiniz`
- `PhishGuard - Orta Risk`
- `PhishGuard - Yüksek Risk`

Bu kategori satırı, kullanıcının mail üstünde renkli bir uyarı çubuğu görmesini sağlar.

## VBA Kurulumu

1. Outlook'u açın.
2. `Alt + F11` ile VBA editörünü açın.
3. `ExportSelectedMail.bas` dosyasını `Modules` içine import edin.
4. `ThisOutlookSession` bölümünü açın.
5. `ThisOutlookSession_snippet.txt` içeriğini yapıştırın.
6. `Debug > Compile VBAProject` çalıştırın.
7. Outlook'u kapatıp yeniden açın.

## Üretilen Dosyalar

```text
<PHISHGUARD_ROOT>\outlook\last_selected_mail.json
<PHISHGUARD_ROOT>\outlook\last_analysis_result.json
```

## Çalışma Akışı

1. Outlook seçilen maili okur.
2. VBA gerekli alanları JSON'a aktarır.
3. Yerel Python analiz motoru çalıştırılır.
4. Analiz sonucu `last_analysis_result.json` içine yazılır.
5. Sonuca göre Outlook kategorisi güncellenir.

İstenirse aynı modül manuel olarak da çalıştırılabilir:

- `ExportCurrentSelectedMail`

## Gerekli Ortam Değişkenleri

VBA önce şu değişkenlere bakar:

- `PHISHGUARD_ROOT`
- `PHISHGUARD_PYTHON`

Yoksa yedek olarak:

- `%USERPROFILE%\Desktop\phish`
- `py -3`

kullanılır.

## İlgili Arayüz

Daha ayrıntılı kullanıcı görünümü için Outlook add-in tarafı kullanılır:

- `addin/manifest.xml`
- `addin/web/taskpane.html`
- `addin/web/taskpane.js`
