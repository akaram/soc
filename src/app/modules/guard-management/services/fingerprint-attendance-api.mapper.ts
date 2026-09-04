/**
 * Maps between fingerprint attendance UI models and {@code /fingerprint-attendance} API.
 */

import {
  FingerprintAttendanceRecord,
  FingerprintAttendanceStatistics,
  FingerprintAttendanceStatus,
  FingerprintAttendanceFilter,
  BiometricScannerDevice
} from '../models/fingerprint-attendance.model';

export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function apiStatusToUi(status: string): FingerprintAttendanceStatus {
  const map: Record<string, FingerprintAttendanceStatus> = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    EARLY_LEAVE: 'early-leave'
  };
  return map[String(status).toUpperCase()] ?? 'present';
}

export function uiStatusToApi(status: FingerprintAttendanceStatus): string {
  return status.toUpperCase().replace('-', '_');
}

export function apiToFingerprintRecord(raw: Record<string, unknown>): FingerprintAttendanceRecord {
  return {
    id: String(raw['id'] ?? ''),
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    checkInTime: parseApiDate(raw['checkInTime']) ?? new Date(),
    checkOutTime: parseApiDate(raw['checkOutTime']),
    status: apiStatusToUi(String(raw['status'] ?? 'PRESENT')),
    fingerprintMatch: raw['fingerprintMatch'] != null ? Number(raw['fingerprintMatch']) : 0,
    deviceId: String(raw['deviceId'] ?? ''),
    deviceName: String(raw['deviceName'] ?? 'Fingerprint Scanner'),
    location: raw['location'] ? String(raw['location']) : undefined
  };
}

export function apiToStatistics(raw: Record<string, unknown>): FingerprintAttendanceStatistics {
  return {
    present: Number(raw['present'] ?? 0),
    absent: Number(raw['absent'] ?? 0),
    late: Number(raw['late'] ?? 0),
    earlyLeave: Number(raw['earlyLeave'] ?? 0),
    total: Number(raw['total'] ?? 0),
    activeDevices: Number(raw['activeDevices'] ?? 0)
  };
}

export function apiToDevice(raw: Record<string, unknown>): BiometricScannerDevice {
  const statusRaw = String(raw['status'] ?? 'offline').toLowerCase();
  const status =
    statusRaw === 'online' || statusRaw === 'offline' || statusRaw === 'maintenance'
      ? statusRaw
      : 'offline';
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? 'Fingerprint Scanner'),
    location: String(raw['location'] ?? ''),
    status,
    lastSync: parseApiDate(raw['lastSync']) ?? new Date(),
    totalScans: Number(raw['totalScans'] ?? 0)
  };
}

export function applyFingerprintFilter(
  records: FingerprintAttendanceRecord[],
  filter?: FingerprintAttendanceFilter
): FingerprintAttendanceRecord[] {
  if (!filter) return records;
  let list = [...records];
  if (filter.status) list = list.filter(r => r.status === filter.status);
  if (filter.deviceId) list = list.filter(r => r.deviceId === filter.deviceId);
  if (filter.searchTerm) {
    const s = filter.searchTerm.toLowerCase();
    list = list.filter(
      r =>
        r.staffName.toLowerCase().includes(s) ||
        r.staffId.toLowerCase().includes(s) ||
        r.deviceName.toLowerCase().includes(s)
    );
  }
  return list;
}
