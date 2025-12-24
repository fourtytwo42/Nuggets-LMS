import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/admin/nuggets
 * List all nuggets (paginated)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    const where: any = {
      organizationId: user.organizationId,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.content = { contains: search, mode: 'insensitive' };
    }

    const [nuggets, total] = await Promise.all([
      prisma.nugget.findMany({
        where,
        select: {
          id: true,
          content: true,
          metadata: true,
          status: true,
          imageUrl: true,
          audioUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.nugget.count({ where }),
    ]);

    // Truncate content for preview
    const nuggetsWithPreview = nuggets.map((nugget) => ({
      ...nugget,
      content: nugget.content.substring(0, 200) + (nugget.content.length > 200 ? '...' : ''),
    }));

    return NextResponse.json(
      {
        nuggets: nuggetsWithPreview,
        total,
        page,
        pageSize,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error listing nuggets', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
