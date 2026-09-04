import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SocietyRow, SocietySetupApiService } from '../../admin/pages/society-setup/society-setup-api.service';
import { SessionContextService } from '../../core/services/session-context.service';
import { ComplaintsApiService } from '../../core/services/complaints-api.service';
import { SosApiService } from '../../core/services/sos-api.service';
import { UserManagementService } from '../../modules/user-management/services/user-management.service';

interface SocietyCardData {
  society: SocietyRow;
  residents: number;
  flats: number;
  openComplaints: number;
  pendingDues: number;
  activeSos: number;
  loading: boolean;
  error: boolean;
}

/**
 * Cross-society overview for admins managing multiple societies — lists every
 * society with live stats and lets the admin switch the active one. Society
 * create/edit/delete/flat-count stays owned by Society Setup.
 */
@Component({
  selector: 'app-multi-society',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">apartment</i> Multi-Society Dashboard</h1>
        <p>Manage multiple societies centrally — compare and switch in one place</p>
      </div>

      <div *ngIf="!loading && !cards.length" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          No societies found. Create one in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>.
        </span>
      </div>

      <div class="toolbar">
        <button type="button" class="btn-secondary" (click)="load()" [disabled]="loading">
          <i class="material-icons">refresh</i> Refresh
        </button>
      </div>

      <div class="totals-row" *ngIf="cards.length">
        <div class="total-card">
          <span class="total-label">Societies</span>
          <span class="total-value">{{ cards.length }}</span>
        </div>
        <div class="total-card">
          <span class="total-label">Total Flats</span>
          <span class="total-value">{{ sum('flats') }}</span>
        </div>
        <div class="total-card">
          <span class="total-label">Total Residents</span>
          <span class="total-value">{{ sum('residents') }}</span>
        </div>
        <div class="total-card">
          <span class="total-label">Open Complaints</span>
          <span class="total-value">{{ sum('openComplaints') }}</span>
        </div>
        <div class="total-card">
          <span class="total-label">Pending Dues</span>
          <span class="total-value">{{ formatCurrency(sum('pendingDues')) }}</span>
        </div>
        <div class="total-card" [class.alert]="sum('activeSos') > 0">
          <span class="total-label">Active SOS</span>
          <span class="total-value">{{ sum('activeSos') }}</span>
        </div>
      </div>

      <div class="card-grid" *ngIf="cards.length">
        <div class="society-card" *ngFor="let c of cards" [class.active]="c.society.id === activeSocietyId">
          <div class="card-head">
            <h3>{{ c.society.name }}</h3>
            <span class="active-pill" *ngIf="c.society.id === activeSocietyId">Active</span>
          </div>
          <p class="address">{{ addressLine(c.society) }}</p>

          <p class="loading-hint" *ngIf="c.loading">Loading stats…</p>
          <p class="error-hint" *ngIf="c.error && !c.loading">Some stats failed to load.</p>

          <div class="stat-grid" *ngIf="!c.loading">
            <div class="stat">
              <i class="material-icons">home_work</i>
              <span class="stat-value">{{ c.flats }}</span>
              <span class="stat-label">Flats</span>
            </div>
            <div class="stat">
              <i class="material-icons">people</i>
              <span class="stat-value">{{ c.residents }}</span>
              <span class="stat-label">Residents</span>
            </div>
            <div class="stat">
              <i class="material-icons">report_problem</i>
              <span class="stat-value">{{ c.openComplaints }}</span>
              <span class="stat-label">Complaints</span>
            </div>
            <div class="stat">
              <i class="material-icons">receipt_long</i>
              <span class="stat-value">{{ formatCurrency(c.pendingDues) }}</span>
              <span class="stat-label">Dues</span>
            </div>
          </div>

          <div class="sos-flag" *ngIf="c.activeSos > 0">
            <i class="material-icons pulse">notifications_active</i>
            {{ c.activeSos }} active SOS
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-primary"
              [disabled]="c.society.id === activeSocietyId"
              (click)="switchTo(c.society)"
            >
              {{ c.society.id === activeSocietyId ? 'Currently active' : 'Switch to this society' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .module-page { padding: 24px; max-width: 1300px; }
      .page-header h1 { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 26px; color: #2c3e50; }
      .page-header p { margin: 0; color: #64748b; }
      .banner { display: flex; gap: 10px; padding: 14px 16px; border-radius: 10px; margin: 16px 0; }
      .banner.warn { background: #fffbeb; color: #92400e; }
      .inline-link { color: #667eea; font-weight: 600; }
      .toolbar { display: flex; gap: 12px; margin: 20px 0; }
      .btn-primary, .btn-secondary {
        display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
        border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 600;
      }
      .btn-primary { background: #3498db; color: #fff; width: 100%; justify-content: center; }
      .btn-primary:disabled { background: #a5d0ea; cursor: not-allowed; }
      .btn-secondary { background: #ecf0f1; color: #2c3e50; }

      .totals-row {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px;
      }
      .total-card {
        background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        display: flex; flex-direction: column; gap: 4px;
      }
      .total-card.alert { background: #fef2f2; }
      .total-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
      .total-value { font-size: 22px; font-weight: 700; color: #1e293b; }

      .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
      .society-card {
        background: white; border-radius: 14px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        border: 2px solid transparent; display: flex; flex-direction: column; gap: 12px;
      }
      .society-card.active { border-color: #3498db; }
      .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .card-head h3 { margin: 0; font-size: 18px; color: #1e293b; }
      .active-pill { background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
      .address { margin: 0; color: #64748b; font-size: 13px; min-height: 18px; }
      .loading-hint, .error-hint { color: #94a3b8; font-size: 13px; }
      .error-hint { color: #dc2626; }

      .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .stat { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px; background: #f8fafc; border-radius: 8px; }
      .stat .material-icons { color: #667eea; font-size: 18px; }
      .stat-value { font-size: 16px; font-weight: 700; color: #1e293b; }
      .stat-label { font-size: 11px; color: #64748b; }

      .sos-flag {
        display: flex; align-items: center; gap: 6px; color: #b91c1c; background: #fef2f2;
        padding: 8px 10px; border-radius: 8px; font-size: 13px; font-weight: 600;
      }
      .pulse { animation: pulse 1.2s infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    `
  ]
})
export class MultiSocietyComponent implements OnInit {
  cards: SocietyCardData[] = [];
  loading = false;
  activeSocietyId = '';

  constructor(
    private societyApi: SocietySetupApiService,
    private http: HttpClient,
    private session: SessionContextService,
    private complaintsApi: ComplaintsApiService,
    private sosApi: SosApiService,
    private users: UserManagementService
  ) {}

  ngOnInit(): void {
    this.activeSocietyId = this.session.getSocietyId() ?? '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.societyApi.listSocieties().subscribe({
      next: societies => {
        this.cards = societies.map(society => ({
          society,
          residents: 0,
          flats: 0,
          openComplaints: 0,
          pendingDues: 0,
          activeSos: 0,
          loading: true,
          error: false
        }));
        this.loading = false;
        this.cards.forEach(card => this.loadStatsFor(card));
      },
      error: () => {
        this.loading = false;
        this.cards = [];
      }
    });
  }

  private loadStatsFor(card: SocietyCardData): void {
    const societyId = card.society.id;
    const residents$ = this.http
      .get<unknown[]>('/users/current-society', { params: new HttpParams().set('societyId', societyId) })
      .pipe(
        map(rows => (rows ?? []).length),
        catchError(() => of(0))
      );
    const flats$ = this.users.listFlatsBySociety(societyId).pipe(map(rows => rows.length));
    const complaints$ = this.complaintsApi.listBySociety(societyId).pipe(
      map(rows => rows.filter(r => this.complaintsApi.isOpenStatus(r.status)).length),
      catchError(() => of(0))
    );
    const pendingBills$ = this.http
      .get<Array<{ pendingAmount?: number; pending_amount?: number }>>(`/bills/society/${encodeURIComponent(societyId)}/pending`)
      .pipe(
        map(rows => (rows ?? []).reduce((sum, r) => sum + Number(r.pendingAmount ?? r.pending_amount ?? 0), 0)),
        catchError(() => of(0))
      );
    const activeSos$ = this.sosApi.listBySociety(societyId).pipe(
      map(rows => rows.filter(r => this.sosApi.isOpen(r.status)).length),
      catchError(() => of(0))
    );

    forkJoin({
      residents: residents$,
      flats: flats$,
      openComplaints: complaints$,
      pendingDues: pendingBills$,
      activeSos: activeSos$
    }).subscribe({
      next: stats => {
        Object.assign(card, stats, { loading: false, error: false });
      },
      error: () => {
        card.loading = false;
        card.error = true;
      }
    });
  }

  switchTo(society: SocietyRow): void {
    sessionStorage.setItem('societyId', society.id);
    localStorage.setItem('societyId', society.id);
    window.location.href = '/admin/dashboard';
  }

  sum(key: 'flats' | 'residents' | 'openComplaints' | 'pendingDues' | 'activeSos'): number {
    return this.cards.reduce((s, c) => s + (c[key] || 0), 0);
  }

  addressLine(s: SocietyRow): string {
    return [s.address, s.city, s.state].filter(Boolean).join(', ');
  }

  formatCurrency(amount: number): string {
    if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(1)}K`;
    return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
  }
}
