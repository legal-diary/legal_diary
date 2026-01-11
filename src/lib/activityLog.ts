import { prisma } from './prisma';
import { ActivityAction, EntityType } from '@prisma/client';

interface ActivityLogParams {
  userId: string;
  firmId: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logs an activity to the ActivityLog table
 * This function is non-blocking and will not throw errors to prevent
 * disrupting the main operation if logging fails
 */
export async function logActivity(params: ActivityLogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        firmId: params.firmId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        entityName: params.entityName || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    // Log error but don't throw - activity logging should not break main operations
    console.error('Failed to log activity:', error);
  }
}

/**
 * Helper to extract IP address and User-Agent from request headers
 */
export function getRequestInfo(request: Request): { ipAddress?: string; userAgent?: string } {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    request.headers.get('x-real-ip') ||
                    undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  return { ipAddress, userAgent };
}

/**
 * Convenience functions for common activity types
 */
export const ActivityLogger = {
  // Case activities
  caseCreated: (userId: string, firmId: string, caseId: string, caseNumber: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'CASE_CREATED',
      entityType: 'CASE',
      entityId: caseId,
      entityName: caseNumber,
      ...reqInfo,
    });
  },

  caseUpdated: (userId: string, firmId: string, caseId: string, caseNumber: string, changes: Record<string, unknown>, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'CASE_UPDATED',
      entityType: 'CASE',
      entityId: caseId,
      entityName: caseNumber,
      details: { changes },
      ...reqInfo,
    });
  },

  caseDeleted: (userId: string, firmId: string, caseId: string, caseNumber: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'CASE_DELETED',
      entityType: 'CASE',
      entityId: caseId,
      entityName: caseNumber,
      ...reqInfo,
    });
  },

  caseAssigned: (userId: string, firmId: string, caseId: string, caseNumber: string, assignedUsers: string[], request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'CASE_ASSIGNED',
      entityType: 'CASE',
      entityId: caseId,
      entityName: caseNumber,
      details: { assignedUsers },
      ...reqInfo,
    });
  },

  caseUnassigned: (userId: string, firmId: string, caseId: string, caseNumber: string, unassignedUsers: string[], request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'CASE_UNASSIGNED',
      entityType: 'CASE',
      entityId: caseId,
      entityName: caseNumber,
      details: { unassignedUsers },
      ...reqInfo,
    });
  },

  // Hearing activities
  hearingCreated: (userId: string, firmId: string, hearingId: string, caseNumber: string, hearingDate: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'HEARING_CREATED',
      entityType: 'HEARING',
      entityId: hearingId,
      entityName: `${caseNumber} - ${hearingDate}`,
      ...reqInfo,
    });
  },

  hearingUpdated: (userId: string, firmId: string, hearingId: string, caseNumber: string, changes: Record<string, unknown>, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'HEARING_UPDATED',
      entityType: 'HEARING',
      entityId: hearingId,
      entityName: caseNumber,
      details: { changes },
      ...reqInfo,
    });
  },

  hearingDeleted: (userId: string, firmId: string, hearingId: string, caseNumber: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'HEARING_DELETED',
      entityType: 'HEARING',
      entityId: hearingId,
      entityName: caseNumber,
      ...reqInfo,
    });
  },

  // Document activities
  documentUploaded: (userId: string, firmId: string, documentId: string, fileName: string, caseNumber: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'DOCUMENT',
      entityId: documentId,
      entityName: fileName,
      details: { caseNumber },
      ...reqInfo,
    });
  },

  documentDeleted: (userId: string, firmId: string, documentId: string, fileName: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'DOCUMENT_DELETED',
      entityType: 'DOCUMENT',
      entityId: documentId,
      entityName: fileName,
      ...reqInfo,
    });
  },

  // AI activities
  aiAnalysisRun: (userId: string, firmId: string, caseId: string, caseNumber: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'AI_ANALYSIS_RUN',
      entityType: 'AI_ANALYSIS',
      entityId: caseId,
      entityName: caseNumber,
      ...reqInfo,
    });
  },

  // Team activities
  memberRemoved: (userId: string, firmId: string, removedUserId: string, removedUserName: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'MEMBER_REMOVED',
      entityType: 'USER',
      entityId: removedUserId,
      entityName: removedUserName,
      ...reqInfo,
    });
  },

  memberRoleChanged: (userId: string, firmId: string, targetUserId: string, targetUserName: string, oldRole: string, newRole: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'MEMBER_ROLE_CHANGED',
      entityType: 'USER',
      entityId: targetUserId,
      entityName: targetUserName,
      details: { oldRole, newRole },
      ...reqInfo,
    });
  },

  // Auth activities
  userLogin: (userId: string, firmId: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: userId,
      ...reqInfo,
    });
  },

  userLogout: (userId: string, firmId: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'USER_LOGOUT',
      entityType: 'USER',
      entityId: userId,
      ...reqInfo,
    });
  },

  // Calendar activities
  calendarConnected: (userId: string, firmId: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'CALENDAR_CONNECTED',
      entityType: 'CALENDAR',
      entityId: userId,
      ...reqInfo,
    });
  },

  calendarDisconnected: (userId: string, firmId: string, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'CALENDAR_DISCONNECTED',
      entityType: 'CALENDAR',
      entityId: userId,
      ...reqInfo,
    });
  },

  calendarSynced: (userId: string, firmId: string, hearingCount: number, request?: Request) => {
    const reqInfo = request ? getRequestInfo(request) : {};
    return logActivity({
      userId,
      firmId,
      action: 'CALENDAR_SYNCED',
      entityType: 'CALENDAR',
      entityId: userId,
      details: { hearingCount },
      ...reqInfo,
    });
  },
};
