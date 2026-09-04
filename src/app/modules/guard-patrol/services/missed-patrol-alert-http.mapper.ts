import {
  AlertSeverity,
  AlertStatus,
  MissedPatrolAlert,
  MissedPatrolReason,
  PatrolNotification,
  NotificationType
} from '../models/missed-patrol-alert.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

export function mapMissedPatrolAlertFromApi(raw: Record<string, unknown>): MissedPatrolAlert {
  return {
    id: String(raw['id'] ?? ''),
    patrolId: String(raw['patrolId'] ?? ''),
    routeId: String(raw['routeId'] ?? ''),
    routeName: String(raw['routeName'] ?? ''),
    guardId: String(raw['guardId'] ?? ''),
    guardName: String(raw['guardName'] ?? ''),
    guardBadgeNumber: raw['guardBadgeNumber'] != null ? String(raw['guardBadgeNumber']) : undefined,
    severity: (raw['severity'] ?? AlertSeverity.MEDIUM) as AlertSeverity,
    status: (raw['status'] ?? AlertStatus.PENDING) as AlertStatus,
    reason: (raw['reason'] ?? MissedPatrolReason.OTHER) as MissedPatrolReason,
    description: String(raw['description'] ?? ''),
    expectedStartTime: parseDate(raw['expectedStartTime']),
    actualStartTime: raw['actualStartTime'] != null ? parseDate(raw['actualStartTime']) : undefined,
    expectedEndTime: raw['expectedEndTime'] != null ? parseDate(raw['expectedEndTime']) : undefined,
    actualEndTime: raw['actualEndTime'] != null ? parseDate(raw['actualEndTime']) : undefined,
    missedCheckpoints: Array.isArray(raw['missedCheckpoints'])
      ? (raw['missedCheckpoints'] as string[])
      : [],
    missedCheckpointNames: Array.isArray(raw['missedCheckpointNames'])
      ? (raw['missedCheckpointNames'] as string[])
      : [],
    detectedAt: parseDate(raw['detectedAt']),
    detectedBy: raw['detectedBy'] != null ? String(raw['detectedBy']) : undefined,
    acknowledgedAt: raw['acknowledgedAt'] != null ? parseDate(raw['acknowledgedAt']) : undefined,
    acknowledgedBy: raw['acknowledgedBy'] != null ? String(raw['acknowledgedBy']) : undefined,
    resolvedAt: raw['resolvedAt'] != null ? parseDate(raw['resolvedAt']) : undefined,
    resolvedBy: raw['resolvedBy'] != null ? String(raw['resolvedBy']) : undefined,
    resolutionNotes: raw['resolutionNotes'] != null ? String(raw['resolutionNotes']) : undefined,
    escalatedAt: raw['escalatedAt'] != null ? parseDate(raw['escalatedAt']) : undefined,
    escalatedTo: raw['escalatedTo'] != null ? String(raw['escalatedTo']) : undefined,
    escalationLevel: raw['escalationLevel'] != null ? Number(raw['escalationLevel']) : undefined,
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]) : undefined,
    priority: Number(raw['priority'] ?? 5),
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt'])
  };
}

export function mapPatrolNotificationFromApi(raw: Record<string, unknown>): PatrolNotification {
  return {
    id: String(raw['id'] ?? ''),
    alertId: String(raw['alertId'] ?? ''),
    type: (raw['type'] ?? NotificationType.IN_APP) as NotificationType,
    recipientId: String(raw['recipientId'] ?? ''),
    recipientName: String(raw['recipientName'] ?? ''),
    recipientEmail: raw['recipientEmail'] != null ? String(raw['recipientEmail']) : undefined,
    recipientPhone: raw['recipientPhone'] != null ? String(raw['recipientPhone']) : undefined,
    subject: raw['subject'] != null ? String(raw['subject']) : undefined,
    message: String(raw['message'] ?? ''),
    sentAt: parseDate(raw['sentAt']),
    deliveredAt: raw['deliveredAt'] != null ? parseDate(raw['deliveredAt']) : undefined,
    readAt: raw['readAt'] != null ? parseDate(raw['readAt']) : undefined,
    status: (raw['status'] ?? 'PENDING') as PatrolNotification['status'],
    errorMessage: raw['errorMessage'] != null ? String(raw['errorMessage']) : undefined,
    retryCount: raw['retryCount'] != null ? Number(raw['retryCount']) : undefined
  };
}
