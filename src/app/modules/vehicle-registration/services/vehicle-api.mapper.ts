/**
 * Maps Spring {@code Vehicle} JSON to the Angular vehicle-registration {@link Vehicle} model.
 */

import {
  Vehicle,
  FASTag,
  FASTagStatus,
  RFIDTag,
  RFIDStatus,
  RFIDTagType,
  VehicleType,
  OwnerType,
  VehicleStatus,
  ApprovalStatus
} from '../models/vehicle.model';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveOwnerName(raw: any): string {
  const direct = String(raw.ownerName ?? '').trim();
  if (direct && direct !== '—') {
    return direct;
  }
  const owner = raw.owner;
  if (owner) {
    const fromOwner = `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim();
    if (fromOwner) {
      return fromOwner;
    }
  }
  return '—';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveUnitNumber(raw: any): string | undefined {
  const direct = raw.unitNumber ?? raw.flatNumber;
  if (direct) {
    return String(direct);
  }
  const flat = raw.flat;
  if (flat?.flatNumber) {
    return String(flat.flatNumber);
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeVehicleRecord(raw: any): Vehicle {
  const regDate = raw.registrationDate ? new Date(raw.registrationDate) : new Date(0);
  const lastMod = raw.lastModified
    ? new Date(raw.lastModified)
    : raw.updatedAt
      ? new Date(raw.updatedAt)
      : new Date(0);
  return {
    id: raw.id,
    registrationNumber: String(raw.registrationNumber ?? ''),
    vehicleType: (raw.vehicleType as VehicleType) ?? VehicleType.FOUR_WHEELER,
    make: String(raw.make ?? ''),
    model: String(raw.model ?? ''),
    color: String(raw.color ?? ''),
    year: typeof raw.year === 'number' ? raw.year : new Date().getFullYear(),
    ownerId: String(raw.ownerId ?? ''),
    ownerName: resolveOwnerName(raw),
    ownerType: (raw.ownerType as OwnerType) ?? OwnerType.RESIDENT,
    unitNumber: resolveUnitNumber(raw),
    parkingSlot: raw.parkingSlot ?? undefined,
    status: (raw.status as VehicleStatus) ?? VehicleStatus.ACTIVE,
    approvalStatus: (raw.approvalStatus as ApprovalStatus) ?? ApprovalStatus.PENDING,
    documents: Array.isArray(raw.documents) ? raw.documents : [],
    registrationDate: regDate,
    lastModified: lastMod,
    createdBy: String(raw.createdBy ?? ''),
    approvedBy: raw.approvedBy ?? undefined,
    remarks: raw.remarks ?? undefined,
    expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : undefined,
    // FASTag is optional and is returned by the backend only when linked.
    fasTag: raw.fasTag ? normalizeFastag(raw.fasTag) : undefined,
    // RFID is optional and is returned by the backend only when issued.
    rfidTag: raw.rfidTag ? normalizeRfid(raw.rfidTag) : undefined
  };
}

/** Normalize nested FASTag snapshot embedded in Vehicle JSON. */
function normalizeFastag(raw: any): FASTag {
  return {
    tagId: String(raw.tagId ?? ''),
    tagNumber: String(raw.tagNumber ?? ''),
    accountId: String(raw.accountId ?? ''),
    walletBalance: typeof raw.walletBalance === 'number' ? raw.walletBalance : Number(raw.walletBalance ?? 0),
    issueDate: raw.issueDate ? new Date(raw.issueDate) : new Date(),
    expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : new Date(),
    status: (raw.status as FASTagStatus) ?? FASTagStatus.ACTIVE,
    vehicleClass: String(raw.vehicleClass ?? ''),
    bankName: String(raw.bankName ?? ''),
    lastRecharge: raw.lastRecharge ? new Date(raw.lastRecharge) : undefined,
    isLinked: Boolean(raw.isLinked),
    linkedDate: raw.linkedDate ? new Date(raw.linkedDate) : undefined
  };
}

/** Normalize nested RFID snapshot embedded in Vehicle JSON. */
function normalizeRfid(raw: any): RFIDTag {
  return {
    tagId: String(raw.tagId ?? ''),
    tagNumber: String(raw.tagNumber ?? ''),
    tagType: raw.tagType ? (raw.tagType as RFIDTagType) : undefined,
    issueDate: raw.issueDate ? new Date(raw.issueDate) : new Date(),
    expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : undefined,
    status: (raw.status as RFIDStatus) ?? RFIDStatus.ACTIVE,
    lastScanned: raw.lastScanned ? new Date(raw.lastScanned) : undefined,
    scanCount: typeof raw.scanCount === 'number' ? raw.scanCount : Number(raw.scanCount ?? 0),
    isActive: Boolean(raw.isActive),
    assignedDate: raw.assignedDate ? new Date(raw.assignedDate) : new Date(),
    assignedBy: String(raw.assignedBy ?? '')
  };
}
