import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { categories, items } from '../db/schema';

export type ItemInput = {
	categoryId: number;
	nameTr: string;
	nameEn: string | null;
	descTr: string | null;
	descEn: string | null;
	priceKurus: number;
	allergens: string[];
	imageUrl: string | null;
	available: boolean;
	sortOrder: number;
};

export async function listItems(db: Db, businessId: number) {
	return db
		.select()
		.from(items)
		.where(eq(items.businessId, businessId))
		.orderBy(asc(items.sortOrder), asc(items.id));
}

async function ownsCategory(db: Db, businessId: number, categoryId: number): Promise<boolean> {
	const [cat] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.businessId, businessId)));
	return Boolean(cat);
}

export async function createItem(db: Db, businessId: number, input: ItemInput) {
	if (!(await ownsCategory(db, businessId, input.categoryId))) return null;
	const [row] = await db
		.insert(items)
		.values({
			businessId,
			categoryId: input.categoryId,
			nameTr: input.nameTr,
			nameEn: input.nameEn,
			descTr: input.descTr,
			descEn: input.descEn,
			priceKurus: input.priceKurus,
			allergens: input.allergens,
			imageUrl: input.imageUrl,
			available: input.available,
			sortOrder: input.sortOrder
		})
		.returning();
	return row;
}

export async function updateItem(db: Db, businessId: number, itemId: number, input: ItemInput) {
	if (!(await ownsCategory(db, businessId, input.categoryId))) return null;
	const [row] = await db
		.update(items)
		.set({
			categoryId: input.categoryId,
			nameTr: input.nameTr,
			nameEn: input.nameEn,
			descTr: input.descTr,
			descEn: input.descEn,
			priceKurus: input.priceKurus,
			allergens: input.allergens,
			imageUrl: input.imageUrl,
			available: input.available,
			sortOrder: input.sortOrder
		})
		.where(and(eq(items.id, itemId), eq(items.businessId, businessId)))
		.returning();
	return row ?? null;
}

export async function setItemAvailable(
	db: Db,
	businessId: number,
	itemId: number,
	available: boolean
) {
	const [row] = await db
		.update(items)
		.set({ available })
		.where(and(eq(items.id, itemId), eq(items.businessId, businessId)))
		.returning();
	return row ?? null;
}

export async function deleteItem(db: Db, businessId: number, itemId: number): Promise<boolean> {
	const deleted = await db
		.delete(items)
		.where(and(eq(items.id, itemId), eq(items.businessId, businessId)))
		.returning({ id: items.id });
	return deleted.length > 0;
}
