import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  mapAutomationSettingsFromApi,
  mapBillTemplateFromApi,
  mapMaintenanceBillFromApi
} from './maintenance-bill-http.mapper';
import {
  AutomationSettings,
  BillTemplate,
  GenerateMaintenanceBillsRequest,
  MaintenanceBill
} from '../models/maintenance-bill.model';

/**
 * Automated maintenance bills via /maintenance-bills, templates, and automation settings APIs.
 */
@Injectable({
  providedIn: 'root'
})
export class MaintenanceBillService {
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

  getAllBills(): Observable<MaintenanceBill[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/maintenance-bills/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapMaintenanceBillFromApi(r))),
        catchError(err => {
          console.error('Failed to load maintenance bills', err);
          return throwError(() => err);
        })
      );
  }

  getBillById(id: string): Observable<MaintenanceBill> {
    return this.http.get<Record<string, unknown>>(`/maintenance-bills/${encodeURIComponent(id)}`).pipe(
      map(r => mapMaintenanceBillFromApi(r)),
      catchError(err => {
        console.error('Failed to load maintenance bill', err);
        return throwError(() => err);
      })
    );
  }

  updateBill(bill: MaintenanceBill): Observable<MaintenanceBill> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const plain = this.toPlain(bill);
    plain['societyId'] = sid;
    plain['id'] = bill.id;
    return this.http
      .put<Record<string, unknown>>(`/maintenance-bills/${encodeURIComponent(bill.id)}`, plain)
      .pipe(
        map(r => mapMaintenanceBillFromApi(r)),
        catchError(err => {
          console.error('Failed to update maintenance bill', err);
          return throwError(() => err);
        })
      );
  }

  sendBill(id: string): Observable<MaintenanceBill> {
    return this.http
      .post<Record<string, unknown>>(`/maintenance-bills/${encodeURIComponent(id)}/send`, {})
      .pipe(
        map(r => mapMaintenanceBillFromApi(r)),
        catchError(err => {
          console.error('Failed to send maintenance bill', err);
          return throwError(() => err);
        })
      );
  }

  generateBills(request: GenerateMaintenanceBillsRequest): Observable<MaintenanceBill[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body = {
      societyId: sid,
      billMonth: request.billMonth,
      templateId: request.templateId || undefined,
      autoSend: request.autoSend ?? false,
      dueDateDay: request.dueDateDay ?? 10,
      generatedBy: this.session.getCurrentUserId() || 'system'
    };
    return this.http.post<Record<string, unknown>[]>('/maintenance-bills/generate', body).pipe(
      map(rows => (rows ?? []).map(r => mapMaintenanceBillFromApi(r))),
      catchError(err => {
        console.error('Failed to generate maintenance bills', err);
        return throwError(() => err);
      })
    );
  }

  getTemplates(): Observable<BillTemplate[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/maintenance-bill-templates/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapBillTemplateFromApi(r))),
        catchError(err => {
          console.error('Failed to load bill templates', err);
          return throwError(() => err);
        })
      );
  }

  getAutomationSettings(): Observable<AutomationSettings> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>>(`/maintenance-bill-automation-settings/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(r => mapAutomationSettingsFromApi(r)),
        catchError(err => {
          console.error('Failed to load automation settings', err);
          return throwError(() => err);
        })
      );
  }

  saveAutomationSettings(settings: AutomationSettings): Observable<AutomationSettings> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body = { societyId: sid, ...this.toPlain(settings) };
    return this.http
      .put<Record<string, unknown>>(`/maintenance-bill-automation-settings/society/${encodeURIComponent(sid)}`, body)
      .pipe(
        map(r => mapAutomationSettingsFromApi(r)),
        catchError(err => {
          console.error('Failed to save automation settings', err);
          return throwError(() => err);
        })
      );
  }
}
