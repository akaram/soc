/**
 * Patrol Monitoring Models
 * For real-time patrol monitoring dashboard
 */

export enum GuardStatus {
  ON_DUTY = 'ON_DUTY',
  OFF_DUTY = 'OFF_DUTY',
  ON_PATROL = 'ON_PATROL',
  BREAK = 'BREAK',
  EMERGENCY = 'EMERGENCY'
}

export enum PatrolStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
  DELAYED = 'DELAYED'
}

export interface Guard {
  id: string;
  name: string;
  badgeNumber?: string;
  status: GuardStatus;
  currentPatrolId?: string;
  currentRouteName?: string;
  lastCheckpointScan?: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
  };
  shiftStart?: Date;
  shiftEnd?: Date;
  totalPatrolsToday?: number;
  completedPatrolsToday?: number;
  onTimePercentage?: number;
}

export interface ActivePatrolMonitoring {
  id: string;
  routeId: string;
  routeName: string;
  guardId: string;
  guardName: string;
  guardBadgeNumber?: string;
  startTime: Date;
  expectedEndTime?: Date;
  status: PatrolStatus;
  progress: number;                    // Percentage completed
  completedCheckpoints: number;
  totalCheckpoints: number;
  currentCheckpoint?: {
    checkpointId: string;
    checkpointName: string;
    order: number;
    expectedTime?: Date;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'LATE' | 'MISSED';
  };
  checkpoints: PatrolCheckpointStatus[];
  lastScanTime?: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
  };
  alerts: PatrolAlert[];
  estimatedCompletionTime?: Date;
  isOnTime: boolean;
  isDelayed: boolean;
  delayMinutes?: number;
}

export interface PatrolCheckpointStatus {
  checkpointId: string;
  checkpointName: string;
  checkpointCode?: string;
  order: number;
  expectedTime?: Date;
  scannedAt?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'LATE' | 'MISSED';
  scanId?: string;
  timeDifference?: number;              // Minutes difference from expected
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface PatrolAlert {
  id: string;
  type: 'DELAY' | 'MISSED_CHECKPOINT' | 'EMERGENCY' | 'LATE_SCAN' | 'ROUTE_DEVIATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  patrolId: string;
  guardId: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface PatrolMonitoringStatistics {
  // Active Patrols
  activePatrols: number;
  completedPatrolsToday: number;
  totalPatrolsToday: number;
  // Guards
  guardsOnDuty: number;
  guardsOnPatrol: number;
  guardsOnBreak: number;
  // Checkpoints
  totalCheckpointsScanned: number;
  checkpointsScannedToday: number;
  missedCheckpoints: number;
  lateCheckpoints: number;
  // Performance
  averageCompletionRate: number;
  onTimePercentage: number;
  averagePatrolDuration: number;        // Minutes
  // Alerts
  activeAlerts: number;
  criticalAlerts: number;
  unacknowledgedAlerts: number;
  // Recent Activity
  recentScans: number;                  // Last hour
  recentAlerts: number;                 // Last hour
}

export interface PatrolMonitoringFilter {
  routeId?: string;
  guardId?: string;
  status?: PatrolStatus;
  showOnlyActive?: boolean;
  showOnlyDelayed?: boolean;
  showOnlyWithAlerts?: boolean;
}

export interface RealTimeUpdate {
  type: 'PATROL_STARTED' | 'PATROL_COMPLETED' | 'CHECKPOINT_SCANNED' | 'ALERT_CREATED' | 'GUARD_STATUS_CHANGED' | 'LOCATION_UPDATE';
  timestamp: Date;
  data: any;
}

