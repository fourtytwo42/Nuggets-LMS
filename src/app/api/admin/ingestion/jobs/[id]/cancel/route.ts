import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { createQueue, QueueName } from '@/services/jobs/queues';
import logger from '@/lib/logger';

/**
 * POST /api/admin/ingestion/jobs/:id/cancel
 * Cancel a pending ingestion job
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

    if (job.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending jobs can be cancelled' }, { status: 400 });
    }

    // Try to remove from queue (if it exists)
    try {
      const ingestionQueue = createQueue(QueueName.INGESTION);
      // Note: BullMQ doesn't have a direct way to remove by data, so we'll just update the status
      // The job processor should check the status before processing
    } catch (error) {
      logger.warn('Could not remove job from queue', { jobId, error });
    }

    // Update job status
    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: 'Cancelled by admin',
        completedAt: new Date(),
      },
    });

    logger.info('Cancelled ingestion job', { jobId, organizationId: user.organizationId });

    return NextResponse.json({ success: true, jobId }, { status: 200 });
  } catch (error) {
    logger.error('Error cancelling ingestion job', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
