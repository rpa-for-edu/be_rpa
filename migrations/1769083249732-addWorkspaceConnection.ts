import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkspaceConnection1769083249732 implements MigrationInterface {
    name = 'AddWorkspaceConnection1769083249732'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create workspace_connection table
        await queryRunner.query(`
            CREATE TABLE \`workspace_connection\` (
                \`provider\` enum ('Google Drive', 'Google Sheets', 'Gmail', 'Google Docs', 'Google Classroom', 'Google Forms', 'SAP Mock', 'ERP_Next', 'Moodle') NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`workspaceId\` varchar(255) NOT NULL,
                \`accessToken\` text NOT NULL,
                \`refreshToken\` text NOT NULL,
                \`connection_key\` varchar(255) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_workspace_connection_key\` (\`connection_key\`),
                PRIMARY KEY (\`provider\`, \`name\`, \`workspaceId\`)
            ) ENGINE=InnoDB
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE \`workspace_connection\` 
            ADD CONSTRAINT \`FK_workspace_connection_workspace\` 
            FOREIGN KEY (\`workspaceId\`) 
            REFERENCES \`workspace\`(\`id\`) 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint
        await queryRunner.query(`
            ALTER TABLE \`workspace_connection\` 
            DROP FOREIGN KEY \`FK_workspace_connection_workspace\`
        `);

        // Drop workspace_connection table
        await queryRunner.query(`DROP TABLE \`workspace_connection\``);
    }

}
