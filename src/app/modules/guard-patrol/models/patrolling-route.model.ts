/**
 * Patrolling Route Models
 * For managing guard patrolling routes with checkpoints
 */

export enum CheckpointType {
  QR_CODE = 'QR_CODE',           // QR code checkpoint
  NFC_TAG = 'NFC_TAG',           // NFC tag checkpoint
  GPS_LOCATION = 'GPS_LOCATION', // GPS-based checkpoint
  MANUAL = 'MANUAL'              // Manual check-in checkpoint
}

export enum RouteStatus {
  ACTIVE = 'ACTIVE',             // Route is active and in use
  INACTIVE = 'INACTIVE',         // Route is inactive
  DRAFT = 'DRAFT',               // Route is being drafted
  ARCHIVED = 'ARCHIVED'          // Route is archived
}

export enum CheckpointStatus {
  PENDING = 'PENDING',           // Not yet scanned
  COMPLETED = 'COMPLETED',       // Successfully scanned
  MISSED = 'MISSED',             // Missed checkpoint
  LATE = 'LATE',                 // Scanned late
  SKIPPED = 'SKIPPED'            // Skipped by guard
}

export interface Checkpoint {
  id: string;
  // Basic Information
  name: string;
  description?: string;
  type: CheckpointType;
  // Location
  location: string;              // Location name/description
  buildingName?: string;
  floorNumber?: number;
  area?: string;                 // Area/zone identifier
  // Coordinates (for GPS checkpoints)
  latitude?: number;
  longitude?: number;
  // Checkpoint Identifier
  qrCode?: string;              // QR code data
  nfcTagId?: string;            // NFC tag ID
  checkpointCode?: string;      // Unique checkpoint code
  // Timing
  expectedDuration?: number;     // Expected time to reach (in minutes)
  scanWindow?: number;          // Allowed scan window in minutes (±)
  order: number;                 // Order in route sequence
  // Requirements
  isRequired: boolean;          // Whether checkpoint is mandatory
  requiresPhoto: boolean;       // Whether photo is required
  requiresNotes: boolean;       // Whether notes are required
  // Status
  status?: CheckpointStatus;
  lastScannedAt?: Date;
  lastScannedBy?: string;
  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatrollingRoute {
  id: string;
  // Basic Information
  name: string;
  description?: string;
  code?: string;                 // Route code/identifier
  // Checkpoints
  checkpoints: Checkpoint[];
  // Status
  status: RouteStatus;
  // Schedule
  scheduleType: 'DAILY' | 'WEEKLY' | 'CUSTOM' | 'ON_DEMAND';
  scheduleDays?: string[];      // ['MON', 'TUE', etc.] for weekly
  scheduleTime?: string;        // HH:mm format for daily
  startTime?: string;           // Route start time
  endTime?: string;             // Route end time
  estimatedDuration?: number;   // Total estimated duration in minutes
  // Assignment
  assignedGuards?: string[];     // Guard IDs assigned to this route
  assignedShifts?: string[];     // Shift IDs
  // Requirements
  requiresAllCheckpoints: boolean; // Must complete all checkpoints
  allowSkipping: boolean;        // Allow skipping checkpoints
  maxLateMinutes?: number;      // Maximum late minutes allowed
  // Statistics
  totalPatrols?: number;        // Total patrols completed
  completedPatrols?: number;    // Successfully completed patrols
  averageCompletionTime?: number; // Average completion time in minutes
  lastPatrolAt?: Date;
  lastPatrolBy?: string;
  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface CreatePatrollingRouteRequest {
  name: string;
  description?: string;
  code?: string;
  checkpoints: CreateCheckpointRequest[];
  status: RouteStatus;
  scheduleType: 'DAILY' | 'WEEKLY' | 'CUSTOM' | 'ON_DEMAND';
  scheduleDays?: string[];
  scheduleTime?: string;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  assignedGuards?: string[];
  assignedShifts?: string[];
  requiresAllCheckpoints: boolean;
  allowSkipping: boolean;
  maxLateMinutes?: number;
  notes?: string;
  tags?: string[];
}

export interface CreateCheckpointRequest {
  name: string;
  description?: string;
  type: CheckpointType;
  location: string;
  buildingName?: string;
  floorNumber?: number;
  area?: string;
  latitude?: number;
  longitude?: number;
  qrCode?: string;
  nfcTagId?: string;
  checkpointCode?: string;
  expectedDuration?: number;
  scanWindow?: number;
  order: number;
  isRequired: boolean;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  notes?: string;
}

export interface UpdatePatrollingRouteRequest {
  name?: string;
  description?: string;
  code?: string;
  checkpoints?: CreateCheckpointRequest[];
  status?: RouteStatus;
  scheduleType?: 'DAILY' | 'WEEKLY' | 'CUSTOM' | 'ON_DEMAND';
  scheduleDays?: string[];
  scheduleTime?: string;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  assignedGuards?: string[];
  assignedShifts?: string[];
  requiresAllCheckpoints?: boolean;
  allowSkipping?: boolean;
  maxLateMinutes?: number;
  notes?: string;
  tags?: string[];
}

export interface UpdateCheckpointRequest {
  name?: string;
  description?: string;
  location?: string;
  buildingName?: string;
  floorNumber?: number;
  area?: string;
  latitude?: number;
  longitude?: number;
  expectedDuration?: number;
  scanWindow?: number;
  order?: number;
  isRequired?: boolean;
  requiresPhoto?: boolean;
  requiresNotes?: boolean;
  notes?: string;
}

export interface PatrollingRouteResponse {
  success: boolean;
  message: string;
  route?: PatrollingRoute;
  errors?: string[];
}

export interface PatrollingRouteFilter {
  status?: RouteStatus;
  scheduleType?: string;
  assignedGuard?: string;
  searchTerm?: string;
}

export interface PatrollingRouteStatistics {
  totalRoutes: number;
  activeRoutes: number;
  inactiveRoutes: number;
  draftRoutes: number;
  archivedRoutes: number;
  totalCheckpoints: number;
  averageCheckpointsPerRoute: number;
  totalPatrols: number;
  completedPatrols: number;
  averageCompletionRate: number;
  byScheduleType: {
    [type: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
}

