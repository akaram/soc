/** Leave management UI models mapped to {@code /leave-management} API. */

export type LeaveType =
  | 'sick'
  | 'casual'
  | 'annual'
  | 'emergency'
  | 'maternity'
  | 'paternity'
  | 'unpaid';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

export interface LeaveBalance {
  staffId: string;
  staffName: string;
  leaveType: string;
  total: number;
  used: number;
  remaining: number;
  pending: number;
}

export interface LeaveStatistics {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  thisMonth: number;
  thisYear: number;
}

export interface LeaveStaffMember {
  id: string;
  name: string;
  department: string;
  position: string;
  email?: string;
  phone?: string;
}

export interface CreateLeaveRequest {
  staffId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveRequestFilter {
  status?: LeaveStatus;
  leaveType?: LeaveType;
  searchTerm?: string;
  date?: string;
}

export interface LeaveActionResponse {
  success: boolean;
  message: string;
}
