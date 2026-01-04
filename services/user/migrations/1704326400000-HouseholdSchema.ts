import { MigrationInterface, QueryRunner } from 'typeorm';

export class HouseholdSchema1704326400000 implements MigrationInterface {
  name = 'HouseholdSchema1704326400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create households table
    await queryRunner.query(`
      CREATE TABLE households (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        owner_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create index on owner_id
    await queryRunner.query(`
      CREATE INDEX idx_households_owner ON households(owner_id)
    `);

    // Create household_members table
    await queryRunner.query(`
      CREATE TABLE household_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_user_household UNIQUE (user_id)
      )
    `);

    // Create indexes for household_members
    await queryRunner.query(`
      CREATE INDEX idx_household_members_household ON household_members(household_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_household_members_user ON household_members(user_id)
    `);

    // Create household_invites table
    await queryRunner.query(`
      CREATE TABLE household_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        code VARCHAR(8) NOT NULL UNIQUE,
        created_by UUID NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        used_by UUID,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create index on invite code
    await queryRunner.query(`
      CREATE INDEX idx_invite_code ON household_invites(code)
    `);

    // Create index for finding active invites
    await queryRunner.query(`
      CREATE INDEX idx_household_invites_household ON household_invites(household_id)
    `);

    // Add foreign key from users to households (optional household membership)
    // Note: household_id column already exists in users table from initial schema
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT fk_users_household
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key from users
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_household
    `);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS household_invites`);
    await queryRunner.query(`DROP TABLE IF EXISTS household_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS households`);
  }
}
