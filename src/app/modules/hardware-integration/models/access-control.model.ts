/**
 * Access Control System Models
 * For managing access control and door lock automation systems
 */

export enum AccessControlType {
  ELECTRONIC_LOCK = 'ELECTRONIC_LOCK',       // Electronic door lock
  SMART_LOCK = 'SMART_LOCK',                 // Smart lock with app control
  KEYPAD = 'KEYPAD',                         // Keypad access control
  CARD_READER = 'CARD_READER',               // Card reader access control
  BIOMETRIC_ACCESS = 'BIOMETRIC_ACCESS',     // Biometric access control
  INTERCOM = 'INTERCOM',                     // Intercom system
  TURNSTILE = 'TURNSTILE',                   // Turnstile access control
  REVOLVING_DOOR = 'REVOLVING_DOOR',         // Revolving door system
  MULTI_FACTOR = 'MULTI_FACTOR'              // Multi-factor authentication
}

export enum AccessControlProtocol {
  WIFI = 'WIFI',
  ZIGBEE = 'ZIGBEE',
  Z_WAVE = 'Z_WAVE',
  BLUETOOTH = 'BLUETOOTH',
  ETHERNET = 'ETHERNET',
  MODBUS = 'MODBUS',
  RS485 = 'RS485',
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
  CUSTOM = 'CUSTOM'
}

export enum AccessControlStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING',
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED',
  JAMMED = 'JAMMED'
}

export enum AccessMode {
  ALWAYS_LOCKED = 'ALWAYS_LOCKED',           // Always locked, requires authentication
  ALWAYS_UNLOCKED = 'ALWAYS_UNLOCKED',       // Always unlocked
  SCHEDULED = 'SCHEDULED',                   // Time-based locking/unlocking
  AUTO_LOCK = 'AUTO_LOCK',                   // Auto-lock after unlock
  REMOTE_CONTROL = 'REMOTE_CONTROL'          // Remote control only
}

export enum AuthenticationMethod {
  PIN = 'PIN',                               // PIN code
  CARD = 'CARD',                             // Access card
  BIOMETRIC = 'BIOMETRIC',                   // Biometric (fingerprint, face, etc.)
  MOBILE_APP = 'MOBILE_APP',                 // Mobile app
  KEY_FOB = 'KEY_FOB',                       // Key fob
  MULTI_FACTOR = 'MULTI_FACTOR'             // Multiple methods required
}

