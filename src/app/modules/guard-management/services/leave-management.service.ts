import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  LeaveRequest,
  LeaveBalance,
  LeaveStatistics,
  LeaveStaffMember,
  CreateLeaveRequest,
  LeaveRequestFilter,
  LeaveActionResponse,
  LeaveStatus
} from '../models/leave-management.model';
import {
  apiToLeaveRequest,
  apiToLeaveBalance,
  apiToStatistics,
  apiToStaffMember,
  uiLeaveTypeToApi,
  uiStatusToApi
} from './leave-management-api.mapper';

@Injectable({ providedIn: 'root' })
export class LeaveManagementService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getRequests(filter?: LeaveRequestFilter): Observable<LeaveRequest[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (filter?.status) params = params.set('status', uiStatusToApi(filter.status));
    if (filter?.leaveType) params = params.set('leaveType', uiLeaveTypeToApi(filter.leaveType));
    if (filter?.searchTerm) params = params.set('searchTerm', filter.searchTerm);
    if (filter?.date) params = params.set('date', filter.date);

    return this.http
      .get<Record<string, unknown>[]>(
        `/leave-management/society/${encodeURIComponent(societyId)}/requests`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToLeaveRequest(r))),
        catchError(err => {
          console.error('Failed to load leave requests', err);
          return of([]);
        })
      );
  }

  getBalances(searchTerm?: string): Observable<LeaveBalance[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (searchTerm) params = params.set('searchTerm', searchTerm);

    return this.http
      .get<Record<string, unknown>[]>(
        `/leave-management/society/${encodeURIComponent(societyId)}/balances`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToLeaveBalance(r))),
        catchError(err => {
          console.error('Failed to load leave balances', err);
          return of([]);
        })
      );
  }

  getCalendarLeaves(from: string, to: string): Observable<LeaveRequest[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    const params = new HttpParams().set('from', from).set('to', to);

    return this.http
      .get<Record<string, unknown>[]>(
        `/leave-management/society/${encodeURIComponent(societyId)}/calendar`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToLeaveRequest(r))),
        catchError(err => {
          console.error('Failed to load calendar leaves', err);
          return of([]);
        })
      );
  }

  getStatistics(): Observable<LeaveStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        totalRequests: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        thisMonth: 0,
        thisYear: 0
      });
    }

    return this.http
      .get<Record<string, unknown>>(
        `/leave-management/society/${encodeURIComponent(societyId)}/statistics`
      )
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load leave statistics', err);
          return of({
            totalRequests: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            thisMonth: 0,
            thisYear: 0
          });
        })
      );
  }

  getStaffMembers(): Observable<LeaveStaffMember[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    return this.http
      .get<Record<string, unknown>[]>(
        `/leave-management/society/${encodeURIComponent(societyId)}/staff`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToStaffMember(r))),
        catchError(err => {
          console.error('Failed to load staff members', err);
          return of([]);
        })
      );
  }

  createRequest(request: CreateLeaveRequest): Observable<LeaveRequest | LeaveActionResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected' });
    }

    const body = {
      societyId,
      staffId: request.staffId,
      leaveType: uiLeaveTypeToApi(request.leaveType),
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
      createdBy: this.session.getCurrentUserId()
    };

    return this.http.post<Record<string, unknown>>('/leave-management/requests', body).pipe(
      map(raw => apiToLeaveRequest(raw)),
      catchError(err => {
        const message = err.error?.message || 'Failed to create leave request';
        return of({ success: false, message });
      })
    );
  }

  approveRequest(id: string): Observable<LeaveRequest | LeaveActionResponse> {
    const body = { approvedBy: this.session.getCurrentUserId() };
    return this.http
      .put<Record<string, unknown>>(`/leave-management/requests/${id}/approve`, body)
      .pipe(
        map(raw => apiToLeaveRequest(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to approve leave request';
          return of({ success: false, message });
        })
      );
  }

  rejectRequest(id: string, rejectionReason: string): Observable<LeaveRequest | LeaveActionResponse> {
    const body = {
      approvedBy: this.session.getCurrentUserId(),
      rejectionReason
    };
    return this.http
      .put<Record<string, unknown>>(`/leave-management/requests/${id}/reject`, body)
      .pipe(
        map(raw => apiToLeaveRequest(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to reject leave request';
          return of({ success: false, message });
        })
      );
  }

  bulkApprove(ids: string[]): Observable<LeaveActionResponse> {
    const body = {
      ids,
      approvedBy: this.session.getCurrentUserId()
    };
    return this.http
      .post<Record<string, unknown>>('/leave-management/requests/bulk-approve', body)
      .pipe(
        map(raw => ({
          success: true,
          message: String(raw['message'] ?? 'Leave requests approved')
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to bulk approve';
          return of({ success: false, message });
        })
      );
  }
}
