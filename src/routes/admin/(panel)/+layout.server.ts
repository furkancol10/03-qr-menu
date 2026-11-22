import { eq } from 'drizzle-orm';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { isDemoBusiness } from '#lib/server/blob/upload.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const [b] = await db
		.select({
			id: businesses.id,
			name: businesses.name,
			slug: businesses.slug,
			settings: businesses.settings
		})
		.from(businesses)
		.where(eq(businesses.id, admin.businessId));

	return {
		businessName: b?.name ?? '',
		businessSlug: b?.slug ?? '',
		isDemo: b ? isDemoBusiness(b) : false,
		email: admin.email
	};
};
