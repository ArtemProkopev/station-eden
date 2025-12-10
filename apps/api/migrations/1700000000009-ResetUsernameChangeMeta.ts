import { MigrationInterface, QueryRunner } from 'typeorm'

export class ResetUsernameChangeMeta1700000000009
	implements MigrationInterface
{
	name = 'ResetUsernameChangeMeta1700000000009'

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Сбрасываем метаданные смены ника для всех пользователей.
		// После этого первая смена ника будет доступна сразу,
		// а отсчёт 30 дней начнётся с момента первой реальной смены.
		await queryRunner.query(`
      UPDATE "users"
      SET "username_changed_at" = NULL
    `)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Откатить до старых значений нельзя (мы их не сохранили) — оставляем пустым.
	}
}
