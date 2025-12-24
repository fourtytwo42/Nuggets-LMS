import { validateBody, validateQuery } from '@/lib/utils/validation';
import { z } from 'zod';

describe('Validation utilities', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  describe('validateBody', () => {
    it('should validate valid body', () => {
      const body = { name: 'Test', age: 25 };
      const result = validateBody(testSchema, body);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test');
        expect(result.data.age).toBe(25);
      }
    });

    it('should reject invalid body', () => {
      const body = { name: 'Test' }; // Missing age
      const result = validateBody(testSchema, body);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.string().transform(Number),
      limit: z.string().optional(),
    });

    it('should validate valid query', () => {
      const query = { page: '1', limit: '10' };
      const result = validateQuery(querySchema, query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe('10');
      }
    });

    it('should reject invalid query', () => {
      const query = {}; // Missing page
      const result = validateQuery(querySchema, query);
      expect(result.success).toBe(false);
    });
  });
});
