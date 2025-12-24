import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAdmin } from '@/lib/auth/middleware';
import { FolderService } from '@/services/content-ingestion/folder-service';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';

const updateFolderSchema = z.object({
  path: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  fileTypes: z.array(z.string()).optional(),
  recursive: z.boolean().optional(),
  autoProcess: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const { id } = await params;
    const folderService = new FolderService();
    const folder = await folderService.getFolderById(id, user.organizationId);

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const { id } = await params;
    const body = await request.json();
    const validation = validateBody(updateFolderSchema, body);

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
    const folder = await folderService.updateFolder(id, user.organizationId, validation.data);

    return NextResponse.json({ folder }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const { id } = await params;
    const folderService = new FolderService();
    await folderService.deleteFolder(id, user.organizationId);

    return NextResponse.json({ message: 'Folder deleted' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
