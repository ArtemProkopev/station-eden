import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRoleToUsers1699999999999 implements MigrationInterface {
	name = 'AddRoleToUsers1699999999999'

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Добавляем колонку, если её ещё нет
		await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    `)

		// Назначить админа (будет работать и при существующей колонке)
		await queryRunner.query(`
      UPDATE users
      SET role = 'admin'
      WHERE lower(email) = lower('artemprokopev@internet.ru')
    `)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`)
	}
}
