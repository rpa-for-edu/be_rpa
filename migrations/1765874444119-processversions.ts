import { MigrationInterface, QueryRunner } from 'typeorm';

export class Processversions1765874444119 implements MigrationInterface {
  name = 'Processversions1765874444119';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`process_version\` (\`id\` varchar(36) NOT NULL, \`processId\` varchar(255) NOT NULL, \`tag\` varchar(50) NOT NULL, \`description\` varchar(255) NULL, \`createdBy\` int NOT NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`isCurrent\` tinyint NOT NULL DEFAULT 0, \`processUserId\` int NULL, \`creatorId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    await queryRunner.query(
      `ALTER TABLE \`process_version\` ADD CONSTRAINT \`FK_fa5b4bf5626d59310b49ffbe3ec\` FOREIGN KEY (\`processId\`, \`processUserId\`) REFERENCES \`process\`(\`id\`,\`userId\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`process_version\` ADD CONSTRAINT \`FK_80f2256998c7614424c6318f4de\` FOREIGN KEY (\`creatorId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`process_version\` DROP FOREIGN KEY \`FK_80f2256998c7614424c6318f4de\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`process_version\` DROP FOREIGN KEY \`FK_fa5b4bf5626d59310b49ffbe3ec\``,
    );
    await queryRunner.query(`DROP TABLE \`process_version\``);
  }
}
