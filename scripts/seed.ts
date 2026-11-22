import { DEMO_ADMIN } from '../src/lib/demo';
import { createDb } from '../src/lib/server/db/client';
import { resetDemo } from '../src/lib/server/demo/seed';

export { resetDemo, ensureDemo, DEMO_SLUG } from '../src/lib/server/demo/seed';

// CLI: node --env-file=.env --import tsx scripts/seed.ts  (demo kafeyi SIFIRLAR)
if (import.meta.url === `file://${process.argv[1]}`) {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL tanımlı değil (.env)');
	const { db, close } = createDb(url);
	const b = await resetDemo(db);
	await close();
	console.log(`seed tamam: /${b.slug} (${b.name}) · yönetim: /admin/login (${DEMO_ADMIN.email})`);
}
