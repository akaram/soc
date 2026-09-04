import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../core/services/session-context.service';
import { BillRow } from '../../core/services/bills-api.service';
import { ComplaintsApiService } from '../../core/services/complaints-api.service';
import { VisitorApiService } from '../../mobile/features/visitors/visitor-api.service';
import { UserManagementService } from '../../modules/user-management/services/user-management.service';
import { UserStatus, VerificationStatus } from '../../modules/user-management/models/user.model';

/** One stat card on the admin home dashboard. */
export interface AdminDashboardStat {
  icon: string;
  label: string;
  value: string;
  color: string;
  /** Optional trend vs prior period; omitted when unknown. */
  change?: number;
  route?: string;
}

export interface AdminDashboardVisitorRow {
  id: string;
  name: string;
  flatNumber: string;
  purpose: string;
  time: string;
  status: string;
}

export interface AdminDashboardTask {
  title: string;
  time: string;
  icon: string;
  color: string;
  route?: string;
  /** True for “all caught up” placeholder — not counted as actionable work. */
  placeholder?: boolean;
}

export interface AdminDashboardPaymentSummary {
  collected: number;
  pending: number;
  overdue: number;
}

export interface AdminDashboardData {
  societyName: string;
  stats: AdminDashboardStat[];
  recentVisitors: AdminDashboardVisitorRow[];
  pendingTasks: AdminDashboardTask[];
  payments: AdminDashboardPaymentSummary;
}

/**
 * Loads live admin dashboard metrics from Spring Boot APIs for the active society.
 */
