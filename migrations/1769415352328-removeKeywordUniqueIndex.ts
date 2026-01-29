import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveKeywordUniqueIndex1769415352328 implements MigrationInterface {
  name = 'RemoveKeywordUniqueIndex1769415352328';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique index on keyword column
    await queryRunner.query(
      `ALTER TABLE \`activity_template\` DROP INDEX \`IDX_65ffca13c2fb3ab7cc6e483c4c\``,
    );
    console.log('✓ Dropped unique index on activity_template.keyword');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the unique index if needed to rollback
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_65ffca13c2fb3ab7cc6e483c4c\` ON \`activity_template\` (\`keyword\`)`,
    );
    console.log('✓ Recreated unique index on activity_template.keyword');
  }
}
