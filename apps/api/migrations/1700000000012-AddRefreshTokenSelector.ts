import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRefreshTokenSelector1700000000012 implements MigrationInterface {
	name = 'AddRefreshTokenSelector1700000000012'

	public async up(q: QueryRunner): Promise<void> {
		// 1) selector
		await q.query(`
      ALTER TABLE refresh_tokens
      ADD COLUMN IF NOT EXISTS selector text NOT NULL DEFAULT '';
    `)

		// 2) Снять UNIQUE с token_hash (если есть)
		await q.query(`
      DO $$
      DECLARE
        cname text;
      BEGIN
        SELECT c.conname INTO cname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'refresh_tokens'
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) ILIKE '%(token_hash)%'
        LIMIT 1;

        IF cname IS NOT NULL THEN
          EXECUTE format('ALTER TABLE refresh_tokens DROP CONSTRAINT %I', cname);
        END IF;
      END $$;
    `)

		// 3) Чистим старый "обычный" индекс, если он был
		await q.query(`DROP INDEX IF EXISTS idx_refresh_selector;`)

		// 4) Partial индексы под реальные запросы (revoked=false почти всегда)
		// Быстрый путь refreshViaTokenOnly: selector + свежие
		await q.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_selector_active_created
      ON refresh_tokens (selector, created_at DESC)
      WHERE revoked = false;
    `)

		// Быстрый путь refresh(userId,...): user_id + selector + свежие
		await q.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_user_selector_active_created
      ON refresh_tokens (user_id, selector, created_at DESC)
      WHERE revoked = false;
    `)

		// Fallback refresh(userId,...): user_id + свежие активные
		await q.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_user_active_created
      ON refresh_tokens (user_id, created_at DESC)
      WHERE revoked = false;
    `)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(
			`DROP INDEX IF EXISTS idx_refresh_user_selector_active_created;`,
		)
		await q.query(`DROP INDEX IF EXISTS idx_refresh_user_active_created;`)
		await q.query(`DROP INDEX IF EXISTS idx_refresh_selector_active_created;`)

		await q.query(`
      ALTER TABLE refresh_tokens
      ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);
    `)

		await q.query(`
      ALTER TABLE refresh_tokens
      DROP COLUMN IF EXISTS selector;
    `)
	}
}
