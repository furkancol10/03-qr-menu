import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lte } from 'drizzle-orm';
import type { Db } from '../db/client';
import { admins, sessions } from '../db/schema';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'oturum';

/** DB'de ham token değil SHA-256 özeti tutulur; tablo sızsa bile oturum çalınamaz. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export type SessionAdmin = { adminId: number; businessId: number; email: string };

export async function createSession(db: Db, adminId: number, now: Date = new Date()) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
	await db.insert(sessions).values({ id: hashToken(token), adminId, expiresAt });
	// fırsat düştükçe eski oturumları temizle
	await db.delete(sessions).where(lte(sessions.expiresAt, now));
	return { token, expiresAt };
}

/** Çerezdeki token → admin + business_id; yok/bozuk/süresi dolmuş → null (süresi dolan silinir). */
export async function validateSession(
	db: Db,
	token: string,
	now: Date = new Date()
): Promise<SessionAdmin | null> {
	if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
	const id = hashToken(token);
	const [row] = await db
		.select({ adminId: admins.id, businessId: admins.businessId, email: admins.email })
		.from(sessions)
		.innerJoin(admins, eq(admins.id, sessions.adminId))
		.where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)));
	if (!row) {
		await db.delete(sessions).where(and(eq(sessions.id, id), lte(sessions.expiresAt, now)));
		return null;
	}
	return row;
}

export async function deleteSession(db: Db, token: string) {
	await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}
