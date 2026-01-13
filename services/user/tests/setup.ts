// Jest setup file
// Configure test environment
import 'jest-extended';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-in-tests';
process.env.DATABASE_URL = 'postgresql://aki:aki_dev@localhost:5432/aki_user_test';
process.env.REDIS_URL = 'redis://localhost:6379';
