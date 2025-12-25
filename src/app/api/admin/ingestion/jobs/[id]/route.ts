import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * DELETE /api/admin/ingestion/jobs/:id
 * Delete an ingestion job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only allow deletion of failed or completed jobs
    if (job.status === 'pending' || job.status === 'processing') {
      return NextResponse.json(
        { error: 'Cannot delete pending or processing jobs. Cancel them first.' },
        { status: 400 }
      );
    }

    // Delete the job
    await prisma.ingestionJob.delete({
      where: { id: jobId },
    });

    logger.info('Deleted ingestion job', { jobId, organizationId: user.organizationId });

    return NextResponse.json({ success: true, jobId }, { status: 200 });
  } catch (error) {
    logger.error('Error deleting ingestion job', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
