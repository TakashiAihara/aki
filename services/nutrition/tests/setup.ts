// Jest setup file for Nutrition Service tests

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_NAME = 'aki_nutrition_test';
process.env.DATABASE_USER = 'aki';
process.env.DATABASE_PASSWORD = 'aki_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_PUBLIC_KEY_PATH = '../user/keys/public.pem';

// Global cleanup
afterAll(async () => {
  // Allow async cleanup to complete
  await new Promise((resolve) => setTimeout(resolve, 500));
});
