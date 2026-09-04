import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MissedPatrolAlertService } from '../services/missed-patrol-alert.service';
import {
  MissedPatrolAlert,
  AlertSeverity,
  AlertStatus,
  MissedPatrolReason,
  MissedPatrolAlertFilter,
  MissedPatrolAlertStatistics
} from '../models/missed-patrol-alert.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-missed-patrol-alerts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="missed-patrol-alerts-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">warning</i>
          Missed Patrol Alerts & Notifications
        </h1>
        <p>Monitor and manage missed patrol alerts and notifications</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalAlerts }}</div>
            <div class="stat-label">Total Alerts</div>
            <div class="stat-subtext">{{ statistics.alertsToday }} today</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.pendingAlerts }}</div>
            <div class="stat-label">Pending</div>
            <div class="stat-subtext">Requires attention</div>
          </div>
        </div>
        <div class="stat-card critical">
          <div class="stat-icon">
            <i class="material-icons">error</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.bySeverity['CRITICAL'] || 0 }}</div>
            <div class="stat-label">Critical</div>
            <div class="stat-subtext">Urgent action needed</div>
          </div>
        </div>
        <div class="stat-card resolved">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.resolvedAlerts }}</div>
            <div class="stat-label">Resolved</div>
            <div class="stat-subtext">{{ statistics.averageResolutionTime ? statistics.averageResolutionTime + 'h avg' : 'N/A' }}</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search alerts..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
        <button class="btn-refresh" (click)="loadData()">
          <i class="material-icons">refresh</i>
          Refresh
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="AlertStatus.PENDING">Pending</option>
            <option [value]="AlertStatus.ACKNOWLEDGED">Acknowledged</option>
            <option [value]="AlertStatus.RESOLVED">Resolved</option>
            <option [value]="AlertStatus.ESCALATED">Escalated</option>
            <option [value]="AlertStatus.DISMISSED">Dismissed</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Severity</label>
          <select [(ngModel)]="filter.severity" (change)="applyFilters()" class="filter-select">
            <option value="">All Severities</option>
            <option [value]="AlertSeverity.CRITICAL">Critical</option>
            <option [value]="AlertSeverity.HIGH">High</option>
            <option [value]="AlertSeverity.MEDIUM">Medium</option>
            <option [value]="AlertSeverity.LOW">Low</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Reason</label>
          <select [(ngModel)]="filter.reason" (change)="applyFilters()" class="filter-select">
            <option value="">All Reasons</option>
            <option [value]="MissedPatrolReason.MISSED_CHECKPOINT">Missed Checkpoint</option>
            <option [value]="MissedPatrolReason.DELAYED_START">Delayed Start</option>
            <option [value]="MissedPatrolReason.INCOMPLETE_ROUTE">Incomplete Route</option>
            <option [value]="MissedPatrolReason.ABANDONED">Abandoned</option>
            <option [value]="MissedPatrolReason.TECHNICAL_ISSUE">Technical Issue</option>
            <option [value]="MissedPatrolReason.GUARD_ABSENT">Guard Absent</option>
            <option [value]="MissedPatrolReason.OTHER">Other</option>
          </select>
        </div>
        <div class="filter-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filter.showOnlyUnacknowledged" 
              (change)="applyFilters()">
            Unacknowledged Only
          </label>
        </div>
        <div class="filter-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filter.showOnlyUnresolved" 
              (change)="applyFilters()">
            Unresolved Only
          </label>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Alerts List -->
      <div class="alerts-list" *ngIf="!isLoading && alerts.length > 0">
        <div 
          *ngFor="let alert of alerts" 
          class="alert-card"
          [ngClass]="'severity-' + alert.severity.toLowerCase() + ' status-' + alert.status.toLowerCase()">
          <div class="alert-header">
            <div class="alert-icon" [ngClass]="'severity-' + alert.severity.toLowerCase()">
              <i class="material-icons">
                {{ alert.severity === AlertSeverity.CRITICAL ? 'error' : 
                   alert.severity === AlertSeverity.HIGH ? 'warning' : 
                   alert.severity === AlertSeverity.MEDIUM ? 'info' : 'notifications' }}
              </i>
            </div>
            <div class="alert-title-section">
              <h3>{{ alert.routeName }}</h3>
              <div class="alert-badges">
                <span class="badge-severity" [ngClass]="'severity-' + alert.severity.toLowerCase()">
                  {{ alert.severity }}
                </span>
                <span class="badge-status" [ngClass]="'status-' + alert.status.toLowerCase()">
                  {{ getStatusLabel(alert.status) }}
                </span>
                <span class="badge-reason">
                  {{ getReasonLabel(alert.reason) }}
                </span>
                <span class="badge-priority" *ngIf="alert.priority >= 8">
                  Priority: {{ alert.priority }}/10
                </span>
              </div>
            </div>
            <div class="alert-actions">
              <button class="btn-action" (click)="viewAlert(alert)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button 
                class="btn-action" 
                (click)="acknowledgeAlert(alert)" 
                *ngIf="alert.status === AlertStatus.PENDING"
                title="Acknowledge">
                <i class="material-icons">check</i>
              </button>
              <button 
                class="btn-action" 
                (click)="resolveAlert(alert)" 
                *ngIf="alert.status === AlertStatus.ACKNOWLEDGED || alert.status === AlertStatus.PENDING"
                title="Resolve">
                <i class="material-icons">done_all</i>
              </button>
              <button class="btn-action danger" (click)="deleteAlert(alert)" title="Delete">
                <i class="material-icons">delete</i>
              </button>
            </div>
          </div>
          <div class="alert-body">
            <div class="alert-description">
              <p>{{ alert.description }}</p>
            </div>
            <div class="alert-details">
              <div class="detail-item">
                <i class="material-icons">person</i>
                <span><strong>Guard:</strong> {{ alert.guardName }}<span *ngIf="alert.guardBadgeNumber"> ({{ alert.guardBadgeNumber }})</span></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">schedule</i>
                <span><strong>Expected:</strong> {{ formatDateTime(alert.expectedStartTime) }}</span>
              </div>
              <div class="detail-item" *ngIf="alert.actualStartTime">
                <i class="material-icons">play_arrow</i>
                <span><strong>Started:</strong> {{ formatDateTime(alert.actualStartTime) }}</span>
              </div>
              <div class="detail-item" *ngIf="alert.missedCheckpointNames && alert.missedCheckpointNames.length > 0">
                <i class="material-icons">place</i>
                <span><strong>Missed Checkpoints:</strong> {{ alert.missedCheckpointNames.join(', ') }}</span>
              </div>
              <div class="detail-item" *ngIf="alert.acknowledgedAt">
                <i class="material-icons">check_circle</i>
                <span><strong>Acknowledged:</strong> {{ formatDateTime(alert.acknowledgedAt) }} by {{ alert.acknowledgedBy }}</span>
              </div>
              <div class="detail-item" *ngIf="alert.resolvedAt">
                <i class="material-icons">done_all</i>
                <span><strong>Resolved:</strong> {{ formatDateTime(alert.resolvedAt) }} by {{ alert.resolvedBy }}</span>
              </div>
            </div>
            <div class="alert-tags" *ngIf="alert.tags && alert.tags.length > 0">
              <span *ngFor="let tag of alert.tags" class="tag">{{ tag }}</span>
            </div>
            <div class="alert-footer">
              <span class="alert-time">
                <i class="material-icons">history</i>
                Detected: {{ formatDateTime(alert.detectedAt) }}
              </span>
              <span class="alert-detected-by" *ngIf="alert.detectedBy">
                by {{ alert.detectedBy }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && alerts.length === 0">
        <i class="material-icons">check_circle</i>
        <p>No missed patrol alerts found</p>
        <p class="empty-subtext">All patrols are on track!</p>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading alerts...</p>
      </div>
    </div>
  `,
  styles: [`
    .missed-patrol-alerts-container {
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

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      border-left: 4px solid;
    }

    .stat-card.total { border-left-color: #667eea; }
    .stat-card.pending { border-left-color: #ffc107; }
    .stat-card.critical { border-left-color: #dc3545; }
    .stat-card.resolved { border-left-color: #28a745; }

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

    .stat-card.total .stat-icon { background: #667eea; }
    .stat-card.pending .stat-icon { background: #ffc107; }
    .stat-card.critical .stat-icon { background: #dc3545; }
    .stat-card.resolved .stat-icon { background: #28a745; }

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
      margin-bottom: 4px;
    }

    .stat-subtext {
      font-size: 12px;
      color: #999;
    }

    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
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

    .btn-refresh {
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

    .btn-refresh:hover {
      background: #5568d3;
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

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .alert-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid;
      transition: all 0.2s;
    }

    .alert-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .alert-card.severity-critical {
      border-left-color: #dc3545;
      background: #fff5f5;
    }

    .alert-card.severity-high {
      border-left-color: #ffc107;
      background: #fffbf0;
    }

    .alert-card.severity-medium {
      border-left-color: #17a2b8;
      background: #f0f9fa;
    }

    .alert-card.severity-low {
      border-left-color: #6c757d;
      background: #f8f9fa;
    }

    .alert-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .alert-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      flex-shrink: 0;
    }

    .alert-icon.severity-critical {
      background: #dc3545;
    }

    .alert-icon.severity-high {
      background: #ffc107;
    }

    .alert-icon.severity-medium {
      background: #17a2b8;
    }

    .alert-icon.severity-low {
      background: #6c757d;
    }

    .alert-title-section {
      flex: 1;
    }

    .alert-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .alert-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-severity,
    .badge-status,
    .badge-reason,
    .badge-priority {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-severity.severity-critical {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-severity.severity-high {
      background: #fff3cd;
      color: #856404;
    }

    .badge-severity.severity-medium {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-severity.severity-low {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-status.status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .badge-status.status-acknowledged {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-status.status-resolved {
      background: #d4edda;
      color: #155724;
    }

    .badge-status.status-escalated {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-reason {
      background: #e7f3ff;
      color: #004085;
    }

    .badge-priority {
      background: #f8d7da;
      color: #721c24;
    }

    .alert-actions {
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

    .btn-action.danger:hover {
      background: #f8d7da;
      color: #dc3545;
    }

    .alert-body {
      margin-left: 72px;
    }

    .alert-description {
      margin-bottom: 16px;
    }

    .alert-description p {
      margin: 0;
      color: #2c3e50;
      font-size: 14px;
      line-height: 1.6;
    }

    .alert-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .detail-item .material-icons {
      font-size: 18px;
    }

    .detail-item strong {
      color: #2c3e50;
    }

    .alert-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .tag {
      padding: 4px 10px;
      background: #e7f3ff;
      color: #004085;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .alert-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      font-size: 12px;
      color: #7f8c8d;
    }

    .alert-time {
      display: flex;
      align-items: center;
      gap: 4px;
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

    .empty-subtext {
      margin-top: 8px;
      font-size: 14px;
      color: #999;
    }

    @media (max-width: 1024px) {
      .alert-body {
        margin-left: 0;
        margin-top: 12px;
      }
    }
  `]
})
export class MissedPatrolAlertsListComponent implements OnInit, OnDestroy {
  alerts: MissedPatrolAlert[] = [];
  statistics: MissedPatrolAlertStatistics | null = null;
  isLoading = false;
  filter: MissedPatrolAlertFilter = {};

  AlertSeverity = AlertSeverity;
  AlertStatus = AlertStatus;
  MissedPatrolReason = MissedPatrolReason;

  private destroy$ = new Subject<void>();

  constructor(
    private alertService: MissedPatrolAlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    
    this.alertService.getAllAlerts(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.alerts = alerts;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading alerts:', error);
          this.isLoading = false;
        }
      });

    this.alertService.getStatistics(this.filter)
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
    this.loadData();
  }

  clearFilters(): void {
    this.filter = {};
    this.applyFilters();
  }

  viewAlert(alert: MissedPatrolAlert): void {
    this.router.navigate(['/admin/guard-patrol/missed-alerts', alert.id]);
  }

  acknowledgeAlert(alert: MissedPatrolAlert): void {
    if (confirm(`Acknowledge this alert for ${alert.routeName}?`)) {
      this.alertService.updateAlert(alert.id, {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'Current User'
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadData();
            } else {
              window.alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error acknowledging alert:', error);
            window.alert('Error acknowledging alert');
          }
        });
    }
  }

  resolveAlert(alert: MissedPatrolAlert): void {
    const notes = prompt('Enter resolution notes (optional):');
    if (notes !== null) {
      this.alertService.updateAlert(alert.id, {
        status: AlertStatus.RESOLVED,
        resolvedBy: 'Current User',
        resolutionNotes: notes || undefined
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadData();
            } else {
              window.alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error resolving alert:', error);
            window.alert('Error resolving alert');
          }
        });
    }
  }

  deleteAlert(alert: MissedPatrolAlert): void {
    if (confirm(`Are you sure you want to delete this alert for ${alert.routeName}?`)) {
      this.alertService.deleteAlert(alert.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadData();
            } else {
              window.alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error deleting alert:', error);
            window.alert('Error deleting alert');
          }
        });
    }
  }

  getStatusLabel(status: AlertStatus): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Pending',
      'ACKNOWLEDGED': 'Acknowledged',
      'RESOLVED': 'Resolved',
      'ESCALATED': 'Escalated',
      'DISMISSED': 'Dismissed'
    };
    return labels[status] || status;
  }

  getReasonLabel(reason: MissedPatrolReason): string {
    const labels: { [key: string]: string } = {
      'MISSED_CHECKPOINT': 'Missed Checkpoint',
      'DELAYED_START': 'Delayed Start',
      'INCOMPLETE_ROUTE': 'Incomplete Route',
      'ABANDONED': 'Abandoned',
      'TECHNICAL_ISSUE': 'Technical Issue',
      'GUARD_ABSENT': 'Guard Absent',
      'EMERGENCY': 'Emergency',
      'OTHER': 'Other'
    };
    return labels[reason] || reason;
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

