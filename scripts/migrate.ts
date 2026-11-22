import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb } from '../src/lib/server/db/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL tanımlı değil (.env)');
const { db, close } = createDb(url);
await migrate(db, { migrationsFolder: './drizzle' });
await close();
console.log('migration tamam');
