import {
  processImageGenerationJob,
  processAudioGenerationJob,
  processSlideGenerationJob,
} from '@/workers/processors/ai-authoring-processor';
import { ImageGeneratorService } from '@/services/content-ingestion/image-generator';
import { AudioGeneratorService } from '@/services/ai-authoring/audio-generator';
import { SlideGeneratorService } from '@/services/ai-authoring/slide-generator';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    nugget: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/services/content-ingestion/image-generator');
jest.mock('@/services/ai-authoring/audio-generator');
jest.mock('@/services/ai-authoring/slide-generator');
jest.mock('@/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('AI Authoring Processors', () => {
  const mockNugget = {
    id: 'nugget-1',
    content: 'Test content',
    metadata: { topics: ['Topic1', 'Topic2'] },
    organizationId: 'org-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.nugget.findUnique as jest.Mock).mockResolvedValue(mockNugget);
    (prisma.nugget.update as jest.Mock).mockResolvedValue({});
  });

  describe('processImageGenerationJob', () => {
    it('should generate and store image', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          nuggetId: 'nugget-1',
          organizationId: 'org-1',
        },
      } as any;

      const mockImageGenerator = {
        generateImagePrompt: jest.fn().mockReturnValue('Test prompt'),
        generateImage: jest.fn().mockResolvedValue('/images/nugget-1.png'),
      };

      (ImageGeneratorService as jest.Mock).mockImplementation(() => mockImageGenerator);

      const result = await processImageGenerationJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe('/images/nugget-1.png');
      expect(prisma.nugget.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'nugget-1' },
          data: { imageUrl: '/images/nugget-1.png' },
        })
      );
    });
  });

  describe('processAudioGenerationJob', () => {
    it('should generate and store audio', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          nuggetId: 'nugget-1',
          organizationId: 'org-1',
        },
      } as any;

      const mockAudioGenerator = {
        generateAudioScript: jest.fn().mockResolvedValue({ script: 'Audio script' }),
        generateAudioFile: jest.fn().mockResolvedValue('/audio/nugget-1.mp3'),
      };

      (AudioGeneratorService as jest.Mock).mockImplementation(() => mockAudioGenerator);

      const result = await processAudioGenerationJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.audioUrl).toBe('/audio/nugget-1.mp3');
    });
  });

  describe('processSlideGenerationJob', () => {
    it('should generate and store slides', async () => {
      const mockJob = {
        id: 'job-1',
        data: {
          nuggetId: 'nugget-1',
          organizationId: 'org-1',
        },
      } as any;

      const mockSlideDeck = {
        slides: [
          { id: 'slide-1', title: 'Slide 1', content: 'Content 1' },
          { id: 'slide-2', title: 'Slide 2', content: 'Content 2' },
        ],
        metadata: {
          totalSlides: 2,
          estimatedTime: 3,
        },
      };

      const mockSlideGenerator = {
        generateSlides: jest.fn().mockResolvedValue(mockSlideDeck),
      };

      (SlideGeneratorService as jest.Mock).mockImplementation(() => mockSlideGenerator);

      const result = await processSlideGenerationJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.slideCount).toBe(2);
      expect(prisma.nugget.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'nugget-1' },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              slides: mockSlideDeck.slides,
            }),
          }),
        })
      );
    });
  });
});
