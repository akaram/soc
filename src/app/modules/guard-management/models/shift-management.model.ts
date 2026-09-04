/** Shift management & scheduling UI models mapped to {@code /shift-management} API. */

export type ShiftAssignmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'absent';

export interface ShiftDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  color: string;
  description?: string;
  isActive?: boolean;
}

export interface ShiftSchedule {
  id: string;
  shiftId: string;
  shiftName: string;
  staffId: string;
  staffName: string;
  staffDepartment?: string;
  date: Date;
  status: ShiftAssignmentStatus;
  location?: string;
  notes?: string;
}

export interface ShiftStaffMember {
  id: string;
  name: string;
  department: string;
  position: string;
  email?: string;
  phone?: string;
}

export interface ShiftManagementStatistics {
  scheduled: number;
  confirmed: number;
  pending: number;
  completed: number;
  activeShifts: number;
}

export interface CreateShiftRequest {
  name: string;
  startTime: string;
  endTime: string;
  duration?: number;
  color?: string;
  description?: string;
}

export interface CreateAssignmentRequest {
  shiftId: string;
  staffId: string;
  assignmentDate: string;
  status?: ShiftAssignmentStatus;
  location?: string;
  notes?: string;
}

export interface ShiftManagementFilter {
  from?: string;
  to?: string;
  status?: ShiftAssignmentStatus;
  shiftId?: string;
  searchTerm?: string;
}

export interface ShiftManagementResponse {
  success: boolean;
  message: string;
}
