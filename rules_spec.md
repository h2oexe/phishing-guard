# Balıkçı Rule Specification

## 1. Amaç
Bu doküman, Balıkçı MVP içinde kullanılacak phishing tespit kurallarını tanımlar. Her kural için amaç, tetiklenme koşulu, önerilen ağırlık, güven seviyesi ve açıklama metni belirtilmiştir.

Bu doküman implementasyon için referans alınmalı ve test sonuçlarına göre güncellenmelidir.

## 2. Ortak İlkeler
- Kurallar bağımsız çalışabilmelidir
- Her kural standart bir çıktı üretmelidir
- Tek bir düşük güvenli sinyal yüksek risk üretmemelidir
- Aynı anlama gelen kuralların gereksiz çift puan üretmesi önlenmelidir
- Tüm puanlar başlangıç önerisidir, test sonucuna göre kalibre edilmelidir

### 2.1 3 Haftalık MVP İçin Kural Kapsamı
İlk teslim için tüm kuralları aynı anda uygulamak gerekli değildir. 3 haftalık MVP için aşağıdaki çekirdek kural seti önerilir:

Zorunlu kurallar:
- `DOMAIN_LINK_MISMATCH`
- `DISPLAY_TARGET_MISMATCH`
- `SUSPICIOUS_TLD`
- `SHORTENER_LINK`
- `SUSPICIOUS_ATTACHMENT`
- `DOUBLE_EXTENSION`

Opsiyonel ama faydalı:
- `PHISHING_KEYWORDS`
- `IP_LINK`
- `URGENCY_LANGUAGE`
- `ACCOUNT_THREAT_LANGUAGE`
- `UNEXPECTED_ATTACHMENT_REQUEST`
- `PAYMENT_REQUEST_LANGUAGE`
- `BANK_CHANGE_LANGUAGE`
- `INVOICE_PRESSURE_LANGUAGE`

İkinci aşamaya bırakılabilir:
- Daha gelişmiş `LOOKALIKE_DOMAIN`

Not:
Lookalike domain tespiti değerlidir, ancak 3 haftalık projede entegrasyon ve temel doğruluk öncelikli olduğu için ilk teslimde basit veya opsiyonel tutulabilir.

## 3. Kural Çıktı Formatı
Her kural aşağıdaki gibi bir sonuç döndürmelidir:

```json
{
  "rule_id": "SHORTENER_LINK",
  "matched": true,
  "weight": 10,
  "confidence": "low",
  "reason": "Kısa link servisi kullanılıyor"
}
```

## 4. Kurallar

### 4.1 DOMAIN_LINK_MISMATCH

Amaç:
Gönderen domaini ile e-posta içindeki link domainleri arasında uyumsuzluk olup olmadığını kontrol etmek.

Tetiklenme koşulu:
- En az bir link domaini mevcutsa
- Link domaini gönderen domaini ile aynı değilse
- Link domaini güvenilir ilişkili domain listesinde değilse

Önerilen ağırlık:
- `10`

Güven seviyesi:
- `low`

Kullanıcı açıklaması:
- `Gönderen domaini ile link domaini uyuşmuyor`

Notlar:
- Bu kural tek başına güçlü phishing göstergesi sayılmamalıdır
- Kurumsal servis ekosistemlerinde sık false positive üretebilir

### 4.2 LOOKALIKE_DOMAIN

Amaç:
Gönderen domainine veya güvenilir kurumsal domainlere çok benzeyen sahte domainleri tespit etmek.

Tetiklenme koşulu:
- Link veya sender domaini güvenilir bir domaine çok benziyorsa
- Ancak tam eşleşmiyorsa
- Benzerlik kabul edilen eşik üzerindeyse

Önerilen ağırlık:
- `40`

Güven seviyesi:
- `high`

Kullanıcı açıklaması:
- `Güvenilir domaine benzeyen şüpheli domain bulundu`

Notlar:
- MVP için basit string benzerliği veya normalize edilmiş karşılaştırma yeterlidir
- Bu kural dikkatli test edilmelidir

