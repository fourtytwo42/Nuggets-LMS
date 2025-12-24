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
      process.env.JWT_EXPIRES_IN = '1h';
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');
      generateToken(mockPayload);
      expect(jwt.sign).toHaveBeenCalledWith(mockPayload, 'test-secret', {
        expiresIn: '1h',
      });
    });

    it('should use default expiresIn when not set', () => {
      delete process.env.JWT_EXPIRES_IN;
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');
      generateToken(mockPayload);
      expect(jwt.sign).toHaveBeenCalledWith(mockPayload, expect.any(String), {
        expiresIn: '7d',
      });
    });
  });

  describe('verifyToken', () => {
    it('should handle JsonWebTokenError', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Invalid token') as any;
        error.name = 'JsonWebTokenError';
        throw error;
      });

      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });

    it('should handle TokenExpiredError', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Token expired') as any;
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => verifyToken('expired-token')).toThrow('Token expired');
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
