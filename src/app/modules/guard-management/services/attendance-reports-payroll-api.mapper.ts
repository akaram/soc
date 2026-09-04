/**
 * Maps between attendance reports & payroll UI models and API.
 */

import {
  AttendanceReport,
  PayrollIntegration,
  PayrollData,
  ReportStatistics,
  ReportType,
  ReportStatus,
  PayrollSystem,
  IntegrationStatus,
  SyncFrequency,
  SyncResultStatus,
  PayrollDataStatus,
  ReportFilter,
  PayrollDataFilter
} from '../models/attendance-reports-payroll.model';

export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function apiReportTypeToUi(value: string): ReportType {
  const map: Record<string, ReportType> = {
    DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly',
    CUSTOM: 'custom', SUMMARY: 'summary'
  };
  return map[String(value).toUpperCase()] ?? 'custom';
}

export function uiReportTypeToApi(value: ReportType): string {
  return value.toUpperCase();
}

export function apiReportStatusToUi(value: string): ReportStatus {
  const map: Record<string, ReportStatus> = {
    DRAFT: 'draft', FINAL: 'final', EXPORTED: 'exported'
  };
  return map[String(value).toUpperCase()] ?? 'draft';
}

export function uiReportStatusToApi(value: ReportStatus): string {
  return value.toUpperCase();
}

export function apiPayrollSystemToUi(value: string): PayrollSystem {
  const map: Record<string, PayrollSystem> = {
    SAP: 'sap', ADP: 'adp', PAYCHEX: 'paychex', QUICKBOOKS: 'quickbooks', CUSTOM: 'custom'
  };
  return map[String(value).toUpperCase()] ?? 'custom';
}

export function uiPayrollSystemToApi(value: PayrollSystem): string {
  return value.toUpperCase();
}

export function apiIntegrationStatusToUi(value: string): IntegrationStatus {
  const map: Record<string, IntegrationStatus> = {
    CONNECTED: 'connected', DISCONNECTED: 'disconnected', ERROR: 'error'
  };
  return map[String(value).toUpperCase()] ?? 'disconnected';
}

export function apiSyncFrequencyToUi(value: string): SyncFrequency {
  const map: Record<string, SyncFrequency> = {
    REAL_TIME: 'real-time', DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly'
  };
  return map[String(value).toUpperCase()] ?? 'daily';
}

export function uiSyncFrequencyToApi(value: SyncFrequency): string {
  return value === 'real-time' ? 'REAL_TIME' : value.toUpperCase();
}

export function apiSyncResultToUi(value: string | undefined): SyncResultStatus | undefined {
  if (!value) return undefined;
  const map: Record<string, SyncResultStatus> = {
    SUCCESS: 'success', FAILED: 'failed', PARTIAL: 'partial'
  };
  return map[String(value).toUpperCase()];
}

export function apiPayrollDataStatusToUi(value: string): PayrollDataStatus {
  const map: Record<string, PayrollDataStatus> = {
    PENDING: 'pending', PROCESSED: 'processed', PAID: 'paid'
  };
  return map[String(value).toUpperCase()] ?? 'pending';
}

export function uiPayrollDataStatusToApi(value: PayrollDataStatus): string {
  return value.toUpperCase();
}

export function apiToAttendanceReport(raw: Record<string, unknown>): AttendanceReport {
  return {
    id: String(raw['id'] ?? ''),
    reportType: apiReportTypeToUi(String(raw['reportType'] ?? 'CUSTOM')),
    title: String(raw['title'] ?? ''),
    period: {
      startDate: parseApiDate(raw['startDate']) ?? new Date(),
      endDate: parseApiDate(raw['endDate']) ?? new Date()
    },
    generatedAt: parseApiDate(raw['generatedAt']) ?? new Date(),
    generatedBy: String(raw['generatedBy'] ?? 'Admin'),
    totalStaff: Number(raw['totalStaff'] ?? 0),
    totalPresent: Number(raw['totalPresent'] ?? 0),
    totalAbsent: Number(raw['totalAbsent'] ?? 0),
    totalLate: Number(raw['totalLate'] ?? 0),
    totalOvertime: Number(raw['totalOvertime'] ?? 0),
    status: apiReportStatusToUi(String(raw['status'] ?? 'DRAFT')),
    fileUrl: raw['fileUrl'] ? String(raw['fileUrl']) : undefined,
    payrollSynced: Boolean(raw['payrollSynced']),
    syncedAt: parseApiDate(raw['syncedAt'])
  };
}

