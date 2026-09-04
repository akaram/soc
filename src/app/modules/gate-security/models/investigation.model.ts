/**
 * Investigation Module Models
 * For managing security investigations and empty flat logs
 */

export enum InvestigationType {
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  THEFT = 'THEFT',
  VANDALISM = 'VANDALISM',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  EMPTY_FLAT_INVESTIGATION = 'EMPTY_FLAT_INVESTIGATION',
  VISITOR_VIOLATION = 'VISITOR_VIOLATION',
  VEHICLE_VIOLATION = 'VEHICLE_VIOLATION',
  OTHER = 'OTHER'
}

export enum InvestigationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum InvestigationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum EmptyFlatStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  UNDER_RENOVATION = 'UNDER_RENOVATION',
  LOCKED = 'LOCKED',
  UNKNOWN = 'UNKNOWN'
}

export interface Investigation {
  id: string;
  // Basic Information
  type: InvestigationType;
  title: string;
  description: string;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  // Location & Context
  flatNumber?: string;
  unitNumber?: string;
  buildingName?: string;
  gateId?: string;
  gateName?: string;
  location?: string;
  // Related Entities
  relatedVisitorId?: string;
  relatedVehicleId?: string;
  relatedBlacklistId?: string;
  relatedIncidentId?: string;
  // People Involved
  reportedBy: string;
  reportedByName?: string;
  reportedByRole?: string; // Guard, Resident, Admin, etc.
  assignedTo?: string;
  assignedToName?: string;
  suspects?: string[]; // Names or IDs of suspects
  witnesses?: string[]; // Names or IDs of witnesses
  // Timeline
  reportedAt: Date;
  startedAt?: Date;
  lastUpdatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  // Evidence & Documentation
  photos?: string[]; // URLs or base64
  videos?: string[]; // URLs
  documents?: string[]; // URLs
  audioRecordings?: string[]; // URLs
  // Investigation Details
  findings?: string;
  actionsTaken?: string[];
  recommendations?: string;
  resolution?: string;
  // Metadata
  tags?: string[];
  notes?: string;
  isConfidential: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface EmptyFlatLog {
  id: string;
  // Flat Information
  flatNumber: string;
  unitNumber?: string;
  buildingName?: string;
  floorNumber?: number;
  flatType?: string; // 1BHK, 2BHK, 3BHK, etc.
  // Status
  status: EmptyFlatStatus;
  previousStatus?: EmptyFlatStatus;
  // Ownership/Resident Info
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  // Timeline
  firstDetectedAt: Date;
  lastCheckedAt: Date;
  lastOccupiedAt?: Date; // Last known occupation date
  expectedReturnDate?: Date;
  // Investigation
  investigationId?: string;
  investigation?: Investigation;
  isUnderInvestigation: boolean;
  // Observations
  observations?: string;
  signsOfActivity?: string[]; // Lights, sounds, deliveries, etc.
  lastActivityDate?: Date;
  // Security Concerns
  securityConcerns?: string[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  // Check History
  checkHistory?: FlatCheckRecord[];
  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface FlatCheckRecord {
  id: string;
  flatLogId: string;
  checkedBy: string;
  checkedByName?: string;
  checkedAt: Date;
  status: EmptyFlatStatus;
  observations?: string;
  photos?: string[];
  notes?: string;
}

export interface CreateInvestigationRequest {
  type: InvestigationType;
  title: string;
  description: string;
  priority: InvestigationPriority;
  flatNumber?: string;
  unitNumber?: string;
  buildingName?: string;
  gateId?: string;
  location?: string;
  relatedVisitorId?: string;
  relatedVehicleId?: string;
  relatedBlacklistId?: string;
  reportedBy: string;
  assignedTo?: string;
  suspects?: string[];
  witnesses?: string[];
  photos?: string[];
  videos?: string[];
  documents?: string[];
  tags?: string[];
  notes?: string;
  isConfidential?: boolean;
}

export interface UpdateInvestigationRequest {
  status?: InvestigationStatus;
  priority?: InvestigationPriority;
  assignedTo?: string;
  findings?: string;
  actionsTaken?: string[];
  recommendations?: string;
  resolution?: string;
  photos?: string[];
  videos?: string[];
  documents?: string[];
  notes?: string;
  isConfidential?: boolean;
}

export interface CreateEmptyFlatLogRequest {
  flatNumber: string;
  unitNumber?: string;
  buildingName?: string;
  floorNumber?: number;
  flatType?: string;
  status: EmptyFlatStatus;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  lastOccupiedAt?: Date;
  expectedReturnDate?: Date;
  observations?: string;
  signsOfActivity?: string[];
  lastActivityDate?: Date;
  securityConcerns?: string[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

export interface UpdateEmptyFlatLogRequest {
  status?: EmptyFlatStatus;
  observations?: string;
  signsOfActivity?: string[];
  lastActivityDate?: Date;
  securityConcerns?: string[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

export interface InvestigationResponse {
  success: boolean;
  message: string;
  investigation?: Investigation;
  errors?: string[];
}

export interface EmptyFlatLogResponse {
  success: boolean;
  message: string;
  log?: EmptyFlatLog;
  errors?: string[];
}

export interface InvestigationFilter {
  type?: InvestigationType;
  status?: InvestigationStatus;
  priority?: InvestigationPriority;
  flatNumber?: string;
  reportedBy?: string;
  assignedTo?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  isConfidential?: boolean;
}

export interface EmptyFlatLogFilter {
  status?: EmptyFlatStatus;
  buildingName?: string;
  floorNumber?: number;
  flatType?: string;
  isUnderInvestigation?: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface InvestigationStatistics {
  totalInvestigations: number;
  openInvestigations: number;
  inProgressInvestigations: number;
  resolvedInvestigations: number;
  byType: {
    [type: string]: number;
  };
  byStatus: {
    [status: string]: number;
  };
  byPriority: {
    [priority: string]: number;
  };
  recentInvestigations: number; // Last 7 days
  averageResolutionTime: number; // in hours
}

export interface EmptyFlatStatistics {
  totalEmptyFlats: number;
  vacantFlats: number;
  underRenovation: number;
  lockedFlats: number;
  unknownStatus: number;
  underInvestigation: number;
  highRiskFlats: number;
  byBuilding: {
    [building: string]: number;
  };
  byFlatType: {
    [type: string]: number;
  };
  averageVacancyDuration: number; // in days
}

