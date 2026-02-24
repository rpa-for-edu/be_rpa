import { DataSourceOptions, DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env file from the env directory
config({ path: join(process.cwd(), 'env', '.env') });

export const mysqlDataSourceOptions: DataSourceOptions = {  
  type: 'mysql',
  host: process.env.MYSQL_HOST || 'rpa-mysql.cz0aoomugeal.ap-southeast-2.rds.amazonaws.com',
  port: parseInt(process.env.MYSQL_PORT as string, 10) || 3306,
  username: process.env.MYSQL_USERNAME || process.env.MYSQL_USER || 'admin',
  password: process.env.MYSQL_PASSWORD || 'rpa2210381',
  database: process.env.MYSQL_DATABASE || 'core',
  synchronize: process.env.MYSQL_SYNCHRONIZE === 'true' || false,
  migrations: ['dist/migrations/*.js'],
  entities: ['dist/**/*.entity{.ts,.js}'],
  // NOTE: the following line will migrate and sync all entities. But it may cause data loss.
  // entities: ["dist/**/*.entity{.ts,.js}"],
};

export const mysqlDataSource = new DataSource(mysqlDataSourceOptions);
