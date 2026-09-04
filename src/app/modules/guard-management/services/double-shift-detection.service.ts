import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  DoubleShiftConflict,
  DoubleShiftStatistics,
  DoubleShiftFilter,
  DetectionRunResult,
  ConflictActionResponse
} from '../models/double-shift-detection.model';
import {
  apiToConflict,
  apiToStatistics,
  uiSeverityToApi,
  uiStatusToApi,
  uiConflictTypeToApi
} from './double-shift-detection-api.mapper';

@Injectable({ providedIn: 'root' })
export class DoubleShiftDetectionService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getConflicts(filter?: DoubleShiftFilter): Observable<DoubleShiftConflict[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) return of([]);

    let params = new HttpParams();
    if (filter?.severity) params = params.set('severity', uiSeverityToApi(filter.severity));
    if (filter?.status) params = params.set('status', uiStatusToApi(filter.status));
    if (filter?.conflictType) params = params.set('conflictType', uiConflictTypeToApi(filter.conflictType));
    if (filter?.searchTerm) params = params.set('searchTerm', filter.searchTerm);

    return this.http
      .get<Record<string, unknown>[]>(
        `/double-shift-detection/society/${encodeURIComponent(societyId)}`,
        { params }
      )
      .pipe(
        map(rows => (rows ?? []).map(r => apiToConflict(r))),
        catchError(err => {
          console.error('Failed to load double shift conflicts', err);
          return of([]);
        })
      );
  }

  getStatistics(): Observable<DoubleShiftStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        totalDetected: 0,
        pending: 0,
        resolved: 0,
        ignored: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0
      });
    }

    return this.http
      .get<Record<string, unknown>>(
        `/double-shift-detection/society/${encodeURIComponent(societyId)}/statistics`
      )
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load double shift statistics', err);
          return of({
            totalDetected: 0,
            pending: 0,
            resolved: 0,
            ignored: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            lowSeverity: 0
          });
        })
      );
  }

  /** Scan shift assignments and persist newly detected conflicts. */
  runDetection(): Observable<DetectionRunResult> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected' });
    }

    const body = {
      societyId,
      runBy: this.session.getCurrentUserId()
    };

    return this.http
      .post<Record<string, unknown>>('/double-shift-detection/detect', body)
      .pipe(
        map(raw => ({
          success: true,
          message: String(raw['message'] ?? 'Detection completed'),
          newConflicts: Number(raw['newConflicts'] ?? 0)
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to run detection';
          return of({ success: false, message });
        })
      );
  }

  resolveConflict(id: string, resolutionNote?: string): Observable<DoubleShiftConflict | ConflictActionResponse> {
    const body = {
      resolutionNote,
      resolvedBy: this.session.getCurrentUserId()
    };

    return this.http
      .put<Record<string, unknown>>(`/double-shift-detection/${id}/resolve`, body)
      .pipe(
        map(raw => apiToConflict(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to resolve conflict';
          return of({ success: false, message });
        })
      );
  }

  ignoreConflict(id: string): Observable<DoubleShiftConflict | ConflictActionResponse> {
    const body = { resolvedBy: this.session.getCurrentUserId() };

    return this.http
      .put<Record<string, unknown>>(`/double-shift-detection/${id}/ignore`, body)
      .pipe(
        map(raw => apiToConflict(raw)),
        catchError(err => {
          const message = err.error?.message || 'Failed to ignore conflict';
          return of({ success: false, message });
        })
      );
  }

  bulkResolve(ids: string[], resolutionNote?: string): Observable<ConflictActionResponse> {
    const body = {
      ids,
      resolutionNote,
      resolvedBy: this.session.getCurrentUserId()
    };

    return this.http
      .post<Record<string, unknown>>('/double-shift-detection/bulk-resolve', body)
      .pipe(
        map(raw => ({
          success: true,
          message: String(raw['message'] ?? 'Conflicts resolved')
        })),
        catchError(err => {
          const message = err.error?.message || 'Failed to bulk resolve';
          return of({ success: false, message });
        })
      );
  }
}
