import { createErrorResponse, handleApiError } from '@/lib/utils/errors';
import { AuthenticationError, AuthorizationError } from '@/lib/auth/errors';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
    })),
  },
}));

describe('Error utilities', () => {
  describe('createErrorResponse', () => {
    it('should create error response with message', async () => {
      const response = createErrorResponse('Test error', undefined, 400);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Test error');
    });

    it('should include details when provided', async () => {
      const details = { field: 'email', reason: 'invalid' };
      const response = createErrorResponse('Validation error', details, 400);
      const data = await response.json();
      expect(data.details).toEqual(details);
    });
  });

  describe('handleApiError', () => {
    it('should handle AuthenticationError', async () => {
      const error = new AuthenticationError('Unauthorized');
      const response = handleApiError(error);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle AuthorizationError', async () => {
      const error = new AuthorizationError('Forbidden');
      const response = handleApiError(error);
      expect(response.status).toBe(403);
    });

    it('should handle generic Error', async () => {
      const error = new Error('Generic error');
      const response = handleApiError(error);
      expect(response.status).toBe(500);
    });

    it('should handle unknown errors', async () => {
      const response = handleApiError('string error');
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});
