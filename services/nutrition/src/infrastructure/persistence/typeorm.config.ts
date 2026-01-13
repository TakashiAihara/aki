import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'aki_nutrition',
  username: process.env.DATABASE_USER || 'aki',
  password: process.env.DATABASE_PASSWORD || 'aki_password',
  entities: [path.join(__dirname, '../../domain/entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../../../migrations/*{.ts,.js}')],
  synchronize: false,
  logging: !isProduction,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
};

export const typeOrmConfig: TypeOrmModuleOptions = {
  ...dataSourceOptions,
  autoLoadEntities: true,
};

export default new DataSource(dataSourceOptions);
