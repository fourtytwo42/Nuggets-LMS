import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';
import { ingestionQueue } from '@/services/jobs/queues';
import logger from '@/lib/logger';

const regenerateSchema = z.object({
  regenerateImage: z.boolean().optional().default(false),
  regenerateAudio: z.boolean().optional().default(false),
  regenerateContent: z.boolean().optional().default(false),
});

/**
 * POST /api/admin/nuggets/:id/regenerate
 * Regenerate nugget (image, audio, or content)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const bodyData = await request.json();
    const body = validateBody(regenerateSchema, bodyData);

    if (!body.success) {
      return NextResponse.json(
        { error: 'Validation error', details: body.error.issues },
        { status: 400 }
      );
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

    // Queue regeneration jobs
    const jobIds: string[] = [];

    if (body.data.regenerateImage) {
      const job = await ingestionQueue.add('generate-image', {
        nuggetId: id,
        organizationId: user.organizationId,
      });
      jobIds.push(job.id!);
    }

    if (body.data.regenerateAudio) {
      const job = await ingestionQueue.add('generate-audio', {
        nuggetId: id,
        organizationId: user.organizationId,
      });
      jobIds.push(job.id!);
    }

    if (body.data.regenerateContent) {
      // Content regeneration would require re-processing the source
      // For now, we'll just queue a content update job
      const job = await ingestionQueue.add('process-content', {
        nuggetId: id,
        organizationId: user.organizationId,
      });
      jobIds.push(job.id!);
    }

    return NextResponse.json(
      {
        success: true,
        jobIds,
        message: 'Regeneration jobs queued',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error regenerating nugget', {
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
