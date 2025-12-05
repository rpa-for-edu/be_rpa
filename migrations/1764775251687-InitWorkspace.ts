import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitWorkspace1764775251687 implements MigrationInterface {
  name = 'InitWorkspace1764775251687';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const workspaceMemberExists = await queryRunner.hasTable('workspace_member');
    if (!workspaceMemberExists) {
      await queryRunner.query(
        `CREATE TABLE \`workspace_member\` (\`id\` varchar(36) NOT NULL, \`workspaceId\` varchar(255) NOT NULL, \`userId\` int NOT NULL, \`role\` enum ('owner', 'member') NOT NULL DEFAULT 'member', \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_b4104c0c92e2afdca1127be445\` (\`workspaceId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const workspaceExists = await queryRunner.hasTable('workspace');
    if (!workspaceExists) {
      await queryRunner.query(
        `CREATE TABLE \`workspace\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`ownerId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const permissionExists = await queryRunner.hasTable('permission');
    if (!permissionExists) {
      await queryRunner.query(
        `CREATE TABLE \`permission\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`resource\` enum ('process', 'robot', 'document_template', 'team', 'workspace') NOT NULL, \`action\` enum ('view', 'create', 'edit', 'delete', 'execute') NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const teamMemberExists = await queryRunner.hasTable('team_member');
    if (!teamMemberExists) {
      await queryRunner.query(
        `CREATE TABLE \`team_member\` (\`id\` varchar(36) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`userId\` int NOT NULL, \`roleId\` varchar(255) NOT NULL, \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_bd2b3ef7569d75642e09185377\` (\`teamId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const activityPackageExists = await queryRunner.hasTable('activity_package');
    if (!activityPackageExists) {
      await queryRunner.query(
        `CREATE TABLE \`activity_package\` (\`id\` varchar(255) NOT NULL, \`displayName\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`imageKey\` varchar(255) NULL, \`library\` varchar(255) NULL, \`version\` varchar(255) NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const argumentExists = await queryRunner.hasTable('argument');
    if (!argumentExists) {
      await queryRunner.query(
        `CREATE TABLE \`argument\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`type\` varchar(255) NOT NULL, \`keywordArgument\` varchar(255) NULL, \`isRequired\` tinyint NOT NULL DEFAULT 0, \`defaultValue\` json NULL, \`activityTemplateId\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const returnValueExists = await queryRunner.hasTable('return_value');
    if (!returnValueExists) {
      await queryRunner.query(
        `CREATE TABLE \`return_value\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`displayName\` varchar(255) NULL, \`activityTemplateId\` varchar(255) NOT NULL, UNIQUE INDEX \`REL_65289defb7e9f24cc089b4f851\` (\`activityTemplateId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const activityTemplateExists = await queryRunner.hasTable('activity_template');
    if (!activityTemplateExists) {
      await queryRunner.query(
        `CREATE TABLE \`activity_template\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`keyword\` varchar(255) NOT NULL, \`activityPackageId\` varchar(255) NOT NULL, UNIQUE INDEX \`IDX_65ffca13c2fb3ab7cc6e483c4c\` (\`keyword\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const roleExists = await queryRunner.hasTable('role');
    if (!roleExists) {
      await queryRunner.query(
        `CREATE TABLE \`role\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`isDefault\` tinyint NOT NULL DEFAULT 0, \`teamId\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const teamInvitationExists = await queryRunner.hasTable('team_invitation');
    if (!teamInvitationExists) {
      await queryRunner.query(
        `CREATE TABLE \`team_invitation\` (\`id\` varchar(36) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`invitedEmail\` varchar(255) NOT NULL, \`invitedUserId\` int NULL, \`roleId\` varchar(255) NOT NULL, \`invitedById\` int NOT NULL, \`status\` enum ('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const teamExists = await queryRunner.hasTable('team');
    if (!teamExists) {
      await queryRunner.query(
        `CREATE TABLE \`team\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`workspaceId\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const activityPackageAccessExists = await queryRunner.hasTable('activity_package_access');
    if (!activityPackageAccessExists) {
      await queryRunner.query(
        `CREATE TABLE \`activity_package_access\` (\`id\` varchar(36) NOT NULL, \`packageId\` varchar(255) NOT NULL, \`teamId\` varchar(255) NOT NULL, \`hasAccess\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_41928e139cd29489ad4a3cf65f\` (\`packageId\`, \`teamId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
    }

    const rolePermissionExists = await queryRunner.hasTable('role_permission');
    if (!rolePermissionExists) {
      await queryRunner.query(
        `CREATE TABLE \`role_permission\` (\`roleId\` varchar(36) NOT NULL, \`permissionId\` varchar(36) NOT NULL, INDEX \`IDX_e3130a39c1e4a740d044e68573\` (\`roleId\`), INDEX \`IDX_72e80be86cab0e93e67ed1a7a9\` (\`permissionId\`), PRIMARY KEY (\`roleId\`, \`permissionId\`)) ENGINE=InnoDB`,
      );
    }

    const roleActivityTemplateExists = await queryRunner.hasTable('role_activity_template');
    if (!roleActivityTemplateExists) {
      await queryRunner.query(
        `CREATE TABLE \`role_activity_template\` (\`roleId\` varchar(36) NOT NULL, \`activityTemplateId\` varchar(36) NOT NULL, INDEX \`IDX_012a70c3694aae31a22d5f0667\` (\`roleId\`), INDEX \`IDX_c2e9c73a66157298b8b4a17cb8\` (\`activityTemplateId\`), PRIMARY KEY (\`roleId\`, \`activityTemplateId\`)) ENGINE=InnoDB`,
      );
    }

    const processTable = await queryRunner.getTable('process');
    if (processTable && !processTable.findColumnByName('scope')) {
      await queryRunner.query(
        `ALTER TABLE \`process\` ADD \`scope\` enum ('personal', 'team', 'workspace') NOT NULL DEFAULT 'personal'`,
      );
      await queryRunner.query(`ALTER TABLE \`process\` ADD \`workspaceId\` varchar(255) NULL`);
      await queryRunner.query(`ALTER TABLE \`process\` ADD \`teamId\` varchar(255) NULL`);
    }

    const robotTable = await queryRunner.getTable('robot');
    if (robotTable && !robotTable.findColumnByName('scope')) {
      await queryRunner.query(
        `ALTER TABLE \`robot\` ADD \`scope\` enum ('personal', 'team', 'workspace') NOT NULL DEFAULT 'personal'`,
      );
      await queryRunner.query(`ALTER TABLE \`robot\` ADD \`workspaceId\` varchar(255) NULL`);
      await queryRunner.query(`ALTER TABLE \`robot\` ADD \`teamId\` varchar(255) NULL`);
    }

    await queryRunner.query(
      `ALTER TABLE \`notification\` CHANGE \`type\` \`type\` enum ('ROBOT_TRIGGER', 'ROBOT_EXECUTION', 'PROCESS_SHARED', 'CONNECTION_CHECK', 'TEAM_INVITATION') NOT NULL`,
    );

    const workspaceFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workspace_member' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (workspaceFKs.length === 0 && workspaceMemberExists) {
      await queryRunner.query(
        `ALTER TABLE \`workspace_member\` ADD CONSTRAINT \`FK_15b622cbfffabc30d7dbc52fede\` FOREIGN KEY (\`workspaceId\`) REFERENCES \`workspace\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`workspace_member\` ADD CONSTRAINT \`FK_03ce416ae83c188274dec61205c\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    const workspaceOwnerFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workspace' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (workspaceOwnerFKs.length === 0 && workspaceExists) {
      await queryRunner.query(
        `ALTER TABLE \`workspace\` ADD CONSTRAINT \`FK_51f2194e4a415202512807d2f63\` FOREIGN KEY (\`ownerId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    const teamMemberFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_member' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (teamMemberFKs.length === 0 && teamMemberExists) {
      await queryRunner.query(
        `ALTER TABLE \`team_member\` ADD CONSTRAINT \`FK_74da8f612921485e1005dc8e225\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`team_member\` ADD CONSTRAINT \`FK_d2be3e8fc9ab0f69673721c7fc3\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`team_member\` ADD CONSTRAINT \`FK_a57d02f43288382431b33014b1d\` FOREIGN KEY (\`roleId\`) REFERENCES \`role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    const argumentFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'argument' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (argumentFKs.length === 0 && argumentExists) {
      await queryRunner.query(
        `ALTER TABLE \`argument\` ADD CONSTRAINT \`FK_97116a7d9abed5505cb83884242\` FOREIGN KEY (\`activityTemplateId\`) REFERENCES \`activity_template\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    const returnValueFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'return_value' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (returnValueFKs.length === 0 && returnValueExists) {
      await queryRunner.query(
        `ALTER TABLE \`return_value\` ADD CONSTRAINT \`FK_65289defb7e9f24cc089b4f8513\` FOREIGN KEY (\`activityTemplateId\`) REFERENCES \`activity_template\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    const activityTemplateFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_template' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (activityTemplateFKs.length === 0 && activityTemplateExists) {
      await queryRunner.query(
        `ALTER TABLE \`activity_template\` ADD CONSTRAINT \`FK_3a2296659432c6316b4a22cb981\` FOREIGN KEY (\`activityPackageId\`) REFERENCES \`activity_package\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    const roleFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (roleFKs.length === 0 && roleExists) {
      await queryRunner.query(
        `ALTER TABLE \`role\` ADD CONSTRAINT \`FK_997dd31f342ad1e67a8dc9a24d1\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    const teamInvitationFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_invitation' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (teamInvitationFKs.length === 0 && teamInvitationExists) {
      await queryRunner.query(
        `ALTER TABLE \`team_invitation\` ADD CONSTRAINT \`FK_f3d2441efc544a7cc085bdb6701\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`team_invitation\` ADD CONSTRAINT \`FK_b0c25d851cfda6aef388771388f\` FOREIGN KEY (\`invitedUserId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`team_invitation\` ADD CONSTRAINT \`FK_894f909ae24db72b4faa399ca40\` FOREIGN KEY (\`roleId\`) REFERENCES \`role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`team_invitation\` ADD CONSTRAINT \`FK_679830f4308553fe12cebf7b419\` FOREIGN KEY (\`invitedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    const teamFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (teamFKs.length === 0 && teamExists) {
      await queryRunner.query(
        `ALTER TABLE \`team\` ADD CONSTRAINT \`FK_66f4adf2b7982a24c835d60e399\` FOREIGN KEY (\`workspaceId\`) REFERENCES \`workspace\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    const activityPackageAccessFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_package_access' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (activityPackageAccessFKs.length === 0 && activityPackageAccessExists) {
      await queryRunner.query(
        `ALTER TABLE \`activity_package_access\` ADD CONSTRAINT \`FK_228a23ff7b07a624daa93572db7\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    const processFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'process' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME IN ('FK_ae2c2077dbc56739916e61a71fe', 'FK_d339af15cfd937c72a226dc7969')`,
    );
    if (processFKs.length === 0 && processTable) {
      await queryRunner.query(
        `ALTER TABLE \`process\` ADD CONSTRAINT \`FK_ae2c2077dbc56739916e61a71fe\` FOREIGN KEY (\`workspaceId\`) REFERENCES \`workspace\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`process\` ADD CONSTRAINT \`FK_d339af15cfd937c72a226dc7969\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    const robotFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'robot' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME IN ('FK_96a9e534d9b96ace94ff4dd4641', 'FK_809717f7e71ff5b5127f62def28')`,
    );
    if (robotFKs.length === 0 && robotTable) {
      await queryRunner.query(
        `ALTER TABLE \`robot\` ADD CONSTRAINT \`FK_96a9e534d9b96ace94ff4dd4641\` FOREIGN KEY (\`workspaceId\`) REFERENCES \`workspace\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`robot\` ADD CONSTRAINT \`FK_809717f7e71ff5b5127f62def28\` FOREIGN KEY (\`teamId\`) REFERENCES \`team\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    const rolePermissionFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permission' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (rolePermissionFKs.length === 0 && rolePermissionExists) {
      await queryRunner.query(
        `ALTER TABLE \`role_permission\` ADD CONSTRAINT \`FK_e3130a39c1e4a740d044e685730\` FOREIGN KEY (\`roleId\`) REFERENCES \`role\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
      );
      await queryRunner.query(
        `ALTER TABLE \`role_permission\` ADD CONSTRAINT \`FK_72e80be86cab0e93e67ed1a7a9a\` FOREIGN KEY (\`permissionId\`) REFERENCES \`permission\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    const roleActivityTemplateFKs = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_activity_template' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    if (roleActivityTemplateFKs.length === 0 && roleActivityTemplateExists) {
      await queryRunner.query(
        `ALTER TABLE \`role_activity_template\` ADD CONSTRAINT \`FK_012a70c3694aae31a22d5f0667d\` FOREIGN KEY (\`roleId\`) REFERENCES \`role\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
      );
      await queryRunner.query(
        `ALTER TABLE \`role_activity_template\` ADD CONSTRAINT \`FK_c2e9c73a66157298b8b4a17cb8d\` FOREIGN KEY (\`activityTemplateId\`) REFERENCES \`activity_template\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`role_activity_template\` DROP FOREIGN KEY \`FK_c2e9c73a66157298b8b4a17cb8d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_activity_template\` DROP FOREIGN KEY \`FK_012a70c3694aae31a22d5f0667d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_permission\` DROP FOREIGN KEY \`FK_72e80be86cab0e93e67ed1a7a9a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_permission\` DROP FOREIGN KEY \`FK_e3130a39c1e4a740d044e685730\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`robot\` DROP FOREIGN KEY \`FK_809717f7e71ff5b5127f62def28\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`robot\` DROP FOREIGN KEY \`FK_96a9e534d9b96ace94ff4dd4641\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`process\` DROP FOREIGN KEY \`FK_d339af15cfd937c72a226dc7969\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`process\` DROP FOREIGN KEY \`FK_ae2c2077dbc56739916e61a71fe\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_package_access\` DROP FOREIGN KEY \`FK_228a23ff7b07a624daa93572db7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`team\` DROP FOREIGN KEY \`FK_66f4adf2b7982a24c835d60e399\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`team_invitation\` DROP FOREIGN KEY \`FK_679830f4308553fe12cebf7b419\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`team_invitation\` DROP FOREIGN KEY \`FK_894f909ae24db72b4faa399ca40\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`team_invitation\` DROP FOREIGN KEY \`FK_b0c25d851cfda6aef388771388f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`team_invitation\` DROP FOREIGN KEY \`FK_f3d2441efc544a7cc085bdb6701\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role\` DROP FOREIGN KEY \`FK_997dd31f342ad1e67a8dc9a24d1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_template\` DROP FOREIGN KEY \`FK_3a2296659432c6316b4a22cb981\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`return_value\` DROP FOREIGN KEY \`FK_65289defb7e9f24cc089b4f8513\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`argument\` DROP FOREIGN KEY \`FK_97116a7d9abed5505cb83884242\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`team_member\` DROP FOREIGN KEY \`FK_a57d02f43288382431b33014b1d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`team_member\` DROP FOREIGN KEY \`FK_d2be3e8fc9ab0f69673721c7fc3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`team_member\` DROP FOREIGN KEY \`FK_74da8f612921485e1005dc8e225\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`workspace\` DROP FOREIGN KEY \`FK_51f2194e4a415202512807d2f63\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`workspace_member\` DROP FOREIGN KEY \`FK_03ce416ae83c188274dec61205c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`workspace_member\` DROP FOREIGN KEY \`FK_15b622cbfffabc30d7dbc52fede\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`notification\` CHANGE \`type\` \`type\` enum ('ROBOT_TRIGGER', 'ROBOT_EXECUTION', 'PROCESS_SHARED', 'CONNECTION_CHECK') NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE \`robot\` DROP COLUMN \`teamId\``);
    await queryRunner.query(`ALTER TABLE \`robot\` DROP COLUMN \`workspaceId\``);
    await queryRunner.query(`ALTER TABLE \`robot\` DROP COLUMN \`scope\``);
    await queryRunner.query(`ALTER TABLE \`process\` DROP COLUMN \`teamId\``);
    await queryRunner.query(`ALTER TABLE \`process\` DROP COLUMN \`workspaceId\``);
    await queryRunner.query(`ALTER TABLE \`process\` DROP COLUMN \`scope\``);

    await queryRunner.query(
      `DROP INDEX \`IDX_c2e9c73a66157298b8b4a17cb8\` ON \`role_activity_template\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_012a70c3694aae31a22d5f0667\` ON \`role_activity_template\``,
    );
    await queryRunner.query(`DROP TABLE \`role_activity_template\``);
    await queryRunner.query(`DROP INDEX \`IDX_72e80be86cab0e93e67ed1a7a9\` ON \`role_permission\``);
    await queryRunner.query(`DROP INDEX \`IDX_e3130a39c1e4a740d044e68573\` ON \`role_permission\``);
    await queryRunner.query(`DROP TABLE \`role_permission\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_41928e139cd29489ad4a3cf65f\` ON \`activity_package_access\``,
    );
    await queryRunner.query(`DROP TABLE \`activity_package_access\``);
    await queryRunner.query(`DROP TABLE \`team\``);
    await queryRunner.query(`DROP TABLE \`team_invitation\``);
    await queryRunner.query(`DROP TABLE \`role\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_65ffca13c2fb3ab7cc6e483c4c\` ON \`activity_template\``,
    );
    await queryRunner.query(`DROP TABLE \`activity_template\``);
    await queryRunner.query(`DROP INDEX \`REL_65289defb7e9f24cc089b4f851\` ON \`return_value\``);
    await queryRunner.query(`DROP TABLE \`return_value\``);
    await queryRunner.query(`DROP TABLE \`argument\``);
    await queryRunner.query(`DROP TABLE \`activity_package\``);
    await queryRunner.query(`DROP INDEX \`IDX_bd2b3ef7569d75642e09185377\` ON \`team_member\``);
    await queryRunner.query(`DROP TABLE \`team_member\``);
    await queryRunner.query(`DROP TABLE \`permission\``);
    await queryRunner.query(`DROP TABLE \`workspace\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_b4104c0c92e2afdca1127be445\` ON \`workspace_member\``,
    );
    await queryRunner.query(`DROP TABLE \`workspace_member\``);
  }
}
