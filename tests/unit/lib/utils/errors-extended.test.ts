import { createErrorResponse, handleApiError } from '@/lib/utils/errors';
import { AuthenticationError, AuthorizationError } from '@/lib/auth/errors';
import { NextResponse } from 'next/server';

describe('Error Utilities Extended Tests', () => {
  describe('createErrorResponse', () => {
    it('should create error response with details', () => {
      const response = createErrorResponse('Test error', { field: 'value' }, 400);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should create error response without details', () => {
      const response = createErrorResponse('Test error', undefined, 500);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should use default status code', () => {
      const response = createErrorResponse('Test error');
      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('handleApiError', () => {
    it('should handle AuthenticationError', () => {
      const error = new AuthenticationError('Auth failed');
      const response = handleApiError(error);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle AuthorizationError', () => {
      const error = new AuthorizationError('Not authorized');
      const response = handleApiError(error);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const response = handleApiError(error);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      const response = handleApiError(error);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle non-Error values', () => {
      const response = handleApiError('String error');
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle null/undefined', () => {
      const response = handleApiError(null);
      expect(response).toBeInstanceOf(NextResponse);
    });
  });
});
