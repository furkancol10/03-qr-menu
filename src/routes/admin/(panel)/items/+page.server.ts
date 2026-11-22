import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { canUploadImages, validateImageForBusiness } from '#lib/server/blob/upload.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import { listCategories } from '#lib/server/menu/categories.ts';
import {
	createItem,
	deleteItem,
	listItems,
	setItemAvailable,
	updateItem
} from '#lib/server/menu/items.ts';
import {
	fieldErrors,
	formStrings,
	itemSchema,
	parseAllergens,
	positiveId
} from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadBusiness(businessId: number) {
	const [b] = await db
		.select({ id: businesses.id, slug: businesses.slug, settings: businesses.settings })
		.from(businesses)
		.where(eq(businesses.id, businessId));
	return b ?? null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const [business, categories, items] = await Promise.all([
		loadBusiness(admin.businessId),
		listCategories(db, admin.businessId),
		listItems(db, admin.businessId)
	]);

	return {
		categories,
		items,
		canUpload: business ? canUploadImages(business) : false
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const fd = await request.formData();
		const fields = formStrings(fd);
		const allergens = parseAllergens(fd.getAll('allergens'));
		const parsed = itemSchema.safeParse(fields);
		if (!parsed.success) {
			return fail(400, { action: 'create', fields, errors: fieldErrors(parsed.error) });
		}

		const business = await loadBusiness(admin.businessId);
		if (!business) return fail(404, { message: 'İşletme bulunamadı.' });

		const imgCheck = validateImageForBusiness(business, parsed.data.imageUrl);
		if (!imgCheck.ok) {
			return fail(403, {
				action: 'create',
				fields,
				errors: { imageUrl: imgCheck.message },
				message: imgCheck.message
			});
		}

		const created = await createItem(db, admin.businessId, {
			categoryId: parsed.data.categoryId,
			nameTr: parsed.data.nameTr,
			nameEn: parsed.data.nameEn,
			descTr: parsed.data.descTr,
			descEn: parsed.data.descEn,
			priceKurus: parsed.data.price,
			allergens,
			imageUrl: imgCheck.url,
			available: parsed.data.available === 'on',
			sortOrder: parsed.data.sortOrder
		});
		if (!created) return fail(404, { message: 'Seçilen kategori bulunamadı.' });
		return { ok: true, message: 'Ürün eklendi.' };
	},

	update: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const fd = await request.formData();
		const fields = formStrings(fd);
		const allergens = parseAllergens(fd.getAll('allergens'));
		const idParsed = positiveId.safeParse(fields.id ?? '');
		if (!idParsed.success) return fail(400, { message: 'Geçersiz ürün kimliği.' });

		const parsed = itemSchema.safeParse(fields);
		if (!parsed.success) {
			return fail(400, {
				action: 'update',
				editId: idParsed.data,
				errors: fieldErrors(parsed.error),
				message: 'Form alanlarını kontrol edin.'
			});
		}

		const business = await loadBusiness(admin.businessId);
		if (!business) return fail(404, { message: 'İşletme bulunamadı.' });

		const imgCheck = validateImageForBusiness(business, parsed.data.imageUrl);
		if (!imgCheck.ok) {
			return fail(403, {
				action: 'update',
				editId: idParsed.data,
				errors: { imageUrl: imgCheck.message },
				message: imgCheck.message
			});
		}

		const updated = await updateItem(db, admin.businessId, idParsed.data, {
			categoryId: parsed.data.categoryId,
			nameTr: parsed.data.nameTr,
			nameEn: parsed.data.nameEn,
			descTr: parsed.data.descTr,
			descEn: parsed.data.descEn,
			priceKurus: parsed.data.price,
			allergens,
			imageUrl: imgCheck.url,
			available: parsed.data.available === 'on',
			sortOrder: parsed.data.sortOrder
		});
		if (!updated) return fail(404, { message: 'Ürün veya kategori bulunamadı.' });
		return { ok: true, message: 'Ürün güncellendi.' };
	},

	toggleAvailable: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const fields = formStrings(await request.formData());
		const idParsed = positiveId.safeParse(fields.id ?? '');
		if (!idParsed.success) return fail(400, { message: 'Geçersiz ürün kimliği.' });

		const nextAvailable = fields.available === 'true';
		const updated = await setItemAvailable(db, admin.businessId, idParsed.data, nextAvailable);
		if (!updated) return fail(404, { message: 'Ürün bulunamadı.' });
		return {
			ok: true,
			message: nextAvailable ? 'Ürün tekrar mevcut işaretlendi.' : 'Ürün tükendi işaretlendi.'
		};
	},

	delete: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const fields = formStrings(await request.formData());
		const idParsed = positiveId.safeParse(fields.id ?? '');
		if (!idParsed.success) return fail(400, { message: 'Geçersiz ürün kimliği.' });

		const ok = await deleteItem(db, admin.businessId, idParsed.data);
		if (!ok) return fail(404, { message: 'Ürün bulunamadı.' });
		return { ok: true, message: 'Ürün silindi.' };
	}
};
