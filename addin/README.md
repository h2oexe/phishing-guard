# PhishGuard Outlook Add-in

Bu klasör, Outlook içindeki sağ panel deneyimini sağlayan add-in dosyalarını içerir.

## Önemli Dosyalar

- `manifest.xml`
  Outlook eklenti tanımı
- `web/taskpane.html`
  sağ panel HTML yapısı
- `web/taskpane.css`
  panel görünümü
- `web/taskpane.js`
  Outlook mail verisini okuyup yerel servise gönderen kod
- `web/admin/`
  yönetim paneli arayüzü

## Görevleri

### Kullanıcı paneli

- mevcut maili Office.js ile okur
- `https://localhost:3000/api/analyze` endpoint'ine gönderir
- normalize skor ve kullanıcı dostu işaretleri gösterir

### Admin panel

- `https://localhost:3000/admin/` üzerinden açılır
- runtime config'i düzenler
- sürüm, kural, liste, etiket ve güvenlik ayarlarını yönetir

## Gereken Servis

Add-in'in çalışması için yerel HTTPS servis açık olmalıdır:

```powershell
python "C:\Users\stajyer_it1\Desktop\phish\local_service\server.py" --host localhost --port 3000 --cert-file "C:\Users\stajyer_it1\Desktop\phish\local_service\certs\localhost-cert.pem" --key-file "C:\Users\stajyer_it1\Desktop\phish\local_service\certs\localhost-key.pem"
```

## Yükleme

Outlook add-in sideload linki:

- `https://aka.ms/olksideload`

Manifest dosyası:

- `addin/manifest.xml`
