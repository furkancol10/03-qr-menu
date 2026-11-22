import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { businesses, categories, items, tables } from '../db/schema';

/**
 * `/[slug]` için tek birleşik Drizzle ilişkisel sorgusu: işletme, aktif kategoriler,
 * kategorilere bağlı ürünler ve aktif masalar tek DB gidiş-dönüşünde yüklenir.
 */
export async function getPublicMenuBySlug(db: Db, slug: string, tableCode?: string | null) {
	const business = await db.query.businesses.findFirst({
		where: eq(businesses.slug, slug),
		with: {
			categories: {
				where: eq(categories.active, true),
				orderBy: [asc(categories.sortOrder), asc(categories.id)],
				with: {
					items: {
						orderBy: [asc(items.sortOrder), asc(items.id)]
					}
				}
			},
			tables: {
				where: eq(tables.active, true),
				orderBy: [asc(tables.id)]
			}
		}
	});

	if (!business) return null;

	const cleanCode = tableCode?.trim() || null;
	const activeTable = cleanCode
		? (business.tables.find((t) => t.code === cleanCode) ?? null)
		: null;

	return {
		business: {
			id: business.id,
			slug: business.slug,
			name: business.name,
			whatsappPhone: business.whatsappPhone,
			logoUrl: business.logoUrl,
			settings: business.settings
		},
		categories: business.categories,
		tables: business.tables,
		activeTable,
		requestedTableCode: cleanCode
	};
}
