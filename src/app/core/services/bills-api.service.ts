import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from './session-context.service';

export interface BillRow {
  id: string;
  billNumber: string;
  societyId: string;
  flatId: string;
  ownerId: string;
  billType: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillsApiService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private normalize(raw: any): BillRow {
    const num = (v: unknown) => (v == null ? 0 : Number(v));
    return {
      id: raw.id,
      billNumber: raw.billNumber ?? raw.bill_number ?? '',
      societyId: raw.societyId ?? raw.society_id ?? '',
      flatId: raw.flatId ?? raw.flat_id ?? '',
      ownerId: raw.ownerId ?? raw.owner_id ?? '',
      billType: String(raw.billType ?? raw.bill_type ?? 'OTHER'),
      dueDate: String(raw.dueDate ?? raw.due_date ?? ''),
      totalAmount: num(raw.totalAmount ?? raw.total_amount),
      paidAmount: num(raw.paidAmount ?? raw.paid_amount),
      pendingAmount: num(raw.pendingAmount ?? raw.pending_amount),
      paymentStatus: String(raw.paymentStatus ?? raw.payment_status ?? 'PENDING'),
      status: String(raw.status ?? 'DRAFT')
    };
  }

  /** Prefer owner-scoped bills; fall back to society pending list. */
  listOutstanding(): Observable<BillRow[]> {
    // Staff/facility managers are not flat bill payers — skip bill APIs entirely.
    if (this.isStaffSession()) {
      return of([]);
    }

    const societyId = this.session.getSocietyId();
    const ownerId = this.session.getCurrentUserId();

    // Avoid calling /bills/owner/{societyId} when user id resolution falls back incorrectly.
    const looksLikeUserId =
      !!ownerId && ownerId !== societyId && ownerId.length >= 32;

    if (looksLikeUserId) {
      return this.http.get<any[]>(`/bills/owner/${encodeURIComponent(ownerId)}`).pipe(
        map(rows => (rows ?? []).map(r => this.normalize(r)).filter(b => b.paymentStatus !== 'PAID')),
        catchError(() => (societyId ? this.listPendingBySociety(societyId) : of([])))
      );
    }
    if (societyId) {
      return this.listPendingBySociety(societyId);
    }
    return of([]);
  }

  /** True when the mobile session is staff (not Owner/Tenant). */
  private isStaffSession(): boolean {
    for (const key of ['mobileUser', 'currentUser'] as const) {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!raw) continue;
      try {
        const role = String((JSON.parse(raw) as { role?: string }).role || '').toUpperCase();
        if (!role) continue;
        if (role === 'OWNER' || role === 'TENANT') {
          return false;
        }
        // Facility Manager, Guard, Accountant, etc.
        return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  }

  private listPendingBySociety(societyId: string): Observable<BillRow[]> {
    return this.http.get<any[]>(`/bills/society/${encodeURIComponent(societyId)}/pending`).pipe(
      map(rows => (rows ?? []).map(r => this.normalize(r))),
      catchError(() => of([]))
    );
  }

  /** All bills for the current owner (paid and unpaid). */
  listByOwner(): Observable<BillRow[]> {
    const ownerId = this.session.getCurrentUserId();
    if (!ownerId) {
      return of([]);
    }
    return this.http.get<any[]>(`/bills/owner/${encodeURIComponent(ownerId)}`).pipe(
      map(rows => (rows ?? []).map(r => this.normalize(r))),
      catchError(() => of([]))
    );
  }

  /** Mark bill paid (demo: full amount). */
  markPaid(billId: string, totalAmount: number): Observable<BillRow> {
    const params = new HttpParams().set('status', 'PAID').set('paidAmount', String(totalAmount));
    return this.http
      .put<any>(`/bills/${encodeURIComponent(billId)}/payment`, null, { params })
      .pipe(map(r => this.normalize(r)));
  }
}
