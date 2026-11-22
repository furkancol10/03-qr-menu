import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { createTableActions } from '#lib/server/menu/admin-actions.ts';
import { listTables } from '#lib/server/menu/tables.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const tables = await listTables(db, admin.businessId);
	return { tables };
};

export const actions: Actions = createTableActions(db);
