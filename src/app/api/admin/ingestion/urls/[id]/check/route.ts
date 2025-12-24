import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAdmin } from '@/lib/auth/middleware';
import { URLService } from '@/services/content-ingestion/url-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);
    requireAdmin(user.role);

    const { id } = await params;
    const urlService = new URLService();
    await urlService.triggerCheck(id, user.organizationId);

    return NextResponse.json({ message: 'URL check triggered' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
