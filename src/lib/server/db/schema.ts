import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique
} from 'drizzle-orm/pg-core';

const id = () => integer().primaryKey().generatedAlwaysAsIdentity();

export type BusinessSettings = {
	isDemo?: boolean;
	address?: string;
	subtitleTr?: string;
	subtitleEn?: string;
};

export const businesses = pgTable(
	'businesses',
	{
		id: id(),
		slug: text().notNull().unique(),
		name: text().notNull(),
		/** wa.me biçimi: yalnız rakam, ülke kodlu (905551234567) */
		whatsappPhone: text('whatsapp_phone'),
		logoUrl: text('logo_url'),
		settings: jsonb().$type<BusinessSettings>().notNull().default({})
	},
	(t) => [
		check(
			'businesses_whatsapp_phone_digits',
			sql`${t.whatsappPhone} IS NULL OR ${t.whatsappPhone} ~ '^[1-9][0-9]{9,14}$'`
		)
	]
);

export const admins = pgTable('admins', {
	id: id(),
	businessId: integer('business_id')
		.notNull()
		.references(() => businesses.id, { onDelete: 'cascade' }),
	email: text().notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const sessions = pgTable('sessions', {
	id: text().primaryKey(),
	adminId: integer('admin_id')
		.notNull()
		.references(() => admins.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

/**
 * Hız sınırı sayaçları (sabit pencere). Anahtar: "<kapsam>:<ip|e-posta>".
 * Her örnek aynı satırı paylaşır; artırma tek bir atomik upsert deyimidir.
 */
export const rateLimits = pgTable(
	'rate_limits',
	{
		key: text().primaryKey(),
		count: integer().notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
	},
	(t) => [index('rate_limits_expires_idx').on(t.expiresAt)]
);

export const categories = pgTable(
	'categories',
	{
		id: id(),
		businessId: integer('business_id')
			.notNull()
			.references(() => businesses.id, { onDelete: 'cascade' }),
		nameTr: text('name_tr').notNull(),
		nameEn: text('name_en'),
		sortOrder: integer('sort_order').notNull().default(0),
		active: boolean().notNull().default(true)
	},
	(t) => [index('categories_business_sort_idx').on(t.businessId, t.sortOrder, t.id)]
);

export const items = pgTable(
	'items',
	{
		id: id(),
		businessId: integer('business_id')
			.notNull()
			.references(() => businesses.id, { onDelete: 'cascade' }),
		categoryId: integer('category_id')
			.notNull()
			.references(() => categories.id, { onDelete: 'cascade' }),
		nameTr: text('name_tr').notNull(),
		nameEn: text('name_en'),
		descTr: text('desc_tr'),
		descEn: text('desc_en'),
		priceKurus: integer('price_kurus').notNull(),
		allergens: text('allergens')
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		imageUrl: text('image_url'),
		available: boolean().notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [
		check('items_price_nonneg', sql`${t.priceKurus} >= 0`),
		index('items_business_category_idx').on(t.businessId, t.categoryId, t.sortOrder, t.id)
	]
);

export const tables = pgTable(
	'tables',
	{
		id: id(),
		businessId: integer('business_id')
			.notNull()
			.references(() => businesses.id, { onDelete: 'cascade' }),
		code: text().notNull(),
		label: text().notNull(),
		active: boolean().notNull().default(true)
	},
	(t) => [unique('tables_business_code_uniq').on(t.businessId, t.code)]
);

export const businessesRelations = relations(businesses, ({ many }) => ({
	categories: many(categories),
	items: many(items),
	tables: many(tables)
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	business: one(businesses, {
		fields: [categories.businessId],
		references: [businesses.id]
	}),
	items: many(items)
}));

export const itemsRelations = relations(items, ({ one }) => ({
	business: one(businesses, {
		fields: [items.businessId],
		references: [businesses.id]
	}),
	category: one(categories, {
		fields: [items.categoryId],
		references: [categories.id]
	})
}));

export const tablesRelations = relations(tables, ({ one }) => ({
	business: one(businesses, {
		fields: [tables.businessId],
		references: [businesses.id]
	})
}));
