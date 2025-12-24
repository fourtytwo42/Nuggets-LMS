import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { ChoiceGeneratorService } from '@/services/narrative-planning/choice-generator';
import logger from '@/lib/logger';

/**
 * POST /api/narrative/nodes/:id/choices
 * Generate choices for a narrative node
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    const { id: nodeId } = await params;

    // Get node
    const node = await prisma.narrativeNode.findFirst({
      where: {
        id: nodeId,
        organizationId: user.organizationId,
      },
    });

    if (!node) {
      return NextResponse.json({ error: 'Narrative node not found' }, { status: 404 });
    }

    // Get available next nodes
    const availableNodes = await prisma.narrativeNode.findMany({
      where: {
        organizationId: user.organizationId,
        id: { not: nodeId },
      },
      include: {
        nugget: {
          select: {
            id: true,
            content: true,
            metadata: true,
          },
        },
      },
    });

    // Generate choices
    const choiceGenerator = new ChoiceGeneratorService();
    const choices = await choiceGenerator.generateChoices(node, availableNodes);

    // Update node with new choices
    await prisma.narrativeNode.update({
      where: { id: nodeId },
      data: {
        choices: choices as any,
      },
    });

    return NextResponse.json({ choices }, { status: 200 });
  } catch (error) {
    logger.error('Error generating choices', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/narrative/nodes/:id/choices
 * Get choices for a narrative node
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    const { id: nodeId } = await params;

    const node = await prisma.narrativeNode.findFirst({
      where: {
        id: nodeId,
        organizationId: user.organizationId,
      },
    });

    if (!node) {
      return NextResponse.json({ error: 'Narrative node not found' }, { status: 404 });
    }

    const choices = (node.choices as any) || [];

    return NextResponse.json({ choices }, { status: 200 });
  } catch (error) {
    logger.error('Error getting choices', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
