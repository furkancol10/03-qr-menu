import { eq } from 'drizzle-orm';
import { generateQrPngDataUrl, generateQrSvg, menuTableUrl } from '#lib/qr.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import { listTables } from '#lib/server/menu/tables.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const admin = requireAdmin(locals);
	const [[business], allTables] = await Promise.all([
		db
			.select({ slug: businesses.slug, name: businesses.name })
			.from(businesses)
			.where(eq(businesses.id, admin.businessId)),
		listTables(db, admin.businessId)
	]);

	const slug = business?.slug ?? '';
	const origin = url.origin;
	const activeTables = allTables.filter((t) => t.active);

	const cards = await Promise.all(
		activeTables.map(async (t) => {
			const targetUrl = menuTableUrl(origin, slug, t.code);
			const [svg, pngDataUrl] = await Promise.all([
				generateQrSvg(targetUrl),
				generateQrPngDataUrl(targetUrl)
			]);
			return {
				id: t.id,
				code: t.code,
				label: t.label,
				targetUrl,
				svg,
				pngDataUrl
			};
		})
	);

	const generalUrl = menuTableUrl(origin, slug);
	const [generalSvg, generalPng] = await Promise.all([
		generateQrSvg(generalUrl),
		generateQrPngDataUrl(generalUrl)
	]);

	return {
		businessName: business?.name ?? '',
		slug,
		general: { url: generalUrl, svg: generalSvg, pngDataUrl: generalPng },
		cards
	};
};
