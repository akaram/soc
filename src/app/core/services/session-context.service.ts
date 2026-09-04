import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionContextService {
  /** Society id embedded in the JWT that belongs to the current portal. */
  private getSocietyIdFromAuthToken(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    const path = window.location.pathname;
    const isMobileField = path.startsWith('/mobile') && !path.includes('/facial-recognition');
    const token = isMobileField
      ? (localStorage.getItem('mobileAuthToken') ?? localStorage.getItem('authToken') ?? '')
      : (
          sessionStorage.getItem('adminAuthToken') ??
          sessionStorage.getItem('authToken') ??
          localStorage.getItem('adminAuthToken') ??
          localStorage.getItem('authToken') ??
          ''
        );
    if (!token || token.split('.').length < 2) {
      return '';
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { societyId?: string };
      return payload.societyId?.trim() ?? '';
    } catch {
      return '';
    }
  }

  /** True when an admin staff session is present (Society Setup / admin portal). */
  private hasAdminSession(): boolean {
    return !!(
      sessionStorage.getItem('adminSession') ||
      localStorage.getItem('adminSession') ||
      sessionStorage.getItem('adminUser') ||
      localStorage.getItem('adminUser')
    );
  }

  /**
   * Active society for API calls.
   * - Admin (including admin flows hosted under /mobile/* like facial enrollment):
   *   Society Setup selection wins over JWT home society.
   * - Guard/resident mobile app: JWT society wins so path-scoped APIs match the token.
   */
  getSocietyId(): string {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isMobilePath = pathname.includes('/mobile');
    const isMobileFieldApp =
      isMobilePath && !pathname.includes('/facial-recognition');
    const adminLoggedIn = this.hasAdminSession();

    // Guard / owner / staff mobile: always use JWT society so /flats/society/{id} matches the token.
    if (isMobileFieldApp) {
      const fromJwt = this.getSocietyIdFromAuthToken();
      if (fromJwt) {
        return fromJwt;
      }
      for (const key of ['mobileUser', 'currentUser'] as const) {
        const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
        if (!raw) continue;
        try {
          const o = JSON.parse(raw) as { societyId?: string };
          if (o.societyId?.trim()) return o.societyId.trim();
        } catch {
          /* ignore */
        }
      }
    }

    // Admin (including facial enrollment under /mobile/auth): Society Setup selection wins.
    if (adminLoggedIn || pathname.includes('/admin')) {
      const setupSession = sessionStorage.getItem('societyId');
      if (setupSession?.trim()) {
        return setupSession.trim();
      }

      const fromLocal = localStorage.getItem('societyId');
      if (fromLocal?.trim()) {
        return fromLocal.trim();
      }

      for (const key of ['adminSession', 'adminUser'] as const) {
        const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
        if (!raw) continue;
        try {
          const o = JSON.parse(raw) as { societyId?: string };
          if (o.societyId?.trim()) return o.societyId.trim();
        } catch {
          /* ignore */
        }
      }
    }

    // Generic fallback
    const fromSession =
      sessionStorage.getItem('societyId') || localStorage.getItem('societyId');
    if (fromSession?.trim()) {
      return fromSession.trim();
    }

    for (const key of ['adminUser', 'adminSession', 'mobileUser', 'currentUser'] as const) {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!raw) continue;
      try {
        const o = JSON.parse(raw) as { societyId?: string };
        if (o.societyId?.trim()) return o.societyId.trim();
      } catch {
        /* ignore */
      }
    }
    return '';
  }

  getCurrentUserId(): string {
    for (const storage of [localStorage, sessionStorage]) {
      const s = storage.getItem('adminSession');
      if (s) {
        try {
          const o = JSON.parse(s) as { userId?: string };
          if (o.userId) return o.userId;
        } catch {
          /* continue */
        }
      }
    }
    for (const key of ['adminUser', 'mobileUser', 'currentUser'] as const) {
      const u = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!u) continue;
      try {
        const o = JSON.parse(u) as { id?: string; userId?: string };
        const id = o.userId ?? o.id;
        if (id) return id;
      } catch {
        /* ignore */
      }
    }
    // Never fall back to societyId — that breaks /bills/owner/{id} and similar APIs.
    return '';
  }

  getFlatId(): string | null {
    for (const key of ['adminUser', 'adminSession', 'mobileUser', 'currentUser'] as const) {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!raw) continue;
      try {
        const o = JSON.parse(raw) as { flatId?: string; flat_id?: string };
        const fid = o.flatId ?? o.flat_id;
        if (fid) return fid;
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}
