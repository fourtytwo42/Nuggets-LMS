import OpenAI from 'openai';
import logger from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';
import { costTracker } from '@/services/analytics/cost-tracker';

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/**
 * Image generation service using GPT Image (gpt-image-1-mini)
 */
export class ImageGeneratorService {
  private storagePath: string;

  constructor() {
    this.storagePath = process.env.STORAGE_PATH || './storage';
  }

  /**
   * Calculate image tokens based on quality and size
   */
  private getImageTokens(quality: string, size: string): number {
    const isSquare = size === '1024x1024';
    const isPortrait = size === '1024x1536';
    const isLandscape = size === '1536x1024';

    if (quality === 'low') {
      if (isSquare) return 272;
      if (isPortrait) return 408;
      if (isLandscape) return 400;
    } else if (quality === 'medium') {
      if (isSquare) return 1056;
      if (isPortrait) return 1584;
      if (isLandscape) return 1568;
    } else if (quality === 'high') {
      if (isSquare) return 4160;
      if (isPortrait) return 6240;
      if (isLandscape) return 6208;
    }

    return 1056; // Default: medium quality, square
  }

  /**
   * Estimate text tokens (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTextTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate image for a nugget using GPT Image (gpt-image-1-mini)
   */
  async generateImage(
    prompt: string,
    nuggetId: string,
    organizationId: string,
    options?: { quality?: 'low' | 'medium' | 'high'; size?: string }
  ): Promise<string> {
    try {
      logger.info('Generating image for nugget', { nuggetId, prompt: prompt.substring(0, 100) });

      const client = getOpenAIClient();
      const quality = options?.quality || 'medium';
      const size = options?.size || '1024x1024';

      const response = await client.images.generate({
        model: 'gpt-image-1-mini',
        prompt: prompt,
        size: size as '1024x1024' | '1024x1536' | '1536x1024',
        quality: quality,
        response_format: 'b64_json',
      });

      const imageBase64 = response.data?.[0]?.b64_json;
      if (!imageBase64) {
        throw new Error('No image data returned from GPT Image');
      }

      // Decode base64 and save image
      const savedPath = await this.saveBase64Image(imageBase64, nuggetId, organizationId);

      // Track costs
      const tokenCounts = this.getTokenCounts(prompt, quality, size);
      await costTracker.trackImageGeneration(
        'gpt-image-1-mini',
        quality,
        size,
        tokenCounts.promptTokens,
        tokenCounts.imageTokens,
        organizationId
      );

      logger.info('Image generated and saved', { nuggetId, savedPath });
      return savedPath;
    } catch (error) {
      logger.error('Error generating image', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId,
      });
      throw error;
    }
  }

  /**
   * Generate image prompt from content
   */
  generateImagePrompt(content: string, topics: string[]): string {
    // Create a visual description based on content and topics
    const topicPhrase = topics.length > 0 ? topics.slice(0, 3).join(', ') : 'learning concept';
    const contentPreview = content.substring(0, 200).replace(/\s+/g, ' ');

    return `Educational illustration showing: ${topicPhrase}. Style: clean, modern, informative diagram or visual representation. Content theme: ${contentPreview.substring(0, 100)}...`;
  }

  /**
   * Save base64-encoded image to storage
   */
  private async saveBase64Image(
    imageBase64: string,
    nuggetId: string,
    organizationId: string
  ): Promise<string> {
    try {
      // Create storage directory structure
      const orgDir = path.join(this.storagePath, 'images', organizationId);
      await fs.mkdir(orgDir, { recursive: true });

      // Decode base64 to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const fileExtension = 'png'; // GPT Image returns PNG
      const filename = `${nuggetId}.${fileExtension}`;
      const filePath = path.join(orgDir, filename);

      // Save image
      await fs.writeFile(filePath, imageBuffer);

      // Return relative path from storage root
      return path.join('images', organizationId, filename);
    } catch (error) {
      logger.error('Error saving base64 image', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId,
      });
      throw error;
    }
  }

  /**
   * Get token counts for cost tracking
   */
  getTokenCounts(
    prompt: string,
    quality: string = 'medium',
    size: string = '1024x1024'
  ): { promptTokens: number; imageTokens: number } {
    return {
      promptTokens: this.estimateTextTokens(prompt),
      imageTokens: this.getImageTokens(quality, size),
    };
  }
}

// Singleton instance
export const imageGeneratorService = new ImageGeneratorService();
