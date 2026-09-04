/**
 * Missed Patrol Alert Models
 * For tracking and managing missed patrol alerts and notifications
 */

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AlertStatus {
  PENDING = 'PENDING',           // Alert created, not yet acknowledged
  ACKNOWLEDGED = 'ACKNOWLEDGED', // Alert acknowledged by supervisor
  RESOLVED = 'RESOLVED',         // Alert resolved
  ESCALATED = 'ESCALATED',       // Alert escalated to higher authority
  DISMISSED = 'DISMISSED'         // Alert dismissed as false positive
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  SYSTEM = 'SYSTEM'
}

export enum MissedPatrolReason {
  GUARD_ABSENT = 'GUARD_ABSENT',           // Guard did not show up
  DELAYED_START = 'DELAYED_START',         // Patrol started late
  MISSED_CHECKPOINT = 'MISSED_CHECKPOINT', // Checkpoint not scanned
  INCOMPLETE_ROUTE = 'INCOMPLETE_ROUTE',   // Route not completed
  ABANDONED = 'ABANDONED',                 // Patrol abandoned
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',     // Technical problem
  EMERGENCY = 'EMERGENCY',                 // Emergency situation
  OTHER = 'OTHER'                          // Other reason
}

export interface MissedPatrolAlert {
  id: string;
  // Patrol Information
  patrolId: string;
  routeId: string;
  routeName: string;
  guardId: string;
  guardName: string;
  guardBadgeNumber?: string;
  // Alert Details
  severity: AlertSeverity;
  status: AlertStatus;
  reason: MissedPatrolReason;
  description: string;
  // Timing
  expectedStartTime: Date;
  actualStartTime?: Date;
  expectedEndTime?: Date;
  actualEndTime?: Date;
  missedCheckpoints: string[];             // Checkpoint IDs that were missed
  missedCheckpointNames: string[];        // Checkpoint names for display
  // Detection
  detectedAt: Date;
  detectedBy?: string;                     // System or user who detected
  // Resolution
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  // Escalation
  escalatedAt?: Date;
  escalatedTo?: string;
  escalationLevel?: number;
  // Metadata
  tags?: string[];
  priority: number;                        // 1-10, higher is more urgent
  createdAt: Date;
  updatedAt: Date;
}

export interface PatrolNotification {
  id: string;
  alertId: string;
  type: NotificationType;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  message: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorMessage?: string;
  retryCount?: number;
}

export interface CreateMissedPatrolAlertRequest {
  patrolId: string;
  routeId: string;
  routeName: string;
  guardId: string;
  guardName: string;
  severity: AlertSeverity;
  reason: MissedPatrolReason;
  description: string;
  expectedStartTime: Date;
  expectedEndTime?: Date;
  missedCheckpoints?: string[];
  missedCheckpointNames?: string[];
  priority?: number;
  tags?: string[];
}

export interface UpdateMissedPatrolAlertRequest {
  status?: AlertStatus;
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  escalatedTo?: string;
  tags?: string[];
  priority?: number;
}

export interface MissedPatrolAlertFilter {
  status?: AlertStatus;
  severity?: AlertSeverity;
  reason?: MissedPatrolReason;
  guardId?: string;
  routeId?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  showOnlyUnacknowledged?: boolean;
  showOnlyUnresolved?: boolean;
}

export interface MissedPatrolAlertStatistics {
  totalAlerts: number;
  pendingAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  escalatedAlerts: number;
  bySeverity: {
    [severity: string]: number;
  };
  byReason: {
    [reason: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
  averageResolutionTime?: number;         // Hours
  alertsToday: number;
  alertsThisWeek: number;
  alertsThisMonth: number;
  topGuardsWithAlerts: {
    guardId: string;
    guardName: string;
    alertCount: number;
  }[];
  topRoutesWithAlerts: {
    routeId: string;
    routeName: string;
    alertCount: number;
  }[];
}

export interface NotificationPreference {
  userId: string;
  userName: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  severityThreshold: AlertSeverity;        // Only notify for this severity and above
  notificationTypes: NotificationType[];
}

export interface MissedPatrolAlertResponse {
  success: boolean;
  message: string;
  alert?: MissedPatrolAlert;
  notifications?: PatrolNotification[];
  errors?: string[];
}

