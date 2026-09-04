/** Proxy attendance detection UI models mapped to {@code /proxy-attendance-detection} API. */

export type AlertStatus = 'pending' | 'verified' | 'fraud' | 'false-positive';
export type AttendanceMethod = 'facial-recognition' | 'biometric' | 'manual';
export type FactorType =
  | 'location-mismatch'
  | 'time-anomaly'
  | 'biometric-mismatch'
  | 'pattern-anomaly'
  | 'device-anomaly'
  | 'multiple-attempts';
export type FactorSeverity = 'high' | 'medium' | 'low';
export type EvidenceType = 'image' | 'video' | 'log' | 'location-data' | 'device-info';

export interface SuspiciousFactor {
  type: FactorType;
  description: string;
  severity: FactorSeverity;
  confidence: number;
}

export interface EvidenceItem {
  type: EvidenceType;
  url?: string;
  description: string;
  timestamp: Date;
}

export interface ProxyAttendanceAlert {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  attendanceDate: Date;
  attendanceTime: string;
  attendanceMethod: AttendanceMethod;
  suspiciousFactors: SuspiciousFactor[];
  riskScore: number;
  status: AlertStatus;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
  evidence?: EvidenceItem[];
}

export interface ProxyAttendanceStatistics {
  totalAlerts: number;
  pending: number;
  verified: number;
  fraud: number;
  falsePositive: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
}

export interface ProxyAttendanceFilter {
  status?: AlertStatus;
  attendanceMethod?: AttendanceMethod;
  riskLevel?: 'high' | 'medium' | 'low';
  searchTerm?: string;
}

export interface DetectionRunResult {
  success: boolean;
  message: string;
  newAlerts?: number;
}

export interface AlertActionResponse {
  success: boolean;
  message: string;
}
