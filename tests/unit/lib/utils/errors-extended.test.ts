import { createErrorResponse, handleApiError } from '@/lib/utils/errors';
import { AuthenticationError, AuthorizationError } from '@/lib/auth/errors';

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(body),
      body,
    })),
  },
}));

describe('Error Utilities Extended Tests', () => {
  describe('createErrorResponse', () => {
    it('should create error response with details', () => {
      const response = createErrorResponse('Test error', { field: 'value' }, 400);
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
    });

    it('should create error response without details', () => {
      const response = createErrorResponse('Test error', undefined, 500);
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
    });

    it('should use default status code', () => {
      const response = createErrorResponse('Test error');
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
    });
  });

  describe('handleApiError', () => {
    it('should handle AuthenticationError', () => {
      const error = new AuthenticationError('Auth failed');
      const response = handleApiError(error);
      expect(response).toBeDefined();
      expect(response.status).toBe(401);
    });

    it('should handle AuthorizationError', () => {
      const error = new AuthorizationError('Not authorized');
      const response = handleApiError(error);
      expect(response).toBeDefined();
      expect(response.status).toBe(403);
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const response = handleApiError(error);
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const response = handleApiError(error);
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
    });

    it('should handle non-Error values', () => {
      const response = handleApiError('String error');
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
    });

    it('should handle null/undefined', () => {
      const response = handleApiError(null);
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
    });
  });
});
