import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  AttendanceRecord,
  AttendanceFilter,
  AttendanceStatistics,
  CaptureAttendanceRequest,
  AttendanceResponse
} from '../models/facial-attendance.model';
import {
  apiToAttendanceRecord,
  apiToStatistics,
  uiStatusToApi
} from './facial-attendance-api.mapper';

@Injectable({ providedIn: 'root' })
export class FacialAttendanceService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Load attendance records for active society */
  getRecords(filter?: AttendanceFilter): Observable<AttendanceRecord[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    let params = new HttpParams();
    if (filter?.datePreset) {
      params = params.set('datePreset', filter.datePreset);
    }
    if (filter?.status) {
      params = params.set('status', uiStatusToApi(filter.status));
    }
    if (filter?.searchTerm) {
      params = params.set('searchTerm', filter.searchTerm);
    }

    return this.http
      .get<Record<string, unknown>[]>(
        `/facial-attendance/society/${encodeURIComponent(societyId)}`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToAttendanceRecord(r))),
        catchError(err => {
          console.error('Failed to load facial attendance records', err);
          return of([]);
        })
      );
  }

  /** Load dashboard statistics for active society */
  getStatistics(datePreset?: string): Observable<AttendanceStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ present: 0, absent: 0, late: 0, earlyLeave: 0, total: 0 });
    }

    let params = new HttpParams();
    if (datePreset) {
      params = params.set('datePreset', datePreset);
    }

    return this.http
      .get<Record<string, unknown>>(
        `/facial-attendance/society/${encodeURIComponent(societyId)}/statistics`,
        { params }
      )
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load facial attendance statistics', err);
          return of({ present: 0, absent: 0, late: 0, earlyLeave: 0, total: 0 });
        })
      );
  }

  /** Capture selfie attendance via POST /facial-attendance/capture */
  captureAttendance(request: CaptureAttendanceRequest): Observable<AttendanceResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'No society selected',
        errors: ['societyId required']
      });
    }

    const body = {
      societyId,
      faceImage: request.faceImage,
      location: request.location ?? 'Main Gate',
      createdBy: this.session.getCurrentUserId()
    };

    return this.http
      .post<Record<string, unknown>>('/facial-attendance/capture', body)
      .pipe(
        map(raw => ({
          success: true,
          message: 'Attendance captured successfully',
          record: apiToAttendanceRecord(raw)
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to capture attendance';
          return of({ success: false, message, errors: [message] });
        })
      );
  }

  /** Record check-out for an attendance entry */
  checkout(recordId: string): Observable<AttendanceResponse> {
    const updatedBy = this.session.getCurrentUserId();
    let params = new HttpParams();
    if (updatedBy) {
      params = params.set('updatedBy', updatedBy);
    }

    return this.http
      .post<Record<string, unknown>>(
        `/facial-attendance/${encodeURIComponent(recordId)}/checkout`,
        null,
        { params }
      )
      .pipe(
        map(raw => ({
          success: true,
          message: 'Check-out recorded',
          record: apiToAttendanceRecord(raw)
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to record check-out';
          return of({ success: false, message, errors: [message] });
        })
      );
  }
}
