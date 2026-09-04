/**
 * RFID/FASTag Models
 * For automatic gate opening using RFID tags and FASTag
 */

export enum RFIDStatus {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  BLACKLISTED = 'BLACKLISTED'
}

export enum TagType {
  RFID = 'RFID',
  FASTAG = 'FASTAG',
  NFC = 'NFC',
  BLUETOOTH = 'BLUETOOTH'
}

export enum VehicleCategory {
  RESIDENT = 'RESIDENT',
  VISITOR = 'VISITOR',
  STAFF = 'STAFF',
  VENDOR = 'VENDOR',
  DELIVERY = 'DELIVERY',
  EMERGENCY = 'EMERGENCY',
  UNKNOWN = 'UNKNOWN'
}

export enum EntryStatus {
  ALLOWED = 'ALLOWED',
  DENIED = 'DENIED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE'
}

export interface RFIDRegistration {
  id: string;
  tagId: string; // Unique RFID/FASTag ID
  tagType: TagType;
  vehicleNumber: string;
  vehicleType: string; // 'CAR', 'BIKE', 'AUTO', 'TRUCK', etc.
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  
  // Owner/Driver Info
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  ownerType: VehicleCategory;
  flatNumber?: string;
  unitNumber?: string;
  
  // RFID Configuration
  status: RFIDStatus;
  allowedGates: string[]; // Gate IDs where access is allowed
  allowedTimeSlots?: TimeSlot[]; // Time-based access restrictions
  autoOpen: boolean; // Automatic gate opening enabled
  requiresApproval: boolean; // Requires manual approval
  
  // Metadata
  registeredAt: Date;
  registeredBy: string;
  lastDetectedAt?: Date;
  lastEntryAt?: Date;
  totalEntries: number;
  failedAttempts: number;
  isActive: boolean;
  expiresAt?: Date;
  notes?: string;
}

export interface TimeSlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface RFIDEntry {
  id: string;
  tagId: string;
  registration?: RFIDRegistration;
  gateId: string;
  gateName: string;
  entryType: 'ENTRY' | 'EXIT';
  status: EntryStatus;
  timestamp: Date;
  
  // Detection Details
  detectionMethod: 'AUTOMATIC' | 'MANUAL' | 'HYBRID';
  signalStrength?: number; // RFID signal strength (0-100)
  readDistance?: number; // Distance in meters
  verifiedBy?: string; // System or guard ID
  
  // Vehicle Details
  vehicleNumber?: string;
  vehicleCategory: VehicleCategory;
  vehicleType?: string;
  
  // Additional Info
  rejectionReason?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  gateOpened: boolean; // Whether gate was automatically opened
  gateOpenTime?: Date;
}

export interface CreateRFIDRegistrationRequest {
  tagId: string;
  tagType: TagType;
  vehicleNumber: string;
  vehicleType: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  ownerType: VehicleCategory;
  flatNumber?: string;
  unitNumber?: string;
  allowedGates?: string[];
  allowedTimeSlots?: TimeSlot[];
  autoOpen?: boolean;
  requiresApproval?: boolean;
  expiresAt?: Date;
  notes?: string;
}

export interface RFIDDetectionRequest {
  tagId: string;
  gateId: string;
  signalStrength?: number;
  readDistance?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface RFIDResponse {
  success: boolean;
  message: string;
  registration?: RFIDRegistration;
  entry?: RFIDEntry;
  matchFound: boolean;
  gateOpened?: boolean;
  errors?: string[];
}

export interface RFIDStatistics {
  totalRegistrations: number;
  activeRegistrations: number;
  totalDetections: number;
  successfulEntries: number;
  deniedEntries: number;
  detectionsToday: number;
  autoOpenedGates: number;
  byTagType: {
    rfid: number;
    fastag: number;
    nfc: number;
    bluetooth: number;
  };
  byCategory: {
    resident: number;
    visitor: number;
    staff: number;
    vendor: number;
    delivery: number;
    emergency: number;
  };
  byGate: {
    [gateId: string]: number;
  };
  averageSignalStrength: number;
}

export interface RFIDFilter {
  tagType?: TagType;
  vehicleCategory?: VehicleCategory;
  status?: RFIDStatus;
  gateId?: string;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

