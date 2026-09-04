import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SessionContextService } from '../../core/services/session-context.service';
import { MobileAuthService } from './mobile-auth.service';

/** Package row shown on the guard Package Holding screen. */
export interface GuardPackage {
  id: string;
  trackingNumber?: string;
  courierName: string;
  recipientName: string;
  recipientFlat: string;
  recipientBuilding?: string;
  receivedAt: Date;
  receivedBy: string;
  status: 'pending' | 'held' | 'delivered' | 'rejected' | 'forwarded';
  notes?: string;
  deliveryAttempts: number;
}

export interface ReceivePackageRequest {
  courierName: string;
  recipientName: string;
  recipientFlat: string;
  trackingNumber?: string;
  notes?: string;
}

/** Maps backend {@link Delivery} JSON to guard UI package shape. */
interface DeliveryMeta {
  recipientName?: string;
  courierName?: string;
  guardReceived?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GuardPackageService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService,
    private mobileAuth: MobileAuthService
  ) {}

  /** List packages (deliveries) for the guard's society. */
  listPackages(): Observable<GuardPackage[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }
    return forkJoin({
      deliveries: this.http.get<Record<string, unknown>[]>(`/deliveries/society/${societyId}`),
      flats: this.http.get<Record<string, unknown>[]>(`/flats/society/${societyId}`).pipe(catchError(() => of([])))
    }).pipe(
      map(({ deliveries, flats }) => {
        const flatById = new Map(flats.map(f => [String(f['id'] ?? ''), String(f['flatNumber'] ?? '')]));
        return (deliveries ?? []).map(d => this.toGuardPackage(d, flatById));
      }),
      catchError(() => of([]))
    );
  }

  /** Guard logs a package received at the gate (POST /deliveries, status ARRIVED). */
  receivePackage(req: ReceivePackageRequest): Observable<GuardPackage> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return throwError(() => new Error('No society in session. Log in again.'));
    }
    const guard = this.mobileAuth.getCurrentUser();
    const guardId = guard?.id ?? this.session.getCurrentUserId();
    const guardName = guard?.name ?? 'Guard';

    return this.resolveFlatId(req.recipientFlat).pipe(
      switchMap(flatId => {
        const meta: DeliveryMeta = {
          recipientName: req.recipientName.trim(),
          courierName: req.courierName.trim(),
          guardReceived: true
        };
        const body: Record<string, unknown> = {
          societyId,
          flatId,
          recipientId: guardId || societyId,
          deliveryType: this.mapCourierToType(req.courierName),
          trackingNumber: req.trackingNumber?.trim() || undefined,
          deliveryExecutiveName: req.recipientName.trim(),
          itemsDescription: JSON.stringify(meta),
          status: 'ARRIVED',
          receivedBy: guardName,
          notes: req.notes?.trim() || undefined
        };
        return this.http.post<Record<string, unknown>>('/deliveries', body);
      }),
      switchMap(raw =>
        this.http.get<Record<string, unknown>[]>(`/flats/society/${societyId}`).pipe(
          map(flats => {
            const flatById = new Map(flats.map(f => [String(f['id'] ?? ''), String(f['flatNumber'] ?? '')]));
            return this.toGuardPackage(raw, flatById);
          })
        )
      )
    );
  }

  /** Update package status after guard action (deliver to flat, hold, reject, etc.). */
  updatePackage(
    packageId: string,
    uiStatus: GuardPackage['status'],
    notes?: string
  ): Observable<GuardPackage> {
    const backendStatus = this.uiStatusToBackend(uiStatus);
    return this.http
      .put<Record<string, unknown>>(`/deliveries/${packageId}/status`, null, {
        params: new HttpParams().set('status', backendStatus)
      })
      .pipe(
        switchMap(() => {
          if (!notes?.trim()) {
            return this.http.get<Record<string, unknown>>(`/deliveries/${packageId}`);
          }
          return this.http.put<Record<string, unknown>>(`/deliveries/${packageId}`, { notes: notes.trim() });
        }),
        switchMap(raw => {
          const societyId = this.session.getSocietyId();
          return this.http.get<Record<string, unknown>[]>(`/flats/society/${societyId}`).pipe(
            map(flats => {
              const flatById = new Map(flats.map(f => [String(f['id'] ?? ''), String(f['flatNumber'] ?? '')]));
              return this.toGuardPackage(raw, flatById);
            })
          );
        })
      );
  }

  /** Find a package by tracking number or delivery id (for QR scan flow). */
  findByTrackingOrId(token: string): Observable<GuardPackage | null> {
    const needle = token.trim().toLowerCase();
    if (!needle) {
      return of(null);
    }
    return this.listPackages().pipe(
      map(list =>
        list.find(
          p =>
            p.id.toLowerCase() === needle ||
            (p.trackingNumber && p.trackingNumber.toLowerCase() === needle)
        ) ?? null
      )
    );
  }

  private toGuardPackage(
    raw: Record<string, unknown>,
    flatById: Map<string, string>
  ): GuardPackage {
    const meta = this.parseMeta(raw['itemsDescription']);
    const flatId = String(raw['flatId'] ?? '');
    const recipientFlat = flatById.get(flatId) || flatId || '—';
    const courierName =
      meta.courierName || this.typeToCourierLabel(String(raw['deliveryType'] ?? 'OTHER'));
    const recipientName =
      meta.recipientName || String(raw['deliveryExecutiveName'] ?? 'Resident');
    const created = this.parseDate(raw['createdAt']) ?? new Date();

    return {
      id: String(raw['id'] ?? ''),
      trackingNumber: raw['trackingNumber'] ? String(raw['trackingNumber']) : undefined,
      courierName,
      recipientName,
      recipientFlat,
      receivedAt: created,
      receivedBy: String(raw['receivedBy'] ?? '—'),
      status: this.backendStatusToUi(String(raw['status'] ?? 'PENDING')),
      notes: raw['notes'] ? String(raw['notes']) : undefined,
      deliveryAttempts: 0
    };
  }

  private parseMeta(raw: unknown): DeliveryMeta {
    if (!raw || typeof raw !== 'string') {
      return {};
    }
    try {
      return JSON.parse(raw) as DeliveryMeta;
    } catch {
      return {};
    }
  }

  private parseDate(v: unknown): Date | undefined {
    if (!v) return undefined;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  private backendStatusToUi(status: string): GuardPackage['status'] {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return 'delivered';
      case 'RETURNED':
        return 'rejected';
      case 'IN_TRANSIT':
        return 'forwarded';
      case 'ARRIVED':
      case 'PENDING':
      default:
        return 'pending';
    }
  }

  private uiStatusToBackend(status: GuardPackage['status']): string {
    const map: Record<GuardPackage['status'], string> = {
      pending: 'ARRIVED',
      held: 'ARRIVED',
      delivered: 'DELIVERED',
      rejected: 'RETURNED',
      forwarded: 'IN_TRANSIT'
    };
    return map[status] ?? 'ARRIVED';
  }

  private mapCourierToType(courier: string): string {
    const c = courier.trim().toLowerCase();
    if (c.includes('amazon')) return 'AMAZON';
    if (c.includes('flipkart')) return 'FLIPKART';
    if (c.includes('swiggy')) return 'SWIGGY';
    if (c.includes('zomato')) return 'ZOMATO';
    return 'OTHER';
  }

  private typeToCourierLabel(t: string): string {
    const labels: Record<string, string> = {
      AMAZON: 'Amazon',
      FLIPKART: 'Flipkart',
      SWIGGY: 'Swiggy',
      ZOMATO: 'Zomato',
      OTHER: 'Courier'
    };
    return labels[t.toUpperCase()] ?? t;
  }

  /** Match flat number to flat UUID for delivery create. */
  private resolveFlatId(flatNumber: string): Observable<string> {
    const societyId = this.session.getSocietyId();
    return this.http.get<Record<string, unknown>[]>(`/flats/society/${societyId}`).pipe(
      map(flats => {
        if (!flats?.length) {
          throw new Error('No flats configured for this society.');
        }
        const label = flatNumber.trim().toLowerCase().replace(/\s+/g, '');
        const hit = flats.find(f => {
          const fn = String(f['flatNumber'] ?? '')
            .toLowerCase()
            .replace(/\s+/g, '');
          return fn === label || fn.includes(label) || label.includes(fn);
        });
        return String((hit ?? flats[0])['id']);
      })
    );
  }
}
