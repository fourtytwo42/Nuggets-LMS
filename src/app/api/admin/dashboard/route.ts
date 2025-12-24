import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { createQueue, QueueName } from '@/services/jobs/queues';
import logger from '@/lib/logger';
import { costTracker } from '@/services/analytics/cost-tracker';

/**
 * GET /api/admin/dashboard
 * Get dashboard overview data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get summary stats
    const [totalNuggets, activeSessions, processingJobs] = await Promise.all([
      prisma.nugget.count({
        where: { organizationId: user.organizationId },
      }),
      prisma.session.count({
        where: {
          organizationId: user.organizationId,
          completedAt: null,
        },
      }),
      prisma.ingestionJob.count({
        where: {
          organizationId: user.organizationId,
          status: 'processing',
        },
      }),
    ]);

    // Get recent activity
    const [recentNuggets, recentSessions, recentJobs] = await Promise.all([
      prisma.nugget.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.session.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          startedAt: true,
          mode: true,
          learner: {
            select: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.ingestionJob.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          source: true,
          status: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
        },
      }),
    ]);

    // Get cost overview (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get cost report for this month
    const costReport = await costTracker.getCostReport(user.organizationId, 'month');
    const totalThisMonth = costReport.total;

    // Get cost report for last month to calculate trend
    const lastMonthStart = new Date(startOfMonth);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(startOfMonth);
    lastMonthEnd.setDate(0); // Last day of previous month

    const lastMonthCostEvents = await prisma.analytics.findMany({
      where: {
        organizationId: user.organizationId,
        eventType: { in: ['ai_api_call', 'voice_api_call', 'image_generation'] },
        timestamp: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    const lastMonthTotal = lastMonthCostEvents.reduce((sum, event) => {
      const eventData = event.eventData as any;
      return sum + (eventData.totalCost || eventData.cost || 0);
    }, 0);

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (totalThisMonth > lastMonthTotal * 1.1) {
      trend = 'up';
    } else if (totalThisMonth < lastMonthTotal * 0.9) {
      trend = 'down';
    }

    const costOverview = {
      totalThisMonth: Math.round(totalThisMonth * 100) / 100,
      trend,
    };

    return NextResponse.json(
      {
        summary: {
          totalNuggets,
          activeSessions,
          processingJobs,
        },
        recentActivity: {
          nuggets: recentNuggets.map((n) => ({
            id: n.id,
            content: n.content.substring(0, 100) + (n.content.length > 100 ? '...' : ''),
            status: n.status,
            createdAt: n.createdAt,
          })),
          sessions: recentSessions.map((s) => ({
            id: s.id,
            learnerName: s.learner.user.name,
            learnerEmail: s.learner.user.email,
            mode: s.mode,
            startedAt: s.startedAt,
          })),
          jobs: recentJobs.map((j) => ({
            id: j.id,
            type: j.type,
            source: j.source,
            status: j.status,
            createdAt: j.createdAt,
            completedAt: j.completedAt,
            errorMessage: j.errorMessage,
          })),
        },
        costOverview,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error getting dashboard data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
