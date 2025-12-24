import { AuthService } from '@/services/auth/auth-service';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';

// Mock dependencies
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

jest.mock('@/lib/auth/password', () => ({
  hashPassword: jest.fn(),
}));

jest.mock('@/lib/auth/jwt', () => ({
  generateToken: jest.fn(),
}));

describe('AuthService - Register Extended Coverage', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  it('should create default organization when organizationId not provided', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.organization.create as jest.Mock).mockResolvedValue({
      id: 'org-id',
      name: "Test User's Organization",
    });
    (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'learner',
      organizationId: 'org-id',
      passwordHash: 'hashed-password',
    });
    (generateToken as jest.Mock).mockReturnValue('mock-token');

    const result = await service.register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(prisma.organization.create).toHaveBeenCalled();
    expect(result.organization.id).toBe('org-id');
  });

  it('should use provided role when specified', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.organization.create as jest.Mock).mockResolvedValue({
      id: 'org-id',
      name: "Test User's Organization",
    });
    (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      organizationId: 'org-id',
      passwordHash: 'hashed-password',
    });
    (generateToken as jest.Mock).mockReturnValue('mock-token');

    const result = await service.register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'admin',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'admin',
        }),
      })
    );
  });
});
