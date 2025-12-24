import { ChoiceGeneratorService } from '@/services/narrative-planning/choice-generator';
import { prisma } from '@/lib/prisma';
import { getGeminiClient } from '@/lib/ai/gemini';
import type { NarrativeNode, Nugget } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    narrativeNode: {
      update: jest.fn(),
    },
    nugget: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/ai/gemini', () => ({
  getGeminiClient: jest.fn(),
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

describe('ChoiceGeneratorService', () => {
  let service: ChoiceGeneratorService;
  let mockModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChoiceGeneratorService();

    mockModel = {
      generateContent: jest.fn(),
    };

    const mockClient = {
      getGenerativeModel: jest.fn(() => mockModel),
    };

    (getGeminiClient as jest.Mock).mockReturnValue(mockClient);
  });

  describe('generateChoices', () => {
    it('should generate choices for a narrative node', async () => {
      const mockNode: Partial<NarrativeNode> = {
        id: 'node-id',
        nuggetId: 'nugget-id',
        organizationId: 'org-id',
        adaptsTo: ['gap1'],
      };

      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        content: 'Test content',
      };

      const mockAvailableNodes: Partial<NarrativeNode>[] = [
        { id: 'node-1', nuggetId: 'nugget-1', organizationId: 'org-id', adaptsTo: ['gap2'] },
        { id: 'node-2', nuggetId: 'nugget-2', organizationId: 'org-id', adaptsTo: ['gap3'] },
      ];

      (prisma.nugget.findUnique as jest.Mock).mockResolvedValue(mockNugget);
      (prisma.narrativeNode.update as jest.Mock).mockResolvedValue(undefined);

      const mockResponse = {
        response: {
          text: jest.fn().mockReturnValue(
            JSON.stringify({
              choices: [
                {
                  id: 'choice-1',
                  text: 'Option 1',
                  nextNodeId: 'node-1',
                  revealsGap: ['gap1'],
                  confirmsMastery: ['concept1'],
                },
              ],
            })
          ),
        },
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateChoices(
        mockNode as NarrativeNode,
        mockAvailableNodes as NarrativeNode[]
      );

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Option 1');
      expect(prisma.narrativeNode.update).toHaveBeenCalled();
    });

    it('should use fallback choices when AI generation fails', async () => {
      const mockNode: Partial<NarrativeNode> = {
        id: 'node-id',
        nuggetId: 'nugget-id',
        organizationId: 'org-id',
        adaptsTo: [],
      };

      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        content: 'Test content',
      };

      const mockAvailableNodes: Partial<NarrativeNode>[] = [
        { id: 'node-1', nuggetId: 'nugget-1', organizationId: 'org-id', adaptsTo: [] },
      ];

      (prisma.nugget.findUnique as jest.Mock).mockResolvedValue(mockNugget);
      (prisma.narrativeNode.update as jest.Mock).mockResolvedValue(undefined);
      mockModel.generateContent.mockRejectedValue(new Error('API error'));

      const result = await service.generateChoices(
        mockNode as NarrativeNode,
        mockAvailableNodes as NarrativeNode[]
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].nextNodeId).toBe('node-1');
    });
  });

  describe('selectAdaptivePath', () => {
    it('should select path based on knowledge gaps', async () => {
      const learnerGaps = ['gap1', 'gap2'];
      const availableNodes: Partial<NarrativeNode>[] = [
        { id: 'node-1', adaptsTo: ['gap1'] },
        { id: 'node-2', adaptsTo: ['gap3'] },
        { id: 'node-3', adaptsTo: ['gap2'] },
      ];

      const result = await service.selectAdaptivePath(
        'current-node',
        learnerGaps,
        availableNodes as NarrativeNode[]
      );

      expect(result).toBe('node-1'); // First matching node
    });

    it('should return first available node when no match', async () => {
      const learnerGaps = ['gap4'];
      const availableNodes: Partial<NarrativeNode>[] = [
        { id: 'node-1', adaptsTo: ['gap1'] },
        { id: 'node-2', adaptsTo: ['gap2'] },
      ];

      const result = await service.selectAdaptivePath(
        'current-node',
        learnerGaps,
        availableNodes as NarrativeNode[]
      );

      expect(result).toBe('node-1'); // First available node
    });

    it('should return null when no nodes available', async () => {
      const result = await service.selectAdaptivePath('current-node', ['gap1'], []);

      expect(result).toBeNull();
    });
  });
});
