import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IncidentReportService } from '../../../modules/guard-patrol/services/incident-report.service';
import {
  IncidentReport,
  IncidentReportStatistics,
  IncidentStatus
} from '../../../modules/guard-patrol/models/incident-report.model';

/**
 * Mobile guard screen — browse reported incidents and open details.
 */
@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="incident-list-page">
      <div class="page-header">
        <button class="back-btn" type="button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1><i class="material-icons">report_problem</i> Incidents</h1>
          <p>View and track reported incidents</p>
        </div>
        <button class="icon-btn" type="button" (click)="loadIncidents()" title="Refresh">
          <i class="material-icons">refresh</i>
        </button>
      </div>

      <div class="content">
        <div class="stats-row" *ngIf="statistics">
          <div class="stat-chip open">
            <span class="value">{{ statistics.openIncidents }}</span>
            <span class="label">Open</span>
          </div>
          <div class="stat-chip today">
            <span class="value">{{ statistics.incidentsToday }}</span>
            <span class="label">Today</span>
          </div>
          <div class="stat-chip total">
            <span class="value">{{ statistics.totalIncidents }}</span>
            <span class="label">Total</span>
          </div>
        </div>

        <div class="toolbar">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input
              type="text"
              placeholder="Search incidents..."
              [(ngModel)]="searchTerm"
              (input)="applySearch()" />
          </div>
          <label class="filter-toggle">
            <input type="checkbox" [(ngModel)]="showOpenOnly" (change)="applySearch()" />
            Open only
          </label>
        </div>

        <p class="hint" *ngIf="isLoading">Loading incidents…</p>
        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>

        <div class="incident-cards" *ngIf="!isLoading && filteredIncidents.length > 0">
          <button
            type="button"
            class="incident-card"
            *ngFor="let incident of filteredIncidents"
            (click)="openIncident(incident)">
            <div class="card-icon" [ngClass]="severityClass(incident.severity)">
              <i class="material-icons">warning</i>
            </div>
            <div class="card-body">
              <div class="card-top">
                <h3>{{ incident.title }}</h3>
                <span class="status-badge" [ngClass]="statusClass(incident.status)">
                  {{ formatStatus(incident.status) }}
                </span>
              </div>
              <p class="meta">{{ incident.incidentNumber }} • {{ incident.location }}</p>
              <p class="desc">{{ incident.description }}</p>
              <p class="time">
                <i class="material-icons">schedule</i>
                {{ formatDateTime(incident.incidentDateTime) }}
              </p>
            </div>
            <i class="material-icons chevron">chevron_right</i>
          </button>
        </div>

        <div class="empty" *ngIf="!isLoading && filteredIncidents.length === 0">
          <i class="material-icons">inbox</i>
          <h3>No incidents found</h3>
          <p>Report a new incident when something needs attention at the gate.</p>
        </div>
      </div>

      <button type="button" class="fab" (click)="reportNew()">
        <i class="material-icons">add</i>
        Report Incident
      </button>
    </div>
  `,
  styles: [`
    .incident-list-page {
      min-height: 100vh;
      background: #f5f7fa;
      padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px));
    }

    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .back-btn, .icon-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }

    .header-content { flex: 1; min-width: 0; }
    .header-content h1 {
      margin: 0;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-content p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }

    .content { padding: 12px; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .stat-chip {
      background: white;
      border-radius: 12px;
      padding: 10px 8px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .stat-chip .value {
      display: block;
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-chip .label {
      font-size: 11px;
      color: #7f8c8d;
    }

    .stat-chip.open .value { color: #e67e22; }
    .stat-chip.today .value { color: #667eea; }

    .toolbar { margin-bottom: 12px; }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .search-box input {
      border: none;
      outline: none;
      flex: 1;
      font-size: 14px;
    }

    .filter-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #666;
    }

    .hint, .error { font-size: 14px; margin: 8px 0; }
    .error { color: #c92a2a; }

    .incident-cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .incident-card {
      width: 100%;
      text-align: left;
      background: white;
      border: none;
      border-radius: 14px;
      padding: 14px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      box-shadow: 0 2px 10px rgba(0,0,0,0.07);
      cursor: pointer;
    }

    .card-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #fff3e0;
      color: #e65100;
    }

    .card-icon.severity-critical { background: #ffebee; color: #c62828; }
    .card-icon.severity-high { background: #fff3e0; color: #ef6c00; }
    .card-icon.severity-medium { background: #e3f2fd; color: #1565c0; }
    .card-icon.severity-low { background: #e8f5e9; color: #2e7d32; }

    .card-body { flex: 1; min-width: 0; }

    .card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 4px;
    }

    .card-top h3 {
      margin: 0;
      font-size: 15px;
      color: #2c3e50;
      line-height: 1.3;
    }

    .status-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      white-space: nowrap;
      background: #eef2ff;
      color: #4338ca;
    }

    .status-badge.status-reported { background: #fff3e0; color: #e65100; }
    .status-badge.status-under_investigation { background: #e3f2fd; color: #1565c0; }
    .status-badge.status-resolved,
    .status-badge.status-closed { background: #e8f5e9; color: #2e7d32; }

    .meta, .desc, .time {
      margin: 0 0 4px;
      font-size: 12px;
      color: #64748b;
    }

    .desc {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .time {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
    }

    .time .material-icons { font-size: 14px; }

    .chevron { color: #cbd5e1; margin-top: 8px; }

    .empty {
      text-align: center;
      padding: 40px 16px;
      color: #94a3b8;
    }

    .empty .material-icons { font-size: 48px; margin-bottom: 8px; }
    .empty h3 { margin: 0 0 8px; color: #64748b; }

    .fab {
      position: fixed;
      right: 16px;
      bottom: calc(84px + env(safe-area-inset-bottom, 0px));
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 28px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.45);
      cursor: pointer;
      z-index: 50;
    }
  `]
})
export class IncidentListComponent implements OnInit {
  incidents: IncidentReport[] = [];
  filteredIncidents: IncidentReport[] = [];
  statistics: IncidentReportStatistics | null = null;
  searchTerm = '';
  showOpenOnly = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private incidentService: IncidentReportService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadIncidents();
  }

  /** Load incidents and summary stats from API. */
  loadIncidents(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.incidentService.getAllIncidents().subscribe({
      next: incidents => {
        this.incidents = incidents;
        this.applySearch();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load incidents.';
        this.isLoading = false;
      }
    });
    this.incidentService.getStatistics().subscribe({
      next: stats => (this.statistics = stats)
    });
  }

  applySearch(): void {
    let list = [...this.incidents];
    if (this.showOpenOnly) {
      list = list.filter(
        i =>
          i.status === IncidentStatus.REPORTED ||
          i.status === IncidentStatus.UNDER_INVESTIGATION ||
          i.status === IncidentStatus.ESCALATED
      );
    }
    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.incidentNumber.toLowerCase().includes(q)
      );
    }
    this.filteredIncidents = list;
  }

  openIncident(incident: IncidentReport): void {
    this.router.navigate(['/mobile/guard/incidents', incident.id]);
  }

  reportNew(): void {
    this.router.navigate(['/mobile/guard/incidents/report']);
  }

  goBack(): void {
    this.router.navigate(['/mobile/guard/dashboard']);
  }

  severityClass(severity: string): string {
    return `severity-${(severity || 'medium').toLowerCase()}`;
  }

  statusClass(status: string): string {
    return `status-${(status || 'reported').toLowerCase()}`;
  }

  formatStatus(status: string): string {
    return (status || '').replace(/_/g, ' ');
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
