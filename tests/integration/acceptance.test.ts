import { isActionFailure } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handleLoginAttempt } from '../../src/lib/server/auth/login';
import { authenticate, createAdmin } from '../../src/lib/server/auth/password';
import { createSession, validateSession } from '../../src/lib/server/auth/session';
import { handleUploadPost, type BlobPutFn } from '../../src/lib/server/blob/upload';
import { createDb, type Db } from '../../src/lib/server/db/client';
import { businesses, categories, items, rateLimits, tables } from '../../src/lib/server/db/schema';
import { handleDemoResetPost } from '../../src/lib/server/demo/reset-handler';
import { DEMO_SLUG, resetDemo } from '../../src/lib/server/demo/seed';
import {
	createCategoryActions,
	createItemActions,
	createTableActions
} from '../../src/lib/server/menu/admin-actions';
import { createCategory } from '../../src/lib/server/menu/categories';
import { createItem } from '../../src/lib/server/menu/items';
import { handleOrderLinkPost } from '../../src/lib/server/menu/order';
import { getPublicMenuBySlug } from '../../src/lib/server/menu/queries';
import { createTable } from '../../src/lib/server/menu/tables';
import { createRateLimiter, loginEmailKey } from '../../src/lib/server/rate-limit';
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

function formRequest(fields: Record<string, string>): Request {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return new Request('http://localhost/admin', { method: 'POST', body: fd });
}

