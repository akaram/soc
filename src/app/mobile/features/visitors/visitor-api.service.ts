import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { MobileUser, UserRole } from '../../services/mobile-auth.service';

export type VisitorStatusUi = 'approved' | 'pending' | 'rejected' | 'checked-in' | 'checked-out';

export interface VisitorUi {
  id: string;
  name: string;
  phone: string;
  flatNumber: string;
  purpose: string;
  /** Display label: Today, Yesterday, or "28 May". */
  date: string;
  /** Raw visit date yyyy-MM-dd for stats and filters. */
  visitDateIso: string;
  time: string;
  status: VisitorStatusUi;
  photo?: string;
  vehicleNumber?: string;
  ownerName: string;
  hostId?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

/** Backend Visitor JSON (Jackson) – partial fields used by the mobile UI. */
type VisitorRaw = {
  id?: string;
  name?: string;
  phone?: string;
  purpose?: string;
  visitingFlat?: string;
  hostName?: string;
  hostId?: string;
  visitDate?: string; // yyyy-MM-dd
  visitTime?: string; // HH:mm:ss
  status?: string; // PENDING, APPROVED, ...
  photo?: string;
  vehicleNumber?: string;
  checkInTime?: string; // ISO-ish
  checkOutTime?: string;
};

@Injectable({ providedIn: 'root' })
export class VisitorApiService {
  constructor(private http: HttpClient) {}

  listBySociety(societyId: string): Observable<VisitorUi[]> {
    return this.http
      .get<VisitorRaw[] | { content?: VisitorRaw[] }>(
        `/visitors/society/${encodeURIComponent(societyId)}`
      )
      .pipe(
        map(rows => this.coerceVisitorRows(rows).map(r => this.normalize(r))),
        catchError(() => of([]))
      );
  }

  /** Visitors invited by the logged-in resident (host). */
  listByHost(hostId: string): Observable<VisitorUi[]> {
    if (!hostId) {
      return of([]);
    }
    return this.http
      .get<VisitorRaw[] | { content?: VisitorRaw[] }>(`/visitors/host/${encodeURIComponent(hostId)}`)
      .pipe(
        map(rows => this.coerceVisitorRows(rows).map(r => this.normalize(r))),
        catchError(() => of([]))
      );
  }

  /**
   * Role-aware visitor list for the mobile portal.
   * Owners/tenants only see invites for their flat; guards/staff see the whole society.
   */
  listForPortalUser(user: Pick<MobileUser, 'id' | 'role' | 'societyId' | 'flatNumber'> | null): Observable<VisitorUi[]> {
    if (!user) {
      return of([]);
    }
    if (this.isResidentRole(user.role)) {
      return this.listByHost(user.id).pipe(
        map(rows => this.filterVisitorsToResidentFlat(rows, user.flatNumber))
      );
    }
    if (user.societyId) {
      return this.listBySociety(user.societyId);
    }
    return of([]);
  }

  /** True for flat owners and tenants (not guards or society staff). */
  private isResidentRole(role: UserRole): boolean {
    return role === UserRole.OWNER || role === UserRole.TENANT;
  }

  /** Extra safety: only show rows that match the resident's flat when flat is known. */
  private filterVisitorsToResidentFlat(rows: VisitorUi[], flatNumber?: string): VisitorUi[] {
    const flat = flatNumber?.trim().toLowerCase();
    if (!flat) {
      return rows;
    }
    return rows.filter(v => {
      const visitorFlat = (v.flatNumber || '').trim().toLowerCase();
      return !visitorFlat || visitorFlat === flat;
    });
  }

  /** Accepts a plain array or Spring Page `{ content: [...] }`. */
  private coerceVisitorRows(rows: VisitorRaw[] | { content?: VisitorRaw[] } | null | undefined): VisitorRaw[] {
    if (Array.isArray(rows)) {
      return rows;
    }
    if (rows && Array.isArray(rows.content)) {
      return rows.content;
    }
    return [];
  }

  approve(id: string, approvedBy?: string): Observable<VisitorUi> {
    let params = new HttpParams().set('complete', 'true');
    if (approvedBy) {
      params = params.set('approvedBy', approvedBy);
    }
    return this.http
      .post<VisitorRaw>(`/visitors/${encodeURIComponent(id)}/approve`, null, { params })
      .pipe(map(r => this.normalize(r)));
  }

  reject(id: string, reason: string): Observable<VisitorUi> {
    const params = new HttpParams().set('reason', reason);
    return this.http
      .post<VisitorRaw>(`/visitors/${encodeURIComponent(id)}/reject`, null, { params })
      .pipe(map(r => this.normalize(r)));
  }

  /** Register a new visitor (resident pre-invite from mobile). */
  createVisitor(payload: Record<string, unknown>): Observable<VisitorUi> {
    return this.http.post<VisitorRaw>('/visitors', payload).pipe(map(r => this.normalize(r)));
  }

  private normalize(raw: VisitorRaw): VisitorUi {
    const statusRaw = String(raw.status ?? '').toUpperCase();
    const status: VisitorStatusUi =
      statusRaw === 'APPROVED'
        ? 'approved'
        : statusRaw === 'REJECTED'
          ? 'rejected'
          : statusRaw === 'CHECKED_IN'
            ? 'checked-in'
            : statusRaw === 'CHECKED_OUT'
              ? 'checked-out'
              : 'pending';

    const visitDateIso = this.parseVisitDateIso(raw.visitDate);
    const visitDate = visitDateIso ? this.formatDateLabel(visitDateIso) : '';
    const visitTime = raw.visitTime ? this.formatTimeLabel(raw.visitTime) : '';

    return {
      id: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      phone: String(raw.phone ?? ''),
      flatNumber: String(raw.visitingFlat ?? ''),
      ownerName: String(raw.hostName ?? ''),
      hostId: raw.hostId ? String(raw.hostId) : undefined,
      purpose: String(raw.purpose ?? ''),
      date: visitDate,
      visitDateIso,
      time: visitTime,
      status,
      photo: raw.photo || undefined,
      vehicleNumber: raw.vehicleNumber || undefined,
      checkInTime: raw.checkInTime ? this.formatDateTimeLabel(raw.checkInTime) : undefined,
      checkOutTime: raw.checkOutTime ? this.formatDateTimeLabel(raw.checkOutTime) : undefined
    };
  }

  /** Normalizes API visitDate to yyyy-MM-dd. */
  private parseVisitDateIso(value: unknown): string {
    if (value == null || value === '') return '';
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  /** Converts yyyy-MM-dd into "Today"/"Yesterday"/"28 May". */
  private formatDateLabel(yyyyMmDd: string): string {
    const d = new Date(`${yyyyMmDd}T12:00:00`);
    const today = new Date();
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    if (sameDay(d, today)) return 'Today';
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    if (sameDay(d, y)) return 'Yesterday';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  /** Converts HH:mm:ss into "10:30 AM". */
  private formatTimeLabel(hhMmSs: string): string {
    const parts = hhMmSs.split(':').map(p => Number(p));
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  private formatDateTimeLabel(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

