import { NarrativeNodeGeneratorService } from '@/services/narrative-planning/node-generator';
import { prisma } from '@/lib/prisma';
import type { Nugget } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    narrativeNode: {
      create: jest.fn(),
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

describe('NarrativeNodeGeneratorService', () => {
  let service: NarrativeNodeGeneratorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NarrativeNodeGeneratorService();
  });

  describe('generateNode', () => {
    it('should generate narrative node from nugget', async () => {
      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        organizationId: 'org-id',
        content: 'Test content',
        metadata: {
          prerequisites: ['prereq1', 'prereq2'],
          relatedConcepts: ['concept1', 'concept2'],
        } as any,
      };

      const result = await service.generateNode(mockNugget as Nugget);

      expect(result.nuggetId).toBe('nugget-id');
      expect(result.organizationId).toBe('org-id');
      expect(result.prerequisites).toEqual(['prereq1', 'prereq2']);
      expect(result.adaptsTo).toBeDefined();
      expect(result.position).toBeDefined();
      expect(result.position?.x).toBeGreaterThanOrEqual(0);
      expect(result.position?.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle nugget without metadata', async () => {
      const mockNugget: Partial<Nugget> = {
        id: 'nugget-id',
        organizationId: 'org-id',
        content: 'Test content',
        metadata: {} as any,
      };

      const result = await service.generateNode(mockNugget as Nugget);

      expect(result.prerequisites).toEqual([]);
      expect(result.adaptsTo).toEqual([]);
    });
  });

  describe('generateNodes', () => {
    it('should generate nodes for multiple nuggets', async () => {
      const mockNuggets: Partial<Nugget>[] = [
        { id: 'nugget-1', organizationId: 'org-id', content: 'Content 1', metadata: {} as any },
        { id: 'nugget-2', organizationId: 'org-id', content: 'Content 2', metadata: {} as any },
      ];

      const result = await service.generateNodes(mockNuggets as Nugget[]);

      expect(result).toHaveLength(2);
      expect(result[0].nuggetId).toBe('nugget-1');
      expect(result[1].nuggetId).toBe('nugget-2');
    });
  });

  describe('createNode', () => {
    it('should create narrative node in database', async () => {
      const nodeData = {
        nuggetId: 'nugget-id',
        organizationId: 'org-id',
        prerequisites: ['prereq1'],
        adaptsTo: ['gap1'],
        position: { x: 10, y: 20 },
      };

      const mockNode = { id: 'node-id', ...nodeData };
      (prisma.narrativeNode.create as jest.Mock).mockResolvedValue(mockNode);

      const result = await service.createNode(nodeData);

      expect(result).toEqual(mockNode);
      expect(prisma.narrativeNode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nuggetId: 'nugget-id',
            organizationId: 'org-id',
            prerequisites: ['prereq1'],
            adaptsTo: ['gap1'],
          }),
        })
      );
    });
  });
});
