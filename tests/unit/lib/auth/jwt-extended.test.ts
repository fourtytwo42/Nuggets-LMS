import { generateToken, verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

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
      process.env.JWT_EXPIRES_IN = '1h';
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      // Re-mock jwt after resetModules
      jest.doMock('jsonwebtoken', () => {
        const actualJwt = jest.requireActual('jsonwebtoken');
        return {
          ...actualJwt,
          sign: jest.fn().mockReturnValue('mock-token'),
        };
      });
      const jwtModule = require('@/lib/auth/jwt');
      const jwt = require('jsonwebtoken');
      const token = jwtModule.generateToken(mockPayload);
      expect(jwt.sign).toHaveBeenCalled();
      expect(token).toBe('mock-token');
      const callArgs = (jwt.sign as jest.Mock).mock.calls[0];
      expect(callArgs[2]).toMatchObject({ expiresIn: '1h' });
      if (originalExpiresIn) {
        process.env.JWT_EXPIRES_IN = originalExpiresIn;
      }
    });

    it('should use default expiresIn when not set', () => {
      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      delete process.env.JWT_EXPIRES_IN;
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      const jwtModule = require('@/lib/auth/jwt');
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');
      const token = jwtModule.generateToken(mockPayload);
      expect(jwt.sign).toHaveBeenCalled();
      expect(token).toBe('mock-token');
      const callArgs = (jwt.sign as jest.Mock).mock.calls[0];
      expect(callArgs[2]).toMatchObject({ expiresIn: '7d' });
      if (originalExpiresIn) {
        process.env.JWT_EXPIRES_IN = originalExpiresIn;
      }
    });
  });

  describe('verifyToken', () => {
    it('should handle JsonWebTokenError', () => {
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      const jwtModule = require('@/lib/auth/jwt');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        // Create a proper JsonWebTokenError instance using the actual class
        const error = new jwt.JsonWebTokenError('Invalid token');
        throw error;
      });

      expect(() => jwtModule.verifyToken('invalid-token')).toThrow('Invalid token');
    });

    it('should handle TokenExpiredError', () => {
      process.env.JWT_SECRET = 'test-secret';
      jest.resetModules();
      const jwtModule = require('@/lib/auth/jwt');
      // Re-require jwt after resetModules to get the mocked version
      const jwt = require('jsonwebtoken');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        // Create a proper TokenExpiredError instance using the actual class
        const actualJwt = jest.requireActual('jsonwebtoken');
        const error = new actualJwt.TokenExpiredError('Token expired', new Date());
        throw error;
      });

      expect(() => jwtModule.verifyToken('expired-token')).toThrow('Token expired');
    });

    it('should handle other errors', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unknown error');
      });

      expect(() => verifyToken('bad-token')).toThrow('Token verification failed');
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
