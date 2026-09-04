import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from './session-context.service';

/** Normalized row for mobile / admin complaint UIs */
export interface ComplaintRow {
  id: string;
  complaintNumber: string;
  societyId: string;
  flatId: string;
  flatNumber?: string;
  complainantId: string;
  complainantName?: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: Date;
  resolution?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComplaintsApiService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private normalize(raw: Record<string, unknown>): ComplaintRow {
    return {
      id: String(raw['id'] ?? ''),
      complaintNumber: String(raw['complaintNumber'] ?? raw['complaint_number'] ?? ''),
      societyId: String(raw['societyId'] ?? raw['society_id'] ?? ''),
      flatId: String(raw['flatId'] ?? raw['flat_id'] ?? ''),
      flatNumber: raw['flatNumber'] != null ? String(raw['flatNumber']) : raw['flat_number'] != null ? String(raw['flat_number']) : undefined,
      complainantId: String(raw['complainantId'] ?? raw['complainant_id'] ?? ''),
      complainantName:
        raw['complainantName'] != null
          ? String(raw['complainantName'])
          : raw['complainant_name'] != null
            ? String(raw['complainant_name'])
            : undefined,
      category: String(raw['category'] ?? ''),
      title: String(raw['title'] ?? ''),
      description: String(raw['description'] ?? ''),
      priority: String(raw['priority'] ?? 'MEDIUM'),
      status: String(raw['status'] ?? 'OPEN'),
      createdAt: raw['createdAt'] ? new Date(String(raw['createdAt'])) : new Date(0),
      resolution: raw['resolution'] != null ? String(raw['resolution']) : undefined
    };
  }

  listBySociety(societyId: string): Observable<ComplaintRow[]> {
    if (!societyId) {
      return of([]);
    }
    return this.http.get<Record<string, unknown>[]>(`/complaints/society/${encodeURIComponent(societyId)}`).pipe(
      map(rows => (rows ?? []).map(r => this.normalize(r))),
      catchError(err => {
        const msg =
          err?.error?.message ||
          err?.message ||
          'Could not load complaints. Check society selection and sign-in.';
        return throwError(() => new Error(msg));
      })
    );
  }

  /** Open / in-progress complaints raised by the logged-in resident (dashboard badge). */
  countOpenForUser(societyId: string, userId: string): Observable<number> {
    if (!societyId || !userId) {
      return of(0);
    }
    return this.listBySociety(societyId).pipe(
      map(rows =>
        rows.filter(r => r.complainantId === userId && this.isOpenStatus(r.status)).length
      )
    );
  }

  /** True when complaint is still active (not resolved/closed). */
  isOpenStatus(status: string): boolean {
    const u = (status || '').toUpperCase();
    if (u.includes('RESOLVED') || u.includes('CLOSED') || u.includes('CANCEL')) {
      return false;
    }
    return (
      u.includes('OPEN') ||
      u.includes('ASSIGNED') ||
      u.includes('PROGRESS') ||
      u.includes('PENDING') ||
      u.includes('REVIEW')
    );
  }

  getById(id: string): Observable<ComplaintRow> {
    return this.http
      .get<Record<string, unknown>>(`/complaints/${encodeURIComponent(id)}`)
      .pipe(map(r => this.normalize(r)));
  }

  /**
   * Resolves flat id from session or GET /users/:id when missing.
   */
  resolveFlatId(): Observable<string> {
    const direct = this.session.getFlatId();
    if (direct) {
      return of(direct);
    }
    const uid = this.session.getCurrentUserId();
    if (!uid) {
      return throwError(() => new Error('No logged-in user'));
    }
    return this.http.get<Record<string, unknown>>(`/users/${encodeURIComponent(uid)}`).pipe(
      map(u => String(u['flatId'] ?? u['flat_id'] ?? '')),
      catchError(() => of(''))
    );
  }

  create(payload: {
    societyId: string;
    flatId: string;
    complainantId: string;
    category: string;
    title: string;
    description: string;
    priority?: string;
  }): Observable<ComplaintRow> {
    const body: Record<string, unknown> = {
      societyId: payload.societyId,
      flatId: payload.flatId,
      complainantId: payload.complainantId,
      category: payload.category,
      title: payload.title,
      description: payload.description,
      priority: payload.priority ?? 'MEDIUM'
    };
    return this.http.post<Record<string, unknown>>('/complaints', body).pipe(map(r => this.normalize(r)));
  }

  /** Assign complaint to a user (committee / staff id). */
  assign(complaintId: string, assignedTo: string): Observable<ComplaintRow> {
    const params = new HttpParams().set('assignedTo', assignedTo);
    return this.http
      .post<Record<string, unknown>>(`/complaints/${encodeURIComponent(complaintId)}/assign`, null, { params })
      .pipe(map(r => this.normalize(r)));
  }

  /** Record resolution (admin closes loop). */
  resolve(complaintId: string, resolution: string, resolvedBy: string): Observable<ComplaintRow> {
    const params = new HttpParams().set('resolution', resolution).set('resolvedBy', resolvedBy);
    return this.http
      .post<Record<string, unknown>>(`/complaints/${encodeURIComponent(complaintId)}/resolve`, null, { params })
      .pipe(map(r => this.normalize(r)));
  }

  /** Set workflow status (OPEN, IN_PROGRESS, etc.). */
  updateStatus(complaintId: string, status: string): Observable<ComplaintRow> {
    const params = new HttpParams().set('status', status);
    return this.http
      .put<Record<string, unknown>>(`/complaints/${encodeURIComponent(complaintId)}/status`, null, { params })
      .pipe(map(r => this.normalize(r)));
  }
}
