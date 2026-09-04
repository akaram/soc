/**
 * Maps between double shift detection UI models and {@code /double-shift-detection} API.
 */

import {
  DoubleShiftConflict,
  DoubleShiftStatistics,
  ConflictSeverity,
  ConflictStatus,
  ConflictType,
  DoubleShiftFilter
} from '../models/double-shift-detection.model';

export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function apiSeverityToUi(value: string): ConflictSeverity {
  const map: Record<string, ConflictSeverity> = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
  };
  return map[String(value).toUpperCase()] ?? 'medium';
}

export function uiSeverityToApi(value: ConflictSeverity): string {
  return value.toUpperCase();
}

export function apiStatusToUi(value: string): ConflictStatus {
  const map: Record<string, ConflictStatus> = {
    PENDING: 'pending',
    RESOLVED: 'resolved',
    IGNORED: 'ignored'
  };
  return map[String(value).toUpperCase()] ?? 'pending';
}

export function uiStatusToApi(value: ConflictStatus): string {
  return value.toUpperCase();
}

export function apiConflictTypeToUi(value: string): ConflictType {
  const map: Record<string, ConflictType> = {
    FULL_OVERLAP: 'full-overlap',
    PARTIAL_OVERLAP: 'partial-overlap',
    CONSECUTIVE: 'consecutive'
  };
  return map[String(value).toUpperCase()] ?? 'partial-overlap';
}

export function uiConflictTypeToApi(value: ConflictType): string {
  return value.toUpperCase().replace('-', '_');
}

export function apiToConflict(raw: Record<string, unknown>): DoubleShiftConflict {
  return {
    id: String(raw['id'] ?? ''),
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    firstShift: {
      id: String(raw['firstAssignmentId'] ?? ''),
      name: String(raw['firstShiftName'] ?? ''),
      date: parseApiDate(raw['firstAssignmentDate']) ?? new Date(),
      startTime: String(raw['firstStartTime'] ?? ''),
      endTime: String(raw['firstEndTime'] ?? ''),
      location: raw['firstLocation'] ? String(raw['firstLocation']) : undefined
    },
    secondShift: {
      id: String(raw['secondAssignmentId'] ?? ''),
      name: String(raw['secondShiftName'] ?? ''),
      date: parseApiDate(raw['secondAssignmentDate']) ?? new Date(),
      startTime: String(raw['secondStartTime'] ?? ''),
      endTime: String(raw['secondEndTime'] ?? ''),
      location: raw['secondLocation'] ? String(raw['secondLocation']) : undefined
    },
    overlapDuration: Number(raw['overlapDuration'] ?? 0),
    conflictType: apiConflictTypeToUi(String(raw['conflictType'] ?? 'PARTIAL_OVERLAP')),
    severity: apiSeverityToUi(String(raw['severity'] ?? 'MEDIUM')),
    status: apiStatusToUi(String(raw['status'] ?? 'PENDING')),
    detectedAt: parseApiDate(raw['detectedAt']) ?? new Date(),
    resolvedAt: parseApiDate(raw['resolvedAt']),
    resolutionNote: raw['resolutionNote'] ? String(raw['resolutionNote']) : undefined
  };
}

export function apiToStatistics(raw: Record<string, unknown>): DoubleShiftStatistics {
  return {
    totalDetected: Number(raw['totalDetected'] ?? 0),
    pending: Number(raw['pending'] ?? 0),
    resolved: Number(raw['resolved'] ?? 0),
    ignored: Number(raw['ignored'] ?? 0),
    highSeverity: Number(raw['highSeverity'] ?? 0),
    mediumSeverity: Number(raw['mediumSeverity'] ?? 0),
    lowSeverity: Number(raw['lowSeverity'] ?? 0)
  };
}

/** Client-side filter when API returns unfiltered list. */
export function applyConflictFilter(
  conflicts: DoubleShiftConflict[],
  filter?: DoubleShiftFilter
): DoubleShiftConflict[] {
  if (!filter) return conflicts;
  let list = [...conflicts];

  if (filter.severity) list = list.filter(c => c.severity === filter.severity);
  if (filter.status) list = list.filter(c => c.status === filter.status);
  if (filter.conflictType) list = list.filter(c => c.conflictType === filter.conflictType);
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    list = list.filter(
      c =>
        c.staffName.toLowerCase().includes(term) ||
        c.staffId.toLowerCase().includes(term)
    );
  }

  return list;
}

/** Build CSV export from conflict rows. */
export function conflictsToCsv(conflicts: DoubleShiftConflict[]): string {
  const headers = [
    'Staff ID',
    'Staff Name',
    'Department',
    'Severity',
    'Type',
    'Status',
    'Overlap (min)',
    'First Shift',
    'First Date',
    'First Time',
    'Second Shift',
    'Second Date',
    'Second Time',
    'Detected At'
  ];

  const rows = conflicts.map(c => [
    c.staffId,
    c.staffName,
    c.department,
    c.severity,
    c.conflictType,
    c.status,
    String(c.overlapDuration),
    c.firstShift.name,
    c.firstShift.date.toISOString().split('T')[0],
    `${c.firstShift.startTime}-${c.firstShift.endTime}`,
    c.secondShift.name,
    c.secondShift.date.toISOString().split('T')[0],
    `${c.secondShift.startTime}-${c.secondShift.endTime}`,
    c.detectedAt.toISOString()
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
