import { pgTable, uuid, varchar, decimal, date, text, boolean, timestamp, index, check, integer } from 'drizzle-orm/pg-core';
import { sql, InferSelectModel } from 'drizzle-orm';

export type InventoryItem = InferSelectModel<typeof inventoryItems> & {
  category?: InferSelectModel<typeof categories>;
  storageLocation?: InferSelectModel<typeof storageLocations>;
};

export type Category = InferSelectModel<typeof categories>;
export type StorageLocation = InferSelectModel<typeof storageLocations>;

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
}, (table) => ({
  nameIdx: index('idx_categories_name').on(table.name),
  sortIdx: index('idx_categories_sort').on(table.sortOrder),
}));

export const storageLocations = pgTable('storage_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  sortOrder: integer('sort_order').default(0),
}, (table) => ({
  nameIdx: index('idx_storage_name').on(table.name),
}));

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id'),
  name: varchar('name', { length: 200 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).default('0').notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  expirationDate: date('expiration_date'),
  categoryId: uuid('category_id').notNull(),
  storageLocationId: uuid('storage_location_id'),
  imageUrl: varchar('image_url', { length: 500 }),
  notes: text('notes'),
  isDepleted: boolean('is_depleted').default(false).notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid('updated_by').notNull(),
}, (table) => ({
  householdCreatedIdx: index('idx_inventory_household_created').on(table.householdId, table.createdAt),
  householdNameIdx: index('idx_inventory_household_name').on(table.householdId, table.name),
  householdIdx: index('idx_inventory_household').on(table.householdId),
  expirationIdx: index('idx_inventory_expiration').on(table.expirationDate),
  quantityCheck: check('chk_quantity_positive', sql`${table.quantity} >= 0`),
}));