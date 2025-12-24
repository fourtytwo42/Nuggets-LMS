import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * Pricing configuration for different AI services
 * Prices are per 1M tokens unless otherwise specified
 */
const PRICING = {
  // OpenAI GPT models
  'openai-gpt-5.1-mini': { input: 0.25, output: 2.0 },
  'openai-gpt-5.1-nano': { input: 0.05, output: 0.4 },
  'openai-text-embedding-3-small': { input: 0.02, output: 0 },
  // GPT Image - token-based pricing (need to verify from OpenAI pricing page)
  'openai-gpt-image-1-mini-text': { input: 0.0, output: 0.0 }, // Text tokens for prompts
  'openai-gpt-image-1-mini-image': { input: 0.0, output: 0.0 }, // Image tokens (need to verify)
  // OpenAI TTS
  'openai-tts-1': { perThousandChars: 0.015 },
  'openai-tts-1-hd': { perThousandChars: 0.03 },
  // OpenAI Whisper (STT)
  'openai-whisper': { perMinute: 0.006 },
  // Gemini models (need to verify current pricing)
  'google-gemini-3-pro': { input: 0.0, output: 0.0 }, // Placeholder - need to verify
  'google-gemini-3-flash': { input: 0.0, output: 0.0 }, // Placeholder - need to verify
  'google-gemini-embedding': { input: 0.0, output: 0.0 }, // Placeholder - need to verify
} as const;

/**
 * Cost tracking service for AI API usage
 */
export class CostTracker {
  /**
   * Track AI API call costs
   */
  async trackAICall(
    provider: string,
    model: string,
    endpoint: string,
    inputTokens: number,
    outputTokens: number,
    organizationId: string,
    learnerId?: string
  ): Promise<void> {
    try {
      const cost = this.calculateCost(provider, model, inputTokens, outputTokens);

      await prisma.analytics.create({
        data: {
          organizationId,
          learnerId: learnerId || null,
          eventType: 'ai_api_call',
          eventData: {
            provider,
            model,
            endpoint,
            inputTokens,
            outputTokens,
            inputCost: cost.input,
            outputCost: cost.output,
            totalCost: cost.total,
          },
        },
      });

      logger.debug('Tracked AI API call cost', {
        provider,
        model,
        organizationId,
        cost: cost.total,
      });
    } catch (error) {
      logger.error('Error tracking AI API call cost', {
        error: error instanceof Error ? error.message : String(error),
        provider,
        model,
        organizationId,
      });
      // Don't throw - cost tracking failure shouldn't break the main flow
    }
  }

  /**
   * Track voice API usage (TTS/STT)
   */
  async trackVoiceUsage(
    provider: string,
    type: 'tts' | 'stt',
    durationOrChars: number,
    organizationId: string,
    learnerId?: string
  ): Promise<void> {
    try {
      const cost = this.calculateVoiceCost(provider, type, durationOrChars);

      await prisma.analytics.create({
        data: {
          organizationId,
          learnerId: learnerId || null,
          eventType: 'voice_api_call',
          eventData: {
            provider,
            type,
            durationOrChars,
            cost,
          },
        },
      });

      logger.debug('Tracked voice API usage cost', {
        provider,
        type,
        organizationId,
        cost,
      });
    } catch (error) {
      logger.error('Error tracking voice API usage cost', {
        error: error instanceof Error ? error.message : String(error),
        provider,
        type,
        organizationId,
      });
      // Don't throw - cost tracking failure shouldn't break the main flow
    }
  }

  /**
   * Track GPT Image generation (token-based)
   */
  async trackImageGeneration(
    model: string,
    quality: string,
    size: string,
    promptTokens: number,
    imageTokens: number,
    organizationId: string,
    learnerId?: string
  ): Promise<void> {
    try {
      const cost = this.calculateImageCost(quality, size, promptTokens, imageTokens);

      await prisma.analytics.create({
        data: {
          organizationId,
          learnerId: learnerId || null,
          eventType: 'image_generation',
          eventData: {
            model,
            quality,
            size,
            promptTokens,
            imageTokens,
            totalCost: cost,
          },
        },
      });

      logger.debug('Tracked image generation cost', {
        model,
        organizationId,
        cost,
      });
    } catch (error) {
      logger.error('Error tracking image generation cost', {
        error: error instanceof Error ? error.message : String(error),
        model,
        organizationId,
      });
      // Don't throw - cost tracking failure shouldn't break the main flow
    }
  }

