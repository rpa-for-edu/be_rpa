import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthorizationProvideERPNext1761620113175 implements MigrationInterface {
  name = 'AddAuthorizationProvideERPNext1761620113175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`connection\`
            CHANGE \`provider\` \`provider\`
            ENUM('Google Drive', 'Google Sheets', 'Gmail', 'Google Docs', 'Google Classroom', 'Google Forms', 'SAP Mock', 'ERP_Next')
            NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE \`connection\`
            CHANGE \`provider\` \`provider\`
            ENUM('Google Drive', 'Google Sheets', 'Gmail', 'Google Docs', 'Google Classroom', 'Google Forms', 'SAP Mock')
            NOT NULL
        `);
  }
}
