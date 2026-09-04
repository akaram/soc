import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnalyticsService, AnalyticsSummary } from '../../services/analytics.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import { SvgBarChartComponent } from '../../../shared/charts/svg-bar-chart.component';
import { SvgDonutChartComponent } from '../../../shared/charts/svg-donut-chart.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, SvgBarChartComponent, SvgDonutChartComponent],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">analytics</i> Analytics</h1>
        <p>Live insights across billing, occupancy, complaints, visitors and security</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>
          to view analytics.
        </span>
      </div>

      <ng-container *ngIf="societyId">
        <p class="loading-hint" *ngIf="loading">Loading analytics…</p>

        <ng-container *ngIf="!loading && summary as s">
          <div class="stat-row">
            <div class="stat-card">
              <i class="material-icons">home_work</i>
              <div>
                <span class="stat-value">{{ s.totalFlats }}</span>
                <span class="stat-label">Total Flats</span>
              </div>
            </div>
            <div class="stat-card">
              <i class="material-icons">meeting_room</i>
              <div>
                <span class="stat-value">{{ s.occupiedFlats }} / {{ s.vacantFlats }}</span>
                <span class="stat-label">Occupied / Vacant</span>
              </div>
            </div>
            <div class="stat-card">
              <i class="material-icons">people</i>
              <div>
                <span class="stat-value">{{ s.totalResidents }}</span>
                <span class="stat-label">Residents</span>
              </div>
            </div>
            <div class="stat-card">
              <i class="material-icons">payments</i>
              <div>
                <span class="stat-value">{{ formatCurrency(s.collectedTotal) }}</span>
                <span class="stat-label">Collected</span>
              </div>
            </div>
            <div class="stat-card warn">
              <i class="material-icons">schedule</i>
              <div>
                <span class="stat-value">{{ formatCurrency(s.pendingTotal) }}</span>
                <span class="stat-label">Pending</span>
              </div>
            </div>
            <div class="stat-card danger">
              <i class="material-icons">warning</i>
              <div>
                <span class="stat-value">{{ formatCurrency(s.overdueTotal) }}</span>
                <span class="stat-label">Overdue</span>
              </div>
            </div>
          </div>

          <div class="chart-grid">
            <div class="chart-card wide">
              <h3>Revenue collected — last 6 months</h3>
              <app-svg-bar-chart [data]="s.revenueTrend" [formatValue]="formatCurrency"></app-svg-bar-chart>
            </div>

            <div class="chart-card wide">
              <h3>Visitor traffic — last 7 days</h3>
              <app-svg-bar-chart [data]="s.visitorTraffic"></app-svg-bar-chart>
            </div>

            <div class="chart-card">
              <h3>Complaints by status</h3>
              <app-svg-donut-chart [data]="s.complaintsByStatus"></app-svg-donut-chart>
            </div>

            <div class="chart-card">
              <h3>SOS alerts by status</h3>
              <app-svg-donut-chart [data]="s.sosByStatus"></app-svg-donut-chart>
            </div>

            <div class="chart-card wide">
              <h3>Complaints by category</h3>
              <app-svg-bar-chart [data]="s.complaintsByCategory"></app-svg-bar-chart>
            </div>
          </div>
        </ng-container>
      </ng-container>
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
      .loading-hint { color: #64748b; padding: 24px 0; }

      .stat-row {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin: 20px 0 24px;
      }
      .stat-card {
        background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        display: flex; align-items: center; gap: 12px;
      }
      .stat-card.warn { background: #fffbeb; }
      .stat-card.danger { background: #fef2f2; }
      .stat-card .material-icons { color: #667eea; font-size: 28px; }
      .stat-card > div { display: flex; flex-direction: column; }
      .stat-value { font-size: 18px; font-weight: 700; color: #1e293b; }
      .stat-label { font-size: 12px; color: #64748b; }

      .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; }
      .chart-card { background: white; border-radius: 14px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
      .chart-card.wide { grid-column: span 2; }
      @media (max-width: 900px) { .chart-card.wide { grid-column: span 1; } }
      .chart-card h3 { margin: 0 0 16px; font-size: 15px; color: #1e293b; }
    `
  ]
})
export class AnalyticsComponent implements OnInit {
  societyId = '';
  loading = false;
  summary: AnalyticsSummary | null = null;

  constructor(
    private analytics: AnalyticsService,
    private session: SessionContextService
  ) {}

  ngOnInit(): void {
    this.societyId = this.session.getSocietyId() ?? '';
    if (this.societyId) {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.analytics.load().subscribe({
      next: summary => {
        this.summary = summary;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  formatCurrency = (amount: number): string => {
    if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(1)}K`;
    return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
  };
}
