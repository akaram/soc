/**
 * RFID/Smart Card Reader Models
 * For managing RFID and Smart Card reader hardware devices
 */

export enum ReaderType {
  RFID_READER = 'RFID_READER',
  SMART_CARD_READER = 'SMART_CARD_READER',
  NFC_READER = 'NFC_READER',
  FASTAG_READER = 'FASTAG_READER',
  COMBO_READER = 'COMBO_READER' // Supports both RFID and Smart Card
}

export enum ReaderProtocol {
  MIFARE = 'MIFARE',
  DESFIRE = 'DESFIRE',
  ISO14443 = 'ISO14443',
  ISO15693 = 'ISO15693',
  FELICA = 'FELICA',
  NFC = 'NFC',
  CUSTOM = 'CUSTOM'
}

export enum ReaderStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING'
}

export interface RFIDReader {
  id: string;
  // Basic Information
  name: string;
  type: ReaderType;
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
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'USB' | 'SERIAL';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  baudRate?: number; // For serial connections
  // Status
  status: ReaderStatus;
  lastSeen?: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  // Configuration
  supportedProtocols: ReaderProtocol[];
  readRange?: number; // in meters
  readSpeed?: number; // tags per second
  antennaPower?: number; // in dBm
  autoOpenGate: boolean;
  requiresApproval: boolean;
  // Statistics
  uptime?: number; // in hours
  totalReads?: number;
  successfulReads?: number;
  failedReads?: number;
  errorCount?: number;
  lastError?: string;
  lastErrorTime?: Date;
  lastTagRead?: string;
  lastTagReadAt?: Date;
  // Integration
  isIntegrated: boolean;
  integrationStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  apiEndpoint?: string;
  apiKey?: string;
  // Settings
  settings?: ReaderSettings;
  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface ReaderSettings {
  beepOnRead?: boolean;
  ledIndicator?: boolean;
  autoCloseGate?: boolean;
  closeDelay?: number; // seconds
  readTimeout?: number; // milliseconds
  retryCount?: number;
  signalStrength?: number; // 0-100
  sensitivity?: number; // 0-100
  [key: string]: any;
}

export interface CreateRFIDReaderRequest {
  name: string;
  type: ReaderType;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  gateId?: string;
  location?: string;
  buildingName?: string;
  floorNumber?: number;
  connectionType: 'WIRED' | 'WIRELESS' | 'ETHERNET' | 'WIFI' | 'USB' | 'SERIAL';
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  baudRate?: number;
  supportedProtocols: ReaderProtocol[];
  readRange?: number;
  autoOpenGate: boolean;
  requiresApproval: boolean;
  settings?: ReaderSettings;
  notes?: string;
  tags?: string[];
}

export interface UpdateRFIDReaderRequest {
  name?: string;
  status?: ReaderStatus;
  location?: string;
  gateId?: string;
  ipAddress?: string;
  port?: number;
  autoOpenGate?: boolean;
  requiresApproval?: boolean;
  settings?: ReaderSettings;
  notes?: string;
  tags?: string[];
}

export interface RFIDReaderResponse {
  success: boolean;
  message: string;
  reader?: RFIDReader;
  errors?: string[];
}

export interface ReaderTestRequest {
  readerId: string;
  testType: 'CONNECTION' | 'READ_TEST' | 'INTEGRATION' | 'FULL';
  testTagId?: string;
}

export interface ReaderTestResult {
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

export interface ReaderFilter {
  type?: ReaderType;
  status?: ReaderStatus;
  gateId?: string;
  connectionType?: string;
  isIntegrated?: boolean;
  searchTerm?: string;
}

export interface ReaderStatistics {
  totalReaders: number;
  onlineReaders: number;
  offlineReaders: number;
  maintenanceReaders: number;
  errorReaders: number;
  byType: {
    [type: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
  byGate: {
    [gateId: string]: number;
  };
  totalReads: number;
  successfulReads: number;
  failedReads: number;
  averageUptime: number; // in hours
  integrationStatus: {
    active: number;
    inactive: number;
    pending: number;
  };
}
















































