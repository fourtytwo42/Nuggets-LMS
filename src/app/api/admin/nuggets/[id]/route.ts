import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';
import logger from '@/lib/logger';

const updateNuggetSchema = z.object({
  content: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * GET /api/admin/nuggets/:id
 * Get nugget details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const nugget = await prisma.nugget.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        nuggetSources: {
          select: {
            id: true,
            sourceType: true,
            sourcePath: true,
            createdAt: true,
          },
        },
      },
    });

    if (!nugget) {
      return NextResponse.json({ error: 'Nugget not found' }, { status: 404 });
    }

    return NextResponse.json({ nugget }, { status: 200 });
  } catch (error) {
    logger.error('Error getting nugget details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/nuggets/:id
 * Update nugget
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const bodyData = await request.json();
    const body = validateBody(updateNuggetSchema, bodyData);

    if (!body.success) {
      return NextResponse.json(
        { error: 'Validation error', details: body.error.issues },
        { status: 400 }
      );
    }

    // Verify nugget exists and belongs to organization
    const existingNugget = await prisma.nugget.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingNugget) {
      return NextResponse.json({ error: 'Nugget not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (body.data.content !== undefined) {
      updateData.content = body.data.content;
    }
    if (body.data.metadata !== undefined) {
      // Merge with existing metadata
      const existingMetadata = (existingNugget.metadata as any) || {};
      updateData.metadata = { ...existingMetadata, ...body.data.metadata };
    }

    const updatedNugget = await prisma.nugget.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        content: true,
        metadata: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ nugget: updatedNugget }, { status: 200 });
  } catch (error) {
    logger.error('Error updating nugget', {
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
 * DELETE /api/admin/nuggets/:id
 * Delete nugget
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify nugget exists and belongs to organization
    const nugget = await prisma.nugget.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!nugget) {
      return NextResponse.json({ error: 'Nugget not found' }, { status: 404 });
    }

    await prisma.nugget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error deleting nugget', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
