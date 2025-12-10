import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUsernameChangeMeta1700000000008 implements MigrationInterface {
	name = 'AddUsernameChangeMeta1700000000008'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users" ADD COLUMN "username_changed_at" TIMESTAMPTZ`
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users" DROP COLUMN "username_changed_at"`
		)
	}
}
