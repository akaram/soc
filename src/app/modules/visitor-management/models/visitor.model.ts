/**
 * Visitor Management Models
 * Supports pre-invite visitors with QR codes for society visitor management
 */

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  purpose: string;
  visitingFlat: string;
  visitingUnit?: string;
  hostName: string;
  hostPhone: string;
  hostId: string;
  visitDate: Date;
  visitTime: string;
  expectedDuration?: number; // in minutes
  vehicleNumber?: string;
  vehicleType?: VehicleType;
  numberOfVisitors?: number;
  photo?: string;
  idProof?: string;
  idProofNumber?: string;
  qrCode?: string;
  qrCodeData?: string; // Encoded data for QR code
  status: VisitorStatus;
  approvalStatus: ApprovalStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  checkedInBy?: string;
  checkedOutBy?: string;
  guardNotes?: string;
  rejectionReason?: string;
  invitedBy: string;
  invitedDate: Date;
  expiryDate?: Date; // QR code expiry
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  // Multi-tier approval fields
  approvalLevel?: string; // 'GATE_LEVEL', 'TOWER_LEVEL', 'BOTH', 'NONE'
  gateApproved?: boolean;
  towerApproved?: boolean;
  gateApprovedBy?: string;
  gateApprovedAt?: Date;
  towerApprovedBy?: string;
  towerApprovedAt?: Date;
  gateRejected?: boolean;
  towerRejected?: boolean;
  gateRejectionReason?: string;
  towerRejectionReason?: string;
  currentApprovalTier?: string; // 'GATE', 'TOWER', 'COMPLETE'
  createdAt: Date;
  updatedAt: Date;
}

export interface PreInviteVisitorRequest {
  name: string;
  phone: string;
  email?: string;
  purpose: string;
  visitingFlat: string;
  visitingUnit?: string;
  visitDate: Date;
  visitTime: string;
  expectedDuration?: number;
  vehicleNumber?: string;
  vehicleType?: VehicleType;
  numberOfVisitors?: number;
  idProof?: File;
  idProofNumber?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
}

export interface VisitorInvitationResponse {
  success: boolean;
  message: string;
  visitor?: Visitor;
  qrCode?: string;
  qrCodeData?: string;
  shareableLink?: string;
  errors?: string[];
}

export interface QRCodeData {
  visitorId: string;
  name: string;
  phone: string;
  visitingFlat: string;
  visitDate: string;
  visitTime: string;
  qrCodeId: string;
  expiryDate: string;
  status: VisitorStatus;
}

// Enums
export enum VisitorStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  AUTO_APPROVED = 'AUTO_APPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

export enum VehicleType {
  TWO_WHEELER = 'TWO_WHEELER',
  FOUR_WHEELER = 'FOUR_WHEELER',
  COMMERCIAL = 'COMMERCIAL',
  NONE = 'NONE'
}

export enum RecurringPattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM'
}

export enum VisitorPurpose {
  PERSONAL_VISIT = 'PERSONAL_VISIT',
  DELIVERY = 'DELIVERY',
  SERVICE = 'SERVICE',
  MAINTENANCE = 'MAINTENANCE',
  GUEST = 'GUEST',
  EVENT = 'EVENT',
  OTHER = 'OTHER'
}

// Filter and search interfaces
export interface VisitorFilter {
  status?: VisitorStatus;
  approvalStatus?: ApprovalStatus;
  visitDate?: Date;
  visitingFlat?: string;
  hostId?: string;
  searchTerm?: string;
}

// Statistics interface
export interface VisitorStatistics {
  totalToday: number;
  pending: number;
  approved: number;
  /** Approved / checked-in / checked-out with activity on the local calendar day */
  approvedToday: number;
  checkedIn: number;
  checkedOut: number;
  rejected: number;
  thisWeek: number;
  thisMonth: number;
}

