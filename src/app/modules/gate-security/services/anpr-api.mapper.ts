/**
 * Maps between ANPR UI models and the live {@code /vehicles} + gate-hardware APIs.
 */

import { Vehicle, OwnerType, VehicleStatus, ApprovalStatus, VehicleType } from '../../vehicle-registration/models/vehicle.model';
import {
  VehicleRegistration,
  ANPRStatus,
  VehicleCategory,
  ANPREntry,
  EntryStatus,
  CreateVehicleRegistrationRequest
} from '../models/anpr.model';
import { VehicleRegistrationRequest } from '../../vehicle-registration/models/vehicle.model';

/** Normalize plate numbers for comparison (ignore spaces, hyphens, case). */
export function normalizePlate(plate: string): string {
  return (plate ?? '').replace(/[\s\-]/g, '').toUpperCase();
}

/** ANPR form vehicle type → backend VehicleType */
export function mapAnprTypeToVehicleType(anprType: string): VehicleType {
  const t = (anprType ?? '').toUpperCase();
  if (t === 'BIKE' || t === 'TWO_WHEELER' || t === 'MOTORCYCLE') {
    return VehicleType.TWO_WHEELER;
  }
  if (t === 'TRUCK' || t === 'BUS' || t === 'COMMERCIAL' || t === 'AUTO') {
    return VehicleType.COMMERCIAL;
  }
  if (t === 'EMERGENCY') {
    return VehicleType.EMERGENCY;
  }
  return VehicleType.FOUR_WHEELER;
}

/** Backend vehicle type → display label for ANPR cards */
export function mapVehicleTypeToAnprLabel(type: VehicleType | string): string {
  const t = String(type).toUpperCase();
  if (t === VehicleType.TWO_WHEELER || t === 'BIKE') {
    return 'BIKE';
  }
  if (t === VehicleType.COMMERCIAL) {
    return 'COMMERCIAL';
  }
  return 'CAR';
}

/** ANPR owner category → backend OwnerType */
export function mapCategoryToOwnerType(category: VehicleCategory): OwnerType {
  switch (category) {
    case VehicleCategory.STAFF:
      return OwnerType.STAFF;
    case VehicleCategory.VENDOR:
      return OwnerType.VENDOR;
    case VehicleCategory.VISITOR:
      return OwnerType.GUEST;
    case VehicleCategory.DELIVERY:
      return OwnerType.SERVICE_PROVIDER;
    case VehicleCategory.EMERGENCY:
      return OwnerType.GUEST;
    default:
      return OwnerType.RESIDENT;
  }
}

/** Backend OwnerType → ANPR VehicleCategory */
export function mapOwnerTypeToCategory(ownerType: OwnerType | string): VehicleCategory {
  const t = String(ownerType).toUpperCase();
  if (t === OwnerType.STAFF) return VehicleCategory.STAFF;
  if (t === OwnerType.VENDOR) return VehicleCategory.VENDOR;
  if (t === OwnerType.GUEST || t === OwnerType.TENANT) return VehicleCategory.VISITOR;
  if (t === OwnerType.SERVICE_PROVIDER) return VehicleCategory.DELIVERY;
  return VehicleCategory.RESIDENT;
}

/** Vehicle row → ANPR registration card */
export function vehicleToRegistration(vehicle: Vehicle, ownerPhone?: string): VehicleRegistration {
  const phoneFromRemarks = extractPhoneFromRemarks(vehicle.remarks);
  return {
    id: vehicle.id ?? '',
    vehicleNumber: vehicle.registrationNumber,
    vehicleType: mapVehicleTypeToAnprLabel(vehicle.vehicleType),
    vehicleMake: vehicle.make,
    vehicleModel: vehicle.model,
    vehicleColor: vehicle.color,
    ownerName: vehicle.ownerName && vehicle.ownerName !== '—' ? vehicle.ownerName : 'Unknown',
    ownerPhone: ownerPhone ?? phoneFromRemarks ?? '—',
    ownerType: mapOwnerTypeToCategory(vehicle.ownerType),
    flatNumber: vehicle.unitNumber,
    status: mapVehicleToAnprStatus(vehicle),
    confidenceThreshold: 80,
    allowedGates: ['MAIN_GATE'],
    registeredAt: vehicle.registrationDate,
    registeredBy: vehicle.createdBy,
    lastDetectedAt: vehicle.rfidTag?.lastScanned,
    lastEntryAt: vehicle.rfidTag?.lastScanned,
    totalEntries: vehicle.rfidTag?.scanCount ?? 0,
    failedAttempts: 0,
    isActive:
      vehicle.status === VehicleStatus.ACTIVE &&
      vehicle.approvalStatus === ApprovalStatus.APPROVED,
    expiresAt: vehicle.expiryDate,
    notes: vehicle.remarks
  };
}

