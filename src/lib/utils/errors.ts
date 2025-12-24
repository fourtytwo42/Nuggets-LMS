/**
 * Utility functions for error handling
 */

import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  details?: unknown;
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(
  error: string,
  details?: unknown,
  status: number = 500
): NextResponse<ApiError> {
  const body: ApiError = { error };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Handle errors in API routes
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  if (error instanceof Error) {
    // Check for known error types
    if (error.name === 'AuthenticationError') {
      return createErrorResponse(error.message, undefined, 401);
    }
    if (error.name === 'AuthorizationError') {
      return createErrorResponse(error.message, undefined, 403);
    }
    if (error.name === 'ValidationError') {
      return createErrorResponse(error.message, undefined, 400);
    }
    return createErrorResponse(error.message, undefined, 500);
  }
  return createErrorResponse('Internal server error', undefined, 500);
}
