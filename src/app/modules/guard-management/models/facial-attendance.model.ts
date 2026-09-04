/**
 * Facial recognition attendance models.
 */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'early-leave';

export type AttendanceDatePreset = 'today' | 'yesterday' | 'week' | 'month';

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  checkInTime: Date;
  checkOutTime?: Date;
  status: AttendanceStatus;
  selfieUrl?: string;
  confidence: number;
  location?: string;
}

export interface AttendanceFilter {
  searchTerm?: string;
  status?: AttendanceStatus;
  datePreset?: AttendanceDatePreset;
}

export interface AttendanceStatistics {
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  total: number;
}

export interface CaptureAttendanceRequest {
  faceImage: string;
  location?: string;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
  record?: AttendanceRecord;
  errors?: string[];
}
