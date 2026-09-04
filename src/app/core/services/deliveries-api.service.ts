import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from './session-context.service';

/** Normalized delivery row for admin and mobile UIs */
export interface DeliveryRow {
  id: string;
  societyId: string;
  flatId: string;
  flatNumber?: string;
  recipientId: string;
  recipientName?: string;
  deliveryType: string;
  trackingNumber: string;
  executiveName: string;
  executivePhone: string;
  itemsDescription: string;
  status: string;
  expectedTime?: string;
  actualDeliveryTime?: string;
  receivedBy?: string;
  notes?: string;
  createdAt?: Date;
}

export const DELIVERY_TYPES = ['AMAZON', 'ZOMATO', 'SWIGGY', 'FLIPKART', 'OTHER'] as const;
export const DELIVERY_STATUSES = ['PENDING', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'RETURNED', 'CANCELLED'] as const;

@Injectable({ providedIn: 'root' })
export class DeliveriesApiService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Map raw API payload to UI row */
  private normalize(raw: Record<string, unknown>): DeliveryRow {
    const expected = raw['expectedDeliveryTime'] ?? raw['expected_delivery_time'];
    const actual = raw['actualDeliveryTime'] ?? raw['actual_delivery_time'];
    const created = raw['createdAt'] ?? raw['created_at'];
    return {
      id: String(raw['id'] ?? ''),
      societyId: String(raw['societyId'] ?? raw['society_id'] ?? ''),
      flatId: String(raw['flatId'] ?? raw['flat_id'] ?? ''),
      flatNumber:
        raw['flatNumber'] != null
          ? String(raw['flatNumber'])
          : raw['flat_number'] != null
            ? String(raw['flat_number'])
            : undefined,
      recipientId: String(raw['recipientId'] ?? raw['recipient_id'] ?? ''),
      recipientName:
        raw['recipientName'] != null
          ? String(raw['recipientName'])
          : raw['recipient_name'] != null
            ? String(raw['recipient_name'])
            : undefined,
      deliveryType: String(raw['deliveryType'] ?? raw['delivery_type'] ?? 'OTHER'),
      trackingNumber: String(raw['trackingNumber'] ?? raw['tracking_number'] ?? '—'),
      executiveName: String(raw['deliveryExecutiveName'] ?? raw['delivery_executive_name'] ?? '—'),
      executivePhone: String(raw['deliveryExecutivePhone'] ?? raw['delivery_executive_phone'] ?? ''),
      itemsDescription: String(raw['itemsDescription'] ?? raw['items_description'] ?? ''),
      status: String(raw['status'] ?? 'PENDING'),
      expectedTime: expected ? String(expected) : undefined,
      actualDeliveryTime: actual ? String(actual) : undefined,
      receivedBy: raw['receivedBy'] != null ? String(raw['receivedBy']) : raw['received_by'] != null ? String(raw['received_by']) : undefined,
      notes: raw['notes'] != null ? String(raw['notes']) : undefined,
      createdAt: created ? new Date(String(created)) : undefined
    };
  }

  listBySociety(societyId: string): Observable<DeliveryRow[]> {
    if (!societyId) {
      return of([]);
    }
    return this.http.get<Record<string, unknown>[]>(`/deliveries/society/${encodeURIComponent(societyId)}`).pipe(
      map(rows => (rows ?? []).map(r => this.normalize(r))),
      catchError(err => {
        const msg = err?.error?.message || err?.message || 'Could not load deliveries.';
        return throwError(() => new Error(msg));
      })
    );
  }

  listByRecipient(recipientId: string): Observable<DeliveryRow[]> {
    if (!recipientId) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/deliveries/recipient/${encodeURIComponent(recipientId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalize(r))),
        catchError(err => {
          const msg = err?.error?.message || err?.message || 'Could not load your deliveries.';
          return throwError(() => new Error(msg));
        })
      );
  }

  /** Deliveries for logged-in flat owner */
  listForResident(): Observable<DeliveryRow[]> {
    const recipientId = this.session.getCurrentUserId();
    if (recipientId) {
      return this.listByRecipient(recipientId);
    }
    const societyId = this.session.getSocietyId();
    return societyId ? this.listBySociety(societyId) : of([]);
  }

  getById(id: string): Observable<DeliveryRow> {
    return this.http
      .get<Record<string, unknown>>(`/deliveries/${encodeURIComponent(id)}`)
      .pipe(map(r => this.normalize(r)));
  }

  create(payload: {
    societyId: string;
    flatId: string;
    recipientId: string;
    deliveryType: string;
    trackingNumber?: string;
    deliveryExecutiveName?: string;
    deliveryExecutivePhone?: string;
    itemsDescription?: string;
    status?: string;
    notes?: string;
  }): Observable<DeliveryRow> {
    const body: Record<string, unknown> = {
      societyId: payload.societyId,
      flatId: payload.flatId,
      recipientId: payload.recipientId,
      deliveryType: payload.deliveryType,
      trackingNumber: payload.trackingNumber || undefined,
      deliveryExecutiveName: payload.deliveryExecutiveName || undefined,
      deliveryExecutivePhone: payload.deliveryExecutivePhone || undefined,
      itemsDescription: payload.itemsDescription || undefined,
      status: payload.status ?? 'ARRIVED',
      notes: payload.notes || undefined
    };
    return this.http.post<Record<string, unknown>>('/deliveries', body).pipe(map(r => this.normalize(r)));
  }

  updateStatus(id: string, status: string): Observable<DeliveryRow> {
    const params = new HttpParams().set('status', status);
    return this.http
      .put<Record<string, unknown>>(`/deliveries/${encodeURIComponent(id)}/status`, null, { params })
      .pipe(map(r => this.normalize(r)));
  }

  /** Owner confirms package collected from gate/security */
  markReceived(id: string, receivedBy?: string): Observable<DeliveryRow> {
    let params = new HttpParams();
    if (receivedBy) {
      params = params.set('receivedBy', receivedBy);
    }
    return this.http
      .put<Record<string, unknown>>(`/deliveries/${encodeURIComponent(id)}/receive`, null, { params })
      .pipe(map(r => this.normalize(r)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/deliveries/${encodeURIComponent(id)}`);
  }

  /** True when owner still needs to collect the package */
  isAwaitingPickup(status: string): boolean {
    const u = (status || '').toUpperCase();
    return u === 'PENDING' || u === 'IN_TRANSIT' || u === 'ARRIVED';
  }
}