function mapVehicleToAnprStatus(vehicle: Vehicle): ANPRStatus {
  if (vehicle.status === VehicleStatus.BLACKLISTED) {
    return ANPRStatus.BLACKLISTED;
  }
  if (vehicle.status === VehicleStatus.SUSPENDED) {
    return ANPRStatus.SUSPENDED;
  }
  if (vehicle.status === VehicleStatus.INACTIVE || vehicle.status === VehicleStatus.EXPIRED) {
    return ANPRStatus.INACTIVE;
  }
  if (vehicle.approvalStatus === ApprovalStatus.PENDING || vehicle.approvalStatus === ApprovalStatus.UNDER_REVIEW) {
    return ANPRStatus.REGISTERED;
  }
  return ANPRStatus.ACTIVE;
}

/** Parse optional phone stored in vehicle remarks during ANPR registration */
function extractPhoneFromRemarks(remarks?: string): string | undefined {
  if (!remarks) {
    return undefined;
  }
  const match = remarks.match(/phone:\s*([+\d\s-]+)/i);
  return match?.[1]?.trim();
}

/** ANPR form → POST /vehicles body */
export function anprRequestToVehicleRequest(
  request: CreateVehicleRegistrationRequest,
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
    requestRFID: false,
    requestFASTag: false,
    documents: [],
    remarks: remarks || undefined
  };
}

/** Gate hardware event JSON → ANPR entry log (RFID / ANPR events only) */
export function gateEventToAnprEntry(
  event: Record<string, unknown>,
  vehiclesByPlate: Map<string, VehicleRegistration>
): ANPREntry | null {
  const eventType = String(event['eventType'] ?? '').toUpperCase();
  if (eventType !== 'RFID_TAG_DETECTED' && eventType !== 'ANPR_PLATE_DETECTED' && !eventType.includes('ANPR')) {
    return null;
  }

  const payload = (event['payload'] as Record<string, unknown>) ?? {};
  const gateId = String(event['gateId'] ?? payload['gateId'] ?? 'MAIN_GATE');
  const plateRaw =
    String(payload['plate'] ?? payload['registrationNumber'] ?? event['subjectLabel'] ?? '').trim();
  const decision = String(event['decision'] ?? '').toUpperCase();
  const timestamp = parseEventTimestamp(event);

  const registration = plateRaw ? vehiclesByPlate.get(normalizePlate(plateRaw)) : undefined;
  const status =
    decision === 'ALLOW'
      ? EntryStatus.ALLOWED
      : decision === 'DENY'
        ? EntryStatus.DENIED
        : EntryStatus.PENDING_APPROVAL;

  return {
    id: String(event['id'] ?? `event-${timestamp.getTime()}`),
    vehicleNumber: plateRaw || registration?.vehicleNumber || 'UNKNOWN',
    detectedNumber: plateRaw || registration?.vehicleNumber || 'UNKNOWN',
    confidence: typeof payload['confidence'] === 'number' ? (payload['confidence'] as number) : 100,
    gateId,
    gateName: formatGateName(gateId),
    entryType: 'ENTRY',
    status,
    timestamp,
    vehicleRegistration: registration,
    vehicleCategory: registration?.ownerType ?? VehicleCategory.UNKNOWN,
    vehicleType: registration?.vehicleType,
    recognitionMethod: eventType.includes('ANPR') ? 'AUTOMATIC' : 'HYBRID',
    verifiedBy: 'GATE_HARDWARE',
    rejectionReason: decision === 'DENY' ? String(event['reason'] ?? 'Access denied') : undefined
  };
}

function parseEventTimestamp(event: Record<string, unknown>): Date {
  for (const key of ['decidedAt', 'createdAt', 'timestamp', 'eventTime']) {
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

/** Map ANPR status updates to vehicle status for PUT /vehicles/{id} */
export function anprStatusToVehicleStatus(status: ANPRStatus): VehicleStatus {
  switch (status) {
    case ANPRStatus.BLACKLISTED:
      return VehicleStatus.BLACKLISTED;
    case ANPRStatus.SUSPENDED:
      return VehicleStatus.SUSPENDED;
    case ANPRStatus.INACTIVE:
      return VehicleStatus.INACTIVE;
    default:
      return VehicleStatus.ACTIVE;
  }
}
