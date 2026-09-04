import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  FingerprintAttendanceRecord,
  FingerprintAttendanceFilter,
  FingerprintAttendanceStatistics,
  BiometricScannerDevice,
  CaptureFingerprintRequest,
  FingerprintAttendanceResponse
} from '../models/fingerprint-attendance.model';
import {
  apiToFingerprintRecord,
  apiToStatistics,
  apiToDevice,
  uiStatusToApi
} from './fingerprint-attendance-api.mapper';

@Injectable({ providedIn: 'root' })
export class FingerprintAttendanceService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getRecords(filter?: FingerprintAttendanceFilter): Observable<FingerprintAttendanceRecord[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (filter?.datePreset) params = params.set('datePreset', filter.datePreset);
    if (filter?.status) params = params.set('status', uiStatusToApi(filter.status));
    if (filter?.deviceId) params = params.set('deviceId', filter.deviceId);
    if (filter?.searchTerm) params = params.set('searchTerm', filter.searchTerm);

    return this.http
      .get<Record<string, unknown>[]>(
        `/fingerprint-attendance/society/${encodeURIComponent(societyId)}`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToFingerprintRecord(r))),
        catchError(err => {
          console.error('Failed to load fingerprint attendance records', err);
          return of([]);
        })
      );
  }

  getStatistics(datePreset?: string): Observable<FingerprintAttendanceStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ present: 0, absent: 0, late: 0, earlyLeave: 0, total: 0, activeDevices: 0 });
    }

    let params = new HttpParams();
    if (datePreset) params = params.set('datePreset', datePreset);

    return this.http
      .get<Record<string, unknown>>(
        `/fingerprint-attendance/society/${encodeURIComponent(societyId)}/statistics`,
        { params }
      )
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load fingerprint attendance statistics', err);
          return of({ present: 0, absent: 0, late: 0, earlyLeave: 0, total: 0, activeDevices: 0 });
        })
      );
  }

  /** Load fingerprint scanners from hardware registry + scan counts */
  getDevices(): Observable<BiometricScannerDevice[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    return this.http
      .get<Record<string, unknown>[]>(
        `/fingerprint-attendance/society/${encodeURIComponent(societyId)}/devices`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToDevice(r))),
        catchError(err => {
          console.error('Failed to load fingerprint devices', err);
          return of([]);
        })
      );
  }

  captureAttendance(request: CaptureFingerprintRequest): Observable<FingerprintAttendanceResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected', errors: ['societyId required'] });
    }

    const body = {
      societyId,
      fingerprintData: request.fingerprintData,
      deviceId: request.deviceId,
      deviceName: request.deviceName,
      location: request.location ?? 'Main Gate',
      createdBy: this.session.getCurrentUserId()
    };

    return this.http.post<Record<string, unknown>>('/fingerprint-attendance/capture', body).pipe(
      map(raw => ({
        success: true,
        message: 'Fingerprint attendance captured',
        record: apiToFingerprintRecord(raw)
      })),
      catchError(err => {
        const message = err.error?.message || 'Failed to capture fingerprint attendance';
        return of({ success: false, message, errors: [message] });
      })
    );
  }
}
