import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, type JWTPayload } from '@/lib/auth/jwt';
import { AuthenticationError, AuthorizationError } from '@/lib/auth/errors';
import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

/**
 * Authenticate request and attach user to request object
 */
export async function authenticate(request: NextRequest): Promise<User> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError('No token provided');
  }

  try {
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return user;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Invalid token');
  }
}

/**
 * Require specific role(s) for authorization
 */
export function requireRole(userRole: string, allowedRoles: string[]): void {
  if (!allowedRoles.includes(userRole)) {
    throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
}

/**
 * Require admin role
 */
export function requireAdmin(userRole: string): void {
  requireRole(userRole, ['admin']);
}

/**
 * Authentication middleware factory
 */
export function withAuth(
  handler: (request: NextRequest, user: User) => Promise<Response>,
  options?: { roles?: string[] }
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = await authenticate(request);

      // Check role if specified
      if (options?.roles) {
        requireRole(user.role, options.roles);
      }

      return handler(request, user);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error instanceof AuthorizationError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
