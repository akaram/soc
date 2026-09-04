/**
 * Maps between Investigation UI models and the live {@code /investigations} + {@code /empty-flat-logs} APIs.
 */

import {
  Investigation,
  EmptyFlatLog,
  FlatCheckRecord,
  InvestigationType,
  InvestigationStatus,
  InvestigationPriority,
  EmptyFlatStatus,
  CreateInvestigationRequest,
  UpdateInvestigationRequest,
  CreateEmptyFlatLogRequest,
  UpdateEmptyFlatLogRequest,
  InvestigationFilter,
  EmptyFlatLogFilter,
  InvestigationStatistics,
  EmptyFlatStatistics
} from '../models/investigation.model';

/** Parse API date strings into Date objects */
export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Parse JSON array fields returned as string or array from the API */
export function parseJsonArray<T = string>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const GATE_NAMES: Record<string, string> = {
  MAIN_GATE: 'Main Gate',
  SIDE_GATE: 'Side Gate',
  PARKING_GATE: 'Parking Gate',
  EMERGENCY_GATE: 'Emergency Gate'
};

/** Resolve gate display name from gate id */
export function resolveGateName(gateId?: string): string {
  if (!gateId) return '';
  return GATE_NAMES[gateId] ?? gateId;
}

/** Raw investigation row from API */
export function apiToInvestigation(raw: Record<string, unknown>): Investigation {
  const gateId = raw['gateId'] ? String(raw['gateId']) : undefined;
  return {
    id: String(raw['id'] ?? ''),
    type: String(raw['type'] ?? InvestigationType.OTHER) as InvestigationType,
    title: String(raw['title'] ?? ''),
    description: String(raw['description'] ?? ''),
    status: String(raw['status'] ?? InvestigationStatus.OPEN) as InvestigationStatus,
    priority: String(raw['priority'] ?? InvestigationPriority.MEDIUM) as InvestigationPriority,
    flatNumber: raw['flatNumber'] ? String(raw['flatNumber']) : undefined,
    unitNumber: raw['unitNumber'] ? String(raw['unitNumber']) : undefined,
    buildingName: raw['buildingName'] ? String(raw['buildingName']) : undefined,
    gateId,
    gateName: resolveGateName(gateId),
    location: raw['location'] ? String(raw['location']) : undefined,
    relatedVisitorId: raw['relatedVisitorId'] ? String(raw['relatedVisitorId']) : undefined,
    relatedVehicleId: raw['relatedVehicleId'] ? String(raw['relatedVehicleId']) : undefined,
    relatedBlacklistId: raw['relatedBlacklistId'] ? String(raw['relatedBlacklistId']) : undefined,
    relatedIncidentId: raw['relatedIncidentId'] ? String(raw['relatedIncidentId']) : undefined,
    reportedBy: String(raw['reportedBy'] ?? ''),
    reportedByName: raw['reportedByName'] ? String(raw['reportedByName']) : undefined,
    reportedByRole: raw['reportedByRole'] ? String(raw['reportedByRole']) : undefined,
    assignedTo: raw['assignedTo'] ? String(raw['assignedTo']) : undefined,
    assignedToName: raw['assignedToName'] ? String(raw['assignedToName']) : undefined,
    suspects: parseJsonArray<string>(raw['suspects']),
    witnesses: parseJsonArray<string>(raw['witnesses']),
    reportedAt: parseApiDate(raw['reportedAt']) ?? new Date(),
    startedAt: parseApiDate(raw['startedAt']),
    lastUpdatedAt: parseApiDate(raw['lastUpdatedAt']) ?? new Date(),
    resolvedAt: parseApiDate(raw['resolvedAt']),
    closedAt: parseApiDate(raw['closedAt']),
    photos: parseJsonArray<string>(raw['photos']),
    videos: parseJsonArray<string>(raw['videos']),
    documents: parseJsonArray<string>(raw['documents']),
    audioRecordings: parseJsonArray<string>(raw['audioRecordings']),
    findings: raw['findings'] ? String(raw['findings']) : undefined,
    actionsTaken: parseJsonArray<string>(raw['actionsTaken']),
    recommendations: raw['recommendations'] ? String(raw['recommendations']) : undefined,
    resolution: raw['resolution'] ? String(raw['resolution']) : undefined,
    tags: parseJsonArray<string>(raw['tags']),
    notes: raw['notes'] ? String(raw['notes']) : undefined,
    isConfidential: Boolean(raw['isConfidential']),
    createdAt: parseApiDate(raw['createdAt']) ?? new Date(),
    updatedAt: parseApiDate(raw['updatedAt'] ?? raw['lastModified']) ?? new Date(),
    createdBy: String(raw['createdBy'] ?? raw['reportedBy'] ?? ''),
    updatedBy: raw['updatedBy'] ? String(raw['updatedBy']) : undefined
  };
}

