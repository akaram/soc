import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  mapMeterReadingFromApi,
  mapUtilityBillFromApi,
  mapUtilityRateFromApi
} from './utility-bill-http.mapper';
import {
  GenerateUtilityBillsRequest,
  MeterReading,
  UtilityBill,
  UtilityRate
} from '../models/utility-bill.model';

/**
 * Utility bills, meter readings, and rates via live APIs.
 */
@Injectable({
  providedIn: 'root'
})
export class UtilityBillService {
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

  getAllBills(): Observable<UtilityBill[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/utility-bills/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapUtilityBillFromApi(r))),
        catchError(err => {
          console.error('Failed to load utility bills', err);
          return throwError(() => err);
        })
      );
  }

  sendBill(id: string): Observable<UtilityBill> {
    return this.http
      .post<Record<string, unknown>>(`/utility-bills/${encodeURIComponent(id)}/send`, {})
      .pipe(
        map(r => mapUtilityBillFromApi(r)),
        catchError(err => {
          console.error('Failed to send utility bill', err);
          return throwError(() => err);
        })
      );
  }

  generateBills(request: GenerateUtilityBillsRequest): Observable<UtilityBill[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body = {
      societyId: sid,
      utilityType: request.utilityType,
      billMonth: request.billMonth,
      useMeterReadings: request.useMeterReadings ?? true,
      autoSend: request.autoSend ?? false,
      dueDateDay: request.dueDateDay ?? 10,
      generatedBy: this.session.getCurrentUserId() || 'system'
    };
    return this.http.post<Record<string, unknown>[]>('/utility-bills/generate', body).pipe(
      map(rows => (rows ?? []).map(r => mapUtilityBillFromApi(r))),
      catchError(err => {
        console.error('Failed to generate utility bills', err);
        return throwError(() => err);
      })
    );
  }

  getMeterReadings(): Observable<MeterReading[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/utility-meter-readings/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapMeterReadingFromApi(r))),
        catchError(err => {
          console.error('Failed to load meter readings', err);
          return throwError(() => err);
        })
      );
  }

  addMeterReading(reading: Partial<MeterReading>): Observable<MeterReading> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body = {
      societyId: sid,
      ...this.toPlain(reading as object),
      readBy: reading.readBy || this.session.getCurrentUserId() || 'admin'
    };
    return this.http.post<Record<string, unknown>>('/utility-meter-readings', body).pipe(
      map(r => mapMeterReadingFromApi(r)),
      catchError(err => {
        console.error('Failed to save meter reading', err);
        return throwError(() => err);
      })
    );
  }

  getRates(): Observable<UtilityRate[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/utility-rates/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => mapUtilityRateFromApi(r))),
        catchError(err => {
          console.error('Failed to load utility rates', err);
          return throwError(() => err);
        })
      );
  }

  saveRate(rate: Partial<UtilityRate>): Observable<UtilityRate> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body = {
      societyId: sid,
      ...this.toPlain(rate as object),
      isActive: true
    };
    return this.http.post<Record<string, unknown>>('/utility-rates', body).pipe(
      map(r => mapUtilityRateFromApi(r)),
      catchError(err => {
        console.error('Failed to save utility rate', err);
        return throwError(() => err);
      })
    );
  }

  updateMeterReading(id: string, reading: Partial<MeterReading>): Observable<MeterReading> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    const body = {
      societyId: sid,
      ...this.toPlain(reading as object),
      id
    };
    return this.http
      .put<Record<string, unknown>>(`/utility-meter-readings/${encodeURIComponent(id)}`, body)
      .pipe(
        map(r => mapMeterReadingFromApi(r)),
        catchError(err => {
          console.error('Failed to update meter reading', err);
          return throwError(() => err);
        })
      );
  }
}
