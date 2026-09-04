import {
  CompletionStatus,
  PatrolCompletion,
  PatrolCompletionReport,
  ReportStatus,
  ReportType
} from '../models/patrol-completion-report.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapPatrolCompletion(raw: Record<string, unknown>): PatrolCompletion {
  return {
    patrolId: String(raw['patrolId'] ?? ''),
    routeId: String(raw['routeId'] ?? ''),
    routeName: String(raw['routeName'] ?? ''),
    guardId: String(raw['guardId'] ?? ''),
    guardName: String(raw['guardName'] ?? ''),
    guardBadgeNumber: raw['guardBadgeNumber'] != null ? String(raw['guardBadgeNumber']) : undefined,
    startTime: parseDate(raw['startTime']),
    endTime: raw['endTime'] != null ? parseDate(raw['endTime']) : undefined,
    expectedEndTime: raw['expectedEndTime'] != null ? parseDate(raw['expectedEndTime']) : undefined,
    status: (raw['status'] ?? CompletionStatus.COMPLETED) as CompletionStatus,
    completedCheckpoints: Number(raw['completedCheckpoints'] ?? 0),
    totalCheckpoints: Number(raw['totalCheckpoints'] ?? 0),
    missedCheckpoints: Array.isArray(raw['missedCheckpoints'])
      ? (raw['missedCheckpoints'] as string[])
      : [],
    lateCheckpoints: Array.isArray(raw['lateCheckpoints']) ? (raw['lateCheckpoints'] as string[]) : [],
    onTimeCheckpoints: Number(raw['onTimeCheckpoints'] ?? 0),
    completionPercentage: Number(raw['completionPercentage'] ?? 0),
    duration: Number(raw['duration'] ?? 0),
    expectedDuration: raw['expectedDuration'] != null ? Number(raw['expectedDuration']) : undefined,
    isOnTime: Boolean(raw['isOnTime']),
    isComplete: Boolean(raw['isComplete']),
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    issues: Array.isArray(raw['issues']) ? (raw['issues'] as string[]) : undefined
  };
}

/** Maps GET /patrol-completion-reports JSON to PatrolCompletionReport. */
export function mapPatrolCompletionReportFromApi(raw: Record<string, unknown>): PatrolCompletionReport {
  const routeStatistics = Array.isArray(raw['routeStatistics'])
    ? (raw['routeStatistics'] as Record<string, unknown>[]).map(r => ({
        routeId: String(r['routeId'] ?? ''),
        routeName: String(r['routeName'] ?? ''),
        totalPatrols: Number(r['totalPatrols'] ?? 0),
        completedPatrols: Number(r['completedPatrols'] ?? 0),
        completionRate: Number(r['completionRate'] ?? 0),
        averageTime: Number(r['averageTime'] ?? 0)
      }))
    : [];

  const guardStatistics = Array.isArray(raw['guardStatistics'])
    ? (raw['guardStatistics'] as Record<string, unknown>[]).map(r => ({
        guardId: String(r['guardId'] ?? ''),
        guardName: String(r['guardName'] ?? ''),
        totalPatrols: Number(r['totalPatrols'] ?? 0),
        completedPatrols: Number(r['completedPatrols'] ?? 0),
        completionRate: Number(r['completionRate'] ?? 0),
        onTimeRate: Number(r['onTimeRate'] ?? 0),
        averageTime: Number(r['averageTime'] ?? 0)
      }))
    : [];

  const dailyStatistics = Array.isArray(raw['dailyStatistics'])
    ? (raw['dailyStatistics'] as Record<string, unknown>[]).map(d => ({
        date: parseDate(d['date']),
        totalPatrols: Number(d['totalPatrols'] ?? 0),
        completedPatrols: Number(d['completedPatrols'] ?? 0),
        completionRate: Number(d['completionRate'] ?? 0)
      }))
    : [];

  const patrolCompletions = Array.isArray(raw['patrolCompletions'])
    ? (raw['patrolCompletions'] as Record<string, unknown>[]).map(mapPatrolCompletion)
    : [];

  return {
    id: String(raw['id'] ?? ''),
    reportName: String(raw['reportName'] ?? ''),
    reportType: (raw['reportType'] ?? ReportType.DAILY) as ReportType,
    status: (raw['status'] ?? ReportStatus.DRAFT) as ReportStatus,
    startDate: parseDate(raw['startDate']),
    endDate: parseDate(raw['endDate']),
    generatedAt: parseDate(raw['generatedAt']),
    generatedBy: String(raw['generatedBy'] ?? ''),
    reportSource: raw['reportSource'] != null ? String(raw['reportSource']) : undefined,
    routeIds: Array.isArray(raw['routeIds']) ? (raw['routeIds'] as string[]) : undefined,
    guardIds: Array.isArray(raw['guardIds']) ? (raw['guardIds'] as string[]) : undefined,
    totalPatrols: Number(raw['totalPatrols'] ?? 0),
    completedPatrols: Number(raw['completedPatrols'] ?? 0),
    partialPatrols: Number(raw['partialPatrols'] ?? 0),
    missedPatrols: Number(raw['missedPatrols'] ?? 0),
    abandonedPatrols: Number(raw['abandonedPatrols'] ?? 0),
    delayedPatrols: Number(raw['delayedPatrols'] ?? 0),
    completionRate: Number(raw['completionRate'] ?? 0),
    onTimeRate: Number(raw['onTimeRate'] ?? 0),
    averageCompletionTime: Number(raw['averageCompletionTime'] ?? 0),
    totalCheckpointsScanned: Number(raw['totalCheckpointsScanned'] ?? 0),
    totalCheckpointsMissed: Number(raw['totalCheckpointsMissed'] ?? 0),
    totalCheckpointsLate: Number(raw['totalCheckpointsLate'] ?? 0),
    patrolCompletions,
    routeStatistics,
    guardStatistics,
    dailyStatistics,
    totalIssues: Number(raw['totalIssues'] ?? 0),
    criticalIssues: Number(raw['criticalIssues'] ?? 0),
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]) : undefined,
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt'])
  };
}
