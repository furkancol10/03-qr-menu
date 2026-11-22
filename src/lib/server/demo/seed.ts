import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { DEMO_ADMIN, DEMO_SLUG } from '../../demo';
import type { Db } from '../db/client';
import { admins, businesses, categories, items, tables } from '../db/schema';

export { DEMO_SLUG };

type SeedItem = {
	nameTr: string;
	nameEn: string;
	descTr: string;
	descEn: string;
	priceKurus: number;
	allergens: string[];
	imageUrl: string;
	available?: boolean;
};

type SeedCategory = {
	nameTr: string;
	nameEn: string;
	items: SeedItem[];
};

const DEMO_MENU: SeedCategory[] = [
	{
		nameTr: 'Sıcak İçecekler',
		nameEn: 'Hot Drinks',
		items: [
			{
				nameTr: 'Türk Kahvesi',
				nameEn: 'Turkish Coffee',
				descTr: 'Geleneksel orta kavrum, lokum ile servis edilir.',
				descEn: 'Traditional medium roast, served with Turkish delight.',
				priceKurus: 7500,
				allergens: [],
				imageUrl: '/demo/turk-kahvesi.webp'
			},
			{
				nameTr: 'Flat White',
				nameEn: 'Flat White',
				descTr: 'Çift shot espresso ve kadifemsi mikro köpük süt.',
				descEn: 'Double shot espresso with velvety microfoam milk.',
				priceKurus: 11500,
				allergens: ['sut'],
				imageUrl: '/demo/flat-white.webp'
			},
			{
				nameTr: 'Filtre Kahve',
				nameEn: 'Filter Coffee',
				descTr: 'Günlük taze demlenen Kolombiya çekirdekleri.',
				descEn: 'Freshly brewed daily Colombian single-origin beans.',
				priceKurus: 9500,
				allergens: [],
				imageUrl: '/demo/filtre-kahve.webp'
			},
			{
				nameTr: 'Baharatlı Chai Latte',
				nameEn: 'Spiced Chai Latte',
				descTr: 'Tarçın, kakule ve zencefil ile demlenmiş sütlü çay.',
				descEn: 'Steamed milk infused with cinnamon, cardamom, and ginger.',
				priceKurus: 12000,
				allergens: ['sut'],
				imageUrl: '/demo/chai-latte.webp'
			}
		]
	},
	{
		nameTr: 'Soğuk İçecekler',
		nameEn: 'Cold Drinks',
		items: [
			{
				nameTr: 'Buzlu Latte',
				nameEn: 'Iced Latte',
				descTr: 'Çift espresso, soğuk süt ve bol buz.',
				descEn: 'Double espresso poured over cold milk and ice.',
				priceKurus: 12500,
				allergens: ['sut'],
				imageUrl: '/demo/buzlu-latte.webp'
			},
			{
				nameTr: 'Ev Yapımı Limonata',
				nameEn: 'Homemade Lemonade',
				descTr: 'Taze sıkılmış limon ve bahçe nanesi.',
				descEn: 'Freshly squeezed lemons with garden mint.',
				priceKurus: 8550,
				allergens: [],
				imageUrl: '/demo/limonata.webp'
			},
			{
				nameTr: 'Cold Brew',
				nameEn: 'Cold Brew',
				descTr: '18 saat soğuk demleme, yumuşak içimli kahve.',
				descEn: '18-hour slow cold extraction, smooth finish.',
				priceKurus: 13000,
				allergens: [],
				imageUrl: '/demo/cold-brew.webp'
			},
			{
				nameTr: 'Orman Meyveli Smoothie',
				nameEn: 'Berry Smoothie',
				descTr: 'Böğürtlen, frambuaz, muz ve yoğurt.',
				descEn: 'Blackberry, raspberry, banana, and yogurt blend.',
				priceKurus: 14500,
				allergens: ['sut'],
				imageUrl: '/demo/smoothie.webp'
			}
		]
	},
	{
		nameTr: 'Tatlılar & Fırın',
		nameEn: 'Pastries & Desserts',
		items: [
			{
				nameTr: 'Tereyağlı Kruvasan',
				nameEn: 'Butter Croissant',
				descTr: 'Sabah fırından çıkan çıtır kat kat Fransız kruvasanı.',
				descEn: 'Flaky French butter croissant baked fresh every morning.',
				priceKurus: 11000,
				allergens: ['gluten', 'sut', 'yumurta'],
				imageUrl: '/demo/kruvasan.webp'
			},
			{
				nameTr: 'San Sebastian Cheesecake',
				nameEn: 'San Sebastian Cheesecake',
				descTr: 'Karamelize üst kabuk, akışkan kremsi doku.',
				descEn: 'Caramelized crust with a rich, creamy center.',
				priceKurus: 19500,
				allergens: ['sut', 'yumurta'],
				imageUrl: '/demo/cheesecake.webp'
			},
			{
				nameTr: 'Fındıklı Brownie',
				nameEn: 'Hazelnut Brownie',
				descTr: 'Bitter Belçika çikolatası ve kavrulmuş Karadeniz fındığı.',
				descEn: 'Dark Belgian chocolate with roasted hazelnuts.',
				priceKurus: 15500,
				allergens: ['gluten', 'sut', 'yumurta', 'kuruyemis'],
				imageUrl: '/demo/brownie.webp'
			},
			{
				nameTr: 'Limonlu Tart',
				nameEn: 'Lemon Tart',
				descTr: 'Kıtır tart tabanında taze limon kreması.',
				descEn: 'Tangy lemon curd in a crisp buttery pastry shell.',
				priceKurus: 16000,
				allergens: ['gluten', 'sut', 'yumurta'],
				imageUrl: '/demo/limonlu-tart.webp',
				available: false
			}
		]
	},
	{
		nameTr: 'Atıştırmalıklar',
		nameEn: 'Snacks & Plates',
		items: [
			{
				nameTr: 'Avokadolu Ekşi Maya Tost',
				nameEn: 'Avocado Sourdough Toast',
				descTr: 'Ezilmiş avokado, çörek otu, limon kabuğu ve zeytinyağı.',
				descEn: 'Smashed avocado, nigella seeds, lemon zest, and olive oil.',
				priceKurus: 21000,
				allergens: ['gluten', 'susam'],
				imageUrl: '/demo/avokado-tost.webp'
			},
			{
				nameTr: 'Üç Peynirli Bazlama Tost',
				nameEn: 'Three-Cheese Flatbread Toast',
				descTr: 'Kaşar, tulum ve mozzarella peyniri, kekik ile.',
				descEn: 'Aged kashar, tulum, and mozzarella with wild thyme.',
				priceKurus: 17500,
				allergens: ['gluten', 'sut'],
				imageUrl: '/demo/peynirli-tost.webp'
			},
			{
				nameTr: 'Granola Kasesi',
				nameEn: 'Granola Bowl',
				descTr: 'Ev yapımı fındıklı granola, süzme yoğurt ve mevsim meyveleri.',
				descEn: 'House-baked nut granola, strained yogurt, and seasonal fruit.',
				priceKurus: 18500,
				allergens: ['gluten', 'sut', 'kuruyemis'],
				imageUrl: '/demo/granola.webp'
			},
			{
				nameTr: 'Akdeniz Salata',
				nameEn: 'Mediterranean Salad',
				descTr: 'Roka, çeri domates, zeytin, beyaz peynir ve nar ekşisi.',
				descEn: 'Arugula, cherry tomatoes, olives, feta, and pomegranate glaze.',
				priceKurus: 22000,
				allergens: ['sut'],
				imageUrl: '/demo/salata.webp'
			}
		]
	}
];

