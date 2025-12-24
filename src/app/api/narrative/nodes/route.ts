import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAdmin } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { NarrativeNodeGeneratorService } from '@/services/narrative-planning/node-generator';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';
import logger from '@/lib/logger';

const generateNodesSchema = z.object({
  nuggetIds: z.array(z.string().uuid()).min(1, 'At least one nugget ID is required'),
});

/**
 * POST /api/narrative/nodes
 * Generate narrative nodes from nuggets
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const bodyData = await request.json();
    const body = validateBody(generateNodesSchema, bodyData);

    if (!body.success) {
      return NextResponse.json(
        { error: 'Validation error', details: body.error.issues },
        { status: 400 }
      );
    }

    const nodeGenerator = new NarrativeNodeGeneratorService();
    const nodes = [];

    // Generate nodes for each nugget
    for (const nuggetId of body.data.nuggetIds) {
      const nugget = await prisma.nugget.findFirst({
        where: {
          id: nuggetId,
          organizationId: user.organizationId,
        },
      });

      if (!nugget) {
        logger.warn('Nugget not found', { nuggetId, organizationId: user.organizationId });
        continue;
      }

      // Check if node already exists
      const existingNode = await prisma.narrativeNode.findFirst({
        where: {
          nuggetId: nugget.id,
          organizationId: user.organizationId,
        },
      });

      if (existingNode) {
        logger.info('Narrative node already exists', { nuggetId, nodeId: existingNode.id });
        nodes.push(existingNode);
        continue;
      }

      // Generate new node
      const nodeData = await nodeGenerator.generateNode(nugget);
      const node = await prisma.narrativeNode.create({
        data: {
          nuggetId: nugget.id,
          organizationId: user.organizationId,
          prerequisites: nodeData.prerequisites,
          adaptsTo: nodeData.adaptsTo,
          choices: [], // Choices will be generated separately
          position: nodeData.position as any,
        },
      });

      nodes.push(node);
    }

    return NextResponse.json({ nodes }, { status: 201 });
  } catch (error) {
    logger.error('Error generating narrative nodes', {
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
 * GET /api/narrative/nodes
 * List narrative nodes for organization
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const nuggetId = searchParams.get('nuggetId');

    const where: any = {
      organizationId: user.organizationId,
    };

    if (nuggetId) {
      where.nuggetId = nuggetId;
    }

    const nodes = await prisma.narrativeNode.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ nodes }, { status: 200 });
  } catch (error) {
    logger.error('Error listing narrative nodes', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
