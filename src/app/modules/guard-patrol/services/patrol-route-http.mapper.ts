import {
  Checkpoint,
  CheckpointType,
  CheckpointStatus,
  PatrollingRoute,
  RouteStatus
} from '../models/patrolling-route.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapCheckpoint(raw: Record<string, unknown>): Checkpoint {
  const typeStr = String(raw['type'] ?? 'MANUAL');
  const type = (Object.values(CheckpointType) as string[]).includes(typeStr)
    ? (typeStr as CheckpointType)
    : CheckpointType.MANUAL;
  const st = raw['status'] != null ? String(raw['status']) : undefined;
  const status = st && (Object.values(CheckpointStatus) as string[]).includes(st)
    ? (st as CheckpointStatus)
    : undefined;
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    description: raw['description'] != null ? String(raw['description']) : undefined,
    type,
    location: String(raw['location'] ?? ''),
    buildingName: raw['buildingName'] != null ? String(raw['buildingName']) : undefined,
    floorNumber: raw['floorNumber'] != null ? Number(raw['floorNumber']) : undefined,
    area: raw['area'] != null ? String(raw['area']) : undefined,
    latitude: raw['latitude'] != null ? Number(raw['latitude']) : undefined,
    longitude: raw['longitude'] != null ? Number(raw['longitude']) : undefined,
    qrCode: raw['qrCode'] != null ? String(raw['qrCode']) : undefined,
    nfcTagId: raw['nfcTagId'] != null ? String(raw['nfcTagId']) : undefined,
    checkpointCode: raw['checkpointCode'] != null ? String(raw['checkpointCode']) : undefined,
    expectedDuration: raw['expectedDuration'] != null ? Number(raw['expectedDuration']) : undefined,
    scanWindow: raw['scanWindow'] != null ? Number(raw['scanWindow']) : undefined,
    order: Number(raw['order'] ?? 0),
    isRequired: Boolean(raw['isRequired']),
    requiresPhoto: Boolean(raw['requiresPhoto']),
    requiresNotes: Boolean(raw['requiresNotes']),
    status,
    lastScannedAt: raw['lastScannedAt'] != null ? parseDate(raw['lastScannedAt']) : undefined,
    lastScannedBy: raw['lastScannedBy'] != null ? String(raw['lastScannedBy']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt'])
  };
}

/** Maps GET /patrol-routes JSON (with nested checkpoints) to PatrollingRoute. */
export function mapPatrolRouteFromApi(raw: Record<string, unknown>): PatrollingRoute {
  const st = String(raw['status'] ?? 'DRAFT');
  const status = (Object.values(RouteStatus) as string[]).includes(st) ? (st as RouteStatus) : RouteStatus.DRAFT;
  const sched = String(raw['scheduleType'] ?? 'ON_DEMAND');
  const scheduleType =
    sched === 'DAILY' || sched === 'WEEKLY' || sched === 'CUSTOM' || sched === 'ON_DEMAND' ? sched : 'ON_DEMAND';
  const checkpoints = Array.isArray(raw['checkpoints'])
    ? (raw['checkpoints'] as unknown[]).map((c, index) => {
        const cp = mapCheckpoint(c as Record<string, unknown>);
        const routeId = String(raw['id'] ?? '');
        // Legacy routes saved without checkpoint ids — derive a stable id for mobile scan links.
        if (!cp.id) {
          cp.id = `${routeId}-cp-${cp.order || index + 1}`;
        }
        return cp;
      })
    : [];
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    description: raw['description'] != null ? String(raw['description']) : undefined,
    code: raw['code'] != null ? String(raw['code']) : undefined,
    checkpoints,
    status,
    scheduleType,
    scheduleDays: Array.isArray(raw['scheduleDays']) ? (raw['scheduleDays'] as string[]) : undefined,
    scheduleTime: raw['scheduleTime'] != null ? String(raw['scheduleTime']) : undefined,
    startTime: raw['startTime'] != null ? String(raw['startTime']) : undefined,
    endTime: raw['endTime'] != null ? String(raw['endTime']) : undefined,
    estimatedDuration: raw['estimatedDuration'] != null ? Number(raw['estimatedDuration']) : undefined,
    assignedGuards: Array.isArray(raw['assignedGuards']) ? (raw['assignedGuards'] as string[]) : undefined,
    assignedShifts: Array.isArray(raw['assignedShifts']) ? (raw['assignedShifts'] as string[]) : undefined,
    requiresAllCheckpoints: Boolean(raw['requiresAllCheckpoints']),
    allowSkipping: Boolean(raw['allowSkipping']),
    maxLateMinutes: raw['maxLateMinutes'] != null ? Number(raw['maxLateMinutes']) : undefined,
    totalPatrols: raw['totalPatrols'] != null ? Number(raw['totalPatrols']) : undefined,
    completedPatrols: raw['completedPatrols'] != null ? Number(raw['completedPatrols']) : undefined,
    averageCompletionTime:
      raw['averageCompletionTime'] != null ? Number(raw['averageCompletionTime']) : undefined,
    lastPatrolAt: raw['lastPatrolAt'] != null ? parseDate(raw['lastPatrolAt']) : undefined,
    lastPatrolBy: raw['lastPatrolBy'] != null ? String(raw['lastPatrolBy']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]) : undefined,
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt']),
    createdBy: String(raw['createdBy'] ?? ''),
    updatedBy: raw['updatedBy'] != null ? String(raw['updatedBy']) : undefined
  };
}
