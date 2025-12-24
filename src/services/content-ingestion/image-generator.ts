import OpenAI from 'openai';
import logger from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

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
 * Image generation service using DALL-E
 */
export class ImageGeneratorService {
  private storagePath: string;

  constructor() {
    this.storagePath = process.env.STORAGE_PATH || './storage';
  }

  /**
   * Generate image for a nugget using DALL-E
   */
  async generateImage(prompt: string, nuggetId: string, organizationId: string): Promise<string> {
    try {
      logger.info('Generating image for nugget', { nuggetId, prompt: prompt.substring(0, 100) });

      const client = getOpenAIClient();
      const response = await client.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E');
      }

      // Download and save image
      const savedPath = await this.downloadAndSaveImage(imageUrl, nuggetId, organizationId);

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
   * Download image from URL and save to storage
   */
  private async downloadAndSaveImage(
    imageUrl: string,
    nuggetId: string,
    organizationId: string
  ): Promise<string> {
    try {
      // Create storage directory structure
      const orgDir = path.join(this.storagePath, 'images', organizationId);
      await fs.mkdir(orgDir, { recursive: true });

      // Download image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const fileExtension = 'png'; // DALL-E returns PNG
      const filename = `${nuggetId}.${fileExtension}`;
      const filePath = path.join(orgDir, filename);

      // Save image
      await fs.writeFile(filePath, buffer);

      // Return relative path from storage root
      return path.join('images', organizationId, filename);
    } catch (error) {
      logger.error('Error downloading and saving image', {
        error: error instanceof Error ? error.message : String(error),
        imageUrl,
        nuggetId,
      });
      throw error;
    }
  }
}

// Singleton instance
export const imageGeneratorService = new ImageGeneratorService();