export interface AccessControl {
  id: string;
  // Basic Information
  name: string;
  type: AccessControlType;
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
  doorNumber?: string;                       // Door/entrance identifier
  roomNumber?: string;                       // Room identifier
  // Connection
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'BLUETOOTH' | 'ZIGBEE' | 'Z_WAVE' | 'RS485' | 'MODBUS';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  // Status
  status: AccessControlStatus;
  isLocked: boolean;                         // Current lock state
  lastSeen?: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  // Configuration
  supportedProtocols: AccessControlProtocol[];
  accessMode: AccessMode;
  authenticationMethods: AuthenticationMethod[]; // Supported authentication methods
  unlockDuration?: number;                    // Auto-lock delay in seconds
  maxUnlockTime?: number;                    // Maximum unlock duration
  // Security Features
  antiTamper: boolean;                       // Anti-tamper detection
  batteryBackup: boolean;                     // Battery backup support
  lowBatteryAlert: boolean;                  // Low battery alert
  forcedEntryAlert: boolean;                 // Forced entry detection
  doorSensor: boolean;                       // Door open/close sensor
  // Integration
  integratedWithRFID: boolean;
  integratedWithBiometric: boolean;
  integratedWithANPR: boolean;
  integratedWithIntercom: boolean;
  // Access Management
  supportsSchedules: boolean;                // Time-based access schedules
  supportsGroups: boolean;                    // User group support
  supportsTemporaryAccess: boolean;           // Temporary access codes
  maxUsers?: number;                         // Maximum number of users
  currentUsers?: number;                     // Current number of enrolled users
  // Statistics
  uptime?: number;                           // in hours
  totalAccessAttempts?: number;              // Total access attempts
  successfulAccess?: number;                 // Successful access grants
  failedAccess?: number;                     // Failed access attempts
  deniedAccess?: number;                     // Denied access attempts
  averageResponseTime?: number;              // Average response time in milliseconds
  errorCount?: number;
  lastError?: string;
  lastErrorTime?: Date;
  lastAccessAt?: Date;
  lastAccessBy?: string;                     // Last user who accessed
  // Integration
  isIntegrated: boolean;
  integrationStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  apiEndpoint?: string;
  apiKey?: string;
  // Settings
  settings?: AccessControlSettings;
  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface AccessControlSettings {
  // Locking
  autoLockDelay?: number;                    // Seconds before auto-lock
  unlockTimeout?: number;                    // Seconds before timeout
  maxUnlockDuration?: number;                // Maximum unlock time
  // Security
  maxFailedAttempts?: number;                // Max failed attempts before lockout
  lockoutDuration?: number;                  // Lockout duration in seconds
  requireApproval?: boolean;                 // Require approval for access
  // Alerts
  alertOnFailedAccess?: boolean;
  alertOnForcedEntry?: boolean;
  alertOnLowBattery?: boolean;
  alertOnTamper?: boolean;
  // Schedule
  operatingSchedule?: {                     // Operating schedule
    start: string;                          // HH:mm format
    end: string;                            // HH:mm format
    days: string[];                         // ['MON', 'TUE', etc.]
    unlockDuringHours?: boolean;            // Unlock during operating hours
  };
  // Maintenance
  maintenanceReminder?: number;              // Days before maintenance
  batteryLevel?: number;                     // Current battery level (0-100)
  [key: string]: any;
}

export interface CreateAccessControlRequest {
  name: string;
  type: AccessControlType;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  gateId?: string;
  location?: string;
  buildingName?: string;
  floorNumber?: number;
  doorNumber?: string;
  roomNumber?: string;
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'BLUETOOTH' | 'ZIGBEE' | 'Z_WAVE' | 'RS485' | 'MODBUS';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  supportedProtocols: AccessControlProtocol[];
  accessMode: AccessMode;
  authenticationMethods: AuthenticationMethod[];
  unlockDuration?: number;
  maxUnlockTime?: number;
  antiTamper: boolean;
  batteryBackup: boolean;
  lowBatteryAlert: boolean;
  forcedEntryAlert: boolean;
  doorSensor: boolean;
  integratedWithRFID: boolean;
  integratedWithBiometric: boolean;
  integratedWithANPR: boolean;
  integratedWithIntercom: boolean;
  supportsSchedules: boolean;
  supportsGroups: boolean;
  supportsTemporaryAccess: boolean;
  maxUsers?: number;
  settings?: AccessControlSettings;
  notes?: string;
  tags?: string[];
}

export interface UpdateAccessControlRequest {
  name?: string;
  status?: AccessControlStatus;
  location?: string;
  gateId?: string;
  ipAddress?: string;
  port?: number;
  accessMode?: AccessMode;
  unlockDuration?: number;
  maxUnlockTime?: number;
  settings?: AccessControlSettings;
  notes?: string;
  tags?: string[];
}

export interface AccessControlResponse {
  success: boolean;
  message: string;
  accessControl?: AccessControl;
  errors?: string[];
}

export interface AccessControlOperationRequest {
  accessControlId: string;
  operation: 'LOCK' | 'UNLOCK' | 'TOGGLE';
  reason?: string;
  userId?: string;
}

export interface AccessControlOperationResponse {
  success: boolean;
  message: string;
  newStatus?: AccessControlStatus;
  isLocked?: boolean;
}

export interface AccessControlTestRequest {
  accessControlId: string;
  testType: 'CONNECTION' | 'OPERATION_TEST' | 'AUTHENTICATION_TEST' | 'FULL';
  testMethod?: AuthenticationMethod;
}

export interface AccessControlTestResult {
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

export interface AccessControlFilter {
  type?: AccessControlType;
  status?: AccessControlStatus;
  gateId?: string;
  connectionType?: string;
  accessMode?: AccessMode;
  isIntegrated?: boolean;
  searchTerm?: string;
}

export interface AccessControlStatistics {
  totalSystems: number;
  onlineSystems: number;
  offlineSystems: number;
  maintenanceSystems: number;
  errorSystems: number;
  lockedSystems: number;
  unlockedSystems: number;
  byType: {
    [type: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
  byGate: {
    [gateId: string]: number;
  };
  totalAccessAttempts: number;
  successfulAccess: number;
  failedAccess: number;
  deniedAccess: number;
  averageUptime: number; // in hours
  integrationStatus: {
    active: number;
    inactive: number;
    pending: number;
  };
}

