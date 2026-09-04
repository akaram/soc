/**
 * Maps between overtime tracking UI models and {@code /overtime-tracking} API.
 */

import {
  OvertimeRecord,
  OvertimeStatistics,
  StaffOvertimeSummary,
  OvertimeStaffMember,
  OvertimeType,
  OvertimeStatus,
  OvertimeRecordFilter
} from '../models/overtime-tracking.model';

export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function apiOvertimeTypeToUi(value: string): OvertimeType {
  const map: Record<string, OvertimeType> = {
    REGULAR: 'regular',
    HOLIDAY: 'holiday',
    WEEKEND: 'weekend',
    NIGHT: 'night'
  };
  return map[String(value).toUpperCase()] ?? 'regular';
}

export function uiOvertimeTypeToApi(value: OvertimeType): string {
  return value.toUpperCase();
}

export function apiStatusToUi(value: string): OvertimeStatus {
  const map: Record<string, OvertimeStatus> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PAID: 'paid'
  };
  return map[String(value).toUpperCase()] ?? 'pending';
}

export function uiStatusToApi(value: OvertimeStatus): string {
  return value.toUpperCase();
}

export function apiToOvertimeRecord(raw: Record<string, unknown>): OvertimeRecord {
  return {
    id: String(raw['id'] ?? ''),
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    date: parseApiDate(raw['overtimeDate']) ?? new Date(),
    startTime: String(raw['startTime'] ?? ''),
    endTime: String(raw['endTime'] ?? ''),
    totalHours: Number(raw['totalHours'] ?? 0),
    overtimeType: apiOvertimeTypeToUi(String(raw['overtimeType'] ?? 'REGULAR')),
    rate: Number(raw['rate'] ?? 1.5),
    reason: String(raw['reason'] ?? ''),
    status: apiStatusToUi(String(raw['status'] ?? 'PENDING')),
    appliedDate: parseApiDate(raw['appliedDate']) ?? new Date(),
    approvedBy: raw['approvedBy'] ? String(raw['approvedBy']) : undefined,
    approvedAt: parseApiDate(raw['approvedAt']),
    rejectionReason: raw['rejectionReason'] ? String(raw['rejectionReason']) : undefined,
    amount: raw['amount'] != null ? Number(raw['amount']) : undefined,
    projectCode: raw['projectCode'] ? String(raw['projectCode']) : undefined,
    location: raw['location'] ? String(raw['location']) : undefined
  };
}

export function apiToStatistics(raw: Record<string, unknown>): OvertimeStatistics {
  return {
    totalHours: Number(raw['totalHours'] ?? 0),
    thisMonth: Number(raw['thisMonth'] ?? 0),
    thisYear: Number(raw['thisYear'] ?? 0),
    pending: Number(raw['pending'] ?? 0),
    approved: Number(raw['approved'] ?? 0),
    totalAmount: Number(raw['totalAmount'] ?? 0),
    averageHours: Number(raw['averageHours'] ?? 0)
  };
}

export function apiToStaffSummary(raw: Record<string, unknown>): StaffOvertimeSummary {
  return {
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    totalHours: Number(raw['totalHours'] ?? 0),
    thisMonth: Number(raw['thisMonth'] ?? 0),
    pendingHours: Number(raw['pendingHours'] ?? 0),
    approvedHours: Number(raw['approvedHours'] ?? 0),
    totalAmount: Number(raw['totalAmount'] ?? 0)
  };
}

export function apiToStaffMember(raw: Record<string, unknown>): OvertimeStaffMember {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    position: String(raw['position'] ?? 'Staff'),
    email: raw['email'] ? String(raw['email']) : undefined,
    phone: raw['phone'] ? String(raw['phone']) : undefined
  };
}

/** Client-side filter when API params are not enough. */
export function applyOvertimeFilter(
  records: OvertimeRecord[],
  filter?: OvertimeRecordFilter
): OvertimeRecord[] {
  if (!filter) return records;
  let list = [...records];

  if (filter.status) list = list.filter(r => r.status === filter.status);
  if (filter.overtimeType) list = list.filter(r => r.overtimeType === filter.overtimeType);
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    list = list.filter(
      r =>
        r.staffName.toLowerCase().includes(term) ||
        r.staffId.toLowerCase().includes(term)
    );
  }
  if (filter.date) {
    const dateStr = filter.date;
    list = list.filter(r => {
      const recordDate = new Date(r.date).toISOString().split('T')[0];
      return recordDate === dateStr;
    });
  }

  return list;
}

export function getOvertimeTypeLabel(type: OvertimeType): string {
  const labels: Record<OvertimeType, string> = {
    regular: 'Regular',
    holiday: 'Holiday',
    weekend: 'Weekend',
    night: 'Night Shift'
  };
  return labels[type] ?? type;
}

export function getStatusLabel(status: OvertimeStatus): string {
  const labels: Record<OvertimeStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid'
  };
  return labels[status] ?? status;
}
