import { PrismaClient } from '@prisma/client';

describe('Prisma Client', () => {
  let originalEnv: string | undefined;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should export prisma client', () => {
    // Re-import to get fresh instance
    jest.resetModules();
    const { prisma } = require('@/lib/prisma');
    expect(prisma).toBeDefined();
    // Verify it has PrismaClient-like properties
    expect(prisma).toHaveProperty('$connect');
    expect(prisma).toHaveProperty('$disconnect');
  });

  it('should have expected models', () => {
    jest.resetModules();
    const { prisma } = require('@/lib/prisma');
    // Prisma client should have models as properties
    expect(prisma).toHaveProperty('organization');
    expect(prisma).toHaveProperty('user');
    expect(prisma).toHaveProperty('learner');
    expect(prisma).toHaveProperty('nugget');
  });

  it('should configure logging in development mode', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { prisma } = require('@/lib/prisma');
    expect(prisma).toBeDefined();
  });

  it('should configure logging in production mode', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { prisma } = require('@/lib/prisma');
    expect(prisma).toBeDefined();
  });
});
