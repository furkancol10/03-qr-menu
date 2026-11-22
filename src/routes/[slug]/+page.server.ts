import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { getPublicMenuBySlug } from '#lib/server/menu/queries.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const masa = url.searchParams.get('masa');
	const menu = await getPublicMenuBySlug(db, params.slug, masa);
	if (!menu) error(404, 'İşletme menüsü bulunamadı.');

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300'
	});

	return menu;
};
