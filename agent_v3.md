# Balıkçı

## 1. Amaç
Balıkçı, Outlook içinde görüntülenen e-postaları hızlı şekilde analiz ederek phishing riski hakkında kullanıcıya ilk seviye karar desteği veren yerel bir güvenlik yardımcısıdır.

Sistem bir kurumsal güvenlik platformunun yerini almayı hedeflemez. Amaç, son kullanıcının şüpheli e-postaları daha hızlı fark etmesini sağlamak ve temel risk sinyallerini sade, açıklanabilir ve anlaşılır biçimde göstermektir.

## 2. Kapsam

### 2.1 Proje Kapsamında Olanlar
- Outlook içindeki seçili veya açılan e-postadan temel alanları okumak
- E-posta içeriğinden link ve ek dosya bilgilerini çıkarmak
- Kural tabanlı phishing sinyalleri üretmek
- 0-100 arası bir risk skoru hesaplamak
- Sonucu küçük ve sade bir kullanıcı panelinde göstermek
- Sonucun nedenlerini kısa açıklamalarla kullanıcıya sunmak

### 2.2 İlk Sürüm Kapsamında Olmayanlar
- Makine öğrenmesi tabanlı sınıflandırma
- Harici tehdit istihbaratı entegrasyonları
- Cloud servisleri veya üçüncü taraf API kullanımı
- Büyük ölçekli backend veya mikroservis mimarisi
- Gelişmiş raporlama ve yönetim ekranları

### 2.3 3 Haftalık MVP Kapsamı
Bu proje için teslim hedefi, 3 hafta içinde gösterilebilir ve uçtan uca çalışan bir MVP üretmektir.

3 haftalık MVP içinde zorunlu olarak bulunması gerekenler:
- Outlook içinden temel mail alanlarını okuyabilmek
- Mail body içinden linkleri çıkarabilmek
- Attachment isimlerini okuyabilmek
- En az 5 temel phishing kuralını çalıştırabilmek
- 0-100 arası risk skoru üretebilmek
- Kullanıcıya kısa nedenler gösterebilmek
- Sonucu basit ama anlaşılır bir arayüzde sunabilmek

3 haftalık MVP için ertelenebilecekler:
- Gelişmiş lookalike domain algoritmaları
- Karmaşık UI animasyonları veya zengin panel deneyimi
- Geniş whitelist ve istisna yönetim ekranları
- Otomatik öğrenen sistemler
- Gelişmiş raporlama ve geçmiş analiz ekranları

### 2.4 MVP Başarı Tanımı
İlk sürüm aşağıdaki koşullar sağlanıyorsa başarılı kabul edilmelidir:
- Seçili mail analiz edilebiliyor
- En az 5 kural çalışıyor
- Risk skoru ve risk seviyesi gösteriliyor
- Kullanıcı en az 2-3 neden görebiliyor
- En az 1 normal ve 1 phishing benzeri örnekte mantıklı sonuç üretiliyor

## 3. Temel Ürün İlkeleri
- Hızlı çalışmalı
- Açıklanabilir olmalı
- Yerel ortamda çalışmalı
- Kurulumu ve bakımı mümkün olduğunca basit olmalı
- İlk sürümde çalışan prototip öncelikli olmalı

## 4. Operasyonel Kısıtlar
Bu sistem şirket içi kullanım için tasarlanacaktır.

### 4.1 Zorunlu Kısıtlar
- İnternet bağlantısına bağımlı olmamalıdır
- E-posta içeriği cihaz dışına çıkmamalıdır
- Hiçbir analiz verisi dış sistemlere gönderilmemelidir
- Üçüncü taraf bulut API'leri kullanılmamalıdır
- Analiz tamamen yerel makinede veya şirket içi kapalı ağda yapılmalıdır

### 4.2 Mimariye Etkileri
- URL reputation servisleri kullanılamaz
- Harici sandbox servisleri kullanılamaz
- Cloud tabanlı model çağrıları yapılamaz
- Analiz mantığı kural tabanlı ve yerel çalışacak şekilde tasarlanmalıdır

## 5. Önerilen Mimari

### 5.1 Genel Yaklaşım
Mimari iki katmandan oluşmalıdır:

1. Outlook entegrasyon katmanı
2. Yerel analiz motoru

Outlook katmanı yalnızca e-posta verisini almalı, analizi tetiklemeli ve sonucu kullanıcıya göstermelidir. Asıl phishing tespit mantığı ayrı bir analiz modülünde çalışmalıdır.

