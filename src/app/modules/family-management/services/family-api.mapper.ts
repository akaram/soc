import {
  FamilyMember,
  Gender,
  MemberStatus,
  Relationship
} from '../models/family-member.model';

/** Raw row from GET /family-members/... */
export type FamilyMemberApiRow = {
  id?: string;
  name?: string;
  relation?: string;
  phone?: string;
  email?: string;
  userId?: string;
  unitId?: string;
  unitNumber?: string;
  ownerName?: string;
};

/** Map backend family member DTO to admin Family Profiles UI model. */
export function mapApiRowToFamilyMember(row: FamilyMemberApiRow): FamilyMember {
  const fullName = (row.name ?? '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

  return {
    id: row.id ?? '',
    unitId: row.unitId ?? '',
    unitNumber: row.unitNumber ?? '',
    firstName,
    lastName,
    fullName: fullName || `${firstName} ${lastName}`.trim(),
    dateOfBirth: new Date(0),
    age: 0,
    gender: Gender.MALE,
    relationship: parseRelationship(row.relation),
    email: row.email,
    phoneNumber: row.phone,
    hasGateAccess: false,
    hasAmenityAccess: false,
    canRaiseComplaints: false,
    canBookAmenities: false,
    isAuthorizedForPayments: false,
    associatedVehicles: [],
    status: MemberStatus.ACTIVE,
    isPrimaryResident: false,
    isOwner: false,
    isTenant: false,
    addedBy: row.ownerName ?? row.userId ?? 'owner',
    addedDate: new Date(),
    lastModified: new Date(),
    modifiedBy: row.ownerName ?? '',
    remarks: row.ownerName ? `Flat owner: ${row.ownerName}` : undefined
  };
}

function parseRelationship(relation?: string): Relationship {
  if (!relation?.trim()) {
    return Relationship.OTHER;
  }
  const norm = relation.trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (Object.values(Relationship).includes(norm as Relationship)) {
    return norm as Relationship;
  }
  if (norm.includes('BROTHER')) return Relationship.BROTHER;
  if (norm.includes('SISTER')) return Relationship.SISTER;
  if (norm.includes('SPOUSE') || norm.includes('WIFE') || norm.includes('HUSBAND')) {
    return Relationship.SPOUSE;
  }
  if (norm.includes('SON')) return Relationship.SON;
  if (norm.includes('DAUGHTER')) return Relationship.DAUGHTER;
  if (norm.includes('FATHER')) return Relationship.FATHER;
  if (norm.includes('MOTHER')) return Relationship.MOTHER;
  return Relationship.OTHER;
}
