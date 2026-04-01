# PhishGuard Proje Özeti

Bu dosya, proje sunumu veya hızlı iç onboarding için kısa özet niteliğindedir.

## Projenin Amacı

PhishGuard, Outlook içinde açılan veya seçilen e-postaları yerel olarak analiz ederek phishing, ödeme dolandırıcılığı ve sosyal mühendislik risklerini kullanıcıya sade biçimde göstermeyi amaçlar.

## Kullanıcıya Görünen İki Ana Katman

### 1. Outlook renkli risk çubuğu

- VBA ile çalışır
- mail seçildiğinde otomatik analiz olur
- sonuç Outlook kategorisi olarak görünür

### 2. Outlook sağ panel

- add-in ile çalışır
- detaylı skor, açıklama ve işaretleri gösterir
- admin panelden yönetilen etiket ve panel açıklamalarını kullanır

## Yönetim Tarafı

Admin panel üzerinden:

- kural ağırlıkları
- etiketler
- panel açıklamaları
- phrase ve domain listeleri
- güvenli kurallar
- güvenli IBAN listesi
- parola koruması
- değişiklik geçmişi

yönetilebilir.

## Teknik Not

- analiz tamamen yerelde çalışır
- çalışan config `data/runtime_config.json` içindedir
- Outlook VBA ve add-in birlikte kullanıldığında en güçlü masaüstü deneyimi elde edilir
