import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdmin, authenticate } from '../../src/lib/server/auth/password';
import { createSession, deleteSession, validateSession } from '../../src/lib/server/auth/session';
import { canUploadImages, validateImageForBusiness } from '../../src/lib/server/blob/upload';
import { createDb, type Db } from '../../src/lib/server/db/client';
import { businesses, categories, items, rateLimits, tables } from '../../src/lib/server/db/schema';
import { DEMO_SLUG, ensureDemo, resetDemo } from '../../src/lib/server/demo/seed';
import {
	createCategory,
	deleteCategory,
	updateCategory
} from '../../src/lib/server/menu/categories';
import {
	createItem,
	deleteItem,
	setItemAvailable,
	updateItem
} from '../../src/lib/server/menu/items';
import { getPublicMenuBySlug } from '../../src/lib/server/menu/queries';
import { createTable, deleteTable, updateTable } from '../../src/lib/server/menu/tables';
import { createRateLimiter } from '../../src/lib/server/rate-limit';
import { TEST_DATABASE_URL } from '../setup/global-db';

let db: Db;
let close: () => Promise<void>;

beforeAll(() => {
	const conn = createDb(TEST_DATABASE_URL);
	db = conn.db;
	close = conn.close;
});

afterAll(async () => {
	await close();
});

beforeEach(async () => {
	await db.delete(rateLimits);
	await db.delete(businesses);
});

async function seedTwoTenants() {
	const [bizA] = await db
		.insert(businesses)
		.values({
			slug: 'kafe-a',
			name: 'Kafe A',
			whatsappPhone: '905551111111',
			settings: { isDemo: false }
		})
		.returning();
	const [bizB] = await db
		.insert(businesses)
		.values({
			slug: 'kafe-b',
			name: 'Kafe B',
			whatsappPhone: '905552222222',
			settings: { isDemo: false }
		})
		.returning();

	await createAdmin(db, { businessId: bizA.id, email: 'a@kafe-a.example', password: 'secret-a' });
	await createAdmin(db, { businessId: bizB.id, email: 'b@kafe-b.example', password: 'secret-b' });

	const catA = await createCategory(db, bizA.id, {
		nameTr: 'A İçecekler',
		nameEn: 'A Drinks',
		sortOrder: 1,
		active: true
	});
	const catB = await createCategory(db, bizB.id, {
		nameTr: 'B İçecekler',
		nameEn: 'B Drinks',
		sortOrder: 1,
		active: true
	});

	const itemA = await createItem(db, bizA.id, {
		categoryId: catA.id,
		nameTr: 'A Kahve',
		nameEn: 'A Coffee',
		descTr: null,
		descEn: null,
		priceKurus: 9000,
		allergens: [],
		imageUrl: null,
		available: true,
		sortOrder: 1
	});
	const itemB = await createItem(db, bizB.id, {
		categoryId: catB.id,
		nameTr: 'B Kahve',
		nameEn: 'B Coffee',
		descTr: null,
		descEn: null,
		priceKurus: 11000,
		allergens: ['sut'],
		imageUrl: null,
		available: true,
		sortOrder: 1
	});

	const tableA = await createTable(db, bizA.id, { code: '1', label: 'Masa 1', active: true });
	const tableB = await createTable(db, bizB.id, { code: '1', label: 'Masa 1', active: true });

	return { bizA, bizB, catA, catB, itemA: itemA!, itemB: itemB!, tableA, tableB };
}

