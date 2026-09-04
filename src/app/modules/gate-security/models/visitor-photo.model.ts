/**
 * Visitor Photo Capture Models
 * For capturing and storing visitor photos with 7-day retention
 */

export enum PhotoCaptureSource {
  GATE_ENTRY = 'GATE_ENTRY',
  GATE_EXIT = 'GATE_EXIT',
  MANUAL_CAPTURE = 'MANUAL_CAPTURE',
  VISITOR_REGISTRATION = 'VISITOR_REGISTRATION'
}

export enum PhotoQuality {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EXCELLENT = 'EXCELLENT'
}

export enum PhotoStatus {
  ACTIVE = 'ACTIVE',
  PENDING_DELETION = 'PENDING_DELETION',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED'
}

export interface VisitorPhoto {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorPhone?: string;
  visitingFlat?: string;
  hostName?: string;
  // Photo data
  photoUrl: string; // Base64 or URL
  thumbnailUrl?: string; // Thumbnail version
  photoData?: string; // Base64 data if stored inline
  // Metadata
  captureSource: PhotoCaptureSource;
  captureDate: Date;
  captureTime: Date;
  capturedBy: string; // Guard ID or name
  capturedByGuard?: string;
  gateId?: string;
  gateName?: string;
  // Quality and validation
  quality: PhotoQuality;
  qualityScore?: number; // 0-100
  faceDetected: boolean;
  faceCount?: number;
  imageWidth?: number;
  imageHeight?: number;
  fileSize?: number; // in bytes
  // Storage management
  status: PhotoStatus;
  storageDate: Date;
  expiryDate: Date; // 7 days from capture
  daysRemaining: number; // Days until auto-deletion
  isExpired: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  // Additional metadata
  notes?: string;
  tags?: string[]; // For categorization
  relatedVisitorEntryId?: string; // Link to visitor entry log
  createdAt: Date;
  updatedAt: Date;
}

export interface CapturePhotoRequest {
  visitorId?: string; // Optional if capturing for new visitor
  visitorName: string;
  visitorPhone?: string;
  visitingFlat?: string;
  hostName?: string;
  gateId?: string;
  captureSource: PhotoCaptureSource;
  capturedBy: string;
  notes?: string;
  tags?: string[];
}

export interface CapturePhotoResponse {
  success: boolean;
  message: string;
  photo?: VisitorPhoto;
  errors?: string[];
}

export interface PhotoFilter {
  visitorId?: string;
  visitorName?: string;
  gateId?: string;
  captureSource?: PhotoCaptureSource;
  status?: PhotoStatus;
  dateFrom?: Date;
  dateTo?: Date;
  quality?: PhotoQuality;
  faceDetected?: boolean;
  searchTerm?: string;
}

export interface PhotoStatistics {
  totalPhotos: number;
  activePhotos: number;
  photosToday: number;
  photosExpiringToday: number;
  photosExpiringThisWeek: number;
  totalStorageUsed: number; // in MB
  averagePhotoSize: number; // in KB
  byGate: {
    [gateId: string]: number;
  };
  bySource: {
    [source: string]: number;
  };
  byQuality: {
    [quality: string]: number;
  };
  storageBreakdown: {
    active: number;
    pendingDeletion: number;
    archived: number;
  };
}

export interface PhotoStorageInfo {
  totalPhotos: number;
  totalSize: number; // in bytes
  oldestPhoto: Date | null;
  newestPhoto: Date | null;
  photosExpiringIn24Hours: number;
  photosExpiringIn7Days: number;
  storageLimit?: number; // in bytes
  storageUsedPercentage?: number;
}
















































