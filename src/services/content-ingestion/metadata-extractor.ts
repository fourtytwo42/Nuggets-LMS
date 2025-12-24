import logger from '@/lib/logger';

export interface ExtractedMetadata {
  topics: string[];
  difficulty: number; // 1-10 scale
  prerequisites: string[];
  estimatedTime: number; // minutes
  relatedConcepts: string[];
}

/**
 * Metadata extraction service
 * Extracts metadata from content chunks for nugget creation
 */
export class MetadataExtractorService {
  /**
   * Extract metadata from text content
   * This is a simple implementation - can be enhanced with AI in the future
   */
  extractMetadata(text: string): ExtractedMetadata {
    try {
      const wordCount = this.countWords(text);
      const sentenceCount = this.countSentences(text);
      const paragraphCount = this.countParagraphs(text);

      // Estimate difficulty based on text characteristics
      const difficulty = this.estimateDifficulty(text, wordCount, sentenceCount);

      // Estimate reading time (average 200 words per minute)
      const estimatedTime = Math.ceil(wordCount / 200);

      // Extract topics (simple keyword extraction)
      const topics = this.extractTopics(text);

      // Extract related concepts (similar to topics for now)
      const relatedConcepts = this.extractRelatedConcepts(text, topics);

      // Prerequisites are empty by default (can be enhanced with AI)
      const prerequisites: string[] = [];

      return {
        topics,
        difficulty,
        prerequisites,
        estimatedTime,
        relatedConcepts,
      };
    } catch (error) {
      logger.error('Error extracting metadata', {
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length,
      });
      // Return default metadata on error
      return {
        topics: [],
        difficulty: 5,
        prerequisites: [],
        estimatedTime: 5,
        relatedConcepts: [],
      };
    }
  }

  /**
   * Estimate difficulty (1-10 scale) based on text characteristics
   */
  private estimateDifficulty(text: string, wordCount: number, sentenceCount: number): number {
    // Average words per sentence
    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);

    // Count complex words (3+ syllables or technical terms)
    const complexWords = this.countComplexWords(text);
    const complexWordRatio = complexWords / Math.max(wordCount, 1);

    // Base difficulty on:
    // - Average sentence length (longer = harder)
    // - Complex word ratio (more complex words = harder)
    // - Technical terms (presence of technical terms = harder)

    let difficulty = 5; // Base difficulty

    // Adjust based on sentence length
    if (avgWordsPerSentence > 20) difficulty += 1;
    if (avgWordsPerSentence > 30) difficulty += 1;
    if (avgWordsPerSentence < 10) difficulty -= 1;

    // Adjust based on complex words
    if (complexWordRatio > 0.2) difficulty += 1;
    if (complexWordRatio > 0.3) difficulty += 1;
    if (complexWordRatio < 0.1) difficulty -= 1;

    // Clamp to 1-10 range
    return Math.max(1, Math.min(10, Math.round(difficulty)));
  }

  /**
   * Count complex words (simplified heuristic)
   */
  private countComplexWords(text: string): number {
    // Simple heuristic: words with 3+ syllables or technical patterns
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;

    for (const word of words) {
      // Count syllables (simplified)
      const syllables = this.countSyllables(word);
      if (syllables >= 3) {
        count++;
      }
      // Technical patterns (words with common technical suffixes)
      if (
        word.endsWith('tion') ||
        word.endsWith('sion') ||
        word.endsWith('ity') ||
        word.endsWith('ment') ||
        word.endsWith('ness')
      ) {
        count++;
      }
    }

    return count;
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    // Remove silent 'e' at end
    word = word.replace(/e$/, '');

    // Count vowel groups
    const matches = word.match(/[aeiouy]+/g);
    return matches ? matches.length : 1;
  }

  /**
   * Extract topics from text (simple keyword extraction)
   */
  private extractTopics(text: string): string[] {
    // Extract capitalized words and phrases (likely proper nouns/topics)
    const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

    // Extract common topic indicators
    const topicPatterns = [
      /\b(?:topic|subject|concept|theme|idea|principle|theory|method|technique|approach)\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /\b(?:about|regarding|concerning)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    ];

    const topics = new Set<string>();

    // Add capitalized phrases
    capitalized.forEach((phrase) => {
      if (phrase.length > 2 && phrase.length < 50) {
        topics.add(phrase);
      }
    });

    // Extract from patterns
    topicPatterns.forEach((pattern) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          topics.add(match[1]);
        }
      }
    });

    // Limit to top 10 topics
    return Array.from(topics).slice(0, 10);
  }

  /**
   * Extract related concepts
   */
  private extractRelatedConcepts(text: string, topics: string[]): string[] {
    // For now, return a subset of topics as related concepts
    // Can be enhanced with AI or semantic analysis
    return topics.slice(0, 5);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Count sentences in text
   */
  private countSentences(text: string): number {
    return text.split(/[.!?]+\s+/).filter((s) => s.trim().length > 0).length;
  }

  /**
   * Count paragraphs in text
   */
  private countParagraphs(text: string): number {
    return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  }
}

// Singleton instance
export const metadataExtractorService = new MetadataExtractorService();
