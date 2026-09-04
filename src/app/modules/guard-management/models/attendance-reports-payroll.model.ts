/** Attendance reports & payroll UI models mapped to {@code /attendance-reports-payroll} API. */

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom' | 'summary';
export type ReportStatus = 'draft' | 'final' | 'exported';

export type PayrollSystem = 'sap' | 'adp' | 'paychex' | 'quickbooks' | 'custom';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';
export type SyncFrequency = 'real-time' | 'daily' | 'weekly' | 'monthly';
export type SyncResultStatus = 'success' | 'failed' | 'partial';

export type PayrollDataStatus = 'pending' | 'processed' | 'paid';

export interface AttendanceReport {
  id: string;
  reportType: ReportType;
  title: string;
  period: { startDate: Date; endDate: Date };
  generatedAt: Date;
  generatedBy: string;
  totalStaff: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalOvertime: number;
  status: ReportStatus;
  fileUrl?: string;
  payrollSynced: boolean;
  syncedAt?: Date;
}

export interface PayrollIntegration {
  id: string;
  payrollSystem: PayrollSystem;
  systemName: string;
  status: IntegrationStatus;
  lastSync?: Date;
  syncFrequency: SyncFrequency;
  totalRecords: number;
  lastSyncStatus?: SyncResultStatus;
  errorMessage?: string;
  apiEndpoint?: string;
}

export interface PayrollData {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  period: string;
  regularHours: number;
  overtimeHours: number;
  leaveDays: number;
  presentDays: number;
  absentDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  status: PayrollDataStatus;
  payrollId?: string;
}

export interface ReportStatistics {
  totalReports: number;
  thisMonth: number;
  payrollSynced: number;
  pendingSync: number;
}

export interface GenerateReportRequest {
  reportType: ReportType;
  startDate?: string;
  endDate?: string;
  title?: string;
}

export interface CreateIntegrationRequest {
  payrollSystem: PayrollSystem;
  systemName: string;
  syncFrequency: SyncFrequency;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface ActionResponse {
  success: boolean;
  message: string;
}

export interface ReportFilter {
  reportType?: ReportType;
  status?: ReportStatus;
  searchTerm?: string;
}

export interface PayrollDataFilter {
  status?: PayrollDataStatus;
  searchTerm?: string;
  period?: string;
}