### 5.2 Sorumluluk Dağılımı

#### Outlook Katmanı
- Mail subject bilgisini almak
- Sender bilgisini almak
- Sender email address bilgisini almak
- Body veya HTML body içeriğini almak
- Attachment isimlerini almak
- Mail seçildiğinde veya açıldığında analizi tetiklemek
- Sonucu panelde göstermek

#### Analiz Motoru
- Link çıkarımı yapmak
- Domain parsing yapmak
- Görünen link ile hedef linki karşılaştırmak
- Lookalike domain kontrolü yapmak
- Risk kurallarını çalıştırmak
- Risk skorunu hesaplamak
- Kullanıcıya gösterilecek kısa açıklamaları üretmek

### 5.3 Teknoloji Kararı
Outlook tarafında VBA kullanılabilir. Analiz motoru ise Python veya C# ile geliştirilebilir.

Tercih kriterleri:
- Eğer Outlook ile yakın entegrasyon ve dağıtım kolaylığı öncelikliyse C# daha uygun olabilir
- Eğer hızlı prototipleme ve metin işleme kolaylığı öncelikliyse Python daha uygun olabilir

Not: İlk teknik karar verilmeden önce şirket cihazlarında Python çalıştırma, ek runtime kurma ve güvenlik politikaları doğrulanmalıdır. Bu konu proje riski olarak ele alınmalıdır.

## 6. Hedef Kullanıcı Akışı
1. Kullanıcı Outlook içinde bir e-posta seçer veya açar
2. Outlook entegrasyonu gerekli mail alanlarını toplar
3. Analiz motoru e-postayı işler
4. Sistem risk skorunu ve risk seviyesini hesaplar
5. Sonuç küçük panelde gösterilir
6. Kullanıcı isterse detay nedenleri görüntüler

## 7. Fonksiyonel Gereksinimler

### 7.1 E-posta Verisi Alma
Sistem aşağıdaki alanları okuyabilmelidir:
- Sender
- Sender domain
- Subject
- Body veya HTML body
- Mail içindeki linkler
- Attachment isimleri

### 7.2 Feature Extraction
Sistem aşağıdaki sinyalleri çıkarabilmelidir:
- Gönderen domaini
- Body içindeki link domainleri
- Görünen link ile gerçek hedef farkı
- Şüpheli TLD kullanımı
- Linkin IP adresine gitmesi
- Kısa link servisi kullanımı
- Riskli attachment uzantıları
- Çift uzantılı dosya isimleri
- Phishing ile ilişkili anahtar kelimeler

### 7.3 Kural Motoru
İlk sürümde aşağıdaki kontroller desteklenmelidir:
- Gönderen domaini ile link domainleri arasında uyumsuzluk
- Gönderen domaine benzeyen sahte domain şüphesi
- Görünen link ile gerçek hedef adres arasında fark
- Şüpheli TLD kullanımı
- Linkin doğrudan IP adresine gitmesi
- Kısa link servisi kullanımı
- Şüpheli attachment uzantısı bulunması
- Çift uzantılı attachment bulunması
- Konu veya gövdede phishing anahtar kelimeleri bulunması

### 7.4 Risk Skoru
- Her kural önceden tanımlı bir ağırlık taşımalıdır
- Kurallar tetiklendiğinde toplam puana katkı sağlamalıdır
- Nihai skor 0-100 aralığında normalize edilmelidir
- Sonuç üç seviyeye ayrılmalıdır:
  - 0-29: Düşük Risk
  - 30-59: Orta Risk
  - 60-100: Yüksek Risk

Not: Kural ağırlıkları yapılandırılabilir olmalı ve mümkünse ayrı bir config dosyasında tutulmalıdır.

### 7.5 Açıklanabilir Sonuç
Sistem yalnızca skor göstermemelidir. Kullanıcıya kısa nedenler de göstermelidir.

Örnek nedenler:
- Gönderen domaini ile link domaini uyuşmuyor
- Şüpheli TLD bulundu
- Şüpheli ek dosya bulundu
- Phishing anahtar kelimeleri tespit edildi

## 8. Kullanıcı Arayüzü Gereksinimleri

### 8.1 Panel Davranışı
- Mail seçildiğinde veya açıldığında panel açılmalı veya güncellenmelidir
- İlk görünüm sade olmalıdır
- Kullanıcı gereksiz teknik detayla karşılaşmamalıdır

