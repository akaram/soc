import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { ReceiptPaymentPeriod, ReceiptPaymentResponse } from '../models/receipt-payment.model';
import { mapReceiptPaymentResponseFromApi } from './receipt-payment-http.mapper';

/** Receipt & payment statement via /receipt-payment-statements API. */
@Injectable({
  providedIn: 'root'
})
export class ReceiptPaymentService {
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
    period: ReceiptPaymentPeriod
  ): Observable<ReceiptPaymentResponse> {
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
      .get<Record<string, unknown>>(`/receipt-payment-statements/society/${encodeURIComponent(sid)}`, { params })
      .pipe(
        map(r => mapReceiptPaymentResponseFromApi(r)),
        catchError(err => {
          console.error('Failed to load receipt & payment statement', err);
          return throwError(() => err);
        })
      );
  }
}
