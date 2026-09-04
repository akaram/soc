import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  ProxyAttendanceAlert,
  ProxyAttendanceStatistics,
  ProxyAttendanceFilter,
  DetectionRunResult,
  AlertActionResponse
} from '../models/proxy-attendance-detection.model';
import {
  apiToAlert,
  apiToStatistics,
  uiStatusToApi,
  uiMethodToApi
} from './proxy-attendance-detection-api.mapper';

@Injectable({ providedIn: 'root' })
export class ProxyAttendanceDetectionService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getAlerts(filter?: ProxyAttendanceFilter): Observable<ProxyAttendanceAlert[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (filter?.status) params = params.set('status', uiStatusToApi(filter.status));
    if (filter?.attendanceMethod) params = params.set('attendanceMethod', uiMethodToApi(filter.attendanceMethod));
    if (filter?.riskLevel) params = params.set('riskLevel', filter.riskLevel);
    if (filter?.searchTerm) params = params.set('searchTerm', filter.searchTerm);

    return this.http
      .get<Record<string, unknown>[]>(
        `/proxy-attendance-detection/society/${encodeURIComponent(societyId)}`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToAlert(r))),
        catchError(err => {
          console.error('Failed to load proxy attendance alerts', err);
          return of([]);
        })
      );
  }

  getStatistics(): Observable<ProxyAttendanceStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        totalAlerts: 0,
        pending: 0,
        verified: 0,
        fraud: 0,
        falsePositive: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0
      });
    }

    return this.http
      .get<Record<string, unknown>>(
        `/proxy-attendance-detection/society/${encodeURIComponent(societyId)}/statistics`
      )
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load proxy attendance statistics', err);
          return of({
            totalAlerts: 0,
            pending: 0,
            verified: 0,
            fraud: 0,
            falsePositive: 0,
            highRisk: 0,
            mediumRisk: 0,
            lowRisk: 0
          });
        })
      );
  }

  runDetection(): Observable<DetectionRunResult> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected' });
    }

    const body = { societyId, runBy: this.session.getCurrentUserId() };

    return this.http
      .post<Record<string, unknown>>('/proxy-attendance-detection/detect', body)
      .pipe(
        map(raw => ({
          success: true,
          message: String(raw['message'] ?? 'Detection completed'),
          newAlerts: Number(raw['newAlerts'] ?? 0)
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to run detection';
          return of({ success: false, message });
        })
      );
  }

  verifyAlert(id: string, notes?: string): Observable<ProxyAttendanceAlert | AlertActionResponse> {
    const body = { verifiedBy: this.session.getCurrentUserId(), notes };
    return this.http
      .put<Record<string, unknown>>(`/proxy-attendance-detection/${id}/verify`, body)
      .pipe(
        map(raw => apiToAlert(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to verify alert';
          return of({ success: false, message });
        })
      );
  }

  markAsFraud(id: string): Observable<ProxyAttendanceAlert | AlertActionResponse> {
    const body = { verifiedBy: this.session.getCurrentUserId() };
    return this.http
      .put<Record<string, unknown>>(`/proxy-attendance-detection/${id}/fraud`, body)
      .pipe(
        map(raw => apiToAlert(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to mark as fraud';
          return of({ success: false, message });
        })
      );
  }

  markAsFalsePositive(id: string): Observable<ProxyAttendanceAlert | AlertActionResponse> {
    const body = { verifiedBy: this.session.getCurrentUserId() };
    return this.http
      .put<Record<string, unknown>>(`/proxy-attendance-detection/${id}/false-positive`, body)
      .pipe(
        map(raw => apiToAlert(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to mark as false positive';
          return of({ success: false, message });
        })
      );
  }

  bulkVerify(ids: string[], notes?: string): Observable<AlertActionResponse> {
    const body = {
      ids,
      verifiedBy: this.session.getCurrentUserId(),
      notes
    };

    return this.http
      .post<Record<string, unknown>>('/proxy-attendance-detection/bulk-verify', body)
      .pipe(
        map(raw => ({
          success: true,
          message: String(raw['message'] ?? 'Alerts verified')
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to bulk verify';
          return of({ success: false, message });
        })
      );
  }
}
