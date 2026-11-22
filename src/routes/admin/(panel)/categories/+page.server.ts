import { fail } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import {
	createCategory,
	deleteCategory,
	listCategories,
	updateCategory
} from '#lib/server/menu/categories.ts';
import { categorySchema, fieldErrors, formStrings, positiveId } from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const categories = await listCategories(db, admin.businessId);
	return { categories };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
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

	update: async ({ locals, request }) => {
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

	delete: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const fields = formStrings(await request.formData());
		const idParsed = positiveId.safeParse(fields.id ?? '');
		if (!idParsed.success) return fail(400, { message: 'Geçersiz kategori kimliği.' });

		const ok = await deleteCategory(db, admin.businessId, idParsed.data);
		if (!ok) return fail(404, { message: 'Kategori bulunamadı.' });
		return { ok: true, message: 'Kategori silindi.' };
	}
};
