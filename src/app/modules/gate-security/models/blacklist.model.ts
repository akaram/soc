/**
 * Blacklist Management Models
 * For managing blacklisted persons, vehicles, and entities
 */

export enum BlacklistType {
  PERSON = 'PERSON',
  VEHICLE = 'VEHICLE',
  PHONE_NUMBER = 'PHONE_NUMBER',
  EMAIL = 'EMAIL',
  ID_PROOF = 'ID_PROOF'
}

export enum BlacklistReason {
  SECURITY_THREAT = 'SECURITY_THREAT',
  THEFT = 'THEFT',
  VANDALISM = 'VANDALISM',
  HARASSMENT = 'HARASSMENT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  COURT_ORDER = 'COURT_ORDER',
  OTHER = 'OTHER'
}

export enum BlacklistStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  REMOVED = 'REMOVED'
}

export enum BlacklistSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface BlacklistEntry {
  id: string;
  // Entry identification
  type: BlacklistType;
  identifier: string; // Name, vehicle number, phone, email, ID proof number
  alternateIdentifiers?: string[]; // Additional ways to identify
  // Person details (if type is PERSON)
  personName?: string;
  personPhoto?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  idProofType?: string; // Aadhar, PAN, Driving License, etc.
  idProofNumber?: string;
  // Vehicle details (if type is VEHICLE)
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  // Blacklist details
  reason: BlacklistReason;
  reasonDescription: string; // Detailed description
  severity: BlacklistSeverity;
  status: BlacklistStatus;
  // Dates
  blacklistedDate: Date;
  blacklistedBy: string; // User/Guard ID
  blacklistedByName?: string;
  expiryDate?: Date; // Optional expiry date
  isPermanent: boolean;
  // Restrictions
  restrictedGates?: string[]; // Specific gates, empty means all gates
  restrictedTimeSlots?: TimeSlot[]; // Time-based restrictions
  // Additional information
  incidentReportId?: string; // Link to incident report
  caseNumber?: string; // Police case number, court case, etc.
  documents?: string[]; // URLs to supporting documents
  photos?: string[]; // URLs to photos
  notes?: string;
  // History
  lastCheckedAt?: Date; // Last time this entry was checked
  checkCount?: number; // Number of times checked
  blockedAttempts?: number; // Number of blocked access attempts
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface TimeSlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface CreateBlacklistRequest {
  type: BlacklistType;
  identifier: string;
  alternateIdentifiers?: string[];
  // Person details
  personName?: string;
  personPhoto?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  idProofType?: string;
  idProofNumber?: string;
  // Vehicle details
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  // Blacklist details
  reason: BlacklistReason;
  reasonDescription: string;
  severity: BlacklistSeverity;
  // Dates
  blacklistedBy: string;
  expiryDate?: Date;
  isPermanent: boolean;
  // Restrictions
  restrictedGates?: string[];
  restrictedTimeSlots?: TimeSlot[];
  // Additional
  incidentReportId?: string;
  caseNumber?: string;
  documents?: string[];
  photos?: string[];
  notes?: string;
}

export interface UpdateBlacklistRequest {
  reason?: BlacklistReason;
  reasonDescription?: string;
  severity?: BlacklistSeverity;
  status?: BlacklistStatus;
  expiryDate?: Date;
  isPermanent?: boolean;
  restrictedGates?: string[];
  restrictedTimeSlots?: TimeSlot[];
  notes?: string;
}

export interface BlacklistResponse {
  success: boolean;
  message: string;
  entry?: BlacklistEntry;
  errors?: string[];
}

export interface BlacklistCheckRequest {
  identifier: string;
  type?: BlacklistType; // Optional, will check all types if not specified
  gateId?: string;
  checkTime?: Date;
}

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  entry?: BlacklistEntry;
  matchType?: BlacklistType;
  matchConfidence?: number; // 0-100
  reason?: string;
}

export interface BlacklistFilter {
  type?: BlacklistType;
  status?: BlacklistStatus;
  reason?: BlacklistReason;
  severity?: BlacklistSeverity;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
  gateId?: string;
  isPermanent?: boolean;
}

export interface BlacklistStatistics {
  totalEntries: number;
  activeEntries: number;
  suspendedEntries: number;
  expiredEntries: number;
  byType: {
    [type: string]: number;
  };
  byReason: {
    [reason: string]: number;
  };
  bySeverity: {
    [severity: string]: number;
  };
  recentAdditions: number; // Last 7 days
  blockedAttempts: number; // Total blocked attempts
  blockedAttemptsToday: number;
}
















