### 4.3 DISPLAY_TARGET_MISMATCH

Amaç:
Kullanıcıya görünen link metni ile gerçek hedef link arasında anlamlı fark olup olmadığını kontrol etmek.

Tetiklenme koşulu:
- HTML veya body içinde görünen link metni çıkarılabiliyorsa
- Görünen değer ile gerçek host belirgin şekilde farklıysa

Önerilen ağırlık:
- `35`

Güven seviyesi:
- `high`

Kullanıcı açıklaması:
- `Görünen link ile gerçek hedef farklı`

Notlar:
- Bu kural phishing için güçlü sinyal kabul edilebilir

### 4.4 SUSPICIOUS_TLD

Amaç:
Riskli kabul edilen TLD'lerin kullanımını tespit etmek.

Tetiklenme koşulu:
- Link veya sender domaini riskli TLD listesinde ise

Önerilen başlangıç TLD listesi:
- `.ru`
- `.tk`
- `.xyz`
- `.top`
- `.click`

Önerilen ağırlık:
- `20`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `Şüpheli alan adı uzantısı bulundu`

Notlar:
- TLD tek başına kesin karar sebebi olmamalıdır

### 4.5 IP_LINK

Amaç:
Linkin doğrudan IP adresine gidip gitmediğini tespit etmek.

Tetiklenme koşulu:
- URL host alanı geçerli bir IP adresi ise

Önerilen ağırlık:
- `30`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `Link doğrudan IP adresine gidiyor`

### 4.6 SHORTENER_LINK

Amaç:
Kısa link servislerinin kullanımını tespit etmek.

Tetiklenme koşulu:
- Link domaini kısa link servisleri listesinde ise

Önerilen başlangıç listesi:
- `bit.ly`
- `tinyurl.com`
- `t.co`
- `goo.gl`

Önerilen ağırlık:
- `10`

Güven seviyesi:
- `low`

Kullanıcı açıklaması:
- `Kısa link servisi kullanılıyor`

Notlar:
- Tek başına phishing göstergesi değildir

### 4.7 SUSPICIOUS_ATTACHMENT

Amaç:
Şüpheli veya çalıştırılabilir attachment uzantılarını tespit etmek.

Tetiklenme koşulu:
- Ek dosya uzantısı riskli uzantılar listesinde ise

Önerilen başlangıç listesi:
- `.exe`
- `.scr`
- `.js`
- `.vbs`
- `.bat`
- `.cmd`
- `.ps1`
- `.docm`
- `.xlsm`

Önerilen ağırlık:
- `25`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `Şüpheli ek dosya bulundu`

### 4.8 DOUBLE_EXTENSION

Amaç:
Kullanıcıyı yanıltabilecek çift uzantılı dosya isimlerini tespit etmek.

Tetiklenme koşulu:
- Dosya isminde iki uzantı bulunuyorsa
- Son uzantı çalıştırılabilir veya riskli gruptaysa

Örnek:
- `invoice.pdf.exe`
- `document.docx.js`

Önerilen ağırlık:
- `35`

Güven seviyesi:
- `high`

Kullanıcı açıklaması:
- `Çift uzantılı ek dosya tespit edildi`

### 4.9 PHISHING_KEYWORDS

Amaç:
Phishing ile ilişkili sık kullanılan kelime ve ifadeleri tespit etmek.

Tetiklenme koşulu:
- Subject veya body içinde riskli anahtar kelime listesi eşleşirse

Önerilen başlangıç kelimeleri:
- `urgent`
- `verify`
- `password`
- `account`
- `login`
- `suspended`

Önerilen ağırlık:
- `8`

Güven seviyesi:
- `low`

Kullanıcı açıklaması:
- `Şüpheli ifadeler tespit edildi`

Notlar:
- Bu kural tek başına yüksek risk oluşturmamalıdır
- Dil çeşitliliği desteklenecekse çok dilli liste gerekir

### 4.10 URGENCY_LANGUAGE

