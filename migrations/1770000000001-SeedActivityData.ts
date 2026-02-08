import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedActivityData1770000000001 implements MigrationInterface {
  name = 'SeedActivityData1770000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting SeedActivityData migration...');

    // Load data from constant file
    let constantModule;
    try {
      try {
        constantModule = require('./constant/activity-package.constant');
      } catch (e) {
        constantModule = require('../constant/activity-package.constant');
      }
      console.log('✓ Successfully loaded constant module');
    } catch (error) {
      console.error('✗ Failed to load constant module:', error.message);
      return;
    }

    const ActivityPackages = constantModule.ActivityPackages;
    if (!ActivityPackages || ActivityPackages.length === 0) {
      console.log('⚠ No ActivityPackages found to seed');
      return;
    }

    // Disable foreign key checks for bulk operations if needed, but safer to do order correctly
    // await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const pkg of ActivityPackages) {
      console.log(`Processing package: ${pkg.displayName} (${pkg._id})`);

      // 1. Upsert Package
      const existingPackage = await queryRunner.query(
        `SELECT id FROM activity_package WHERE id = ?`,
        [pkg._id]
      );

      if (existingPackage.length === 0) {
        await queryRunner.query(
          `INSERT INTO activity_package (id, displayName, description, library, isActive) VALUES (?, ?, ?, ?, ?)`,
          [pkg._id, pkg.displayName, pkg.description || null, pkg.library || null, true]
        );
      } else {
        await queryRunner.query(
          `UPDATE activity_package SET displayName = ?, description = ?, library = ? WHERE id = ?`,
          [pkg.displayName, pkg.description || null, pkg.library || null, pkg._id]
        );
      }

      // 2. Sync Templates
      if (pkg.activityTemplates && pkg.activityTemplates.length > 0) {
        for (const template of pkg.activityTemplates) {
          if (!template.keyword) continue;

          // Map fields
          let pythonMethod = template.templateId;
          if (pythonMethod && pythonMethod.includes('.')) {
              pythonMethod = pythonMethod.split('.').pop();
          }

          // Check existence by packageId + keyword
          const existingTemplate = await queryRunner.query(
            `SELECT id FROM activity_template WHERE activityPackageId = ? AND keyword = ?`,
            [pkg._id, template.keyword]
          );

          let templateUuid;

          if (existingTemplate.length > 0) {
            templateUuid = existingTemplate[0].id;
            // Update including new columns
            await queryRunner.query(
              `UPDATE activity_template 
               SET name = ?, description = ?, 
                   keyword_name = ?, python_method = ?, is_auto_generated = ?,
                   type = ?, icon_code = ?
               WHERE id = ?`,
              [
                template.displayName,
                template.description || null,
                template.keyword, // keyword_name matches keyword
                pythonMethod,
                false,
                template.type || 'activity',
                template.iconCode || null,
                templateUuid
              ]
            );
          } else {
            // Insert
            const uuidResult = await queryRunner.query(`SELECT UUID() as id`);
            templateUuid = uuidResult[0].id;
            
            await queryRunner.query(
              `INSERT INTO activity_template 
               (id, name, description, keyword, activityPackageId, 
                keyword_name, python_method, is_auto_generated,
                type, icon_code)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                templateUuid,
                template.displayName,
                template.description || null,
                template.keyword,
                pkg._id,
                template.keyword,
                pythonMethod,
                false,
                template.type || 'activity',
                template.iconCode || null
              ]
            );
          }

          // 3. Sync Arguments (Delete all and re-insert)
          await queryRunner.query(`DELETE FROM argument WHERE activityTemplateId = ?`, [templateUuid]);

          if (template.arguments) {
            for (const [argName, argConfig] of Object.entries(template.arguments)) {
              const argData = argConfig as any;
              const argUuid = (await queryRunner.query(`SELECT UUID() as id`))[0].id;
              
              let defaultValue = null;
              if (argData.value !== undefined && argData.value !== null && argData.value !== '') {
                 defaultValue = JSON.stringify(argData.value);
              }

              await queryRunner.query(
                `INSERT INTO argument (id, name, description, type, keywordArgument, isRequired, defaultValue, activityTemplateId)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  argUuid,
                  argName,
                  argData.description || null,
                  argData.type,
                  argData.keywordArg || null,
                  false,
                  defaultValue,
                  templateUuid
                ]
              );
            }
          }

          // 4. Sync Return Value (Delete and re-insert)
          await queryRunner.query(`DELETE FROM return_value WHERE activityTemplateId = ?`, [templateUuid]);
          
          if (template.return) {
             const retData = template.return as any;
             const retUuid = (await queryRunner.query(`SELECT UUID() as id`))[0].id;

             await queryRunner.query(
               `INSERT INTO return_value (id, type, description, displayName, activityTemplateId)
                VALUES (?, ?, ?, ?, ?)`,
               [
                 retUuid,
                 retData.type,
                 retData.description || null,
                 retData.displayName || null,
                 templateUuid
               ]
             );
          }
        }
      }
    }
    console.log('✅ SeedActivityData migration completed.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting SeedActivityData migration...');

    // Load data from constant file to know what to delete
    let constantModule;
    try {
      try {
        constantModule = require('./constant/activity-package.constant');
      } catch (e) {
        constantModule = require('../constant/activity-package.constant');
      }
    } catch (error) {
      console.error('✗ Failed to load constant module for revert:', error.message);
      return;
    }

    const ActivityPackages = constantModule.ActivityPackages;
    if (!ActivityPackages || ActivityPackages.length === 0) {
      return;
    }

    const packageIds = ActivityPackages.map(p => p._id);

    if (packageIds.length > 0) {
        // Create placeholders for IN clause
        const placeholders = packageIds.map(() => '?').join(',');
        
        // 1. Delete Activity Templates associated with these packages
        // (Arguments and ReturnValues should cascade delete from Template)
        await queryRunner.query(
            `DELETE FROM activity_template WHERE activityPackageId IN (${placeholders})`,
            packageIds
        );

        // 2. Delete Activity Packages
        await queryRunner.query(
            `DELETE FROM activity_package WHERE id IN (${placeholders})`,
            packageIds
        );
        
        console.log(`✓ Deleted ${packageIds.length} activity packages and their templates.`);
    }

    console.log('✅ Reverted SeedActivityData migration.');
  }
}
