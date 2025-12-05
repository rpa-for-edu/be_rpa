import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIvitation1764812011680 implements MigrationInterface {
  name = 'AddWorkspaceIvitation1764812011680';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes if they exist
    try {
      await queryRunner.query(`DROP INDEX \`kw_id_idx\` ON \`report\`.\`robot_run_detail\``);
    } catch (error) {
      // Index doesn't exist, ignore
    }
    try {
      await queryRunner.query(`DROP INDEX \`uuid_idx\` ON \`report\`.\`robot_run_detail\``);
    } catch (error) {
      // Index doesn't exist, ignore
    }
    try {
      await queryRunner.query(`DROP INDEX \`uuid_idx\` ON \`report\`.\`robot_run_overall\``);
    } catch (error) {
      // Index doesn't exist, ignore
    }

    // Create workspace_invitation table if not exists
    const workspaceInvitationExists = await queryRunner.hasTable('workspace_invitation');
    if (!workspaceInvitationExists) {
      await queryRunner.query(
        `CREATE TABLE \`workspace_invitation\` (\`id\` varchar(36) NOT NULL, \`workspaceId\` varchar(255) NOT NULL, \`invitedEmail\` varchar(255) NOT NULL, \`invitedUserId\` int NULL, \`role\` enum ('owner', 'member') NOT NULL DEFAULT 'member', \`invitedById\` int NOT NULL, \`status\` enum ('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    // Update robot primary key only if needed
    const robotTable = await queryRunner.getTable('robot');
    const currentPK = robotTable?.primaryColumns.map((col) => col.name).join(',');
    if (currentPK !== 'id') {
      await queryRunner.query(`ALTER TABLE \`robot\` CHANGE \`id\` \`id\` int NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`robot\` DROP PRIMARY KEY`);
      await queryRunner.query(`ALTER TABLE \`robot\` ADD PRIMARY KEY (\`id\`)`);
      await queryRunner.query(
        `ALTER TABLE \`robot\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
      );
    }

    // Update empty robot_key values with UUID
    await queryRunner.query(
      `UPDATE \`robot\` SET \`robot_key\` = UUID() WHERE \`robot_key\` = '' OR \`robot_key\` IS NULL`,
    );

    // Create unique index on robot_key if not exists
    const hasRobotKeyIndex = robotTable?.indices.some(
      (index) => index.columnNames.includes('robot_key') && index.isUnique,
    );
    if (!hasRobotKeyIndex) {
      await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_robot_key\` ON \`robot\`(\`robot_key\`)`);
    }

    // Update report.robot_run_overall table
    const overallTable = await queryRunner.getTable('report.robot_run_overall');
    if (overallTable) {
      try {
        await queryRunner.query(
          `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`uuid\` \`uuid\` varchar(256) NOT NULL`,
        );
      } catch (error) {
        // Column already NOT NULL
      }

      if (
        overallTable.primaryColumns.length > 0 &&
        !overallTable.primaryColumns.some((col) => col.name === 'uuid')
      ) {
        await queryRunner.query(`ALTER TABLE \`report\`.\`robot_run_overall\` DROP PRIMARY KEY`);
        await queryRunner.query(
          `ALTER TABLE \`report\`.\`robot_run_overall\` ADD PRIMARY KEY (\`uuid\`)`,
        );
      }

      try {
        await queryRunner.query(
          `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`user_id\` \`user_id\` int NOT NULL`,
        );
      } catch (error) {}
      try {
        await queryRunner.query(
          `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`process_id\` \`process_id\` varchar(50) NOT NULL`,
        );
      } catch (error) {}
      try {
        await queryRunner.query(
          `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`version\` \`version\` int NOT NULL`,
        );
      } catch (error) {}
      try {
        await queryRunner.query(
          `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`failed\` \`failed\` int NOT NULL`,
        );
      } catch (error) {}
      try {
        await queryRunner.query(
          `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`passed\` \`passed\` int NOT NULL`,
        );
      } catch (error) {}
      try {
        await queryRunner.query(
          `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`created_date\` \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
        );
      } catch (error) {}
    }

    // Add foreign keys if not exist
    const workspaceInvitationTable = await queryRunner.getTable('workspace_invitation');
    if (workspaceInvitationTable) {
      const hasFKWorkspace = workspaceInvitationTable.foreignKeys.some(
        (fk) => fk.name === 'FK_c060076f1277c3c957151ec1321',
      );
      if (!hasFKWorkspace) {
        await queryRunner.query(
          `ALTER TABLE \`workspace_invitation\` ADD CONSTRAINT \`FK_c060076f1277c3c957151ec1321\` FOREIGN KEY (\`workspaceId\`) REFERENCES \`workspace\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
      }

      const hasFKInvitedUser = workspaceInvitationTable.foreignKeys.some(
        (fk) => fk.name === 'FK_42bd5c60de0ee175f26e62a053d',
      );
      if (!hasFKInvitedUser) {
        await queryRunner.query(
          `ALTER TABLE \`workspace_invitation\` ADD CONSTRAINT \`FK_42bd5c60de0ee175f26e62a053d\` FOREIGN KEY (\`invitedUserId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
      }

      const hasFKInvitedBy = workspaceInvitationTable.foreignKeys.some(
        (fk) => fk.name === 'FK_13157e3f27dbffeaf7048d8ef31',
      );
      if (!hasFKInvitedBy) {
        await queryRunner.query(
          `ALTER TABLE \`workspace_invitation\` ADD CONSTRAINT \`FK_13157e3f27dbffeaf7048d8ef31\` FOREIGN KEY (\`invitedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
      }
    }

    // Add robot_connection FK if not exists
    const robotConnectionTable = await queryRunner.getTable('robot_connection');
    if (robotConnectionTable) {
      // Clean up orphaned records first
      await queryRunner.query(
        `DELETE FROM \`robot_connection\` WHERE \`robot_key\` NOT IN (SELECT \`robot_key\` FROM \`robot\`)`,
      );

      const hasFKRobotConnection = robotConnectionTable.foreignKeys.some(
        (fk) => fk.name === 'FK_f8f1dea168e5bf077eab5af7aee',
      );
      if (!hasFKRobotConnection) {
        await queryRunner.query(
          `ALTER TABLE \`robot_connection\` ADD CONSTRAINT \`FK_f8f1dea168e5bf077eab5af7aee\` FOREIGN KEY (\`robot_key\`) REFERENCES \`robot\`(\`robot_key\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`robot_connection\` DROP FOREIGN KEY \`FK_f8f1dea168e5bf077eab5af7aee\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`workspace_invitation\` DROP FOREIGN KEY \`FK_13157e3f27dbffeaf7048d8ef31\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`workspace_invitation\` DROP FOREIGN KEY \`FK_42bd5c60de0ee175f26e62a053d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`workspace_invitation\` DROP FOREIGN KEY \`FK_c060076f1277c3c957151ec1321\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_robot_key\` ON \`robot\``);
    await queryRunner.query(
      `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`created_date\` \`created_date\` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`passed\` \`passed\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`failed\` \`failed\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`version\` \`version\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`process_id\` \`process_id\` varchar(50) COLLATE "utf8mb4_unicode_ci" NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`user_id\` \`user_id\` int NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`report\`.\`robot_run_overall\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`report\`.\`robot_run_overall\` CHANGE \`uuid\` \`uuid\` varchar(256) COLLATE "utf8mb4_unicode_ci" NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`robot\` CHANGE \`id\` \`id\` int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`robot\` DROP PRIMARY KEY`);
    await queryRunner.query(
      `ALTER TABLE \`robot\` ADD PRIMARY KEY (\`id\`, \`userId\`, \`processId\`, \`processVersion\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`robot\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`,
    );
    await queryRunner.query(`DROP TABLE \`workspace_invitation\``);
    await queryRunner.query(
      `CREATE INDEX \`uuid_idx\` ON \`report\`.\`robot_run_overall\` (\`uuid\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`uuid_idx\` ON \`report\`.\`robot_run_detail\` (\`uuid\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`kw_id_idx\` ON \`report\`.\`robot_run_detail\` (\`kw_id\`)`,
    );
  }
}
