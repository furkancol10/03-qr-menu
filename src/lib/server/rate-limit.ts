import { eq, lt, sql } from 'drizzle-orm';
import type { Db } from './db/client';
import { rateLimits } from './db/schema';

/**
 * Postgres tabanlı sabit pencere hız sınırı. Durum veritabanındadır: Vercel gibi serverless
 * ortamda tüm örnekler aynı sayacı görür, soğuk başlangıç sıfırlamaz. Saat olarak veritabanının
 * `now()` değeri kullanılır (örnekler arası saat farkı yok).
 */
export type Limit = { max: number; windowMs: number };

export type RateLimiter = {
	/** İsteği sayar; limit içindeyse true. `now` yalnız testler için (varsayılan: DB saati). */
	hit(key: string, limit: Limit, now?: Date): Promise<boolean>;
	reset(key: string): Promise<void>;
};

/** Süresi dolmuş satırların temizliği: her ~50 çağrıdan birinde. */
const PURGE_EVERY = 50;

export function createRateLimiter(db: Db): RateLimiter {
	let calls = 0;
	return {
		async hit(key, { max, windowMs }, now) {
			const at = now ? sql`${now.toISOString()}::timestamptz` : sql`now()`;
			const ms = sql`(${windowMs} * interval '1 millisecond')`;
			const [row] = await db
				.insert(rateLimits)
				.values({ key, count: 1, expiresAt: sql`${at} + ${ms}` })
				.onConflictDoUpdate({
					target: rateLimits.key,
					set: {
						count: sql`CASE WHEN ${rateLimits.expiresAt} <= ${at} THEN 1 ELSE ${rateLimits.count} + 1 END`,
						expiresAt: sql`CASE WHEN ${rateLimits.expiresAt} <= ${at} THEN ${at} + ${ms} ELSE ${rateLimits.expiresAt} END`
					}
				})
				.returning({ count: rateLimits.count });
			if (++calls % PURGE_EVERY === 0)
				await db.delete(rateLimits).where(lt(rateLimits.expiresAt, at));
			return row.count <= max;
		},
		async reset(key) {
			await db.delete(rateLimits).where(eq(rateLimits.key, key));
		}
	};
}
