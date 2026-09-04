import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  OvertimeRecord,
  OvertimeStatistics,
  StaffOvertimeSummary,
  OvertimeStaffMember,
  CreateOvertimeRecord,
  OvertimeRecordFilter,
  OvertimeActionResponse
} from '../models/overtime-tracking.model';
import {
  apiToOvertimeRecord,
  apiToStatistics,
  apiToStaffSummary,
  apiToStaffMember,
  uiOvertimeTypeToApi,
  uiStatusToApi
} from './overtime-tracking-api.mapper';

@Injectable({ providedIn: 'root' })
export class OvertimeTrackingService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getRecords(filter?: OvertimeRecordFilter): Observable<OvertimeRecord[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (filter?.status) params = params.set('status', uiStatusToApi(filter.status));
    if (filter?.overtimeType) params = params.set('overtimeType', uiOvertimeTypeToApi(filter.overtimeType));
    if (filter?.searchTerm) params = params.set('searchTerm', filter.searchTerm);
    if (filter?.date) params = params.set('date', filter.date);

    return this.http
      .get<Record<string, unknown>[]>(
        `/overtime-tracking/society/${encodeURIComponent(societyId)}/records`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToOvertimeRecord(r))),
        catchError(err => {
          console.error('Failed to load overtime records', err);
          return of([]);
        })
      );
  }

  getStatistics(): Observable<OvertimeStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        totalHours: 0,
        thisMonth: 0,
        thisYear: 0,
        pending: 0,
        approved: 0,
        totalAmount: 0,
        averageHours: 0
      });
    }

    return this.http
      .get<Record<string, unknown>>(
        `/overtime-tracking/society/${encodeURIComponent(societyId)}/statistics`
      )
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load overtime statistics', err);
          return of({
            totalHours: 0,
            thisMonth: 0,
            thisYear: 0,
            pending: 0,
            approved: 0,
            totalAmount: 0,
            averageHours: 0
          });
        })
      );
  }

  getSummaries(searchTerm?: string): Observable<StaffOvertimeSummary[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (searchTerm) params = params.set('searchTerm', searchTerm);

    return this.http
      .get<Record<string, unknown>[]>(
        `/overtime-tracking/society/${encodeURIComponent(societyId)}/summaries`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToStaffSummary(r))),
        catchError(err => {
          console.error('Failed to load overtime summaries', err);
          return of([]);
        })
      );
  }

  getStaffMembers(): Observable<OvertimeStaffMember[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    return this.http
      .get<Record<string, unknown>[]>(
        `/overtime-tracking/society/${encodeURIComponent(societyId)}/staff`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToStaffMember(r))),
        catchError(err => {
          console.error('Failed to load staff members', err);
          return of([]);
        })
      );
  }

  createRecord(payload: CreateOvertimeRecord): Observable<OvertimeRecord | OvertimeActionResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected' });
    }

    const body = {
      societyId,
      staffId: payload.staffId,
      overtimeDate: payload.overtimeDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      overtimeType: uiOvertimeTypeToApi(payload.overtimeType),
      rate: payload.rate,
      reason: payload.reason,
      projectCode: payload.projectCode,
      location: payload.location,
      createdBy: this.session.getCurrentUserId()
    };

    return this.http
      .post<Record<string, unknown>>('/overtime-tracking/records', body)
      .pipe(
        map(raw => apiToOvertimeRecord(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to create overtime record';
          return of({ success: false, message });
        })
      );
  }

  approveRecord(id: string): Observable<OvertimeRecord | OvertimeActionResponse> {
    return this.http
      .put<Record<string, unknown>>(`/overtime-tracking/records/${encodeURIComponent(id)}/approve`, {
        approvedBy: this.session.getCurrentUserId()
      })
      .pipe(
        map(raw => apiToOvertimeRecord(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to approve overtime record';
          return of({ success: false, message });
        })
      );
  }

  rejectRecord(id: string, rejectionReason: string): Observable<OvertimeRecord | OvertimeActionResponse> {
    return this.http
      .put<Record<string, unknown>>(`/overtime-tracking/records/${encodeURIComponent(id)}/reject`, {
        approvedBy: this.session.getCurrentUserId(),
        rejectionReason
      })
      .pipe(
        map(raw => apiToOvertimeRecord(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to reject overtime record';
          return of({ success: false, message });
        })
      );
  }

  bulkApprove(ids: string[]): Observable<OvertimeActionResponse> {
    return this.http
      .post<Record<string, unknown>>('/overtime-tracking/records/bulk-approve', {
        ids,
        approvedBy: this.session.getCurrentUserId()
      })
      .pipe(
        map(raw => ({
          success: true,
          message: String(raw['message'] ?? 'Overtime records approved')
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to bulk approve';
          return of({ success: false, message });
        })
      );
  }
}
