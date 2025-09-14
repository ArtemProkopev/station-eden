import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRoleToUsers1699999999999 implements MigrationInterface {
  name = 'AddRoleToUsers1699999999999'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // добавить колонку role
    await queryRunner.addColumn('users', new TableColumn({
      name: 'role',
      type: 'text',
      isNullable: false,
      default: `'user'`,
    }));
    // назначить админом конкретный email
    await queryRunner.query(
      `UPDATE users SET role='admin' WHERE lower(email)=lower('artemprokopev@internet.ru')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'role');
  }
}
