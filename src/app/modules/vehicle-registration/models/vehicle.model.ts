/**
 * Vehicle Registration Models
 * Supports RFID/FASTag integration for society vehicle management
 */

export interface Vehicle {
  id?: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  color: string;
  year: number;
  ownerId: string;
  ownerName: string;
  ownerType: OwnerType;
  unitNumber?: string;
  rfidTag?: RFIDTag;
  fasTag?: FASTag;
  parkingSlot?: string;
  status: VehicleStatus;
  approvalStatus: ApprovalStatus;
  documents: VehicleDocument[];
  insuranceDetails?: InsuranceDetails;
  pucDetails?: PUCDetails;
  registrationDate: Date;
  expiryDate?: Date;
  lastModified: Date;
  createdBy: string;
  approvedBy?: string;
  remarks?: string;
}

export interface RFIDTag {
  tagId: string;
  tagNumber: string;
  /** Issued tag tier (matches {@link RFIDTagType}); only present when backend stored it. */
  tagType?: RFIDTagType;
  issueDate: Date;
  expiryDate?: Date;
  status: RFIDStatus;
  lastScanned?: Date;
  scanCount: number;
  isActive: boolean;
  assignedDate: Date;
  assignedBy: string;
}

export interface FASTag {
  tagId: string;
  tagNumber: string;
  accountId: string;
  walletBalance: number;
  issueDate: Date;
  expiryDate: Date;
  status: FASTagStatus;
  vehicleClass: string;
  bankName: string;
  lastRecharge?: Date;
  isLinked: boolean;
  linkedDate?: Date;
}

export interface VehicleDocument {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  issueDate: Date;
  expiryDate?: Date;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedDate: Date;
  uploadedBy: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedDate?: Date;
}

export interface InsuranceDetails {
  policyNumber: string;
  provider: string;
  policyType: string;
  coverageAmount: number;
  startDate: Date;
  expiryDate: Date;
  premium: number;
  documentUrl: string;
}

export interface PUCDetails {
  certificateNumber: string;
  issueDate: Date;
  expiryDate: Date;
  testCenter: string;
  result: string;
  documentUrl: string;
}

export interface VehicleRegistrationRequest {
  registrationNumber: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  color: string;
  year: number;
  ownerId: string;
  ownerName: string;
  ownerType: OwnerType;
  unitNumber?: string;
  flatId?: string;
  parkingSlot?: string;
  requestRFID: boolean;
  requestFASTag: boolean;
  documents: File[];
  remarks?: string;
}

export interface RFIDRegistrationRequest {
  vehicleId: string;
  tagType: RFIDTagType;
  validityPeriod: number; // in months
  remarks?: string;
}

export interface FASTagLinkRequest {
  vehicleId: string;
  tagNumber: string;
  accountId: string;
  bankName: string;
  vehicleClass: string;
  remarks?: string;
}

// Enums
export enum VehicleType {
  TWO_WHEELER = 'TWO_WHEELER',
  FOUR_WHEELER = 'FOUR_WHEELER',
  COMMERCIAL = 'COMMERCIAL',
  EMERGENCY = 'EMERGENCY',
  GUEST = 'GUEST'
}

export enum OwnerType {
  RESIDENT = 'RESIDENT',
  TENANT = 'TENANT',
  STAFF = 'STAFF',
  VENDOR = 'VENDOR',
  GUEST = 'GUEST',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER'
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  BLACKLISTED = 'BLACKLISTED'
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

export enum RFIDStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  EXPIRED = 'EXPIRED'
}

export enum FASTagStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  EXPIRED = 'EXPIRED',
  LOW_BALANCE = 'LOW_BALANCE'
}

export enum DocumentType {
  RC_BOOK = 'RC_BOOK',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  INSURANCE = 'INSURANCE',
  PUC = 'PUC',
  ID_PROOF = 'ID_PROOF',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  OWNER_PHOTO = 'OWNER_PHOTO',
  VEHICLE_PHOTO = 'VEHICLE_PHOTO'
}

export enum RFIDTagType {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  TEMPORARY = 'TEMPORARY'
}

// Response interfaces
export interface VehicleRegistrationResponse {
  success: boolean;
  message: string;
  vehicleId?: string;
  vehicle?: Vehicle;
  errors?: string[];
}

export interface RFIDIssueResponse {
  success: boolean;
  message: string;
  rfidTag?: RFIDTag;
  errors?: string[];
}

export interface FASTagLinkResponse {
  success: boolean;
  message: string;
  fasTag?: FASTag;
  errors?: string[];
}
