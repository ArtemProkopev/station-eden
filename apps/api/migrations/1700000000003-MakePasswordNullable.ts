// apps/api/migrations/1700000000003-MakePasswordNullable.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class MakePasswordNullable1700000000003 implements MigrationInterface {
	name = 'MakePasswordNullable1700000000003'

	public async up(q: QueryRunner): Promise<void> {
		await q.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`)
		await q.query(
			`UPDATE users SET password_hash = NULL WHERE password_hash = 'google';`
		)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(
			`UPDATE users SET password_hash = 'google' WHERE password_hash IS NULL;`
		)
		await q.query(`ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;`)
	}
}
