import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { BudgetVariancePeriod, BudgetVarianceResponse } from '../models/budget-variance.model';
import { mapBudgetVarianceResponseFromApi } from './budget-variance-http.mapper';

/** Budget vs actual variance report via /budget-variance-reports API. */
@Injectable({
  providedIn: 'root'
})
export class BudgetVarianceService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  getReport(
    periodStart: string,
    periodEnd: string,
    financialYear: string,
    period: BudgetVariancePeriod
  ): Observable<BudgetVarianceResponse> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const params = new HttpParams()
      .set('periodStart', periodStart)
      .set('periodEnd', periodEnd)
      .set('financialYear', financialYear)
      .set('period', period);
    return this.http
      .get<Record<string, unknown>>(`/budget-variance-reports/society/${encodeURIComponent(sid)}`, { params })
      .pipe(
        map(r => mapBudgetVarianceResponseFromApi(r)),
        catchError(err => {
          console.error('Failed to load budget variance report', err);
          return throwError(() => err);
        })
      );
  }
}
