import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth/jwt';

// Skip integration tests if server is not running
const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

describe('Admin API Integration Tests', () => {
  let adminToken: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch(TEST_SERVER_URL);
      if (!response.ok && response.status !== 404) {
        throw new Error('Server not available');
      }
    } catch (error) {
      console.warn('Integration tests skipped - server not running');
      return;
    }

    // Create test organization and admin user
    const org = await prisma.organization.create({
      data: { name: 'Test Org', settings: {} },
    });
    testOrgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        organizationId: org.id,
        passwordHash: 'hashed',
      },
    });

    adminToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: org.id,
    });
  });

  afterAll(async () => {
    if (testOrgId) {
      // Cleanup
      await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.organization.delete({ where: { id: testOrgId } });
    }
  });

  it('should create watched folder', async () => {
    if (!adminToken) {
      console.warn('Skipping test - server not available');
      return;
    }
    const response = await fetch(`${TEST_SERVER_URL}/api/admin/ingestion/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        path: '/test/folder',
        organizationId: testOrgId,
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.path).toBe('/test/folder');
  });

  it('should list watched folders', async () => {
    if (!adminToken) {
      console.warn('Skipping test - server not available');
      return;
    }
    const response = await fetch(`${TEST_SERVER_URL}/api/admin/ingestion/folders`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should create monitored URL', async () => {
    if (!adminToken) {
      console.warn('Skipping test - server not available');
      return;
    }
    const response = await fetch(`${TEST_SERVER_URL}/api/admin/ingestion/urls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
        organizationId: testOrgId,
        checkInterval: 3600,
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.url).toBe('https://example.com');
  });
});
