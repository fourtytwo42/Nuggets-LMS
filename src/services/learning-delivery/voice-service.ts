import { getGeminiClient, trackGeminiCost } from '@/lib/ai/gemini';
import { prisma } from '@/lib/prisma';
import { aiTutorService } from './ai-tutor';
import logger from '@/lib/logger';
import type { Session } from '@prisma/client';
import { costTracker } from '@/services/analytics/cost-tracker';

export interface VoiceMessage {
  audio: string; // Base64 encoded audio data
  format?: string; // Audio format (e.g., 'webm', 'wav')
}

export interface VoiceResponse {
  audio: string; // Base64 encoded audio response
  text?: string; // Transcribed text (for logging/debugging)
  format?: string; // Audio format
}

/**
 * Voice service for 2-way voice conversation using Gemini API
 * Note: This implements voice mode using STT + Gemini + TTS
 * Gemini Live API integration will be added when available in SDK
 */
export class VoiceService {
  /**
   * Process voice input and generate voice response
   */
  async processVoiceInput(
    session: Session,
    voiceMessage: VoiceMessage,
    conversationHistory: any[] = []
  ): Promise<VoiceResponse> {
    try {
      logger.info('Processing voice input', { sessionId: session.id });

      // Step 1: Convert audio to text using Gemini (or STT service)
      const transcribedText = await this.transcribeAudio(voiceMessage.audio, voiceMessage.format);

      if (!transcribedText) {
        throw new Error('Failed to transcribe audio');
      }

      // Track STT cost (estimate duration from audio size)
      // Rough estimate: 1 minute of audio ≈ 1MB base64
      const audioBuffer = Buffer.from(voiceMessage.audio, 'base64');
      const estimatedMinutes = Math.max(0.1, audioBuffer.length / (1024 * 1024)); // At least 0.1 minutes
      await costTracker.trackVoiceUsage(
        'openai',
        'stt',
        estimatedMinutes,
        session.organizationId,
        session.learnerId
      );

      // Step 2: Store user message
      await prisma.message.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: transcribedText,
        },
      });

      // Step 3: Get conversation history
      const messages = await prisma.message.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      const tutorMessages = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
      }));

      // Step 4: Generate AI tutor response
      const aiResponse = await aiTutorService.generateResponse(
        session,
        transcribedText,
        tutorMessages
      );

      // Step 5: Store AI response
      await prisma.message.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: aiResponse,
        },
      });

      // Step 6: Convert text response to audio
      const audioResponse = await this.textToSpeech(
        aiResponse,
        session.organizationId,
        session.learnerId
      );

      // Step 7: Update session last activity
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActivity: new Date() },
      });

      return {
        audio: audioResponse,
        text: aiResponse,
        format: 'mp3',
      };
    } catch (error) {
      logger.error('Error processing voice input', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: session.id,
      });
      throw error;
    }
  }

  /**
   * Transcribe audio to text
   * Note: Using Gemini's multimodal capabilities or fallback to OpenAI Whisper
   */
  private async transcribeAudio(audioBase64: string, format?: string): Promise<string> {
    try {
      // For now, we'll use a simple approach with Gemini's multimodal input
      // In production, you might want to use a dedicated STT service
      const client = getGeminiClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, 'base64');

      // Use Gemini's multimodal input for transcription
      // Note: This is a simplified implementation
      // Gemini Live API would handle this more efficiently
      const prompt =
        'Transcribe this audio to text. Return only the transcribed text, no additional commentary.';

      try {
        // Attempt to use Gemini's audio input (if supported)
        const result = await model.generateContent([
          {
            inlineData: {
              data: audioBase64,
              mimeType: format === 'webm' ? 'audio/webm' : 'audio/wav',
            },
          },
          { text: prompt },
        ]);

        const text = result.response.text();

        // Track STT cost (estimate duration from audio size)
        // Rough estimate: 1 minute of audio ≈ 1MB base64 ≈ 750KB raw
        // For now, we'll track as Gemini API call (multimodal input)
        const usageMetadata = (result.response as any).usageMetadata;
        const promptText = prompt;
        await trackGeminiCost(
          'gemini-2.0-flash-exp',
          promptText,
          text,
          '', // organizationId not available here, will be tracked at session level
          undefined,
          usageMetadata
        );

        return text.trim();
      } catch (error) {
        // Fallback: If Gemini doesn't support audio directly, use OpenAI Whisper
        logger.warn('Gemini audio transcription not available, using fallback', {
          error: error instanceof Error ? error.message : String(error),
        });

        // Fallback to OpenAI Whisper if available
        if (process.env.OPENAI_API_KEY) {
          const transcribedText = await this.transcribeWithOpenAI(audioBuffer, format);

          // Track STT cost (estimate duration from audio size)
          // Rough estimate: audio duration ≈ buffer size / (sample rate * channels * bytes per sample)
          // For simplicity, estimate 1 minute per 1MB
          const estimatedMinutes = Math.max(0.1, audioBuffer.length / (1024 * 1024)); // At least 0.1 minutes
          // Note: organizationId not available here, will need to be passed or tracked at session level
          // For now, we'll skip tracking here and track at the session level in processVoiceInput

          return transcribedText;
        }

        throw new Error('Audio transcription not available');
      }
    } catch (error) {
      logger.error('Error transcribing audio', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fallback: Transcribe using OpenAI Whisper
   */
  private async transcribeWithOpenAI(audioBuffer: Buffer, format?: string): Promise<string> {
    try {
      const OpenAI = require('openai').default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // In Node.js, OpenAI SDK accepts File objects created from Buffer
      // We need to create a File-like object
      const { File } = require('buffer');

      const audioFile = new File([audioBuffer], 'audio.webm', {
        type: format === 'webm' ? 'audio/webm' : 'audio/wav',
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      });

      return transcription.text;
    } catch (error) {
      // If File from buffer doesn't work, try using fs to create a temporary file
      try {
        const fs = require('fs').promises;
        const path = require('path');
        const os = require('os');

        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `audio-${Date.now()}.webm`);

        await fs.writeFile(tempFile, audioBuffer);

        const OpenAI = require('openai').default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFile),
          model: 'whisper-1',
        });

        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});

        return transcription.text;
      } catch (fallbackError) {
        logger.error('Error transcribing with OpenAI', {
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
        throw new Error('Failed to transcribe audio');
      }
    }
  }

  /**
   * Convert text to speech
   * Note: Using OpenAI TTS for now, can be enhanced with Gemini Live API
   */
  private async textToSpeech(
    text: string,
    organizationId: string,
    learnerId?: string
  ): Promise<string> {
    try {
      // Use OpenAI TTS for voice output
      if (process.env.OPENAI_API_KEY) {
        const OpenAI = require('openai').default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'alloy',
          input: text,
        });

        // Track TTS cost (per 1,000 characters)
        const characterCount = text.length;
        await costTracker.trackVoiceUsage(
          'openai',
          'tts',
          characterCount,
          organizationId,
          learnerId
        );

        // Convert to base64
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer.toString('base64');
      }

      // Fallback: Return empty audio if TTS not available
      logger.warn('TTS not available, returning empty audio');
      return '';
    } catch (error) {
      logger.error('Error generating speech', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Start voice session
   * Prepares the session for voice mode
   */
  async startVoiceSession(sessionId: string): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          mode: 'voice',
          lastActivity: new Date(),
        },
      });

      logger.info('Voice session started', { sessionId });
    } catch (error) {
      logger.error('Error starting voice session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Stop voice session
   */
  async stopVoiceSession(sessionId: string): Promise<void> {
    try {
      // Optionally switch back to text mode or keep in voice mode
      // For now, we'll just update last activity
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          lastActivity: new Date(),
        },
      });

      logger.info('Voice session stopped', { sessionId });
    } catch (error) {
      logger.error('Error stopping voice session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      throw error;
    }
  }
}

// Singleton instance
export const voiceService = new VoiceService();