/** Raw empty flat log row from API */
export function apiToEmptyFlatLog(raw: Record<string, unknown>): EmptyFlatLog {
  const checkHistoryRaw = parseJsonArray<Record<string, unknown>>(raw['checkHistory']);
  const checkHistory: FlatCheckRecord[] = checkHistoryRaw.map(ch => ({
    id: String(ch['id'] ?? ''),
    flatLogId: String(ch['flatLogId'] ?? raw['id'] ?? ''),
    checkedBy: String(ch['checkedBy'] ?? ''),
    checkedByName: ch['checkedByName'] ? String(ch['checkedByName']) : undefined,
    checkedAt: parseApiDate(ch['checkedAt']) ?? new Date(),
    status: String(ch['status'] ?? EmptyFlatStatus.UNKNOWN) as EmptyFlatStatus,
    observations: ch['observations'] ? String(ch['observations']) : undefined,
    photos: parseJsonArray<string>(ch['photos']),
    notes: ch['notes'] ? String(ch['notes']) : undefined
  }));

  return {
    id: String(raw['id'] ?? ''),
    flatNumber: String(raw['flatNumber'] ?? ''),
    unitNumber: raw['unitNumber'] ? String(raw['unitNumber']) : undefined,
    buildingName: raw['buildingName'] ? String(raw['buildingName']) : undefined,
    floorNumber: raw['floorNumber'] != null ? Number(raw['floorNumber']) : undefined,
    flatType: raw['flatType'] ? String(raw['flatType']) : undefined,
    status: String(raw['status'] ?? EmptyFlatStatus.UNKNOWN) as EmptyFlatStatus,
    previousStatus: raw['previousStatus']
      ? (String(raw['previousStatus']) as EmptyFlatStatus)
      : undefined,
    ownerName: raw['ownerName'] ? String(raw['ownerName']) : undefined,
    ownerPhone: raw['ownerPhone'] ? String(raw['ownerPhone']) : undefined,
    ownerEmail: raw['ownerEmail'] ? String(raw['ownerEmail']) : undefined,
    tenantName: raw['tenantName'] ? String(raw['tenantName']) : undefined,
    tenantPhone: raw['tenantPhone'] ? String(raw['tenantPhone']) : undefined,
    tenantEmail: raw['tenantEmail'] ? String(raw['tenantEmail']) : undefined,
    firstDetectedAt: parseApiDate(raw['firstDetectedAt']) ?? new Date(),
    lastCheckedAt: parseApiDate(raw['lastCheckedAt']) ?? new Date(),
    lastOccupiedAt: parseApiDate(raw['lastOccupiedAt']),
    expectedReturnDate: parseApiDate(raw['expectedReturnDate']),
    investigationId: raw['investigationId'] ? String(raw['investigationId']) : undefined,
    isUnderInvestigation: Boolean(raw['isUnderInvestigation']),
    observations: raw['observations'] ? String(raw['observations']) : undefined,
    signsOfActivity: parseJsonArray<string>(raw['signsOfActivity']),
    lastActivityDate: parseApiDate(raw['lastActivityDate']),
    securityConcerns: parseJsonArray<string>(raw['securityConcerns']),
    riskLevel: raw['riskLevel'] ? (String(raw['riskLevel']) as 'LOW' | 'MEDIUM' | 'HIGH') : 'LOW',
    checkHistory,
    notes: raw['notes'] ? String(raw['notes']) : undefined,
    createdAt: parseApiDate(raw['createdAt']) ?? new Date(),
    updatedAt: parseApiDate(raw['updatedAt'] ?? raw['lastModified']) ?? new Date(),
    createdBy: String(raw['createdBy'] ?? ''),
    updatedBy: raw['updatedBy'] ? String(raw['updatedBy']) : undefined
  };
}

