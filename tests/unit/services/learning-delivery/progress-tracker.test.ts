import { ProgressTrackerService } from '@/services/learning-delivery/progress-tracker';
import { prisma } from '@/lib/prisma';
import type { Learner, Session } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    learner: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
    progress: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
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

describe('ProgressTrackerService', () => {
  let service: ProgressTrackerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProgressTrackerService();
  });

  describe('updateProgress', () => {
    it('should update progress for a concept', async () => {
      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        organizationId: 'org-id',
        masteryMap: {},
        knowledgeGaps: [],
      };

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(mockLearner);
      (prisma.learner.update as jest.Mock).mockResolvedValue(undefined);
      (prisma.progress.create as jest.Mock).mockResolvedValue(undefined);

      await service.updateProgress('learner-id', 'concept1', 75);

      expect(prisma.learner.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'learner-id' },
          data: expect.objectContaining({
            masteryMap: expect.objectContaining({
              concept1: 75,
            }),
          }),
        })
      );
      expect(prisma.progress.create).toHaveBeenCalled();
    });

    it('should clamp mastery to 0-100 range', async () => {
      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        organizationId: 'org-id',
        masteryMap: {},
      };

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(mockLearner);
      (prisma.learner.update as jest.Mock).mockResolvedValue(undefined);
      (prisma.progress.create as jest.Mock).mockResolvedValue(undefined);

      await service.updateProgress('learner-id', 'concept1', 150);

      expect(prisma.learner.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            masteryMap: expect.objectContaining({
              concept1: 100,
            }),
          }),
        })
      );
    });

    it('should remove knowledge gap when mastery >= 70', async () => {
      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        organizationId: 'org-id',
        masteryMap: {},
        knowledgeGaps: ['concept1'],
      };

      (prisma.learner.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockLearner)
        .mockResolvedValueOnce(mockLearner);
      (prisma.learner.update as jest.Mock).mockResolvedValue(undefined);
      (prisma.progress.create as jest.Mock).mockResolvedValue(undefined);

      await service.updateProgress('learner-id', 'concept1', 75);

      expect(prisma.learner.update).toHaveBeenCalledTimes(2);
      expect(prisma.learner.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            knowledgeGaps: [],
          }),
        })
      );
    });
  });

  describe('getProgress', () => {
    it('should get progress for a learner', async () => {
      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        masteryMap: { concept1: 75 },
        knowledgeGaps: ['concept2'],
      };

      const mockProgress = [
        {
          concept: 'concept1',
          mastery: 75,
          createdAt: new Date(),
        },
      ];

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(mockLearner);
      (prisma.progress.findMany as jest.Mock).mockResolvedValue(mockProgress);

      const result = await service.getProgress('learner-id');

      expect(result.masteryMap).toEqual({ concept1: 75 });
      expect(result.knowledgeGaps).toEqual(['concept2']);
      expect(result.recentProgress).toHaveLength(1);
    });
  });

  describe('identifyKnowledgeGaps', () => {
    it('should identify knowledge gaps from low mastery', async () => {
      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        masteryMap: {
          concept1: 30,
          concept2: 60,
          concept3: 40,
        },
        knowledgeGaps: [],
      };

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(mockLearner);
      (prisma.learner.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.identifyKnowledgeGaps('learner-id');

      expect(result).toContain('concept1');
      expect(result).toContain('concept3');
      expect(result).not.toContain('concept2');
      expect(prisma.learner.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            knowledgeGaps: expect.arrayContaining(['concept1', 'concept3']),
          }),
        })
      );
    });
  });
});
