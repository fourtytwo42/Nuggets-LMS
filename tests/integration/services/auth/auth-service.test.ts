import { AuthService } from '@/services/auth/auth-service';
import { prisma } from '@/lib/prisma';
import { AuthenticationError } from '@/lib/auth/errors';
import bcrypt from 'bcrypt';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

describe('AuthService', () => {
  const authService = new AuthService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerInput = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'learner' as const,
    };

    it('should register a new user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.organization.create as jest.Mock).mockResolvedValue({
        id: 'org-id',
        name: "Test User's Organization",
      });
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: registerInput.email,
        name: registerInput.name,
        role: registerInput.role,
        organizationId: 'org-id',
        passwordHash: 'hashed-password',
      });

      const result = await authService.register(registerInput);

      expect(result.user.email).toBe(registerInput.email);
      expect(result.token).toBeDefined();
      expect(result.user.passwordHash).toBeUndefined();
      expect(hashPassword).toHaveBeenCalledWith(registerInput.password);
    });

    it('should throw error if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user-id',
        email: registerInput.email,
      });

      await expect(authService.register(registerInput)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('login', () => {
    const loginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login with valid credentials', async () => {
      // Mock user with hashed password
      const mockUser = {
        id: 'user-id',
        email: loginInput.email,
        passwordHash: '$2b$10$hashedpassword', // Mock bcrypt hash
        role: 'learner',
        organizationId: 'org-id',
        organization: {
          id: 'org-id',
          name: 'Test Org',
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(loginInput);

      expect(result.user.email).toBe(loginInput.email);
      expect(result.token).toBeDefined();
      expect(verifyPassword).toHaveBeenCalledWith(loginInput.password, mockUser.passwordHash);
    });

    it('should throw error for invalid email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginInput)).rejects.toThrow(AuthenticationError);
    });
  });
});
