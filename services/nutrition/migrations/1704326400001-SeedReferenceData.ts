import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedReferenceData1704326400001 implements MigrationInterface {
  name = 'SeedReferenceData1704326400001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed categories (Japanese)
    await queryRunner.query(`
      INSERT INTO "categories" ("id", "name", "icon", "sortOrder") VALUES
        (uuid_generate_v4(), '野菜', '🥬', 1),
        (uuid_generate_v4(), '果物', '🍎', 2),
        (uuid_generate_v4(), '肉類', '🥩', 3),
        (uuid_generate_v4(), '魚類', '🐟', 4),
        (uuid_generate_v4(), '乳製品', '🧀', 5),
        (uuid_generate_v4(), '調味料', '🧂', 6),
        (uuid_generate_v4(), '飲料', '🥤', 7),
        (uuid_generate_v4(), '日用品', '🧴', 8),
        (uuid_generate_v4(), 'その他', '📦', 9)
    `);

    // Seed storage locations (Japanese)
    await queryRunner.query(`
      INSERT INTO "storage_locations" ("id", "name", "sortOrder") VALUES
        (uuid_generate_v4(), '冷蔵庫', 1),
        (uuid_generate_v4(), '冷凍庫', 2),
        (uuid_generate_v4(), 'パントリー', 3),
        (uuid_generate_v4(), '棚', 4),
        (uuid_generate_v4(), 'その他', 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded data
    await queryRunner.query(`DELETE FROM "storage_locations"`);
    await queryRunner.query(`DELETE FROM "categories"`);
  }
}
