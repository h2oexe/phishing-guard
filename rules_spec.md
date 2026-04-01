# PhishGuard Rule Specification

## Amaç

Bu doküman, PhishGuard içinde çalışan güncel kural ailesini özetler. Kurallar admin panelden ağırlıklandırılabilir, devre dışı bırakılabilir ve bazıları özel kural olarak sonradan eklenebilir.

## Ortak İlkeler

- Tek bir zayıf sinyal yüksek risk üretmemelidir.
- Ham ağırlıklar doğrudan son kullanıcı skoruna çevrilmez.
- Son skor normalize edilir.
- Kullanıcıya teknik kural adı yerine anlaşılır etiket ve açıklama gösterilir.

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
  Beklenmedik ek açma veya indirme talebi var.

### Metin ve sosyal mühendislik kuralları

- `PHISHING_KEYWORDS`
  Şüpheli kelime veya ifade bulundu.
- `URGENCY_LANGUAGE`
  Zaman baskısı var.
- `ACCOUNT_THREAT_LANGUAGE`
  Hesap kapatma veya güvenlik tehdidi dili var.
- `PAYMENT_REQUEST_LANGUAGE`
  Ödeme talebi var.
- `BANK_CHANGE_LANGUAGE`
  IBAN veya banka bilgisi değişikliği var.
- `INVOICE_PRESSURE_LANGUAGE`
  Fatura veya süre baskısı var.
- `EXTORTION_LANGUAGE`
  Dosya şifreleme, erişim kaybı veya şantaj dili var.

### Kimlik doğrulama kuralları

- `SPF_FAIL`
  SPF doğrulaması başarısız.
- `SPF_SOFTFAIL`
  SPF zayıf sonuç verdi.
- `DKIM_FAIL`
  DKIM imzası doğrulanamadı.
- `DMARC_FAIL`
  DMARC doğrulaması ve hizalaması başarısız.

Bu kurallar mail header içindeki `Authentication-Results`, `ARC-Authentication-Results` ve `Received-SPF` satırlarından türetilir.

## Özel Kurallar

Admin panelden eklenen her yeni etiket, ilgili phrase listesi girildiğinde özel kural haline gelir.

Örnek:

- Etiket: `MEYVEETIKETI`
- Ağırlık: `12`
- İfade listesi:
  - `elma`
  - `muz`

Bu durumda sistem bu ifadeleri mail içinde arar ve eşleşme olursa `MEYVEETIKETI` gerçek bir kural olarak skora katkı verir.

## Güvenli Kurallar

Özel kural türü `Güvenli` olarak seçilebilir.

Bu durumda:

- eşleşme risk artırmaz
- istenirse “mailde geçmiyorsa riski artır” seçeneği açılabilir

Bu yaklaşım güvenli domain, güvenli IBAN veya kurum içi güven işaretleri gibi senaryolarda kullanılır.

## Güvenli Listeler

Admin panelden ayrıca şu listeler yönetilir:

- güvenilir kurum alan adları
- ilişkili güvenilir alan adları
- kısa link servisleri
- şüpheli TLD listesi
- phishing anahtar kelimeleri
- güvenli IBAN listesi

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

## Kullanıcıya Gösterilen Yapı

Panel tarafında mümkün olduğunca teknik isim yerine sade etiket ve panel açıklaması gösterilir.

Örnek:

- `EXTORTION_LANGUAGE`
  kullanıcıya `Şantaj Dili` veya yönetici tarafından verilen özel etiket adıyla görünebilir.

## Yönetilen Alanlar

Admin panelden yönetilen ana alanlar:

- `rule_weights`
- `disabled_rules`
- `rule_chip_labels`
- `rule_display_meta`
- `custom_rule_modes`
- `custom_rule_missing_policies`
- `domains.*`
- `attachments.*`
- `phrases.*`
