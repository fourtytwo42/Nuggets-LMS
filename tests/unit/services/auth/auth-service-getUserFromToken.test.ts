import { AuthService } from '@/services/auth/auth-service';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth/jwt';
import { AuthenticationError } from '@/lib/auth/errors';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
}));

describe('AuthService - getUserFromToken', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  it('should get user from valid token', async () => {
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

    (verifyToken as jest.Mock).mockReturnValue(mockPayload);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.getUserFromToken('valid-token');

    expect(result).toEqual(mockUser);
    expect(verifyToken).toHaveBeenCalledWith('valid-token');
  });

  it('should throw error when user not found', async () => {
    const mockPayload = {
      userId: 'user-id',
      email: 'test@example.com',
      role: 'learner',
      organizationId: 'org-id',
    };

    (verifyToken as jest.Mock).mockReturnValue(mockPayload);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getUserFromToken('valid-token')).rejects.toThrow(AuthenticationError);
  });
});
