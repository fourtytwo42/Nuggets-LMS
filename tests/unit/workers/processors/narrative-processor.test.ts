import { processNarrativePlanningJob } from '@/workers/processors/narrative-processor';
import { narrativeNodeGeneratorService } from '@/services/narrative-planning/node-generator';
import { choiceGeneratorService } from '@/services/narrative-planning/choice-generator';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    nugget: {
      findMany: jest.fn(),
    },
    narrativeNode: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/services/narrative-planning/node-generator');
jest.mock('@/services/narrative-planning/choice-generator');
jest.mock('@/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('NarrativeProcessor', () => {
  const mockNuggets = [
    {
      id: 'nugget-1',
      content: 'Content 1',
      organizationId: 'org-1',
      metadata: { prerequisites: [], relatedConcepts: [] },
    },
    {
      id: 'nugget-2',
      content: 'Content 2',
      organizationId: 'org-1',
      metadata: { prerequisites: [], relatedConcepts: [] },
    },
  ];

  const mockNode = {
    id: 'node-1',
    nuggetId: 'nugget-1',
    organizationId: 'org-1',
    prerequisites: [],
    adaptsTo: [],
    choices: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process narrative planning job', async () => {
    const mockJob = {
      id: 'job-1',
      data: {
        nuggetIds: ['nugget-1', 'nugget-2'],
        organizationId: 'org-1',
      },
    } as any;

    (prisma.nugget.findMany as jest.Mock).mockResolvedValue(mockNuggets);
    (prisma.narrativeNode.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.narrativeNode.findMany as jest.Mock).mockResolvedValue([mockNode]);

    const mockNodeData = {
      nuggetId: 'nugget-1',
      organizationId: 'org-1',
      prerequisites: [],
      adaptsTo: [],
      position: { x: 0, y: 0 },
    };

    (narrativeNodeGeneratorService.generateNode as jest.Mock).mockResolvedValue(mockNodeData);
    (narrativeNodeGeneratorService.createNode as jest.Mock).mockResolvedValue(mockNode);
    (choiceGeneratorService.generateChoices as jest.Mock).mockResolvedValue([]);

    const result = await processNarrativePlanningJob(mockJob);

    expect(result.success).toBe(true);
    expect(result.nodeCount).toBe(2);
  });

  it('should skip existing nodes', async () => {
    const mockJob = {
      id: 'job-1',
      data: {
        nuggetIds: ['nugget-1'],
        organizationId: 'org-1',
      },
    } as any;

    (prisma.nugget.findMany as jest.Mock).mockResolvedValue([mockNuggets[0]]);
    (prisma.narrativeNode.findFirst as jest.Mock).mockResolvedValue(mockNode);
    (prisma.narrativeNode.findMany as jest.Mock).mockResolvedValue([]);

    (choiceGeneratorService.generateChoices as jest.Mock).mockResolvedValue([]);

    const result = await processNarrativePlanningJob(mockJob);

    expect(result.success).toBe(true);
    expect(narrativeNodeGeneratorService.generateNode).not.toHaveBeenCalled();
  });
});
