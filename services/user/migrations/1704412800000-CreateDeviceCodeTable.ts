import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeviceCodeTable1704412800000 implements MigrationInterface {
  name = 'CreateDeviceCodeTable1704412800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "device_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "device_code" varchar(64) NOT NULL,
        "user_code" varchar(9) NOT NULL,
        "client_id" varchar(50) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "user_id" uuid,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "interval" int NOT NULL DEFAULT 5,
        "last_polled_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_device_codes" PRIMARY KEY ("id"),
        CONSTRAINT "uq_device_codes_device_code" UNIQUE ("device_code"),
        CONSTRAINT "uq_device_codes_user_code" UNIQUE ("user_code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_device_codes_device_code" ON "device_codes" ("device_code")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_device_codes_user_code" ON "device_codes" ("user_code")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_device_codes_user" ON "device_codes" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_device_codes_expires" ON "device_codes" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_device_codes_expires"`);
    await queryRunner.query(`DROP INDEX "idx_device_codes_user"`);
    await queryRunner.query(`DROP INDEX "idx_device_codes_user_code"`);
    await queryRunner.query(`DROP INDEX "idx_device_codes_device_code"`);
    await queryRunner.query(`DROP TABLE "device_codes"`);
  }
}
