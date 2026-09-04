/**
 * Maps between shift management UI models and {@code /shift-management} API.
 */

import {
  ShiftDefinition,
  ShiftSchedule,
  ShiftStaffMember,
  ShiftManagementStatistics,
  ShiftAssignmentStatus,
  ShiftManagementFilter
} from '../models/shift-management.model';

export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function apiStatusToUi(status: string): ShiftAssignmentStatus {
  const map: Record<string, ShiftAssignmentStatus> = {
    SCHEDULED: 'scheduled',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ABSENT: 'absent'
  };
  return map[String(status).toUpperCase()] ?? 'scheduled';
}

export function uiStatusToApi(status: ShiftAssignmentStatus): string {
  return status.toUpperCase();
}

export function apiToShiftDefinition(raw: Record<string, unknown>): ShiftDefinition {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    startTime: String(raw['startTime'] ?? ''),
    endTime: String(raw['endTime'] ?? ''),
    duration: Number(raw['duration'] ?? 8),
    color: String(raw['color'] ?? '#9b59b6'),
    description: raw['description'] ? String(raw['description']) : undefined,
    isActive: raw['isActive'] !== false
  };
}

export function apiToShiftSchedule(raw: Record<string, unknown>): ShiftSchedule {
  return {
    id: String(raw['id'] ?? ''),
    shiftId: String(raw['shiftId'] ?? ''),
    shiftName: String(raw['shiftName'] ?? ''),
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    staffDepartment: raw['staffDepartment'] ? String(raw['staffDepartment']) : undefined,
    date: parseApiDate(raw['assignmentDate']) ?? new Date(),
    status: apiStatusToUi(String(raw['status'] ?? 'SCHEDULED')),
    location: raw['location'] ? String(raw['location']) : undefined,
    notes: raw['notes'] ? String(raw['notes']) : undefined
  };
}

export function apiToStaffMember(raw: Record<string, unknown>): ShiftStaffMember {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    position: String(raw['position'] ?? 'Staff'),
    email: raw['email'] ? String(raw['email']) : undefined,
    phone: raw['phone'] ? String(raw['phone']) : undefined
  };
}

export function apiToStatistics(raw: Record<string, unknown>): ShiftManagementStatistics {
  return {
    scheduled: Number(raw['scheduled'] ?? 0),
    confirmed: Number(raw['confirmed'] ?? 0),
    pending: Number(raw['pending'] ?? 0),
    completed: Number(raw['completed'] ?? 0),
    activeShifts: Number(raw['activeShifts'] ?? 0)
  };
}

/** Client-side filter for list view when API returns a broad date range. */
export function applyShiftFilter(
  schedules: ShiftSchedule[],
  filter?: ShiftManagementFilter
): ShiftSchedule[] {
  if (!filter) return schedules;
  let list = [...schedules];

  if (filter.status) {
    list = list.filter(s => s.status === filter.status);
  }
  if (filter.shiftId) {
    list = list.filter(s => s.shiftId === filter.shiftId);
  }
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    list = list.filter(
      s =>
        s.staffName.toLowerCase().includes(term) ||
        s.shiftName.toLowerCase().includes(term)
    );
  }
  if (filter.from) {
    const from = new Date(filter.from);
    list = list.filter(s => s.date >= from);
  }
  if (filter.to) {
    const to = new Date(filter.to);
    to.setHours(23, 59, 59, 999);
    list = list.filter(s => s.date <= to);
  }

  return list;
}

/** Format Date as YYYY-MM-DD for API query params. */
export function toApiDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Sunday-based week range for calendar navigation. */
export function getWeekRange(date: Date): { from: string; to: string; days: Date[] } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const end = days[6];
  return { from: toApiDateString(days[0]), to: toApiDateString(end), days };
}
