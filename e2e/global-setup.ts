import { createDb } from '../src/lib/server/db/client';
import { rateLimits } from '../src/lib/server/db/schema';
import { resetDemo } from '../src/lib/server/demo/seed';

/** Her e2e koşusundan önce demo kafeyi sıfırdan kurar ve hız sınırı sayaçlarını temizler. */
export default async function globalSetup() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL tanımlı değil (.env)');
	const { db, close } = createDb(url);
	await resetDemo(db);
	await db.delete(rateLimits);
	await close();
}
