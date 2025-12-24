import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { aiTutorService } from '@/services/learning-delivery/ai-tutor';
import { progressTrackerService } from '@/services/learning-delivery/progress-tracker';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';
import logger from '@/lib/logger';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  mode: z.enum(['text', 'voice']).optional(),
});

/**
 * POST /api/learning/sessions/:id/messages
 * Send message to AI tutor
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can send messages' }, { status: 403 });
    }

    const { id: sessionId } = await params;
    const bodyData = await request.json();
    const body = validateBody(sendMessageSchema, bodyData);

    if (!body.success) {
      return NextResponse.json(
        { error: 'Validation error', details: body.error.issues },
        { status: 400 }
      );
    }

    // Get session and verify ownership
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
      include: {
        currentNode: {
          include: {
            nugget: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Store user message
    const userMessage = await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: body.data.content,
      },
    });

    // Get conversation history
    const conversationHistory = await prisma.message.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 50, // Last 50 messages for context
    });

    // Convert to tutor message format
    const tutorMessages = conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt,
    }));

    // Generate AI tutor response
    const aiResponse = await aiTutorService.generateResponse(
      session,
      body.data.content,
      tutorMessages
    );

    // Store AI response
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse,
      },
    });

    // Update session last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    return NextResponse.json(
      {
        message: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          toolCalls: assistantMessage.toolCalls,
          toolResults: assistantMessage.toolResults,
          createdAt: assistantMessage.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error sending message', {
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
 * GET /api/learning/sessions/:id/messages
 * Get conversation history
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can view messages' }, { status: 403 });
    }

    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

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

    // Get messages
    const messages = await prisma.message.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const total = await prisma.message.count({
      where: { sessionId: session.id },
    });

    return NextResponse.json({ messages, total }, { status: 200 });
  } catch (error) {
    logger.error('Error getting messages', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
