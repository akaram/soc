/**
 * Incident Report Models
 * For reporting and managing incidents during patrols
 */

export enum IncidentType {
  THEFT = 'THEFT',
  VANDALISM = 'VANDALISM',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  TRESPASSING = 'TRESPASSING',
  MEDICAL_EMERGENCY = 'MEDICAL_EMERGENCY',
  FIRE = 'FIRE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  SECURITY_BREACH = 'SECURITY_BREACH',
  ASSAULT = 'ASSAULT',
  VEHICLE_ACCIDENT = 'VEHICLE_ACCIDENT',
  NATURAL_DISASTER = 'NATURAL_DISASTER',
  OTHER = 'OTHER'
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IncidentStatus {
  REPORTED = 'REPORTED',           // Initial report created
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', // Being investigated
  RESOLVED = 'RESOLVED',           // Incident resolved
  ESCALATED = 'ESCALATED',         // Escalated to authorities
  CLOSED = 'CLOSED',               // Case closed
  CANCELLED = 'CANCELLED'          // False alarm or cancelled
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface IncidentReport {
  id: string;
  // Incident Information
  incidentNumber: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  priority: Priority;
  status: IncidentStatus;
  // Location
  location: string;
  locationDetails?: string;
  latitude?: number;
  longitude?: number;
  // Patrol Information
  patrolId?: string;
  routeId?: string;
  routeName?: string;
  checkpointId?: string;
  checkpointName?: string;
  // Reporting Guard
  reportedByGuardId: string;
  reportedByGuardName: string;
  reportedByGuardBadgeNumber?: string;
  // Timing
  incidentDateTime: Date;
  reportedDateTime: Date;
  // Response
  responseTime?: number;                    // Minutes
  firstResponder?: string;
  assignedTo?: string;
  assignedToName?: string;
  // Investigation
  investigationNotes?: string;
  investigationStartedAt?: Date;
  investigationCompletedAt?: Date;
  investigatorName?: string;
  // Resolution
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedByName?: string;
  // Escalation
  escalatedAt?: Date;
  escalatedTo?: string;
  escalationReason?: string;
  // Authorities
  policeNotified: boolean;
  policeReportNumber?: string;
  fireDepartmentNotified: boolean;
  medicalServicesNotified: boolean;
  // Witnesses
  witnesses?: {
    name: string;
    contact?: string;
    statement?: string;
  }[];
  // Evidence
  evidenceCollected: boolean;
  evidenceDescription?: string;
  // Attachments (base64 data URLs or server paths)
  attachments?: {
    id: string;
    type: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
    url: string;
    fileName?: string;
    description?: string;
    uploadedAt: Date;
  }[];
  // Follow-up
  requiresFollowUp: boolean;
  followUpDate?: Date;
  followUpNotes?: string;
  // Metadata
  tags?: string[];
  relatedIncidentIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIncidentReportRequest {
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  priority: Priority;
  location: string;
  locationDetails?: string;
  latitude?: number;
  longitude?: number;
  patrolId?: string;
  routeId?: string;
  routeName?: string;
  checkpointId?: string;
  checkpointName?: string;
  reportedByGuardId: string;
  reportedByGuardName: string;
  incidentDateTime: Date;
  witnesses?: {
    name: string;
    contact?: string;
    statement?: string;
  }[];
  /** Photo evidence as base64 data URLs or server URLs. */
  attachments?: {
    id: string;
    type: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
    url: string;
    fileName?: string;
    description?: string;
    uploadedAt: Date;
  }[];
  tags?: string[];
}

export interface UpdateIncidentReportRequest {
  title?: string;
  description?: string;
  type?: IncidentType;
  severity?: IncidentSeverity;
  priority?: Priority;
  status?: IncidentStatus;
  location?: string;
  locationDetails?: string;
  assignedTo?: string;
  investigationNotes?: string;
  resolutionNotes?: string;
  escalatedTo?: string;
  escalationReason?: string;
  policeNotified?: boolean;
  policeReportNumber?: string;
  fireDepartmentNotified?: boolean;
  medicalServicesNotified?: boolean;
  evidenceCollected?: boolean;
  evidenceDescription?: string;
  requiresFollowUp?: boolean;
  followUpDate?: Date;
  followUpNotes?: string;
  tags?: string[];
}

export interface IncidentReportFilter {
  type?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  priority?: Priority;
  reportedByGuardId?: string;
  assignedTo?: string;
  routeId?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  showOnlyOpen?: boolean;
  showOnlyCritical?: boolean;
  requiresFollowUp?: boolean;
}

export interface IncidentReportStatistics {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  byType: {
    [type: string]: number;
  };
  bySeverity: {
    [severity: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
  averageResponseTime?: number;            // Minutes
  incidentsToday: number;
  incidentsThisWeek: number;
  incidentsThisMonth: number;
  topReporters: {
    guardId: string;
    guardName: string;
    incidentCount: number;
  }[];
  topLocations: {
    location: string;
    incidentCount: number;
  }[];
}

export interface IncidentReportResponse {
  success: boolean;
  message: string;
  incident?: IncidentReport;
  errors?: string[];
}

