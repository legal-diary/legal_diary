import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';

/**
 * GET /api/activity-logs
 * Fetch activity logs for the firm (ADMIN only)
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - entityType: Filter by entity type (CASE, HEARING, DOCUMENT, USER, etc.)
 * - action: Filter by action type
 * - userId: Filter by user ID
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMINs can view activity logs
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can view activity logs' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const entityType = url.searchParams.get('entityType');
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build where clause
    const where: Record<string, unknown> = {
      firmId: user.firmId,
    };

    if (entityType) {
      where.entityType = entityType;
    }

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Fetch total count and activity logs
    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Parse details JSON for each log
    const logsWithParsedDetails = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return NextResponse.json({
      logs: logsWithParsedDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/activity-logs/stats
 * Get activity statistics for the firm (ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMINs can view activity stats
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can view activity statistics' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { days = 7 } = body;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get activity count by action type
    const activityByAction = await prisma.activityLog.groupBy({
      by: ['action'],
      where: {
        firmId: user.firmId,
        createdAt: { gte: startDate },
      },
      _count: { action: true },
    });

    // Get activity count by user
    const activityByUser = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        firmId: user.firmId,
        createdAt: { gte: startDate },
      },
      _count: { userId: true },
    });

    // Get user names for the stats
    const userIds = activityByUser.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const activityByUserWithNames = activityByUser.map(a => ({
      userId: a.userId,
      user: userMap.get(a.userId),
      count: a._count.userId,
    }));

    // Get total activity count
    const totalActivity = await prisma.activityLog.count({
      where: {
        firmId: user.firmId,
        createdAt: { gte: startDate },
      },
    });

    return NextResponse.json({
      totalActivity,
      activityByAction: activityByAction.map(a => ({
        action: a.action,
        count: a._count.action,
      })),
      activityByUser: activityByUserWithNames,
      period: { days, startDate, endDate: new Date() },
    });
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity statistics' },
      { status: 500 }
    );
  }
}
