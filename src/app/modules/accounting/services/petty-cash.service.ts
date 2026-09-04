import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  CreatePettyCashVoucherRequest,
  PettyCashLedger,
  PettyCashTransaction
} from '../models/petty-cash.model';
import {
  mapPettyCashLedgerFromApi,
  mapPettyCashTransactionFromApi
} from './petty-cash-http.mapper';

/** Petty cash ledgers and vouchers via /petty-cash API. */
@Injectable({
  providedIn: 'root'
})
export class PettyCashService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  listLedgers(): Observable<PettyCashLedger[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/petty-cash/ledgers/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => rows.map(r => mapPettyCashLedgerFromApi(r))),
        catchError(err => {
          console.error('Failed to load petty cash ledgers', err);
          return throwError(() => err);
        })
      );
  }

  listVouchers(ledgerId?: string): Observable<PettyCashTransaction[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    let params = new HttpParams();
    if (ledgerId) {
      params = params.set('ledgerId', ledgerId);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/petty-cash/vouchers/society/${encodeURIComponent(sid)}`, { params })
      .pipe(
        map(rows => rows.map(r => mapPettyCashTransactionFromApi(r))),
        catchError(err => {
          console.error('Failed to load petty cash vouchers', err);
          return throwError(() => err);
        })
      );
  }

  createVoucher(request: CreatePettyCashVoucherRequest): Observable<PettyCashTransaction> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .post<Record<string, unknown>>('/petty-cash/vouchers', { societyId: sid, ...request })
      .pipe(
        map(r => mapPettyCashTransactionFromApi(r)),
        catchError(err => {
          console.error('Failed to create petty cash voucher', err);
          return throwError(() => err);
        })
      );
  }

  approveVoucher(id: string, approvedBy = 'Admin'): Observable<PettyCashTransaction> {
    return this.http
      .put<Record<string, unknown>>(`/petty-cash/vouchers/${encodeURIComponent(id)}/approve`, { approvedBy })
      .pipe(
        map(r => mapPettyCashTransactionFromApi(r)),
        catchError(err => {
          console.error('Failed to approve petty cash voucher', err);
          return throwError(() => err);
        })
      );
  }

  approveVouchers(ids: string[], approvedBy = 'Admin'): Observable<PettyCashTransaction[]> {
    return this.http
      .post<Record<string, unknown>[]>('/petty-cash/vouchers/approve-batch', { ids, approvedBy })
      .pipe(
        map(rows => rows.map(r => mapPettyCashTransactionFromApi(r))),
        catchError(err => {
          console.error('Failed to approve petty cash vouchers', err);
          return throwError(() => err);
        })
      );
  }
}