@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService,
    private users: UserManagementService,
    private visitors: VisitorApiService,
    private complaintsApi: ComplaintsApiService
  ) {}

  load(): Observable<AdminDashboardData> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of(this.emptyDashboard('No society selected — open Society Setup'));
    }

    const society$ = this.http.get<{ name?: string }>(`/societies/${encodeURIComponent(societyId)}`).pipe(
      catchError(() => of({ name: 'Your Society' }))
    );
    const flats$ = this.users.listFlatsBySociety(societyId).pipe(catchError(() => of([])));
    const users$ = this.users.getAllUsers().pipe(catchError(() => of([])));
    const visitors$ = this.visitors.listBySociety(societyId).pipe(catchError(() => of([])));
    const allBills$ = this.http
      .get<unknown[]>(`/bills/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeBill(r))),
        catchError(() => of([] as BillRow[]))
      );
    const pendingBills$ = this.http
      .get<unknown[]>(`/bills/society/${encodeURIComponent(societyId)}/pending`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeBill(r))),
        catchError(() => of([] as BillRow[]))
      );
    const overdueBills$ = this.http
      .get<unknown[]>(`/bills/society/${encodeURIComponent(societyId)}/overdue`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeBill(r))),
        catchError(() => of([] as BillRow[]))
      );
    const complaints$ = this.complaintsApi.listBySociety(societyId).pipe(catchError(() => of([])));

    return forkJoin({
      society: society$,
      flats: flats$,
      users: users$,
      visitors: visitors$,
      allBills: allBills$,
      pendingBills: pendingBills$,
      overdueBills: overdueBills$,
      complaints: complaints$
    }).pipe(
      map(({ society, flats, users, visitors, allBills, pendingBills, overdueBills, complaints }) => {
        const today = this.todayIso();
        const yesterday = this.offsetDayIso(-1);
        const visitorsToday = visitors.filter(v => v.visitDateIso === today);
        const visitorsYesterday = visitors.filter(v => v.visitDateIso === yesterday);
        const visitorTrend = this.percentChange(visitorsYesterday.length, visitorsToday.length);

        const residents = users.filter(
          u => u.status === UserStatus.ACTIVE || u.status === UserStatus.PENDING
        );
        const pendingApprovals = users.filter(u => u.verificationStatus === VerificationStatus.PENDING);
        const openComplaints = complaints.filter(c => this.complaintsApi.isOpenStatus(c.status));

        const pendingTotal = pendingBills.reduce((s, b) => s + (b.pendingAmount || 0), 0);
        const collectedTotal = allBills.reduce((s, b) => s + (b.paidAmount || 0), 0);
        const overdueTotal = overdueBills.reduce((s, b) => s + (b.pendingAmount || 0), 0);

        const stats: AdminDashboardStat[] = [
          {
            icon: 'apartment',
            label: 'Total Flats',
            value: String(flats.length),
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            route: '/admin/societies'
          },
          {
            icon: 'people',
            label: 'Residents',
            value: this.formatCount(residents.length),
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            route: '/admin/users-list'
          },
          {
            icon: 'person_add',
            label: 'Visitors Today',
            value: String(visitorsToday.length),
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            change: visitorTrend,
            route: '/admin/visitors'
          },
          {
            icon: 'receipt_long',
            label: 'Pending Bills',
            value: this.formatCurrency(pendingTotal),
            color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            route: '/admin/billing'
          }
        ];

        const recentVisitors = visitors
          .slice()
          .sort((a, b) => (b.visitDateIso + b.time).localeCompare(a.visitDateIso + a.time))
          .slice(0, 5)
          .map(v => ({
            id: v.id,
            name: v.name || 'Visitor',
            flatNumber: v.flatNumber || '—',
            purpose: v.purpose || 'Visit',
            time: v.date === 'Today' ? (v.time || 'Today') : `${v.date}${v.time ? ' · ' + v.time : ''}`.trim(),
            status: this.mapVisitorStatus(v.status)
          }));

        const pendingTasks: AdminDashboardTask[] = [];
        if (pendingApprovals.length) {
          pendingTasks.push({
            title: `Approve ${pendingApprovals.length} user registration(s)`,
            time: 'Pending verification',
            icon: 'person_add',
            color: '#3498db',
            route: '/admin/users-list'
          });
        }
        if (openComplaints.length) {
          pendingTasks.push({
            title: `${openComplaints.length} open complaint(s)`,
            time: 'Needs attention',
            icon: 'report_problem',
            color: '#e74c3c',
            route: '/admin/complaints'
          });
        }
        if (overdueBills.length) {
          pendingTasks.push({
            title: `${overdueBills.length} overdue bill(s)`,
            time: this.formatCurrency(overdueTotal),
            icon: 'payment',
            color: '#f39c12',
            route: '/admin/billing'
          });
        }
        if (!pendingTasks.length) {
          pendingTasks.push({
            title: 'No pending admin tasks',
            time: 'All caught up',
            icon: 'check_circle',
            color: '#28a745',
            placeholder: true
          });
        }

        return {
          societyName: society.name?.trim() || 'Your Society',
          stats,
          recentVisitors,
          pendingTasks,
          payments: {
            collected: collectedTotal,
            pending: pendingTotal,
            overdue: overdueTotal
          }
        };
      })
    );
  }

  private emptyDashboard(message: string): AdminDashboardData {
    return {
      societyName: message,
      stats: [
        {
          icon: 'apartment',
          label: 'Total Flats',
          value: '—',
          color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          route: '/admin/societies'
        },
        {
          icon: 'people',
          label: 'Residents',
          value: '—',
          color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          route: '/admin/users-list'
        },
        {
          icon: 'person_add',
          label: 'Visitors Today',
          value: '—',
          color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          route: '/admin/visitors'
        },
        {
          icon: 'receipt_long',
          label: 'Pending Bills',
          value: '—',
          color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          route: '/admin/billing'
        }
      ],
      recentVisitors: [],
      pendingTasks: [
        {
          title: 'Select a society in Society Setup',
          time: 'Required for live stats',
          icon: 'domain_add',
          color: '#3498db',
          route: '/admin/societies'
        }
      ],
      payments: { collected: 0, pending: 0, overdue: 0 }
    };
  }

  /** Mirror BillsApiService normalization for admin society-wide queries. */
  private normalizeBill(raw: unknown): BillRow {
    const r = raw as Record<string, unknown>;
    const num = (v: unknown) => (v == null ? 0 : Number(v));
    return {
      id: String(r['id'] ?? ''),
      billNumber: String(r['billNumber'] ?? r['bill_number'] ?? ''),
      societyId: String(r['societyId'] ?? r['society_id'] ?? ''),
      flatId: String(r['flatId'] ?? r['flat_id'] ?? ''),
      ownerId: String(r['ownerId'] ?? r['owner_id'] ?? ''),
      billType: String(r['billType'] ?? r['bill_type'] ?? 'OTHER'),
      dueDate: String(r['dueDate'] ?? r['due_date'] ?? ''),
      totalAmount: num(r['totalAmount'] ?? r['total_amount']),
      paidAmount: num(r['paidAmount'] ?? r['paid_amount']),
      pendingAmount: num(r['pendingAmount'] ?? r['pending_amount']),
      paymentStatus: String(r['paymentStatus'] ?? r['payment_status'] ?? 'PENDING'),
      status: String(r['status'] ?? 'DRAFT')
    };
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private offsetDayIso(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private percentChange(previous: number, current: number): number | undefined {
    if (previous === 0 && current === 0) {
      return undefined;
    }
    if (previous === 0) {
      return 100;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  private mapVisitorStatus(status: string): string {
    switch (status) {
      case 'checked-in':
        return 'checked-in';
      case 'checked-out':
        return 'checked-out';
      case 'rejected':
        return 'rejected';
      case 'approved':
        return 'approved';
      default:
        return 'pending';
    }
  }

  private formatCount(n: number): string {
    return n.toLocaleString('en-IN');
  }

  private formatCurrency(amount: number): string {
    if (amount >= 100000) {
      return `₹ ${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹ ${(amount / 1000).toFixed(1)}K`;
    }
    return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
  }
}
