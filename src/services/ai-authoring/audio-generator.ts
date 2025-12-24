import OpenAI from 'openai';
import logger from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';
import type { Nugget } from '@prisma/client';

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

export interface AudioScript {
  script: string;
  metadata: {
    wordCount: number;
    estimatedDuration: number; // seconds
  };
}

/**
 * Audio generation service using OpenAI TTS
 */
export class AudioGeneratorService {
  private storagePath: string;

  constructor() {
    this.storagePath = process.env.STORAGE_PATH || './storage';
  }

  /**
   * Generate audio script from nugget content
   */
  async generateAudioScript(nugget: Nugget): Promise<AudioScript> {
    try {
      logger.info('Generating audio script for nugget', { nuggetId: nugget.id });

      // For now, use the nugget content directly as the script
      // Can be enhanced with AI to create a more conversational script
      const script = this.formatContentForAudio(nugget.content);

      const wordCount = script.split(/\s+/).filter((word) => word.length > 0).length;
      const estimatedDuration = Math.ceil(wordCount / 2.5); // Average 2.5 words per second

      return {
        script,
        metadata: {
          wordCount,
          estimatedDuration,
        },
      };
    } catch (error) {
      logger.error('Error generating audio script', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId: nugget.id,
      });
      throw error;
    }
  }

  /**
   * Generate audio file from script using OpenAI TTS
   */
  async generateAudioFile(
    script: string,
    nuggetId: string,
    organizationId: string
  ): Promise<string> {
    try {
      logger.info('Generating audio file', { nuggetId, scriptLength: script.length });

      const client = getOpenAIClient();

      // Use OpenAI TTS API
      const response = await client.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
        input: script,
      });

      // Convert response to buffer
      const buffer = Buffer.from(await response.arrayBuffer());

      // Save audio file
      const savedPath = await this.saveAudioFile(buffer, nuggetId, organizationId);

      logger.info('Audio file generated and saved', { nuggetId, savedPath });
      return savedPath;
    } catch (error) {
      logger.error('Error generating audio file', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId,
      });
      throw error;
    }
  }

  /**
   * Format content for audio narration
   */
  private formatContentForAudio(content: string): string {
    // Remove markdown formatting
    let formatted = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .replace(/`(.+?)`/g, '$1'); // Remove code

    // Add pauses for better narration
    formatted = formatted.replace(/\.\s+/g, '. ');
    formatted = formatted.replace(/\n\n+/g, '. ');

    return formatted.trim();
  }

  /**
   * Save audio file to storage
   */
  private async saveAudioFile(
    buffer: Buffer,
    nuggetId: string,
    organizationId: string
  ): Promise<string> {
    try {
      // Create storage directory structure
      const orgDir = path.join(this.storagePath, 'audio', organizationId);
      await fs.mkdir(orgDir, { recursive: true });

      const filename = `${nuggetId}.mp3`;
      const filePath = path.join(orgDir, filename);

      // Save audio file
      await fs.writeFile(filePath, buffer);

      // Return relative path from storage root
      return path.join('audio', organizationId, filename);
    } catch (error) {
      logger.error('Error saving audio file', {
        error: error instanceof Error ? error.message : String(error),
        nuggetId,
      });
      throw error;
    }
  }
}

// Singleton instance
export const audioGeneratorService = new AudioGeneratorService();