async function createAuthedLocals(email: string, password: string): Promise<App.Locals> {
	const admin = await authenticate(db, email, password);
	if (!admin) throw new Error(`Admin kimlik doğrulaması başarısız: ${email}`);
	const { token } = await createSession(db, admin.id);
	const sessionAdmin = await validateSession(db, token);
	if (!sessionAdmin) throw new Error('Oturum doğrulanamadı');
	return { admin: sessionAdmin };
}

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
	const soldOutA = await createItem(db, bizA.id, {
		categoryId: catA.id,
		nameTr: 'A Tükendi Tatlı',
		nameEn: 'A Sold Out Dessert',
		descTr: null,
		descEn: null,
		priceKurus: 14000,
		allergens: [],
		imageUrl: null,
		available: false,
		sortOrder: 2
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
	const tableB = await createTable(db, bizB.id, {
		code: 'ozel-b',
		label: 'B Özel Masa',
		active: true
	});

	return {
		bizA,
		bizB,
		catA,
		catB,
		itemA: itemA!,
		soldOutA: soldOutA!,
		itemB: itemB!,
		tableA,
		tableB
	};
}

describe('1) /api/upload — demo 403 ve demo olmayan yetkili admin izinli', () => {
	it('oturumsuz 401, demo işletmede 403 döner ve demo olmayan yetkili adminde yüklemeye izin verir', async () => {
		await resetDemo(db);
		const { bizA } = await seedTwoTenants();
		const limiter = createRateLimiter(db);

		const uploadCalls: { pathname: string; contentType: string }[] = [];
		const putBlob: BlobPutFn = async (pathname, _body, options) => {
			uploadCalls.push({ pathname, contentType: options.contentType });
			return Promise.resolve({ url: `https://blob.example/${pathname}` });
		};

		const makeUploadReq = () => {
			const fd = new FormData();
			fd.append(
				'file',
				new File([new Uint8Array([1, 2, 3])], 'latte.webp', { type: 'image/webp' })
			);
			return new Request('http://localhost/api/upload', { method: 'POST', body: fd });
		};

		// Oturumsuz -> 401
		const unauthRes = await handleUploadPost(
			{ locals: { admin: null }, request: makeUploadReq() },
			{ db, rateLimiter: limiter, token: 'test-blob-token', putBlob }
		);
		expect(unauthRes.status).toBe(401);
		expect(uploadCalls).toHaveLength(0);

		// Demo işletme admini -> 403 (gerçek oturum ve gerçek yetki kararı)
		const demoLocals = await createAuthedLocals('demo@defnekafe.example', 'demo-1234');
		const demoRes = await handleUploadPost(
			{ locals: demoLocals, request: makeUploadReq() },
			{ db, rateLimiter: limiter, token: 'test-blob-token', putBlob }
		);
		expect(demoRes.status).toBe(403);
		expect(uploadCalls).toHaveLength(0);

		// Demo olmayan yetkili admin -> 200 + yükleme URL'i döner
		const normalLocals = await createAuthedLocals('a@kafe-a.example', 'secret-a');
		const okRes = await handleUploadPost(
			{ locals: normalLocals, request: makeUploadReq() },
			{ db, rateLimiter: limiter, token: 'test-blob-token', putBlob }
		);
		expect(okRes.status).toBe(200);
		const okBody = (await okRes.json()) as { url?: string };
		expect(okBody.url).toMatch(new RegExp(`^https://blob\\.example/menu/${bizA.id}/.*\\.webp$`));
		expect(uploadCalls).toHaveLength(1);
		expect(uploadCalls[0].contentType).toBe('image/webp');
	});
});

describe('2) /api/demo-reset — secret kontrolü ve yalnız demo-kafe sıfırlaması', () => {
	it('secret yok/yanlış iken 401; doğru iken demo-kafe seed haline döner, başka işletme değişmez', async () => {
		const secret = 'super-gizli-demo-sifirlama-anahtari';
		const demoBiz = await resetDemo(db);
		const { bizB, catB, itemB, tableB } = await seedTwoTenants();

		// Demo verisini boz: ekstra kategori ekle, mevcut ürünü değiştir, bir masayı sil
		await createCategory(db, demoBiz.id, {
			nameTr: 'Geçici Kategori',
			nameEn: null,
			sortOrder: 99,
			active: true
		});
		const demoItemsBefore = await db.select().from(items).where(eq(items.businessId, demoBiz.id));
		await db
			.update(items)
			.set({ nameTr: 'Bozulmuş Ürün', priceKurus: 100 })
			.where(eq(items.id, demoItemsBefore[0].id));
		const demoTablesBefore = await db
			.select()
			.from(tables)
			.where(eq(tables.businessId, demoBiz.id));
		await db.delete(tables).where(eq(tables.id, demoTablesBefore[0].id));

		// Secret yok -> 401
		const noHeaderRes = await handleDemoResetPost(
			new Request('http://localhost/api/demo-reset', { method: 'POST' }),
			{ db, expectedSecret: secret }
		);
		expect(noHeaderRes.status).toBe(401);

		// Yanlış secret -> 401
		const wrongSecretRes = await handleDemoResetPost(
			new Request('http://localhost/api/demo-reset', {
				method: 'POST',
				headers: { 'x-demo-reset-secret': 'yanlis-secret' }
			}),
			{ db, expectedSecret: secret }
		);
		expect(wrongSecretRes.status).toBe(401);

		// Ortamda secret tanımsız -> 401
		const unsetSecretRes = await handleDemoResetPost(
			new Request('http://localhost/api/demo-reset', {
				method: 'POST',
				headers: { 'x-demo-reset-secret': secret }
			}),
			{ db, expectedSecret: undefined }
		);
		expect(unsetSecretRes.status).toBe(401);

		// 401 sonrası bozulmuş demo verisi hâlâ duruyor (sıfırlanmadı)
		const catsAfter401 = await db
			.select()
			.from(categories)
			.where(eq(categories.businessId, demoBiz.id));
		expect(catsAfter401).toHaveLength(5);

		// Doğru secret -> 200 ve demo-kafe seed haline döner
		const okRes = await handleDemoResetPost(
			new Request('http://localhost/api/demo-reset', {
				method: 'POST',
				headers: { 'x-demo-reset-secret': secret }
			}),
			{ db, expectedSecret: secret }
		);
		expect(okRes.status).toBe(200);
		expect(await okRes.json()).toEqual({ ok: true, slug: DEMO_SLUG });

		const freshMenu = await getPublicMenuBySlug(db, DEMO_SLUG, '5');
		expect(freshMenu).not.toBeNull();
		expect(freshMenu!.categories).toHaveLength(4);
		const freshItems = freshMenu!.categories.flatMap((c) => c.items);
		expect(freshItems).toHaveLength(16);
		expect(freshItems.some((i) => i.nameTr === 'Bozulmuş Ürün')).toBe(false);
		expect(freshItems.find((i) => i.nameTr === 'Türk Kahvesi')?.priceKurus).toBe(7500);
		expect(freshItems.find((i) => i.nameTr === 'Limonlu Tart')?.available).toBe(false);
		expect(freshMenu!.tables).toHaveLength(8);
		expect(freshMenu!.activeTable?.label).toBe('Masa 5');

		// Başka işletme (kafe-b) ve tüm alt kayıtları hiç değişmez
		const [stillBizB] = await db.select().from(businesses).where(eq(businesses.id, bizB.id));
		const [stillCatB] = await db.select().from(categories).where(eq(categories.id, catB.id));
		const [stillItemB] = await db.select().from(items).where(eq(items.id, itemB.id));
		const [stillTableB] = await db.select().from(tables).where(eq(tables.id, tableB.id));
		expect(stillBizB?.name).toBe('Kafe B');
		expect(stillCatB?.nameTr).toBe('B İçecekler');
		expect(stillItemB?.nameTr).toBe('B Kahve');
		expect(stillTableB?.code).toBe('ozel-b');
	});
});

describe('3) Giriş hız sınırı — aynı e-postaya 6. deneme engellenir (Postgres rate_limits)', () => {
	it('5 başarısız deneme sonrası aynı e-posta 6. denemede doğru şifreyle bile 429 alır', async () => {
		await seedTwoTenants();
		const limiter = createRateLimiter(db);

		const makeLoginForm = (email: string, password: string) => {
			const fd = new FormData();
			fd.append('email', email);
			fd.append('password', password);
			return fd;
		};

		// Farklı IP'lerden 5 hatalı deneme -> her biri 400 (IP değil e-posta limiti sınanır)
		for (let i = 1; i <= 5; i++) {
			const emailVariant = i % 2 === 0 ? 'A@KAFE-A.EXAMPLE' : 'a@kafe-a.example';
			const res = await handleLoginAttempt(
				{
					formData: makeLoginForm(emailVariant, `yanlis-${i}`),
					ip: `10.0.0.${i}`,
					hostname: 'localhost'
				},
				{ db, rateLimiter: limiter }
			);
			expect(res.ok).toBe(false);
			if (!res.ok) expect(res.status).toBe(400);
		}

		// 6. deneme: doğru şifre ve yeni IP ile bile 429 ile engellenir
		const sixth = await handleLoginAttempt(
			{
				formData: makeLoginForm('a@kafe-a.example', 'secret-a'),
				ip: '10.0.0.99',
				hostname: 'localhost'
			},
			{ db, rateLimiter: limiter }
		);
		expect(sixth.ok).toBe(false);
		if (!sixth.ok) {
			expect(sixth.status).toBe(429);
			expect(sixth.message).toContain('Çok fazla deneme');
		}

		// Postgres rate_limits tablosunda sayaç 6 olarak kalıcıdır
		const [row] = await db
			.select()
			.from(rateLimits)
			.where(eq(rateLimits.key, loginEmailKey('a@kafe-a.example')));
		expect(row?.count).toBe(6);

		// Başka e-posta etkilenmez ve giriş yapabilir
		const other = await handleLoginAttempt(
			{
				formData: makeLoginForm('b@kafe-b.example', 'secret-b'),
				ip: '10.0.0.100',
				hostname: 'localhost'
			},
			{ db, rateLimiter: limiter }
		);
		expect(other.ok).toBe(true);
	});
});

describe('4) ?masa=GECERSIZ ve başka işletmenin masa kodu — mesajda masa yazmaz', () => {
	it('geçersiz veya başka işletmeye ait masa kodu activeTable döndürmez ve WhatsApp mesajına girmez', async () => {
		const { itemA } = await seedTwoTenants();

		// Geçersiz masa kodu
		const invalidMenu = await getPublicMenuBySlug(db, 'kafe-a', 'GECERSIZ');
		expect(invalidMenu).not.toBeNull();
		expect(invalidMenu!.activeTable).toBeNull();
		expect(invalidMenu!.requestedTableCode).toBe('GECERSIZ');

		// Başka işletmenin (kafe-b) masa kodu: ozel-b
		const foreignMenu = await getPublicMenuBySlug(db, 'kafe-a', 'ozel-b');
		expect(foreignMenu).not.toBeNull();
		expect(foreignMenu!.activeTable).toBeNull();

		// Sunucu WhatsApp linki de geçersiz/yabancı masa kodunu mesaja yazmaz
		for (const badCode of ['GECERSIZ', 'ozel-b']) {
			const res = await handleOrderLinkPost(
				new Request('http://localhost/api/order-link', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						slug: 'kafe-a',
						tableCode: badCode,
						lang: 'tr',
						items: [{ itemId: itemA.id, qty: 1 }]
					})
				}),
				{ db }
			);
			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				activeTable: { code: string; label: string } | null;
				whatsappUrl: string | null;
			};
			expect(body.activeTable).toBeNull();
			expect(body.whatsappUrl).toBeTruthy();
			const decoded = decodeURIComponent(body.whatsappUrl!.split('?text=')[1]);
			expect(decoded).not.toContain('Masa:');
			expect(decoded).not.toContain(badCode);
			expect(decoded).not.toContain('B Özel Masa');
		}

		// Kontrol: kendi geçerli masa kodu (1) mesaja yazılır
		const validRes = await handleOrderLinkPost(
			new Request('http://localhost/api/order-link', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					slug: 'kafe-a',
					tableCode: '1',
					lang: 'tr',
					items: [{ itemId: itemA.id, qty: 1 }]
				})
			}),
			{ db }
		);
		const validBody = (await validRes.json()) as {
			activeTable: { code: string; label: string } | null;
			whatsappUrl: string | null;
		};
		expect(validBody.activeTable?.label).toBe('Masa 1');
		const validDecoded = decodeURIComponent(validBody.whatsappUrl!.split('?text=')[1]);
		expect(validDecoded).toContain('Masa: Masa 1');
	});
});

