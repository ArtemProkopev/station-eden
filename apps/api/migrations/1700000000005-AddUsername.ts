import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUsername1700000000005 implements MigrationInterface {
	name = 'AddUsername1700000000005'

	public async up(qr: QueryRunner): Promise<void> {
		// citext должен быть уже доступен (в проекте используется citext в email)
		await qr.query(`ALTER TABLE "users" ADD COLUMN "username" citext UNIQUE`)
	}

	public async down(qr: QueryRunner): Promise<void> {
		await qr.query(`ALTER TABLE "users" DROP COLUMN "username"`)
	}
}
