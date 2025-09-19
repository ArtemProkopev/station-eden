// apps/api/migrations/1700000000001-EnsureAdminUser.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class EnsureAdminUser1700000000001 implements MigrationInterface {
	name = 'EnsureAdminUser1700000000001'

	public async up(q: QueryRunner): Promise<void> {
		await q.query(`
      UPDATE users
      SET role = 'admin'
      WHERE lower(email) = lower('artemprokopev@internet.ru');
    `)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`
      UPDATE users
      SET role = 'user'
      WHERE lower(email) = lower('artemprokopev@internet.ru');
    `)
	}
}
