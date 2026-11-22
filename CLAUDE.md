# QR Menü (portföy)
## Amaç
Kafe/restoranlar için QR ile açılan mobil menü, sepetten WhatsApp siparişi ve ürün/fiyat yönetim paneli.
## Stack
TBD (mimari kararından sonra yazılır; ön tercih randevu-sistemi ile aynı: SvelteKit 3 + PostgreSQL, Vercel + Neon DB)
## Komutlar
- test: TBD
- build: TBD
## Model rolleri
Bu projede geliştirici ve mimari taslakçı Gemini Neon (kullanıcı kararı 2026-11-22). Claude (şef) yalnız iskelet, test koşturma ve commit yapar. Gemini commit atmaz.
## Kurallar
- Kuralları yalnızca CLAUDE.md'de düzenle (AGENTS.md/GEMINI.md symlink).
- Mimari karar onaylanıp docs/ARCHITECTURE.md'ye yazılmadan uygulama kodu yazılmaz.
- Test: yeni davranış ve hata düzeltmesinde testi uygulamadan önce çalıştır ve FAIL gör; yalnız-mock ya da totolojik test yazma.
- Her görevin bir "bitti ne zaman" satırı olur.
- Türkçe arayüz (+İngilizce menü dili), 360px mobilde çalışır; demo verisi kurgusal (gerçek işletme adı yok).
- .env ve sırlar repoya girmez. Push'u yalnızca kullanıcı yapar.
## Bitti tanımı
Görevin "bitti ne zaman" koşulu doğrulandı (kabul testi geçer), madde BACKLOG'dan CHANGELOG'a taşındı.
## Bağlantılar
- docs/NOTES.md | docs/ARCHITECTURE.md | docs/BACKLOG.md | docs/CHANGELOG.md | docs/CONSTANTS.md | reports/
