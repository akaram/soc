/**
 * ANPR (Automatic Number Plate Recognition) Camera Models
 * For managing ANPR/LPR camera hardware devices
 */

export enum ANPRCameraType {
  FIXED = 'FIXED',           // Fixed position camera
  MOBILE = 'MOBILE',         // Mobile/portable camera
  TRAFFIC = 'TRAFFIC',      // Traffic monitoring camera
  PARKING = 'PARKING',       // Parking management camera
  ENTRANCE = 'ENTRANCE',     // Entrance/exit camera
  MULTI_LANE = 'MULTI_LANE'  // Multi-lane camera system
}

export enum ANPRProtocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
  RTSP = 'RTSP',
  ONVIF = 'ONVIF',
  CUSTOM = 'CUSTOM'
}

export enum ANPRCameraStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING',
  CALIBRATING = 'CALIBRATING'
}

export enum RecognitionMode {
  ENTRANCE_ONLY = 'ENTRANCE_ONLY',
  EXIT_ONLY = 'EXIT_ONLY',
  BOTH = 'BOTH',
  MONITORING = 'MONITORING'
}

export interface ANPRCamera {
  id: string;
  // Basic Information
  name: string;
  type: ANPRCameraType;
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
  laneNumber?: number;        // For multi-lane setups
  direction?: 'IN' | 'OUT' | 'BOTH';
  // Connection
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'POE';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  streamUrl?: string;          // RTSP or HTTP stream URL
  // Status
  status: ANPRCameraStatus;
  lastSeen?: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  // Configuration
  supportedProtocols: ANPRProtocol[];
  recognitionMode: RecognitionMode;
  captureResolution?: string; // e.g., "1920x1080"
  fps?: number;                // Frames per second
  detectionZone?: {            // Detection zone coordinates
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Recognition Settings
  supportedCountries?: string[]; // Country codes for plate recognition
  minPlateWidth?: number;        // Minimum plate width in pixels
  maxPlateWidth?: number;        // Maximum plate width in pixels
  confidenceThreshold?: number;  // Recognition confidence threshold (0-100)
  nightVision: boolean;
  infrared: boolean;
  motionDetection: boolean;
  // Statistics
  uptime?: number;              // in hours
  totalDetections?: number;     // Total number plate detections
  successfulRecognitions?: number;
  failedRecognitions?: number;
  recognitionAccuracy?: number; // Percentage
  averageRecognitionTime?: number; // in milliseconds
  errorCount?: number;
  lastError?: string;
  lastErrorTime?: Date;
  lastPlateDetected?: string;
  lastPlateDetectedAt?: Date;
  // Integration
  isIntegrated: boolean;
  integrationStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  apiEndpoint?: string;
  apiKey?: string;
  // Settings
  settings?: ANPRCameraSettings;
  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface ANPRCameraSettings {
  // Image Quality
  brightness?: number;          // 0-100
  contrast?: number;            // 0-100
  saturation?: number;          // 0-100
  sharpness?: number;           // 0-100
  // Recognition
  recognitionTimeout?: number;  // milliseconds
  retryCount?: number;
  enablePreprocessing?: boolean;
  enablePostprocessing?: boolean;
  // Alerts
  alertOnUnknown?: boolean;     // Alert on unrecognized plates
  alertOnBlacklist?: boolean;   // Alert on blacklisted plates
  alertOnWhitelist?: boolean;   // Alert on whitelisted plates
  // Storage
  saveImages?: boolean;         // Save captured images
  saveDuration?: number;        // Days to keep images
  // Motion Detection
  motionSensitivity?: number;  // 0-100
  motionThreshold?: number;     // 0-100
  // Night Mode
  autoNightMode?: boolean;
  nightModeThreshold?: number;  // Light level threshold
  [key: string]: any;
}

export interface CreateANPRCameraRequest {
  name: string;
  type: ANPRCameraType;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  gateId?: string;
  location?: string;
  buildingName?: string;
  floorNumber?: number;
  laneNumber?: number;
  direction?: 'IN' | 'OUT' | 'BOTH';
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'POE';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  streamUrl?: string;
  supportedProtocols: ANPRProtocol[];
  recognitionMode: RecognitionMode;
  captureResolution?: string;
  fps?: number;
  detectionZone?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  supportedCountries?: string[];
  minPlateWidth?: number;
  maxPlateWidth?: number;
  confidenceThreshold?: number;
  nightVision: boolean;
  infrared: boolean;
  motionDetection: boolean;
  settings?: ANPRCameraSettings;
  notes?: string;
  tags?: string[];
}

export interface UpdateANPRCameraRequest {
  name?: string;
  status?: ANPRCameraStatus;
  location?: string;
  gateId?: string;
  ipAddress?: string;
  port?: number;
  streamUrl?: string;
  recognitionMode?: RecognitionMode;
  confidenceThreshold?: number;
  nightVision?: boolean;
  infrared?: boolean;
  motionDetection?: boolean;
  settings?: ANPRCameraSettings;
  notes?: string;
  tags?: string[];
}

export interface ANPRCameraResponse {
  success: boolean;
  message: string;
  camera?: ANPRCamera;
  errors?: string[];
}

export interface ANPRCameraTestRequest {
  cameraId: string;
  testType: 'CONNECTION' | 'STREAM_TEST' | 'RECOGNITION_TEST' | 'FULL';
  testPlateNumber?: string;     // For recognition testing
}

export interface ANPRCameraTestResult {
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

export interface ANPRCameraFilter {
  type?: ANPRCameraType;
  status?: ANPRCameraStatus;
  gateId?: string;
  connectionType?: string;
  recognitionMode?: RecognitionMode;
  isIntegrated?: boolean;
  searchTerm?: string;
}

export interface ANPRCameraStatistics {
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  maintenanceCameras: number;
  errorCameras: number;
  byType: {
    [type: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
  byGate: {
    [gateId: string]: number;
  };
  totalDetections: number;
  successfulRecognitions: number;
  failedRecognitions: number;
  averageRecognitionAccuracy: number;
  averageUptime: number; // in hours
  integrationStatus: {
    active: number;
    inactive: number;
    pending: number;
  };
}

