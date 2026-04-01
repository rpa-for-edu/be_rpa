import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessStatus1770000001000 implements MigrationInterface {
  name = 'AddProcessStatus1770000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`process\` ADD \`status\` varchar(50) NOT NULL DEFAULT 'Draft'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`process\` DROP \`status\``,
    );
  }
}
