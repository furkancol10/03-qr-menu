# QR Menü — Mimari Taslağı

Kaynaklar: [NOTES.md](file:///home/pcf/Desktop/projeler/freelance/portfolyo/03-qr-menu/docs/NOTES.md) · [ARCHITECTURE.md](file:///home/pcf/Desktop/projeler/freelance/portfolyo/fc-randevu-sistemi/docs/ARCHITECTURE.md)

1. **Stack ayrıntısı**
   - **Seçim:** `fc-randevu-sistemi` çekirdeği aynen kullanılır: SvelteKit 3 + Svelte 5 (runes), TypeScript, `adapter-vercel`, Drizzle ORM + `postgres.js` (Neon Frankfurt pooled, `prepare: false`), Zod, Tailwind v4, Vitest + Playwright; ek olarak yalnızca `qrcode`.
   - **Gerekçe:** Önceki onaylı mimariyle tam tutarlılık portföy kalitesini yükseltir ve 1-2 günlük MVP hızını korur; randevuya özgü `date-fns` elenir.
   - **Reddedilen:** Next.js veya Supabase (yığın parçalanması ve ek kurulum yükü).

2. **Veri modeli**
   - **Seçim:** Paylaşımlı şema, her alt tabloda `business_id` FK: `businesses(id, slug unique, name, whatsapp_phone, logo_url, settings jsonb)`, `admins`, `sessions`, `rate_limits`, `categories(id, business_id, name_tr, name_en, sort_order, active)`, `items(id, business_id, category_id, name_tr, name_en, desc_tr, desc_en, price_kurus int, allergens text[], image_url, available bool, sort_order)`, `tables(id, business_id, code, label, active)` (`unique(business_id, code)`).
   - **Gerekçe:** `price_kurus` kayan nokta hatalarını önler; `sort_order` menü sıralamasını, `tables` ise geçerli masa doğrulamasını ve toplu QR üretimini destekler.
   - **Reddedilen:** Kiracı başına ayrı şema (Neon Free bakım yükü) ve `float` fiyat.

3. **Çeviri yaklaşımı**
   - **Seçim:** Sabit arayüz metinleri için tip-güvenli `src/lib/i18n/{tr,en}.ts` sözlüğü; veritabanında satır içi `name_tr`/`name_en` ve `desc_tr`/`desc_en` sütunları (`en` boşsa `tr` fallback).
   - **Gerekçe:** İki dil için ek `JOIN` olmadan tek sorguda menü yüklenir ve admin formunda TR/EN yan yana düzenlenir.
   - **Reddedilen:** Ayrı `translations` tablosu veya Paraglide/i18next (MVP için gereksiz karmaşıklık).

4. **Görsel depolama (0 TL)**
   - **Seçim:** **Vercel Blob** (istemci tarafı WebP sıkıştırma, ≤1 MB) + harici HTTPS URL yapıştırma; demo seed görselleri `static/demo/` altında statik WebP. *(Not: Güncel Vercel Blob Hobby ücretsiz kotası kurulumda doğrulanmalı; açık demo modunda spam/kota riskine karşı hazır galeri veya düşük dosya sınırı + gece temizliği uygulanır.)*
   - **Gerekçe:** Gerçek işletmeye doğrudan fotoğraf yükleme deneyimi sunarken statik demo varlıkları bant genişliğini korur.
   - **Reddedilen:** Yalnızca manuel URL girişi (kafe sahibi için zayıf UX) veya S3/Cloudinary (ek servis/anahtar yönetimi).

5. **Sepet ve WhatsApp sipariş mesajı**
   - **Seçim:** Svelte 5 runes + `localStorage` sepeti; `?masa=5` parametresi `tables` ile doğrulanır ve `https://wa.me/{phone}?text=...` ile masa no, ürün/adetler ve TL toplamı açılır. **Sipariş DB'ye yazılmaz.**
   - **Gerekçe:** Canlı mutfak ekranı/bildirim olmadan DB'de sipariş tutmak yanlış beklenti ve spam yüzeyi oluşturur; kafe siparişi doğrudan WhatsApp'tan alır.
   - **Reddedilen:** `orders` tablosu ve admin sipariş takibi (1-2 gün kapsamını aşar).

6. **QR üretimi ve yazdırılabilir çıktı**
   - **Seçim:** `qrcode` ile `/{slug}?masa={code}` için vektörel SVG ve indirilebilir PNG; toplu baskı için adminde `@media print` A4/kart ızgarası (`window.print()` → PDF/yazıcı).
   - **Gerekçe:** Sunucuda ağır PDF motoru çalıştırmadan Vercel Hobby sınırlarında kalır ve her boyutta keskin baskı verir.
   - **Reddedilen:** Sunucu taraflı Puppeteer/PDFKit (bundle boyutu ve soğuk başlatma maliyeti).

7. **Admin girişi**
   - **Seçim:** `fc-randevu-sistemi` deseni aynen korunur: e-posta + `@node-rs/argon2`, DB `sessions`, `httpOnly/SameSite=Lax/Secure` çerez, Postgres `rate_limits`, tüm sorgularda `session.business_id` filtresi; herkese açık demoda hazır doldurulmuş giriş + GitHub Actions cron → korumalı `/api/demo-reset`.
   - **Gerekçe:** Önceki projedeki kanıtlanmış güvenlik mimarisini yeniden kullanmak hata riskini ve süreyi azaltır.
   - **Reddedilen:** Auth.js veya harici kimlik sağlayıcı (gereksiz soyutlama).

8. **Performans ve önbellek**
   - **Seçim:** `/[slug]` sayfasında tek birleşik Drizzle sorgusu, Edge `Cache-Control: public, s-maxage=30, stale-while-revalidate=300`, WebP + `loading="lazy"`, 360px mobil-öncelikli hafif DOM.
   - **Gerekçe:** Edge önbelleği Neon Free soğuk uyanmasını maskeler; 30 sn tazelik ise tükendi/fiyat güncellemelerini hızla yansıtır.
   - **Reddedilen:** Tam SSG (tükendi anlık güncellenmez) veya Redis/Upstash (ek servis).

9. **Klasör yapısı ve kabul testleri**
   - **Seçim:** `src/lib/server/{db,auth,menu,blob}` · `src/lib/{i18n,cart.svelte.ts,whatsapp.ts,qr.ts}` · `src/routes/[slug]` · `src/routes/admin/{login,categories,items,tables,qr}` · `src/routes/api/demo-reset` · `drizzle/` · `scripts/seed.ts` · `tests/{unit,integration}` · `e2e/`.
     - *Kiracı izolasyonu (gerçek Postgres):* Given A admini, Expect B'nin kategori/ürün/masasını değiştiremez (403/404; filtre kalkınca FAIL).
     - *Sepet/WhatsApp (birim):* Given 2×8550 + 1×12000 kuruş ve `masa=5`, Expect `291,00 TL` encoded `wa.me` linki; `available=false` ürün eklenemez.
     - *Çeviri fallback (birim):* Given `lang=en` ve `name_en=null`, Expect `name_tr`.
     - *E2E (360px):* Given `/demo-kafe?masa=5`, Expect TR/EN geçişi, sepet, doğru masa nolu WhatsApp linki; admin "tükendi" işaretleyince müşteri tarafı devre dışı kalır.
   - **Gerekçe:** Gerçek Postgres ve 360px E2E testleri veri sızıntısı ile mobil akış kırılmalarını doğrudan yakalar.
   - **Reddedilen:** Yalnızca mock-DB testleri (SQL ve yetki hatalarını gizler).

10. **Riskler ve MVP dışı**
    - **Seçim:** Riskler: açık demo admine spam/uygunsuz içerik (önlem: `rate_limits`, demo yükleme kısıtı, gece sıfırlama), Vercel Blob kota teyidi (belirsiz nokta), 30 sn önbellek gecikmesi. **MVP dışı:** online ödeme, DB sipariş/mutfak ekranı, ürün varyant/ekstra seçenekleri, garson çağırma, çok şube, self-servis kayıt, analitik, 3+ dil.
    - **Gerekçe:** Dar kapsam ve demo korumaları 1-2 günde kesintisiz sergilenebilir bir ürün sağlar.
    - **Reddedilen:** Varyant/sipariş takibi gibi v2 işlerini MVP'ye eklemek (teslim ve bakım riskini katlar).
