import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MobileAuthService, UserRole } from './mobile-auth.service';
import { VisitorApiService, VisitorUi } from '../features/visitors/visitor-api.service';
import { BillsApiService, BillRow } from '../../core/services/bills-api.service';

/** In-app notification shown on the mobile notifications screen. */
export interface MobileNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: 'visitor' | 'payment' | 'complaint' | 'announcement' | 'system';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  /** Visitor record to open when the notification is tapped. */
  visitorId?: string;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class MobileNotificationsService {
  private readonly notificationsSubject = new BehaviorSubject<MobileNotification[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();

  readonly unreadCount$: Observable<number> = this.notifications$.pipe(
    map(list => list.filter(n => !n.read).length)
  );

  constructor(
    private auth: MobileAuthService,
    private visitorApi: VisitorApiService,
    private billsApi: BillsApiService
  ) {}

  /** Rebuild list from visitors (+ bills only for owners/tenants). */
  refresh(): void {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.notificationsSubject.next([]);
      return;
    }

    const visitors$ = this.visitorApi
      .listForPortalUser(user)
      .pipe(catchError(() => of([] as VisitorUi[])));

    // Staff (Facility Manager, accountant, etc.) are not billed as flat owners —
    // never call /bills/owner/... or /bills/.../pending for them.
    const bills$ = this.shouldLoadBills(user.role)
      ? this.billsApi.listOutstanding().pipe(catchError(() => of([] as BillRow[])))
      : of([] as BillRow[]);

    forkJoin({ visitors: visitors$, bills: bills$ }).subscribe(({ visitors, bills }) => {
      const built = this.buildFromApi(user.id, user.role, visitors, bills);
      this.notificationsSubject.next(this.applyReadState(user.id, built));
    });
  }

  /** Outstanding bills are resident-only (Owner / Tenant). */
  private shouldLoadBills(role: UserRole | string | undefined): boolean {
    const r = String(role || '').toUpperCase();
    return r === 'OWNER' || r === 'TENANT' || r === UserRole.OWNER || r === UserRole.TENANT;
  }

  private isResidentRole(role: UserRole): boolean {
    return this.shouldLoadBills(role);
  }

  markAsRead(id: string): void {
    const userId = this.auth.getCurrentUser()?.id;
    if (!userId) return;
    const readIds = this.loadReadIds(userId);
    readIds.add(id);
    this.saveReadIds(userId, readIds);
    this.patchReadFlag(id, true);
  }

  markAllAsRead(): void {
    const userId = this.auth.getCurrentUser()?.id;
    if (!userId) return;
    const allIds = this.notificationsSubject.value.map(n => n.id);
    this.saveReadIds(userId, new Set(allIds));
    this.notificationsSubject.next(
      this.notificationsSubject.value.map(n => ({ ...n, read: true }))
    );
  }

  private buildFromApi(
    userId: string,
    role: UserRole,
    visitors: VisitorUi[],
    bills: BillRow[]
  ): MobileNotification[] {
    const items: MobileNotification[] = [];
    const todayIso = new Date().toISOString().slice(0, 10);
    const isGuard = role === UserRole.GUARD || role === UserRole.SECURITY_STAFF;
    const seenVisitorIds = new Set<string>();

    const pushVisitor = (item: MobileNotification, visitorId: string): void => {
      if (seenVisitorIds.has(visitorId)) {
        return;
      }
      seenVisitorIds.add(visitorId);
      items.push({ ...item, visitorId });
    };

    if (isGuard) {
      // Guards: today's walk-ins / gate check-ins across the society.
      visitors
        .filter(
          v =>
            v.visitDateIso === todayIso &&
            (v.status === 'checked-in' || this.isWalkInVisitor(v))
        )
        .forEach(v => {
          pushVisitor(
            {
              id: `visitor-walkin-${v.id}`,
              title: 'Walk-in visitor today',
              message: `${v.name} · Flat ${v.flatNumber || '—'} · ${v.purpose || 'Gate entry'}`,
              type: 'info',
              category: 'visitor',
              timestamp: this.visitTimestamp(v.visitDateIso),
              read: false,
              actionUrl: this.visitorListPath(role),
              icon: 'directions_walk'
            },
            v.id
          );
        });
    } else {
      visitors
        .filter(v => v.status === 'pending' && (!v.hostId || v.hostId === userId))
        .forEach(v => {
          pushVisitor(
            {
              id: `visitor-pending-${v.id}`,
              title: 'Visitor pending approval',
              message: `${v.name} · ${v.purpose || 'Visit'} (${v.date})`,
              type: 'warning',
              category: 'visitor',
              timestamp: this.visitTimestamp(v.visitDateIso),
              read: false,
              actionUrl: this.visitorListPath(role),
              icon: 'person_add'
            },
            v.id
          );
        });

      visitors
        .filter(
          v =>
            v.hostId === userId &&
            (v.status === 'approved' || v.status === 'checked-in') &&
            v.visitDateIso === todayIso
        )
        .forEach(v => {
          pushVisitor(
            {
              id: `visitor-today-${v.id}`,
              title: v.status === 'checked-in' ? 'Visitor checked in today' : 'Visitor expected today',
              message:
                v.status === 'checked-in'
                  ? `${v.name} checked in at the gate`
                  : `${v.name} is expected today`,
              type: 'success',
              category: 'visitor',
              timestamp: this.visitTimestamp(v.visitDateIso),
              read: false,
              actionUrl: this.visitorListPath(role),
              icon: 'check_circle'
            },
            v.id
          );
        });
    }

    bills.forEach(b => {
      const amount = b.pendingAmount ?? b.totalAmount ?? 0;
      const overdue = String(b.paymentStatus).toUpperCase() === 'OVERDUE';
      items.push({
        id: `bill-${b.id}`,
        title: overdue ? 'Payment overdue' : 'Payment due',
        message: `${b.billType || 'Maintenance'}: ₹${amount.toLocaleString('en-IN')} · due ${b.dueDate || 'soon'}`,
        type: overdue ? 'error' : 'warning',
        category: 'payment',
        timestamp: b.dueDate ? new Date(`${b.dueDate}T12:00:00`) : new Date(),
        read: false,
        actionUrl: '/mobile/payments/pending',
        icon: 'receipt_long'
      });
    });

    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /** Walk-in / gate desk entries created by guards. */
  private isWalkInVisitor(v: VisitorUi): boolean {
    const purpose = (v.purpose || '').toLowerCase();
    return (
      purpose.includes('walk-in') ||
      purpose.includes('walk in') ||
      purpose.includes('gate photo') ||
      purpose.includes('gate entry')
    );
  }

  /** Role-aware list screen for visitor notification deep links. */
  private visitorListPath(role: UserRole): string {
    if (role === UserRole.GUARD || role === UserRole.SECURITY_STAFF) {
      return '/mobile/guard/visitor-approvals';
    }
    return '/mobile/visitors';
  }

  private visitTimestamp(visitDateIso: string): Date {
    if (visitDateIso) {
      const d = new Date(`${visitDateIso}T12:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  private readStorageKey(userId: string): string {
    return `poc:mobileNotifRead:${userId}`;
  }

  private loadReadIds(userId: string): Set<string> {
    try {
      const raw = localStorage.getItem(this.readStorageKey(userId));
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  private saveReadIds(userId: string, ids: Set<string>): void {
    localStorage.setItem(this.readStorageKey(userId), JSON.stringify([...ids]));
  }

  private applyReadState(userId: string, list: MobileNotification[]): MobileNotification[] {
    const readIds = this.loadReadIds(userId);
    return list.map(n => ({ ...n, read: readIds.has(n.id) }));
  }

  private patchReadFlag(id: string, read: boolean): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.map(n => (n.id === id ? { ...n, read } : n))
    );
  }
}
