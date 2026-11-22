import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

export const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL ?? 'postgres://qrmenu:qrmenu@localhost:5434/qrmenu_test';

/** Test veritabanını sıfırlar ve drizzle/ altındaki tüm migration'ları uygular. */
export default async function setup() {
	const sql = postgres(TEST_DATABASE_URL, { onnotice: () => {} });
	try {
		await sql.unsafe('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
		await sql.unsafe('DROP SCHEMA IF EXISTS drizzle CASCADE;');
		await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
	} finally {
		await sql.end();
	}
}
