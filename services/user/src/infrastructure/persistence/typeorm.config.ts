import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://aki:aki_dev@localhost:5432/aki_user',
  entities: [path.join(__dirname, '../../domain/entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../../../migrations/*{.ts,.js}')],
  synchronize: false, // Never use synchronize in production
  logging: !isProduction,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
};

export const typeOrmConfig: TypeOrmModuleOptions = {
  ...dataSourceOptions,
  autoLoadEntities: true,
};

// Export for TypeORM CLI
export default new DataSource(dataSourceOptions);
