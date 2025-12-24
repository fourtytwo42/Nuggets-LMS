import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { sessionService } from '@/services/learning-delivery/session-service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';
import logger from '@/lib/logger';

const createSessionSchema = z.object({
  mode: z.enum(['text', 'voice']).optional(),
  initialNodeId: z.string().uuid().optional(),
});

/**
 * POST /api/learning/sessions
 * Create a new learning session
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can create sessions' }, { status: 403 });
    }

    // Get learner record
    const learner = await prisma.learner.findUnique({
      where: { userId: user.id },
    });

    if (!learner) {
      return NextResponse.json({ error: 'Learner profile not found' }, { status: 404 });
    }

    const bodyData = await request.json();
    const body = validateBody(createSessionSchema, bodyData);

    if (!body.success) {
      return NextResponse.json(
        { error: 'Validation error', details: body.error.issues },
        { status: 400 }
      );
    }

    const session = await sessionService.createSession({
      learnerId: user.id,
      organizationId: user.organizationId,
      mode: body.data.mode,
      initialNodeId: body.data.initialNodeId,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    logger.error('Error creating learning session', {
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

/**
 * GET /api/learning/sessions
 * List user's learning sessions
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can view sessions' }, { status: 403 });
    }

    const sessions = await sessionService.getActiveSessions(user.id);

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    logger.error('Error listing learning sessions', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
