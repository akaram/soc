import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { mapInvoiceFromApi, mapInvoiceTemplateFromApi } from './invoice-http.mapper';
import { Invoice, InvoiceTemplate } from '../models/invoice.model';

/**
 * Invoice management via /invoices and /invoice-templates APIs.
 */
@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
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

  getAllInvoices(): Observable<Invoice[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/invoices/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapInvoiceFromApi(r))),
        catchError(err => {
          console.error('Failed to load invoices', err);
          return throwError(() => err);
        })
      );
  }

  createInvoice(invoice: Partial<Invoice>): Observable<Invoice> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = {
      societyId: sid,
      ...this.toPlain(invoice as object),
      createdBy: invoice.createdBy || this.session.getCurrentUserId() || 'admin'
    };
    delete body['id'];
    return this.http.post<Record<string, unknown>>('/invoices', body).pipe(
      map(r => mapInvoiceFromApi(r)),
      catchError(err => {
        console.error('Failed to create invoice', err);
        return throwError(() => err);
      })
    );
  }

  updateInvoice(invoice: Invoice): Observable<Invoice> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = { societyId: sid, ...this.toPlain(invoice) };
    body['id'] = invoice.id;
    return this.http
      .put<Record<string, unknown>>(`/invoices/${encodeURIComponent(invoice.id)}`, body)
      .pipe(
        map(r => mapInvoiceFromApi(r)),
        catchError(err => {
          console.error('Failed to update invoice', err);
          return throwError(() => err);
        })
      );
  }

  sendInvoice(id: string): Observable<Invoice> {
    return this.http.post<Record<string, unknown>>(`/invoices/${encodeURIComponent(id)}/send`, {}).pipe(
      map(r => mapInvoiceFromApi(r)),
      catchError(err => {
        console.error('Failed to send invoice', err);
        return throwError(() => err);
      })
    );
  }

  getTemplates(): Observable<InvoiceTemplate[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/invoice-templates/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapInvoiceTemplateFromApi(r))),
        catchError(err => {
          console.error('Failed to load invoice templates', err);
          return throwError(() => err);
        })
      );
  }
}
