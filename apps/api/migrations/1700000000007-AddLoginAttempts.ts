import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLoginAttempts1761000000000 implements MigrationInterface {
	name = 'AddLoginAttempts1761000000000'

	public async up(q: QueryRunner): Promise<void> {
		await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)
		await q.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        login text NOT NULL,
        attempt_time timestamptz NOT NULL DEFAULT now(),
        success boolean NOT NULL DEFAULT false,
        blocked_until timestamptz NULL
      );
    `)
		await q.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_login_time
        ON login_attempts (login, attempt_time DESC);
    `)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`DROP INDEX IF EXISTS idx_login_attempts_login_time;`)
		await q.query(`DROP TABLE IF EXISTS login_attempts;`)
	}
}
