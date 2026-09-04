export interface DomesticStaff {
  id: string;
  name: string;
  phoneNumber: string;
  alternatePhone?: string;
  photoUrl?: string;
  role: StaffRole;
  passcode: string; // 6-digit passcode
  status: StaffStatus;
  flatId: string;
  flatNumber: string;
  societyId: string;
  documentType?: DocumentType;
  documentNumber?: string;
  /** Scanned ID (Aadhaar / PAN / etc.) as data-URL or remote URL. */
  documentUrl?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
  workSchedule?: WorkSchedule;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastAccessDate?: Date;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
}

export interface WorkSchedule {
  workingDays: DayOfWeek[];
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  isFullTime: boolean;
}

export enum StaffRole {
  MAID = 'Maid',
  COOK = 'Cook',
  DRIVER = 'Driver',
  NANNY = 'Nanny',
  GARDENER = 'Gardener',
  CARETAKER = 'Caretaker',
  TUTOR = 'Tutor',
  OTHER = 'Other'
}

export enum StaffStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  BLOCKED = 'Blocked',
  PENDING_APPROVAL = 'Pending Approval'
}

export enum DocumentType {
  AADHAR = 'Aadhaar Card',
  PAN = 'PAN Card',
  VOTER_ID = 'Voter ID',
  DRIVING_LICENSE = 'Driving License',
  PASSPORT = 'Passport',
  OTHER = 'Other'
}

export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday'
}

export interface StaffAccessLog {
  id: string;
  staffId: string;
  staffName: string;
  flatNumber: string;
  checkInTime: Date;
  checkOutTime?: Date;
  entryGate: string;
  exitGate?: string;
  verifiedBy: string; // Guard name
  notes?: string;
  photoCapture?: string;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  staffName: string;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  status: AttendanceStatus;
  workHours?: number;
  notes?: string;
}

export enum AttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  HALF_DAY = 'Half Day',
  LEAVE = 'Leave'
}

export interface StaffRating {
  id: string;
  staffId: string;
  flatId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
  createdBy: string;
}

export interface PasscodeVerificationRequest {
  passcode: string;
  staffId?: string;
  entryGate: string;
  /** Optional — backend falls back to JWT user id when omitted. */
  guardId?: string;
}

export interface PasscodeVerificationResponse {
  success: boolean;
  staff?: DomesticStaff;
  message: string;
  accessLog?: StaffAccessLog;
}
