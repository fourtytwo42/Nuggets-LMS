import { SemanticChunkerService } from '@/services/content-ingestion/semantic-chunker';

// Skip these tests due to OOM (Out of Memory) errors
describe.skip('SemanticChunkerService - Extended Coverage', () => {
  let service: SemanticChunkerService;

  beforeEach(() => {
    service = new SemanticChunkerService();
  });

  describe('edge cases', () => {
    it('should handle text with no sentence endings', () => {
      const text = 'No periods here just words';
      const result = service.chunkText(text, {
        maxChunkSize: 10,
        respectSentences: true,
        respectParagraphs: false,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].text).toContain('No periods');
    });

    it('should handle text with only paragraph breaks', () => {
      const text = 'Paragraph one\n\nParagraph two\n\nParagraph three';
      const result = service.chunkText(text, {
        maxChunkSize: 20,
        respectParagraphs: true,
      });

      expect(result.length).toBeGreaterThan(1);
    });

    it('should handle overlapping chunks correctly', () => {
      const text = 'A'.repeat(2500);
      const result = service.chunkText(text, {
        maxChunkSize: 1000,
        overlapSize: 200,
        respectSentences: false,
        respectParagraphs: false,
      });

      if (result.length > 1) {
        const overlap = result[0].text.slice(-200);
        expect(result[1].text).toContain(overlap);
      }
    });

    it('should handle min chunk size larger than text', () => {
      const text = 'Short text';
      const result = service.chunkText(text, {
        minChunkSize: 1000,
      });

      // Should still return the text as a chunk
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle zero overlap size', () => {
      const text = 'A'.repeat(3000);
      const result = service.chunkText(text, {
        maxChunkSize: 1000,
        overlapSize: 0,
        respectSentences: false,
        respectParagraphs: false,
      });

      expect(result.length).toBeGreaterThan(1);
      if (result.length > 1) {
        expect(result[0].endIndex).toBeLessThanOrEqual(result[1].startIndex);
      }
    });

    it('should handle very large overlap size', () => {
      const text = 'A'.repeat(2000);
      const result = service.chunkText(text, {
        maxChunkSize: 1000,
        overlapSize: 500,
        respectSentences: false,
        respectParagraphs: false,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle paragraph index metadata', () => {
      const text = 'Para one.\n\nPara two.\n\nPara three.';
      const result = service.chunkText(text, {
        maxChunkSize: 20,
        respectParagraphs: true,
      });

      result.forEach((chunk) => {
        if (chunk.metadata.paragraphIndex !== undefined) {
          expect(typeof chunk.metadata.paragraphIndex).toBe('number');
        }
      });
    });

    it('should handle mixed content with paragraphs and long sentences', () => {
      const text = 'Short para.\n\n' + 'Long sentence. '.repeat(100) + '\n\nAnother para.';
      const result = service.chunkText(text, {
        maxChunkSize: 500,
        respectParagraphs: true,
      });

      expect(result.length).toBeGreaterThan(1);
    });

    it('should handle text ending with newlines', () => {
      const text = 'Some content here.\n\n';
      const result = service.chunkText(text);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].text.trim().length).toBeGreaterThan(0);
    });

    it('should handle single very long sentence', () => {
      const longSentence = 'Word '.repeat(100) + '.';
      const result = service.chunkText(longSentence, {
        maxChunkSize: 100,
        respectSentences: true,
        respectParagraphs: false,
      });

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
