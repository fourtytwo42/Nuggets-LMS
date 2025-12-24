import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAdmin } from '@/lib/auth/middleware';
import { URLService } from '@/services/content-ingestion/url-service';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';

const updateURLSchema = z.object({
  url: z.string().url('Invalid URL format').optional(),
  enabled: z.boolean().optional(),
  checkInterval: z.number().int().positive().optional(),
  contentSelector: z.string().optional(),
  autoProcess: z.boolean().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const { id } = await params;
    const urlService = new URLService();
    const url = await urlService.getURLById(id, user.organizationId);

    if (!url) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 });
    }

    return NextResponse.json({ url }, { status: 200 });
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
    const validation = validateBody(updateURLSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const urlService = new URLService();
    const url = await urlService.updateURL(id, user.organizationId, validation.data);

    return NextResponse.json({ url }, { status: 200 });
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
    const urlService = new URLService();
    await urlService.deleteURL(id, user.organizationId);

    return NextResponse.json({ message: 'URL deleted' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
