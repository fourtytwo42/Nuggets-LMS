import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateToken, verifyToken, type JWTPayload } from '@/lib/auth/jwt';
import { AuthenticationError } from '@/lib/auth/errors';
import type { User, Organization } from '@prisma/client';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: string;
  organizationId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  token: string;
  organization: Organization;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AuthenticationError('User with this email already exists');
    }

    // Get or create organization
    let organization: Organization;
    if (input.organizationId) {
      organization = await prisma.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
      });
    } else {
      // Create default organization for user
      organization = await prisma.organization.create({
        data: {
          name: `${input.name}'s Organization`,
        },
      });
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const role = input.role || 'learner';
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role,
        organizationId: organization.id,
      },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      organization,
    };
  }

  /**
   * Login a user
   */
  async login(input: LoginInput): Promise<AuthResult> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      organization: user.organization,
    };
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token: string): Promise<User> {
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return user;
  }
}
