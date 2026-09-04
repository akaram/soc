import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { IncomeExpenditurePeriod, IncomeExpenditureResponse } from '../models/income-expenditure.model';
import { mapIncomeExpenditureResponseFromApi } from './income-expenditure-http.mapper';

/** Income & expenditure statement via /income-expenditure-statements API. */
@Injectable({
  providedIn: 'root'
})
export class IncomeExpenditureService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  getStatement(
    periodStart: string,
    periodEnd: string,
    financialYear: string,
    period: IncomeExpenditurePeriod
  ): Observable<IncomeExpenditureResponse> {
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
      .get<Record<string, unknown>>(`/income-expenditure-statements/society/${encodeURIComponent(sid)}`, { params })
      .pipe(
        map(r => mapIncomeExpenditureResponseFromApi(r)),
        catchError(err => {
          console.error('Failed to load income & expenditure statement', err);
          return throwError(() => err);
        })
      );
  }
}
