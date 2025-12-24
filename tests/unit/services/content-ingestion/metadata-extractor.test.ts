import { MetadataExtractorService } from '@/services/content-ingestion/metadata-extractor';

// Mock logger
jest.mock('@/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('MetadataExtractorService', () => {
  let service: MetadataExtractorService;

  beforeEach(() => {
    service = new MetadataExtractorService();
  });

  describe('extractMetadata', () => {
    it('should extract metadata from text', () => {
      const text =
        'This is a test sentence about Machine Learning. Machine Learning is a topic of Artificial Intelligence.';
      const result = service.extractMetadata(text);

      expect(result).toHaveProperty('topics');
      expect(result).toHaveProperty('difficulty');
      expect(result).toHaveProperty('prerequisites');
      expect(result).toHaveProperty('estimatedTime');
      expect(result).toHaveProperty('relatedConcepts');

      expect(Array.isArray(result.topics)).toBe(true);
      expect(typeof result.difficulty).toBe('number');
      expect(result.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.difficulty).toBeLessThanOrEqual(10);
      expect(Array.isArray(result.prerequisites)).toBe(true);
      expect(typeof result.estimatedTime).toBe('number');
      expect(result.estimatedTime).toBeGreaterThan(0);
      expect(Array.isArray(result.relatedConcepts)).toBe(true);
    });

    it('should return default metadata on error', () => {
      // Force error by passing invalid input
      const result = service.extractMetadata('');

      expect(result).toHaveProperty('topics');
      expect(result).toHaveProperty('difficulty');
      expect(result).toHaveProperty('prerequisites');
      expect(result).toHaveProperty('estimatedTime');
      expect(result).toHaveProperty('relatedConcepts');
      expect(Array.isArray(result.topics)).toBe(true);
      expect(Array.isArray(result.prerequisites)).toBe(true);
      expect(Array.isArray(result.relatedConcepts)).toBe(true);
    });

    it('should extract topics from capitalized words', () => {
      const text = 'This is about Python Programming and Data Science.';
      const result = service.extractMetadata(text);

      expect(result.topics.length).toBeGreaterThan(0);
    });

    it('should estimate difficulty based on text complexity', () => {
      const simpleText = 'This is simple. Easy to read.';
      const complexText =
        'The implementation of sophisticated algorithmic methodologies requires comprehensive understanding of computational complexity theory and advanced mathematical principles.';

      const simpleResult = service.extractMetadata(simpleText);
      const complexResult = service.extractMetadata(complexText);

      expect(complexResult.difficulty).toBeGreaterThanOrEqual(simpleResult.difficulty);
    });

    it('should estimate reading time', () => {
      const shortText = 'Short text.';
      const longText = 'Word '.repeat(500);

      const shortResult = service.extractMetadata(shortText);
      const longResult = service.extractMetadata(longText);

      expect(longResult.estimatedTime).toBeGreaterThan(shortResult.estimatedTime);
    });
  });
});
