/**
 * Maps between Blacklist UI models and the live {@code /blacklist} API.
 */

import {
  BlacklistEntry,
  BlacklistType,
  BlacklistReason,
  BlacklistStatus,
  BlacklistSeverity,
  CreateBlacklistRequest,
  UpdateBlacklistRequest,
  BlacklistCheckResult,
  BlacklistFilter,
  BlacklistStatistics,
  TimeSlot
} from '../models/blacklist.model';

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

/** Raw blacklist row from GET/POST/PUT /blacklist */
export function apiToBlacklistEntry(raw: Record<string, unknown>): BlacklistEntry {
  return {
    id: String(raw['id'] ?? ''),
    type: String(raw['type'] ?? BlacklistType.PERSON) as BlacklistType,
    identifier: String(raw['identifier'] ?? ''),
    alternateIdentifiers: parseJsonArray<string>(raw['alternateIdentifiers']),
    personName: raw['personName'] ? String(raw['personName']) : undefined,
    personPhoto: raw['personPhoto'] ? String(raw['personPhoto']) : undefined,
    phoneNumber: raw['phoneNumber'] ? String(raw['phoneNumber']) : undefined,
    email: raw['email'] ? String(raw['email']) : undefined,
    address: raw['address'] ? String(raw['address']) : undefined,
    idProofType: raw['idProofType'] ? String(raw['idProofType']) : undefined,
    idProofNumber: raw['idProofNumber'] ? String(raw['idProofNumber']) : undefined,
    vehicleNumber: raw['vehicleNumber'] ? String(raw['vehicleNumber']) : undefined,
    vehicleType: raw['vehicleType'] ? String(raw['vehicleType']) : undefined,
    vehicleModel: raw['vehicleModel'] ? String(raw['vehicleModel']) : undefined,
    vehicleColor: raw['vehicleColor'] ? String(raw['vehicleColor']) : undefined,
    reason: String(raw['reason'] ?? BlacklistReason.OTHER) as BlacklistReason,
    reasonDescription: String(raw['reasonDescription'] ?? ''),
    severity: String(raw['severity'] ?? BlacklistSeverity.MEDIUM) as BlacklistSeverity,
    status: String(raw['status'] ?? BlacklistStatus.ACTIVE) as BlacklistStatus,
    blacklistedDate: parseApiDate(raw['blacklistedDate']) ?? new Date(),
    blacklistedBy: String(raw['blacklistedBy'] ?? ''),
    blacklistedByName: raw['blacklistedByName'] ? String(raw['blacklistedByName']) : undefined,
    expiryDate: parseApiDate(raw['expiryDate']),
    isPermanent: Boolean(raw['isPermanent']),
    restrictedGates: parseJsonArray<string>(raw['restrictedGates']),
    restrictedTimeSlots: parseJsonArray<TimeSlot>(raw['restrictedTimeSlots']),
    incidentReportId: raw['incidentReportId'] ? String(raw['incidentReportId']) : undefined,
    caseNumber: raw['caseNumber'] ? String(raw['caseNumber']) : undefined,
    documents: parseJsonArray<string>(raw['documents']),
    photos: parseJsonArray<string>(raw['photos']),
    notes: raw['notes'] ? String(raw['notes']) : undefined,
    lastCheckedAt: parseApiDate(raw['lastCheckedAt']),
    checkCount: Number(raw['checkCount'] ?? 0),
    blockedAttempts: Number(raw['blockedAttempts'] ?? 0),
    createdAt: parseApiDate(raw['createdAt']) ?? new Date(),
    updatedAt: parseApiDate(raw['updatedAt'] ?? raw['lastModified']) ?? new Date(),
    createdBy: String(raw['createdBy'] ?? raw['blacklistedBy'] ?? ''),
    updatedBy: raw['updatedBy'] ? String(raw['updatedBy']) : undefined
  };
}

/** Build POST body for creating a blacklist entry */
export function createRequestToApiBody(
  request: CreateBlacklistRequest,
  societyId: string
): Record<string, unknown> {
  return {
    societyId,
    type: request.type,
    identifier: request.identifier,
    alternateIdentifiers: request.alternateIdentifiers ?? [],
    personName: request.personName,
    personPhoto: request.personPhoto,
    phoneNumber: request.phoneNumber,
    email: request.email,
    address: request.address,
    idProofType: request.idProofType,
    idProofNumber: request.idProofNumber,
    vehicleNumber: request.vehicleNumber,
    vehicleType: request.vehicleType,
    vehicleModel: request.vehicleModel,
    vehicleColor: request.vehicleColor,
    reason: request.reason,
    reasonDescription: request.reasonDescription,
    severity: request.severity,
    blacklistedBy: request.blacklistedBy,
    expiryDate: request.expiryDate ? request.expiryDate.toISOString() : undefined,
    isPermanent: request.isPermanent,
    restrictedGates: request.restrictedGates ?? [],
    restrictedTimeSlots: request.restrictedTimeSlots ?? [],
    incidentReportId: request.incidentReportId,
    caseNumber: request.caseNumber,
    documents: request.documents ?? [],
    photos: request.photos ?? [],
    notes: request.notes
  };
}

