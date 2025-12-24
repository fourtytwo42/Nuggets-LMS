import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { sessionService } from '@/services/learning-delivery/session-service';
import { z } from 'zod';
import logger from '@/lib/logger';

const choiceSchema = z.object({
  choiceId: z.string(),
});

/**
 * POST /api/learning/sessions/:id/choices
 * Make a narrative choice
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'learner') {
      return NextResponse.json(
        { error: 'Only learners can make narrative choices' },
        { status: 403 }
      );
    }

    const { id: sessionId } = await params;
    const bodyData = await request.json();

    // Validate request body
    const validationResult = choiceSchema.safeParse(bodyData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { choiceId } = validationResult.data;

    // Get learner
    const learner = await prisma.learner.findFirst({
      where: { userId: user.id },
    });

    if (!learner) {
      return NextResponse.json({ error: 'Learner profile not found' }, { status: 404 });
    }

    // Get session
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
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
    const selectedChoice = choices.find((c: any) => c.id === choiceId);

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

    // Track mastery updates
    const masteryUpdates: Array<{
      concept: string;
      masteryLevel: number;
      evidence?: string;
    }> = [];

    // Update progress based on choice (if it reveals gaps or confirms mastery)
    if (selectedChoice.revealsGap && selectedChoice.revealsGap.length > 0) {
      // Add to knowledge gaps
      const updatedLearner = await prisma.learner.findUnique({
        where: { id: session.learnerId },
      });

      if (updatedLearner) {
        const knowledgeGaps = updatedLearner.knowledgeGaps || [];
        const updatedGaps = [...new Set([...knowledgeGaps, ...selectedChoice.revealsGap])];

        await prisma.learner.update({
          where: { id: session.learnerId },
          data: { knowledgeGaps: updatedGaps },
        });
      }
    }

    if (selectedChoice.confirmsMastery && selectedChoice.confirmsMastery.length > 0) {
      // Update mastery for confirmed concepts
      const updatedLearner = await prisma.learner.findUnique({
        where: { id: session.learnerId },
      });

      if (updatedLearner) {
        const masteryMap = (updatedLearner.masteryMap as Record<string, number>) || {};
        selectedChoice.confirmsMastery.forEach((concept: string) => {
          const currentMastery = masteryMap[concept] || 0;
          const newMastery = Math.min(100, currentMastery + 10);
          masteryMap[concept] = newMastery;

          masteryUpdates.push({
            concept,
            masteryLevel: newMastery,
            evidence: `Choice "${selectedChoice.text}" confirmed mastery of ${concept}`,
          });
        });

        await prisma.learner.update({
          where: { id: session.learnerId },
          data: { masteryMap: masteryMap as any },
        });
      }
    }

    // Format next node with choices
    const nextNodeChoices = (nextNode.choices as any) || [];

    return NextResponse.json(
      {
        nextNode: {
          id: nextNode.id,
          nugget: nextNode.nugget,
          choices: nextNodeChoices.map((choice: any) => ({
            id: choice.id,
            text: choice.text,
            nextNodeId: choice.nextNodeId,
          })),
        },
        masteryUpdates,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error processing narrative choice', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: (await params).id,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
