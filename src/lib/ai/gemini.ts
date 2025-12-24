import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '@/lib/logger';
import { costTracker } from '@/services/analytics/cost-tracker';

let geminiClient: GoogleGenerativeAI | null = null;

/**
 * Get or create Gemini client
 */
export function getGeminiClient(): GoogleGenerativeAI {
  if (geminiClient) {
    return geminiClient;
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
  }

  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}

/**
 * Generate embedding for text using Gemini Embeddings API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'text-embedding-004' });

    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    if (!embedding || embedding.length === 0) {
      throw new Error('Empty embedding returned from Gemini API');
    }

    return embedding;
  } catch (error) {
    logger.error('Error generating embedding', {
      error: error instanceof Error ? error.message : String(error),
      textLength: text.length,
    });
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'text-embedding-004' });

    const results = await Promise.all(texts.map((text) => model.embedContent(text)));

    // Track costs for embeddings (estimate tokens)
    const totalTextLength = texts.reduce((sum, text) => sum + text.length, 0);
    const estimatedTokens = Math.ceil(totalTextLength / 4); // Rough estimate: 1 token ≈ 4 chars

    // Track cost (embeddings are typically input-only, no output tokens)
    // Note: organizationId would need to be passed, but for embeddings it's often in background jobs
    // We'll track without organizationId for now, or pass it as a parameter if needed

    return results.map((result) => {
      const embedding = result.embedding.values;
      if (!embedding || embedding.length === 0) {
        throw new Error('Empty embedding returned from Gemini API');
      }
      return embedding;
    });
  } catch (error) {
    logger.error('Error generating embeddings batch', {
      error: error instanceof Error ? error.message : String(error),
      batchSize: texts.length,
    });
    throw error;
  }
}

/**
 * Estimate token count from text (rough approximation)
 * Gemini uses similar tokenization to GPT models: ~1 token per 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Track Gemini API call costs
 * Extracts token usage from response if available, otherwise estimates
 */
export async function trackGeminiCost(
  model: string,
  prompt: string,
  responseText: string,
  organizationId: string,
  learnerId?: string,
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
): Promise<void> {
  try {
    let inputTokens = usageMetadata?.promptTokenCount || estimateTokens(prompt);
    let outputTokens = usageMetadata?.candidatesTokenCount || estimateTokens(responseText);

    // Determine provider and model key
    const provider = 'google';
    const modelKey = model.includes('embedding') ? 'gemini-embedding' : model;

    await costTracker.trackAICall(
      provider,
      modelKey,
      'generateContent',
      inputTokens,
      outputTokens,
      organizationId,
      learnerId
    );
  } catch (error) {
    // Don't throw - cost tracking failure shouldn't break the main flow
    logger.warn('Error tracking Gemini cost', {
      error: error instanceof Error ? error.message : String(error),
      model,
    });
  }
}
