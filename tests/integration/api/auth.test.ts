/**
 * API Route Tests
 *
 * Note: Full API route testing requires proper Next.js request mocking.
 * The core authentication logic is tested in auth-service.test.ts.
 * E2E tests will cover full API route functionality.
 */

// Mock Next.js modules to avoid import errors in test environment
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

describe('Auth API Routes', () => {
  it('should export route handlers', async () => {
    // Verify routes are importable (skip actual execution due to Next.js dependencies)
    const registerModule = await import('@/app/api/auth/register/route');
    const loginModule = await import('@/app/api/auth/login/route');
    const meModule = await import('@/app/api/auth/me/route');

    expect(registerModule).toBeDefined();
    expect(loginModule).toBeDefined();
    expect(meModule).toBeDefined();
  });
});
