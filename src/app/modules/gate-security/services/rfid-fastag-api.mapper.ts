/**
 * Maps between RFID/FASTag UI models and live {@code /vehicles} + gate-hardware APIs.
 */

import {
  Vehicle,
  VehicleStatus,
  ApprovalStatus,
  VehicleType,
  OwnerType,
  RFIDTag,
  FASTag
} from '../../vehicle-registration/models/vehicle.model';
import {
  RFIDRegistration,
  RFIDEntry,
  RFIDStatus,
  TagType,
  VehicleCategory,
  EntryStatus,
  CreateRFIDRegistrationRequest
} from '../models/rfid-fastag.model';
import { VehicleRegistrationRequest } from '../../vehicle-registration/models/vehicle.model';
import { mapOwnerTypeToCategory, mapCategoryToOwnerType, mapAnprTypeToVehicleType, mapVehicleTypeToAnprLabel } from './anpr-api.mapper';

/** Composite registration id: vehicle UUID + tag kind */
export function buildRegistrationId(vehicleId: string, tagType: TagType): string {
  return `${vehicleId}::${tagType}`;
}

/** Split composite id back into vehicle id and tag type */
export function parseRegistrationId(id: string): { vehicleId: string; tagType: TagType } | null {
  const idx = id.lastIndexOf('::');
  if (idx <= 0) {
    return null;
  }
  const vehicleId = id.slice(0, idx);
  const kind = id.slice(idx + 2) as TagType;
  if (!Object.values(TagType).includes(kind)) {
    return null;
  }
  return { vehicleId, tagType: kind };
}

/** Normalize tag tokens for lookup (RFID tag id / number / FASTag number) */
export function normalizeTagToken(token: string): string {
  return (token ?? '').replace(/\s+/g, '').toUpperCase();
}

/** Expand each vehicle into zero, one, or two tag registration rows */
export function vehiclesToRegistrations(vehicles: Vehicle[]): RFIDRegistration[] {
  const rows: RFIDRegistration[] = [];
  for (const vehicle of vehicles) {
    if (vehicle.rfidTag?.tagId || vehicle.rfidTag?.tagNumber) {
      rows.push(vehicleToRfidRegistration(vehicle, TagType.RFID, vehicle.rfidTag));
    }
    if (vehicle.fasTag?.tagId || vehicle.fasTag?.tagNumber) {
      rows.push(vehicleToFastagRegistration(vehicle, vehicle.fasTag));
    }
  }
  return rows;
}

/** Vehicle embedded RFID tag → list card */
function vehicleToRfidRegistration(vehicle: Vehicle, tagType: TagType, tag: RFIDTag): RFIDRegistration {
  const tagId = tag.tagNumber || tag.tagId;
  return {
    id: buildRegistrationId(vehicle.id ?? '', tagType),
    tagId,
    tagType,
    vehicleNumber: vehicle.registrationNumber,
    vehicleType: mapVehicleTypeToAnprLabel(vehicle.vehicleType),
    vehicleMake: vehicle.make,
    vehicleModel: vehicle.model,
    vehicleColor: vehicle.color,
    ownerName: vehicle.ownerName && vehicle.ownerName !== '—' ? vehicle.ownerName : 'Unknown',
    ownerPhone: extractPhoneFromRemarks(vehicle.remarks) ?? '—',
    ownerType: mapOwnerTypeToCategory(vehicle.ownerType),
    flatNumber: vehicle.unitNumber,
    unitNumber: vehicle.unitNumber,
    status: mapToRfidStatus(vehicle, tag),
    allowedGates: ['MAIN_GATE'],
    autoOpen: vehicle.status === VehicleStatus.ACTIVE && tag.isActive !== false,
    requiresApproval: vehicle.approvalStatus !== ApprovalStatus.APPROVED,
    registeredAt: tag.assignedDate ?? tag.issueDate ?? vehicle.registrationDate,
    registeredBy: tag.assignedBy ?? vehicle.createdBy,
    lastDetectedAt: tag.lastScanned,
    lastEntryAt: tag.lastScanned,
    totalEntries: tag.scanCount ?? 0,
    failedAttempts: 0,
    isActive:
      vehicle.status === VehicleStatus.ACTIVE &&
      vehicle.approvalStatus === ApprovalStatus.APPROVED &&
      tag.isActive !== false &&
      (tag.status === undefined || String(tag.status).toUpperCase() === 'ACTIVE'),
    expiresAt: tag.expiryDate,
    notes: vehicle.remarks
  };
}

