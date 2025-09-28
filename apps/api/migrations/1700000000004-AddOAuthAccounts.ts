// apps/api/migrations/1700000000004-AddOAuthAccounts.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOAuthAccounts1700000000004 implements MigrationInterface {
	name = 'AddOAuthAccounts1700000000004'

	public async up(q: QueryRunner): Promise<void> {
		await q.query(`
      CREATE TABLE IF NOT EXISTS oauth_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider text NOT NULL,
        provider_user_id text NOT NULL,
        email citext NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_provider_sub UNIQUE (provider, provider_user_id)
      );
    `)
		await q.query(
			`CREATE INDEX IF NOT EXISTS idx_oa_user_id ON oauth_accounts(user_id);`
		)
		await q.query(
			`CREATE INDEX IF NOT EXISTS idx_oa_email ON oauth_accounts(email);`
		)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`DROP TABLE IF EXISTS oauth_accounts;`)
	}
}
