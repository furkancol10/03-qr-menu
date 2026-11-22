import { createDb } from '../src/lib/server/db/client';
import { ensureDemo } from '../src/lib/server/demo/seed';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

/**
 * Vercel build adımı (`vercel-build`): migration'ları uygular, demo kafe yoksa kurar.
 * İdempotenttir; mevcut veriyi silmez. Bağlantı: Neon'un DIREKT (unpooled) adresi
 * (DATABASE_URL_UNPOOLED), yoksa DATABASE_URL.
 */
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
	if (process.env.VERCEL_ENV === 'production') {
		throw new Error('Production build için DATABASE_URL_UNPOOLED/DATABASE_URL tanımlı değil');
	}
	console.warn('deploy-db: veritabanı adresi yok, migration atlandı');
	process.exit(0);
}
if (!process.env.DATABASE_URL_UNPOOLED) {
	console.warn('deploy-db: DATABASE_URL_UNPOOLED yok, DATABASE_URL ile migrate ediliyor');
}

const { db, close } = createDb(url);
try {
	await migrate(db, { migrationsFolder: './drizzle' });
	console.log('deploy-db: migration tamam');
	if (process.env.SEED_DEMO !== 'false') {
		const seeded = await ensureDemo(db);
		console.log(seeded ? 'deploy-db: demo kafe kuruldu' : 'deploy-db: demo kafe zaten var');
	}
} finally {
	await close();
}
