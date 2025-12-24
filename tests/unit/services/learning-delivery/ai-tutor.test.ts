import { AITutorService } from '@/services/learning-delivery/ai-tutor';
import { getGeminiClient } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import type { Session, Learner, NarrativeNode, Nugget } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/ai/gemini', () => ({
  getGeminiClient: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    learner: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    narrativeNode: {
      findUnique: jest.fn(),
    },
    nugget: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    session: {
      update: jest.fn(),
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

describe('AITutorService', () => {
  let service: AITutorService;
  let mockModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AITutorService();

    mockModel = {
      generateContent: jest.fn(),
    };

    const mockClient = {
      getGenerativeModel: jest.fn(() => mockModel),
    };

    (getGeminiClient as jest.Mock).mockReturnValue(mockClient);
  });

  describe('generateResponse', () => {
    it('should generate response from AI tutor', async () => {
      const mockSession: Partial<Session> = {
        id: 'session-id',
        learnerId: 'learner-id',
        organizationId: 'org-id',
        currentNodeId: 'node-id',
      };

      const mockLearner: Partial<Learner> = {
        id: 'learner-id',
        userId: 'user-id',
        masteryMap: {},
        knowledgeGaps: [],
        user: {
          id: 'user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'learner',
          organizationId: 'org-id',
        } as any,
      };

      const mockNode: Partial<NarrativeNode> = {
        id: 'node-id',
        nuggetId: 'nugget-id',
        nugget: {
          id: 'nugget-id',
          content: 'Test content',
          organizationId: 'org-id',
          metadata: {},
          imageUrl: null,
          audioUrl: null,
          status: 'ready',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Nugget,
      };

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(mockLearner);
      (prisma.narrativeNode.findUnique as jest.Mock).mockResolvedValue(mockNode);

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue('AI tutor response'),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateResponse(mockSession as Session, 'Hello, I need help');

      expect(result).toBe('AI tutor response');
      expect(mockModel.generateContent).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockSession: Partial<Session> = {
        id: 'session-id',
        learnerId: 'learner-id',
        organizationId: 'org-id',
      };

      (prisma.learner.findUnique as jest.Mock).mockResolvedValue(null);
      mockModel.generateContent.mockRejectedValue(new Error('API error'));

      await expect(service.generateResponse(mockSession as Session, 'Hello')).rejects.toThrow(
        'API error'
      );
    });
  });
});
