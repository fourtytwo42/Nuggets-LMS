/**
 * Integration tests for POST /api/learning/sessions/:id/choices
 * Note: These tests require the server to be running (use fetch)
 */
describe('POST /api/learning/sessions/:id/choices', () => {
  const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

  // Skip if server not running
  beforeAll(async () => {
    try {
      const response = await fetch(TEST_SERVER_URL);
      if (!response.ok && response.status !== 404) {
        throw new Error('Server not available');
      }
    } catch (error) {
      console.warn('Integration tests skipped - server not running');
      return;
    }
  });

  it('should return 401 if not authenticated', async () => {
    const response = await fetch(`${TEST_SERVER_URL}/api/learning/sessions/session-id/choices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ choiceId: 'choice-id' }),
    });

    expect(response.status).toBe(401);
  });

  // Additional tests would require creating test sessions, learners, and tokens
  // This is a basic smoke test to ensure the endpoint exists
});
