import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { PenaltyApplication, PenaltyRule } from '../models/late-payment-penalty.model';
import {
  mapPenaltyApplicationFromApi,
  mapPenaltyRuleFromApi
} from './late-payment-penalty-http.mapper';

/** Late payment penalties via /late-payment-penalties API. */
@Injectable({
  providedIn: 'root'
})
export class LatePaymentPenaltyService {
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

  getRules(): Observable<PenaltyRule[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(
        `/late-payment-penalties/rules/society/${encodeURIComponent(sid)}`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => mapPenaltyRuleFromApi(r))),
        catchError(err => {
          console.error('Failed to load penalty rules', err);
          return throwError(() => err);
        })
      );
  }

  createRule(rule: Partial<PenaltyRule>): Observable<PenaltyRule> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = { societyId: sid, ...this.toPlain(rule as object) };
    delete body['id'];
    return this.http.post<Record<string, unknown>>('/late-payment-penalties/rules', body).pipe(
      map(r => mapPenaltyRuleFromApi(r)),
      catchError(err => {
        console.error('Failed to create penalty rule', err);
        return throwError(() => err);
      })
    );
  }

  updateRule(rule: PenaltyRule): Observable<PenaltyRule> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = { societyId: sid, ...this.toPlain(rule) };
    body['id'] = rule.id;
    return this.http
      .put<Record<string, unknown>>(`/late-payment-penalties/rules/${encodeURIComponent(rule.id)}`, body)
      .pipe(
        map(r => mapPenaltyRuleFromApi(r)),
        catchError(err => {
          console.error('Failed to update penalty rule', err);
          return throwError(() => err);
        })
      );
  }

  toggleRule(id: string): Observable<PenaltyRule> {
    return this.http
      .post<Record<string, unknown>>(`/late-payment-penalties/rules/${encodeURIComponent(id)}/toggle`, {})
      .pipe(
        map(r => mapPenaltyRuleFromApi(r)),
        catchError(err => {
          console.error('Failed to toggle penalty rule', err);
          return throwError(() => err);
        })
      );
  }

  deleteRule(id: string): Observable<void> {
    return this.http.delete<void>(`/late-payment-penalties/rules/${encodeURIComponent(id)}`).pipe(
      catchError(err => {
        console.error('Failed to delete penalty rule', err);
        return throwError(() => err);
      })
    );
  }

  getApplications(): Observable<PenaltyApplication[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(
        `/late-payment-penalties/applications/society/${encodeURIComponent(sid)}`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => mapPenaltyApplicationFromApi(r))),
        catchError(err => {
          console.error('Failed to load penalty applications', err);
          return throwError(() => err);
        })
      );
  }

  calculatePenalties(): Observable<PenaltyApplication[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .post<Record<string, unknown>[]>('/late-payment-penalties/applications/calculate', {
        societyId: sid
      })
      .pipe(
        map(rows => (rows ?? []).map(r => mapPenaltyApplicationFromApi(r))),
        catchError(err => {
          console.error('Failed to calculate penalties', err);
          return throwError(() => err);
        })
      );
  }

  applyPenalty(id: string): Observable<PenaltyApplication> {
    return this.http
      .post<Record<string, unknown>>(
        `/late-payment-penalties/applications/${encodeURIComponent(id)}/apply`,
        {}
      )
      .pipe(
        map(r => mapPenaltyApplicationFromApi(r)),
        catchError(err => {
          console.error('Failed to apply penalty', err);
          return throwError(() => err);
        })
      );
  }

  waivePenalty(id: string): Observable<PenaltyApplication> {
    return this.http
      .post<Record<string, unknown>>(
        `/late-payment-penalties/applications/${encodeURIComponent(id)}/waive`,
        {}
      )
      .pipe(
        map(r => mapPenaltyApplicationFromApi(r)),
        catchError(err => {
          console.error('Failed to waive penalty', err);
          return throwError(() => err);
        })
      );
  }
}
