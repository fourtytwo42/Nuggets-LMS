import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { sessionService } from '@/services/learning-delivery/session-service';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/learning/sessions/:id/complete
 * Mark session as complete
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can complete sessions' }, { status: 403 });
    }

    const { id: sessionId } = await params;

    // Verify session ownership
    const learner = await prisma.learner.findUnique({
      where: { userId: user.id },
    });

    if (!learner) {
      return NextResponse.json({ error: 'Learner profile not found' }, { status: 404 });
    }

    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        learnerId: learner.id,
        organizationId: user.organizationId,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.completedAt) {
      return NextResponse.json({ error: 'Session already completed' }, { status: 400 });
    }

    // Complete session
    await sessionService.completeSession(sessionId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error completing session', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
