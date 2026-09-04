import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { MobileAuthService, UserRole } from '../services/mobile-auth.service';

/**
 * Enforces report `data.roles` string tags to mobile {@link UserRole} values.
 * Example: `data: { roles: ['guard'] }` allows GUARD and SECURITY_STAFF only.
 */
const ROUTE_ROLE_TAGS: Record<string, UserRole[]> = {
  guard: [UserRole.GUARD, UserRole.SECURITY_STAFF],
  owner: [UserRole.OWNER],
  tenant: [UserRole.TENANT],
  resident: [UserRole.OWNER, UserRole.TENANT],
  staff: [UserRole.FACILITY_MANAGER, UserRole.ACCOUNTANT, UserRole.DOMESTIC_STAFF],
  domestic: [UserRole.DOMESTIC_STAFF],
  admin: [UserRole.SOCIETY_ADMIN, UserRole.SUPER_ADMIN, UserRole.COMMITTEE_MEMBER],
  superadmin: [UserRole.SUPER_ADMIN]
};

/** Resolve allowed mobile roles from route data; empty = no restriction. */
function resolveAllowedRoles(route: ActivatedRouteSnapshot): UserRole[] {
  const tags = route.data?.['roles'] as string[] | undefined;
  if (!tags?.length) {
    return [];
  }
  const allowed = new Set<UserRole>();
  for (const tag of tags) {
    const mapped = ROUTE_ROLE_TAGS[String(tag).toLowerCase()];
    if (mapped) {
      mapped.forEach(r => allowed.add(r));
    }
  }
  return [...allowed];
}

/** Dashboard path segment for redirect when access is denied. */
function dashboardPathForRole(role: UserRole): string {
  if (role === UserRole.GUARD || role === UserRole.SECURITY_STAFF) {
    return '/mobile/guard/dashboard';
  }
  if (
    role === UserRole.FACILITY_MANAGER ||
    role === UserRole.ACCOUNTANT ||
    role === UserRole.DOMESTIC_STAFF
  ) {
    return '/mobile/staff/dashboard';
  }
  if (
    role === UserRole.SOCIETY_ADMIN ||
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.COMMITTEE_MEMBER
  ) {
    return '/mobile/admin/dashboard';
  }
  return '/mobile/dashboard';
}

/**
 * Enforces route.data.roles on mobile child routes.
 * Routes without `data.roles` remain open to any authenticated mobile user.
 */
export const routeDataRoleGuard: CanActivateFn = (route) => {
  const authService = inject(MobileAuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  if (!user) {
    router.navigate(['/mobile/auth/login']);
    return false;
  }

  const allowed = resolveAllowedRoles(route);
  if (!allowed.length || allowed.includes(user.role)) {
    return true;
  }

  router.navigate([dashboardPathForRole(user.role)]);
  return false;
};
