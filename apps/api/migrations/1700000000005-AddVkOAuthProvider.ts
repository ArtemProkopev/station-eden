// apps/api/migrations/1700000000005-AddVkOAuthProvider.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVkOAuthProvider1700000000005 implements MigrationInterface {
	name = 'AddVkOAuthProvider1700000000005'

	public async up(q: QueryRunner): Promise<void> {
		await q.query(`
			DELETE FROM oauth_accounts
			WHERE provider = 'google';
		`)

		await q.query(`
			ALTER TABLE oauth_accounts
			DROP CONSTRAINT IF EXISTS chk_oauth_accounts_provider;
		`)

		await q.query(`
			ALTER TABLE oauth_accounts
			ADD CONSTRAINT chk_oauth_accounts_provider
			CHECK (provider IN ('yandex', 'vk'));
		`)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`
			ALTER TABLE oauth_accounts
			DROP CONSTRAINT IF EXISTS chk_oauth_accounts_provider;
		`)

		await q.query(`
			ALTER TABLE oauth_accounts
			ADD CONSTRAINT chk_oauth_accounts_provider
			CHECK (provider IN ('google', 'yandex', 'vk'));
		`)
	}
}
