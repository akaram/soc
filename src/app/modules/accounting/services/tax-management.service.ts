import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { GSTConfiguration, TaxManagementResponse, TDSConfiguration } from '../models/tax-management.model';
import { mapTaxManagementFromApi } from './tax-management-http.mapper';

/** Tax management dashboard via /tax-management API. */
@Injectable({
  providedIn: 'root'
})
export class TaxManagementService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  getDashboard(financialYear?: string): Observable<TaxManagementResponse> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    let params = new HttpParams();
    if (financialYear) {
      params = params.set('financialYear', financialYear);
    }
    return this.http
      .get<Record<string, unknown>>(`/tax-management/society/${encodeURIComponent(sid)}`, { params })
      .pipe(
        map(r => mapTaxManagementFromApi(r)),
        catchError(err => {
          console.error('Failed to load tax management dashboard', err);
          return throwError(() => err);
        })
      );
  }

  saveGstConfig(config: GSTConfiguration): Observable<Record<string, unknown>> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .put<Record<string, unknown>>('/tax-management/gst-config', { societyId: sid, ...config })
      .pipe(catchError(err => throwError(() => err)));
  }

  saveTdsConfig(config: TDSConfiguration): Observable<Record<string, unknown>> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .put<Record<string, unknown>>('/tax-management/tds-config', { societyId: sid, ...config })
      .pipe(catchError(err => throwError(() => err)));
  }
}