describe('5) Tükendi ürün — sunucu tarafında da sepete/mesaja girmez', () => {
	it('available=false veya başka işletme ürünü sunucu sipariş bağlantısına dahil edilmez', async () => {
		const { itemA, soldOutA, itemB } = await seedTwoTenants();

		// Yalnız tükendi ürün -> 409, whatsappUrl: null
		const onlySoldOutRes = await handleOrderLinkPost(
			new Request('http://localhost/api/order-link', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					slug: 'kafe-a',
					tableCode: '1',
					lang: 'tr',
					items: [{ itemId: soldOutA.id, qty: 2 }]
				})
			}),
			{ db }
		);
		expect(onlySoldOutRes.status).toBe(409);
		const onlySoldOut = (await onlySoldOutRes.json()) as {
			ok: boolean;
			whatsappUrl: string | null;
			lines: unknown[];
			unavailableItemIds: number[];
		};
		expect(onlySoldOut.ok).toBe(false);
		expect(onlySoldOut.whatsappUrl).toBeNull();
		expect(onlySoldOut.lines).toHaveLength(0);
		expect(onlySoldOut.unavailableItemIds).toEqual([soldOutA.id]);

		// Karışık istek (mevcut + tükendi + başka işletme ürünü) -> yalnız mevcut ürün mesaja girer
		const mixedRes = await handleOrderLinkPost(
			new Request('http://localhost/api/order-link', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					slug: 'kafe-a',
					tableCode: '1',
					lang: 'tr',
					items: [
						{ itemId: itemA.id, qty: 1 },
						{ itemId: soldOutA.id, qty: 2 },
						{ itemId: itemB.id, qty: 1 }
					]
				})
			}),
			{ db }
		);
		expect(mixedRes.status).toBe(200);
		const mixed = (await mixedRes.json()) as {
			ok: boolean;
			whatsappUrl: string | null;
			lines: { itemId: number; qty: number }[];
			unavailableItemIds: number[];
		};
		expect(mixed.ok).toBe(true);
		expect(mixed.lines).toHaveLength(1);
		expect(mixed.lines[0].itemId).toBe(itemA.id);
		expect(mixed.unavailableItemIds).toEqual([soldOutA.id, itemB.id]);

		const decoded = decodeURIComponent(mixed.whatsappUrl!.split('?text=')[1]);
		expect(decoded).toContain('1x A Kahve');
		expect(decoded).toContain('90,00 TL');
		expect(decoded).not.toContain('A Tükendi Tatlı');
		expect(decoded).not.toContain('B Kahve');
	});
});

