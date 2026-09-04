import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  Investigation,
  EmptyFlatLog,
  EmptyFlatStatus,
  CreateInvestigationRequest,
  UpdateInvestigationRequest,
  CreateEmptyFlatLogRequest,
  UpdateEmptyFlatLogRequest,
  InvestigationResponse,
  EmptyFlatLogResponse,
  InvestigationFilter,
  EmptyFlatLogFilter,
  InvestigationStatistics,
  EmptyFlatStatistics
} from '../models/investigation.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  apiToInvestigation,
  apiToEmptyFlatLog,
  apiToInvestigationStatistics,
  apiToEmptyFlatStatistics,
  applyInvestigationFilter,
  applyEmptyFlatLogFilter,
  createInvestigationToApiBody,
  updateInvestigationToApiBody,
  createEmptyFlatLogToApiBody,
  updateEmptyFlatLogToApiBody
} from './investigation-api.mapper';

@Injectable({
  providedIn: 'root'
})
export class InvestigationService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Create investigation via POST /investigations */
  createInvestigation(request: CreateInvestigationRequest): Observable<InvestigationResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'No society selected',
        errors: ['societyId required']
      });
    }

    const body = createInvestigationToApiBody(
      { ...request, reportedBy: request.reportedBy || this.session.getCurrentUserId() },
      societyId
    );

    return this.http.post<Record<string, unknown>>('/investigations', body).pipe(
      map(raw => ({
        success: true,
        message: 'Investigation created successfully',
        investigation: apiToInvestigation(raw)
      })),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to create investigation',
          errors: ['API error']
        })
      )
    );
  }

  /** Update investigation via PUT /investigations/{id} */
  updateInvestigation(id: string, request: UpdateInvestigationRequest): Observable<InvestigationResponse> {
    const body = updateInvestigationToApiBody(request, this.session.getCurrentUserId());

    return this.http.put<Record<string, unknown>>(`/investigations/${encodeURIComponent(id)}`, body).pipe(
      map(raw => ({
        success: true,
        message: 'Investigation updated successfully',
        investigation: apiToInvestigation(raw)
      })),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to update investigation',
          errors: ['API error']
        })
      )
    );
  }

  /** Load investigations for active society (GET /investigations/society/{id}) */
  getAllInvestigations(filter?: InvestigationFilter): Observable<Investigation[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    const searchTerm = filter?.searchTerm?.trim();
    const url = searchTerm
      ? `/investigations/society/${encodeURIComponent(societyId)}/search?searchTerm=${encodeURIComponent(searchTerm)}`
      : `/investigations/society/${encodeURIComponent(societyId)}`;

    return this.http.get<Record<string, unknown>[]>(url).pipe(
      map(rows => applyInvestigationFilter(rows.map(apiToInvestigation), filter)),
      catchError(err => {
        console.error('Failed to load investigations from API', err);
        return of([]);
      })
    );
  }

  /** Get single investigation via GET /investigations/{id} */
  getInvestigationById(id: string): Observable<Investigation | null> {
    return this.http.get<Record<string, unknown>>(`/investigations/${encodeURIComponent(id)}`).pipe(
      map(raw => apiToInvestigation(raw)),
      catchError(() => of(null))
    );
  }

  /** Statistics via GET /investigations/society/{id}/statistics */
  getInvestigationStatistics(): Observable<InvestigationStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of(this.emptyInvestigationStatistics());
    }

    return this.http
      .get<Record<string, unknown>>(`/investigations/society/${encodeURIComponent(societyId)}/statistics`)
      .pipe(
        map(raw => apiToInvestigationStatistics(raw)),
        catchError(err => {
          console.error('Failed to load investigation statistics', err);
          return of(this.emptyInvestigationStatistics());
        })
      );
  }

  /** Create empty flat log via POST /empty-flat-logs */
  createEmptyFlatLog(request: CreateEmptyFlatLogRequest): Observable<EmptyFlatLogResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'No society selected',
        errors: ['societyId required']
      });
    }

    const body = createEmptyFlatLogToApiBody(request, societyId, this.session.getCurrentUserId());

    return this.http.post<Record<string, unknown>>('/empty-flat-logs', body).pipe(
      map(raw => ({
        success: true,
        message: 'Empty flat log created successfully',
        log: apiToEmptyFlatLog(raw)
      })),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to create empty flat log',
          errors: ['API error']
        })
      )
    );
  }

  /** Update empty flat log via PUT /empty-flat-logs/{id} */
  updateEmptyFlatLog(id: string, request: UpdateEmptyFlatLogRequest): Observable<EmptyFlatLogResponse> {
    const body = updateEmptyFlatLogToApiBody(request, this.session.getCurrentUserId());

    return this.http.put<Record<string, unknown>>(`/empty-flat-logs/${encodeURIComponent(id)}`, body).pipe(
      map(raw => ({
        success: true,
        message: 'Empty flat log updated successfully',
        log: apiToEmptyFlatLog(raw)
      })),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to update empty flat log',
          errors: ['API error']
        })
      )
    );
  }

  /** Add check record via POST /empty-flat-logs/{id}/checks */
  addFlatCheck(
    flatLogId: string,
    checkedBy: string,
    status: EmptyFlatStatus,
    observations?: string,
    photos?: string[]
  ): Observable<EmptyFlatLogResponse> {
    return this.http
      .post<Record<string, unknown>>(`/empty-flat-logs/${encodeURIComponent(flatLogId)}/checks`, {
        checkedBy: checkedBy || this.session.getCurrentUserId(),
        status,
        observations,
        photos: photos ?? [],
        notes: observations
      })
      .pipe(
        map(raw => ({
          success: true,
          message: 'Check record added successfully',
          log: apiToEmptyFlatLog(raw)
        })),
        catchError(err =>
          of({
            success: false,
            message: err.error?.message || 'Failed to add check record',
            errors: ['API error']
          })
        )
      );
  }

  /** Load empty flat logs for active society */
  getAllEmptyFlatLogs(filter?: EmptyFlatLogFilter): Observable<EmptyFlatLog[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    const searchTerm = filter?.searchTerm?.trim();
    const url = searchTerm
      ? `/empty-flat-logs/society/${encodeURIComponent(societyId)}/search?searchTerm=${encodeURIComponent(searchTerm)}`
      : `/empty-flat-logs/society/${encodeURIComponent(societyId)}`;

    return this.http.get<Record<string, unknown>[]>(url).pipe(
      map(rows => applyEmptyFlatLogFilter(rows.map(apiToEmptyFlatLog), filter)),
      catchError(err => {
        console.error('Failed to load empty flat logs from API', err);
        return of([]);
      })
    );
  }

  /** Get single empty flat log */
  getEmptyFlatLogById(id: string): Observable<EmptyFlatLog | null> {
    return this.http.get<Record<string, unknown>>(`/empty-flat-logs/${encodeURIComponent(id)}`).pipe(
      map(raw => apiToEmptyFlatLog(raw)),
      catchError(() => of(null))
    );
  }

  /** Link investigation to flat log */
  linkInvestigationToFlat(flatLogId: string, investigationId: string): Observable<EmptyFlatLogResponse> {
    return this.http
      .post<Record<string, unknown>>(
        `/empty-flat-logs/${encodeURIComponent(flatLogId)}/link-investigation?investigationId=${encodeURIComponent(investigationId)}`,
        {}
      )
      .pipe(
        map(raw => ({
          success: true,
          message: 'Investigation linked successfully',
          log: apiToEmptyFlatLog(raw)
        })),
        catchError(err =>
          of({
            success: false,
            message: err.error?.message || 'Failed to link investigation',
            errors: ['API error']
          })
        )
      );
  }

  /** Empty flat statistics via GET /empty-flat-logs/society/{id}/statistics */
  getEmptyFlatStatistics(): Observable<EmptyFlatStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of(this.emptyFlatStatistics());
    }

    return this.http
      .get<Record<string, unknown>>(`/empty-flat-logs/society/${encodeURIComponent(societyId)}/statistics`)
      .pipe(
        map(raw => apiToEmptyFlatStatistics(raw)),
        catchError(err => {
          console.error('Failed to load empty flat statistics', err);
          return of(this.emptyFlatStatistics());
        })
      );
  }

  private emptyInvestigationStatistics(): InvestigationStatistics {
    return {
      totalInvestigations: 0,
      openInvestigations: 0,
      inProgressInvestigations: 0,
      resolvedInvestigations: 0,
      byType: {},
      byStatus: {},
      byPriority: {},
      recentInvestigations: 0,
      averageResolutionTime: 0
    };
  }

  private emptyFlatStatistics(): EmptyFlatStatistics {
    return {
      totalEmptyFlats: 0,
      vacantFlats: 0,
      underRenovation: 0,
      lockedFlats: 0,
      unknownStatus: 0,
      underInvestigation: 0,
      highRiskFlats: 0,
      byBuilding: {},
      byFlatType: {},
      averageVacancyDuration: 0
    };
  }
}
