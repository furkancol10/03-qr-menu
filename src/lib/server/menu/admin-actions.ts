import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import {
	categorySchema,
	fieldErrors,
	formStrings,
	itemSchema,
	parseAllergens,
	positiveId,
	tableSchema
} from '../../validation';
import { requireAdmin } from '../auth/guard';
import { validateImageForBusiness } from '../blob/upload';
import type { Db } from '../db/client';
import { businesses } from '../db/schema';
import { createCategory, deleteCategory, updateCategory } from './categories';
import { createItem, deleteItem, setItemAvailable, updateItem } from './items';
import { createTable, deleteTable, updateTable } from './tables';

type ActionEventLike = {
	locals: App.Locals;
	request: Request;
};

function isUniqueViolation(err: unknown): boolean {
	if (typeof err !== 'object' || err === null) return false;
	const code =
		(err as { code?: string; cause?: { code?: string } }).code ??
		(err as { cause?: { code?: string } }).cause?.code;
	return code === '23505';
}

export function createCategoryActions(db: Db) {
	return {
		create: async ({ locals, request }: ActionEventLike) => {
			const admin = requireAdmin(locals);
			const fields = formStrings(await request.formData());
			const parsed = categorySchema.safeParse(fields);
			if (!parsed.success) {
				return fail(400, { action: 'create', fields, errors: fieldErrors(parsed.error) });
			}
			await createCategory(db, admin.businessId, {
				nameTr: parsed.data.nameTr,
				nameEn: parsed.data.nameEn,
				sortOrder: parsed.data.sortOrder,
				active: parsed.data.active === 'on'
			});
			return { ok: true, message: 'Kategori eklendi.' };
		},

		update: async ({ locals, request }: ActionEventLike) => {
			const admin = requireAdmin(locals);
			const fields = formStrings(await request.formData());
			const idParsed = positiveId.safeParse(fields.id ?? '');
			if (!idParsed.success) return fail(400, { message: 'Geçersiz kategori kimliği.' });

			const parsed = categorySchema.safeParse(fields);
			if (!parsed.success) {
				return fail(400, {
					action: 'update',
					editId: idParsed.data,
					errors: fieldErrors(parsed.error)
				});
			}

			const updated = await updateCategory(db, admin.businessId, idParsed.data, {
				nameTr: parsed.data.nameTr,
				nameEn: parsed.data.nameEn,
				sortOrder: parsed.data.sortOrder,
				active: parsed.data.active === 'on'
			});
			if (!updated) return fail(404, { message: 'Kategori bulunamadı.' });
			return { ok: true, message: 'Kategori güncellendi.' };
		},

		delete: async ({ locals, request }: ActionEventLike) => {
			const admin = requireAdmin(locals);
			const fields = formStrings(await request.formData());
			const idParsed = positiveId.safeParse(fields.id ?? '');
			if (!idParsed.success) return fail(400, { message: 'Geçersiz kategori kimliği.' });

			const ok = await deleteCategory(db, admin.businessId, idParsed.data);
			if (!ok) return fail(404, { message: 'Kategori bulunamadı.' });
			return { ok: true, message: 'Kategori silindi.' };
		}
	};
}

export function createItemActions(db: Db) {
	async function loadBusiness(businessId: number) {
		const [b] = await db
			.select({ id: businesses.id, slug: businesses.slug, settings: businesses.settings })
			.from(businesses)
			.where(eq(businesses.id, businessId));
		return b ?? null;
	}

	return {
		create: async ({ locals, request }: ActionEventLike) => {
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

		update: async ({ locals, request }: ActionEventLike) => {
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

		toggleAvailable: async ({ locals, request }: ActionEventLike) => {
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

		delete: async ({ locals, request }: ActionEventLike) => {
			const admin = requireAdmin(locals);
			const fields = formStrings(await request.formData());
			const idParsed = positiveId.safeParse(fields.id ?? '');
			if (!idParsed.success) return fail(400, { message: 'Geçersiz ürün kimliği.' });

			const ok = await deleteItem(db, admin.businessId, idParsed.data);
			if (!ok) return fail(404, { message: 'Ürün bulunamadı.' });
			return { ok: true, message: 'Ürün silindi.' };
		}
	};
}

export function createTableActions(db: Db) {
	return {
		create: async ({ locals, request }: ActionEventLike) => {
			const admin = requireAdmin(locals);
			const fields = formStrings(await request.formData());
			const parsed = tableSchema.safeParse(fields);
			if (!parsed.success) {
				return fail(400, { action: 'create', fields, errors: fieldErrors(parsed.error) });
			}
			try {
				await createTable(db, admin.businessId, {
					code: parsed.data.code,
					label: parsed.data.label,
					active: parsed.data.active === 'on'
				});
				return { ok: true, message: 'Masa eklendi.' };
			} catch (err) {
				if (isUniqueViolation(err)) {
					return fail(409, {
						action: 'create',
						fields,
						message: 'Bu masa kodu zaten kayıtlı.'
					});
				}
				throw err;
			}
		},

		update: async ({ locals, request }: ActionEventLike) => {
			const admin = requireAdmin(locals);
			const fields = formStrings(await request.formData());
			const idParsed = positiveId.safeParse(fields.id ?? '');
			if (!idParsed.success) return fail(400, { message: 'Geçersiz masa kimliği.' });

			const parsed = tableSchema.safeParse(fields);
			if (!parsed.success) {
				return fail(400, {
					action: 'update',
					editId: idParsed.data,
					errors: fieldErrors(parsed.error),
					message: 'Masa alanlarını kontrol edin.'
				});
			}

			try {
				const updated = await updateTable(db, admin.businessId, idParsed.data, {
					code: parsed.data.code,
					label: parsed.data.label,
					active: parsed.data.active === 'on'
				});
				if (!updated) return fail(404, { message: 'Masa bulunamadı.' });
				return { ok: true, message: 'Masa güncellendi.' };
			} catch (err) {
				if (isUniqueViolation(err)) {
					return fail(409, { message: 'Bu masa kodu başka bir masada kullanılıyor.' });
				}
				throw err;
			}
		},

		delete: async ({ locals, request }: ActionEventLike) => {
			const admin = requireAdmin(locals);
			const fields = formStrings(await request.formData());
			const idParsed = positiveId.safeParse(fields.id ?? '');
			if (!idParsed.success) return fail(400, { message: 'Geçersiz masa kimliği.' });

			const ok = await deleteTable(db, admin.businessId, idParsed.data);
			if (!ok) return fail(404, { message: 'Masa bulunamadı.' });
			return { ok: true, message: 'Masa silindi.' };
		}
	};
}
