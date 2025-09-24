// apps/api/migrations/1700000000002-AddEmailCodes.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddEmailCodes1700000000002 implements MigrationInterface {
	name = 'AddEmailCodes1700000000002'

	public async up(q: QueryRunner): Promise<void> {
		await q.query(`
      CREATE TABLE IF NOT EXISTS email_codes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        email citext NOT NULL,
        code varchar(6) NOT NULL,
        expires_at timestamptz NOT NULL,
        used boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `)
		await q.query(
			`CREATE INDEX IF NOT EXISTS idx_email_codes_user ON email_codes(user_id)`
		)
		await q.query(
			`CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email)`
		)
		await q.query(
			`CREATE INDEX IF NOT EXISTS idx_email_codes_expires ON email_codes(expires_at)`
		)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`DROP TABLE IF EXISTS email_codes`)
	}
}
