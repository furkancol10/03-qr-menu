import { fail } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { createTable, deleteTable, listTables, updateTable } from '#lib/server/menu/tables.ts';
import { fieldErrors, formStrings, positiveId, tableSchema } from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

function isUniqueViolation(err: unknown): boolean {
	if (typeof err !== 'object' || err === null) return false;
	const code =
		(err as { code?: string; cause?: { code?: string } }).code ??
		(err as { cause?: { code?: string } }).cause?.code;
	return code === '23505';
}

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const tables = await listTables(db, admin.businessId);
	return { tables };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
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

	update: async ({ locals, request }) => {
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

	delete: async ({ locals, request }) => {
		const admin = requireAdmin(locals);
		const fields = formStrings(await request.formData());
		const idParsed = positiveId.safeParse(fields.id ?? '');
		if (!idParsed.success) return fail(400, { message: 'Geçersiz masa kimliği.' });

		const ok = await deleteTable(db, admin.businessId, idParsed.data);
		if (!ok) return fail(404, { message: 'Masa bulunamadı.' });
		return { ok: true, message: 'Masa silindi.' };
	}
};
