import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { categories } from '../db/schema';

export type CategoryInput = {
	nameTr: string;
	nameEn: string | null;
	sortOrder: number;
	active: boolean;
};

export async function listCategories(db: Db, businessId: number) {
	return db
		.select()
		.from(categories)
		.where(eq(categories.businessId, businessId))
		.orderBy(asc(categories.sortOrder), asc(categories.id));
}

export async function createCategory(db: Db, businessId: number, input: CategoryInput) {
	const [row] = await db
		.insert(categories)
		.values({
			businessId,
			nameTr: input.nameTr,
			nameEn: input.nameEn,
			sortOrder: input.sortOrder,
			active: input.active
		})
		.returning();
	return row;
}

export async function updateCategory(
	db: Db,
	businessId: number,
	categoryId: number,
	input: CategoryInput
) {
	const [row] = await db
		.update(categories)
		.set({
			nameTr: input.nameTr,
			nameEn: input.nameEn,
			sortOrder: input.sortOrder,
			active: input.active
		})
		.where(and(eq(categories.id, categoryId), eq(categories.businessId, businessId)))
		.returning();
	return row ?? null;
}

export async function deleteCategory(
	db: Db,
	businessId: number,
	categoryId: number
): Promise<boolean> {
	const deleted = await db
		.delete(categories)
		.where(and(eq(categories.id, categoryId), eq(categories.businessId, businessId)))
		.returning({ id: categories.id });
	return deleted.length > 0;
}