### 8.2 Panel İçeriği
- Uygulama adı
- Risk seviyesi
- Kısa güvenlik mesajı
- Analiz skoru
- Progress bar veya eşdeğer görsel gösterim
- Kısa özet etiketleri
- Detay görüntüleme butonu

### 8.3 Detay Görünümü
Detay görünümünde aşağıdaki alanlar gösterilebilir:
- Gönderen domain
- Link domainleri
- Domain uyumsuzluğu sonucu
- Şüpheli TLD sonucu
- Kısa link sonucu
- IP adresli link sonucu
- Attachment sonucu
- Anahtar kelime sonucu

### 8.4 Risk Renkleri
- Düşük Risk: yeşil
- Orta Risk: sarı veya turuncu
- Yüksek Risk: kırmızı

## 9. UI Metin Örnekleri

### 9.1 Düşük Risk
- Başlık: Düşük Risk
- Alt metin: Güvendesiniz
- Özet etiket örnekleri:
  - Güvenli Gönderen
  - Linkler Temiz
  - Şüpheli Ek Yok

### 9.2 Orta Risk
- Başlık: Orta Risk
- Alt metin: Dikkatli olun
- Özet etiket örnekleri:
  - Şüpheli Kelimeler
  - Link Uyuşmazlığı

### 9.3 Yüksek Risk
- Başlık: Yüksek Risk
- Alt metin: Bu e-posta phishing olabilir
- Özet etiket örnekleri:
  - Sahte Domain Şüphesi
  - Şüpheli Ek
  - IP Adresli Link

## 10. Teknik Riskler ve Tasarım Notları

### 10.1 Kritik Riskler
- Outlook ile analiz motoru arasındaki entegrasyon karmaşık olabilir
- Şirket güvenlik politikaları harici runtime kurulumunu sınırlayabilir
- Fazla agresif kurallar yüksek false positive üretebilir
- Yetersiz kural seti false negative riskini artırabilir

### 10.2 Tasarım İlkeleri
- Hiçbir tekil kural nihai karar mantığı gibi ele alınmamalıdır
- Meşru e-postalarda da farklı link domainleri bulunabileceği kabul edilmelidir
- Skor mantığı test verileriyle gözden geçirilmelidir
- Kullanıcıya gösterilen açıklamalar sade Türkçe ile yazılmalıdır

## 11. False Positive Yönetimi
Phishing tespitinde false positive tamamen sıfırlanamaz. Bu nedenle sistemin amacı, şüpheli sinyalleri erken göstermek ve gereksiz alarm oranını mümkün olduğunca azaltmaktır.

### 11.1 Temel Yaklaşım
- Tek bir zayıf sinyal nedeniyle yüksek risk kararı verilmemelidir
- Kurallar güven seviyelerine göre sınıflandırılmalıdır
- Nihai karar yalnızca toplam skorla değil, sinyal kombinasyonlarıyla da desteklenmelidir
- Meşru kurumsal kullanım senaryoları dikkate alınmalıdır

### 11.2 Kural Güven Seviyeleri

#### Düşük Güvenli Sinyaller
Bu sinyaller tek başına phishing göstergesi sayılmamalıdır:
- Phishing anahtar kelimeleri
- Kısa link kullanımı
- Gönderen domaini ile link domaininin farklı olması

#### Orta Güvenli Sinyaller
Bu sinyaller dikkat gerektirir ancak bağlamla birlikte değerlendirilmelidir:
- Şüpheli TLD kullanımı
- Linkin doğrudan IP adresine gitmesi
- Beklenmedik attachment uzantıları

#### Yüksek Güvenli Sinyaller
Bu sinyaller yüksek risk değerlendirmesinde daha güçlü ağırlık taşımalıdır:
- Görünen link ile gerçek hedefin belirgin şekilde farklı olması
- Lookalike domain tespiti
- Çift uzantılı attachment bulunması

### 11.3 Karar Kuralları
- Tek bir düşük güvenli sinyal yüksek risk üretmemelidir
- Yüksek risk için en az bir yüksek güvenli sinyal veya birden fazla orta güvenli sinyal birlikte aranmalıdır
- Zayıf sinyaller yalnızca destekleyici etki yapmalıdır

