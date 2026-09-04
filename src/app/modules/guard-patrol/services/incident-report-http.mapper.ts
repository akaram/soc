import {
  IncidentReport,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  Priority
} from '../models/incident-report.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function parseEnum<T extends string>(allowed: readonly T[], v: unknown, fallback: T): T {
  const s = String(v ?? '');
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}

/** Maps GET /patrol-incidents JSON to IncidentReport. */
export function mapIncidentFromApi(raw: Record<string, unknown>): IncidentReport {
  const types = Object.values(IncidentType);
  const sev = Object.values(IncidentSeverity);
  const stat = Object.values(IncidentStatus);
  const pri = Object.values(Priority);

  const witnesses = Array.isArray(raw['witnesses'])
    ? (raw['witnesses'] as Record<string, unknown>[]).map(w => ({
        name: String(w['name'] ?? ''),
        contact: w['contact'] != null ? String(w['contact']) : undefined,
        statement: w['statement'] != null ? String(w['statement']) : undefined
      }))
    : [];

  const mapAttachment = (a: Record<string, unknown>) => ({
    id: String(a['id'] ?? ''),
    type: (a['type'] as 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'AUDIO') ?? 'PHOTO',
    url: String(a['url'] ?? a['preview'] ?? a['dataUrl'] ?? ''),
    fileName: a['fileName'] != null ? String(a['fileName']) : undefined,
    description: a['description'] != null ? String(a['description']) : undefined,
    uploadedAt: parseDate(a['uploadedAt'])
  });

  let attachments = Array.isArray(raw['attachments'])
    ? (raw['attachments'] as Record<string, unknown>[]).map(mapAttachment).filter(a => a.url)
    : undefined;

  // Legacy guard submit stored photos under a separate array.
  if (!attachments?.length && Array.isArray(raw['photos'])) {
    attachments = (raw['photos'] as Record<string, unknown>[])
      .map(p => mapAttachment({ ...p, type: 'PHOTO', url: p['preview'] ?? p['url'] }))
      .filter(a => a.url);
  }

  return {
    id: String(raw['id'] ?? ''),
    incidentNumber: String(raw['incidentNumber'] ?? ''),
    title: String(raw['title'] ?? ''),
    description: String(raw['description'] ?? ''),
    type: parseEnum(types, raw['type'], IncidentType.OTHER),
    severity: parseEnum(sev, raw['severity'], IncidentSeverity.MEDIUM),
    priority: parseEnum(pri, raw['priority'], Priority.NORMAL),
    status: parseEnum(stat, raw['status'], IncidentStatus.REPORTED),
    location: String(raw['location'] ?? ''),
    locationDetails: raw['locationDetails'] != null ? String(raw['locationDetails']) : undefined,
    latitude: raw['latitude'] != null ? Number(raw['latitude']) : undefined,
    longitude: raw['longitude'] != null ? Number(raw['longitude']) : undefined,
    patrolId: raw['patrolId'] != null ? String(raw['patrolId']) : undefined,
    routeId: raw['routeId'] != null ? String(raw['routeId']) : undefined,
    routeName: raw['routeName'] != null ? String(raw['routeName']) : undefined,
    checkpointId: raw['checkpointId'] != null ? String(raw['checkpointId']) : undefined,
    checkpointName: raw['checkpointName'] != null ? String(raw['checkpointName']) : undefined,
    reportedByGuardId: String(raw['reportedByGuardId'] ?? ''),
    reportedByGuardName: String(raw['reportedByGuardName'] ?? ''),
    reportedByGuardBadgeNumber:
      raw['reportedByGuardBadgeNumber'] != null ? String(raw['reportedByGuardBadgeNumber']) : undefined,
    incidentDateTime: parseDate(raw['incidentDateTime']),
    reportedDateTime: parseDate(raw['reportedDateTime']),
    responseTime: raw['responseTime'] != null ? Number(raw['responseTime']) : undefined,
    firstResponder: raw['firstResponder'] != null ? String(raw['firstResponder']) : undefined,
    assignedTo: raw['assignedTo'] != null ? String(raw['assignedTo']) : undefined,
    assignedToName: raw['assignedToName'] != null ? String(raw['assignedToName']) : undefined,
    investigationNotes: raw['investigationNotes'] != null ? String(raw['investigationNotes']) : undefined,
    investigationStartedAt:
      raw['investigationStartedAt'] != null ? parseDate(raw['investigationStartedAt']) : undefined,
    investigationCompletedAt:
      raw['investigationCompletedAt'] != null ? parseDate(raw['investigationCompletedAt']) : undefined,
    investigatorName: raw['investigatorName'] != null ? String(raw['investigatorName']) : undefined,
    resolutionNotes: raw['resolutionNotes'] != null ? String(raw['resolutionNotes']) : undefined,
    resolvedAt: raw['resolvedAt'] != null ? parseDate(raw['resolvedAt']) : undefined,
    resolvedBy: raw['resolvedBy'] != null ? String(raw['resolvedBy']) : undefined,
    resolvedByName: raw['resolvedByName'] != null ? String(raw['resolvedByName']) : undefined,
    escalatedAt: raw['escalatedAt'] != null ? parseDate(raw['escalatedAt']) : undefined,
    escalatedTo: raw['escalatedTo'] != null ? String(raw['escalatedTo']) : undefined,
    escalationReason: raw['escalationReason'] != null ? String(raw['escalationReason']) : undefined,
    policeNotified: Boolean(raw['policeNotified']),
    policeReportNumber: raw['policeReportNumber'] != null ? String(raw['policeReportNumber']) : undefined,
    fireDepartmentNotified: Boolean(raw['fireDepartmentNotified']),
    medicalServicesNotified: Boolean(raw['medicalServicesNotified']),
    witnesses,
    evidenceCollected:
      Boolean(raw['evidenceCollected']) || (attachments?.length ?? 0) > 0,
    evidenceDescription: raw['evidenceDescription'] != null ? String(raw['evidenceDescription']) : undefined,
    attachments,
    requiresFollowUp: Boolean(raw['requiresFollowUp']),
    followUpDate: raw['followUpDate'] != null ? parseDate(raw['followUpDate']) : undefined,
    followUpNotes: raw['followUpNotes'] != null ? String(raw['followUpNotes']) : undefined,
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]) : undefined,
    relatedIncidentIds: Array.isArray(raw['relatedIncidentIds'])
      ? (raw['relatedIncidentIds'] as string[])
      : undefined,
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt'])
  };
}
