import { AuthService } from '@/services/auth/auth-service';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('@/lib/auth/jwt', () => ({
  generateToken: jest.fn(),
}));

describe('AuthService - Extended Coverage', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  describe('register', () => {
    it('should throw error when organization not found', async () => {
      const error = new Error('Organization not found');
      (prisma.organization.findUniqueOrThrow as jest.Mock).mockRejectedValue(error);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          organizationId: 'non-existent',
        })
      ).rejects.toThrow();
    });

    it('should throw error when user already exists', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org-id',
        name: 'Test Org',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
      });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          organizationId: 'org-id',
        })
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should throw error when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error when password is incorrect', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'learner',
        organizationId: 'org-id',
        organization: {
          id: 'org-id',
          name: 'Test Org',
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
