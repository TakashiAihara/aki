import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventorySchema1704326400000 implements MigrationInterface {
  name = 'CreateInventorySchema1704326400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(50) NOT NULL,
        "icon" varchar(50),
        "sortOrder" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_categories_name" ON "categories" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_categories_sort" ON "categories" ("sortOrder")
    `);

    // Create storage_locations table
    await queryRunner.query(`
      CREATE TABLE "storage_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(50) NOT NULL,
        "sortOrder" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_storage_locations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_storage_locations_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_storage_name" ON "storage_locations" ("name")
    `);

    // Create inventory_items table
    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "householdId" uuid,
        "name" varchar(200) NOT NULL,
        "quantity" decimal(10,2) NOT NULL DEFAULT 0,
        "unit" varchar(20) NOT NULL,
        "expirationDate" date,
        "categoryId" uuid NOT NULL,
        "storageLocationId" uuid,
        "imageUrl" varchar(500),
        "notes" text,
        "isDepleted" boolean NOT NULL DEFAULT false,
        "createdBy" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedBy" uuid NOT NULL,
        CONSTRAINT "PK_inventory_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_items_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_inventory_items_storage_location" FOREIGN KEY ("storageLocationId") REFERENCES "storage_locations"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_quantity_positive" CHECK (quantity >= 0)
      )
    `);

    // Create indexes for inventory_items
    await queryRunner.query(`
      CREATE INDEX "idx_inventory_household" ON "inventory_items" ("householdId")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_household_created" ON "inventory_items" ("householdId", "createdAt" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_household_name" ON "inventory_items" ("householdId", "name")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_expiration" ON "inventory_items" ("expirationDate") WHERE "expirationDate" IS NOT NULL
    `);

    // Create unique index for duplicate detection
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_inventory_unique" ON "inventory_items" ("householdId", LOWER("name"), "expirationDate")
      WHERE "householdId" IS NOT NULL
    `);

    // Create trigger function for auto-updating updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create trigger for inventory_items
    await queryRunner.query(`
      CREATE TRIGGER trg_inventory_updated_at
      BEFORE UPDATE ON "inventory_items"
      FOR EACH ROW
      EXECUTE FUNCTION fn_update_timestamp()
    `);

    // Create trigger function for auto-setting depleted flag
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_set_depleted_flag()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."isDepleted" = (NEW."quantity" = 0);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create trigger for depleted flag
    await queryRunner.query(`
      CREATE TRIGGER trg_inventory_depleted
      BEFORE INSERT OR UPDATE ON "inventory_items"
      FOR EACH ROW
      EXECUTE FUNCTION fn_set_depleted_flag()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_inventory_depleted ON "inventory_items"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_inventory_updated_at ON "inventory_items"`);

    // Drop trigger functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_set_depleted_flag()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_update_timestamp()`);

    // Drop inventory_items table (this will also drop its indexes)
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_items" CASCADE`);

    // Drop storage_locations table
    await queryRunner.query(`DROP TABLE IF EXISTS "storage_locations" CASCADE`);

    // Drop categories table
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE`);
  }
}
