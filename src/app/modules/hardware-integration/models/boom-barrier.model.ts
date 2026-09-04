/**
 * Boom Barrier Models
 * For managing boom barrier/gate automation hardware devices
 */

export enum BoomBarrierType {
  SINGLE_ARM = 'SINGLE_ARM',           // Single arm boom barrier
  DOUBLE_ARM = 'DOUBLE_ARM',           // Double arm boom barrier
  SLIDING_GATE = 'SLIDING_GATE',       // Sliding gate system
  SWING_GATE = 'SWING_GATE',           // Swing gate system
  LIFT_GATE = 'LIFT_GATE',             // Lift gate system
  TURNSTILE = 'TURNSTILE'              // Turnstile system
}

export enum BoomBarrierProtocol {
  RS485 = 'RS485',
  MODBUS = 'MODBUS',
  ETHERNET = 'ETHERNET',
  WIFI = 'WIFI',
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
  CUSTOM = 'CUSTOM'
}

export enum BoomBarrierStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING',
  OPENING = 'OPENING',
  CLOSING = 'CLOSING',
  STUCK_OPEN = 'STUCK_OPEN',
  STUCK_CLOSED = 'STUCK_CLOSED'
}

export enum OperationMode {
  MANUAL = 'MANUAL',                   // Manual operation only
  AUTOMATIC = 'AUTOMATIC',             // Fully automatic
  SEMI_AUTOMATIC = 'SEMI_AUTOMATIC',   // Requires approval
  SCHEDULED = 'SCHEDULED'              // Time-based operation
}

export interface BoomBarrier {
  id: string;
  // Basic Information
  name: string;
  type: BoomBarrierType;
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
  laneNumber?: number;                 // For multi-lane setups
  direction?: 'IN' | 'OUT' | 'BOTH';
  // Connection
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'RS485' | 'MODBUS';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  // Status
  status: BoomBarrierStatus;
  isOpen: boolean;                     // Current state
  lastSeen?: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  // Configuration
  supportedProtocols: BoomBarrierProtocol[];
  operationMode: OperationMode;
  openTime?: number;                   // Time to open in seconds
  closeTime?: number;                  // Time to close in seconds
  autoCloseDelay?: number;            // Auto-close delay in seconds
  requiresApproval: boolean;           // Requires manual approval
  // Safety Features
  safetyBeam: boolean;                 // Safety beam sensor
  loopDetector: boolean;               // Vehicle loop detector
  photocell: boolean;                  // Photocell sensor
  emergencyStop: boolean;              // Emergency stop button
  obstacleDetection: boolean;          // Obstacle detection during closing
  // Integration
  integratedWithRFID: boolean;         // Integrated with RFID reader
  integratedWithANPR: boolean;         // Integrated with ANPR camera
  integratedWithBiometric: boolean;    // Integrated with biometric device
  // Statistics
  uptime?: number;                     // in hours
  totalOperations?: number;            // Total open/close operations
  successfulOperations?: number;
  failedOperations?: number;
  averageOperationTime?: number;       // Average operation time in seconds
  errorCount?: number;
  lastError?: string;
  lastErrorTime?: Date;
  lastOperationAt?: Date;
  lastOperationType?: 'OPEN' | 'CLOSE';
  // Integration
  isIntegrated: boolean;
  integrationStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  apiEndpoint?: string;
  apiKey?: string;
  // Settings
  settings?: BoomBarrierSettings;
  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface BoomBarrierSettings {
  // Operation
  openSpeed?: number;                  // 0-100
  closeSpeed?: number;                 // 0-100
  holdOpenTime?: number;               // Seconds to hold open
  autoCloseEnabled?: boolean;
  autoCloseDelay?: number;             // Seconds
  // Safety
  obstacleDetectionSensitivity?: number; // 0-100
  safetyBeamEnabled?: boolean;
  loopDetectorEnabled?: boolean;
  photocellEnabled?: boolean;
  // Alerts
  alertOnStuck?: boolean;
  alertOnError?: boolean;
  alertOnMaintenance?: boolean;
  // Maintenance
  maintenanceReminder?: number;        // Days before maintenance
  operationCountLimit?: number;       // Operations before maintenance
  // Schedule
  operatingHours?: {                   // Operating schedule
    start: string;                     // HH:mm format
    end: string;                        // HH:mm format
    days: string[];                    // ['MON', 'TUE', etc.]
  };
  [key: string]: any;
}

export interface CreateBoomBarrierRequest {
  name: string;
  type: BoomBarrierType;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  gateId?: string;
  location?: string;
  buildingName?: string;
  floorNumber?: number;
  laneNumber?: number;
  direction?: 'IN' | 'OUT' | 'BOTH';
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'RS485' | 'MODBUS';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  supportedProtocols: BoomBarrierProtocol[];
  operationMode: OperationMode;
  openTime?: number;
  closeTime?: number;
  autoCloseDelay?: number;
  requiresApproval: boolean;
  safetyBeam: boolean;
  loopDetector: boolean;
  photocell: boolean;
  emergencyStop: boolean;
  obstacleDetection: boolean;
  integratedWithRFID: boolean;
  integratedWithANPR: boolean;
  integratedWithBiometric: boolean;
  settings?: BoomBarrierSettings;
  notes?: string;
  tags?: string[];
}

export interface UpdateBoomBarrierRequest {
  name?: string;
  status?: BoomBarrierStatus;
  location?: string;
  gateId?: string;
  ipAddress?: string;
  port?: number;
  operationMode?: OperationMode;
  autoCloseDelay?: number;
  requiresApproval?: boolean;
  settings?: BoomBarrierSettings;
  notes?: string;
  tags?: string[];
}

export interface BoomBarrierResponse {
  success: boolean;
  message: string;
  barrier?: BoomBarrier;
  errors?: string[];
}

export interface BoomBarrierOperationRequest {
  barrierId: string;
  operation: 'OPEN' | 'CLOSE' | 'STOP';
  reason?: string;
}

export interface BoomBarrierOperationResponse {
  success: boolean;
  message: string;
  newStatus?: BoomBarrierStatus;
  isOpen?: boolean;
}

export interface BoomBarrierTestRequest {
  barrierId: string;
  testType: 'CONNECTION' | 'OPERATION_TEST' | 'SAFETY_TEST' | 'FULL';
}

export interface BoomBarrierTestResult {
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

export interface BoomBarrierFilter {
  type?: BoomBarrierType;
  status?: BoomBarrierStatus;
  gateId?: string;
  connectionType?: string;
  operationMode?: OperationMode;
  isIntegrated?: boolean;
  searchTerm?: string;
}

export interface BoomBarrierStatistics {
  totalBarriers: number;
  onlineBarriers: number;
  offlineBarriers: number;
  maintenanceBarriers: number;
  errorBarriers: number;
  openBarriers: number;
  closedBarriers: number;
  byType: {
    [type: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
  byGate: {
    [gateId: string]: number;
  };
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageUptime: number; // in hours
  integrationStatus: {
    active: number;
    inactive: number;
    pending: number;
  };
}


