import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { progressTrackerService } from '@/services/learning-delivery/progress-tracker';
import logger from '@/lib/logger';

/**
 * GET /api/learning/sessions/:id/progress
 * Get learner progress for session
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can view progress' }, { status: 403 });
    }

    const { id: sessionId } = await params;

    // Get session
    const learner = await prisma.learner.findFirst({
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
      include: {
        sessionNodes: {
          select: { id: true, nodeId: true, visitedAt: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get learner progress
    const progress = await progressTrackerService.getProgress(learner.id);

    // Calculate session metrics
    const sessionDuration = session.completedAt
      ? Math.floor((session.completedAt.getTime() - session.startedAt.getTime()) / 1000)
      : Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000);

    const nuggetsViewed = session.sessionNodes.length;
    const pathHistory = (session.pathHistory as string[]) || [];

    // Format concepts with mastery levels
    const concepts = Object.entries(progress.masteryMap).map(([concept, masteryLevel]) => {
      // Get most recent progress record for this concept
      const recentProgress = progress.recentProgress.find((p) => p.concept === concept);

      return {
        concept,
        masteryLevel,
        lastUpdated: recentProgress?.timestamp || session.startedAt,
        evidence: recentProgress ? `Updated during session` : undefined,
      };
    });

    return NextResponse.json(
      {
        concepts,
        knowledgeGaps: progress.knowledgeGaps,
        pathHistory,
        sessionDuration,
        nuggetsViewed,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error getting session progress', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: (await params).id,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