Örnek değerlendirme mantığı:
- Sadece kısa link bulunması: bilgilendirici uyarı veya düşük risk
- Anahtar kelime ve domain farkı birlikte bulunması: düşük veya orta risk
- Lookalike domain ve çift uzantılı attachment birlikte bulunması: yüksek risk

### 11.4 Güvenli İstisnalar ve Bağlam
Sistem bazı meşru senaryoları dikkate almalıdır:
- Şirketin bilinen domainleri
- Kurum içinde sık kullanılan güvenilir servisler
- Yaygın kurumsal servis domainleri

Önemli not:
Güvenli görülen domainler mutlak whitelist gibi ele alınmamalıdır. Bu alanlar yalnızca bazı kuralların etkisini azaltmak için kullanılmalıdır. Güçlü phishing sinyalleri varsa sistem yine risk üretebilmelidir.

### 11.5 Domain Uyumsuzluğu Yorumu
Gönderen domaini ile link domaininin farklı olması tek başına güçlü bir risk sinyali değildir. Meşru e-postalarda da farklı ama ilişkili domainler bulunabilir.

Bu nedenle sistem aşağıdaki ayrımı yapmaya çalışmalıdır:
- Link domaini tamamen alakasız mı
- Link domaini aynı servis ekosistemine mi ait
- Link domaini lookalike şüphesi taşıyor mu

### 11.6 Skor Kalibrasyonu
Kural ağırlıkları sabit kabul edilmemelidir. Test verileri üzerinden gözden geçirilerek düzenlenmelidir.

Örnek başlangıç puanları:
- Anahtar kelime bulundu: +8
- Kısa link bulundu: +10
- Link domain uyumsuzluğu: +10
- Şüpheli TLD: +20
- IP adresli link: +30
- Çift uzantılı attachment: +35
- Lookalike domain: +40

Bu puanlar yalnızca başlangıç amaçlıdır. İlk testlerden sonra false positive oranına göre güncellenmelidir.

### 11.7 Kullanıcı Mesajlama İlkesi
Sistem kesin hüküm veren bir ton kullanmamalıdır. Sonuç mesajları temkinli ve açıklayıcı olmalıdır.

Örnek mesajlar:
- Şüpheli sinyaller bulundu
- Dikkatli olun
- Ek doğrulama önerilir
- Bu e-posta phishing olabilir

### 11.8 Ölçüm ve İyileştirme
False positive oranını azaltmak için aşağıdaki ölçümler takip edilmelidir:
- Hangi normal e-postalar yanlış alarm üretiyor
- Hangi kural en fazla gereksiz alarm oluşturuyor
- Hangi phishing örnekleri kaçırılıyor
- Mevcut skor eşikleri çok hassas veya çok gevşek mi çalışıyor

Bu sonuçlara göre:
- Kural ağırlıkları güncellenmeli
- Bazı kuralların etkisi azaltılmalı veya artırılmalı
- Risk eşikleri yeniden kalibre edilmelidir

## 12. Başarı Ölçütleri
İlk sürüm için başarı aşağıdaki şekilde ölçülebilir:
- Sistem örnek e-postaları hatasız okuyabiliyor olmalı
- Temel link ve ek dosya sinyallerini çıkarabiliyor olmalı
- Kural çıktıları açıklanabilir biçimde üretilebiliyor olmalı
- Kullanıcı paneli 1-2 saniye içinde sonuç gösterebiliyor olmalı
- Hazırlanan örnek veri setinde şüpheli ve normal e-postalar arasında anlamlı ayrım yapabiliyor olmalı

## 13. Test Stratejisi
İlk sürüm için en az aşağıdaki test veri grupları hazırlanmalıdır:
- Normal kurumsal e-postalar
- Phishing benzeri e-postalar
- Kısa link içeren e-postalar
- Attachment içeren e-postalar
- Görünen ve gerçek linki farklı olan e-postalar

Testlerde şu sorulara bakılmalıdır:
- Hangi kurallar doğru tetikleniyor
- Hangi normal e-postalar yanlış alarm üretiyor
- Hangi phishing örnekleri kaçırılıyor
- Skor dağılımı anlaşılır ve tutarlı mı

### 13.1 Minimum Test Veri Seti
3 haftalık MVP için aşağıdaki minimum veri seti önerilir:
- 10 normal e-posta örneği
- 10 şüpheli veya phishing benzeri e-posta örneği
- En az 3 attachment içeren örnek
- En az 3 kısa link içeren örnek
- En az 3 görünen ve gerçek linki farklı örnek

