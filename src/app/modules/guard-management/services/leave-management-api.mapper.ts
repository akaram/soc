/**
 * Maps between leave management UI models and {@code /leave-management} API.
 */

import {
  LeaveRequest,
  LeaveBalance,
  LeaveStatistics,
  LeaveStaffMember,
  LeaveType,
  LeaveStatus,
  LeaveRequestFilter
} from '../models/leave-management.model';

export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function apiLeaveTypeToUi(value: string): LeaveType {
  const map: Record<string, LeaveType> = {
    SICK: 'sick',
    CASUAL: 'casual',
    ANNUAL: 'annual',
    EMERGENCY: 'emergency',
    MATERNITY: 'maternity',
    PATERNITY: 'paternity',
    UNPAID: 'unpaid'
  };
  return map[String(value).toUpperCase()] ?? 'casual';
}

export function uiLeaveTypeToApi(value: LeaveType): string {
  return value.toUpperCase();
}

export function apiStatusToUi(value: string): LeaveStatus {
  const map: Record<string, LeaveStatus> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled'
  };
  return map[String(value).toUpperCase()] ?? 'pending';
}

export function uiStatusToApi(value: LeaveStatus): string {
  return value.toUpperCase();
}

export function apiToLeaveRequest(raw: Record<string, unknown>): LeaveRequest {
  return {
    id: String(raw['id'] ?? ''),
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    leaveType: apiLeaveTypeToUi(String(raw['leaveType'] ?? 'CASUAL')),
    startDate: parseApiDate(raw['startDate']) ?? new Date(),
    endDate: parseApiDate(raw['endDate']) ?? new Date(),
    totalDays: Number(raw['totalDays'] ?? 1),
    reason: String(raw['reason'] ?? ''),
    status: apiStatusToUi(String(raw['status'] ?? 'PENDING')),
    appliedDate: parseApiDate(raw['appliedDate']) ?? new Date(),
    approvedBy: raw['approvedBy'] ? String(raw['approvedBy']) : undefined,
    approvedAt: parseApiDate(raw['approvedAt']),
    rejectionReason: raw['rejectionReason'] ? String(raw['rejectionReason']) : undefined
  };
}

export function apiToLeaveBalance(raw: Record<string, unknown>): LeaveBalance {
  const leaveTypeRaw = String(raw['leaveType'] ?? 'annual');
  return {
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    leaveType: leaveTypeRaw.includes('_') ? apiLeaveTypeToUi(leaveTypeRaw) : leaveTypeRaw,
    total: Number(raw['total'] ?? 0),
    used: Number(raw['used'] ?? 0),
    remaining: Number(raw['remaining'] ?? 0),
    pending: Number(raw['pending'] ?? 0)
  };
}

export function apiToStatistics(raw: Record<string, unknown>): LeaveStatistics {
  return {
    totalRequests: Number(raw['totalRequests'] ?? 0),
    pending: Number(raw['pending'] ?? 0),
    approved: Number(raw['approved'] ?? 0),
    rejected: Number(raw['rejected'] ?? 0),
    thisMonth: Number(raw['thisMonth'] ?? 0),
    thisYear: Number(raw['thisYear'] ?? 0)
  };
}

export function apiToStaffMember(raw: Record<string, unknown>): LeaveStaffMember {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    position: String(raw['position'] ?? 'Staff'),
    email: raw['email'] ? String(raw['email']) : undefined,
    phone: raw['phone'] ? String(raw['phone']) : undefined
  };
}

export function applyLeaveFilter(
  requests: LeaveRequest[],
  filter?: LeaveRequestFilter
): LeaveRequest[] {
  if (!filter) return requests;
  let list = [...requests];

  if (filter.status) list = list.filter(r => r.status === filter.status);
  if (filter.leaveType) list = list.filter(r => r.leaveType === filter.leaveType);
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    list = list.filter(
      r =>
        r.staffName.toLowerCase().includes(term) ||
        r.staffId.toLowerCase().includes(term)
    );
  }
  if (filter.date) {
    const date = new Date(filter.date);
    list = list.filter(r => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return date >= start && date <= end;
    });
  }

  return list;
}

export function toApiDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Month calendar range for approved leave indicators. */
export function getMonthRange(date: Date): { from: string; to: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: toApiDateString(from), to: toApiDateString(to) };
}
