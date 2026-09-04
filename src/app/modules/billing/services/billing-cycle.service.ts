import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { BillingCycle } from '../models/billing-cycle.model';
import { mapBillingCycleFromApi } from './billing-cycle-http.mapper';

/** Customizable billing cycles via /billing-cycles API. */
@Injectable({
  providedIn: 'root'
})
export class BillingCycleService {
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

  getAllCycles(): Observable<BillingCycle[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/billing-cycles/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapBillingCycleFromApi(r))),
        catchError(err => {
          console.error('Failed to load billing cycles', err);
          return throwError(() => err);
        })
      );
  }

  createCycle(cycle: Partial<BillingCycle>): Observable<BillingCycle> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = {
      societyId: sid,
      ...this.toPlain(cycle as object)
    };
    delete body['id'];
    return this.http.post<Record<string, unknown>>('/billing-cycles', body).pipe(
      map(r => mapBillingCycleFromApi(r)),
      catchError(err => {
        console.error('Failed to create billing cycle', err);
        return throwError(() => err);
      })
    );
  }

  updateCycle(cycle: BillingCycle): Observable<BillingCycle> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = { societyId: sid, ...this.toPlain(cycle) };
    body['id'] = cycle.id;
    return this.http
      .put<Record<string, unknown>>(`/billing-cycles/${encodeURIComponent(cycle.id)}`, body)
      .pipe(
        map(r => mapBillingCycleFromApi(r)),
        catchError(err => {
          console.error('Failed to update billing cycle', err);
          return throwError(() => err);
        })
      );
  }

  toggleCycle(id: string): Observable<BillingCycle> {
    return this.http
      .post<Record<string, unknown>>(`/billing-cycles/${encodeURIComponent(id)}/toggle`, {})
      .pipe(
        map(r => mapBillingCycleFromApi(r)),
        catchError(err => {
          console.error('Failed to toggle billing cycle', err);
          return throwError(() => err);
        })
      );
  }

  deleteCycle(id: string): Observable<void> {
    return this.http.delete<void>(`/billing-cycles/${encodeURIComponent(id)}`).pipe(
      catchError(err => {
        console.error('Failed to delete billing cycle', err);
        return throwError(() => err);
      })
    );
  }
}
