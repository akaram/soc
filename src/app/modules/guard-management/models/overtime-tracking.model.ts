/** Overtime tracking UI models mapped to {@code /overtime-tracking} API. */

export type OvertimeType = 'regular' | 'holiday' | 'weekend' | 'night';

export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface OvertimeRecord {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  date: Date;
  startTime: string;
  endTime: string;
  totalHours: number;
  overtimeType: OvertimeType;
  rate: number;
  reason: string;
  status: OvertimeStatus;
  appliedDate: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  amount?: number;
  projectCode?: string;
  location?: string;
}

export interface OvertimeStatistics {
  totalHours: number;
  thisMonth: number;
  thisYear: number;
  pending: number;
  approved: number;
  totalAmount: number;
  averageHours: number;
}

export interface StaffOvertimeSummary {
  staffId: string;
  staffName: string;
  department: string;
  totalHours: number;
  thisMonth: number;
  pendingHours: number;
  approvedHours: number;
  totalAmount: number;
}

export interface OvertimeStaffMember {
  id: string;
  name: string;
  department: string;
  position: string;
  email?: string;
  phone?: string;
}

export interface CreateOvertimeRecord {
  staffId: string;
  overtimeDate: string;
  startTime: string;
  endTime: string;
  overtimeType: OvertimeType;
  rate?: number;
  reason: string;
  projectCode?: string;
  location?: string;
}

export interface OvertimeRecordFilter {
  status?: OvertimeStatus;
  overtimeType?: OvertimeType;
  searchTerm?: string;
  date?: string;
}

export interface OvertimeActionResponse {
  success: boolean;
  message: string;
}
