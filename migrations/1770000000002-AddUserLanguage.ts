import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserLanguage1770000000002 implements MigrationInterface {
    name = 'AddUserLanguage1770000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`language\` enum ('vi', 'en') NOT NULL DEFAULT 'vi'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`language\``);
    }
}
