import { generateToken, verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import type { JWTPayload } from '@/lib/auth/jwt';

describe('JWT utilities', () => {
  const testPayload: JWTPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'learner',
    organizationId: 'test-org-id',
  };

  describe('generateToken', () => {
    it('should generate a token', () => {
      const token = generateToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testPayload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.organizationId).toBe(testPayload.organizationId);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token';
      const header = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for non-Bearer header', () => {
      const extracted = extractTokenFromHeader('Basic credentials');
      expect(extracted).toBeNull();
    });

    it('should return null for null header', () => {
      const extracted = extractTokenFromHeader(null);
      expect(extracted).toBeNull();
    });
  });
});
