/**
 * Family Member Management Models
 * Complete data structures for managing family member profiles in society
 */

export interface FamilyMember {
  id: string;
  unitId: string;
  unitNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: Date;
  age: number;
  gender: Gender;
  relationship: Relationship;
  bloodGroup?: BloodGroup;
  occupation?: string;
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  aadharNumber?: string;
  profilePhoto?: string;
  
  // Health Information
  healthInfo?: HealthInformation;
  
  // Emergency Contact
  emergencyContact?: EmergencyContact;
  
  // Education Information (for children)
  educationInfo?: EducationInformation;
  
  // Employment Information (for working members)
  employmentInfo?: EmploymentInformation;
  
  // Access & Permissions
  hasGateAccess: boolean;
  hasAmenityAccess: boolean;
  canRaiseComplaints: boolean;
  canBookAmenities: boolean;
  isAuthorizedForPayments: boolean;
  
  // Vehicle Association
  associatedVehicles: string[]; // Vehicle IDs
  
  // Status
  status: MemberStatus;
  isPrimaryResident: boolean;
  isOwner: boolean;
  isTenant: boolean;
  
  // Metadata
  addedBy: string;
  addedDate: Date;
  lastModified: Date;
  modifiedBy: string;
  remarks?: string;
}

export interface HealthInformation {
  allergies?: string[];
  medications?: string[];
  medicalConditions?: string[];
  specialNeeds?: string;
  doctorName?: string;
  doctorPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  lastCheckupDate?: Date;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  alternatePhone?: string;
  address?: string;
}

export interface EducationInformation {
  schoolName?: string;
  class?: string;
  board?: string;
  schoolPhone?: string;
  schoolAddress?: string;
  pickupPersons?: PickupPerson[];
}

export interface PickupPerson {
  name: string;
  relationship: string;
  phoneNumber: string;
  photoId?: string;
}

export interface EmploymentInformation {
  companyName?: string;
  designation?: string;
  officeAddress?: string;
  officePhone?: string;
  workEmail?: string;
  workingHours?: string;
}

export interface FamilyMemberRequest {
  unitId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  relationship: Relationship;
  bloodGroup?: BloodGroup;
  occupation?: string;
  email?: string;
  phoneNumber?: string;
  aadharNumber?: string;
  profilePhoto?: File;
  healthInfo?: HealthInformation;
  emergencyContact?: EmergencyContact;
  educationInfo?: EducationInformation;
  employmentInfo?: EmploymentInformation;
  hasGateAccess: boolean;
  hasAmenityAccess: boolean;
  remarks?: string;
}

export interface FamilyMemberResponse {
  success: boolean;
  message: string;
  member?: FamilyMember;
  errors?: string[];
}

export interface FamilyMemberListResponse {
  success: boolean;
  members: FamilyMember[];
  totalCount: number;
  message?: string;
}

// Enums
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum Relationship {
  SELF = 'SELF',
  SPOUSE = 'SPOUSE',
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  SON = 'SON',
  DAUGHTER = 'DAUGHTER',
  BROTHER = 'BROTHER',
  SISTER = 'SISTER',
  GRANDFATHER = 'GRANDFATHER',
  GRANDMOTHER = 'GRANDMOTHER',
  GRANDSON = 'GRANDSON',
  GRANDDAUGHTER = 'GRANDDAUGHTER',
  FATHER_IN_LAW = 'FATHER_IN_LAW',
  MOTHER_IN_LAW = 'MOTHER_IN_LAW',
  SON_IN_LAW = 'SON_IN_LAW',
  DAUGHTER_IN_LAW = 'DAUGHTER_IN_LAW',
  BROTHER_IN_LAW = 'BROTHER_IN_LAW',
  SISTER_IN_LAW = 'SISTER_IN_LAW',
  UNCLE = 'UNCLE',
  AUNT = 'AUNT',
  NEPHEW = 'NEPHEW',
  NIECE = 'NIECE',
  COUSIN = 'COUSIN',
  OTHER = 'OTHER'
}

export enum BloodGroup {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
  UNKNOWN = 'UNKNOWN'
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TEMPORARY_AWAY = 'TEMPORARY_AWAY',
  MOVED_OUT = 'MOVED_OUT',
  DECEASED = 'DECEASED'
}

export enum AgeGroup {
  INFANT = 'INFANT',        // 0-2 years
  CHILD = 'CHILD',          // 3-12 years
  TEENAGER = 'TEENAGER',    // 13-19 years
  ADULT = 'ADULT',          // 20-59 years
  SENIOR = 'SENIOR'         // 60+ years
}

// Statistics Interface
export interface FamilyStatistics {
  totalMembers: number;
  maleCount: number;
  femaleCount: number;
  childrenCount: number;
  adultsCount: number;
  seniorsCount: number;
  averageAge: number;
  relationshipDistribution: { [key: string]: number };
  bloodGroupDistribution: { [key: string]: number };
}

// Filter Interface
export interface FamilyMemberFilter {
  unitId?: string;
  relationship?: Relationship;
  gender?: Gender;
  ageGroup?: AgeGroup;
  status?: MemberStatus;
  hasGateAccess?: boolean;
  searchTerm?: string;
}
