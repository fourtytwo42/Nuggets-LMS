import { Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { TextExtractorService } from '@/services/content-ingestion/text-extractor';
import { nuggetAssemblerService } from '@/services/content-ingestion/nugget-assembler';
import logger from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

export interface IngestionJobData {
  type: 'file' | 'url';
  source: string;
  organizationId: string;
  metadata?: {
    folderId?: string;
    urlId?: string;
    fileName?: string;
    fileSize?: number;
    jobId?: string;
  };
}

/**
 * Process ingestion job
 */
export async function processIngestionJob(job: Job<IngestionJobData>): Promise<{
  success: boolean;
  nuggetCount: number;
}> {
  const { type, source, organizationId, metadata } = job.data;
  const jobId = metadata?.jobId;

  try {
    logger.info('Processing ingestion job', {
      jobId: job.id,
      type,
      source,
      organizationId,
    });

    // Update job status if jobId is provided
    if (jobId) {
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });
    }

    let content: string;
    let sourcePath: string;

    if (type === 'file') {
      // Process file
      // Resolve to absolute path if relative
      sourcePath = path.isAbsolute(source) ? source : path.resolve(process.cwd(), source);

      // Check if file exists
      try {
        await fs.access(sourcePath);
      } catch (error) {
        throw new Error(`File not found: ${sourcePath}`);
      }

      // Extract text from file
      const textExtractor = new TextExtractorService();
      const extractionResult = await textExtractor.extractFromFile(sourcePath);
      content = extractionResult.text;

      logger.info('Text extracted from file', {
        filePath: sourcePath,
        contentLength: content.length,
      });
    } else if (type === 'url') {
      // Process URL
      sourcePath = source;

      // Fetch URL content
      const response = await fetch(source, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NuggetsLMS/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      // Extract content from HTML
      const textExtractor = new TextExtractorService();
      const urlContent = await textExtractor.extractFromURLContent(html, source);
      content = urlContent.text;

      logger.info('Content extracted from URL', {
        url: source,
        contentLength: content.length,
      });
    } else {
      throw new Error(`Invalid ingestion type: ${type}`);
    }

    // Assemble nuggets from content
    const nuggets = await nuggetAssemblerService.assembleNuggets({
      content,
      organizationId,
      source: {
        type,
        path: sourcePath,
      },
      options: {
        generateEmbeddings: true,
        generateImages: true,
      },
    });

    // Update job status if jobId is provided
    if (jobId) {
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          nuggetCount: nuggets.length,
          completedAt: new Date(),
        },
      });
    }

    logger.info('Ingestion job completed', {
      jobId: job.id,
      nuggetCount: nuggets.length,
    });

    return {
      success: true,
      nuggetCount: nuggets.length,
    };
  } catch (error) {
    logger.error('Ingestion job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
      type,
      source,
    });

    // Update job status if jobId is provided
    if (jobId) {
      await prisma.ingestionJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
    }

    throw error;
  }
}
