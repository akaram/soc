import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { DefaultersReportResponse } from '../models/defaulters-report.model';
import { mapDefaultersReportFromApi } from './defaulters-report-http.mapper';

/** Defaulters report via /defaulters-reports API. */
@Injectable({
  providedIn: 'root'
})
export class DefaultersReportService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  getReport(asOfDate: string): Observable<DefaultersReportResponse> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const params = new HttpParams().set('asOfDate', asOfDate);
    return this.http
      .get<Record<string, unknown>>(`/defaulters-reports/society/${encodeURIComponent(sid)}`, { params })
      .pipe(
        map(r => mapDefaultersReportFromApi(r)),
        catchError(err => {
          console.error('Failed to load defaulters report', err);
          return throwError(() => err);
        })
      );
  }
}
