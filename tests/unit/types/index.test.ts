import type {
  UserRole,
  SessionMode,
  NuggetStatus,
  IngestionJobStatus,
  IngestionJobType,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

describe('Type Definitions', () => {
  it('should have correct UserRole type', () => {
    const roles: UserRole[] = ['admin', 'instructor', 'learner'];
    expect(roles).toHaveLength(3);
  });

  it('should have correct SessionMode type', () => {
    const modes: SessionMode[] = ['text', 'voice'];
    expect(modes).toHaveLength(2);
  });

  it('should have correct NuggetStatus type', () => {
    const statuses: NuggetStatus[] = ['pending', 'processing', 'ready', 'failed'];
    expect(statuses).toHaveLength(4);
  });

  it('should have correct IngestionJobStatus type', () => {
    const statuses: IngestionJobStatus[] = ['pending', 'processing', 'completed', 'failed'];
    expect(statuses).toHaveLength(4);
  });

  it('should have correct IngestionJobType type', () => {
    const types: IngestionJobType[] = ['file', 'url'];
    expect(types).toHaveLength(2);
  });

  it('should have correct ApiResponse structure', () => {
    const response: ApiResponse<string> = {
      data: 'test',
    };
    expect(response.data).toBe('test');
  });

  it('should have correct PaginatedResponse structure', () => {
    const response: PaginatedResponse<string> = {
      data: ['item1', 'item2'],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      },
    };
    expect(response.data).toHaveLength(2);
    expect(response.pagination.total).toBe(2);
  });
});
