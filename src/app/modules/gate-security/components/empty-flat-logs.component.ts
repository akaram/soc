import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { InvestigationService } from '../services/investigation.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  EmptyFlatLog,
  EmptyFlatStatus,
  EmptyFlatLogFilter,
  EmptyFlatStatistics,
  CreateEmptyFlatLogRequest,
  UpdateEmptyFlatLogRequest
} from '../models/investigation.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-empty-flat-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="empty-flat-logs-container">
      <div class="page-header">
        <h1><i class="material-icons">apartment</i> Empty Flat Logs</h1>
        <p>Track and monitor empty/vacant flats for security purposes</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Live data from <strong>/empty-flat-logs</strong> API — no demo records.</span>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">apartment</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalEmptyFlats }}</div>
            <div class="stat-label">Total Empty Flats</div>
          </div>
        </div>
        <div class="stat-card vacant">
          <div class="stat-icon">
            <i class="material-icons">home</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.vacantFlats }}</div>
            <div class="stat-label">Vacant</div>
          </div>
        </div>
        <div class="stat-card renovation">
          <div class="stat-icon">
            <i class="material-icons">build</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.underRenovation }}</div>
            <div class="stat-label">Under Renovation</div>
          </div>
        </div>
        <div class="stat-card investigation">
          <div class="stat-icon">
            <i class="material-icons">search</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.underInvestigation }}</div>
            <div class="stat-label">Under Investigation</div>
          </div>
        </div>
        <div class="stat-card risk">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.highRiskFlats }}</div>
            <div class="stat-label">High Risk</div>
          </div>
        </div>
        <div class="stat-card duration">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatDays(statistics.averageVacancyDuration) }}</div>
            <div class="stat-label">Avg Vacancy Days</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Add Empty Flat Log
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search by flat number, owner, building..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="EmptyFlatStatus.VACANT">Vacant</option>
            <option [value]="EmptyFlatStatus.OCCUPIED">Occupied</option>
            <option [value]="EmptyFlatStatus.UNDER_RENOVATION">Under Renovation</option>
            <option [value]="EmptyFlatStatus.LOCKED">Locked</option>
            <option [value]="EmptyFlatStatus.UNKNOWN">Unknown</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Risk Level</label>
          <select [(ngModel)]="filter.riskLevel" (change)="applyFilters()" class="filter-select">
            <option value="">All Risk Levels</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div class="filter-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filter.isUnderInvestigation"
              (change)="applyFilters()">
            Under Investigation Only
          </label>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Empty Flat Logs Table -->
      <div class="logs-table" *ngIf="!isLoading && logs.length > 0">
        <table>
          <thead>
            <tr>
              <th>Flat Number</th>
              <th>Building</th>
              <th>Status</th>
              <th>Owner/Tenant</th>
              <th>Days Empty</th>
              <th>Risk Level</th>
              <th>Last Checked</th>
              <th>Investigation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              *ngFor="let log of logs" 
              [ngClass]="getRiskClass(log.riskLevel || 'LOW')">
              <td>
                <div class="flat-cell">
                  <strong>{{ log.flatNumber }}</strong>
                  <span *ngIf="log.unitNumber" class="unit-number">{{ log.unitNumber }}</span>
                </div>
              </td>
              <td>{{ log.buildingName || '-' }}</td>
              <td>
                <span class="status-badge" [ngClass]="getStatusClass(log.status)">
                  {{ getStatusLabel(log.status) }}
                </span>
              </td>
              <td>
                <div class="owner-cell">
                  <div *ngIf="log.ownerName">{{ log.ownerName }}</div>
                  <div *ngIf="log.tenantName" class="tenant-label">Tenant: {{ log.tenantName }}</div>
                </div>
              </td>
              <td>
                <span class="days-badge">{{ calculateDaysEmpty(log) }} days</span>
              </td>
              <td>
                <span class="risk-badge" [ngClass]="getRiskClass(log.riskLevel || 'LOW')">
                  {{ log.riskLevel || 'LOW' }}
                </span>
              </td>
              <td>
                <div class="date-cell">
                  <div>{{ formatDate(log.lastCheckedAt) }}</div>
                  <div class="date-sub" *ngIf="log.checkHistory && log.checkHistory.length > 0">
                    {{ log.checkHistory.length }} checks
                  </div>
                </div>
              </td>
              <td>
                <span class="investigation-badge" *ngIf="log.isUnderInvestigation">
                  <i class="material-icons">search</i>
                  Yes
                </span>
                <span class="no-investigation" *ngIf="!log.isUnderInvestigation">-</span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action" (click)="viewLog(log)" title="View Details">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="btn-action" (click)="addCheck(log)" title="Add Check">
                    <i class="material-icons">check_circle</i>
                  </button>
                  <button 
                    class="btn-action" 
                    (click)="linkInvestigation(log)"
                    *ngIf="!log.isUnderInvestigation"
                    title="Link Investigation">
                    <i class="material-icons">link</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && logs.length === 0">
        <i class="material-icons">apartment</i>
        <p>No empty flat logs found</p>
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Add First Log
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading logs...</p>
      </div>
    </div>
  `,
  styles: [`
    .empty-flat-logs-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .api-banner {
      margin-top: 12px;
      padding: 10px 14px;
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #2e7d32;
    }

    .api-banner .material-icons {
      font-size: 18px;
    }

    .load-error {
      margin-bottom: 16px;
      padding: 12px 16px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #856404;
      font-size: 14px;
    }

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card.vacant .stat-icon {
      background: #dc3545;
    }

    .stat-card.renovation .stat-icon {
      background: #ffc107;
    }

    .stat-card.investigation .stat-icon {
      background: #17a2b8;
    }

    .stat-card.risk .stat-icon {
      background: #fd7e14;
    }

    .stat-card.duration .stat-icon {
      background: #6f42c1;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .btn-primary {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .search-filter {
      flex: 1;
      max-width: 400px;
    }

    .search-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .filters-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: flex-end;
    }

    .filter-group {
      flex: 1;
      min-width: 180px;
    }

    .filter-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
    }

    .filter-group label input[type="checkbox"] {
      margin-right: 8px;
    }

    .filter-select {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .btn-clear {
      padding: 10px 20px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-clear:hover {
      background: #e0e0e0;
    }

    .logs-table {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f8f9fa;
    }

    th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
      border-bottom: 2px solid #e0e0e0;
    }

    tbody tr {
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.2s;
    }

    tbody tr:hover {
      background: #f8f9fa;
    }

    tbody tr.high {
      border-left: 4px solid #dc3545;
    }

    tbody tr.medium {
      border-left: 4px solid #ffc107;
    }

    tbody tr.low {
      border-left: 4px solid #28a745;
    }

    td {
      padding: 16px;
      font-size: 14px;
      color: #2c3e50;
    }

    .flat-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .unit-number {
      font-size: 11px;
      color: #7f8c8d;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.vacant {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.occupied {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.under_renovation {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.locked {
      background: #e2e3e5;
      color: #383d41;
    }

    .status-badge.unknown {
      background: #d1ecf1;
      color: #0c5460;
    }

    .owner-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tenant-label {
      font-size: 11px;
      color: #7f8c8d;
    }

    .days-badge {
      padding: 4px 8px;
      background: #e7f3ff;
      color: #004085;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .risk-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .risk-badge.high {
      background: #f8d7da;
      color: #721c24;
    }

    .risk-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .risk-badge.low {
      background: #d4edda;
      color: #155724;
    }

    .investigation-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #d1ecf1;
      color: #0c5460;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .investigation-badge .material-icons {
      font-size: 16px;
    }

    .no-investigation {
      color: #7f8c8d;
      font-size: 12px;
    }

    .date-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .date-sub {
      font-size: 11px;
      color: #7f8c8d;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #e0e0e0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-action:hover {
      background: #e0e0e0;
      transform: scale(1.1);
    }

    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      color: #ddd;
    }

    @media (max-width: 1024px) {
      .logs-table {
        overflow-x: auto;
      }

      table {
        min-width: 1200px;
      }
    }
  `]
})
export class EmptyFlatLogsComponent implements OnInit, OnDestroy {
  logs: EmptyFlatLog[] = [];
  statistics: EmptyFlatStatistics | null = null;
  isLoading = false;
  loadError = '';
  filter: EmptyFlatLogFilter = {};

  EmptyFlatStatus = EmptyFlatStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private investigationService: InvestigationService,
    private session: SessionContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLogs();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.loadError = '';

    const societyId = localStorage.getItem('societyId') ||
      (() => {
        try {
          const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
          return raw ? JSON.parse(raw).societyId : '';
        } catch { return ''; }
      })();

    if (!societyId) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.logs = [];
      this.statistics = null;
      return;
    }

    this.investigationService.getAllEmptyFlatLogs(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (logs) => {
          this.logs = logs;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading logs:', error);
          this.loadError = 'Failed to load empty flat logs from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.investigationService.getEmptyFlatStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
        }
      });
  }

  applyFilters(): void {
    this.loadLogs();
  }

  clearFilters(): void {
    this.filter = {};
    this.loadLogs();
  }

  openAddForm(): void {
    // Navigate to add form or open modal
    alert('Add empty flat log form - to be implemented');
  }

  viewLog(log: EmptyFlatLog): void {
    // Show details modal or navigate to detail page
    alert(`View details for ${log.flatNumber} - to be implemented`);
  }

  addCheck(log: EmptyFlatLog): void {
    const observations = prompt('Enter observations:');
    if (observations) {
      this.investigationService.addFlatCheck(log.id, this.session.getCurrentUserId(), log.status, observations)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadLogs();
            }
          },
          error: (error) => {
            console.error('Error adding check:', error);
          }
        });
    }
  }

  linkInvestigation(log: EmptyFlatLog): void {
    // Link to investigation - show list of investigations
    alert('Link investigation - to be implemented');
  }

  calculateDaysEmpty(log: EmptyFlatLog): number {
    const now = new Date();
    const days = Math.floor((now.getTime() - log.firstDetectedAt.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  }

  getStatusClass(status: EmptyFlatStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: EmptyFlatStatus): string {
    const labels: { [key: string]: string } = {
      'VACANT': 'Vacant',
      'OCCUPIED': 'Occupied',
      'UNDER_RENOVATION': 'Under Renovation',
      'LOCKED': 'Locked',
      'UNKNOWN': 'Unknown'
    };
    return labels[status] || status;
  }

  getRiskClass(riskLevel: string): string {
    return riskLevel.toLowerCase();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatDays(days: number): string {
    return Math.round(days).toString();
  }
}
















































