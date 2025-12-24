import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/admin/learners/:id
 * Get learner details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const learner = await prisma.learner.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sessions: {
          select: {
            id: true,
            startedAt: true,
            lastActivity: true,
            completedAt: true,
            mode: true,
          },
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        progress: {
          select: {
            concept: true,
            masteryLevel: true,
            evidence: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!learner) {
      return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
    }

    return NextResponse.json({ learner }, { status: 200 });
  } catch (error) {
    logger.error('Error getting learner details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
