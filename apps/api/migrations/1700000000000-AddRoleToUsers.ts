// apps/api/migrations/1700000000000-AddRoleToUsers.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRoleToUsers1700000000000 implements MigrationInterface {
	name = 'AddRoleToUsers1700000000000'

	public async up(q: QueryRunner): Promise<void> {
		// добавить колонку role, если её ещё нет
		await q.query(`
      ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
    `)

		// назначить конкретного пользователя админом (без ошибки, если его ещё нет)
		await q.query(`
      UPDATE users
      SET role = 'admin'
      WHERE lower(email) = lower('artemprokopev@internet.ru');
    `)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`
      ALTER TABLE IF EXISTS users
      DROP COLUMN IF EXISTS role;
    `)
	}
}
