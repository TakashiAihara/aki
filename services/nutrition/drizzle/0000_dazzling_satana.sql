CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid,
	"name" varchar(200) NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit" varchar(20) NOT NULL,
	"expiration_date" date,
	"category_id" uuid NOT NULL,
	"storage_location_id" uuid,
	"image_url" varchar(500),
	"notes" text,
	"is_depleted" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "chk_quantity_positive" CHECK ("inventory_items"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "storage_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "storage_locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "idx_categories_name" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_categories_sort" ON "categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_inventory_household_created" ON "inventory_items" USING btree ("household_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_inventory_household_name" ON "inventory_items" USING btree ("household_id","name");--> statement-breakpoint
CREATE INDEX "idx_inventory_household" ON "inventory_items" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_expiration" ON "inventory_items" USING btree ("expiration_date");--> statement-breakpoint
CREATE INDEX "idx_storage_name" ON "storage_locations" USING btree ("name");