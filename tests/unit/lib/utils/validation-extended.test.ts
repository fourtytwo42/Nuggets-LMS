import { validateBody, validateQuery, emailSchema, passwordSchema } from '@/lib/utils/validation';
import { z } from 'zod';

describe('Validation Utilities Extended Tests', () => {
  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should validate valid data', () => {
      const result = validateBody(testSchema, { name: 'Test', age: 25 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test');
        expect(result.data.age).toBe(25);
      }
    });

    it('should reject invalid data', () => {
      const result = validateBody(testSchema, { name: 'Test' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
      }
    });

    it('should handle null data', () => {
      const result = validateBody(testSchema, null);
      expect(result.success).toBe(false);
    });
  });

  describe('validateQuery', () => {
    const testSchema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    it('should validate valid query params', () => {
      const result = validateQuery(testSchema, { page: '1', limit: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe('1');
      }
    });

    it('should handle empty query params', () => {
      const result = validateQuery(testSchema, {});
      expect(result.success).toBe(true);
    });

    it('should handle array query params', () => {
      // Zod will parse array as array, schema expects string, so this will fail
      // But we test that the function handles it gracefully
      const result = validateQuery(testSchema, { page: ['1', '2'] });
      // Array doesn't match string schema, so it will fail
      expect(result.success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('should validate valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should validate valid password', () => {
      const result = passwordSchema.safeParse('Password123!');
      expect(result.success).toBe(true);
    });

    it('should reject short password', () => {
      const result = passwordSchema.safeParse('Pass1!');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('PASSWORD123!');
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('password123!');
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('Password!');
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('Password123');
      expect(result.success).toBe(false);
    });
  });
});
