import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { sessionService } from '@/services/learning-delivery/session-service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';
import logger from '@/lib/logger';

const updateCurrentNodeSchema = z.object({
  nodeId: z.string().uuid(),
  choiceId: z.string().optional(),
});

/**
 * PUT /api/learning/sessions/:id/current-node
 * Update current narrative node
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can update sessions' }, { status: 403 });
    }

    const { id: sessionId } = await params;
    const bodyData = await request.json();
    const body = validateBody(updateCurrentNodeSchema, bodyData);

    if (!body.success) {
      return NextResponse.json(
        { error: 'Validation error', details: body.error.issues },
        { status: 400 }
      );
    }

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

    // Verify node exists and belongs to organization
    const node = await prisma.narrativeNode.findFirst({
      where: {
        id: body.data.nodeId,
        organizationId: user.organizationId,
      },
    });

    if (!node) {
      return NextResponse.json({ error: 'Narrative node not found' }, { status: 404 });
    }

    // Update current node
    await sessionService.updateCurrentNode(sessionId, body.data.nodeId, body.data.choiceId);

    // Get updated session with node details
    const updatedSession = await sessionService.getSession(sessionId, user.organizationId);

    return NextResponse.json({ session: updatedSession }, { status: 200 });
  } catch (error) {
    logger.error('Error updating current node', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
