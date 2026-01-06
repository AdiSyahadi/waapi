const { validateEnv } = require('../src/config/env');

describe('Environment Validation', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
  
  test('should have required environment variables', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.NODE_ENV).toBe('test');
  });
  
  test('should have correct API version', () => {
    expect(process.env.API_VERSION).toBe('v1');
  });
});

describe('Utility Functions', () => {
  test('generateEmail should create unique emails', () => {
    const email1 = global.testUtils.generateEmail();
    const email2 = global.testUtils.generateEmail();
    
    expect(email1).toContain('@example.com');
    expect(email1).not.toBe(email2);
  });
  
  test('generatePhone should create valid phone numbers', () => {
    const phone = global.testUtils.generatePhone();
    
    expect(phone).toMatch(/^628\d{9}$/);
  });
  
  test('wait should delay execution', async () => {
    const start = Date.now();
    await global.testUtils.wait(100);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});

describe('JWT Token Validation', () => {
  const jwt = require('jsonwebtoken');
  
  test('should create valid JWT token', () => {
    const payload = { userId: '123', email: 'test@test.com' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });
  
  test('should verify valid JWT token', () => {
    const payload = { userId: '123', email: 'test@test.com' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    expect(decoded.userId).toBe('123');
    expect(decoded.email).toBe('test@test.com');
  });
  
  test('should reject invalid JWT token', () => {
    expect(() => {
      jwt.verify('invalid-token', process.env.JWT_SECRET);
    }).toThrow();
  });
  
  test('should reject token with wrong secret', () => {
    const token = jwt.sign({ userId: '123' }, 'wrong-secret');
    
    expect(() => {
      jwt.verify(token, process.env.JWT_SECRET);
    }).toThrow();
  });
});

describe('Password Hashing', () => {
  const bcrypt = require('bcrypt');
  
  test('should hash password', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 10);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });
  
  test('should verify correct password', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare(password, hash);
    
    expect(isValid).toBe(true);
  });
  
  test('should reject wrong password', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare('WrongPassword', hash);
    
    expect(isValid).toBe(false);
  });
});

describe('Input Validation', () => {
  test('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test('valid@email.com')).toBe(true);
    expect(emailRegex.test('also.valid@email.co.id')).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('@invalid.com')).toBe(false);
    expect(emailRegex.test('invalid@')).toBe(false);
  });
  
  test('should validate phone number format', () => {
    const phoneRegex = /^62\d{9,12}$/;
    
    expect(phoneRegex.test('6281234567890')).toBe(true);
    expect(phoneRegex.test('628123456789')).toBe(true);
    expect(phoneRegex.test('08123456789')).toBe(false);
    expect(phoneRegex.test('123')).toBe(false);
  });
  
  test('should validate password strength', () => {
    const strongPassword = (password) => {
      return password.length >= 8 &&
             /[A-Z]/.test(password) &&
             /[a-z]/.test(password) &&
             /[0-9]/.test(password);
    };
    
    expect(strongPassword('TestPass123')).toBe(true);
    expect(strongPassword('weak')).toBe(false);
    expect(strongPassword('nouppercase123')).toBe(false);
    expect(strongPassword('NOLOWERCASE123')).toBe(false);
    expect(strongPassword('NoNumbers')).toBe(false);
  });
});
