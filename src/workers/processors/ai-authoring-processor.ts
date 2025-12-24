import { Job } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { ImageGeneratorService } from '@/services/content-ingestion/image-generator';
import { AudioGeneratorService } from '@/services/ai-authoring/audio-generator';
import { SlideGeneratorService } from '@/services/ai-authoring/slide-generator';
import logger from '@/lib/logger';

export interface ImageGenerationJobData {
  nuggetId: string;
  organizationId: string;
}

export interface AudioGenerationJobData {
  nuggetId: string;
  organizationId: string;
}

export interface SlideGenerationJobData {
  nuggetId: string;
  organizationId: string;
}

/**
 * Process image generation job
 */
export async function processImageGenerationJob(
  job: Job<ImageGenerationJobData>
): Promise<{ success: boolean; imageUrl: string }> {
  const { nuggetId, organizationId } = job.data;

  try {
    logger.info('Processing image generation job', {
      jobId: job.id,
      nuggetId,
    });

    // Get nugget
    const nugget = await prisma.nugget.findUnique({
      where: { id: nuggetId },
    });

    if (!nugget) {
      throw new Error(`Nugget not found: ${nuggetId}`);
    }

    // Generate image
    const imageGenerator = new ImageGeneratorService();
    const metadata = nugget.metadata as any;
    const imagePrompt = imageGenerator.generateImagePrompt(nugget.content, metadata?.topics || []);
    const imageUrl = await imageGenerator.generateImage(imagePrompt, nuggetId, organizationId, {
      quality: 'medium', // Use medium quality for cost-effectiveness
      size: '1024x1024',
    });

    // Update nugget with image URL
    await prisma.nugget.update({
      where: { id: nuggetId },
      data: { imageUrl },
    });

    logger.info('Image generation job completed', {
      jobId: job.id,
      nuggetId,
      imageUrl,
    });

    return {
      success: true,
      imageUrl,
    };
  } catch (error) {
    logger.error('Image generation job failed', {
      jobId: job.id,
      nuggetId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process audio generation job
 */
export async function processAudioGenerationJob(
  job: Job<AudioGenerationJobData>
): Promise<{ success: boolean; audioUrl: string }> {
  const { nuggetId, organizationId } = job.data;

  try {
    logger.info('Processing audio generation job', {
      jobId: job.id,
      nuggetId,
    });

    // Get nugget
    const nugget = await prisma.nugget.findUnique({
      where: { id: nuggetId },
    });

    if (!nugget) {
      throw new Error(`Nugget not found: ${nuggetId}`);
    }

    // Generate audio script
    const audioGenerator = new AudioGeneratorService();
    const audioScript = await audioGenerator.generateAudioScript(nugget);

    // Generate audio file
    const audioUrl = await audioGenerator.generateAudioFile(
      audioScript.script,
      nuggetId,
      organizationId
    );

    // Update nugget with audio URL
    await prisma.nugget.update({
      where: { id: nuggetId },
      data: { audioUrl },
    });

    logger.info('Audio generation job completed', {
      jobId: job.id,
      nuggetId,
      audioUrl,
    });

    return {
      success: true,
      audioUrl,
    };
  } catch (error) {
    logger.error('Audio generation job failed', {
      jobId: job.id,
      nuggetId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process slide generation job
 */
export async function processSlideGenerationJob(
  job: Job<SlideGenerationJobData>
): Promise<{ success: boolean; slideCount: number }> {
  const { nuggetId } = job.data;

  try {
    logger.info('Processing slide generation job', {
      jobId: job.id,
      nuggetId,
    });

    // Get nugget
    const nugget = await prisma.nugget.findUnique({
      where: { id: nuggetId },
    });

    if (!nugget) {
      throw new Error(`Nugget not found: ${nuggetId}`);
    }

    // Generate slides
    const slideGenerator = new SlideGeneratorService();
    const slideDeck = await slideGenerator.generateSlides(nugget);

    // Store slides in nugget metadata
    const metadata = (nugget.metadata as any) || {};
    metadata.slides = slideDeck.slides;
    metadata.slideMetadata = slideDeck.metadata;

    await prisma.nugget.update({
      where: { id: nuggetId },
      data: { metadata },
    });

    logger.info('Slide generation job completed', {
      jobId: job.id,
      nuggetId,
      slideCount: slideDeck.slides.length,
    });

    return {
      success: true,
      slideCount: slideDeck.slides.length,
    };
  } catch (error) {
    logger.error('Slide generation job failed', {
      jobId: job.id,
      nuggetId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