/** Vehicle embedded FASTag → list card */
function vehicleToFastagRegistration(vehicle: Vehicle, tag: FASTag): RFIDRegistration {
  const tagId = tag.tagNumber || tag.tagId;
  return {
    id: buildRegistrationId(vehicle.id ?? '', TagType.FASTAG),
    tagId,
    tagType: TagType.FASTAG,
    vehicleNumber: vehicle.registrationNumber,
    vehicleType: mapVehicleTypeToAnprLabel(vehicle.vehicleType),
    vehicleMake: vehicle.make,
    vehicleModel: vehicle.model,
    vehicleColor: vehicle.color,
    ownerName: vehicle.ownerName && vehicle.ownerName !== '—' ? vehicle.ownerName : 'Unknown',
    ownerPhone: extractPhoneFromRemarks(vehicle.remarks) ?? '—',
    ownerType: mapOwnerTypeToCategory(vehicle.ownerType),
    flatNumber: vehicle.unitNumber,
    unitNumber: vehicle.unitNumber,
    status: mapToFastagStatus(vehicle, tag),
    allowedGates: ['MAIN_GATE'],
    autoOpen: vehicle.status === VehicleStatus.ACTIVE && tag.isLinked !== false,
    requiresApproval: vehicle.approvalStatus !== ApprovalStatus.APPROVED,
    registeredAt: tag.linkedDate ?? tag.issueDate ?? vehicle.registrationDate,
    registeredBy: vehicle.createdBy,
    lastDetectedAt: undefined,
    lastEntryAt: undefined,
    totalEntries: 0,
    failedAttempts: 0,
    isActive:
      vehicle.status === VehicleStatus.ACTIVE &&
      vehicle.approvalStatus === ApprovalStatus.APPROVED &&
      tag.isLinked !== false &&
      String(tag.status).toUpperCase() === 'ACTIVE',
    expiresAt: tag.expiryDate,
    notes: vehicle.remarks
  };
}

function mapToRfidStatus(vehicle: Vehicle, tag: RFIDTag): RFIDStatus {
  if (vehicle.status === VehicleStatus.BLACKLISTED) {
    return RFIDStatus.BLACKLISTED;
  }
  if (vehicle.status === VehicleStatus.SUSPENDED) {
    return RFIDStatus.SUSPENDED;
  }
  if (vehicle.status === VehicleStatus.INACTIVE || vehicle.status === VehicleStatus.EXPIRED) {
    return RFIDStatus.INACTIVE;
  }
  const tagStatus = String(tag.status ?? 'ACTIVE').toUpperCase();
  if (tagStatus === 'SUSPENDED') {
    return RFIDStatus.SUSPENDED;
  }
  if (tagStatus === 'EXPIRED' || (tag.expiryDate && new Date(tag.expiryDate) < new Date())) {
    return RFIDStatus.EXPIRED;
  }
  if (tag.isActive === false) {
    return RFIDStatus.INACTIVE;
  }
  if (vehicle.approvalStatus === ApprovalStatus.PENDING) {
    return RFIDStatus.REGISTERED;
  }
  return RFIDStatus.ACTIVE;
}

function mapToFastagStatus(vehicle: Vehicle, tag: FASTag): RFIDStatus {
  if (vehicle.status === VehicleStatus.BLACKLISTED) {
    return RFIDStatus.BLACKLISTED;
  }
  if (vehicle.status === VehicleStatus.SUSPENDED) {
    return RFIDStatus.SUSPENDED;
  }
  if (vehicle.status === VehicleStatus.INACTIVE) {
    return RFIDStatus.INACTIVE;
  }
  if (tag.isLinked === false) {
    return RFIDStatus.INACTIVE;
  }
  const tagStatus = String(tag.status ?? 'ACTIVE').toUpperCase();
  if (tagStatus === 'SUSPENDED') {
    return RFIDStatus.SUSPENDED;
  }
  if (tagStatus === 'EXPIRED' || (tag.expiryDate && new Date(tag.expiryDate) < new Date())) {
    return RFIDStatus.EXPIRED;
  }
  return RFIDStatus.ACTIVE;
}

function extractPhoneFromRemarks(remarks?: string): string | undefined {
  if (!remarks) {
    return undefined;
  }
  const match = remarks.match(/phone:\s*([+\d\s-]+)/i);
  return match?.[1]?.trim();
}

