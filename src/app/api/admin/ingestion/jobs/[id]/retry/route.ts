import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { createQueue, QueueName } from '@/services/jobs/queues';
import logger from '@/lib/logger';

/**
 * POST /api/admin/ingestion/jobs/:id/retry
 * Retry a failed ingestion job
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: jobId } = await params;

    // Find the job
    const job = await prisma.ingestionJob.findFirst({
      where: {
        id: jobId,
        organizationId: user.organizationId,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'failed') {
      return NextResponse.json({ error: 'Only failed jobs can be retried' }, { status: 400 });
    }

    // Reset job status and clear error
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: 'pending',
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    // Re-queue the job
    const ingestionQueue = createQueue(QueueName.INGESTION);
    await ingestionQueue.add('process-ingestion', {
      type: job.type,
      source: job.source,
      organizationId: job.organizationId,
      metadata: job.metadata as any,
      jobId: job.id,
    });

    logger.info('Retried ingestion job', { jobId, organizationId: user.organizationId });

    return NextResponse.json({ success: true, jobId }, { status: 200 });
  } catch (error) {
    logger.error('Error retrying ingestion job', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
