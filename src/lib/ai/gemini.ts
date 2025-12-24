import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '@/lib/logger';

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
