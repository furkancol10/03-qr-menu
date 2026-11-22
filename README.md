# QR Menü

Kafe ve restoranlar için **üyeliksiz, 360px mobil öncelikli QR menü**, sepetten masa numaralı WhatsApp siparişi ve kategori/ürün/masa yönetim paneli.

## Özellikler

- **Müşteri menüsü (`/[slug]?masa=KOD`):** Kategori çubuğu, ürün görselleri (WebP + lazy load), kuruş hassasiyetli TL fiyatlar, alerjen etiketleri ve "Tükendi" durumu
- **TR / EN dil geçişi:** Arayüz sözlüğü (`src/lib/i18n/{tr,en}.ts`) + veritabanında satır içi TR/EN alanlar (`en` boşsa `tr` fallback)
- **Sepet ve WhatsApp siparişi:** Svelte 5 runes + `localStorage` sepeti; `tables` tablosundan doğrulanan masa etiketi, ürün adetleri ve TL toplamı ile `https://wa.me/{phone}?text=...` linki (sipariş DB'ye yazılmaz)
- **Yönetim paneli (`/admin`):** Argon2id + DB oturumlu giriş, Postgres tabanlı atomik hız sınırı, kategori/ürün/masa CRUD, tek tıkla "Tükendi" işareti
- **Görsel yönetimi:** Gerçek işletmelerde istemci tarafı WebP sıkıştırma + Vercel Blob (`≤1 MB`) ve HTTPS URL; demo işletmede yükleme kapalı, yalnız `static/demo/*.webp` hazır galerisinden seçim
- **QR üretimi & A4 baskı:** Her aktif masa için vektörel SVG ve indirilebilir PNG QR kodu + `@media print` A4 kesilebilir masa kartları
- **Barındırma ve demo sıfırlama:** Vercel (`fra1`) + Neon Postgres; `vercel-build` ile otomatik migration + idempotent demo seed; gece `/api/demo-reset` (GitHub Actions cron)

## Yerel kurulum

Gereksinimler: Node.js 22+, Docker.

```bash
npm install
cp .env.example .env
npm run db:start      # Postgres 17 (Docker, host port 5434)
npm run db:migrate
npm run db:seed       # Defne Kafe & Fırın (/demo-kafe, 4 kategori, 16 ürün, 8 masa)
npm run dev
```

Demo menü: `http://localhost:5173/demo-kafe?masa=5` · Yönetim paneli: `/admin/login`

| Komut | Açıklama |
| --- | --- |
| `npm run check` | SvelteKit tip ve bileşen denetimi |
| `npm run lint` | Prettier + ESLint |
| `npm test` | Birim + gerçek Postgres entegrasyon testleri (kiracı izolasyonu dahil) |
| `npm run test:e2e` | 360px Playwright uçtan uca testleri |
| `npm run build` | Üretim derlemesi (`adapter-vercel`, `fra1`) |
| `npm run db:generate` | Drizzle şemasından SQL migration üretir |

## Demo giriş bilgileri (kurgusal)

- E-posta: `demo@defnekafe.example`
- Şifre: `demo-1234`

Mimari kararlar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## English summary

A sign-up-free, 360px mobile-first QR menu for cafes and restaurants built with SvelteKit 3 + Svelte 5, TypeScript, Drizzle ORM, Postgres, Tailwind v4, Zod, and `qrcode`. Customers scan a table QR (`/[slug]?masa=CODE`), browse localized TR/EN categories and items (with allergens, sold-out flags, and WebP photos), manage a `localStorage` cart, and place orders directly via a pre-filled WhatsApp (`wa.me`) message including table label and TL total. The admin panel provides Argon2id + DB-session auth, Postgres-backed rate limiting, tenant-isolated CRUD for categories/items/tables, SVG/PNG QR downloads with an A4 printable card grid, and Vercel Blob uploads disabled on the public demo tenant.
