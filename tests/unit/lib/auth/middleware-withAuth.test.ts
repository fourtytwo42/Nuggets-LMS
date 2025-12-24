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

import { withAuth, requireRole } from '@/lib/auth/middleware';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { AuthenticationError, AuthorizationError } from '@/lib/auth/errors';

describe('Auth Middleware - withAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call handler with authenticated user', async () => {
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
        get: jest.fn(() => `Bearer ${mockToken}`),
      },
    } as unknown as NextRequest;

    const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    (extractTokenFromHeader as jest.Mock).mockReturnValue(mockToken);
    (verifyToken as jest.Mock).mockReturnValue(mockPayload);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const wrappedHandler = withAuth(mockHandler);
    const response = await wrappedHandler(mockRequest);

    expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockUser);
    expect(response.status).toBe(200);
  });

  it('should return 401 for authentication error', async () => {
    const mockRequest = {
      headers: {
        get: jest.fn(() => null),
      },
    } as unknown as NextRequest;

    (extractTokenFromHeader as jest.Mock).mockReturnValue(null);

    const mockHandler = jest.fn();
    const wrappedHandler = withAuth(mockHandler);
    const response = await wrappedHandler(mockRequest);

    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should return 403 for authorization error', async () => {
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
        get: jest.fn(() => `Bearer ${mockToken}`),
      },
    } as unknown as NextRequest;

    const mockHandler = jest.fn();
    (extractTokenFromHeader as jest.Mock).mockReturnValue(mockToken);
    (verifyToken as jest.Mock).mockReturnValue(mockPayload);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const wrappedHandler = withAuth(mockHandler, { roles: ['admin'] });
    const response = await wrappedHandler(mockRequest);

    expect(response.status).toBe(403);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should return 500 for unexpected errors', async () => {
    const mockRequest = {
      headers: {
        get: jest.fn(() => {
          throw new Error('Unexpected error');
        }),
      },
    } as unknown as NextRequest;

    const mockHandler = jest.fn();
    const wrappedHandler = withAuth(mockHandler);
    const response = await wrappedHandler(mockRequest);

    expect(response.status).toBe(500);
  });

  it('should not check roles when options not provided', async () => {
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
        get: jest.fn(() => `Bearer ${mockToken}`),
      },
    } as unknown as NextRequest;

    const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

    (extractTokenFromHeader as jest.Mock).mockReturnValue(mockToken);
    (verifyToken as jest.Mock).mockReturnValue(mockPayload);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const wrappedHandler = withAuth(mockHandler);
    const response = await wrappedHandler(mockRequest);

    expect(mockHandler).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

describe('requireRole', () => {
  it('should not throw for allowed role', () => {
    expect(() => requireRole('admin', ['admin', 'instructor'])).not.toThrow();
  });

  it('should throw for disallowed role', () => {
    expect(() => requireRole('learner', ['admin', 'instructor'])).toThrow(AuthorizationError);
  });
});
