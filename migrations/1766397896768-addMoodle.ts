import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMoodle1766397896768 implements MigrationInterface {
    name = 'AddMoodle1766397896768'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add 'Moodle' to connection provider enum
        await queryRunner.query(`ALTER TABLE \`connection\` CHANGE \`provider\` \`provider\` enum ('Google Drive', 'Google Sheets', 'Gmail', 'Google Docs', 'Google Classroom', 'Google Forms', 'SAP Mock', 'ERP_Next', 'Moodle') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove 'Moodle' from connection provider enum
        await queryRunner.query(`ALTER TABLE \`connection\` CHANGE \`provider\` \`provider\` enum ('Google Drive', 'Google Sheets', 'Gmail', 'Google Docs', 'Google Classroom', 'Google Forms', 'SAP Mock', 'ERP_Next') NOT NULL`);
    }

}
