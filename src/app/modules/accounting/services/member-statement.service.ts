import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { MemberStatementFlat, MemberStatementResponse } from '../models/member-statement.model';
import {
  mapMemberStatementFlatFromApi,
  mapMemberStatementFromApi
} from './member-statement-http.mapper';

/** Per-flat member statements via /member-statements API. */
@Injectable({
  providedIn: 'root'
})
export class MemberStatementService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  getFlats(): Observable<MemberStatementFlat[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/member-statements/society/${encodeURIComponent(sid)}/flats`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapMemberStatementFlatFromApi(r))),
        catchError(err => {
          console.error('Failed to load flats for member statement', err);
          return throwError(() => err);
        })
      );
  }

  getStatement(flatId: string, periodStart: string, periodEnd: string): Observable<MemberStatementResponse> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const params = new HttpParams()
      .set('periodStart', periodStart)
      .set('periodEnd', periodEnd);
    return this.http
      .get<Record<string, unknown>>(
        `/member-statements/society/${encodeURIComponent(sid)}/flat/${encodeURIComponent(flatId)}`,
        { params }
      )
      .pipe(
        map(r => mapMemberStatementFromApi(r)),
        catchError(err => {
          console.error('Failed to load member statement', err);
          return throwError(() => err);
        })
      );
  }
}
