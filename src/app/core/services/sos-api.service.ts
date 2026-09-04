import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from './session-context.service';

export interface SosAlertRow {
  id: string;
  societyId: string;
  flatId?: string;
  flatNumber?: string;
  triggeredById: string;
  triggeredByName?: string;
  alertNumber: string;
  alertType: string;
  status: string;
  message?: string;
  locationDescription?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt?: Date;
}

export interface EmergencyContactRow {
  label: string;
  phone: string;
  role: string;
  icon: string;
}

export const SOS_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED'] as const;
export const SOS_TYPES = ['RESIDENT', 'ADMIN', 'GUARD'] as const;

@Injectable({ providedIn: 'root' })
export class SosApiService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private normalizeAlert(raw: Record<string, unknown>): SosAlertRow {
    const created = raw['createdAt'] ?? raw['created_at'];
    return {
      id: String(raw['id'] ?? ''),
      societyId: String(raw['societyId'] ?? raw['society_id'] ?? ''),
      flatId: raw['flatId'] != null ? String(raw['flatId']) : raw['flat_id'] != null ? String(raw['flat_id']) : undefined,
      flatNumber:
        raw['flatNumber'] != null
          ? String(raw['flatNumber'])
          : raw['flat_number'] != null
            ? String(raw['flat_number'])
            : undefined,
      triggeredById: String(raw['triggeredById'] ?? raw['triggered_by_id'] ?? ''),
      triggeredByName:
        raw['triggeredByName'] != null
          ? String(raw['triggeredByName'])
          : raw['triggered_by_name'] != null
            ? String(raw['triggered_by_name'])
            : undefined,
      alertNumber: String(raw['alertNumber'] ?? raw['alert_number'] ?? ''),
      alertType: String(raw['alertType'] ?? raw['alert_type'] ?? 'RESIDENT'),
      status: String(raw['status'] ?? 'ACTIVE'),
      message: raw['message'] != null ? String(raw['message']) : undefined,
      locationDescription:
        raw['locationDescription'] != null
          ? String(raw['locationDescription'])
          : raw['location_description'] != null
            ? String(raw['location_description'])
            : undefined,
      acknowledgedBy: raw['acknowledgedBy'] != null ? String(raw['acknowledgedBy']) : undefined,
      acknowledgedAt: raw['acknowledgedAt'] != null ? String(raw['acknowledgedAt']) : undefined,
      resolvedBy: raw['resolvedBy'] != null ? String(raw['resolvedBy']) : undefined,
      resolvedAt: raw['resolvedAt'] != null ? String(raw['resolvedAt']) : undefined,
      resolutionNotes: raw['resolutionNotes'] != null ? String(raw['resolutionNotes']) : undefined,
      createdAt: created ? new Date(String(created)) : undefined
    };
  }

  private normalizeContact(raw: Record<string, unknown>): EmergencyContactRow {
    return {
      label: String(raw['label'] ?? ''),
      phone: String(raw['phone'] ?? ''),
      role: String(raw['role'] ?? ''),
      icon: String(raw['icon'] ?? 'phone')
    };
  }

  listBySociety(societyId: string): Observable<SosAlertRow[]> {
    if (!societyId) return of([]);
    return this.http
      .get<Record<string, unknown>[]>(`/sos-alerts/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeAlert(r))),
        catchError(err => throwError(() => new Error(err?.error?.message || err?.message || 'Could not load SOS alerts.')))
      );
  }

  listActiveBySociety(societyId: string): Observable<SosAlertRow[]> {
    if (!societyId) return of([]);
    return this.http
      .get<Record<string, unknown>[]>(`/sos-alerts/society/${encodeURIComponent(societyId)}/active`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeAlert(r))),
        catchError(err => throwError(() => new Error(err?.error?.message || err?.message || 'Could not load active SOS alerts.')))
      );
  }

  listForUser(userId: string): Observable<SosAlertRow[]> {
    if (!userId) return of([]);
    return this.http
      .get<Record<string, unknown>[]>(`/sos-alerts/user/${encodeURIComponent(userId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeAlert(r))),
        catchError(() => of([]))
      );
  }

  getContacts(societyId: string): Observable<EmergencyContactRow[]> {
    if (!societyId) return of(this.defaultNationalContacts());
    return this.http
      .get<Record<string, unknown>[]>(`/sos-alerts/contacts/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeContact(r))),
        catchError(() => of(this.defaultNationalContacts()))
      );
  }

  trigger(payload: {
    societyId: string;
    flatId?: string;
    triggeredById: string;
    alertType?: string;
    message?: string;
    locationDescription?: string;
  }): Observable<SosAlertRow> {
    const body: Record<string, unknown> = {
      societyId: payload.societyId,
      triggeredById: payload.triggeredById,
      alertType: payload.alertType ?? 'RESIDENT',
      message: payload.message ?? 'Emergency SOS — immediate assistance required',
      locationDescription: payload.locationDescription
    };
    if (payload.flatId) {
      body['flatId'] = payload.flatId;
    }
    return this.http.post<Record<string, unknown>>('/sos-alerts/trigger', body).pipe(map(r => this.normalizeAlert(r)));
  }

  /** Owner/resident triggers SOS from session context */
  triggerForResident(message?: string, locationDescription?: string): Observable<SosAlertRow> {
    const societyId = this.session.getSocietyId();
    const userId = this.session.getCurrentUserId();
    const flatId = this.session.getFlatId() ?? undefined;
    if (!societyId || !userId) {
      return throwError(() => new Error('Sign in with a society account to send SOS.'));
    }
    return this.trigger({
      societyId,
      flatId,
      triggeredById: userId,
      alertType: 'RESIDENT',
      message: message || 'Emergency SOS — resident needs immediate help',
      locationDescription
    });
  }

  acknowledge(id: string, acknowledgedBy?: string): Observable<SosAlertRow> {
    let params = new HttpParams();
    if (acknowledgedBy) {
      params = params.set('acknowledgedBy', acknowledgedBy);
    }
    return this.http
      .put<Record<string, unknown>>(`/sos-alerts/${encodeURIComponent(id)}/acknowledge`, null, { params })
      .pipe(map(r => this.normalizeAlert(r)));
  }

  resolve(id: string, resolvedBy?: string, resolutionNotes?: string): Observable<SosAlertRow> {
    let params = new HttpParams();
    if (resolvedBy) params = params.set('resolvedBy', resolvedBy);
    if (resolutionNotes) params = params.set('resolutionNotes', resolutionNotes);
    return this.http
      .put<Record<string, unknown>>(`/sos-alerts/${encodeURIComponent(id)}/resolve`, null, { params })
      .pipe(map(r => this.normalizeAlert(r)));
  }

  isOpen(status: string): boolean {
    const u = (status || '').toUpperCase();
    return u === 'ACTIVE' || u === 'ACKNOWLEDGED';
  }

  defaultNationalContacts(): EmergencyContactRow[] {
    return [
      { label: 'Police', phone: '100', role: 'NATIONAL', icon: 'local_police' },
      { label: 'Fire', phone: '101', role: 'NATIONAL', icon: 'local_fire_department' },
      { label: 'Ambulance', phone: '108', role: 'NATIONAL', icon: 'medical_services' }
    ];
  }
}
