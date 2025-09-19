// apps/api/migrations/1699999999999-AddRoleToUsers.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRoleToUsers1699999999999 implements MigrationInterface {
	name = 'AddRoleToUsers1699999999999'

	public async up(queryRunner: QueryRunner): Promise<void> {
		// 1) Добавить колонку role, если таблица/колонка есть/нет
		await queryRunner.query(`
      ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
    `)

		// 2) Назначить администратора, только если колонка role уже существует
		await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'role'
        ) THEN
          UPDATE users
          SET role = 'admin'
          WHERE lower(email) = lower('artemprokopev@internet.ru');
        END IF;
      END$$;
    `)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      ALTER TABLE IF EXISTS users
      DROP COLUMN IF EXISTS role;
    `)
	}
}
