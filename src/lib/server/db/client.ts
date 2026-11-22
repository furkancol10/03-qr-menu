import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const posInt = (v: string | undefined, d: number) => {
	const n = Number(v);
	return v && Number.isInteger(n) && n > 0 ? n : d;
};

/**
 * Serverless (Vercel) + Neon pooler ayarları, ortam değişkenleriyle ezilebilir. Her Lambda örneği
 * kendi havuzunu açar: `max` küçük tutulur (varsayılan 3), boşta bağlantı `idle_timeout` sn sonra
 * kapanır, `max_lifetime` sunucunun kapattığı eski TCP bağlantılarını önler. `prepare: false`
 * (pgbouncer transaction modu prepared statement'ı desteklemez) sabittir.
 */
export function poolOptions(env: Record<string, string | undefined> = process.env) {
	return {
		max: posInt(env.DB_POOL_MAX, 3),
		idle_timeout: posInt(env.DB_IDLE_TIMEOUT, 20),
		connect_timeout: posInt(env.DB_CONNECT_TIMEOUT, 10),
		max_lifetime: posInt(env.DB_MAX_LIFETIME, 1800),
		prepare: false
	};
}

/** Framework'ten bağımsız istemci: testler ve scripts/ de kullanır. */
export function createDb(url: string) {
	const client = postgres(url, { ...poolOptions(), onnotice: () => {} });
	return { db: drizzle(client, { schema }), close: () => client.end() };
}

export type Db = ReturnType<typeof createDb>['db'];
