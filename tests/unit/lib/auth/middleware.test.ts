// Mock Next.js server modules BEFORE any imports
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

// Mock dependencies
jest.mock('@/lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
  extractTokenFromHeader: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { authenticate, requireAdmin } from '@/lib/auth/middleware';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const mockToken = 'valid-token';
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'learner',
        organizationId: 'org-id',
      };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'learner',
        organizationId: 'org-id',
        name: 'Test User',
      };

      const mockRequest = {
        headers: {
          get: jest.fn((name: string) => {
            if (name === 'authorization') {
              return `Bearer ${mockToken}`;
            }
            return null;
          }),
        },
      } as unknown as NextRequest;

      (extractTokenFromHeader as jest.Mock).mockReturnValue(mockToken);
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authenticate(mockRequest);

      expect(result.id).toBe('user-id');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('learner');
      expect(result.organizationId).toBe('org-id');
    });

    it('should throw error when no token provided', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as unknown as NextRequest;

      (extractTokenFromHeader as jest.Mock).mockReturnValue(null);

      await expect(authenticate(mockRequest)).rejects.toThrow('No token provided');
    });

    it('should throw error when user not found', async () => {
      const mockToken = 'valid-token';
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'learner',
        organizationId: 'org-id',
      };

      const mockRequest = {
        headers: {
          get: jest.fn(() => `Bearer ${mockToken}`),
        },
      } as unknown as NextRequest;

      (extractTokenFromHeader as jest.Mock).mockReturnValue(mockToken);
      (verifyToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authenticate(mockRequest)).rejects.toThrow('User not found');
    });

    it('should throw error for invalid token (non-AuthenticationError)', async () => {
      const mockToken = 'invalid-token';
      const mockRequest = {
        headers: {
          get: jest.fn(() => `Bearer ${mockToken}`),
        },
      } as unknown as NextRequest;

      (extractTokenFromHeader as jest.Mock).mockReturnValue(mockToken);
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(authenticate(mockRequest)).rejects.toThrow('Invalid token');
    });

    it('should re-throw AuthenticationError', async () => {
      const mockToken = 'invalid-token';
      const mockRequest = {
        headers: {
          get: jest.fn(() => `Bearer ${mockToken}`),
        },
      } as unknown as NextRequest;

      (extractTokenFromHeader as jest.Mock).mockReturnValue(mockToken);
      (verifyToken as jest.Mock).mockImplementation(() => {
        const { AuthenticationError } = require('@/lib/auth/errors');
        throw new AuthenticationError('Token expired');
      });

      await expect(authenticate(mockRequest)).rejects.toThrow('Token expired');
    });
  });

  describe('requireAdmin', () => {
    it('should not throw for admin role', () => {
      const user = {
        userId: 'user-id',
        email: 'admin@example.com',
        role: 'admin',
        organizationId: 'org-id',
      };

      expect(() => requireAdmin(user.role)).not.toThrow();
    });

    it('should throw for non-admin role', () => {
      const user = {
        userId: 'user-id',
        email: 'learner@example.com',
        role: 'learner',
        organizationId: 'org-id',
      };

      expect(() => requireAdmin(user.role)).toThrow('Access denied');
    });
  });
});
