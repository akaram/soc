import { Injectable } from '@angular/core';

/** Persists admin sidebar show/hide preference per browser. */
@Injectable({ providedIn: 'root' })
export class AdminSidebarPreferenceService {
  private readonly storageKey = 'adminSidebarOpen';

  /** Default: visible on desktop, hidden on mobile. */
  getInitialOpen(isMobile: boolean): boolean {
    const saved = localStorage.getItem(this.storageKey);
    if (saved !== null) {
      return saved === 'true';
    }
    return !isMobile;
  }

  save(open: boolean): void {
    localStorage.setItem(this.storageKey, String(open));
  }

  /** Restore saved preference when returning from mobile to desktop width. */
  getSaved(): boolean | null {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === null) {
      return null;
    }
    return saved === 'true';
  }
}
