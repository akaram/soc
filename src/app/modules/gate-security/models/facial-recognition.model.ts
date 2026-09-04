/**
 * Facial Recognition Models
 * For touchless entry using facial recognition technology
 */

export enum RecognitionStatus {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED'
}

export enum EntryType {
  RESIDENT = 'RESIDENT',
  STAFF = 'STAFF',
  VISITOR = 'VISITOR',
  DOMESTIC_HELP = 'DOMESTIC_HELP',
  VENDOR = 'VENDOR'
}

export enum EntryStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  BLOCKED = 'BLOCKED'
}

export interface FacialProfile {
  id: string;
  personId: string; // Reference to resident/staff/visitor ID
  personName: string;
  personType: EntryType;
  phone: string;
  email?: string;
  flatNumber?: string;
  unitNumber?: string;
  
  // Facial Recognition Data
  faceId: string; // Unique face identifier from recognition system
  faceEncoding?: string; // Encrypted face encoding data
  faceImage?: string; // Base64 or URL of registered face image
  confidenceThreshold: number; // Minimum confidence for match (0-100)
  
  // Access Control
  status: RecognitionStatus;
  accessLevel: string; // 'FULL', 'RESTRICTED', 'TIME_BASED'
  allowedGates: string[]; // Gate IDs where access is allowed
  allowedTimeSlots?: TimeSlot[]; // Time-based access restrictions
  
  // Metadata
  registeredAt: Date;
  registeredBy: string;
  lastVerifiedAt?: Date;
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

export interface FacialRecognitionEntry {
  id: string;
  profileId: string;
  profile?: FacialProfile;
  gateId: string;
  gateName: string;
  entryType: 'ENTRY' | 'EXIT';
  status: EntryStatus;
  confidence: number; // Recognition confidence (0-100)
  timestamp: Date;
  faceImage?: string; // Captured face image at entry
  temperature?: number; // Body temperature if available
  maskDetected: boolean;
  verificationMethod: 'FACE_ONLY' | 'FACE_AND_TEMPERATURE' | 'FACE_AND_OTP';
  verifiedBy?: string; // System or guard ID
  rejectionReason?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CreateFacialProfileRequest {
  personId: string;
  personName: string;
  personType: EntryType;
  phone: string;
  email?: string;
  flatNumber?: string;
  unitNumber?: string;
  faceImage?: string; // Base64 image or file
  confidenceThreshold?: number;
  accessLevel?: string;
  allowedGates?: string[];
  allowedTimeSlots?: TimeSlot[];
  expiresAt?: Date;
  notes?: string;
}

export interface VerifyFaceRequest {
  faceImage: string; // Base64 image from camera
  gateId: string;
  temperature?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface FacialRecognitionResponse {
  success: boolean;
  message: string;
  profile?: FacialProfile;
  entry?: FacialRecognitionEntry;
  confidence?: number;
  matchFound: boolean;
  errors?: string[];
}

export interface FacialRecognitionStatistics {
  totalProfiles: number;
  activeProfiles: number;
  totalEntries: number;
  successfulEntries: number;
  failedEntries: number;
  entriesToday: number;
  byType: {
    resident: number;
    staff: number;
    visitor: number;
    domesticHelp: number;
    vendor: number;
  };
  byGate: {
    [gateId: string]: number;
  };
  averageConfidence: number;
}

export interface FacialRecognitionFilter {
  personType?: EntryType;
  status?: RecognitionStatus;
  gateId?: string;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

