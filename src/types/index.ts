/**
 * Common TypeScript types
 */

export type UserRole = 'admin' | 'instructor' | 'learner';

export type SessionMode = 'text' | 'voice';

export type NuggetStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type IngestionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type IngestionJobType = 'file' | 'url';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
