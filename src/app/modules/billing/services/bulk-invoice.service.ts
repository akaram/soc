import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  BulkInvoiceGeneration,
  BulkInvoiceResident,
  BulkInvoiceTemplate
} from '../models/bulk-invoice.model';
import {
  mapBulkGenerationFromApi,
  mapBulkResidentFromApi,
  mapBulkTemplateFromApi
} from './bulk-invoice-http.mapper';

/** Bulk invoice generation via /bulk-invoice-generations and /invoice-templates APIs. */
@Injectable({
  providedIn: 'root'
})
export class BulkInvoiceService {
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

  getTemplates(): Observable<BulkInvoiceTemplate[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/invoice-templates/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapBulkTemplateFromApi(r))),
        catchError(err => {
          console.error('Failed to load invoice templates', err);
          return throwError(() => err);
        })
      );
  }

  createTemplate(template: Partial<BulkInvoiceTemplate>): Observable<BulkInvoiceTemplate> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = {
      societyId: sid,
      ...this.toPlain(template as object),
      isActive: true,
      createdAt: new Date().toISOString(),
      termsAndConditions: template.notes ?? ''
    };
    delete body['id'];
    return this.http.post<Record<string, unknown>>('/invoice-templates', body).pipe(
      map(r => mapBulkTemplateFromApi(r)),
      catchError(err => {
        console.error('Failed to create invoice template', err);
        return throwError(() => err);
      })
    );
  }

  updateTemplate(template: BulkInvoiceTemplate): Observable<BulkInvoiceTemplate> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = {
      societyId: sid,
      ...this.toPlain(template),
      termsAndConditions: template.notes ?? ''
    };
    return this.http
      .put<Record<string, unknown>>(`/invoice-templates/${encodeURIComponent(template.id)}`, body)
      .pipe(
        map(r => mapBulkTemplateFromApi(r)),
        catchError(err => {
          console.error('Failed to update invoice template', err);
          return throwError(() => err);
        })
      );
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`/invoice-templates/${encodeURIComponent(id)}`).pipe(
      catchError(err => {
        console.error('Failed to delete invoice template', err);
        return throwError(() => err);
      })
    );
  }

  getResidents(): Observable<BulkInvoiceResident[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(
        `/bulk-invoice-generations/society/${encodeURIComponent(sid)}/residents`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => mapBulkResidentFromApi(r))),
        catchError(err => {
          console.error('Failed to load residents', err);
          return throwError(() => err);
        })
      );
  }

  getGenerationHistory(): Observable<BulkInvoiceGeneration[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(
        `/bulk-invoice-generations/society/${encodeURIComponent(sid)}`
      )
      .pipe(
        map(rows => (rows ?? []).map(r => mapBulkGenerationFromApi(r))),
        catchError(err => {
          console.error('Failed to load bulk generation history', err);
          return throwError(() => err);
        })
      );
  }

  generateInvoices(request: {
    templateId: string;
    invoiceDate: string;
    dueDate: string;
    selectedResidents: string[];
    notes?: string;
  }): Observable<BulkInvoiceGeneration> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body: Record<string, unknown> = {
      societyId: sid,
      templateId: request.templateId,
      invoiceDate: request.invoiceDate,
      dueDate: request.dueDate,
      selectedResidents: request.selectedResidents,
      notes: request.notes,
      createdBy: this.session.getCurrentUserId() || 'admin'
    };
    return this.http.post<Record<string, unknown>>('/bulk-invoice-generations/generate', body).pipe(
      map(r => mapBulkGenerationFromApi(r)),
      catchError(err => {
        console.error('Failed to generate bulk invoices', err);
        return throwError(() => err);
      })
    );
  }
}
