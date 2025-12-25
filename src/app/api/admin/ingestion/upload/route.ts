import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAdmin } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { createQueue, QueueName } from '@/services/jobs/queues';
import logger from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST /api/admin/ingestion/upload
 * Upload files for ingestion
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const storagePath = process.env.STORAGE_PATH || './storage';
    const uploadPath = path.join(storagePath, 'uploads', user.organizationId);

    // Ensure upload directory exists
    await fs.mkdir(uploadPath, { recursive: true });

    const ingestionQueue = createQueue(QueueName.INGESTION);
    const uploadedFiles: Array<{ fileName: string; jobId: string }> = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file type
        const fileName = file.name;
        const extension = path.extname(fileName).toLowerCase().slice(1);
        const allowedExtensions = ['pdf', 'docx', 'txt', 'md', 'html', 'htm'];

        if (!allowedExtensions.includes(extension)) {
          errors.push({
            fileName,
            error: `File type .${extension} is not supported. Allowed types: ${allowedExtensions.join(', ')}`,
          });
          continue;
        }

        // Check file size (default 10MB limit)
        const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10);
        if (file.size > maxSize) {
          errors.push({
            fileName,
            error: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
          });
          continue;
        }

        // Generate unique filename to avoid conflicts
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${fileName}`;
        const filePath = path.join(uploadPath, uniqueFileName);

        // Save file to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await fs.writeFile(filePath, buffer);

        // Create ingestion job record
        const job = await prisma.ingestionJob.create({
          data: {
            type: 'file',
            source: filePath,
            organizationId: user.organizationId,
            status: 'pending',
            metadata: {
              fileName: fileName,
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
            },
          },
        });

        // Queue ingestion job
        await ingestionQueue.add(
          'process-file',
          {
            type: 'file' as const,
            source: filePath,
            organizationId: user.organizationId,
            metadata: {
              fileName: fileName,
              fileSize: file.size,
              jobId: job.id,
            },
          },
          {
            priority: 1,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );

        uploadedFiles.push({
          fileName,
          jobId: job.id,
        });

        logger.info('File uploaded and queued for ingestion', {
          fileName,
          jobId: job.id,
          organizationId: user.organizationId,
        });
      } catch (error) {
        logger.error('Error processing uploaded file', {
          fileName: file.name,
          error: error instanceof Error ? error.message : String(error),
        });
        errors.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        uploaded: uploadedFiles,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error in file upload endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