describe('Kiracı izolasyonu — gerçek ikinci işletme (ARCHITECTURE §9)', () => {
	it('A admini B işletmesinin kategorisini güncelleyemez ve silemez', async () => {
		const { bizA, catB } = await seedTwoTenants();

		const updated = await updateCategory(db, bizA.id, catB.id, {
			nameTr: 'Hacklendi',
			nameEn: 'Hacked',
			sortOrder: 99,
			active: false
		});
		expect(updated).toBeNull();

		const deleted = await deleteCategory(db, bizA.id, catB.id);
		expect(deleted).toBe(false);

		const [freshB] = await db.select().from(categories).where(eq(categories.id, catB.id));
		expect(freshB?.nameTr).toBe('B İçecekler');
		expect(freshB?.active).toBe(true);
	});

	it('A admini B işletmesinin kategorisine ürün ekleyemez, B ürününü değiştiremez veya silemez', async () => {
		const { bizA, catB, itemB } = await seedTwoTenants();

		const crossCreate = await createItem(db, bizA.id, {
			categoryId: catB.id,
			nameTr: 'Sızan Ürün',
			nameEn: null,
			descTr: null,
			descEn: null,
			priceKurus: 5000,
			allergens: [],
			imageUrl: null,
			available: true,
			sortOrder: 2
		});
		expect(crossCreate).toBeNull();

		const crossToggle = await setItemAvailable(db, bizA.id, itemB.id, false);
		expect(crossToggle).toBeNull();

		const crossUpdate = await updateItem(db, bizA.id, itemB.id, {
			categoryId: catB.id,
			nameTr: 'Değişti',
			nameEn: null,
			descTr: null,
			descEn: null,
			priceKurus: 100,
			allergens: [],
			imageUrl: null,
			available: false,
			sortOrder: 1
		});
		expect(crossUpdate).toBeNull();

		const crossDelete = await deleteItem(db, bizA.id, itemB.id);
		expect(crossDelete).toBe(false);

		const [freshItemB] = await db.select().from(items).where(eq(items.id, itemB.id));
		expect(freshItemB?.nameTr).toBe('B Kahve');
		expect(freshItemB?.available).toBe(true);
		expect(freshItemB?.priceKurus).toBe(11000);
	});

	it('A admini B işletmesinin masasını güncelleyemez ve silemez', async () => {
		const { bizA, tableB } = await seedTwoTenants();

		const crossUpdate = await updateTable(db, bizA.id, tableB.id, {
			code: '99',
			label: 'Hack Masa',
			active: false
		});
		expect(crossUpdate).toBeNull();

		const crossDelete = await deleteTable(db, bizA.id, tableB.id);
		expect(crossDelete).toBe(false);

		const [freshTableB] = await db.select().from(tables).where(eq(tables.id, tableB.id));
		expect(freshTableB?.code).toBe('1');
		expect(freshTableB?.label).toBe('Masa 1');
		expect(freshTableB?.active).toBe(true);
	});
});

describe('Demo kısıtları, seed, reset, auth ve hız sınırı', () => {
	it('demo işletmede görsel yükleme kapalıdır; yalnız static/demo/ görselleri kabul edilir', async () => {
		const demoBiz = await resetDemo(db);
		const [normalBiz] = await db
			.insert(businesses)
			.values({ slug: 'gercek-kafe', name: 'Gerçek Kafe', settings: { isDemo: false } })
			.returning();

		expect(canUploadImages(demoBiz)).toBe(false);
		expect(canUploadImages(normalBiz)).toBe(true);

		expect(validateImageForBusiness(demoBiz, '/demo/turk-kahvesi.webp')).toEqual({
			ok: true,
			url: '/demo/turk-kahvesi.webp'
		});
		expect(validateImageForBusiness(demoBiz, 'https://evil.example/img.webp').ok).toBe(false);
		expect(validateImageForBusiness(normalBiz, 'https://cdn.example/img.webp')).toEqual({
			ok: true,
			url: 'https://cdn.example/img.webp'
		});
	});

	it('resetDemo demo-kafe verisini (4 kategori, 16 ürün, 8 masa) kurar ve diğer işletmeye dokunmaz', async () => {
		const { bizB } = await seedTwoTenants();
		const demo = await resetDemo(db);
		expect(demo.slug).toBe(DEMO_SLUG);

		const menu = await getPublicMenuBySlug(db, DEMO_SLUG, '5');
		expect(menu).not.toBeNull();
		expect(menu!.categories).toHaveLength(4);
		expect(menu!.categories.flatMap((c) => c.items)).toHaveLength(16);
		expect(menu!.activeTable?.code).toBe('5');
		expect(menu!.tables).toHaveLength(8);

		// İdempotent ensureDemo mevcut demoyu ezmez
		expect(await ensureDemo(db)).toBe(false);

		// Diğer işletme korunur
		const [stillB] = await db.select().from(businesses).where(eq(businesses.id, bizB.id));
		expect(stillB?.slug).toBe('kafe-b');
	});

	it('auth oturumu ve Postgres hız sınırı doğru çalışır', async () => {
		const { bizA } = await seedTwoTenants();
		const admin = await authenticate(db, 'A@KAFE-A.EXAMPLE', 'secret-a');
		expect(admin?.businessId).toBe(bizA.id);
		expect(await authenticate(db, 'a@kafe-a.example', 'yanlis')).toBeNull();

		const now = new Date('2026-11-22T12:00:00Z');
		const { token } = await createSession(db, admin!.id, now);
		const valid = await validateSession(db, token, new Date('2026-11-23T12:00:00Z'));
		expect(valid?.businessId).toBe(bizA.id);

		const expired = await validateSession(db, token, new Date('2026-12-05T12:00:00Z'));
		expect(expired).toBeNull();

		const { token: t2 } = await createSession(db, admin!.id, now);
		await deleteSession(db, t2);
		expect(await validateSession(db, t2, now)).toBeNull();

		const limiter = createRateLimiter(db);
		const limit = { max: 2, windowMs: 60_000 };
		expect(await limiter.hit('test:key', limit, now)).toBe(true);
		expect(await limiter.hit('test:key', limit, now)).toBe(true);
		expect(await limiter.hit('test:key', limit, now)).toBe(false);
		expect(await limiter.hit('test:key', limit, new Date(now.getTime() + 61_000))).toBe(true);
	});
});
