import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * View Detector Guard
 * Detects if user is accessing mobile or web view and redirects to appropriate login
 */
export const viewDetectorGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const url = state.url;

  // Check if already authenticated
  const adminSession = sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
  const mobileUser = localStorage.getItem('mobileUser');
  const authToken = localStorage.getItem('authToken');

  // If accessing admin routes
  if (url.startsWith('/admin')) {
    if (adminSession || (authToken && sessionStorage.getItem('adminUser'))) {
      return true; // Already authenticated
    }
    router.navigate(['/admin/login'], { queryParams: { returnUrl: url } });
    return false;
  }

  // If accessing mobile routes
  if (url.startsWith('/mobile')) {
    if (mobileUser || authToken) {
      return true; // Already authenticated
    }
    router.navigate(['/mobile/auth/login'], { queryParams: { returnUrl: url } });
    return false;
  }

  // Root path - detect based on user agent or redirect to landing
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobileDevice) {
    router.navigate(['/mobile/auth/login']);
  } else {
    router.navigate(['/admin/login']);
  }
  
  return false;
};

