import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { MobileAuthService, UserRole } from '../services/mobile-auth.service';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(MobileAuthService);
    const router = inject(Router);

    const user = authService.getCurrentUser();

    if (!user) {
      router.navigate(['/mobile/login']);
      return false;
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    // Redirect to appropriate dashboard based on role
    router.navigate([`/mobile/${getRolePath(user.role)}`]);
    return false;
  };
};

function getRolePath(role: UserRole): string {
  const rolePathMap: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'admin-dashboard',
    [UserRole.SOCIETY_ADMIN]: 'admin-dashboard',
    [UserRole.GUARD]: 'guard-dashboard',
    [UserRole.SECURITY_STAFF]: 'guard-dashboard',
    [UserRole.FACILITY_MANAGER]: 'staff-dashboard',
    [UserRole.ACCOUNTANT]: 'staff-dashboard',
    [UserRole.COMMITTEE_MEMBER]: 'admin-dashboard',
    [UserRole.OWNER]: 'resident-dashboard',
    [UserRole.TENANT]: 'resident-dashboard',
    [UserRole.DOMESTIC_STAFF]: 'staff-dashboard'
  };

  return rolePathMap[role] || 'resident-dashboard';
}
