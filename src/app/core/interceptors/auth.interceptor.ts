import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const ADMIN_TOKEN_KEY = 'adminAuthToken';
const MOBILE_TOKEN_KEY = 'mobileAuthToken';

function hasAdminSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!(
    sessionStorage.getItem('adminSession') ||
    localStorage.getItem('adminSession') ||
    sessionStorage.getItem('adminUser') ||
    localStorage.getItem('adminUser')
  );
}

/**
 * Pick the JWT for this page: admin UI must not send a leftover mobile token
 * (that mismatch is what 403s /flats/society/{id} after using the mobile app).
 */
function readAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const path = window.location.pathname;
  const facialWithAdmin = path.includes('/facial-recognition') && hasAdminSession();
  const useAdminToken = path.startsWith('/admin') || facialWithAdmin;

  if (useAdminToken) {
    return (
      sessionStorage.getItem(ADMIN_TOKEN_KEY)?.trim() ||
      localStorage.getItem(ADMIN_TOKEN_KEY)?.trim() ||
      sessionStorage.getItem('authToken')?.trim() ||
      localStorage.getItem('authToken')?.trim() ||
      null
    );
  }

  if (path.startsWith('/mobile')) {
    return (
      localStorage.getItem(MOBILE_TOKEN_KEY)?.trim() ||
      localStorage.getItem('authToken')?.trim() ||
      sessionStorage.getItem('authToken')?.trim() ||
      null
    );
  }

  return (
    sessionStorage.getItem(ADMIN_TOKEN_KEY)?.trim() ||
    sessionStorage.getItem('authToken')?.trim() ||
    localStorage.getItem(ADMIN_TOKEN_KEY)?.trim() ||
    localStorage.getItem('authToken')?.trim() ||
    null
  );
}

/**
 * Attaches Bearer JWT to API calls; on 401 (except login), send user back to the matching login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = readAuthToken();

  const outbound = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(outbound).pipe(
    catchError(err => {
      const onLoginPage =
        router.url?.includes('/auth/login') || router.url?.includes('/admin/login');
      if (err.status === 401 && !req.url.includes('/auth/login') && !onLoginPage) {
        const isMobile = router.url?.startsWith('/mobile');
        if (isMobile) {
          localStorage.removeItem('authToken');
          localStorage.removeItem(MOBILE_TOKEN_KEY);
          localStorage.removeItem('mobileUser');
          localStorage.removeItem('refreshToken');
        } else {
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          sessionStorage.removeItem('adminSession');
          sessionStorage.removeItem('adminUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          localStorage.removeItem('adminSession');
          localStorage.removeItem('adminUser');
        }

        router.navigate([isMobile ? '/mobile/auth/login' : '/admin/login'], {
          queryParams: { returnUrl: router.url, reason: 'session-expired' }
        });
      }
      return throwError(() => err);
    })
  );
};
