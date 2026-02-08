import { MigrationInterface, QueryRunner } from 'typeorm'

export class DropTelegramId1700000000011 implements MigrationInterface {
	name = 'DropTelegramId1700000000011'

	public async up(q: QueryRunner): Promise<void> {
		await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "telegram_id";`)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`ALTER TABLE "users" ADD COLUMN "telegram_id" text;`)
	}
}
