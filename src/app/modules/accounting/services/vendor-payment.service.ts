import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { Vendor, VendorPayment, VendorPaymentSummary } from '../models/vendor-payment.model';
import {
  mapVendorFromApi,
  mapVendorPaymentFromApi,
  mapVendorPaymentSummaryFromApi
} from './vendor-payment-http.mapper';

/** Vendor payments with TDS via /vendor-payments API. */
@Injectable({
  providedIn: 'root'
})
export class VendorPaymentService {
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

  getVendors(): Observable<Vendor[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/vendor-payments/vendors/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapVendorFromApi(r))),
        catchError(err => {
          console.error('Failed to load vendors', err);
          return throwError(() => err);
        })
      );
  }

  getPayments(): Observable<VendorPayment[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/vendor-payments/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapVendorPaymentFromApi(r))),
        catchError(err => {
          console.error('Failed to load vendor payments', err);
          return throwError(() => err);
        })
      );
  }

  getSummary(): Observable<VendorPaymentSummary> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>>(`/vendor-payments/summary/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(r => mapVendorPaymentSummaryFromApi(r)),
        catchError(err => {
          console.error('Failed to load vendor payment summary', err);
          return throwError(() => err);
        })
      );
  }

  createPayment(payment: Partial<VendorPayment>): Observable<VendorPayment> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = { societyId: sid, ...this.toPlain(payment as object) };
    delete body['id'];
    return this.http.post<Record<string, unknown>>('/vendor-payments', body).pipe(
      map(r => mapVendorPaymentFromApi(r)),
      catchError(err => {
        console.error('Failed to create vendor payment', err);
        return throwError(() => err);
      })
    );
  }

  approvePayment(id: string): Observable<VendorPayment> {
    const approvedBy = this.session.getCurrentUserId() || 'admin';
    return this.http
      .post<Record<string, unknown>>(`/vendor-payments/${encodeURIComponent(id)}/approve`, { approvedBy })
      .pipe(
        map(r => mapVendorPaymentFromApi(r)),
        catchError(err => {
          console.error('Failed to approve payment', err);
          return throwError(() => err);
        })
      );
  }

  processPayment(id: string): Observable<VendorPayment> {
    return this.http
      .post<Record<string, unknown>>(`/vendor-payments/${encodeURIComponent(id)}/pay`, {})
      .pipe(
        map(r => mapVendorPaymentFromApi(r)),
        catchError(err => {
          console.error('Failed to process payment', err);
          return throwError(() => err);
        })
      );
  }

  generateTdsCertificate(id: string): Observable<VendorPayment> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .post<Record<string, unknown>>(`/vendor-payments/${encodeURIComponent(id)}/generate-tds-certificate`, {
        societyId: sid
      })
      .pipe(
        map(r => mapVendorPaymentFromApi(r)),
        catchError(err => {
          console.error('Failed to generate TDS certificate', err);
          return throwError(() => err);
        })
      );
  }
}
