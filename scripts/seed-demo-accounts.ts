/**
 * Seed script to create demo accounts
 * Run with: npx tsx scripts/seed-demo-accounts.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/auth/password';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo accounts...');

  // Create demo organization
  let demoOrg = await prisma.organization.findFirst({
    where: { name: 'Demo Organization' },
  });

  if (!demoOrg) {
    demoOrg = await prisma.organization.create({
      data: {
        name: 'Demo Organization',
        settings: {},
      },
    });
    console.log('Created demo organization');
  } else {
    console.log('Demo organization already exists');
  }

  // Create demo learner account
  const learnerEmail = 'learner@demo.com';
  const learnerPassword = await hashPassword('demo123');

  let learnerUser = await prisma.user.findUnique({
    where: { email: learnerEmail },
  });

  if (!learnerUser) {
    learnerUser = await prisma.user.create({
      data: {
        email: learnerEmail,
        name: 'Demo Learner',
        passwordHash: learnerPassword,
        role: 'learner',
        organizationId: demoOrg.id,
      },
    });

    await prisma.learner.create({
      data: {
        userId: learnerUser.id,
        organizationId: demoOrg.id,
        masteryMap: {},
        profile: {},
      },
    });

    console.log('Created demo learner account:', learnerEmail);
  } else {
    console.log('Demo learner account already exists:', learnerEmail);
  }

  // Create demo admin account
  const adminEmail = 'admin@demo.com';
  const adminPassword = await hashPassword('demo123');

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Demo Admin',
        passwordHash: adminPassword,
        role: 'admin',
        organizationId: demoOrg.id,
      },
    });

    console.log('Created demo admin account:', adminEmail);
  } else {
    console.log('Demo admin account already exists:', adminEmail);
  }

  console.log('\nDemo accounts ready:');
  console.log('  Learner: learner@demo.com / demo123');
  console.log('  Admin:   admin@demo.com / demo123');
}

main()
  .catch((e) => {
    console.error('Error seeding demo accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
