/**
 * Checkpoint Scan Models
 * For managing QR code/NFC tag scanning at patrolling checkpoints
 */

export enum ScanType {
  QR_CODE = 'QR_CODE',
  NFC_TAG = 'NFC_TAG',
  GPS_LOCATION = 'GPS_LOCATION',
  MANUAL = 'MANUAL'
}

export enum ScanStatus {
  PENDING = 'PENDING',           // Scan recorded, pending validation
  VALID = 'VALID',               // Valid checkpoint scan
  INVALID = 'INVALID',           // Invalid checkpoint scan
  LATE = 'LATE',                 // Scan was late
  MISSED = 'MISSED',             // Checkpoint was missed
  DUPLICATE = 'DUPLICATE'        // Duplicate scan detected
}

export interface CheckpointScan {
  id: string;
  // Checkpoint Information
  checkpointId: string;
  checkpointName: string;
  checkpointCode?: string;
  routeId: string;
  routeName: string;
  // Scan Details
  scanType: ScanType;
  scannedData: string;           // QR code data or NFC tag ID
  scanTimestamp: Date;
  // Location
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;      // GPS accuracy in meters
  // Guard Information
  guardId: string;
  guardName: string;
  // Validation
  status: ScanStatus;
  isValid: boolean;
  validationMessage?: string;
  // Timing
  expectedTime?: Date;
  actualTime: Date;
  timeDifference?: number;        // Difference in minutes
  isOnTime: boolean;
  isLate: boolean;
  // Additional Data
  photoUrl?: string;              // Photo if required
  notes?: string;                 // Notes if required
  // Metadata
  deviceInfo?: string;            // Device used for scanning
  appVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanCheckpointRequest {
  checkpointId: string;
  scanType: ScanType;
  scannedData: string;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  notes?: string;
  guardId?: string;
}

export interface ScanCheckpointResponse {
  success: boolean;
  message: string;
  scan?: CheckpointScan;
  checkpoint?: {
    id: string;
    name: string;
    routeId: string;
    routeName: string;
    order: number;
  };
  errors?: string[];
}

export interface CheckpointScanFilter {
  routeId?: string;
  checkpointId?: string;
  guardId?: string;
  status?: ScanStatus;
  scanType?: ScanType;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

export interface CheckpointScanStatistics {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  lateScans: number;
  missedCheckpoints: number;
  duplicateScans: number;
  averageScanTime: number;        // Average time difference in minutes
  onTimePercentage: number;
  byRoute: {
    [routeId: string]: {
      routeName: string;
      totalScans: number;
      validScans: number;
      completionRate: number;
    };
  };
  byGuard: {
    [guardId: string]: {
      guardName: string;
      totalScans: number;
      validScans: number;
      onTimeScans: number;
    };
  };
  recentScans: CheckpointScan[];
}

export interface ActivePatrol {
  id: string;
  routeId: string;
  routeName: string;
  guardId: string;
  guardName: string;
  startTime: Date;
  expectedEndTime?: Date;
  actualEndTime?: Date;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  checkpoints: {
    checkpointId: string;
    checkpointName: string;
    checkpointCode?: string;
    order: number;
    expectedTime?: Date;
    scannedAt?: Date;
    status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'LATE';
    scanId?: string;
  }[];
  progress: number;                // Percentage completed
  completedCheckpoints: number;
  totalCheckpoints: number;
}

