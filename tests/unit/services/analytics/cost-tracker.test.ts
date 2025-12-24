import { CostTracker } from '@/services/analytics/cost-tracker';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    analytics: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    learner: {
      count: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('CostTracker', () => {
  let costTracker: CostTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    costTracker = new CostTracker();
  });

  describe('trackAICall', () => {
    it('should track AI API call and store in Analytics', async () => {
      const mockCreate = prisma.analytics.create as jest.Mock;
      mockCreate.mockResolvedValue({ id: 'test-id' });

      await costTracker.trackAICall(
        'google',
        'gemini-3-pro',
        'generateContent',
        1000,
        500,
        'org-id',
        'learner-id'
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-id',
          learnerId: 'learner-id',
          eventType: 'ai_api_call',
          eventData: expect.objectContaining({
            provider: 'google',
            model: 'gemini-3-pro',
            endpoint: 'generateContent',
            inputTokens: 1000,
            outputTokens: 500,
          }),
        },
      });
    });
  });

  describe('trackVoiceUsage', () => {
    it('should track TTS usage', async () => {
      const mockCreate = prisma.analytics.create as jest.Mock;
      mockCreate.mockResolvedValue({ id: 'test-id' });

      await costTracker.trackVoiceUsage('openai', 'tts', 1000, 'org-id', 'learner-id');

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-id',
          learnerId: 'learner-id',
          eventType: 'voice_api_call',
          eventData: expect.objectContaining({
            provider: 'openai',
            type: 'tts',
            durationOrChars: 1000,
          }),
        },
      });
    });

    it('should track STT usage', async () => {
      const mockCreate = prisma.analytics.create as jest.Mock;
      mockCreate.mockResolvedValue({ id: 'test-id' });

      await costTracker.trackVoiceUsage('openai', 'stt', 5.5, 'org-id');

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-id',
          learnerId: null,
          eventType: 'voice_api_call',
          eventData: expect.objectContaining({
            provider: 'openai',
            type: 'stt',
            durationOrChars: 5.5,
          }),
        },
      });
    });
  });

  describe('trackImageGeneration', () => {
    it('should track image generation with token counts', async () => {
      const mockCreate = prisma.analytics.create as jest.Mock;
      mockCreate.mockResolvedValue({ id: 'test-id' });

      await costTracker.trackImageGeneration(
        'gpt-image-1-mini',
        'medium',
        '1024x1024',
        100,
        1056,
        'org-id',
        'learner-id'
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-id',
          learnerId: 'learner-id',
          eventType: 'image_generation',
          eventData: expect.objectContaining({
            model: 'gpt-image-1-mini',
            quality: 'medium',
            size: '1024x1024',
            promptTokens: 100,
            imageTokens: 1056,
          }),
        },
      });
    });
  });

  describe('getCostReport', () => {
    it('should calculate cost report from Analytics events', async () => {
      const mockFindMany = prisma.analytics.findMany as jest.Mock;
      const mockCount = prisma.learner.count as jest.Mock;

      mockFindMany.mockResolvedValue([
        {
          eventType: 'ai_api_call',
          eventData: { totalCost: 0.01, model: 'gemini-3-pro' },
        },
        {
          eventType: 'voice_api_call',
          eventData: { cost: 0.02, provider: 'openai', type: 'tts' },
        },
        {
          eventType: 'image_generation',
          eventData: { totalCost: 0.03, model: 'gpt-image-1-mini' },
        },
      ]);

      mockCount.mockResolvedValue(10);

      const report = await costTracker.getCostReport('org-id', 'month');

      expect(report.total).toBe(0.06);
      expect(report.byService.ai).toBe(0.01);
      expect(report.byService.voice).toBe(0.02);
      expect(report.byService.images).toBe(0.03);
    });
  });
});
