import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { BalanceSheetPeriod, BalanceSheetResponse } from '../models/balance-sheet.model';
import { mapBalanceSheetResponseFromApi } from './balance-sheet-http.mapper';

/** Real-time balance sheet via /balance-sheets API. */
@Injectable({
  providedIn: 'root'
})
export class BalanceSheetService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  getBalanceSheet(
    asOfDate: string,
    financialYear: string,
    period: BalanceSheetPeriod
  ): Observable<BalanceSheetResponse> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const params = new HttpParams()
      .set('asOfDate', asOfDate)
      .set('financialYear', financialYear)
      .set('period', period);
    return this.http
      .get<Record<string, unknown>>(`/balance-sheets/society/${encodeURIComponent(sid)}`, { params })
      .pipe(
        map(r => mapBalanceSheetResponseFromApi(r)),
        catchError(err => {
          console.error('Failed to load balance sheet', err);
          return throwError(() => err);
        })
      );
  }
}