const DEMO_TABLES = [
	{ code: '1', label: 'Masa 1' },
	{ code: '2', label: 'Masa 2' },
	{ code: '3', label: 'Masa 3' },
	{ code: '4', label: 'Masa 4' },
	{ code: '5', label: 'Masa 5' },
	{ code: '6', label: 'Masa 6' },
	{ code: 'bahce-1', label: 'Bahçe 1' },
	{ code: 'bahce-2', label: 'Bahçe 2' }
];

/**
 * Demo kafeyi (slug: demo-kafe) sıfırdan kurar: 4 kategori, 16 ürün, 8 masa, demo yönetici.
 * Yalnız DEMO_SLUG işletmesine dokunur; tek transaction içinde atomik çalışır.
 */
export async function resetDemo(db: Db) {
	const demoHash = await hash(DEMO_ADMIN.password);

	return db.transaction(async (tx) => {
		await tx.delete(businesses).where(eq(businesses.slug, DEMO_SLUG));

		const [business] = await tx
			.insert(businesses)
			.values({
				slug: DEMO_SLUG,
				name: 'Defne Kafe & Fırın',
				whatsappPhone: '905551234567',
				logoUrl: null,
				settings: {
					isDemo: true,
					address: 'Moda Cad. No: 42 (Kurgusal Demo)',
					subtitleTr: 'Taze kavrulmuş kahveler ve günlük fırın ürünleri',
					subtitleEn: 'Freshly roasted coffee & daily artisan bakery'
				}
			})
			.returning();

		await tx.insert(admins).values({
			businessId: business.id,
			email: DEMO_ADMIN.email,
			passwordHash: demoHash
		});

		for (const [ci, cat] of DEMO_MENU.entries()) {
			const [catRow] = await tx
				.insert(categories)
				.values({
					businessId: business.id,
					nameTr: cat.nameTr,
					nameEn: cat.nameEn,
					sortOrder: ci + 1,
					active: true
				})
				.returning();

			await tx.insert(items).values(
				cat.items.map((item, ii) => ({
					businessId: business.id,
					categoryId: catRow.id,
					nameTr: item.nameTr,
					nameEn: item.nameEn,
					descTr: item.descTr,
					descEn: item.descEn,
					priceKurus: item.priceKurus,
					allergens: item.allergens,
					imageUrl: item.imageUrl,
					available: item.available ?? true,
					sortOrder: ii + 1
				}))
			);
		}

		await tx.insert(tables).values(
			DEMO_TABLES.map((t) => ({
				businessId: business.id,
				code: t.code,
				label: t.label,
				active: true
			}))
		);

		return business;
	});
}

/** Deploy sırasında: demo kafe yoksa kurar, varsa dokunmaz (idempotent). */
export async function ensureDemo(db: Db): Promise<boolean> {
	const [existing] = await db
		.select({ id: businesses.id })
		.from(businesses)
		.where(eq(businesses.slug, DEMO_SLUG));
	if (existing) return false;
	await resetDemo(db);
	return true;
}
