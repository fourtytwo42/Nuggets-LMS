import logger from '@/lib/logger';

export interface Chunk {
  text: string;
  startIndex: number;
  endIndex: number;
  metadata: {
    wordCount: number;
    sentenceCount: number;
    paragraphIndex?: number;
  };
}

export interface ChunkingOptions {
  maxChunkSize?: number; // Maximum characters per chunk (default: 2000)
  minChunkSize?: number; // Minimum characters per chunk (default: 200)
  overlapSize?: number; // Characters to overlap between chunks (default: 100)
  respectSentences?: boolean; // Don't split in middle of sentences (default: true)
  respectParagraphs?: boolean; // Prefer paragraph boundaries (default: true)
}

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  maxChunkSize: 2000,
  minChunkSize: 200,
  overlapSize: 100,
  respectSentences: true,
  respectParagraphs: true,
};

/**
 * Semantic chunking service for splitting content into learning nuggets
 */
export class SemanticChunkerService {
  /**
   * Chunk text into semantically meaningful pieces
   */
  chunkText(text: string, options: ChunkingOptions = {}): Chunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!text || text.trim().length === 0) {
      logger.warn('Empty text provided for chunking');
      return [];
    }

    // If text is smaller than max chunk size, return as single chunk
    if (text.length <= opts.maxChunkSize) {
      return [
        {
          text: text.trim(),
          startIndex: 0,
          endIndex: text.length,
          metadata: {
            wordCount: this.countWords(text),
            sentenceCount: this.countSentences(text),
          },
        },
      ];
    }

    // Split by paragraphs first if respectParagraphs is true
    if (opts.respectParagraphs) {
      return this.chunkByParagraphs(text, opts);
    }

    // Otherwise, chunk by sentences
    if (opts.respectSentences) {
      return this.chunkBySentences(text, opts);
    }

    // Fallback to simple character-based chunking
    return this.chunkByCharacters(text, opts);
  }

  /**
   * Chunk text respecting paragraph boundaries
   */
  private chunkByParagraphs(text: string, options: Required<ChunkingOptions>): Chunk[] {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let startIndex = 0;
    let paragraphIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

      // If adding this paragraph would exceed max size, finalize current chunk
      if (
        potentialChunk.length > options.maxChunkSize &&
        currentChunk.length >= options.minChunkSize
      ) {
        const endIndex = startIndex + currentChunk.length;
        chunks.push({
          text: currentChunk,
          startIndex,
          endIndex,
          metadata: {
            wordCount: this.countWords(currentChunk),
            sentenceCount: this.countSentences(currentChunk),
            paragraphIndex: paragraphIndex - 1,
          },
        });

        // Start new chunk with overlap if enabled
        if (options.overlapSize > 0 && currentChunk.length > options.overlapSize) {
          const overlap = currentChunk.slice(-options.overlapSize);
          currentChunk = `${overlap}\n\n${paragraph}`;
          startIndex = endIndex - options.overlapSize;
        } else {
          currentChunk = paragraph;
          startIndex = endIndex;
        }
        paragraphIndex = i;
      } else {
        currentChunk = potentialChunk;
      }

      // If paragraph itself is too large, split it by sentences
      if (paragraph.length > options.maxChunkSize) {
        const subChunks = this.chunkBySentences(paragraph, options);
        for (const subChunk of subChunks) {
          if (
            currentChunk.length + subChunk.text.length > options.maxChunkSize &&
            currentChunk.length >= options.minChunkSize
          ) {
            const endIndex = startIndex + currentChunk.length;
            chunks.push({
              text: currentChunk,
              startIndex,
              endIndex,
              metadata: {
                wordCount: this.countWords(currentChunk),
                sentenceCount: this.countSentences(currentChunk),
                paragraphIndex: paragraphIndex - 1,
              },
            });
            currentChunk = subChunk.text;
            startIndex = endIndex;
          } else {
            currentChunk = currentChunk ? `${currentChunk}\n\n${subChunk.text}` : subChunk.text;
          }
        }
      }
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      const endIndex = startIndex + currentChunk.length;
      chunks.push({
        text: currentChunk.trim(),
        startIndex,
        endIndex,
        metadata: {
          wordCount: this.countWords(currentChunk),
          sentenceCount: this.countSentences(currentChunk),
          paragraphIndex,
        },
      });
    }

    return chunks;
  }

  /**
   * Chunk text respecting sentence boundaries
   */
  private chunkBySentences(text: string, options: Required<ChunkingOptions>): Chunk[] {
    // Split by sentence endings (., !, ? followed by space or newline)
    const sentences = text.split(/([.!?]\s+)/).filter((s) => s.trim().length > 0);
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let startIndex = 0;

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;

      // If adding this sentence would exceed max size, finalize current chunk
      if (
        potentialChunk.length > options.maxChunkSize &&
        currentChunk.length >= options.minChunkSize
      ) {
        const endIndex = startIndex + currentChunk.length;
        chunks.push({
          text: currentChunk.trim(),
          startIndex,
          endIndex,
          metadata: {
            wordCount: this.countWords(currentChunk),
            sentenceCount: this.countSentences(currentChunk),
          },
        });

        // Start new chunk with overlap if enabled
        if (options.overlapSize > 0 && currentChunk.length > options.overlapSize) {
          const overlap = currentChunk.slice(-options.overlapSize);
          currentChunk = `${overlap} ${sentence}`;
          startIndex = endIndex - options.overlapSize;
        } else {
          currentChunk = sentence;
          startIndex = endIndex;
        }
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      const endIndex = startIndex + currentChunk.length;
      chunks.push({
        text: currentChunk.trim(),
        startIndex,
        endIndex,
        metadata: {
          wordCount: this.countWords(currentChunk),
          sentenceCount: this.countSentences(currentChunk),
        },
      });
    }

    return chunks;
  }

  /**
   * Simple character-based chunking (fallback)
   */
  private chunkByCharacters(text: string, options: Required<ChunkingOptions>): Chunk[] {
    const chunks: Chunk[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + options.maxChunkSize, text.length);
      const chunkText = text.slice(startIndex, endIndex).trim();

      if (chunkText.length >= options.minChunkSize || endIndex >= text.length) {
        chunks.push({
          text: chunkText,
          startIndex,
          endIndex,
          metadata: {
            wordCount: this.countWords(chunkText),
            sentenceCount: this.countSentences(chunkText),
          },
        });

        // Move start index with overlap
        startIndex = endIndex - options.overlapSize;
        if (startIndex < 0) startIndex = endIndex;
      } else {
        // Chunk too small, extend to next boundary
        startIndex = endIndex;
      }
    }

    return chunks;
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
}

// Singleton instance
export const semanticChunkerService = new SemanticChunkerService();
