import { SessionService } from '@/services/learning-delivery/session-service';
import { prisma } from '@/lib/prisma';
import type { Learner, Session, NarrativeNode } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    learner: {
      findUnique: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    narrativeNode: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    sessionNode: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessionService();
  });

  describe('createSession', () => {
    it('should create a new learning session', async () => {
      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        userId: 'user-id',
        organizationId: 'org-id',
        masteryMap: {},
      };

      const mockNode: Partial<NarrativeNode> = {
        id: 'node-id',
        nuggetId: 'nugget-id',
        organizationId: 'org-id',
        prerequisites: [],
        adaptsTo: [],
      };

      const mockSession: Partial<Session> = {
        id: 'session-id',
        learnerId: 'learner-id',
        organizationId: 'org-id',
        currentNodeId: 'node-id',
        mode: 'text',
      };

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(mockLearner);
      (prisma.narrativeNode.findMany as jest.Mock).mockResolvedValue([mockNode]);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.sessionNode.create as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createSession({
        learnerId: 'user-id',
        organizationId: 'org-id',
      });

      expect(result.id).toBe('session-id');
      expect(prisma.session.create).toHaveBeenCalled();
    });

    it('should use specified initial node', async () => {
      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        userId: 'user-id',
        organizationId: 'org-id',
        masteryMap: {},
      };

      const mockNode: Partial<NarrativeNode> = {
        id: 'initial-node-id',
        nuggetId: 'nugget-id',
        organizationId: 'org-id',
      };

      const mockSession: Partial<Session> = {
        id: 'session-id',
        learnerId: 'learner-id',
        organizationId: 'org-id',
        currentNodeId: 'initial-node-id',
      };

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(mockLearner);
      (prisma.narrativeNode.findFirst as jest.Mock).mockResolvedValue(mockNode);
      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.sessionNode.create as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createSession({
        learnerId: 'user-id',
        organizationId: 'org-id',
        initialNodeId: 'initial-node-id',
      });

      expect(result.currentNodeId).toBe('initial-node-id');
    });

    it('should throw error when learner not found', async () => {
      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createSession({
          learnerId: 'user-id',
          organizationId: 'org-id',
        })
      ).rejects.toThrow('Learner not found');
    });
  });

  describe('getSession', () => {
    it('should get session by ID', async () => {
      const mockSession: Partial<Session> = {
        id: 'session-id',
        learnerId: 'learner-id',
        organizationId: 'org-id',
      };

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);

      const result = await service.getSession('session-id', 'org-id');

      expect(result).toEqual(mockSession);
      expect(prisma.session.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'session-id',
            organizationId: 'org-id',
          },
        })
      );
    });
  });

  describe('updateCurrentNode', () => {
    it('should update session current node', async () => {
      const mockSession: Partial<Session> = {
        id: 'session-id',
        learnerId: 'learner-id',
        organizationId: 'org-id',
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.session.update as jest.Mock).mockResolvedValue(undefined);
      (prisma.sessionNode.create as jest.Mock).mockResolvedValue(undefined);

      await service.updateCurrentNode('session-id', 'new-node-id', 'choice-id');

      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-id' },
          data: expect.objectContaining({
            currentNodeId: 'new-node-id',
          }),
        })
      );
      expect(prisma.sessionNode.create).toHaveBeenCalled();
    });
  });

  describe('completeSession', () => {
    it('should complete a session', async () => {
      (prisma.session.update as jest.Mock).mockResolvedValue(undefined);

      await service.completeSession('session-id');

      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-id' },
          data: expect.objectContaining({
            completedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should get active sessions for learner', async () => {
      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        userId: 'user-id',
      };

      const mockSessions: Partial<Session>[] = [
        { id: 'session-1', learnerId: 'learner-id', completedAt: null },
        { id: 'session-2', learnerId: 'learner-id', completedAt: null },
      ];

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(mockLearner);
      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);

      const result = await service.getActiveSessions('user-id');

      expect(result).toHaveLength(2);
      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            learnerId: 'learner-id',
            completedAt: null,
          },
        })
      );
    });
  });
});
