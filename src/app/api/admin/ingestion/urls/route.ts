import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAdmin } from '@/lib/auth/middleware';
import { URLService } from '@/services/content-ingestion/url-service';
import { z } from 'zod';
import { validateBody } from '@/lib/utils/validation';

const createURLSchema = z.object({
  url: z.string().url('Invalid URL format'),
  enabled: z.boolean().optional(),
  checkInterval: z.number().int().positive().optional(),
  contentSelector: z.string().optional(),
  autoProcess: z.boolean().optional(),
});

const updateURLSchema = z.object({
  url: z.string().url('Invalid URL format').optional(),
  enabled: z.boolean().optional(),
  checkInterval: z.number().int().positive().optional(),
  contentSelector: z.string().optional(),
  autoProcess: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const urlService = new URLService();
    const urls = await urlService.getURLs(user.organizationId);

    return NextResponse.json({ urls }, { status: 200 });
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
    const validation = validateBody(createURLSchema, body);

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
    const url = await urlService.createURL({
      organizationId: user.organizationId,
      ...validation.data,
    });

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
