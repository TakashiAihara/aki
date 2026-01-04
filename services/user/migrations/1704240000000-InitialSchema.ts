import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704240000000 implements MigrationInterface {
  name = 'InitialSchema1704240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable required extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" VARCHAR(255) NOT NULL,
        "display_name" VARCHAR(100) NOT NULL,
        "avatar_url" VARCHAR(500),
        "household_id" UUID,
        "notification_preferences" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "deletion_requested_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "idx_users_household" ON "users" ("household_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_users_deletion" ON "users" ("deletion_requested_at") WHERE "deletion_requested_at" IS NOT NULL`,
    );

    // OAuth links table
    await queryRunner.query(`
      CREATE TABLE "oauth_links" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "provider" VARCHAR(20) NOT NULL CHECK ("provider" IN ('google', 'apple')),
        "provider_user_id" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_oauth_provider_uid" UNIQUE ("provider", "provider_user_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_oauth_user" ON "oauth_links" ("user_id")`);

    // Refresh tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" VARCHAR(64) NOT NULL,
        "device_info" JSONB NOT NULL DEFAULT '{}',
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_refresh_token_hash" UNIQUE ("token_hash")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_refresh_user" ON "refresh_tokens" ("user_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_token_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_refresh_expires" ON "refresh_tokens" ("expires_at")`);

    // Auth events table (audit log)
    await queryRunner.query(`
      CREATE TABLE "auth_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "event_type" VARCHAR(50) NOT NULL,
        "ip_address" INET NOT NULL,
        "user_agent" VARCHAR(500),
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_auth_event_user" ON "auth_events" ("user_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_event_type" ON "auth_events" ("event_type", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_event_time" ON "auth_events" ("created_at" DESC)`,
    );

    // Trigger for updated_at timestamps
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON "users"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_users_updated_at ON "users"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
