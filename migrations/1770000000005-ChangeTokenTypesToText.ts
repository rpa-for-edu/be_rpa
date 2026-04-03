import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeTokenTypesToText1770000000005 implements MigrationInterface {
  name = 'ChangeTokenTypesToText1770000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`connection\`
      CHANGE \`accessToken\` \`accessToken\` TEXT NOT NULL,
      CHANGE \`refreshToken\` \`refreshToken\` TEXT NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`connection\`
      CHANGE \`accessToken\` \`accessToken\` VARCHAR(255) NOT NULL,
      CHANGE \`refreshToken\` \`refreshToken\` VARCHAR(255) NOT NULL
    `);
  }
}
