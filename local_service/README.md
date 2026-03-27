# PhishGuard Local Service

Bu klasör, Outlook add-in ve admin panelin kullandığı yerel HTTPS servisi içerir.

## Ana Dosya

- `server.py`

## Endpointler

- `POST /api/analyze`
  mail analiz sonucu üretir
- `GET /api/meta`
  add-in için sürüm ve etiket meta bilgisi verir
- `GET /api/admin/access`
  admin erişim durumunu verir
- `POST /api/admin/login`
  admin giriş doğrulaması
- `GET /api/admin/config`
  yönetim paneli ayarlarını okur
- `PUT /api/admin/config`
  yönetim paneli ayarlarını kaydeder
- `POST /api/admin/verify-password`
  kritik işlem öncesi parola doğrular
- `POST /api/admin/reset`
  fabrika ayarına dönüş yapar

## Servisi Başlatma

```powershell
python "C:\Users\stajyer_it1\Desktop\phish\local_service\server.py" --host localhost --port 3000 --cert-file "C:\Users\stajyer_it1\Desktop\phish\local_service\certs\localhost-cert.pem" --key-file "C:\Users\stajyer_it1\Desktop\phish\local_service\certs\localhost-key.pem"
```

## Kullanıldığı Yerler

- Outlook sağ panel
- admin panel

## Not

Servis kapalıysa:

- admin panel açılmaz
- Outlook add-in paneli analiz yapamaz

Bu yüzden hem geliştirme hem demo sırasında servis penceresi açık kalmalıdır.
