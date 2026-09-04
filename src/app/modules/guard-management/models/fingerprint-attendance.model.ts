/**
 * Fingerprint biometric attendance models.
 */

export type FingerprintAttendanceStatus = 'present' | 'absent' | 'late' | 'early-leave';

export type AttendanceDatePreset = 'today' | 'yesterday' | 'week' | 'month';

export interface FingerprintAttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  checkInTime: Date;
  checkOutTime?: Date;
  status: FingerprintAttendanceStatus;
  fingerprintMatch: number;
  deviceId: string;
  deviceName: string;
  location?: string;
}

export interface BiometricScannerDevice {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSync: Date;
  totalScans: number;
}

export interface FingerprintAttendanceFilter {
  searchTerm?: string;
  status?: FingerprintAttendanceStatus;
  deviceId?: string;
  datePreset?: AttendanceDatePreset;
}

export interface FingerprintAttendanceStatistics {
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  total: number;
  activeDevices: number;
}

export interface CaptureFingerprintRequest {
  fingerprintData: string;
  deviceId?: string;
  deviceName?: string;
  location?: string;
}

export interface FingerprintAttendanceResponse {
  success: boolean;
  message: string;
  record?: FingerprintAttendanceRecord;
  errors?: string[];
}
