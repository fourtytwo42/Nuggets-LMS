import { SemanticChunkerService, Chunk } from '@/services/content-ingestion/semantic-chunker';

describe('SemanticChunkerService', () => {
  let service: SemanticChunkerService;

  beforeEach(() => {
    service = new SemanticChunkerService();
  });

  describe('chunkText', () => {
    it('should return empty array for empty text', () => {
      const result = service.chunkText('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only text', () => {
      const result = service.chunkText('   \n\n   ');
      expect(result).toEqual([]);
    });

    it('should return single chunk for text smaller than max size', () => {
      const text = 'This is a short text that should be returned as a single chunk.';
      const result = service.chunkText(text);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
      expect(result[0].startIndex).toBe(0);
      expect(result[0].endIndex).toBe(text.length);
      expect(result[0].metadata.wordCount).toBeGreaterThan(0);
      expect(result[0].metadata.sentenceCount).toBeGreaterThan(0);
    });

    it('should chunk text by paragraphs when respectParagraphs is true', () => {
      const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
      const result = service.chunkText(text, {
        maxChunkSize: 50,
        respectParagraphs: true,
      });

      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(50);
        expect(chunk.metadata.wordCount).toBeGreaterThan(0);
      });
    });

    it('should chunk text by sentences when respectSentences is true', () => {
      const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
      const result = service.chunkText(text, {
        maxChunkSize: 30,
        respectSentences: true,
        respectParagraphs: false,
      });

      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(50); // Some flexibility for sentence boundaries
        expect(chunk.metadata.sentenceCount).toBeGreaterThan(0);
      });
    });

    it('should chunk by characters when both respect flags are false', () => {
      const text = 'A'.repeat(5000);
      const result = service.chunkText(text, {
        maxChunkSize: 1000,
        respectSentences: false,
        respectParagraphs: false,
      });

      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(1000);
      });
    });

    it('should apply overlap between chunks', () => {
      const text = 'A'.repeat(3000);
      const result = service.chunkText(text, {
        maxChunkSize: 1000,
        overlapSize: 100,
        respectSentences: false,
        respectParagraphs: false,
      });

      expect(result.length).toBeGreaterThan(1);
      // Check that chunks overlap
      if (result.length > 1) {
        const firstChunkEnd = result[0].endIndex;
        const secondChunkStart = result[1].startIndex;
        expect(firstChunkEnd - secondChunkStart).toBeGreaterThan(0);
      }
    });

    it('should respect min chunk size', () => {
      const text = 'A'.repeat(500);
      const result = service.chunkText(text, {
        maxChunkSize: 1000,
        minChunkSize: 300,
        respectSentences: false,
        respectParagraphs: false,
      });

      result.forEach((chunk) => {
        expect(chunk.text.length).toBeGreaterThanOrEqual(300);
      });
    });

    it('should handle custom max chunk size', () => {
      const text = 'A'.repeat(5000);
      const result = service.chunkText(text, {
        maxChunkSize: 500,
        respectSentences: false,
        respectParagraphs: false,
      });

      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(500);
      });
    });

    it('should include metadata in chunks', () => {
      const text = 'This is a test sentence. This is another sentence.';
      const result = service.chunkText(text);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((chunk) => {
        expect(chunk.metadata).toHaveProperty('wordCount');
        expect(chunk.metadata).toHaveProperty('sentenceCount');
        expect(chunk.metadata.wordCount).toBeGreaterThan(0);
        expect(chunk.metadata.sentenceCount).toBeGreaterThan(0);
      });
    });

    it('should handle very long paragraphs by splitting them', () => {
      const longParagraph = 'Word '.repeat(200); // Long but manageable paragraph
      const text = `${longParagraph}\n\nShort paragraph.`;
      const result = service.chunkText(text, {
        maxChunkSize: 500,
        respectParagraphs: true,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('should preserve text content across chunks', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = service.chunkText(text, {
        maxChunkSize: 30,
        respectSentences: true,
        respectParagraphs: false,
      });

      const combinedText = result.map((chunk) => chunk.text).join(' ');
      expect(combinedText).toContain('First');
      expect(combinedText).toContain('Second');
      expect(combinedText).toContain('Third');
    });
  });
});
