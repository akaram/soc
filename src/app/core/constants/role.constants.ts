/**
 * Shared RBAC constants — aligns admin UserRole with backend User.UserRole enum.
 * UserType (Owner/Tenant/…) is occupancy classification; UserRole is access control.
 */
import { UserRole, UserType } from '../../modules/user-management/models/user.model';

/** Human-readable labels for backend role enum values. */
export const ROLE_LABELS: Record<string, string> = {
  [UserRole.RESIDENT]: 'Resident',
  [UserRole.COMMITTEE_MEMBER]: 'Committee Member',
  [UserRole.SECRETARY]: 'Secretary',
  [UserRole.TREASURER]: 'Treasurer',
  [UserRole.CHAIRMAN]: 'Chairman',
  [UserRole.ADMIN]: 'Society Admin',
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ACCOUNTANT]: 'Accountant',
  [UserRole.AUDITOR]: 'Auditor',
  [UserRole.FACILITY_MANAGER]: 'Facility Manager',
  [UserRole.STAFF]: 'Staff',
  [UserRole.SECURITY_GUARD]: 'Security Guard',
  // Mobile login aliases (display only)
  GUARD: 'Security Guard',
  SECURITY_STAFF: 'Security Staff'
};

/** Emoji icons for role badges in admin user lists. */
export const ROLE_ICONS: Record<string, string> = {
  [UserRole.RESIDENT]: '👤',
  [UserRole.COMMITTEE_MEMBER]: '👥',
  [UserRole.SECRETARY]: '📋',
  [UserRole.TREASURER]: '💰',
  [UserRole.CHAIRMAN]: '👑',
  [UserRole.ADMIN]: '⚙️',
  [UserRole.SUPER_ADMIN]: '🛡️',
  [UserRole.ACCOUNTANT]: '🧾',
  [UserRole.AUDITOR]: '🔍',
  [UserRole.FACILITY_MANAGER]: '🏢',
  [UserRole.STAFF]: '👷',
  [UserRole.SECURITY_GUARD]: '🛡️',
  GUARD: '🛡️',
  SECURITY_STAFF: '🛡️'
};

/** Roles counted as operational staff (stats, filters). */
export const STAFF_MEMBER_ROLES = new Set<string>([
  UserRole.STAFF,
  UserRole.SECURITY_GUARD,
  UserRole.FACILITY_MANAGER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.AUDITOR,
  'GUARD',
  'SECURITY_STAFF'
]);

/** Guard-specific roles (mobile + backend). */
export const GUARD_ROLES = new Set<string>([
  UserRole.SECURITY_GUARD,
  'GUARD',
  'SECURITY_STAFF'
]);

/** Roles assignable when an admin creates staff (not self-registration). */
export const ADMIN_ASSIGNABLE_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: UserRole.SECURITY_GUARD, label: 'Security Guard' },
  { value: UserRole.STAFF, label: 'Staff' },
  { value: UserRole.FACILITY_MANAGER, label: 'Facility Manager' },
  { value: UserRole.ACCOUNTANT, label: 'Accountant' },
  { value: UserRole.AUDITOR, label: 'Auditor' },
  { value: UserRole.ADMIN, label: 'Society Admin' },
  { value: UserRole.COMMITTEE_MEMBER, label: 'Committee Member' },
  { value: UserRole.SECRETARY, label: 'Secretary' },
  { value: UserRole.TREASURER, label: 'Treasurer' },
  { value: UserRole.CHAIRMAN, label: 'Chairman' }
];

/** Resident occupancy types — shown as "User Type" on registration (not RBAC). */
export const RESIDENT_USER_TYPES: Array<{ value: UserType; label: string }> = [
  { value: UserType.OWNER, label: 'Owner' },
  { value: UserType.TENANT, label: 'Tenant' },
  { value: UserType.FAMILY_MEMBER, label: 'Family Member' },
  { value: UserType.PG_GUEST, label: 'PG Guest' }
];

/** Format enum value for display (e.g. SECURITY_GUARD → Security Guard). */
export function formatRoleLabel(role: string | undefined | null): string {
  if (!role) return '—';
  const key = role.trim().toUpperCase();
  return ROLE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Icon for a role badge; falls back to generic user. */
export function getRoleIcon(role: string | undefined | null): string {
  if (!role) return '👤';
  const key = role.trim().toUpperCase();
  return ROLE_ICONS[key] ?? '👤';
}

/** True when role represents staff (not resident/committee-only resident). */
export function isStaffMemberRole(role: string | undefined | null): boolean {
  return STAFF_MEMBER_ROLES.has(String(role ?? '').trim().toUpperCase());
}

/** True when role is a security guard (backend SECURITY_GUARD or mobile GUARD alias). */
export function isGuardRole(role: string | undefined | null): boolean {
  return GUARD_ROLES.has(String(role ?? '').trim().toUpperCase());
}

/** Roles blocked from the desktop admin SPA (use mobile guard app instead). */
export const ADMIN_PORTAL_BLOCKED_ROLES = new Set<string>([
  UserRole.SECURITY_GUARD,
  'GUARD',
  'SECURITY_STAFF'
]);
