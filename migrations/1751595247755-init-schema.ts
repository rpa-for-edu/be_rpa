import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1751595247755 implements MigrationInterface {
    name = 'InitSchema1751595247755'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`avatarUrl\` varchar(255) NULL, \`hashedPassword\` varchar(255) NULL, \`provider\` enum ('Google', 'Local') NOT NULL DEFAULT 'Local', \`providerId\` varchar(255) NULL, UNIQUE INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notification\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`content\` varchar(255) NULL, \`type\` enum ('ROBOT_TRIGGER', 'ROBOT_EXECUTION', 'PROCESS_SHARED', 'CONNECTION_CHECK') NOT NULL, \`isRead\` tinyint NOT NULL DEFAULT 0, \`userId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`report\`.\`robot_run_detail\` (\`user_id\` int NOT NULL, \`process_id\` varchar(50) NOT NULL, \`version\` int NOT NULL, \`uuid\` varchar(256) NOT NULL, \`kw_id\` int NOT NULL, \`kw_name\` varchar(100) NOT NULL, \`kw_args\` varchar(1000) NOT NULL, \`kw_status\` varchar(100) NOT NULL, \`messages\` varchar(1000) NOT NULL, \`start_time\` datetime NULL, \`end_time\` datetime NULL, PRIMARY KEY (\`user_id\`, \`process_id\`, \`version\`, \`uuid\`, \`kw_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`connection\` (\`provider\` enum ('Google Drive', 'Google Sheets', 'Gmail', 'Google Docs', 'Google Classroom', 'Google Forms') NOT NULL, \`name\` varchar(255) NOT NULL, \`accessToken\` varchar(255) NOT NULL, \`refreshToken\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`userId\` int NOT NULL, \`connection_key\` varchar(255) NOT NULL, UNIQUE INDEX \`IDX_88c85c4f9df7c7decbf7f226d0\` (\`connection_key\`), PRIMARY KEY (\`provider\`, \`name\`, \`userId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`process\` (\`id\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL DEFAULT '0', \`userId\` int NOT NULL, \`sharedByUserId\` int NULL, PRIMARY KEY (\`id\`, \`userId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`robot\` (\`name\` varchar(255) NOT NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`processId\` varchar(255) NOT NULL, \`processVersion\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`triggerType\` enum ('schedule', 'manual', 'event-gmail', 'event-drive', 'event-forms') NOT NULL DEFAULT 'manual', \`robot_key\` varchar(255) NOT NULL, \`processUserId\` int NULL, UNIQUE INDEX \`IDX_bc9a53c1fc2615310219bc27e1\` (\`robot_key\`), PRIMARY KEY (\`id\`, \`userId\`, \`processId\`, \`processVersion\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`robot_connection\` (\`robot_key\` varchar(255) NOT NULL, \`connection_key\` varchar(255) NOT NULL, \`isActivate\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`robot_key\`, \`connection_key\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`report\`.\`robot_run_overall\` (\`uuid\` varchar(256) NOT NULL, \`user_id\` int NOT NULL, \`process_id\` varchar(50) NOT NULL, \`version\` int NOT NULL, \`failed\` int NOT NULL, \`passed\` int NOT NULL, \`error_message\` varchar(1000) NULL, \`start_time\` timestamp NULL, \`end_time\` timestamp NULL, \`elapsed_time\` int NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`uuid\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`report\`.\`robot_run_log\` (\`instance_id\` varchar(50) NOT NULL, \`process_id_version\` varchar(50) NOT NULL, \`user_id\` varchar(10) NOT NULL, \`instance_state\` varchar(20) NOT NULL, \`launch_time\` timestamp NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`instance_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`document_template\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`type\` enum ('image') NOT NULL, \`userId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`notification\` ADD CONSTRAINT \`FK_1ced25315eb974b73391fb1c81b\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`connection\` ADD CONSTRAINT \`FK_3b35155c2968acced66fc326aea\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`process\` ADD CONSTRAINT \`FK_69375d00ef5f4a91a156f5a7124\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`process\` ADD CONSTRAINT \`FK_d47fd39f6cd9cb138415bd0290e\` FOREIGN KEY (\`sharedByUserId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`robot\` ADD CONSTRAINT \`FK_349827f8a131dd7481d473b2b22\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`robot\` ADD CONSTRAINT \`FK_ab1b70b510664a47f15875f267a\` FOREIGN KEY (\`processId\`, \`processUserId\`) REFERENCES \`process\`(\`id\`,\`userId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`robot_connection\` ADD CONSTRAINT \`FK_f8f1dea168e5bf077eab5af7aee\` FOREIGN KEY (\`robot_key\`) REFERENCES \`robot\`(\`robot_key\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`robot_connection\` ADD CONSTRAINT \`FK_342c72b164076a7000f1976458c\` FOREIGN KEY (\`connection_key\`) REFERENCES \`connection\`(\`connection_key\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`document_template\` ADD CONSTRAINT \`FK_9e2e9ce8defd4c3de152bc7a936\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`document_template\` DROP FOREIGN KEY \`FK_9e2e9ce8defd4c3de152bc7a936\``);
        await queryRunner.query(`ALTER TABLE \`robot_connection\` DROP FOREIGN KEY \`FK_342c72b164076a7000f1976458c\``);
        await queryRunner.query(`ALTER TABLE \`robot_connection\` DROP FOREIGN KEY \`FK_f8f1dea168e5bf077eab5af7aee\``);
        await queryRunner.query(`ALTER TABLE \`robot\` DROP FOREIGN KEY \`FK_ab1b70b510664a47f15875f267a\``);
        await queryRunner.query(`ALTER TABLE \`robot\` DROP FOREIGN KEY \`FK_349827f8a131dd7481d473b2b22\``);
        await queryRunner.query(`ALTER TABLE \`process\` DROP FOREIGN KEY \`FK_d47fd39f6cd9cb138415bd0290e\``);
        await queryRunner.query(`ALTER TABLE \`process\` DROP FOREIGN KEY \`FK_69375d00ef5f4a91a156f5a7124\``);
        await queryRunner.query(`ALTER TABLE \`connection\` DROP FOREIGN KEY \`FK_3b35155c2968acced66fc326aea\``);
        await queryRunner.query(`ALTER TABLE \`notification\` DROP FOREIGN KEY \`FK_1ced25315eb974b73391fb1c81b\``);
        await queryRunner.query(`DROP TABLE \`document_template\``);
        await queryRunner.query(`DROP TABLE \`report\`.\`robot_run_log\``);
        await queryRunner.query(`DROP TABLE \`report\`.\`robot_run_overall\``);
        await queryRunner.query(`DROP TABLE \`robot_connection\``);
        await queryRunner.query(`DROP INDEX \`IDX_bc9a53c1fc2615310219bc27e1\` ON \`robot\``);
        await queryRunner.query(`DROP TABLE \`robot\``);
        await queryRunner.query(`DROP TABLE \`process\``);
        await queryRunner.query(`DROP INDEX \`IDX_88c85c4f9df7c7decbf7f226d0\` ON \`connection\``);
        await queryRunner.query(`DROP TABLE \`connection\``);
        await queryRunner.query(`DROP TABLE \`report\`.\`robot_run_detail\``);
        await queryRunner.query(`DROP TABLE \`notification\``);
        await queryRunner.query(`DROP INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` ON \`user\``);
        await queryRunner.query(`DROP TABLE \`user\``);
    }

}
