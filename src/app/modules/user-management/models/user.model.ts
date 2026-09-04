/**
 * User Management Models
 * Comprehensive user management for society residents, tenants, and staff
 */

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: Date;
  gender: Gender;
  profileImage?: string;
  
  // Address Details
  /** Backend flat UUID when present */
  flatId?: string;
  flatNumber: string;
  building: string;
  floor?: string;
  /** Display name when present; API often only sends {@link societyId} */
  society?: string;
  societyId?: string;
  
  // User Classification
  userType: UserType;
  userRole: UserRole;
  status: UserStatus;
  
  // Verification
  verificationStatus: VerificationStatus;
  documentsVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  
  // Documents
  documents?: UserDocument[];
  
  // Family & Relations
  familyMembers?: FamilyMember[];
  primaryMemberId?: string; // For tenants/family members
  
  // Vehicles & Pets
  vehicleCount: number;
  petCount: number;
  
  // Access
  rfidTagAssigned: boolean;
  facialRecognitionSetup: boolean;
  
  // Timestamps
  registrationDate: Date;
  lastLogin?: Date;
  lastModified: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Additional
  emergencyContact?: EmergencyContact;
  remarks?: string;
}

export interface UserDocument {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  fileUrl: string;
  fileName: string;
  uploadedDate: Date;
  verified: boolean;
  verifiedBy?: string;
  verifiedDate?: Date;
  expiryDate?: Date;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  phone?: string;
  email?: string;
  dateOfBirth?: Date;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  alternatePhone?: string;
}

// Enums
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum UserType {
  OWNER = 'OWNER',
  TENANT = 'TENANT',
  FAMILY_MEMBER = 'FAMILY_MEMBER',
  PG_GUEST = 'PG_GUEST',
  /** Non-resident staff (guards, admins) — not flat Owner/Tenant occupancy. */
  STAFF = 'STAFF'
}

/** RBAC roles — mirrors backend {@code User.UserRole} enum. */
export enum UserRole {
  RESIDENT = 'RESIDENT',
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER',
  SECRETARY = 'SECRETARY',
  TREASURER = 'TREASURER',
  CHAIRMAN = 'CHAIRMAN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  AUDITOR = 'AUDITOR',
  FACILITY_MANAGER = 'FACILITY_MANAGER',
  STAFF = 'STAFF',
  /** Canonical guard role in DB/JWT; mobile maps this to GUARD. */
  SECURITY_GUARD = 'SECURITY_GUARD'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  MOVED_OUT = 'MOVED_OUT',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DOCUMENTS_REQUIRED = 'DOCUMENTS_REQUIRED'
}

export enum DocumentType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  VOTER_ID = 'VOTER_ID',
  ELECTRICITY_BILL = 'ELECTRICITY_BILL',
  RENT_AGREEMENT = 'RENT_AGREEMENT',
  SALE_DEED = 'SALE_DEED',
  PHOTO = 'PHOTO'
}

// Request/Response interfaces
export interface UserListRequest {
  page: number;
  pageSize: number;
  searchTerm?: string;
  userType?: UserType | 'ALL';
  userRole?: UserRole | 'ALL' | 'STAFF' | 'GUARD';
  userStatus?: UserStatus | 'ALL';
  verificationStatus?: VerificationStatus | 'ALL';
  building?: string;
  flatLink?: 'ALL' | 'UNLINKED' | 'LINKED';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  users: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserActionResponse {
  success: boolean;
  message: string;
  user?: User;
  errors?: string[];
}
