import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessParentRelation1770000001002 implements MigrationInterface {
  name = 'AddProcessParentRelation1770000001002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process\`
      ADD \`parentId\` varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`process\`
      ADD CONSTRAINT \`FK_process_parent_self\`
      FOREIGN KEY (\`parentId\`)
      REFERENCES \`process\`(\`id\`)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_process_parentId\`
      ON \`process\` (\`parentId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`IDX_process_parentId\` ON \`process\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`process\`
      DROP FOREIGN KEY \`FK_process_parent_self\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`process\`
      DROP COLUMN \`parentId\`
    `);
  }
}