  /**
   * Calculate cost for AI API call
   */
  private calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): { input: number; output: number; total: number } {
    const key = `${provider}-${model}` as keyof typeof PRICING;
    const pricing = PRICING[key];

    if (!pricing || typeof pricing !== 'object' || !('input' in pricing)) {
      logger.warn('Unknown pricing for model', { provider, model });
      return { input: 0, output: 0, total: 0 };
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
    };
  }

  /**
   * Calculate cost for voice API usage
   */
  private calculateVoiceCost(
    provider: string,
    type: 'tts' | 'stt',
    durationOrChars: number
  ): number {
    if (provider === 'openai') {
      if (type === 'tts') {
        // TTS is per 1,000 characters
        const model = 'openai-tts-1'; // Default to standard, can be passed as parameter if needed
        const pricing = PRICING[model];
        if (pricing && 'perThousandChars' in pricing) {
          return (durationOrChars / 1_000) * pricing.perThousandChars;
        }
      } else if (type === 'stt') {
        // STT is per minute
        const pricing = PRICING['openai-whisper'];
        if (pricing && 'perMinute' in pricing) {
          return durationOrChars * pricing.perMinute; // durationOrChars is minutes for STT
        }
      }
    }

    logger.warn('Unknown voice pricing', { provider, type });
    return 0;
  }

  /**
   * Calculate cost for GPT Image generation
   * Note: Need to verify actual pricing from OpenAI pricing page
   */
  private calculateImageCost(
    quality: string,
    size: string,
    promptTokens: number,
    imageTokens: number
  ): number {
    // TODO: Update with actual GPT Image pricing from OpenAI pricing page
    // For now, using placeholder pricing
    // Text tokens for prompt (same as GPT models)
    const textTokenPrice = PRICING['openai-gpt-5.1-mini'].input; // Use GPT-5.1 Mini pricing as estimate
    const textCost = (promptTokens / 1_000_000) * textTokenPrice;

    // Image tokens (need to verify actual pricing)
    // Placeholder: assuming similar to output tokens
    const imageTokenPrice = PRICING['openai-gpt-5.1-mini'].output; // Use GPT-5.1 Mini output pricing as estimate
    const imageCost = (imageTokens / 1_000_000) * imageTokenPrice;

    return textCost + imageCost;
  }

  /**
   * Get cost report for an organization
   */
  async getCostReport(
    organizationId: string,
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<{
    total: number;
    byService: Record<string, number>;
    byModel: Record<string, number>;
  }> {
    const startDate = this.getPeriodStart(period);

    const costEvents = await prisma.analytics.findMany({
      where: {
        organizationId,
        eventType: { in: ['ai_api_call', 'voice_api_call', 'image_generation'] },
        timestamp: { gte: startDate },
      },
    });

    let total = 0;
    const byService: Record<string, number> = {
      ai: 0,
      voice: 0,
      images: 0,
    };
    const byModel: Record<string, number> = {};

    for (const event of costEvents) {
      const eventData = event.eventData as any;
      const cost = eventData.totalCost || eventData.cost || 0;
      total += cost;

      if (event.eventType === 'ai_api_call') {
        byService.ai += cost;
        const model = eventData.model || 'unknown';
        byModel[model] = (byModel[model] || 0) + cost;
      } else if (event.eventType === 'voice_api_call') {
        byService.voice += cost;
        const provider = eventData.provider || 'unknown';
        byModel[`${provider}-${eventData.type}`] =
          (byModel[`${provider}-${eventData.type}`] || 0) + cost;
      } else if (event.eventType === 'image_generation') {
        byService.images += cost;
        const model = eventData.model || 'unknown';
        byModel[model] = (byModel[model] || 0) + cost;
      }
    }

    return {
      total,
      byService,
      byModel,
    };
  }

  /**
   * Get period start date
   */
  private getPeriodStart(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    const start = new Date(now);

    if (period === 'day') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    return start;
  }

  /**
   * Check usage limits and send alerts if needed
   * TODO: Implement limit checking based on organization settings
   */
  async checkLimits(organizationId: string): Promise<void> {
    // TODO: Implement limit checking
    // This would check organization usage limits and send alerts
    // For now, just a placeholder
    logger.debug('Checking usage limits', { organizationId });
  }
}

// Singleton instance
export const costTracker = new CostTracker();
