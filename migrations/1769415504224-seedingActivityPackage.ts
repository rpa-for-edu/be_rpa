import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedingActivityPackage1769415504224 implements MigrationInterface {
  name = 'SeedingActivityPackage1769415504224';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Debug: Log current directory and file path
    console.log('Current __dirname:', __dirname);
    console.log('Looking for constant file at: ./constant/activity-package.constant');

    // Load data from constant file in same directory
    let constantModule;
    try {
      constantModule = require('./constant/activity-package.constant');
      console.log('✓ Successfully loaded constant module');
      console.log('Module keys:', Object.keys(constantModule));
    } catch (error) {
      console.error('✗ Failed to load constant module:', error.message);
      console.error('Error stack:', error.stack);
      return;
    }

    const ActivityPackages = constantModule.ActivityPackages;
    console.log('ActivityPackages type:', typeof ActivityPackages);
    console.log('ActivityPackages is array:', Array.isArray(ActivityPackages));
    console.log(
      'ActivityPackages length:',
      ActivityPackages ? ActivityPackages.length : 'undefined',
    );

    if (!ActivityPackages || ActivityPackages.length === 0) {
      console.log('⚠ No ActivityPackages found to seed');
      return;
    }

    console.log(`Starting to seed ${ActivityPackages.length} activity packages...`);

    // Seed Activity Packages
    for (const pkg of ActivityPackages) {
      // Check if package already exists
      const existingPackage = await queryRunner.query(
        `SELECT id FROM activity_package WHERE id = ?`,
        [pkg._id],
      );

      if (existingPackage.length > 0) {
        console.log(`Package "${pkg._id}" already exists, skipping...`);
        continue;
      }

      // Insert Activity Package
      await queryRunner.query(
        `
                INSERT INTO activity_package (id, displayName, description, library, isActive)
                VALUES (?, ?, ?, ?, ?)
            `,
        [pkg._id, pkg.displayName, pkg.description || null, pkg.library || null, true],
      );

      console.log(`✓ Inserted package: ${pkg.displayName}`);

      // Insert Activity Templates for this package
      if (pkg.activityTemplates && pkg.activityTemplates.length > 0) {
        for (const template of pkg.activityTemplates) {
          // Skip templates without keyword (required field)
          if (!(template as any).keyword) {
            console.log(`  ⚠ Skipping template "${template.displayName}" - missing keyword`);
            continue;
          }

          // Generate UUID for template
          const templateId = await queryRunner.query(`SELECT UUID() as id`);
          const templateUuid = templateId[0].id;

          // Insert Activity Template
          await queryRunner.query(
            `
                        INSERT INTO activity_template (id, name, description, keyword, activityPackageId)
                        VALUES (?, ?, ?, ?, ?)
                    `,
            [
              templateUuid,
              template.displayName,
              template.description || null,
              (template as any).keyword,
              pkg._id,
            ],
          );

          // Insert Arguments
          if ((template as any).arguments) {
            for (const [argName, argConfig] of Object.entries((template as any).arguments)) {
              const argId = await queryRunner.query(`SELECT UUID() as id`);
              const argUuid = argId[0].id;

              // Handle default value serialization for JSON column
              let defaultValue = null;
              const rawValue = (argConfig as any).value;

              if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
                // All values must be JSON stringified for JSON column type
                defaultValue = JSON.stringify(rawValue);
              }

              await queryRunner.query(
                `
                                INSERT INTO argument (id, name, description, type, keywordArgument, isRequired, defaultValue, activityTemplateId)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `,
                [
                  argUuid,
                  argName,
                  (argConfig as any).description || null,
                  (argConfig as any).type,
                  (argConfig as any).keywordArg || null,
                  false, // Default to not required
                  defaultValue,
                  templateUuid,
                ],
              );
            }
          }

          // Insert Return Value
          if ((template as any).return) {
            const returnId = await queryRunner.query(`SELECT UUID() as id`);
            const returnUuid = returnId[0].id;

            await queryRunner.query(
              `
                            INSERT INTO return_value (id, type, description, displayName, activityTemplateId)
                            VALUES (?, ?, ?, ?, ?)
                        `,
              [
                returnUuid,
                (template as any).return.type,
                (template as any).return.description || null,
                (template as any).return.displayName || null,
                templateUuid,
              ],
            );
          }
        }
        console.log(
          `  ✓ Inserted ${pkg.activityTemplates.length} templates for ${pkg.displayName}`,
        );
      }
    }

    console.log(
      `\n✅ Successfully seeded ${ActivityPackages.length} activity packages into database`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete all data in reverse order (due to foreign keys)
    console.log('Deleting all activity packages data...');

    // Delete return values
    await queryRunner.query(`DELETE FROM return_value`);
    console.log('✓ Deleted all return values');

    // Delete arguments
    await queryRunner.query(`DELETE FROM argument`);
    console.log('✓ Deleted all arguments');

    // Delete activity templates
    await queryRunner.query(`DELETE FROM activity_template`);
    console.log('✓ Deleted all activity templates');

    // Delete activity packages
    await queryRunner.query(`DELETE FROM activity_package`);
    console.log('✓ Deleted all activity packages');

    console.log('\n✅ Successfully cleaned up all activity packages data from database');
  }
}
