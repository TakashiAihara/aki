import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStatusAndDeletionScheduled1704326400000 implements MigrationInterface {
  name = 'AddUserStatusAndDeletionScheduled1704326400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column with default value
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'active'
    `);

    // Create index on status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_status" ON "users" ("status")
    `);

    // Rename deletion_requested_at to deletion_scheduled_at if it exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='deletion_requested_at'
        ) THEN
          ALTER TABLE "users" RENAME COLUMN "deletion_requested_at" TO "deletion_scheduled_at";
        END IF;
      END $$;
    `);

    // Add deletion_scheduled_at if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "deletion_scheduled_at" TIMESTAMPTZ
    `);

    // Ensure index exists on deletion_scheduled_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_deletion" ON "users" ("deletion_scheduled_at")
    `);

    // Update any existing pending deletions to use new status
    await queryRunner.query(`
      UPDATE "users"
      SET "status" = 'pending_deletion'
      WHERE "deletion_scheduled_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reset status for pending deletions
    await queryRunner.query(`
      UPDATE "users"
      SET "status" = 'active'
      WHERE "status" = 'pending_deletion'
    `);

    // Drop status index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_status"
    `);

    // Drop status column
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "status"
    `);

    // Note: We don't revert the column rename as it could cause data loss
    // The deletion_scheduled_at column will remain
  }
}
