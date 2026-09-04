/**
 * ANPR (Automatic Number Plate Recognition) Models
 * For automatic vehicle number plate recognition at gates
 */

export enum ANPRStatus {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLACKLISTED = 'BLACKLISTED'
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

export interface VehicleRegistration {
  id: string;
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
  
  // ANPR Configuration
  status: ANPRStatus;
  confidenceThreshold: number; // Minimum confidence for recognition (0-100)
  allowedGates: string[]; // Gate IDs where access is allowed
  allowedTimeSlots?: TimeSlot[]; // Time-based access restrictions
  
  // Vehicle Images
  numberPlateImage?: string; // Registered plate image
  vehicleImage?: string; // Vehicle photo
  
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

export interface ANPREntry {
  id: string;
  vehicleNumber: string;
  detectedNumber: string; // What ANPR system detected
  confidence: number; // Recognition confidence (0-100)
  gateId: string;
  gateName: string;
  entryType: 'ENTRY' | 'EXIT';
  status: EntryStatus;
  timestamp: Date;
  
  // Vehicle Details
  vehicleRegistration?: VehicleRegistration;
  vehicleCategory: VehicleCategory;
  vehicleType?: string;
  vehicleImage?: string; // Captured image
  numberPlateImage?: string; // Detected plate image
  
  // Recognition Details
  recognitionMethod: 'AUTOMATIC' | 'MANUAL' | 'HYBRID';
  verifiedBy?: string; // System or guard ID
  rejectionReason?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  
  // Additional Info
  driverName?: string;
  purpose?: string;
  temperature?: number; // If temperature check available
}

export interface CreateVehicleRegistrationRequest {
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
  numberPlateImage?: string;
  vehicleImage?: string;
  confidenceThreshold?: number;
  allowedGates?: string[];
  allowedTimeSlots?: TimeSlot[];
  expiresAt?: Date;
  notes?: string;
}

export interface ANPRDetectionRequest {
  /** Plate text for lookup (required until live OCR/camera API is connected) */
  plateNumber?: string;
  numberPlateImage: string; // Base64 image from camera (future OCR)
  gateId: string;
  vehicleImage?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ANPRResponse {
  success: boolean;
  message: string;
  registration?: VehicleRegistration;
  entry?: ANPREntry;
  confidence?: number;
  matchFound: boolean;
  detectedNumber?: string;
  errors?: string[];
}

export interface ANPRStatistics {
  totalRegistrations: number;
  activeRegistrations: number;
  totalDetections: number;
  successfulEntries: number;
  deniedEntries: number;
  detectionsToday: number;
  byCategory: {
    resident: number;
    visitor: number;
    staff: number;
    vendor: number;
    delivery: number;
    emergency: number;
    unknown: number;
  };
  byGate: {
    [gateId: string]: number;
  };
  averageConfidence: number;
  recognitionAccuracy: number; // Percentage
}

export interface ANPRFilter {
  vehicleCategory?: VehicleCategory;
  status?: ANPRStatus;
  gateId?: string;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