export function apiToPayrollIntegration(raw: Record<string, unknown>): PayrollIntegration {
  return {
    id: String(raw['id'] ?? ''),
    payrollSystem: apiPayrollSystemToUi(String(raw['payrollSystem'] ?? 'CUSTOM')),
    systemName: String(raw['systemName'] ?? ''),
    status: apiIntegrationStatusToUi(String(raw['status'] ?? 'DISCONNECTED')),
    lastSync: parseApiDate(raw['lastSync']),
    syncFrequency: apiSyncFrequencyToUi(String(raw['syncFrequency'] ?? 'DAILY')),
    totalRecords: Number(raw['totalRecords'] ?? 0),
    lastSyncStatus: apiSyncResultToUi(raw['lastSyncStatus'] ? String(raw['lastSyncStatus']) : undefined),
    errorMessage: raw['errorMessage'] ? String(raw['errorMessage']) : undefined,
    apiEndpoint: raw['apiEndpoint'] ? String(raw['apiEndpoint']) : undefined
  };
}

export function apiToPayrollData(raw: Record<string, unknown>): PayrollData {
  return {
    id: String(raw['id'] ?? ''),
    staffId: String(raw['staffId'] ?? ''),
    staffName: String(raw['staffName'] ?? ''),
    department: String(raw['department'] ?? 'Security'),
    period: String(raw['period'] ?? ''),
    regularHours: Number(raw['regularHours'] ?? 0),
    overtimeHours: Number(raw['overtimeHours'] ?? 0),
    leaveDays: Number(raw['leaveDays'] ?? 0),
    presentDays: Number(raw['presentDays'] ?? 0),
    absentDays: Number(raw['absentDays'] ?? 0),
    grossSalary: Number(raw['grossSalary'] ?? 0),
    deductions: Number(raw['deductions'] ?? 0),
    netSalary: Number(raw['netSalary'] ?? 0),
    status: apiPayrollDataStatusToUi(String(raw['status'] ?? 'PENDING')),
    payrollId: raw['payrollId'] ? String(raw['payrollId']) : undefined
  };
}

export function apiToStatistics(raw: Record<string, unknown>): ReportStatistics {
  return {
    totalReports: Number(raw['totalReports'] ?? 0),
    thisMonth: Number(raw['thisMonth'] ?? 0),
    payrollSynced: Number(raw['payrollSynced'] ?? 0),
    pendingSync: Number(raw['pendingSync'] ?? 0)
  };
}

export function applyReportFilter(reports: AttendanceReport[], filter?: ReportFilter): AttendanceReport[] {
  if (!filter) return reports;
  let list = [...reports];
  if (filter.reportType) list = list.filter(r => r.reportType === filter.reportType);
  if (filter.status) list = list.filter(r => r.status === filter.status);
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    list = list.filter(r => r.title.toLowerCase().includes(term));
  }
  return list;
}

export function applyPayrollDataFilter(data: PayrollData[], filter?: PayrollDataFilter): PayrollData[] {
  if (!filter) return data;
  let list = [...data];
  if (filter.status) list = list.filter(d => d.status === filter.status);
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    list = list.filter(
      d => d.staffName.toLowerCase().includes(term) || d.staffId.toLowerCase().includes(term)
    );
  }
  if (filter.period) {
    const term = filter.period.toLowerCase();
    list = list.filter(d => d.period.toLowerCase().includes(term));
  }
  return list;
}

export function getReportTypeLabel(type: ReportType): string {
  const labels: Record<ReportType, string> = {
    daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', custom: 'Custom', summary: 'Summary'
  };
  return labels[type] ?? type;
}

export function getReportStatusLabel(status: ReportStatus): string {
  const labels: Record<ReportStatus, string> = {
    draft: 'Draft', final: 'Final', exported: 'Exported'
  };
  return labels[status] ?? status;
}

export function getPayrollSystemLabel(system: PayrollSystem): string {
  const labels: Record<PayrollSystem, string> = {
    sap: 'SAP', adp: 'ADP', paychex: 'Paychex', quickbooks: 'QuickBooks', custom: 'Custom'
  };
  return labels[system] ?? system;
}

export function getIntegrationStatusLabel(status: IntegrationStatus): string {
  const labels: Record<IntegrationStatus, string> = {
    connected: 'Connected', disconnected: 'Disconnected', error: 'Error'
  };
  return labels[status] ?? status;
}

export function getSyncFrequencyLabel(frequency: SyncFrequency): string {
  const labels: Record<SyncFrequency, string> = {
    'real-time': 'Real-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly'
  };
  return labels[frequency] ?? frequency;
}

export function getSyncStatusLabel(status: SyncResultStatus): string {
  const labels: Record<SyncResultStatus, string> = {
    success: 'Success', failed: 'Failed', partial: 'Partial'
  };
  return labels[status] ?? status;
}

export function getDataStatusLabel(status: PayrollDataStatus): string {
  const labels: Record<PayrollDataStatus, string> = {
    pending: 'Pending', processed: 'Processed', paid: 'Paid'
  };
  return labels[status] ?? status;
}
