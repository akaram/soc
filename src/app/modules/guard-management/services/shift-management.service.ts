import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  ShiftDefinition,
  ShiftSchedule,
  ShiftStaffMember,
  ShiftManagementStatistics,
  CreateShiftRequest,
  CreateAssignmentRequest,
  ShiftManagementFilter,
  ShiftManagementResponse,
  ShiftAssignmentStatus
} from '../models/shift-management.model';
import {
  apiToShiftDefinition,
  apiToShiftSchedule,
  apiToStaffMember,
  apiToStatistics,
  uiStatusToApi
} from './shift-management-api.mapper';

@Injectable({ providedIn: 'root' })
export class ShiftManagementService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getShifts(): Observable<ShiftDefinition[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    return this.http
      .get<Record<string, unknown>[]>(
        `/shift-management/society/${encodeURIComponent(societyId)}/shifts`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToShiftDefinition(r))),
        catchError(err => {
          console.error('Failed to load shift definitions', err);
          return of([]);
        })
      );
  }

  getAssignments(filter?: ShiftManagementFilter): Observable<ShiftSchedule[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (filter?.from) params = params.set('from', filter.from);
    if (filter?.to) params = params.set('to', filter.to);
    if (filter?.status) params = params.set('status', uiStatusToApi(filter.status));
    if (filter?.shiftId) params = params.set('shiftId', filter.shiftId);
    if (filter?.searchTerm) params = params.set('searchTerm', filter.searchTerm);

    return this.http
      .get<Record<string, unknown>[]>(
        `/shift-management/society/${encodeURIComponent(societyId)}/assignments`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToShiftSchedule(r))),
        catchError(err => {
          console.error('Failed to load shift assignments', err);
          return of([]);
        })
      );
  }

  getStatistics(from?: string, to?: string): Observable<ShiftManagementStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ scheduled: 0, confirmed: 0, pending: 0, completed: 0, activeShifts: 0 });
    }

    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http
      .get<Record<string, unknown>>(
        `/shift-management/society/${encodeURIComponent(societyId)}/statistics`,
        { params }
      )
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load shift statistics', err);
          return of({ scheduled: 0, confirmed: 0, pending: 0, completed: 0, activeShifts: 0 });
        })
      );
  }

  getStaffMembers(): Observable<ShiftStaffMember[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    return this.http
      .get<Record<string, unknown>[]>(
        `/shift-management/society/${encodeURIComponent(societyId)}/staff`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToStaffMember(r))),
        catchError(err => {
          console.error('Failed to load staff members', err);
          return of([]);
        })
      );
  }

  createShift(request: CreateShiftRequest): Observable<ShiftDefinition | ShiftManagementResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected' });
    }

    const body = {
      societyId,
      name: request.name,
      startTime: request.startTime,
      endTime: request.endTime,
      duration: request.duration,
      color: request.color ?? '#9b59b6',
      description: request.description,
      createdBy: this.session.getCurrentUserId()
    };

    return this.http.post<Record<string, unknown>>('/shift-management/shifts', body).pipe(
      map(raw => apiToShiftDefinition(raw)),
      catchError(err => {
        const message = err.error?.message || 'Failed to create shift';
        return of({ success: false, message });
      })
    );
  }

  deleteShift(shiftId: string): Observable<ShiftManagementResponse> {
    return this.http.delete<Record<string, unknown>>(`/shift-management/shifts/${shiftId}`).pipe(
      map(() => ({ success: true, message: 'Shift deactivated' })),
      catchError(err => {
        const message = err.error?.message || 'Failed to delete shift';
        return of({ success: false, message });
      })
    );
  }

  createAssignment(request: CreateAssignmentRequest): Observable<ShiftSchedule | ShiftManagementResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected' });
    }

    const body = {
      societyId,
      shiftId: request.shiftId,
      staffId: request.staffId,
      assignmentDate: request.assignmentDate,
      status: request.status ? uiStatusToApi(request.status) : 'SCHEDULED',
      location: request.location,
      notes: request.notes,
      createdBy: this.session.getCurrentUserId()
    };

    return this.http.post<Record<string, unknown>>('/shift-management/assignments', body).pipe(
      map(raw => apiToShiftSchedule(raw)),
      catchError(err => {
        const message = err.error?.message || 'Failed to assign shift';
        return of({ success: false, message });
      })
    );
  }

  updateAssignmentStatus(
    assignmentId: string,
    status: ShiftAssignmentStatus
  ): Observable<ShiftSchedule | ShiftManagementResponse> {
    const body = {
      status: uiStatusToApi(status),
      updatedBy: this.session.getCurrentUserId()
    };

    return this.http
      .put<Record<string, unknown>>(`/shift-management/assignments/${assignmentId}`, body)
      .pipe(
        map(raw => apiToShiftSchedule(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to update assignment';
          return of({ success: false, message });
        })
      );
  }

  deleteAssignment(assignmentId: string): Observable<ShiftManagementResponse> {
    return this.http
      .delete<Record<string, unknown>>(`/shift-management/assignments/${assignmentId}`)
      .pipe(
        map(() => ({ success: true, message: 'Assignment deleted' })),
        catchError(err => {
          const message = err.error?.message || 'Failed to delete assignment';
          return of({ success: false, message });
        })
      );
  }
}