/** Build POST body for creating an investigation */
export function createInvestigationToApiBody(
  request: CreateInvestigationRequest,
  societyId: string
): Record<string, unknown> {
  return {
    societyId,
    type: request.type,
    title: request.title,
    description: request.description,
    priority: request.priority,
    flatNumber: request.flatNumber,
    unitNumber: request.unitNumber,
    buildingName: request.buildingName,
    gateId: request.gateId,
    location: request.location,
    relatedVisitorId: request.relatedVisitorId,
    relatedVehicleId: request.relatedVehicleId,
    relatedBlacklistId: request.relatedBlacklistId,
    reportedBy: request.reportedBy,
    assignedTo: request.assignedTo,
    suspects: request.suspects ?? [],
    witnesses: request.witnesses ?? [],
    photos: request.photos ?? [],
    videos: request.videos ?? [],
    documents: request.documents ?? [],
    tags: request.tags ?? [],
    notes: request.notes,
    isConfidential: request.isConfidential ?? false
  };
}

/** Build PUT body for updating an investigation */
export function updateInvestigationToApiBody(
  request: UpdateInvestigationRequest,
  updatedBy: string
): Record<string, unknown> {
  return {
    status: request.status,
    priority: request.priority,
    assignedTo: request.assignedTo,
    findings: request.findings,
    actionsTaken: request.actionsTaken,
    recommendations: request.recommendations,
    resolution: request.resolution,
    photos: request.photos,
    videos: request.videos,
    documents: request.documents,
    notes: request.notes,
    isConfidential: request.isConfidential,
    updatedBy
  };
}

/** Build POST body for creating an empty flat log */
export function createEmptyFlatLogToApiBody(
  request: CreateEmptyFlatLogRequest,
  societyId: string,
  createdBy: string
): Record<string, unknown> {
  return {
    societyId,
    flatNumber: request.flatNumber,
    unitNumber: request.unitNumber,
    buildingName: request.buildingName,
    floorNumber: request.floorNumber,
    flatType: request.flatType,
    status: request.status,
    ownerName: request.ownerName,
    ownerPhone: request.ownerPhone,
    ownerEmail: request.ownerEmail,
    tenantName: request.tenantName,
    tenantPhone: request.tenantPhone,
    tenantEmail: request.tenantEmail,
    lastOccupiedAt: request.lastOccupiedAt ? request.lastOccupiedAt.toISOString() : undefined,
    expectedReturnDate: request.expectedReturnDate ? request.expectedReturnDate.toISOString() : undefined,
    observations: request.observations,
    signsOfActivity: request.signsOfActivity ?? [],
    lastActivityDate: request.lastActivityDate ? request.lastActivityDate.toISOString() : undefined,
    securityConcerns: request.securityConcerns ?? [],
    riskLevel: request.riskLevel ?? 'LOW',
    notes: request.notes,
    createdBy
  };
}

/** Build PUT body for updating an empty flat log */
export function updateEmptyFlatLogToApiBody(
  request: UpdateEmptyFlatLogRequest,
  updatedBy: string
): Record<string, unknown> {
  return {
    status: request.status,
    observations: request.observations,
    signsOfActivity: request.signsOfActivity,
    lastActivityDate: request.lastActivityDate ? request.lastActivityDate.toISOString() : undefined,
    securityConcerns: request.securityConcerns,
    riskLevel: request.riskLevel,
    notes: request.notes,
    updatedBy
  };
}

/** Map API statistics DTO to investigation UI model */
export function apiToInvestigationStatistics(raw: Record<string, unknown>): InvestigationStatistics {
  const toCountMap = (obj: unknown): { [key: string]: number } => {
    if (!obj || typeof obj !== 'object') return {};
    const out: { [key: string]: number } = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = Number(v ?? 0);
    }
    return out;
  };

  return {
    totalInvestigations: Number(raw['totalInvestigations'] ?? 0),
    openInvestigations: Number(raw['openInvestigations'] ?? 0),
    inProgressInvestigations: Number(raw['inProgressInvestigations'] ?? 0),
    resolvedInvestigations: Number(raw['resolvedInvestigations'] ?? 0),
    byType: toCountMap(raw['byType']),
    byStatus: toCountMap(raw['byStatus']),
    byPriority: toCountMap(raw['byPriority']),
    recentInvestigations: Number(raw['recentInvestigations'] ?? 0),
    averageResolutionTime: Number(raw['averageResolutionTime'] ?? 0)
  };
}

