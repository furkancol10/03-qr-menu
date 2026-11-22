import { z } from 'zod';
import type { CartLine } from '../../cart.svelte';
import type { Lang } from '../../i18n';
import { buildWhatsAppOrderUrl } from '../../whatsapp';
import type { Db } from '../db/client';
import { getPublicMenuBySlug } from './queries';

const orderLinkSchema = z.object({
	slug: z.string().trim().min(1).max(100),
	tableCode: z.string().trim().max(30).nullable().optional(),
	lang: z.enum(['tr', 'en']).default('tr'),
	items: z
		.array(
			z.object({
				itemId: z.number().int().min(1),
				qty: z.number().int().min(1).max(99)
			})
		)
		.min(1)
		.max(100),
	note: z.string().max(200).optional()
});

export type VerifiedOrderInput = {
	slug: string;
	tableCode?: string | null;
	lang: Lang;
	items: { itemId: number; qty: number }[];
	note?: string;
};

export type VerifiedOrderResult =
	| {
			ok: true;
			status: 200;
			whatsappUrl: string | null;
			lines: CartLine[];
			unavailableItemIds: number[];
			activeTable: { code: string; label: string } | null;
	  }
	| {
			ok: false;
			status: 404 | 409;
			error: string;
			whatsappUrl: null;
			lines: CartLine[];
			unavailableItemIds: number[];
			activeTable: { code: string; label: string } | null;
	  };

/**
 * Sunucu tarafı sepet ve WhatsApp sipariş doğrulaması (sipariş DB'ye yazılmaz — ARCHITECTURE §5):
 * - Yalnız ilgili işletmenin aktif kategorilerindeki `available === true` ürünleri mesaja dahil eder.
 * - Tükendi (`available === false`), silinmiş veya başka işletmeye ait ürünleri ayıklar.
 * - Fiyat ve ürün adlarını veritabanından alır; geçersiz/başka işletmeye ait masa kodunu yoksayar.
 */
export async function buildVerifiedWhatsAppOrder(
	db: Db,
	input: VerifiedOrderInput
): Promise<VerifiedOrderResult> {
	const menu = await getPublicMenuBySlug(db, input.slug, input.tableCode);
	if (!menu) {
		return {
			ok: false,
			status: 404,
			error: 'İşletme menüsü bulunamadı.',
			whatsappUrl: null,
			lines: [],
			unavailableItemIds: [],
			activeTable: null
		};
	}

	const byId = new Map<
		number,
		{ id: number; nameTr: string; nameEn: string | null; priceKurus: number; available: boolean }
	>();
	for (const cat of menu.categories) {
		for (const item of cat.items) {
			byId.set(item.id, item);
		}
	}

	const qtyByItem = new Map<number, number>();
	const unavailableItemIds: number[] = [];

	for (const req of input.items) {
		const fresh = byId.get(req.itemId);
		if (!fresh || !fresh.available) {
			if (!unavailableItemIds.includes(req.itemId)) unavailableItemIds.push(req.itemId);
			continue;
		}
		const prev = qtyByItem.get(req.itemId) ?? 0;
		qtyByItem.set(req.itemId, Math.min(99, prev + Math.max(1, Math.floor(req.qty))));
	}

	const lines: CartLine[] = [];
	for (const [itemId, qty] of qtyByItem.entries()) {
		const fresh = byId.get(itemId)!;
		lines.push({
			itemId: fresh.id,
			nameTr: fresh.nameTr,
			nameEn: fresh.nameEn,
			priceKurus: fresh.priceKurus,
			qty
		});
	}

	const activeTable = menu.activeTable
		? { code: menu.activeTable.code, label: menu.activeTable.label }
		: null;

	if (lines.length === 0) {
		return {
			ok: false,
			status: 409,
			error: 'Seçilen ürünler tükendi veya mevcut değil.',
			whatsappUrl: null,
			lines: [],
			unavailableItemIds,
			activeTable
		};
	}

	const whatsappUrl = buildWhatsAppOrderUrl({
		phone: menu.business.whatsappPhone,
		businessName: menu.business.name,
		tableLabel: activeTable?.label ?? null,
		lang: input.lang,
		lines,
		note: input.note
	});

	return {
		ok: true,
		status: 200,
		whatsappUrl,
		lines,
		unavailableItemIds,
		activeTable
	};
}

export async function handleOrderLinkPost(request: Request, deps: { db: Db }): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{ ok: false, error: 'Geçersiz istek gövdesi.' },
			{ status: 400, headers: { 'cache-control': 'no-store' } }
		);
	}

	const parsed = orderLinkSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ ok: false, error: 'Sipariş verisi geçersiz.' },
			{ status: 400, headers: { 'cache-control': 'no-store' } }
		);
	}

	const result = await buildVerifiedWhatsAppOrder(deps.db, parsed.data);
	return Response.json(result, {
		status: result.status,
		headers: { 'cache-control': 'no-store' }
	});
}
