/** Double shift detection UI models mapped to {@code /double-shift-detection} API. */

export type ConflictSeverity = 'high' | 'medium' | 'low';
export type ConflictStatus = 'pending' | 'resolved' | 'ignored';
export type ConflictType = 'full-overlap' | 'partial-overlap' | 'consecutive';

export interface ShiftConflictDetail {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface DoubleShiftConflict {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  firstShift: ShiftConflictDetail;
  secondShift: ShiftConflictDetail;
  overlapDuration: number;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  status: ConflictStatus;
  detectedAt: Date;
  resolvedAt?: Date;
  resolutionNote?: string;
}

export interface DoubleShiftStatistics {
  totalDetected: number;
  pending: number;
  resolved: number;
  ignored: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
}

export interface DoubleShiftFilter {
  severity?: ConflictSeverity;
  status?: ConflictStatus;
  conflictType?: ConflictType;
  searchTerm?: string;
}

export interface DetectionRunResult {
  success: boolean;
  message: string;
  newConflicts?: number;
}

export interface ConflictActionResponse {
  success: boolean;
  message: string;
}
