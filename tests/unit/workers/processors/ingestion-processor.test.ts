// Mock cheerio to avoid ES module issues
jest.mock('cheerio', () => {
  const mockText = jest.fn(() => 'Mocked text content');
  const mockRemove = jest.fn().mockReturnThis();
  const cheerioInstance = jest.fn((selector: string) => {
    if (selector === 'script, style') {
      return { remove: mockRemove };
    }
    return { text: mockText };
  }) as any;
  cheerioInstance.text = mockText;
  cheerioInstance.remove = mockRemove;
  return {
    load: jest.fn(() => cheerioInstance),
  };
});

// Mock bullmq dependencies
jest.mock('bullmq', () => ({
  Queue: jest.fn(),
  Worker: jest.fn(),
}));

import { processIngestionJob } from '@/workers/processors/ingestion-processor';
import { TextExtractorService } from '@/services/content-ingestion/text-extractor';
import { nuggetAssemblerService } from '@/services/content-ingestion/nugget-assembler';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import fs from 'fs/promises';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ingestionJob: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@/services/content-ingestion/text-extractor');
jest.mock('@/services/content-ingestion/nugget-assembler');
jest.mock('@/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  access: jest.fn(),
}));

describe('IngestionProcessor', () => {
  const mockJob = {
    id: 'job-1',
    data: {
      type: 'file' as const,
      source: '/test/file.pdf',
      organizationId: 'org-1',
      metadata: {
        jobId: 'ingestion-job-1',
        fileName: 'file.pdf',
      },
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process file ingestion job', async () => {
    const mockExtractionResult = {
      text: 'Extracted text content',
      metadata: {
        fileType: 'pdf',
        fileName: 'file.pdf',
        fileSize: 1000,
        pageCount: 1,
      },
    };

    const mockNuggets = [
      {
        id: 'nugget-1',
        content: 'Chunk 1',
        status: 'ready',
      },
    ];

    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (TextExtractorService as jest.Mock).mockImplementation(() => ({
      extractFromFile: jest.fn().mockResolvedValue(mockExtractionResult),
    }));
    (nuggetAssemblerService.assembleNuggets as jest.Mock).mockResolvedValue(mockNuggets);
    (prisma.ingestionJob.update as jest.Mock).mockResolvedValue({});

    const result = await processIngestionJob(mockJob);

    expect(result.success).toBe(true);
    expect(result.nuggetCount).toBe(1);
    expect(prisma.ingestionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ingestion-job-1' },
        data: expect.objectContaining({
          status: 'completed',
          nuggetCount: 1,
        }),
      })
    );
  });

  it('should handle file not found error', async () => {
    (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

    await expect(processIngestionJob(mockJob)).rejects.toThrow('File not found');

    expect(prisma.ingestionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ingestion-job-1' },
        data: expect.objectContaining({
          status: 'failed',
        }),
      })
    );
  });

  it('should process URL ingestion job', async () => {
    const urlJob = {
      ...mockJob,
      data: {
        ...mockJob.data,
        type: 'url' as const,
        source: 'https://example.com',
      },
    };

    const mockExtractionResult = {
      text: 'Extracted HTML content',
      metadata: {
        fileType: 'html',
        fileName: 'https://example.com',
        wordCount: 100,
      },
    };

    const mockNuggets = [{ id: 'nugget-1', content: 'Content', status: 'ready' }];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<html><body>Content</body></html>'),
    });

    (TextExtractorService as jest.Mock).mockImplementation(() => ({
      extractFromURLContent: jest.fn().mockResolvedValue(mockExtractionResult),
    }));
    (nuggetAssemblerService.assembleNuggets as jest.Mock).mockResolvedValue(mockNuggets);
    (prisma.ingestionJob.update as jest.Mock).mockResolvedValue({});

    const result = await processIngestionJob(urlJob);

    expect(result.success).toBe(true);
    expect(result.nuggetCount).toBe(1);
  });
});
