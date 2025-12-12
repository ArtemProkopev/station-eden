import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixEmailCodesFK1700000000010 implements MigrationInterface {
	name = 'FixEmailCodesFK1700000000010'

	public async up(q: QueryRunner): Promise<void> {
		// 1) Чистим сирот: записи email_codes с user_id, которого нет в users
		await q.query(`
			DELETE FROM email_codes
			WHERE user_id NOT IN (SELECT id FROM users);
		`)

		// 2) На всякий случай удалим дубликаты по смыслу:
		// один и тот же user_id + email + code + created_at может повториться при сбоях
		// (опционально, но безопасно)
		await q.query(`
			DELETE FROM email_codes a
			USING email_codes b
			WHERE a.id < b.id
				AND a.user_id = b.user_id
				AND a.email = b.email
				AND a.code = b.code
				AND a.created_at = b.created_at;
		`)

		// 3) Добавляем FK: email_codes.user_id -> users.id с CASCADE
		// Сначала убеждаемся, что старого констрейнта нет
		await q.query(`
			ALTER TABLE email_codes
			DROP CONSTRAINT IF EXISTS fk_email_codes_user;
		`)

		await q.query(`
			ALTER TABLE email_codes
			ADD CONSTRAINT fk_email_codes_user
			FOREIGN KEY (user_id)
			REFERENCES users(id)
			ON DELETE CASCADE;
		`)
	}

	public async down(q: QueryRunner): Promise<void> {
		await q.query(`
			ALTER TABLE email_codes
			DROP CONSTRAINT IF EXISTS fk_email_codes_user;
		`)
	}
}
