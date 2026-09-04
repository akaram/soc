import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ADMIN_PORTAL_BLOCKED_ROLES } from '../../core/constants/role.constants';

/**
 * Admin guard: requires a JWT (API calls need it) plus a staff/non-resident role.
 * Security guards use the mobile app — block them from the desktop admin SPA.
 */
export const adminAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const authToken =
    sessionStorage.getItem('adminAuthToken') ||
    localStorage.getItem('adminAuthToken') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken');
  const adminSession =
    sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
  const adminUser =
    sessionStorage.getItem('adminUser') || localStorage.getItem('adminUser');

  // Without a token every /module-records etc. call returns 401 — do not allow admin UI.
  if (!authToken?.trim()) {
    router.navigate(['/admin/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (adminSession || adminUser) {
    try {
      const user = adminUser
        ? JSON.parse(adminUser)
        : adminSession
          ? JSON.parse(adminSession)
          : null;

      const role = (user?.role || '').toString().trim().toUpperCase();
      if (user && role && role !== 'RESIDENT') {
        // Guards must use mobile guard dashboard, not admin portal
        if (ADMIN_PORTAL_BLOCKED_ROLES.has(role)) {
          router.navigate(['/mobile/auth/login'], {
            queryParams: { reason: 'guard-use-mobile' }
          });
          return false;
        }
        return true;
      }
    } catch (e) {
      console.error('Invalid admin session data:', e);
    }
  }

  router.navigate(['/admin/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
