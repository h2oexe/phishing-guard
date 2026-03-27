# PhishGuard Rule Specification

## Amaç

Bu doküman, PhishGuard içinde çalışan güncel kural ailesini özetler. Kurallar admin panelden ağırlıklandırılabilir, devre dışı bırakılabilir ve bazıları özel kural olarak sonradan eklenebilir.

## Ortak İlkeler

- Tek bir zayıf sinyal yüksek risk üretmemelidir.
- Ham ağırlıklar doğrudan son kullanıcı skoruna çevrilmez.
- Son skor normalize edilir.
- Kullanıcıya teknik kural adı değil, anlaşılır açıklama gösterilir.

## Çekirdek Kurallar

### Domain ve bağlantı kuralları

- `DOMAIN_LINK_MISMATCH`
  Gönderen alan adı ile link alan adı uyuşmuyor.
- `DISPLAY_TARGET_MISMATCH`
  Görünen link ile gerçek hedef farklı.
- `SUSPICIOUS_TLD`
  Riskli uzantı kullanılıyor.
- `SHORTENER_LINK`
  Kısa link servisi kullanılıyor.
- `IP_LINK`
  Link doğrudan IP adresine gidiyor.

### Attachment kuralları

- `SUSPICIOUS_ATTACHMENT`
  Riskli uzantılı ek var.
- `DOUBLE_EXTENSION`
  Çift uzantılı ek var.
- `UNEXPECTED_ATTACHMENT_REQUEST`
  Beklenmedik ek açma/indirme talebi var.

### Metin ve sosyal mühendislik kuralları

- `PHISHING_KEYWORDS`
  Şüpheli kelime veya ifade bulundu.
- `URGENCY_LANGUAGE`
  Zaman baskısı var.
- `ACCOUNT_THREAT_LANGUAGE`
  Hesap kapatma / güvenlik tehdidi dili var.
- `PAYMENT_REQUEST_LANGUAGE`
  Ödeme talebi var.
- `BANK_CHANGE_LANGUAGE`
  IBAN / banka bilgisi değişikliği var.
- `INVOICE_PRESSURE_LANGUAGE`
  Fatura / süre baskısı var.
- `EXTORTION_LANGUAGE`
  Dosya şifreleme, erişim kaybı veya şantaj dili var.

## Özel Kurallar

Admin panelden eklenen her yeni etiket, gerekli ifadeler girildiğinde özel kural haline gelir.

Örnek:

- Etiket: `DENEME_ETIKET`
- Ağırlık: `12`
- İfade listesi:
  - `örnek cümle`
  - `deneme tetikleyici`

Bu durumda sistem bu ifadeleri mail içinde arar ve eşleşme olursa `DENEME_ETIKET` gerçek bir kural olarak skora katkı verir.

## Güven Seviyesi

Kurallar şu confidence seviyelerini kullanır:

- `low`
- `medium`
- `high`

Confidence bilgisi skor sınıflandırmasında ek koruma olarak kullanılır. Örneğin yüksek güvenli iki sinyal varsa skor belirli bir tabanın altına düşmez.

## Skor Mantığı

### Ham ağırlık

Her kural admin panelde ham ağırlık ile tutulur.

### Normalize skor

Son skor:

- eşleşen ham ağırlık toplamı
- aktif kuralların üst ağırlık bütçesi

kullanılarak `0-100` aralığına normalize edilir.

Bu nedenle:

- admin panelde ağırlıkların toplamı `100`'ü aşabilir
- kullanıcıya çıkan skor aşmaz

## Admin Panel Üzerinden Yönetilen Alanlar

- `rule_weights`
- `disabled_rules`
- `rule_chip_labels`
- `domains.*`
- `attachments.*`
- `phrases.*`
- `phrases.custom_rule_phrases`

## Kullanıcıya Gösterilen Yapı

Panel tarafında mümkün olduğunca teknik isim yerine sade etiket ve açıklama gösterilir.

Örnek:

- `EXTORTION_LANGUAGE`
  kullanıcıya `Dosya Şifreleme Tehdidi` olarak görünür

## Güncel Not

Yeni kural eklendiğinde sadece label listesinde kalmamalı; aynı kayıt:

- `Kural Motoru`
- `Kayıtlar`
- çalışma zamanı analiz akışı

içinde de görünür olmalıdır. Mevcut sistem bu davranışı destekleyecek şekilde güncellenmiştir.