describe('6) Kiracı izolasyonu — kategori, ürün ve masa admin eylemleri (update/delete)', () => {
	it('A admini form eylemleriyle B işletmesinin kategori, ürün ve masasını güncelleyemez veya silemez', async () => {
		const { catA, catB, itemA, itemB, tableB } = await seedTwoTenants();
		const localsA = await createAuthedLocals('a@kafe-a.example', 'secret-a');

		const catActions = createCategoryActions(db);
		const itemActions = createItemActions(db);
		const tableActions = createTableActions(db);

		// Kategori update & delete (A -> B)
		const catUpdateRes = await catActions.update({
			locals: localsA,
			request: formRequest({
				id: String(catB.id),
				nameTr: 'Hack Kategori',
				nameEn: 'Hack Category',
				sortOrder: '9',
				active: 'on'
			})
		});
		expect(isActionFailure(catUpdateRes) && catUpdateRes.status === 404).toBe(true);

		const catDeleteRes = await catActions.delete({
			locals: localsA,
			request: formRequest({ id: String(catB.id) })
		});
		expect(isActionFailure(catDeleteRes) && catDeleteRes.status === 404).toBe(true);

		// Ürün update: A kendi geçerli catA.id'sini vererek B'nin itemB.id'sini ele geçirmeye çalışır
		// (ownsCategory geçer, items.businessId filtresi gerçekten sınanır)
		const itemHijackRes = await itemActions.update({
			locals: localsA,
			request: formRequest({
				id: String(itemB.id),
				categoryId: String(catA.id),
				nameTr: 'Çalınan Ürün',
				nameEn: 'Stolen Item',
				price: '10,00',
				sortOrder: '1',
				available: 'on'
			})
		});
		expect(isActionFailure(itemHijackRes) && itemHijackRes.status === 404).toBe(true);

		// Ürün update: A kendi ürününü B'nin kategorisine taşımaya çalışır
		const itemCrossCatRes = await itemActions.update({
			locals: localsA,
			request: formRequest({
				id: String(itemA.id),
				categoryId: String(catB.id),
				nameTr: 'A Kahve',
				price: '90,00',
				sortOrder: '1',
				available: 'on'
			})
		});
		expect(isActionFailure(itemCrossCatRes) && itemCrossCatRes.status === 404).toBe(true);

		// Ürün toggleAvailable & delete (A -> B)
		const itemToggleRes = await itemActions.toggleAvailable({
			locals: localsA,
			request: formRequest({ id: String(itemB.id), available: 'false' })
		});
		expect(isActionFailure(itemToggleRes) && itemToggleRes.status === 404).toBe(true);

		const itemDeleteRes = await itemActions.delete({
			locals: localsA,
			request: formRequest({ id: String(itemB.id) })
		});
		expect(isActionFailure(itemDeleteRes) && itemDeleteRes.status === 404).toBe(true);

		// Masa update & delete (A -> B)
		const tableUpdateRes = await tableActions.update({
			locals: localsA,
			request: formRequest({
				id: String(tableB.id),
				code: 'hack-99',
				label: 'Hack Masa',
				active: 'on'
			})
		});
		expect(isActionFailure(tableUpdateRes) && tableUpdateRes.status === 404).toBe(true);

		const tableDeleteRes = await tableActions.delete({
			locals: localsA,
			request: formRequest({ id: String(tableB.id) })
		});
		expect(isActionFailure(tableDeleteRes) && tableDeleteRes.status === 404).toBe(true);

		// DB doğrulaması: B'nin kategori, ürün, masası ve A'nın ürün kategorisi değişmemiştir
		const [freshCatB] = await db.select().from(categories).where(eq(categories.id, catB.id));
		const [freshItemB] = await db.select().from(items).where(eq(items.id, itemB.id));
		const [freshItemA] = await db.select().from(items).where(eq(items.id, itemA.id));
		const [freshTableB] = await db.select().from(tables).where(eq(tables.id, tableB.id));

		expect(freshCatB?.nameTr).toBe('B İçecekler');
		expect(freshItemB?.nameTr).toBe('B Kahve');
		expect(freshItemB?.categoryId).toBe(catB.id);
		expect(freshItemB?.available).toBe(true);
		expect(freshItemA?.categoryId).toBe(catA.id);
		expect(freshTableB?.code).toBe('ozel-b');
	});
});
