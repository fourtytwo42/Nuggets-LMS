import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { sessionService } from '@/services/learning-delivery/session-service';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';
import logger from '@/lib/logger';

const navigateSchema = z.object({
  sessionId: z.string().uuid(),
  choiceId: z.string(),
});

/**
 * POST /api/narrative/navigate
 * Navigate to next node based on choice
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json({ error: 'Only learners can navigate narrative' }, { status: 403 });
    }

    const bodyData = await request.json();
    const body = validateBody(navigateSchema, bodyData);

    if (!body.success) {
      return NextResponse.json(
        { error: 'Validation error', details: body.error.issues },
        { status: 400 }
      );
    }

    // Get session
    const learner = await prisma.learner.findFirst({
      where: { userId: user.id },
    });

    if (!learner) {
      return NextResponse.json({ error: 'Learner profile not found' }, { status: 404 });
    }

    const session = await prisma.session.findFirst({
      where: {
        id: body.data.sessionId,
        learnerId: learner.id,
        organizationId: user.organizationId,
      },
      include: {
        currentNode: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.currentNodeId) {
      return NextResponse.json({ error: 'No current node in session' }, { status: 400 });
    }

    // Get current node and find the choice
    const currentNode = session.currentNode;
    if (!currentNode) {
      return NextResponse.json({ error: 'Current node not found' }, { status: 404 });
    }

    const choices = (currentNode.choices as any) || [];
    const selectedChoice = choices.find((c: any) => c.id === body.data.choiceId);

    if (!selectedChoice) {
      return NextResponse.json({ error: 'Choice not found' }, { status: 404 });
    }

    // Verify next node exists
    const nextNode = await prisma.narrativeNode.findFirst({
      where: {
        id: selectedChoice.nextNodeId,
        organizationId: user.organizationId,
      },
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
    });

    if (!nextNode) {
      return NextResponse.json({ error: 'Next node not found' }, { status: 404 });
    }

    // Update session to next node
    await sessionService.updateCurrentNode(session.id, nextNode.id, selectedChoice.id);

    // Update progress based on choice (if it reveals gaps or confirms mastery)
    if (selectedChoice.revealsGap && selectedChoice.revealsGap.length > 0) {
      // Add to knowledge gaps
      const learner = await prisma.learner.findUnique({
        where: { id: session.learnerId },
      });

      if (learner) {
        const knowledgeGaps = learner.knowledgeGaps || [];
        const updatedGaps = [...new Set([...knowledgeGaps, ...selectedChoice.revealsGap])];

        await prisma.learner.update({
          where: { id: session.learnerId },
          data: { knowledgeGaps: updatedGaps },
        });
      }
    }

    if (selectedChoice.confirmsMastery && selectedChoice.confirmsMastery.length > 0) {
      // Update mastery for confirmed concepts
      const learner = await prisma.learner.findUnique({
        where: { id: session.learnerId },
      });

      if (learner) {
        const masteryMap = (learner.masteryMap as Record<string, number>) || {};
        selectedChoice.confirmsMastery.forEach((concept: string) => {
          masteryMap[concept] = Math.min(100, (masteryMap[concept] || 0) + 10);
        });

        await prisma.learner.update({
          where: { id: session.learnerId },
          data: { masteryMap: masteryMap as any },
        });
      }
    }

    return NextResponse.json(
      {
        nextNode: {
          id: nextNode.id,
          nugget: nextNode.nugget,
          choices: nextNode.choices,
          prerequisites: nextNode.prerequisites,
          adaptsTo: nextNode.adaptsTo,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error navigating narrative', {
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
