import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { mapPaymentFromApi } from './payment-http.mapper';
import { Payment } from '../models/payment.model';

/**
 * Payment tracking via /payment-transactions API.
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
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

  getAllPayments(): Observable<Payment[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/payment-transactions/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapPaymentFromApi(r))),
        catchError(err => {
          console.error('Failed to load payments', err);
          return throwError(() => err);
        })
      );
  }

  createPayment(payment: Partial<Payment>): Observable<Payment> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = {
      societyId: sid,
      ...this.toPlain(payment as object),
      receivedBy: payment.receivedBy || this.session.getCurrentUserId() || 'admin'
    };
    delete body['id'];
    return this.http.post<Record<string, unknown>>('/payment-transactions', body).pipe(
      map(r => mapPaymentFromApi(r)),
      catchError(err => {
        console.error('Failed to create payment', err);
        return throwError(() => err);
      })
    );
  }

  generateReceipt(id: string): Observable<Payment> {
    return this.http.post<Record<string, unknown>>(`/payment-transactions/${encodeURIComponent(id)}/receipt`, {}).pipe(
      map(r => mapPaymentFromApi(r)),
      catchError(err => {
        console.error('Failed to generate receipt', err);
        return throwError(() => err);
      })
    );
  }

  refundPayment(id: string): Observable<Payment> {
    return this.http.post<Record<string, unknown>>(`/payment-transactions/${encodeURIComponent(id)}/refund`, {}).pipe(
      map(r => mapPaymentFromApi(r)),
      catchError(err => {
        console.error('Failed to refund payment', err);
        return throwError(() => err);
      })
    );
  }
}
