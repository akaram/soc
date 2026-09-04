/**
 * Patrol Completion Report Models
 * For generating and managing patrol completion reports
 */

export enum ReportStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED'
}

export enum ReportType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
  ROUTE_SPECIFIC = 'ROUTE_SPECIFIC',
  GUARD_SPECIFIC = 'GUARD_SPECIFIC'
}

export enum CompletionStatus {
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  MISSED = 'MISSED',
  ABANDONED = 'ABANDONED',
  DELAYED = 'DELAYED'
}

export interface PatrolCompletion {
  patrolId: string;
  routeId: string;
  routeName: string;
  guardId: string;
  guardName: string;
  guardBadgeNumber?: string;
  startTime: Date;
  endTime?: Date;
  expectedEndTime?: Date;
  status: CompletionStatus;
  completedCheckpoints: number;
  totalCheckpoints: number;
  missedCheckpoints: string[];
  lateCheckpoints: string[];
  onTimeCheckpoints: number;
  completionPercentage: number;
  duration: number;                        // Minutes
  expectedDuration?: number;
  isOnTime: boolean;
  isComplete: boolean;
  notes?: string;
  issues?: string[];
}

export interface PatrolCompletionReport {
  id: string;
  // Report Information
  reportName: string;
  reportType: ReportType;
  status: ReportStatus;
  // Date Range
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  generatedBy: string;
  /** Present when created by server scheduler (SCHEDULED) vs manual UI. */
  reportSource?: string;
  // Filters Applied
  routeIds?: string[];
  guardIds?: string[];
  // Summary Statistics
  totalPatrols: number;
  completedPatrols: number;
  partialPatrols: number;
  missedPatrols: number;
  abandonedPatrols: number;
  delayedPatrols: number;
  completionRate: number;                  // Percentage
  onTimeRate: number;                      // Percentage
  averageCompletionTime: number;           // Minutes
  totalCheckpointsScanned: number;
  totalCheckpointsMissed: number;
  totalCheckpointsLate: number;
  // Detailed Data
  patrolCompletions: PatrolCompletion[];
  // Route Statistics
  routeStatistics: {
    routeId: string;
    routeName: string;
    totalPatrols: number;
    completedPatrols: number;
    completionRate: number;
    averageTime: number;
  }[];
  // Guard Statistics
  guardStatistics: {
    guardId: string;
    guardName: string;
    totalPatrols: number;
    completedPatrols: number;
    completionRate: number;
    onTimeRate: number;
    averageTime: number;
  }[];
  // Time-based Statistics
  dailyStatistics: {
    date: Date;
    totalPatrols: number;
    completedPatrols: number;
    completionRate: number;
  }[];
  // Issues and Alerts
  totalIssues: number;
  criticalIssues: number;
  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateReportRequest {
  reportName: string;
  reportType: ReportType;
  startDate: Date;
  endDate: Date;
  routeIds?: string[];
  guardIds?: string[];
  includeDetails?: boolean;
  includeStatistics?: boolean;
  includeCharts?: boolean;
}

export interface PatrolCompletionReportFilter {
  reportType?: ReportType;
  status?: ReportStatus;
  startDate?: Date;
  endDate?: Date;
  generatedBy?: string;
  searchTerm?: string;
}

export interface PatrolCompletionReportStatistics {
  totalReports: number;
  generatedReports: number;
  approvedReports: number;
  draftReports: number;
  archivedReports: number;
  byType: {
    [type: string]: number;
  };
  recentReports: PatrolCompletionReport[];
}

