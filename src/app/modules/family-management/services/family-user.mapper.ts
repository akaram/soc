import { User, UserStatus, UserType } from '../../user-management/models/user.model';
import {
  FamilyMember,
  Gender,
  Relationship,
  MemberStatus,
  AgeGroup
} from '../models/family-member.model';

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getAgeGroup(age: number): AgeGroup {
  if (age <= 2) return AgeGroup.INFANT;
  if (age <= 12) return AgeGroup.CHILD;
  if (age <= 19) return AgeGroup.TEENAGER;
  if (age <= 59) return AgeGroup.ADULT;
  return AgeGroup.SENIOR;
}

/** Maps society {@link User} rows to the family UI {@link FamilyMember} shape. */
export function mapUserToFamilyMember(u: User): FamilyMember {
  const dob = u.dateOfBirth ?? new Date(0);
  const age = calculateAge(dob);
  let relationship = Relationship.OTHER;
  if (u.userType === UserType.OWNER) {
    relationship = Relationship.SELF;
  }
  const isPrimary = u.userType === UserType.OWNER;
  const memberStatus =
    u.status === UserStatus.ACTIVE ? MemberStatus.ACTIVE : MemberStatus.INACTIVE;
  const unitId = u.flatId ?? u.flatNumber ?? u.societyId ?? '';

  return {
    id: u.id,
    unitId,
    unitNumber: u.flatNumber || '',
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`.trim(),
    dateOfBirth: dob,
    age,
    gender: (u.gender as Gender) ?? Gender.MALE,
    relationship,
    email: u.email,
    phoneNumber: u.phone,
    profilePhoto: u.profileImage,
    hasGateAccess: true,
    hasAmenityAccess: true,
    canRaiseComplaints: true,
    canBookAmenities: true,
    isAuthorizedForPayments: isPrimary || u.userType === UserType.TENANT,
    associatedVehicles: [],
    status: memberStatus,
    isPrimaryResident: isPrimary,
    isOwner: u.userType === UserType.OWNER,
    isTenant: u.userType === UserType.TENANT,
    addedBy: u.approvedBy ?? 'system',
    addedDate: u.registrationDate,
    lastModified: u.lastModified,
    modifiedBy: u.approvedBy ?? 'system',
    remarks: u.remarks
  };
}

export function memberMatchesFilter(
  m: FamilyMember,
  filter: {
    unitId?: string;
    relationship?: Relationship;
    gender?: Gender;
    ageGroup?: AgeGroup;
    status?: MemberStatus;
    hasGateAccess?: boolean;
    searchTerm?: string;
  }
): boolean {
  if (filter.unitId && m.unitId !== filter.unitId && m.unitNumber !== filter.unitId) {
    return false;
  }
  if (filter.relationship && m.relationship !== filter.relationship) {
    return false;
  }
  if (filter.gender && m.gender !== filter.gender) {
    return false;
  }
  if (filter.ageGroup && getAgeGroup(m.age) !== filter.ageGroup) {
    return false;
  }
  if (filter.status && m.status !== filter.status) {
    return false;
  }
  if (filter.hasGateAccess !== undefined && m.hasGateAccess !== filter.hasGateAccess) {
    return false;
  }
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    const hit =
      m.fullName.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.phoneNumber?.includes(term);
    if (!hit) {
      return false;
    }
  }
  return true;
}
