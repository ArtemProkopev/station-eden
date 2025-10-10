import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarAndFrameToUser1712345678901 implements MigrationInterface {
    name = 'AddAvatarAndFrameToUser1712345678901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "avatar" TEXT NULL,
            ADD COLUMN "frame" TEXT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "avatar",
            DROP COLUMN "frame"
        `);
    }
}
