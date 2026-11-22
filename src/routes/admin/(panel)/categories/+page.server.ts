import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { createCategoryActions } from '#lib/server/menu/admin-actions.ts';
import { listCategories } from '#lib/server/menu/categories.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const categories = await listCategories(db, admin.businessId);
	return { categories };
};

export const actions: Actions = createCategoryActions(db);
