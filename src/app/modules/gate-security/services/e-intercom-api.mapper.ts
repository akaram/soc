/**
 * Maps society users and society office into E-Intercom contact cards.
 * Phone numbers are kept on the model but never shown in the UI.
 */

import { User, UserStatus, UserRole } from '../../user-management/models/user.model';
import { IntercomContact, ContactType } from '../models/e-intercom.model';
import { VideoCallSignalingService } from './video-call-signaling.service';

/** Map backend user role → intercom contact category */
export function mapUserRoleToContactType(role: UserRole | string | undefined): ContactType {
  const r = String(role ?? 'RESIDENT').toUpperCase();
  if (r === 'SECURITY_GUARD' || r === 'GUARD' || r === 'SECURITY_STAFF') {
    return ContactType.SECURITY;
  }
  if (r === 'STAFF' || r === 'FACILITY_MANAGER') {
    return ContactType.STAFF;
  }
  if (
    r === 'SECRETARY' ||
    r === 'TREASURER' ||
    r === 'CHAIRMAN' ||
    r === 'ADMIN' ||
    r === 'SUPER_ADMIN' ||
    r === 'COMMITTEE_MEMBER' ||
    r === 'ACCOUNTANT' ||
    r === 'AUDITOR'
  ) {
    return ContactType.MANAGEMENT;
  }
  return ContactType.RESIDENT;
}

/** Build display label shown instead of the raw phone number */
export function buildDisplayName(user: User): string {
  const name = `${user.firstName} ${user.lastName}`.trim() || 'Unknown';
  if (user.flatNumber) {
    return `${user.flatNumber} - ${name}`;
  }
  return name;
}

/** Extension derived from flat number digits or last 3 of user id */
export function buildExtension(user: User): string | undefined {
  if (user.flatNumber) {
    const digits = user.flatNumber.replace(/\D/g, '');
    if (digits.length >= 3) {
      return digits.slice(-4);
    }
    return user.flatNumber;
  }
  return undefined;
}

/** Society user row → callable intercom contact */
export function userToIntercomContact(
  user: User,
  signaling: VideoCallSignalingService
): IntercomContact {
  const phone = (user.phone || user.alternatePhone || '').trim();
  const roomId = signaling.normalizeRoomId(phone);
  const isActive = user.status === UserStatus.ACTIVE;
  const now = new Date();

  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim() || 'Unknown',
    contactType: mapUserRoleToContactType(user.userRole),
    flatNumber: user.flatNumber || undefined,
    unitNumber: user.building || undefined,
    displayName: buildDisplayName(user),
    phoneNumber: phone,
    extension: buildExtension(user),
    isActive,
    // Callable only when active and phone has enough digits for a signaling room
    isAvailable: isActive && roomId.length >= 6,
    avatar: user.profileImage,
    notes: user.remarks,
    createdAt: user.registrationDate ?? now,
    updatedAt: user.lastModified ?? now
  };
}

/** Society office line → management contact (gate can reach society desk) */
export function societyToIntercomContact(
  society: Record<string, unknown>,
  signaling: VideoCallSignalingService
): IntercomContact | null {
  const phone = String(society['phone'] ?? '').trim();
  const roomId = signaling.normalizeRoomId(phone);
  if (!roomId) {
    return null;
  }
  const name = String(society['name'] ?? 'Management Office').trim();
  const id = String(society['id'] ?? 'society-office');
  const now = new Date();

  return {
    id: `society::${id}`,
    name: 'Management Office',
    contactType: ContactType.MANAGEMENT,
    displayName: `${name} — Office`,
    phoneNumber: phone,
    extension: '200',
    isActive: true,
    isAvailable: true,
    createdAt: now,
    updatedAt: now
  };
}
