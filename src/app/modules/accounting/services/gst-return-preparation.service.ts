import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  GstConfiguration,
  GstReturnData,
  GstValidationResult,
  ReconciliationStats
} from '../models/gst-return-preparation.model';
import {
  mapGstConfigFromApi,
  mapGstReturnDataFromApi,
  mapGstValidationFromApi
} from './gst-return-http.mapper';

/** GST return preparation via /gst-returns API. */
@Injectable({
  providedIn: 'root'
})
export class GstReturnPreparationService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  private toPlain(obj: object): Record<string, unknown> {
    return JSON.parse(JSON.stringify(obj, (_k, v) => (v instanceof Date ? v.toISOString() : v)));
  }

  getConfig(): Observable<GstConfiguration> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>>(`/gst-returns/config/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(r => mapGstConfigFromApi(r)),
        catchError(err => {
          console.error('Failed to load GST config', err);
          return throwError(() => err);
        })
      );
  }

  saveConfig(config: GstConfiguration): Observable<GstConfiguration> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = { societyId: sid, ...this.toPlain(config) };
    return this.http.put<Record<string, unknown>>('/gst-returns/config', body).pipe(
      map(r => mapGstConfigFromApi(r)),
      catchError(err => {
        console.error('Failed to save GST config', err);
        return throwError(() => err);
      })
    );
  }

  getReturnData(month: string, year: number): Observable<GstReturnData> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const params = new HttpParams().set('month', month).set('year', String(year));
    return this.http
      .get<Record<string, unknown>>(`/gst-returns/data/society/${encodeURIComponent(sid)}`, { params })
      .pipe(
        map(r => mapGstReturnDataFromApi(r)),
        catchError(err => {
          console.error('Failed to load GST return data', err);
          return throwError(() => err);
        })
      );
  }

  prepareReturn(month: string, year: number): Observable<GstReturnData> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .post<Record<string, unknown>>('/gst-returns/prepare', { societyId: sid, month, year })
      .pipe(
        map(r => mapGstReturnDataFromApi(r)),
        catchError(err => {
          console.error('Failed to prepare GST return', err);
          return throwError(() => err);
        })
      );
  }

  validateReturn(month: string, year: number): Observable<GstValidationResult> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .post<Record<string, unknown>>('/gst-returns/validate', { societyId: sid, month, year })
      .pipe(
        map(r => mapGstValidationFromApi(r)),
        catchError(err => {
          console.error('Failed to validate GST return', err);
          return throwError(() => err);
        })
      );
  }

  reconcile(month: string, year: number): Observable<ReconciliationStats> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .post<Record<string, unknown>>('/gst-returns/reconcile', { societyId: sid, month, year })
      .pipe(
        map(r => ({
          matched: Number(r['matched'] ?? 0),
          mismatched: Number(r['mismatched'] ?? 0),
          pending: Number(r['pending'] ?? 0)
        })),
        catchError(err => {
          console.error('Failed to reconcile GST return', err);
          return throwError(() => err);
        })
      );
  }
}