Amaç:
Zaman baskısı oluşturan ve kullanıcıyı hızlı harekete zorlayan ifadeleri tespit etmek.

Tetiklenme koşulu:
- Subject veya body içinde aciliyet belirten ifade kalıpları bulunursa

Örnek ifadeler:
- `immediately`
- `within the next 24 hours`
- `act now`
- `acil`
- `hemen`
- `24 saat içinde`

Önerilen ağırlık:
- `15`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `Baskı ve zaman baskısı oluşturan ifadeler tespit edildi`

### 4.11 ACCOUNT_THREAT_LANGUAGE

Amaç:
Hesap kapatma, askıya alma veya güvenlik tehdidi dili kullanan metinleri tespit etmek.

Tetiklenme koşulu:
- Subject veya body içinde hesap tehdit dili içeren ifade kalıpları bulunursa

Örnek ifadeler:
- `account will be suspended`
- `temporarily locked`
- `suspicious login attempts`
- `hesabınız askıya alınacak`
- `şüpheli giriş`

Önerilen ağırlık:
- `18`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `Hesap güvenliği veya kapatma tehdidi içeren ifadeler bulundu`

### 4.12 UNEXPECTED_ATTACHMENT_REQUEST

Amaç:
Kullanıcıyı ek dosya açmaya veya indirmeye yönlendiren sosyal mühendislik dilini tespit etmek.

Tetiklenme koşulu:
- Subject veya body içinde ek açma/indirme talebi içeren ifade bulunursa

Örnek ifadeler:
- `open the attached file`
- `download and open the attached file`
- `attached file`
- `ekteki dosyayı açın`
- `eki açın`

Önerilen ağırlık:
- `20`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `Beklenmedik bir eki açma veya indirme talebi tespit edildi`

### 4.13 PAYMENT_REQUEST_LANGUAGE

Amaç:
Ödeme, fatura veya dekont talebi içeren metinleri tespit etmek.

Tetiklenme koşulu:
- Subject veya body içinde ödeme/fatura odaklı ifade kalıpları bulunursa

Örnek ifadeler:
- `payment`
- `invoice`
- `make your payment`
- `ödeme`
- `fatura`
- `dekontu gönderin`

Önerilen ağırlık:
- `18`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `Ödeme veya fatura talebi içeren ifadeler bulundu`

### 4.14 BANK_CHANGE_LANGUAGE

Amaç:
IBAN, SWIFT, hesap bilgisi veya banka değişikliği içeriklerini tespit etmek.

Tetiklenme koşulu:
- Subject veya body içinde banka hesabı değişikliği veya yeni ödeme bilgisi içeren ifadeler bulunursa

Örnek ifadeler:
- `updated bank details`
- `new iban`
- `new swift`
- `yeni iban`
- `hesap bilgilerimizde güncelleme`

Önerilen ağırlık:
- `22`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `IBAN, hesap veya banka bilgisi değişikliği bildirimi tespit edildi`

### 4.15 INVOICE_PRESSURE_LANGUAGE

Amaç:
Ödeme baskısı, gecikme tehdidi veya zaman sınırı oluşturan iş e-postası dolandırıcılığı dilini tespit etmek.

Tetiklenme koşulu:
- Subject veya body içinde kısa süre baskısı veya gecikme/hizmet tehdidi bulunursa

Örnek ifadeler:
- `within 24 hours`
- `late fee`
- `service interruption`
- `bugün içinde`
- `gecikme faizi`
- `hizmet kesintisi`

Önerilen ağırlık:
- `16`

Güven seviyesi:
- `medium`

Kullanıcı açıklaması:
- `Ödeme baskısı veya süre sınırı içeren ifadeler bulundu`

## 5. Kombinasyon Mantığı
Kurallar yalnızca puan toplamak için değil, birlikte değerlendirme için de kullanılmalıdır.

