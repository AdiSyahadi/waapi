// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.PORT = 3001;
process.env.APP_URL = 'http://localhost:3001';
process.env.API_VERSION = 'v1';
process.env.REDIS_ENABLED = 'false';

// Database test config
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_NAME = 'whatsapp_api_test';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';

// Increase timeout for async operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  generateEmail: () => `test_${Date.now()}@example.com`,
  generatePhone: () => `628${Math.floor(Math.random() * 1000000000)}`,
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Cleanup after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 500));
});
