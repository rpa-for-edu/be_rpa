import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVietnameseToActivity1770000000003 implements MigrationInterface {
    name = 'AddVietnameseToActivity1770000000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`activity_package\` ADD \`display_name_vi\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`activity_package\` ADD \`description_vi\` varchar(255) NULL`);
        
        await queryRunner.query(`ALTER TABLE \`activity_template\` ADD \`name_vi\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`activity_template\` ADD \`description_vi\` varchar(255) NULL`);
        
        await queryRunner.query(`ALTER TABLE \`argument\` ADD \`description_vi\` varchar(255) NULL`);

        await queryRunner.query(`ALTER TABLE \`return_value\` ADD \`description_vi\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`return_value\` ADD \`display_name_vi\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`return_value\` DROP COLUMN \`display_name_vi\``);
        await queryRunner.query(`ALTER TABLE \`return_value\` DROP COLUMN \`description_vi\``);

        await queryRunner.query(`ALTER TABLE \`argument\` DROP COLUMN \`description_vi\``);

        await queryRunner.query(`ALTER TABLE \`activity_template\` DROP COLUMN \`description_vi\``);
        await queryRunner.query(`ALTER TABLE \`activity_template\` DROP COLUMN \`name_vi\``);

        await queryRunner.query(`ALTER TABLE \`activity_package\` DROP COLUMN \`description_vi\``);
        await queryRunner.query(`ALTER TABLE \`activity_package\` DROP COLUMN \`display_name_vi\``);
    }
}
