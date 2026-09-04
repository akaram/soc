import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  BlacklistEntry,
  CreateBlacklistRequest,
  UpdateBlacklistRequest,
  BlacklistResponse,
  BlacklistCheckRequest,
  BlacklistCheckResult,
  BlacklistFilter,
  BlacklistStatistics
} from '../models/blacklist.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  apiToBlacklistEntry,
  apiToCheckResult,
  apiToStatistics,
  applyBlacklistFilter,
  createRequestToApiBody,
  updateRequestToApiBody
} from './blacklist-api.mapper';

@Injectable({
  providedIn: 'root'
})
export class BlacklistService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Create entry via POST /blacklist */
  createEntry(request: CreateBlacklistRequest): Observable<BlacklistResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'No society selected',
        errors: ['societyId required']
      });
    }

    const body = createRequestToApiBody(
      {
        ...request,
        blacklistedBy: request.blacklistedBy || this.session.getCurrentUserId()
      },
      societyId
    );

    return this.http
      .post<Record<string, unknown>>('/blacklist', body)
      .pipe(
        map(raw => ({
          success: true,
          message: 'Entry added to blacklist successfully',
          entry: apiToBlacklistEntry(raw)
        })),
        catchError(err => {
          const message =
            err.error?.message ||
            (err.status === 409 ? 'Entry already exists in blacklist' : 'Failed to create blacklist entry');
          return of({
            success: false,
            message,
            errors: [message]
          });
        })
      );
  }

  /** Update entry via PUT /blacklist/{id} */
  updateEntry(id: string, request: UpdateBlacklistRequest): Observable<BlacklistResponse> {
    const body = updateRequestToApiBody(request, this.session.getCurrentUserId());

    return this.http
      .put<Record<string, unknown>>(`/blacklist/${encodeURIComponent(id)}`, body)
      .pipe(
        map(raw => ({
          success: true,
          message: 'Entry updated successfully',
          entry: apiToBlacklistEntry(raw)
        })),
        catchError(err =>
          of({
            success: false,
            message: err.error?.message || 'Failed to update blacklist entry',
            errors: ['API error']
          })
        )
      );
  }

  /** Load all entries for the active society (GET /blacklist/society/{id}) */
  getAllEntries(filter?: BlacklistFilter): Observable<BlacklistEntry[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    const searchTerm = filter?.searchTerm?.trim();
    const url = searchTerm
      ? `/blacklist/society/${encodeURIComponent(societyId)}/search?searchTerm=${encodeURIComponent(searchTerm)}`
      : `/blacklist/society/${encodeURIComponent(societyId)}`;

    return this.http.get<Record<string, unknown>[]>(url).pipe(
      map(rows => applyBlacklistFilter(rows.map(apiToBlacklistEntry), filter)),
      catchError(err => {
        console.error('Failed to load blacklist entries from API', err);
        return of([]);
      })
    );
  }

  /** Get single entry via GET /blacklist/{id} */
  getEntryById(id: string): Observable<BlacklistEntry | null> {
    return this.http
      .get<Record<string, unknown>>(`/blacklist/${encodeURIComponent(id)}`)
      .pipe(
        map(raw => apiToBlacklistEntry(raw)),
        catchError(() => of(null))
      );
  }

  /** Check identifier via POST /blacklist/check */
  checkBlacklist(request: BlacklistCheckRequest): Observable<BlacklistCheckResult> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ isBlacklisted: false });
    }

    return this.http
      .post<Record<string, unknown>>('/blacklist/check', {
        societyId,
        identifier: request.identifier,
        type: request.type,
        gateId: request.gateId,
        checkTime: request.checkTime ? request.checkTime.toISOString() : undefined
      })
      .pipe(
        map(raw => apiToCheckResult(raw)),
        catchError(err => {
          console.error('Blacklist check failed', err);
          return of({ isBlacklisted: false });
        })
      );
  }

  /** Soft-remove entry via POST /blacklist/{id}/remove */
  removeEntry(id: string, removedBy?: string): Observable<BlacklistResponse> {
    const by = removedBy || this.session.getCurrentUserId();
    return this.http
      .post<Record<string, unknown>>(
        `/blacklist/${encodeURIComponent(id)}/remove?removedBy=${encodeURIComponent(by)}`,
        {}
      )
      .pipe(
        map(raw => ({
          success: true,
          message: 'Entry removed from blacklist',
          entry: apiToBlacklistEntry(raw)
        })),
        catchError(err =>
          of({
            success: false,
            message: err.error?.message || 'Failed to remove entry',
            errors: ['API error']
          })
        )
      );
  }

  /** Suspend entry via POST /blacklist/{id}/suspend */
  suspendEntry(id: string): Observable<BlacklistResponse> {
    const updatedBy = this.session.getCurrentUserId();
    return this.http
      .post<Record<string, unknown>>(
        `/blacklist/${encodeURIComponent(id)}/suspend?updatedBy=${encodeURIComponent(updatedBy)}`,
        {}
      )
      .pipe(
        map(raw => ({
          success: true,
          message: 'Entry suspended',
          entry: apiToBlacklistEntry(raw)
        })),
        catchError(err =>
          of({
            success: false,
            message: err.error?.message || 'Failed to suspend entry',
            errors: ['API error']
          })
        )
      );
  }

  /** Reactivate entry via POST /blacklist/{id}/reactivate */
  reactivateEntry(id: string): Observable<BlacklistResponse> {
    const updatedBy = this.session.getCurrentUserId();
    return this.http
      .post<Record<string, unknown>>(
        `/blacklist/${encodeURIComponent(id)}/reactivate?updatedBy=${encodeURIComponent(updatedBy)}`,
        {}
      )
      .pipe(
        map(raw => {
          if (raw['success'] === false) {
            return {
              success: false,
              message: String(raw['message'] ?? 'Failed to reactivate entry'),
              errors: [String(raw['message'] ?? 'Failed to reactivate entry')]
            };
          }
          return {
            success: true,
            message: 'Entry reactivated',
            entry: apiToBlacklistEntry(raw)
          };
        }),
        catchError(err =>
          of({
            success: false,
            message: err.error?.message || 'Failed to reactivate entry',
            errors: ['API error']
          })
        )
      );
  }

  /** Statistics via GET /blacklist/society/{id}/statistics */
  getStatistics(): Observable<BlacklistStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of(this.emptyStatistics());
    }

    return this.http
      .get<Record<string, unknown>>(`/blacklist/society/${encodeURIComponent(societyId)}/statistics`)
      .pipe(
        map(raw => apiToStatistics(raw)),
        catchError(err => {
          console.error('Failed to load blacklist statistics', err);
          return of(this.emptyStatistics());
        })
      );
  }

  private emptyStatistics(): BlacklistStatistics {
    return {
      totalEntries: 0,
      activeEntries: 0,
      suspendedEntries: 0,
      expiredEntries: 0,
      byType: {},
      byReason: {},
      bySeverity: {},
      recentAdditions: 0,
      blockedAttempts: 0,
      blockedAttemptsToday: 0
    };
  }
}
