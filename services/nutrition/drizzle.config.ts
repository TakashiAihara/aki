import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/persistence/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: parseInt(process.env['DATABASE_PORT'] || '5432'),
    database: process.env['DATABASE_NAME'] || 'aki_nutrition',
    user: process.env['DATABASE_USER'] || 'aki',
    password: process.env['DATABASE_PASSWORD'] || 'aki_dev',
    ssl: false,
  },
});