/** RFID form → POST /vehicles body when vehicle must be created first */
export function rfidRequestToVehicleRequest(
  request: CreateRFIDRegistrationRequest,
  societyOwnerId: string
): VehicleRegistrationRequest {
  const remarks = [request.notes, request.ownerPhone ? `phone: ${request.ownerPhone}` : undefined]
    .filter(Boolean)
    .join(' | ');

  return {
    registrationNumber: request.vehicleNumber,
    vehicleType: mapAnprTypeToVehicleType(request.vehicleType),
    make: request.vehicleMake ?? '',
    model: request.vehicleModel ?? '',
    color: request.vehicleColor ?? '',
    year: new Date().getFullYear(),
    ownerId: societyOwnerId,
    ownerName: request.ownerName,
    ownerType: mapCategoryToOwnerType(request.ownerType),
    unitNumber: request.flatNumber ?? request.unitNumber,
    parkingSlot: undefined,
    requestRFID: request.tagType === TagType.RFID || request.tagType === TagType.NFC,
    requestFASTag: request.tagType === TagType.FASTAG,
    documents: [],
    remarks: remarks || undefined
  };
}

/** Map RFID UI status updates to backend vehicle status */
export function rfidStatusToVehicleStatus(status: RFIDStatus): VehicleStatus {
  switch (status) {
    case RFIDStatus.BLACKLISTED:
      return VehicleStatus.BLACKLISTED;
    case RFIDStatus.SUSPENDED:
      return VehicleStatus.SUSPENDED;
    case RFIDStatus.INACTIVE:
    case RFIDStatus.EXPIRED:
      return VehicleStatus.INACTIVE;
    default:
      return VehicleStatus.ACTIVE;
  }
}

/** Gate hardware RFID event → entry log row */
export function gateEventToRfidEntry(
  event: Record<string, unknown>,
  registrationsByTag: Map<string, RFIDRegistration>
): RFIDEntry | null {
  const eventType = String(event['eventType'] ?? '').toUpperCase();
  if (eventType !== 'RFID_TAG_DETECTED') {
    return null;
  }

  const payload = (event['payload'] as Record<string, unknown>) ?? {};
  const gateId = String(event['gateId'] ?? payload['gateId'] ?? 'MAIN_GATE');
  const tagRaw = String(payload['tag'] ?? event['subjectLabel'] ?? '').trim();
  const decision = String(event['decision'] ?? '').toUpperCase();
  const timestamp = parseEventTimestamp(event);

  const registration = tagRaw
    ? registrationsByTag.get(normalizeTagToken(tagRaw))
    : undefined;

  const status =
    decision === 'ALLOW'
      ? EntryStatus.ALLOWED
      : decision === 'DENY'
        ? EntryStatus.DENIED
        : EntryStatus.PENDING_APPROVAL;

  const gateOpened = decision === 'ALLOW' && Boolean(event['action']);

  return {
    id: String(event['id'] ?? `event-${timestamp.getTime()}`),
    tagId: tagRaw || registration?.tagId || 'UNKNOWN',
    registration,
    gateId,
    gateName: formatGateName(gateId),
    entryType: 'ENTRY',
    status,
    timestamp,
    detectionMethod: 'AUTOMATIC',
    signalStrength: typeof payload['signalStrength'] === 'number' ? (payload['signalStrength'] as number) : undefined,
    readDistance: typeof payload['readDistance'] === 'number' ? (payload['readDistance'] as number) : undefined,
    verifiedBy: 'GATE_HARDWARE',
    vehicleNumber: registration?.vehicleNumber,
    vehicleCategory: registration?.ownerType ?? VehicleCategory.UNKNOWN,
    vehicleType: registration?.vehicleType,
    gateOpened,
    gateOpenTime: gateOpened ? timestamp : undefined,
    rejectionReason: decision === 'DENY' ? String(event['reason'] ?? 'Access denied') : undefined
  };
}

function parseEventTimestamp(event: Record<string, unknown>): Date {
  for (const key of ['decidedAt', 'createdAt', 'timestamp', 'eventTime', 'occurredAt']) {
    const raw = event[key];
    if (raw) {
      const d = new Date(String(raw));
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }
  return new Date();
}

function formatGateName(gateId: string): string {
  return gateId
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Build a registration lookup map keyed by normalized tag id/number */
export function indexRegistrationsByTag(rows: RFIDRegistration[]): Map<string, RFIDRegistration> {
  const map = new Map<string, RFIDRegistration>();
  for (const row of rows) {
    map.set(normalizeTagToken(row.tagId), row);
  }
  return map;
}
