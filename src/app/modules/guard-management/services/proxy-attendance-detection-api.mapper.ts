/**
 * Maps between proxy attendance detection UI models and {@code /proxy-attendance-detection} API.
 */

import {
  ProxyAttendanceAlert,
  ProxyAttendanceStatistics,
  SuspiciousFactor,
  EvidenceItem,
  AlertStatus,
  AttendanceMethod,
  FactorType,
  FactorSeverity,
  EvidenceType,
  ProxyAttendanceFilter
} from '../models/proxy-attendance-detection.model';

export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function apiStatusToUi(value: string): AlertStatus {
  const map: Record<string, AlertStatus> = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    FRAUD: 'fraud',
    FALSE_POSITIVE: 'false-positive'
  };
  return map[String(value).toUpperCase().replace('-', '_')] ?? 'pending';
}

export function uiStatusToApi(value: AlertStatus): string {
  return value.toUpperCase().replace('-', '_');
}

export function apiMethodToUi(value: string): AttendanceMethod {
  const map: Record<string, AttendanceMethod> = {
    FACIAL_RECOGNITION: 'facial-recognition',
    BIOMETRIC: 'biometric',
    MANUAL: 'manual'
  };
  return map[String(value).toUpperCase().replace('-', '_')] ?? 'manual';
}

export function uiMethodToApi(value: AttendanceMethod): string {
  if (value === 'facial-recognition') return 'facial-recognition';
  return value.toUpperCase();
}

function parseFactorType(value: string): FactorType {
  const allowed: FactorType[] = [
    'location-mismatch',
    'time-anomaly',
    'biometric-mismatch',
    'pattern-anomaly',
    'device-anomaly',
    'multiple-attempts'
  ];
  const normalized = String(value).toLowerCase().replace('_', '-');
  return (allowed.find(a => a === normalized) ?? 'pattern-anomaly') as FactorType;
}

function parseSeverity(value: string): FactorSeverity {
  const s = String(value).toLowerCase();
  return s === 'high' || s === 'medium' || s === 'low' ? s : 'medium';
}

export function apiToFactor(raw: Record<string, unknown>): SuspiciousFactor {
  return {
    type: parseFactorType(String(raw['type'] ?? 'pattern-anomaly')),
    description: String(raw['description'] ?? ''),
    severity: parseSeverity(String(raw['severity'] ?? 'medium')),
    confidence: Number(raw['confidence'] ?? 0)
  };
}

export function apiToEvidence(raw: Record<string, unknown>): EvidenceItem {
  const typeRaw = String(raw['type'] ?? 'log').toLowerCase().replace('_', '-');
  const allowed: EvidenceType[] = ['image', 'video', 'log', 'location-data', 'device-info'];
  return {
    type: (allowed.find(t => t === typeRaw) ?? 'log') as EvidenceType,
    url: raw['url'] ? String(raw['url']) : undefined,
    description: String(raw['description'] ?? ''),
    timestamp: parseApiDate(raw['timestamp']) ?? new Date()
  };
}

export function apiToAlert(raw: Record<string, unknown>): ProxyAttendanceAlert {
  const factorsRaw = raw['suspiciousFactors'];
  const evidenceRaw = raw['evidence'];

  return {
    id: String(raw['id'] ?? ''),
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    attendanceDate: parseApiDate(raw['attendanceDate']) ?? new Date(),
    attendanceTime: String(raw['attendanceTime'] ?? ''),
    attendanceMethod: apiMethodToUi(String(raw['attendanceMethod'] ?? 'manual')),
    suspiciousFactors: Array.isArray(factorsRaw)
      ? (factorsRaw as Record<string, unknown>[]).map(apiToFactor)
      : [],
    riskScore: Number(raw['riskScore'] ?? 0),
    status: apiStatusToUi(String(raw['status'] ?? 'PENDING')),
    verifiedBy: raw['verifiedBy'] ? String(raw['verifiedBy']) : undefined,
    verifiedAt: parseApiDate(raw['verifiedAt']),
    notes: raw['notes'] ? String(raw['notes']) : undefined,
    evidence: Array.isArray(evidenceRaw)
      ? (evidenceRaw as Record<string, unknown>[]).map(apiToEvidence)
      : []
  };
}

export function apiToStatistics(raw: Record<string, unknown>): ProxyAttendanceStatistics {
  return {
    totalAlerts: Number(raw['totalAlerts'] ?? 0),
    pending: Number(raw['pending'] ?? 0),
    verified: Number(raw['verified'] ?? 0),
    fraud: Number(raw['fraud'] ?? 0),
    falsePositive: Number(raw['falsePositive'] ?? 0),
    highRisk: Number(raw['highRisk'] ?? 0),
    mediumRisk: Number(raw['mediumRisk'] ?? 0),
    lowRisk: Number(raw['lowRisk'] ?? 0)
  };
}

export function applyAlertFilter(
  alerts: ProxyAttendanceAlert[],
  filter?: ProxyAttendanceFilter
): ProxyAttendanceAlert[] {
  if (!filter) return alerts;
  let list = [...alerts];

  if (filter.status) list = list.filter(a => a.status === filter.status);
  if (filter.attendanceMethod) list = list.filter(a => a.attendanceMethod === filter.attendanceMethod);
  if (filter.riskLevel) {
    list = list.filter(a => {
      if (filter.riskLevel === 'high') return a.riskScore >= 80;
      if (filter.riskLevel === 'medium') return a.riskScore >= 50 && a.riskScore < 80;
      return a.riskScore < 50;
    });
  }
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    list = list.filter(
      a =>
        a.staffName.toLowerCase().includes(term) ||
        a.staffId.toLowerCase().includes(term)
    );
  }

  return list;
}

export function alertsToCsv(alerts: ProxyAttendanceAlert[]): string {
  const headers = [
    'Staff ID',
    'Staff Name',
    'Department',
    'Date',
    'Time',
    'Method',
    'Risk Score',
    'Status',
    'Factors',
    'Detected At'
  ];

  const rows = alerts.map(a => [
    a.staffId,
    a.staffName,
    a.department,
    a.attendanceDate.toISOString().split('T')[0],
    a.attendanceTime,
    a.attendanceMethod,
    String(a.riskScore),
    a.status,
    String(a.suspiciousFactors.length),
    a.attendanceDate.toISOString()
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