Bu veri seti ilk kalibrasyon için yeterlidir. Daha büyük veri seti varsa tercih edilmelidir.

## 14. Geliştirme Önceliği
1. Mail verisini alma
2. Link ve attachment çıkarma
3. Kural motoru
4. Risk skoru
5. Sonuçların metin olarak gösterilmesi
6. Küçük panel arayüzü
7. Detay görünümü

### 14.1 3 Haftalık Uygulama Planı

#### Hafta 1
Amaç: analiz motorunun Outlook'tan bağımsız çalışır hale gelmesi

- Input ve output veri modellerini oluştur
- Örnek mail verileri ile çalışan yerel analiz akışını kur
- Link çıkarma mantığını yaz
- Attachment analizi mantığını yaz
- İlk temel kural setini ekle
- JSON sonuç üreten çalışan prototipi tamamla

Hafta 1 sonunda beklenen çıktı:
- Outlook entegrasyonu olmadan çalışan bir analyzer prototipi

#### Hafta 2
Amaç: skorlamayı, açıklamaları ve test kalibrasyonunu oturtmak

- Skor hesaplama katmanını tamamla
- Risk seviyesi eşiklerini belirle
- False positive azaltmak için temel istisnaları ekle
- Test veri setiyle kuralları çalıştır
- Yanlış alarm üreten ağırlıkları güncelle
- Sonuçları kullanıcıya gösterilecek sade metinlere dönüştür

Hafta 2 sonunda beklenen çıktı:
- Tutarlı skor ve açıklama üreten test edilmiş analyzer motoru

#### Hafta 3
Amaç: Outlook entegrasyonu ve demo akışını tamamlamak

- Outlook tarafında mail verisini alma akışını bağla
- Analizi mail seçildiğinde veya açıldığında tetikle
- Sonucu basit panel, form veya okunur çıktı alanında göster
- Demo için normal ve phishing örneği senaryolarını hazırla
- Uçtan uca test yap

Hafta 3 sonunda beklenen çıktı:
- Demo yapılabilecek, uçtan uca çalışan MVP

## 15. Kodlama Yönergeleri
- Önce çalışan basit sürüm geliştirilmeli
- Her modül tek sorumluluk taşımalı
- Kural isimleri açık olmalı
- Risk nedenleri sade Türkçe ile üretilmeli
- Sabit puanlar config dosyasına taşınmalı
- Gereksiz soyutlamadan kaçınılmalı
- Kod okunabilir ve modüler olmalı

## 16. Örnek Çıktı Formatı

```json
{
  "score": 72,
  "level": "High Risk",
  "summary": "Bu e-posta phishing olabilir",
  "matched_rules": [
    "DOMAIN_MISMATCH",
    "SUSPICIOUS_TLD",
    "DOUBLE_EXTENSION"
  ],
  "reasons": [
    "Gönderen domaini ile link domaini uyuşmuyor",
    "Şüpheli TLD bulundu",
    "Çift uzantılı ek dosya tespit edildi"
  ]
}
```

## 17. Önerilen Klasör Yapısı

### Seçenek A: Katmanlı Yapı
```text
project/
|-- outlook/
|   `-- vba_integration/
|-- analyzer/
|   |-- parser/
|   |-- extractor/
|   |-- rules/
|   |-- scorer/
|   `-- utils/
|-- ui/
|   `-- panel/
`-- docs/
```

### Seçenek B: Daha Sade Yapı
```text
phishguard/
|-- main.py
|-- parser.py
|-- extractor.py
|-- rules.py
|-- scorer.py
|-- utils.py
`-- sample_emails/
```

İlk prototip için sade yapı tercih edilebilir. Kod tabanı büyüdüğünde katmanlı yapıya geçilebilir.

## 18. Sonuç
Bu proje için önerilen yaklaşım şudur:
- Outlook tarafı hafif kalmalıdır
- Analiz motoru sade ve hızlı olmalıdır
- Kullanıcıya küçük, anlaşılır ve güven veren bir panel sunulmalıdır
- Sistem karar desteği sağlamalı, nihai güvenlik kararı veren tek otorite gibi davranmamalıdır

Bu doküman bir MVP ve teknik yön belirleme belgesi olarak kullanılabilir. Uygulamaya geçmeden önce özellikle entegrasyon yöntemi, teknoloji seçimi ve test veri seti netleştirilmelidir.
