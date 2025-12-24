import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/narrative/nodes/:id
 * Get narrative node details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    const { id } = await params;

    const node = await prisma.narrativeNode.findFirst({
      where: {
        id,
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

    if (!node) {
      return NextResponse.json({ error: 'Narrative node not found' }, { status: 404 });
    }

    return NextResponse.json({ node }, { status: 200 });
  } catch (error) {
    logger.error('Error getting narrative node', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
