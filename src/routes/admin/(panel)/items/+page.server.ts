import { eq } from 'drizzle-orm';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { canUploadImages } from '#lib/server/blob/upload.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import { createItemActions } from '#lib/server/menu/admin-actions.ts';
import { listCategories } from '#lib/server/menu/categories.ts';
import { listItems } from '#lib/server/menu/items.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const [[business], categories, items] = await Promise.all([
		db
			.select({ id: businesses.id, slug: businesses.slug, settings: businesses.settings })
			.from(businesses)
			.where(eq(businesses.id, admin.businessId)),
		listCategories(db, admin.businessId),
		listItems(db, admin.businessId)
	]);

	return {
		categories,
		items,
		canUpload: business ? canUploadImages(business) : false
	};
};

export const actions: Actions = createItemActions(db);
