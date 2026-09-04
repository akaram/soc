import {
  ActivePatrolMonitoring,
  Guard,
  GuardStatus,
  PatrolAlert,
  PatrolCheckpointStatus,
  PatrolStatus
} from '../models/patrol-monitoring.model';

export function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapCheckpointStatus(raw: Record<string, unknown>): PatrolCheckpointStatus {
  return {
    checkpointId: String(raw['checkpointId'] ?? ''),
    checkpointName: String(raw['checkpointName'] ?? ''),
    checkpointCode: raw['checkpointCode'] != null ? String(raw['checkpointCode']) : undefined,
    order: Number(raw['order'] ?? 0),
    expectedTime: raw['expectedTime'] != null ? parseDate(raw['expectedTime']) : undefined,
    scannedAt: raw['scannedAt'] != null ? parseDate(raw['scannedAt']) : undefined,
    status: (raw['status'] ?? 'PENDING') as PatrolCheckpointStatus['status'],
    scanId: raw['scanId'] != null ? String(raw['scanId']) : undefined,
    timeDifference: raw['timeDifference'] != null ? Number(raw['timeDifference']) : undefined,
    location: raw['location'] as PatrolCheckpointStatus['location']
  };
}

/** Maps GET /patrol-active-patrols row to ActivePatrolMonitoring. */
export function mapActivePatrolMonitoringFromApi(raw: Record<string, unknown>): ActivePatrolMonitoring {
  const checkpoints = Array.isArray(raw['checkpoints'])
    ? (raw['checkpoints'] as Record<string, unknown>[]).map(c => mapCheckpointStatus(c))
    : [];

  const loc = raw['location'] as ActivePatrolMonitoring['location'];
  const currentCp = raw['currentCheckpoint'] as Record<string, unknown> | undefined;

  return {
    id: String(raw['id'] ?? ''),
    routeId: String(raw['routeId'] ?? ''),
    routeName: String(raw['routeName'] ?? ''),
    guardId: String(raw['guardId'] ?? ''),
    guardName: String(raw['guardName'] ?? ''),
    guardBadgeNumber: raw['guardBadgeNumber'] != null ? String(raw['guardBadgeNumber']) : undefined,
    startTime: parseDate(raw['startTime']),
    expectedEndTime: raw['expectedEndTime'] != null ? parseDate(raw['expectedEndTime']) : undefined,
    status: (raw['status'] ?? PatrolStatus.NOT_STARTED) as PatrolStatus,
    progress: Number(raw['progress'] ?? 0),
    completedCheckpoints: Number(raw['completedCheckpoints'] ?? 0),
    totalCheckpoints: Number(raw['totalCheckpoints'] ?? 0),
    currentCheckpoint: currentCp
      ? {
          checkpointId: String(currentCp['checkpointId'] ?? ''),
          checkpointName: String(currentCp['checkpointName'] ?? ''),
          order: Number(currentCp['order'] ?? 0),
          expectedTime:
            currentCp['expectedTime'] != null ? parseDate(currentCp['expectedTime']) : undefined,
          status: (currentCp['status'] ?? 'PENDING') as NonNullable<
            ActivePatrolMonitoring['currentCheckpoint']
          >['status']
        }
      : undefined,
    checkpoints,
    lastScanTime: raw['lastScanTime'] != null ? parseDate(raw['lastScanTime']) : undefined,
    location: loc,
    alerts: Array.isArray(raw['alerts'])
      ? (raw['alerts'] as Record<string, unknown>[]).map(a => mapPatrolAlertFromApi(a))
      : [],
    estimatedCompletionTime:
      raw['estimatedCompletionTime'] != null ? parseDate(raw['estimatedCompletionTime']) : undefined,
    isOnTime: Boolean(raw['isOnTime']),
    isDelayed: Boolean(raw['isDelayed']),
    delayMinutes: raw['delayMinutes'] != null ? Number(raw['delayMinutes']) : undefined
  };
}

/** Maps GET /patrol-monitoring-alerts row to PatrolAlert. */
export function mapPatrolAlertFromApi(raw: Record<string, unknown>): PatrolAlert {
  return {
    id: String(raw['id'] ?? ''),
    type: (raw['type'] ?? 'DELAY') as PatrolAlert['type'],
    severity: (raw['severity'] ?? 'MEDIUM') as PatrolAlert['severity'],
    message: String(raw['message'] ?? ''),
    timestamp: parseDate(raw['timestamp']),
    patrolId: String(raw['patrolId'] ?? ''),
    guardId: String(raw['guardId'] ?? ''),
    acknowledged: Boolean(raw['acknowledged']),
    acknowledgedBy: raw['acknowledgedBy'] != null ? String(raw['acknowledgedBy']) : undefined,
    acknowledgedAt: raw['acknowledgedAt'] != null ? parseDate(raw['acknowledgedAt']) : undefined
  };
}

/** Maps GET /patrol-monitoring-guards row to Guard. */
export function mapGuardFromApi(raw: Record<string, unknown>): Guard {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    badgeNumber: raw['badgeNumber'] != null ? String(raw['badgeNumber']) : undefined,
    status: (raw['status'] ?? GuardStatus.OFF_DUTY) as GuardStatus,
    currentPatrolId: raw['currentPatrolId'] != null ? String(raw['currentPatrolId']) : undefined,
    currentRouteName: raw['currentRouteName'] != null ? String(raw['currentRouteName']) : undefined,
    lastCheckpointScan:
      raw['lastCheckpointScan'] != null ? parseDate(raw['lastCheckpointScan']) : undefined,
    location: raw['location'] as Guard['location'],
    shiftStart: raw['shiftStart'] != null ? parseDate(raw['shiftStart']) : undefined,
    shiftEnd: raw['shiftEnd'] != null ? parseDate(raw['shiftEnd']) : undefined,
    totalPatrolsToday: raw['totalPatrolsToday'] != null ? Number(raw['totalPatrolsToday']) : undefined,
    completedPatrolsToday:
      raw['completedPatrolsToday'] != null ? Number(raw['completedPatrolsToday']) : undefined,
    onTimePercentage: raw['onTimePercentage'] != null ? Number(raw['onTimePercentage']) : undefined
  };
}
