/**
 * Hardware Integration Models
 * For managing security hardware devices and systems
 */

export enum HardwareType {
  RFID_READER = 'RFID_READER',
  SMART_CARD_READER = 'SMART_CARD_READER',
  BIOMETRIC_DEVICE = 'BIOMETRIC_DEVICE',
  ANPR_CAMERA = 'ANPR_CAMERA',
  SECURITY_CAMERA = 'SECURITY_CAMERA',
  BOOM_BARRIER = 'BOOM_BARRIER',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  INTERCOM = 'INTERCOM',
  ALARM_SYSTEM = 'ALARM_SYSTEM',
  MOTION_SENSOR = 'MOTION_SENSOR',
  OTHER = 'OTHER'
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING'
}

export enum DeviceConnectionType {
  WIRED = 'WIRED',
  WIRELESS = 'WIRELESS',
  ETHERNET = 'ETHERNET',
  WIFI = 'WIFI',
  BLUETOOTH = 'BLUETOOTH',
  USB = 'USB',
  SERIAL = 'SERIAL'
}

export interface HardwareDevice {
  id: string;
  // Basic Information
  name: string;
  type: HardwareType;
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
  // Status & Connection
  status: DeviceStatus;
  connectionType: DeviceConnectionType;
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  lastSeen?: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  // Configuration
  configuration?: { [key: string]: any };
  settings?: DeviceSettings;
  // Statistics
  uptime?: number; // in hours
  totalOperations?: number;
  errorCount?: number;
  lastError?: string;
  lastErrorTime?: Date;
  // Integration
  isIntegrated: boolean;
  integrationStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  apiEndpoint?: string;
  apiKey?: string;
  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface DeviceSettings {
  sensitivity?: number;
  timeout?: number;
  retryCount?: number;
  autoOpen?: boolean;
  enableNotifications?: boolean;
  [key: string]: any;
}

export interface CreateHardwareDeviceRequest {
  name: string;
  type: HardwareType;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  gateId?: string;
  location?: string;
  buildingName?: string;
  floorNumber?: number;
  connectionType: DeviceConnectionType;
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  configuration?: { [key: string]: any };
  settings?: DeviceSettings;
  notes?: string;
  tags?: string[];
}

export interface UpdateHardwareDeviceRequest {
  name?: string;
  status?: DeviceStatus;
  location?: string;
  gateId?: string;
  ipAddress?: string;
  port?: number;
  configuration?: { [key: string]: any };
  settings?: DeviceSettings;
  notes?: string;
  tags?: string[];
}

export interface HardwareDeviceResponse {
  success: boolean;
  message: string;
  device?: HardwareDevice;
  errors?: string[];
}

export interface DeviceTestRequest {
  deviceId: string;
  testType: 'CONNECTION' | 'FUNCTIONALITY' | 'INTEGRATION' | 'FULL';
}

export interface DeviceTestResult {
  success: boolean;
  testType: string;
  results: {
    [key: string]: {
      passed: boolean;
      message: string;
      duration?: number;
    };
  };
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  timestamp: Date;
}

export interface HardwareFilter {
  type?: HardwareType;
  status?: DeviceStatus;
  gateId?: string;
  connectionType?: DeviceConnectionType;
  isIntegrated?: boolean;
  searchTerm?: string;
}

export interface HardwareStatistics {
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
  averageUptime: number; // in hours
  totalOperations: number;
  integrationStatus: {
    active: number;
    inactive: number;
    pending: number;
  };
}
















