/** Map API statistics DTO to empty flat UI model */
export function apiToEmptyFlatStatistics(raw: Record<string, unknown>): EmptyFlatStatistics {
  const toCountMap = (obj: unknown): { [key: string]: number } => {
    if (!obj || typeof obj !== 'object') return {};
    const out: { [key: string]: number } = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = Number(v ?? 0);
    }
    return out;
  };

  return {
    totalEmptyFlats: Number(raw['totalEmptyFlats'] ?? 0),
    vacantFlats: Number(raw['vacantFlats'] ?? 0),
    underRenovation: Number(raw['underRenovation'] ?? 0),
    lockedFlats: Number(raw['lockedFlats'] ?? 0),
    unknownStatus: Number(raw['unknownStatus'] ?? 0),
    underInvestigation: Number(raw['underInvestigation'] ?? 0),
    highRiskFlats: Number(raw['highRiskFlats'] ?? 0),
    byBuilding: toCountMap(raw['byBuilding']),
    byFlatType: toCountMap(raw['byFlatType']),
    averageVacancyDuration: Number(raw['averageVacancyDuration'] ?? 0)
  };
}

/** Apply client-side filters on investigations loaded from API */
export function applyInvestigationFilter(
  items: Investigation[],
  filter?: InvestigationFilter
): Investigation[] {
  if (!filter) return items;

  let filtered = [...items];

  if (filter.type) filtered = filtered.filter(i => i.type === filter.type);
  if (filter.status) filtered = filtered.filter(i => i.status === filter.status);
  if (filter.priority) filtered = filtered.filter(i => i.priority === filter.priority);
  if (filter.flatNumber) filtered = filtered.filter(i => i.flatNumber === filter.flatNumber);
  if (filter.reportedBy) filtered = filtered.filter(i => i.reportedBy === filter.reportedBy);
  if (filter.assignedTo) filtered = filtered.filter(i => i.assignedTo === filter.assignedTo);
  if (filter.dateFrom) filtered = filtered.filter(i => i.reportedAt >= filter.dateFrom!);
  if (filter.dateTo) filtered = filtered.filter(i => i.reportedAt <= filter.dateTo!);
  if (filter.isConfidential !== undefined) {
    filtered = filtered.filter(i => i.isConfidential === filter.isConfidential);
  }
  if (filter.searchTerm) {
    const search = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(
      i =>
        i.title.toLowerCase().includes(search) ||
        i.description.toLowerCase().includes(search) ||
        i.flatNumber?.toLowerCase().includes(search) ||
        i.tags?.some(tag => tag.toLowerCase().includes(search))
    );
  }

  return filtered.sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
}

/** Apply client-side filters on empty flat logs loaded from API */
export function applyEmptyFlatLogFilter(
  items: EmptyFlatLog[],
  filter?: EmptyFlatLogFilter
): EmptyFlatLog[] {
  if (!filter) return items;

  let filtered = [...items];

  if (filter.status) filtered = filtered.filter(l => l.status === filter.status);
  if (filter.buildingName) filtered = filtered.filter(l => l.buildingName === filter.buildingName);
  if (filter.floorNumber !== undefined) filtered = filtered.filter(l => l.floorNumber === filter.floorNumber);
  if (filter.flatType) filtered = filtered.filter(l => l.flatType === filter.flatType);
  if (filter.isUnderInvestigation !== undefined) {
    filtered = filtered.filter(l => l.isUnderInvestigation === filter.isUnderInvestigation);
  }
  if (filter.riskLevel) filtered = filtered.filter(l => l.riskLevel === filter.riskLevel);
  if (filter.dateFrom) filtered = filtered.filter(l => l.firstDetectedAt >= filter.dateFrom!);
  if (filter.dateTo) filtered = filtered.filter(l => l.firstDetectedAt <= filter.dateTo!);
  if (filter.searchTerm) {
    const search = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(
      l =>
        l.flatNumber.toLowerCase().includes(search) ||
        l.ownerName?.toLowerCase().includes(search) ||
        l.tenantName?.toLowerCase().includes(search) ||
        l.buildingName?.toLowerCase().includes(search)
    );
  }

  return filtered.sort((a, b) => b.firstDetectedAt.getTime() - a.firstDetectedAt.getTime());
}
