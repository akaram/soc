/**
 * Maps between facial attendance UI models and the live {@code /facial-attendance} API.
 */

import {
  AttendanceRecord,
  AttendanceStatistics,
  AttendanceStatus,
  AttendanceFilter
} from '../models/facial-attendance.model';

/** Parse API date strings into Date objects */
export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Map backend status enum to UI kebab-case */
export function apiStatusToUi(status: string): AttendanceStatus {
  const map: Record<string, AttendanceStatus> = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    EARLY_LEAVE: 'early-leave'
  };
  return map[String(status).toUpperCase()] ?? 'present';
}

/** Map UI status to backend enum */
export function uiStatusToApi(status: AttendanceStatus): string {
  return status.toUpperCase().replace('-', '_');
}

/** Raw attendance row from API */
export function apiToAttendanceRecord(raw: Record<string, unknown>): AttendanceRecord {
  return {
    id: String(raw['id'] ?? ''),
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    checkInTime: parseApiDate(raw['checkInTime']) ?? new Date(),
    checkOutTime: parseApiDate(raw['checkOutTime']),
    status: apiStatusToUi(String(raw['status'] ?? 'PRESENT')),
    selfieUrl: raw['selfieUrl'] ? String(raw['selfieUrl']) : undefined,
    confidence: raw['confidence'] != null ? Number(raw['confidence']) : 0,
    location: raw['location'] ? String(raw['location']) : undefined
  };
}

/** Map statistics DTO from API */
export function apiToStatistics(raw: Record<string, unknown>): AttendanceStatistics {
  return {
    present: Number(raw['present'] ?? 0),
    absent: Number(raw['absent'] ?? 0),
    late: Number(raw['late'] ?? 0),
    earlyLeave: Number(raw['earlyLeave'] ?? 0),
    total: Number(raw['total'] ?? 0)
  };
}

/** Client-side filter on loaded records (search/status) */
export function applyAttendanceFilter(
  records: AttendanceRecord[],
  filter?: AttendanceFilter
): AttendanceRecord[] {
  if (!filter) return records;
  let list = [...records];
  if (filter.status) {
    list = list.filter(r => r.status === filter.status);
  }
  if (filter.searchTerm) {
    const s = filter.searchTerm.toLowerCase();
    list = list.filter(
      r =>
        r.staffName.toLowerCase().includes(s) ||
        r.staffId.toLowerCase().includes(s) ||
        r.department.toLowerCase().includes(s)
    );
  }
  return list;
}

/** Compute stats from a record list (for filtered views) */
export function computeStatistics(records: AttendanceRecord[]): AttendanceStatistics {
  return {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    earlyLeave: records.filter(r => r.status === 'early-leave').length,
    total: records.length
  };
}
