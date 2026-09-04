import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../core/services/session-context.service';
import { BillRow } from '../../core/services/bills-api.service';
import { ComplaintsApiService } from '../../core/services/complaints-api.service';
import { VisitorApiService } from '../../mobile/features/visitors/visitor-api.service';
import { UserManagementService } from '../../modules/user-management/services/user-management.service';
import { SosApiService } from '../../core/services/sos-api.service';
import { ChartDatum } from '../../shared/charts/chart-types';

export interface AnalyticsSummary {
  totalFlats: number;
  occupiedFlats: number;
  vacantFlats: number;
  totalResidents: number;
  collectedTotal: number;
  pendingTotal: number;
  overdueTotal: number;
  revenueTrend: ChartDatum[];
  complaintsByStatus: ChartDatum[];
  complaintsByCategory: ChartDatum[];
  visitorTraffic: ChartDatum[];
  sosByStatus: ChartDatum[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#f5576c',
  IN_PROGRESS: '#f39c12',
  RESOLVED: '#43e97b',
  CLOSED: '#94a3b8',
  ACTIVE: '#f5576c',
  ACKNOWLEDGED: '#f39c12',
  CANCELLED: '#94a3b8'
};

/**
 * Client-side analytics aggregation for the active society — same forkJoin-of-
 * existing-APIs approach as AdminDashboardService, just grouped/bucketed for charts.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService,
    private users: UserManagementService,
    private visitors: VisitorApiService,
    private complaintsApi: ComplaintsApiService,
    private sosApi: SosApiService
  ) {}

  load(): Observable<AnalyticsSummary | null> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of(null);
    }

    const flats$ = this.users.listFlatsBySociety(societyId).pipe(catchError(() => of([])));
    const usersAll$ = this.users.getAllUsers().pipe(catchError(() => of([])));
    const visitorsAll$ = this.visitors.listBySociety(societyId).pipe(catchError(() => of([])));
    const complaints$ = this.complaintsApi.listBySociety(societyId).pipe(catchError(() => of([])));
    const sos$ = this.sosApi.listBySociety(societyId).pipe(catchError(() => of([])));
    const allBills$ = this.http.get<unknown[]>(`/bills/society/${encodeURIComponent(societyId)}`).pipe(
      map(rows => (rows ?? []).map(r => this.normalizeBill(r))),
      catchError(() => of([] as BillRow[]))
    );
    const pendingBills$ = this.http.get<unknown[]>(`/bills/society/${encodeURIComponent(societyId)}/pending`).pipe(
      map(rows => (rows ?? []).map(r => this.normalizeBill(r))),
      catchError(() => of([] as BillRow[]))
    );
    const overdueBills$ = this.http.get<unknown[]>(`/bills/society/${encodeURIComponent(societyId)}/overdue`).pipe(
      map(rows => (rows ?? []).map(r => this.normalizeBill(r))),
      catchError(() => of([] as BillRow[]))
    );

    return forkJoin({
      flats: flats$,
      usersAll: usersAll$,
      visitorsAll: visitorsAll$,
      complaints: complaints$,
      sos: sos$,
      allBills: allBills$,
      pendingBills: pendingBills$,
      overdueBills: overdueBills$
    }).pipe(
      map(({ flats, usersAll, visitorsAll, complaints, sos, allBills, pendingBills, overdueBills }) => {
        const occupiedFlatIds = new Set(usersAll.map((u: any) => u.flatId).filter(Boolean));

        return {
          totalFlats: flats.length,
          occupiedFlats: occupiedFlatIds.size,
          vacantFlats: Math.max(0, flats.length - occupiedFlatIds.size),
          totalResidents: usersAll.length,
          collectedTotal: allBills.reduce((s, b) => s + (b.paidAmount || 0), 0),
          pendingTotal: pendingBills.reduce((s, b) => s + (b.pendingAmount || 0), 0),
          overdueTotal: overdueBills.reduce((s, b) => s + (b.pendingAmount || 0), 0),
          revenueTrend: this.buildRevenueTrend(allBills),
          complaintsByStatus: this.groupBy(complaints, c => c.status),
          complaintsByCategory: this.groupBy(complaints, c => c.category || 'Other'),
          visitorTraffic: this.buildVisitorTrend(visitorsAll),
          sosByStatus: this.groupBy(sos, s2 => s2.status)
        };
      })
    );
  }

  private buildRevenueTrend(bills: BillRow[]): ChartDatum[] {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }) });
    }
    const totals = new Map(months.map(m => [m.key, 0]));
    for (const b of bills) {
      if (!b.dueDate) continue;
      const d = new Date(b.dueDate);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) || 0) + (b.paidAmount || 0));
      }
    }
    return months.map(m => ({ label: m.label, value: Math.round(totals.get(m.key) || 0) }));
  }

  private buildVisitorTrend(visitors: Array<{ visitDateIso: string }>): ChartDatum[] {
    const days: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { weekday: 'short' }) });
    }
    const counts = new Map(days.map(d => [d.key, 0]));
    for (const v of visitors) {
      if (counts.has(v.visitDateIso)) {
        counts.set(v.visitDateIso, (counts.get(v.visitDateIso) || 0) + 1);
      }
    }
    return days.map(d => ({ label: d.label, value: counts.get(d.key) || 0 }));
  }

  private groupBy<T>(rows: T[], keyFn: (row: T) => string): ChartDatum[] {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = (keyFn(row) || 'Other').toString();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, value]) => ({
      label: this.titleCase(label),
      value,
      color: STATUS_COLORS[label.toUpperCase()]
    }));
  }

  private titleCase(s: string): string {
    return s
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

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
}