Önerilen kombinasyon örnekleri:
- `SHORTENER_LINK` tek başına: düşük risk
- `PHISHING_KEYWORDS` + `DOMAIN_LINK_MISMATCH`: düşük veya orta risk
- `LOOKALIKE_DOMAIN` + `DOUBLE_EXTENSION`: yüksek risk
- `DISPLAY_TARGET_MISMATCH` + `IP_LINK`: yüksek risk

## 6. Çakışma ve Fazla Puanlama Kontrolü
Aynı davranışı birden fazla kural temsil ediyorsa aşırı puanlamadan kaçınılmalıdır.

Örnek:
- Aynı link hem `SHORTENER_LINK` hem `DOMAIN_LINK_MISMATCH` hem `SUSPICIOUS_TLD` tetikleyebilir
- Bu durumda toplam puan mantıklı kalmalı, gerektiğinde üst sınır veya azaltıcı mantık eklenmelidir

## 7. Güvenli İstisnalar
Aşağıdaki alanlar yapılandırma ile desteklenmelidir:
- Şirketin güvenilir domain listesi
- Güvenilir servis domain listesi
- İlişkili domain eşleştirme listesi

Önemli not:
Bu listeler mutlak whitelist değildir. Güçlü sinyaller varsa kurallar yine tetiklenebilmelidir.

## 8. Kalibrasyon Süreci
Kuralların son hali ilk günden sabit kabul edilmemelidir.

Kalibrasyon adımları:
1. Örnek normal e-postalar toplanır
2. Örnek phishing e-postaları hazırlanır
3. Kurallar bu veri seti üzerinde çalıştırılır
4. Yanlış alarm üreten kurallar tespit edilir
5. Ağırlıklar ve eşikler güncellenir

### 8.1 Hızlı Kalibrasyon Planı
3 haftalık sürede uygulanabilir kalibrasyon planı:

1. İlk güncel ağırlıklarla sistemi çalıştır
2. 10 normal ve 10 şüpheli örnek üzerinde sonuçları topla
3. Çok sık false positive üreten düşük güvenli kuralların puanını düşür
4. Kaçırılan phishing örneklerinde orta ve yüksek güvenli kuralları gözden geçir
5. Son hafta eşikleri bir kez daha sade biçimde ayarla

## 9. İlk Yapılandırma Önerisi

```json
{
  "weights": {
    "DOMAIN_LINK_MISMATCH": 10,
    "LOOKALIKE_DOMAIN": 40,
    "DISPLAY_TARGET_MISMATCH": 35,
    "SUSPICIOUS_TLD": 20,
    "IP_LINK": 30,
    "SHORTENER_LINK": 10,
    "SUSPICIOUS_ATTACHMENT": 25,
    "DOUBLE_EXTENSION": 35,
    "PHISHING_KEYWORDS": 8,
    "URGENCY_LANGUAGE": 15,
    "ACCOUNT_THREAT_LANGUAGE": 18,
    "UNEXPECTED_ATTACHMENT_REQUEST": 20,
    "PAYMENT_REQUEST_LANGUAGE": 18,
    "BANK_CHANGE_LANGUAGE": 22,
    "INVOICE_PRESSURE_LANGUAGE": 16
  }
}
```

## 10. Uygulama Notu
İlk sürüm için kural seti küçük tutulmalı ve sade çalışmalıdır. Amaç mümkün olan en fazla kuralı eklemek değil, açıklanabilir ve test edilebilir bir temel oluşturmaktır.

### 10.1 Başlangıç İçin Önerilen Uygulama Sırası
Kural implementasyonu için önerilen sıra:

1. `SHORTENER_LINK`
2. `SUSPICIOUS_ATTACHMENT`
3. `DOUBLE_EXTENSION`
4. `SUSPICIOUS_TLD`
5. `DOMAIN_LINK_MISMATCH`
6. `DISPLAY_TARGET_MISMATCH`
7. `PHISHING_KEYWORDS`
8. `IP_LINK`
9. `LOOKALIKE_DOMAIN`

Bu sıra, önce kolay ve yüksek faydalı kuralları ayağa kaldırmayı hedefler.
