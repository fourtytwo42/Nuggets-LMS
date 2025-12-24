import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth/jwt';
import { SettingsService } from '@/services/admin/settings-service';

// Skip integration tests if server is not running
const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

describe('Admin Settings API Integration Tests', () => {
  let adminToken: string;
  let learnerToken: string;
  let testOrgId: string;
  let adminUserId: string;

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

    // Create test organization
    const org = await prisma.organization.create({
      data: { name: 'Test Settings Org', settings: {} },
    });
    testOrgId = org.id;

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-settings@test.com',
        name: 'Admin User',
        role: 'admin',
        organizationId: org.id,
        passwordHash: 'hashed',
      },
    });
    adminUserId = adminUser.id;
    adminToken = generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      organizationId: org.id,
    });

    // Create learner user (for authorization test)
    const learnerUser = await prisma.user.create({
      data: {
        email: 'learner-settings@test.com',
        name: 'Learner User',
        role: 'learner',
        organizationId: org.id,
        passwordHash: 'hashed',
      },
    });

    learnerToken = generateToken({
      userId: learnerUser.id,
      email: learnerUser.email,
      role: learnerUser.role,
      organizationId: org.id,
    });
  });

  afterAll(async () => {
    if (testOrgId) {
      // Cleanup
      await prisma.systemSetting.deleteMany({});
      await prisma.voiceConfig.deleteMany({});
      await prisma.aIModelConfig.deleteMany({});
      await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.organization.delete({ where: { id: testOrgId } });
    }
  });

  describe('GET /api/admin/settings', () => {
    it('should get default settings for admin', async () => {
      if (!adminToken) {
        console.warn('Skipping test - server not available');
        return;
      }

      const response = await fetch(`${TEST_SERVER_URL}/api/admin/settings`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify structure
      expect(data).toHaveProperty('voice');
      expect(data).toHaveProperty('aiModels');
      expect(data).toHaveProperty('contentProcessing');
    });

    it('should reject non-admin users', async () => {
      if (!learnerToken) {
        console.warn('Skipping test - server not available');
        return;
      }

      const response = await fetch(`${TEST_SERVER_URL}/api/admin/settings`, {
        headers: {
          Authorization: `Bearer ${learnerToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/admin/settings', () => {
    it('should update voice settings', async () => {
      if (!adminToken) {
        console.warn('Skipping test - server not available');
        return;
      }

      const updateData = {
        voice: {
          ttsProvider: 'openai-hd',
          qualityTier: 'mid',
        },
      };

      const response = await fetch(`${TEST_SERVER_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('settings');
      expect(data.settings.voice.ttsProvider).toBe('openai-hd');
    });
  });
});
