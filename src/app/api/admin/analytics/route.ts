import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { costTracker } from '@/services/analytics/cost-tracker';

/**
 * GET /api/admin/analytics
 * Get system analytics
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get learners stats
    const [totalLearners, newLearners, activeLearners] = await Promise.all([
      prisma.learner.count({
        where: { organizationId: user.organizationId },
      }),
      prisma.learner.count({
        where: {
          organizationId: user.organizationId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.learner.count({
        where: {
          organizationId: user.organizationId,
          sessions: {
            some: {
              lastActivity: { gte: startDate },
            },
          },
        },
      }),
    ]);

    // Get sessions stats
    const [totalSessions, completedSessions, activeSessions] = await Promise.all([
      prisma.session.count({
        where: { organizationId: user.organizationId },
      }),
      prisma.session.count({
        where: {
          organizationId: user.organizationId,
          completedAt: { not: null },
        },
      }),
      prisma.session.count({
        where: {
          organizationId: user.organizationId,
          completedAt: null,
        },
      }),
    ]);

    // Calculate average session duration
    const sessionsWithDuration = await prisma.session.findMany({
      where: {
        organizationId: user.organizationId,
        completedAt: { not: null },
        startedAt: { gte: startDate },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    const averageDuration =
      sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((acc, session) => {
            if (session.completedAt && session.startedAt) {
              const duration =
                (session.completedAt.getTime() - session.startedAt.getTime()) / 1000 / 60; // minutes
              return acc + duration;
            }
            return acc;
          }, 0) / sessionsWithDuration.length
        : 0;

    // Get nuggets stats
    const [totalNuggets, nuggetsByStatus] = await Promise.all([
      prisma.nugget.count({
        where: { organizationId: user.organizationId },
      }),
      prisma.nugget.groupBy({
        by: ['status'],
        where: { organizationId: user.organizationId },
        _count: true,
      }),
    ]);

    const nuggetsByStatusMap = nuggetsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate engagement metrics
    const sessionsInPeriod = await prisma.session.findMany({
      where: {
        organizationId: user.organizationId,
        startedAt: { gte: startDate },
      },
      include: {
        sessionNodes: {
          select: { id: true },
        },
      },
    });

    const averageSessionsPerLearner =
      totalLearners > 0 ? sessionsInPeriod.length / totalLearners : 0;
    const averageNuggetsPerSession =
      sessionsInPeriod.length > 0
        ? sessionsInPeriod.reduce((acc, session) => acc + session.sessionNodes.length, 0) /
          sessionsInPeriod.length
        : 0;

    return NextResponse.json(
      {
        learners: {
          total: totalLearners,
          active: activeLearners,
          new: newLearners,
        },
        sessions: {
          total: totalSessions,
          averageDuration: Math.round(averageDuration),
          completed: completedSessions,
          active: activeSessions,
        },
        nuggets: {
          total: totalNuggets,
          byStatus: nuggetsByStatusMap,
        },
        engagement: {
          averageSessionsPerLearner: Math.round(averageSessionsPerLearner * 10) / 10,
          averageNuggetsPerSession: Math.round(averageNuggetsPerSession * 10) / 10,
          averageSessionDuration: Math.round(averageDuration),
        },
        costs: await calculateCosts(user.organizationId, startDate),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error getting analytics', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }

  /**
   * Calculate costs from Analytics table
   */
  async function calculateCosts(
    organizationId: string,
    startDate: Date
  ): Promise<{
    total: number;
    byService: {
      ai: number;
      voice: number;
      images: number;
    };
    perLearner: number;
  }> {
    try {
      const costEvents = await prisma.analytics.findMany({
        where: {
          organizationId,
          eventType: { in: ['ai_api_call', 'voice_api_call', 'image_generation'] },
          timestamp: { gte: startDate },
        },
      });

      let total = 0;
      const byService = {
        ai: 0,
        voice: 0,
        images: 0,
      };

      for (const event of costEvents) {
        const eventData = event.eventData as any;
        const cost = eventData.totalCost || eventData.cost || 0;
        total += cost;

        if (event.eventType === 'ai_api_call') {
          byService.ai += cost;
        } else if (event.eventType === 'voice_api_call') {
          byService.voice += cost;
        } else if (event.eventType === 'image_generation') {
          byService.images += cost;
        }
      }

      // Get total learners for per-learner calculation
      const totalLearners = await prisma.learner.count({
        where: { organizationId },
      });

      return {
        total: Math.round(total * 100) / 100, // Round to 2 decimal places
        byService: {
          ai: Math.round(byService.ai * 100) / 100,
          voice: Math.round(byService.voice * 100) / 100,
          images: Math.round(byService.images * 100) / 100,
        },
        perLearner: totalLearners > 0 ? Math.round((total / totalLearners) * 100) / 100 : 0,
      };
    } catch (error) {
      logger.error('Error calculating costs', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      // Return zeros on error
      return {
        total: 0,
        byService: {
          ai: 0,
          voice: 0,
          images: 0,
        },
        perLearner: 0,
      };
    }
  }
}
