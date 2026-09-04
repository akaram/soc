/**
 * Biometric Device Models
 * For managing fingerprint and face recognition hardware devices
 */

export enum BiometricType {
  FINGERPRINT = 'FINGERPRINT',
  FACE_RECOGNITION = 'FACE_RECOGNITION',
  IRIS = 'IRIS',
  VOICE = 'VOICE',
  PALM = 'PALM',
  MULTI_MODAL = 'MULTI_MODAL' // Supports multiple biometric types
}

export enum BiometricProtocol {
  FIDO2 = 'FIDO2',
  WEBAUTHN = 'WEBAUTHN',
  ISO19794 = 'ISO19794',
  ANSI378 = 'ANSI378',
  ISO19794_2 = 'ISO19794_2', // Fingerprint
  ISO19794_5 = 'ISO19794_5', // Face
  CUSTOM = 'CUSTOM'
}

export enum BiometricStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING',
  CALIBRATING = 'CALIBRATING'
}

export interface BiometricDevice {
  id: string;
  // Basic Information
  name: string;
  type: BiometricType;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  // Location
  gateId?: string;
  gateName?: string;
  location?: string;
  buildingName?: string;
  floorNumber?: number;
  // Connection
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'USB' | 'BLUETOOTH';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  // Status
  status: BiometricStatus;
  lastSeen?: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  // Configuration
  supportedProtocols: BiometricProtocol[];
  supportedTypes: BiometricType[]; // For multi-modal devices
  enrollmentCapacity?: number; // Max number of enrollments
  currentEnrollments?: number;
  scanSpeed?: number; // scans per second
  falseAcceptRate?: number; // FAR percentage
  falseRejectRate?: number; // FRR percentage
  // Biometric Settings
  livenessDetection: boolean;
  antiSpoofing: boolean;
  templateFormat?: string;
  imageQuality?: number; // 0-100
  // Statistics
  uptime?: number; // in hours
  totalScans?: number;
  successfulScans?: number;
  failedScans?: number;
  enrollments?: number;
  verifications?: number;
  errorCount?: number;
  lastError?: string;
  lastErrorTime?: Date;
  lastScanAt?: Date;
  // Integration
  isIntegrated: boolean;
  integrationStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  apiEndpoint?: string;
  apiKey?: string;
  // Settings
  settings?: BiometricSettings;
  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface BiometricSettings {
  timeout?: number; // milliseconds
  retryCount?: number;
  beepOnScan?: boolean;
  ledIndicator?: boolean;
  autoCapture?: boolean;
  qualityThreshold?: number; // 0-100
  livenessThreshold?: number; // 0-100
  spoofDetectionLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  [key: string]: any;
}

export interface CreateBiometricDeviceRequest {
  name: string;
  type: BiometricType;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  gateId?: string;
  location?: string;
  buildingName?: string;
  floorNumber?: number;
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'USB' | 'BLUETOOTH';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  supportedProtocols: BiometricProtocol[];
  supportedTypes?: BiometricType[];
  enrollmentCapacity?: number;
  livenessDetection: boolean;
  antiSpoofing: boolean;
  settings?: BiometricSettings;
  notes?: string;
  tags?: string[];
}

export interface UpdateBiometricDeviceRequest {
  name?: string;
  status?: BiometricStatus;
  location?: string;
  gateId?: string;
  ipAddress?: string;
  port?: number;
  livenessDetection?: boolean;
  antiSpoofing?: boolean;
  settings?: BiometricSettings;
  notes?: string;
  tags?: string[];
}

export interface BiometricDeviceResponse {
  success: boolean;
  message: string;
  device?: BiometricDevice;
  errors?: string[];
}

export interface BiometricTestRequest {
  deviceId: string;
  testType: 'CONNECTION' | 'SCAN_TEST' | 'ENROLLMENT_TEST' | 'VERIFICATION_TEST' | 'FULL';
  testBiometricType?: BiometricType;
}

export interface BiometricTestResult {
  success: boolean;
  testType: string;
  results: {
    [key: string]: {
      passed: boolean;
      message: string;
      duration?: number;
      data?: any;
    };
  };
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  timestamp: Date;
}

export interface BiometricFilter {
  type?: BiometricType;
  status?: BiometricStatus;
  gateId?: string;
  connectionType?: string;
  isIntegrated?: boolean;
  searchTerm?: string;
}

export interface BiometricStatistics {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  maintenanceDevices: number;
  errorDevices: number;
  byType: {
    [type: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
  byGate: {
    [gateId: string]: number;
  };
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  totalEnrollments: number;
  totalVerifications: number;
  averageUptime: number; // in hours
  integrationStatus: {
    active: number;
    inactive: number;
    pending: number;
  };
}
















































