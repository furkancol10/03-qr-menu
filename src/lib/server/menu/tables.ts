import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { tables } from '../db/schema';

export type TableInput = {
	code: string;
	label: string;
	active: boolean;
};

export async function listTables(db: Db, businessId: number) {
	return db.select().from(tables).where(eq(tables.businessId, businessId)).orderBy(asc(tables.id));
}

export async function createTable(db: Db, businessId: number, input: TableInput) {
	const [row] = await db
		.insert(tables)
		.values({
			businessId,
			code: input.code,
			label: input.label,
			active: input.active
		})
		.returning();
	return row;
}

export async function updateTable(db: Db, businessId: number, tableId: number, input: TableInput) {
	const [row] = await db
		.update(tables)
		.set({
			code: input.code,
			label: input.label,
			active: input.active
		})
		.where(and(eq(tables.id, tableId), eq(tables.businessId, businessId)))
		.returning();
	return row ?? null;
}

export async function deleteTable(db: Db, businessId: number, tableId: number): Promise<boolean> {
	const deleted = await db
		.delete(tables)
		.where(and(eq(tables.id, tableId), eq(tables.businessId, businessId)))
		.returning({ id: tables.id });
	return deleted.length > 0;
}
