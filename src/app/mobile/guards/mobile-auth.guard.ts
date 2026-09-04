import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { MobileAuthService } from '../services/mobile-auth.service';

/**
 * Mobile Authentication Guard
 * Redirects to mobile login if user is not authenticated
 */
export const mobileAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(MobileAuthService);

  // Check if user is logged in
  const currentUser = authService.getCurrentUser();
  const mobileUser = localStorage.getItem('mobileUser');
  const authToken = localStorage.getItem('authToken');

  if (currentUser || mobileUser || authToken) {
    return true;
  }

  // Not authenticated - redirect to mobile login
  router.navigate(['/mobile/auth/login'], { 
    queryParams: { returnUrl: state.url } 
  });
  return false;
};

