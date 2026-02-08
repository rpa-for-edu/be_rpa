import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

export class AddUserRoleAndPackageLibrary1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add role column to user table
    const table = await queryRunner.getTable("user");
    const roleColumn = table.findColumnByName("role");
    
    if (!roleColumn) {
      await queryRunner.addColumn("user", new TableColumn({
        name: "role",
        type: "enum",
        enum: ["user", "admin"],
        default: "'user'"
      }));
      // Create index
      await queryRunner.createIndex("user", new TableIndex({
        name: "idx_user_role",
        columnNames: ["role"]
      }));
    }

    // Add library-related columns to packages table
    // Check if columns exist first to avoid errors (or use addColumns with if not exists logic implicitly handled by checking)
    // TypeORM addColumns does not built-in support IF NOT EXISTS in all drivers easily, but separate checks are safer.
    
    const packageCols = [
        new TableColumn({ name: "library_file_name", type: "varchar", length: "255", isNullable: true }),
        new TableColumn({ name: "library_file_type", type: "varchar", length: "10", isNullable: true }),
        new TableColumn({ name: "library_s3_bucket", type: "varchar", length: "255", isNullable: true, default: "'rpa-robot-bktest'" }),
        new TableColumn({ name: "library_s3_key", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "library_s3_url", type: "text", isNullable: true }),
        new TableColumn({ name: "library_checksum", type: "varchar", length: "64", isNullable: true }),
        new TableColumn({ name: "library_version", type: "varchar", length: "50", isNullable: true }),
        // Parsed metadata
        new TableColumn({ name: "parsed_keywords", type: "json", isNullable: true }),
        new TableColumn({ name: "parsed_classes", type: "json", isNullable: true }),
        new TableColumn({ name: "imports", type: "json", isNullable: true }),
        // Parse status
        new TableColumn({ name: "parse_status", type: "enum", enum: ["pending", "success", "failed", "not_applicable"], default: "'pending'", isNullable: true }),
        new TableColumn({ name: "parse_error", type: "text", isNullable: true }),
        // Audit
        new TableColumn({ name: "created_by", type: "int", isNullable: true }),
        new TableColumn({ name: "updated_at", type: "timestamp", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP", isNullable: true }),
        new TableColumn({ name: "created_at", type: "timestamp", default: "CURRENT_TIMESTAMP", isNullable: true }),
    ];

    await queryRunner.addColumns("activity_package", packageCols); // Table name is 'activity_package' per entity

    // Add foreign key
    await queryRunner.createForeignKey("activity_package", new TableForeignKey({
        columnNames: ["created_by"],
        referencedColumnNames: ["id"],
        referencedTableName: "user",
        onDelete: "SET NULL",
        name: "fk_packages_created_by"
    }));

    // Create indexes
    await queryRunner.createIndex("activity_package", new TableIndex({
        name: "idx_packages_parse_status",
        columnNames: ["parse_status"]
    }));
    await queryRunner.createIndex("activity_package", new TableIndex({
        name: "idx_packages_library_s3_key",
        columnNames: ["library_s3_key"]
    }));

    // Add keyword mapping columns to activity_templates table
    // Table name is 'activity_template' per entity
    const templateCols = [
        new TableColumn({ name: "keyword_name", type: "varchar", length: "255", isNullable: true }),
        new TableColumn({ name: "python_method", type: "varchar", length: "255", isNullable: true }),
        new TableColumn({ name: "is_auto_generated", type: "boolean", default: false }),
        new TableColumn({ name: "line_number", type: "int", isNullable: true }),
        // New columns for UI controls
        new TableColumn({ name: "type", type: "varchar", length: "50", isNullable: true, default: "'activity'" }),
        new TableColumn({ name: "icon_code", type: "varchar", length: "50", isNullable: true }),
    ];

    await queryRunner.addColumns("activity_template", templateCols);

    await queryRunner.createIndex("activity_template", new TableIndex({
        name: "idx_templates_keyword",
        columnNames: ["keyword_name"]
    }));
    await queryRunner.createIndex("activity_template", new TableIndex({
        name: "idx_templates_auto_generated",
        columnNames: ["is_auto_generated"]
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes from activity_templates
    await queryRunner.dropIndex("activity_template", "idx_templates_auto_generated");
    await queryRunner.dropIndex("activity_template", "idx_templates_keyword");

    // Remove columns from activity_templates
    await queryRunner.dropColumns("activity_template", ["line_number", "is_auto_generated", "python_method", "keyword_name"]);

    // Drop indexes from packages
    await queryRunner.dropIndex("activity_package", "idx_packages_library_s3_key");
    await queryRunner.dropIndex("activity_package", "idx_packages_parse_status");

    // Drop foreign key
    const table = await queryRunner.getTable("activity_package");
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("created_by") !== -1);
    if (foreignKey) await queryRunner.dropForeignKey("activity_package", foreignKey);

    // Remove columns from activity_package
    await queryRunner.dropColumns("activity_package", [
        "updated_at", "created_at", "created_by", "parse_error", "parse_status",
        "imports", "parsed_classes", "parsed_keywords", "library_version",
        "library_checksum", "library_s3_url", "library_s3_key", "library_s3_bucket",
        "library_file_type", "library_file_name"
    ]);

    // Remove role column from user table
    await queryRunner.dropIndex("user", "idx_user_role");
    await queryRunner.dropColumn("user", "role");
  }
}
