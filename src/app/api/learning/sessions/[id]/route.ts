import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { sessionService } from '@/services/learning-delivery/session-service';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * PATCH /api/learning/sessions/:id
 * Update session (e.g., mode)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can update sessions' }, { status: 403 });
    }

    const { id: sessionId } = await params;
    const bodyData = await request.json();
    const { mode } = bodyData;

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

    // Update session mode if provided
    if (mode && (mode === 'text' || mode === 'voice')) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { mode },
      });
    }

    // Get updated session
    const updatedSession = await sessionService.getSession(sessionId, user.organizationId);

    return NextResponse.json({ session: updatedSession }, { status: 200 });
  } catch (error) {
    logger.error('Error updating session', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/learning/sessions/:id
 * Get session details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can view sessions' }, { status: 403 });
    }

    const { id } = await params;
    const session = await prisma.session.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        currentNode: {
          include: {
            nugget: {
              select: {
                id: true,
                content: true,
                metadata: true,
                imageUrl: true,
                audioUrl: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify session belongs to user
    const learner = await prisma.learner.findUnique({
      where: { userId: user.id },
    });

    if (!learner || session.learnerId !== learner.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Format response to match spec
    const currentNode = session.currentNode
      ? {
          id: session.currentNode.id,
          nugget: session.currentNode.nugget
            ? {
                id: session.currentNode.nugget.id,
                content: session.currentNode.nugget.content,
                imageUrl: session.currentNode.nugget.imageUrl,
                audioUrl: session.currentNode.nugget.audioUrl,
              }
            : null,
          choices: (session.currentNode.choices as any) || [],
        }
      : null;

    const response = {
      id: session.id,
      learnerId: session.learnerId,
      currentNodeId: session.currentNodeId,
      pathHistory: (session.pathHistory as string[]) || [],
      mode: session.mode,
      startedAt: session.startedAt,
      lastActivity: session.lastActivity,
      completedAt: session.completedAt,
      currentNode,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error('Error getting learning session', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
