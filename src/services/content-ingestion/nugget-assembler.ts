import { prisma } from '@/lib/prisma';
import { semanticChunkerService, type Chunk } from './semantic-chunker';
import { metadataExtractorService } from './metadata-extractor';
import { embeddingService } from './embedding-service';
import { imageGeneratorService } from './image-generator';
import logger from '@/lib/logger';
import type { Nugget } from '@prisma/client';

export interface NuggetSource {
  type: 'file' | 'url';
  source: string;
  chunkIndex: number;
}

export interface AssembleNuggetsInput {
  content: string;
  organizationId: string;
  source: {
    type: 'file' | 'url';
    path: string;
  };
  options?: {
    generateImages?: boolean;
    generateEmbeddings?: boolean;
  };
}

/**
 * Nugget assembler service - completes the ingestion pipeline
 */
export class NuggetAssemblerService {
  /**
   * Assemble chunks into nuggets and complete ingestion pipeline
   */
  async assembleNuggets(input: AssembleNuggetsInput): Promise<Nugget[]> {
    try {
      logger.info('Assembling nuggets from content', {
        organizationId: input.organizationId,
        sourceType: input.source.type,
        contentLength: input.content.length,
      });

      // Step 1: Chunk the content
      const chunks = semanticChunkerService.chunkText(input.content);
      logger.info('Content chunked', { chunkCount: chunks.length });

      // Step 2: Create nuggets from chunks
      const nuggets: Nugget[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Extract metadata
        const metadata = metadataExtractorService.extractMetadata(chunk.text);

        // Create nugget
        const nugget = await prisma.nugget.create({
          data: {
            organizationId: input.organizationId,
            content: chunk.text,
            metadata: metadata as any,
            status: 'processing',
          },
        });

        // Create nugget source record
        await prisma.nuggetSource.create({
          data: {
            nuggetId: nugget.id,
            sourceType: input.source.type,
            sourcePath: input.source.path || '',
          },
        });

        nuggets.push(nugget);

        // Step 3: Generate embedding (async, queue job)
        if (input.options?.generateEmbeddings !== false) {
          await embeddingService.queueEmbeddingJob(nugget.id, chunk.text, input.organizationId);
        }

        // Step 4: Generate image (async, queue job)
        if (input.options?.generateImages) {
          // Queue image generation job (to be implemented in workers)
          // For now, we'll generate synchronously for testing
          try {
            const imagePrompt = imageGeneratorService.generateImagePrompt(
              chunk.text,
              metadata.topics
            );
            const imagePath = await imageGeneratorService.generateImage(
              imagePrompt,
              nugget.id,
              input.organizationId
            );

            await prisma.nugget.update({
              where: { id: nugget.id },
              data: { imageUrl: imagePath },
            });
          } catch (error) {
            logger.error('Error generating image', {
              error: error instanceof Error ? error.message : String(error),
              nuggetId: nugget.id,
            });
            // Continue without image
          }
        }

        // Update status to ready (after embedding is queued)
        await prisma.nugget.update({
          where: { id: nugget.id },
          data: { status: 'ready' },
        });
      }

      logger.info('Nuggets assembled', {
        count: nuggets.length,
        organizationId: input.organizationId,
      });

      return nuggets;
    } catch (error) {
      logger.error('Error assembling nuggets', {
        error: error instanceof Error ? error.message : String(error),
        organizationId: input.organizationId,
      });
      throw error;
    }
  }

  /**
   * Get nuggets by organization
   */
  async getNuggetsByOrganization(
    organizationId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Nugget[]> {
    return prisma.nugget.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
      },
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get nugget by ID
   */
  async getNuggetById(nuggetId: string, organizationId: string): Promise<Nugget | null> {
    return prisma.nugget.findFirst({
      where: {
        id: nuggetId,
        organizationId,
      },
    });
  }
}

// Singleton instance
export const nuggetAssemblerService = new NuggetAssemblerService();
