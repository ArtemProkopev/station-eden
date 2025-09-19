// apps/api/migrations/1690000000000-init.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class init1690000000000 implements MigrationInterface {
	name = 'init1690000000000'

	public async up(q: QueryRunner): Promise<void> {
		await q.query(`CREATE EXTENSION IF NOT EXISTS citext;`)
		await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

		await q.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email citext UNIQUE NOT NULL,
        password_hash text NOT NULL,
        telegram_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)

		await q.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text UNIQUE NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)

		await q.query(
			`CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON refresh_tokens(user_id);`
		)
		await q.query(
			`CREATE INDEX IF NOT EXISTS idx_refresh_expires_at ON refresh_tokens(expires_at);`
		)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`DROP TABLE IF EXISTS refresh_tokens;`)
		await q.query(`DROP TABLE IF EXISTS users;`)
	}
}