/** Build PUT body for updating a blacklist entry */
export function updateRequestToApiBody(
  request: UpdateBlacklistRequest,
  updatedBy: string
): Record<string, unknown> {
  return {
    reason: request.reason,
    reasonDescription: request.reasonDescription,
    severity: request.severity,
    status: request.status,
    expiryDate: request.expiryDate ? request.expiryDate.toISOString() : undefined,
    isPermanent: request.isPermanent,
    restrictedGates: request.restrictedGates,
    restrictedTimeSlots: request.restrictedTimeSlots,
    notes: request.notes,
    updatedBy
  };
}

/** Map API check result to UI model */
export function apiToCheckResult(raw: Record<string, unknown>): BlacklistCheckResult {
  const entryRaw = raw['entry'] as Record<string, unknown> | undefined;
  return {
    isBlacklisted: Boolean(raw['isBlacklisted'] ?? raw['blacklisted']),
    entry: entryRaw ? apiToBlacklistEntry(entryRaw) : undefined,
    matchType: raw['matchType'] ? (String(raw['matchType']) as BlacklistType) : undefined,
    matchConfidence: raw['matchConfidence'] != null ? Number(raw['matchConfidence']) : undefined,
    reason: raw['reason'] ? String(raw['reason']) : undefined
  };
}

/** Map API statistics DTO to UI model */
export function apiToStatistics(raw: Record<string, unknown>): BlacklistStatistics {
  const toCountMap = (obj: unknown): { [key: string]: number } => {
    if (!obj || typeof obj !== 'object') return {};
    const out: { [key: string]: number } = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = Number(v ?? 0);
    }
    return out;
  };

  return {
    totalEntries: Number(raw['totalEntries'] ?? 0),
    activeEntries: Number(raw['activeEntries'] ?? 0),
    suspendedEntries: Number(raw['suspendedEntries'] ?? 0),
    expiredEntries: Number(raw['expiredEntries'] ?? 0),
    byType: toCountMap(raw['byType']),
    byReason: toCountMap(raw['byReason']),
    bySeverity: toCountMap(raw['bySeverity']),
    recentAdditions: Number(raw['recentAdditions'] ?? 0),
    blockedAttempts: Number(raw['blockedAttempts'] ?? 0),
    blockedAttemptsToday: Number(raw['blockedAttemptsToday'] ?? 0)
  };
}

/** Apply client-side filters on entries already loaded from the API */
export function applyBlacklistFilter(entries: BlacklistEntry[], filter?: BlacklistFilter): BlacklistEntry[] {
  if (!filter) return entries;

  let filtered = [...entries];

  if (filter.type) {
    filtered = filtered.filter(e => e.type === filter.type);
  }
  if (filter.status) {
    filtered = filtered.filter(e => e.status === filter.status);
  }
  if (filter.reason) {
    filtered = filtered.filter(e => e.reason === filter.reason);
  }
  if (filter.severity) {
    filtered = filtered.filter(e => e.severity === filter.severity);
  }
  if (filter.isPermanent !== undefined) {
    filtered = filtered.filter(e => e.isPermanent === filter.isPermanent);
  }
  if (filter.gateId) {
    filtered = filtered.filter(
      e =>
        !e.restrictedGates ||
        e.restrictedGates.length === 0 ||
        e.restrictedGates.includes(filter.gateId!)
    );
  }
  if (filter.dateFrom) {
    filtered = filtered.filter(e => e.blacklistedDate >= filter.dateFrom!);
  }
  if (filter.dateTo) {
    filtered = filtered.filter(e => e.blacklistedDate <= filter.dateTo!);
  }
  if (filter.searchTerm) {
    const search = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(
      e =>
        e.identifier.toLowerCase().includes(search) ||
        e.personName?.toLowerCase().includes(search) ||
        e.phoneNumber?.toLowerCase().includes(search) ||
        e.email?.toLowerCase().includes(search) ||
        e.vehicleNumber?.toLowerCase().includes(search) ||
        e.idProofNumber?.toLowerCase().includes(search) ||
        e.caseNumber?.toLowerCase().includes(search)
    );
  }

  if (!filter.status || filter.status !== BlacklistStatus.REMOVED) {
    filtered = filtered.filter(e => e.status !== BlacklistStatus.REMOVED);
  }

  return filtered.sort((a, b) => b.blacklistedDate.getTime() - a.blacklistedDate.getTime());
}
