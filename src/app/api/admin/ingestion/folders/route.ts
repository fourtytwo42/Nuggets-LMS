import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAdmin } from '@/lib/auth/middleware';
import { FolderService } from '@/services/content-ingestion/folder-service';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';

const createFolderSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  enabled: z.boolean().optional(),
  fileTypes: z.array(z.string()).optional(),
  recursive: z.boolean().optional(),
  autoProcess: z.boolean().optional(),
});

const updateFolderSchema = z.object({
  path: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  fileTypes: z.array(z.string()).optional(),
  recursive: z.boolean().optional(),
  autoProcess: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const folderService = new FolderService();
    const folders = await folderService.getFolders(user.organizationId);

    return NextResponse.json({ folders }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const body = await request.json();
    const validation = validateBody(createFolderSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const folderService = new FolderService();
    const folder = await folderService.createFolder({
      organizationId: user.organizationId,
      ...validation.data,
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
