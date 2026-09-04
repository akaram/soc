import { ActivePatrol, CheckpointScan, ScanStatus, ScanType } from '../models/checkpoint-scan.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

/** Maps GET /checkpoint-scans JSON to CheckpointScan. */
export function mapCheckpointScanFromApi(raw: Record<string, unknown>): CheckpointScan {
  return {
    id: String(raw['id'] ?? ''),
    checkpointId: String(raw['checkpointId'] ?? ''),
    checkpointName: String(raw['checkpointName'] ?? ''),
    checkpointCode: raw['checkpointCode'] != null ? String(raw['checkpointCode']) : undefined,
    routeId: String(raw['routeId'] ?? ''),
    routeName: String(raw['routeName'] ?? ''),
    scanType: (raw['scanType'] ?? ScanType.QR_CODE) as ScanType,
    scannedData: String(raw['scannedData'] ?? ''),
    scanTimestamp: parseDate(raw['scanTimestamp']),
    latitude: raw['latitude'] != null ? Number(raw['latitude']) : undefined,
    longitude: raw['longitude'] != null ? Number(raw['longitude']) : undefined,
    locationAccuracy: raw['locationAccuracy'] != null ? Number(raw['locationAccuracy']) : undefined,
    guardId: String(raw['guardId'] ?? ''),
    guardName: String(raw['guardName'] ?? ''),
    status: (raw['status'] ?? ScanStatus.VALID) as ScanStatus,
    isValid: Boolean(raw['isValid']),
    validationMessage: raw['validationMessage'] != null ? String(raw['validationMessage']) : undefined,
    expectedTime: raw['expectedTime'] != null ? parseDate(raw['expectedTime']) : undefined,
    actualTime: parseDate(raw['actualTime']),
    timeDifference: raw['timeDifference'] != null ? Number(raw['timeDifference']) : undefined,
    isOnTime: Boolean(raw['isOnTime']),
    isLate: Boolean(raw['isLate']),
    photoUrl: raw['photoUrl'] != null ? String(raw['photoUrl']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    deviceInfo: raw['deviceInfo'] != null ? String(raw['deviceInfo']) : undefined,
    appVersion: raw['appVersion'] != null ? String(raw['appVersion']) : undefined,
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt'])
  };
}

/** Maps GET /checkpoint-active-patrols JSON to ActivePatrol. */
export function mapActivePatrolFromApi(raw: Record<string, unknown>): ActivePatrol {
  const checkpoints = Array.isArray(raw['checkpoints'])
    ? (
        raw['checkpoints'] as Record<string, unknown>[]
      ).map(c => ({
        checkpointId: String(c['checkpointId'] ?? ''),
        checkpointName: String(c['checkpointName'] ?? ''),
        checkpointCode: c['checkpointCode'] != null ? String(c['checkpointCode']) : undefined,
        order: Number(c['order'] ?? 0),
        expectedTime: c['expectedTime'] != null ? parseDate(c['expectedTime']) : undefined,
        scannedAt: c['scannedAt'] != null ? parseDate(c['scannedAt']) : undefined,
        status: (c['status'] ?? 'PENDING') as 'PENDING' | 'COMPLETED' | 'MISSED' | 'LATE',
        scanId: c['scanId'] != null ? String(c['scanId']) : undefined
      }))
    : [];
  return {
    id: String(raw['id'] ?? ''),
    routeId: String(raw['routeId'] ?? ''),
    routeName: String(raw['routeName'] ?? ''),
    guardId: String(raw['guardId'] ?? ''),
    guardName: String(raw['guardName'] ?? ''),
    startTime: parseDate(raw['startTime']),
    expectedEndTime: raw['expectedEndTime'] != null ? parseDate(raw['expectedEndTime']) : undefined,
    actualEndTime: raw['actualEndTime'] != null ? parseDate(raw['actualEndTime']) : undefined,
    status: (raw['status'] ?? 'IN_PROGRESS') as ActivePatrol['status'],
    checkpoints,
    progress: Number(raw['progress'] ?? 0),
    completedCheckpoints: Number(raw['completedCheckpoints'] ?? 0),
    totalCheckpoints: Number(raw['totalCheckpoints'] ?? 0)
  };
}
