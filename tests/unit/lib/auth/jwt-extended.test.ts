import { generateToken, verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import jwt from 'jsonwebtoken';

// Mock jsonwebtoken with factory function to avoid hoisting issues
jest.mock('jsonwebtoken', () => {
  const actualJwt = jest.requireActual('jsonwebtoken');
  const mockVerify = jest.fn();
  const mockSign = jest.fn();

  return {
    __esModule: true,
    default: {
      sign: mockSign,
      verify: mockVerify,
      JsonWebTokenError: actualJwt.JsonWebTokenError,
      TokenExpiredError: actualJwt.TokenExpiredError,
    },
    JsonWebTokenError: actualJwt.JsonWebTokenError,
    TokenExpiredError: actualJwt.TokenExpiredError,
    __mockVerify: mockVerify,
    __mockSign: mockSign,
  };
});

// Get mock functions after mock is set up
const getMocks = () => {
  const jwt = require('jsonwebtoken');
  return {
    mockVerify: (jwt as any).__mockVerify,
    mockSign: (jwt as any).__mockSign,
  };
};

describe('JWT Extended Tests', () => {
  const originalEnv = process.env;
  const mockPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'learner',
    organizationId: 'org-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { mockVerify, mockSign } = getMocks();
    mockVerify.mockClear();
    mockSign.mockClear();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '7d';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate token with custom expiresIn', () => {
      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_EXPIRES_IN = '1h';
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      const { generateToken: genToken } = require('@/lib/auth/jwt');
      const { mockSign } = getMocks();
      mockSign.mockReturnValue('mock-token');
      const token = genToken(mockPayload);
      expect(mockSign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        expect.objectContaining({ expiresIn: '1h' })
      );
      expect(token).toBe('mock-token');
      if (originalExpiresIn) {
        process.env.JWT_EXPIRES_IN = originalExpiresIn;
      }
      if (originalSecret) {
        process.env.JWT_SECRET = originalSecret;
      }
      jest.resetModules();
    });

    it('should use default expiresIn when not set', () => {
      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_EXPIRES_IN;
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      const { generateToken: genToken } = require('@/lib/auth/jwt');
      const { mockSign } = getMocks();
      mockSign.mockReturnValue('mock-token');
      const token = genToken(mockPayload);
      expect(mockSign).toHaveBeenCalledWith(
        mockPayload,
        'test-secret',
        expect.objectContaining({ expiresIn: '7d' })
      );
      expect(token).toBe('mock-token');
      if (originalExpiresIn) {
        process.env.JWT_EXPIRES_IN = originalExpiresIn;
      }
      if (originalSecret) {
        process.env.JWT_SECRET = originalSecret;
      }
      jest.resetModules();
    });
  });

  describe('verifyToken', () => {
    it('should handle JsonWebTokenError', () => {
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      const { verifyToken: verify } = require('@/lib/auth/jwt');
      const { mockVerify } = getMocks();
      // Use the mocked jwt module's error classes (same instance imported in src/lib/auth/jwt.ts)
      const mockedJwt = require('jsonwebtoken');
      mockVerify.mockImplementation(() => {
        const error = new mockedJwt.JsonWebTokenError('Invalid token');
        throw error;
      });

      expect(() => verify('invalid-token')).toThrow('Invalid token');
    });

    it('should handle TokenExpiredError', () => {
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      const { verifyToken: verify } = require('@/lib/auth/jwt');
      const { mockVerify } = getMocks();
      // Use the mocked jwt module's error classes (same instance imported in src/lib/auth/jwt.ts)
      const mockedJwt = require('jsonwebtoken');
      mockVerify.mockImplementation(() => {
        const error = new mockedJwt.TokenExpiredError('Token expired', new Date());
        throw error;
      });

      expect(() => verify('expired-token')).toThrow('Token expired');
    });

    it('should handle other errors', () => {
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      const { verifyToken: verify } = require('@/lib/auth/jwt');
      const { mockVerify } = getMocks();
      mockVerify.mockImplementation(() => {
        throw new Error('Unknown error');
      });

      expect(() => verify('bad-token')).toThrow('Token verification failed');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = extractTokenFromHeader('Bearer abc123');
      expect(token).toBe('abc123');
    });

    it('should return null for non-Bearer header', () => {
      const token = extractTokenFromHeader('Basic abc123');
      expect(token).toBeNull();
    });

    it('should return null for null header', () => {
      const token = extractTokenFromHeader(null);
      expect(token).toBeNull();
    });

    it('should return null for empty header', () => {
      const token = extractTokenFromHeader('');
      expect(token).toBeNull();
    });

    it('should handle header with extra spaces', () => {
      const token = extractTokenFromHeader('Bearer  abc123  ');
      expect(token).toBe(' abc123  ');
    });
  });
});
