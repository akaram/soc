/**
 * Cab/Taxi Entry Models
 * For managing cab and taxi entries with OTP verification
 */

export enum VehicleType {
  CAB = 'CAB',
  TAXI = 'TAXI',
  AUTO_RICKSHAW = 'AUTO_RICKSHAW',
  PRIVATE_CAR = 'PRIVATE_CAR',
  OTHER = 'OTHER'
}

export enum EntryStatus {
  PENDING = 'PENDING',
  OTP_SENT = 'OTP_SENT',
  OTP_VERIFIED = 'OTP_VERIFIED',
  ENTRY_APPROVED = 'ENTRY_APPROVED',
  ENTERED = 'ENTERED',
  EXITED = 'EXITED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export interface CabTaxiEntry {
  id: string;
  entryType: VehicleType;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  driverLicense?: string;
  
  // Passenger/Visitor Info
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  visitingFlat: string;
  visitingUnit?: string;
  hostName: string;
  hostPhone: string;
  hostId: string;
  
  // OTP Details
  otpCode?: string;
  otpSentAt?: Date;
  otpExpiresAt?: Date;
  otpVerified: boolean;
  otpVerifiedAt?: Date;
  otpAttempts: number;
  maxOtpAttempts: number;
  
  // Entry Details
  status: EntryStatus;
  entryTime?: Date;
  exitTime?: Date;
  expectedDuration?: number; // in minutes
  purpose: string;
  
  // Location & Tracking
  entryGate?: string;
  exitGate?: string;
  currentLocation?: string;
  
  // Approval
  requiresApproval: boolean;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  
  // Metadata
  qrCode?: string;
  qrCodeData?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateCabTaxiEntryRequest {
  entryType: VehicleType;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  driverLicense?: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  visitingFlat: string;
  visitingUnit?: string;
  hostId: string;
  expectedDuration?: number;
  purpose: string;
  requiresApproval?: boolean;
  notes?: string;
}

export interface SendOtpRequest {
  entryId: string;
  phoneNumber: string; // Can be driver or passenger phone
}

export interface VerifyOtpRequest {
  entryId: string;
  otpCode: string;
  phoneNumber: string;
}

export interface CabTaxiEntryResponse {
  success: boolean;
  message: string;
  entry?: CabTaxiEntry;
  otpCode?: string; // Only returned when sending OTP
  errors?: string[];
}

export interface CabTaxiEntryStatistics {
  totalToday: number;
  pending: number;
  otpSent: number;
  otpVerified: number;
  entered: number;
  exited: number;
  rejected: number;
  byType: {
    cab: number;
    taxi: number;
    autoRickshaw: number;
    privateCar: number;
    other: number;
  };
}

export interface CabTaxiEntryFilter {
  entryType?: VehicleType;
  status?: EntryStatus;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
  flatNumber?: string;
}
