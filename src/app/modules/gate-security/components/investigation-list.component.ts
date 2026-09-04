import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { InvestigationService } from '../services/investigation.service';
import {
  Investigation,
  InvestigationType,
  InvestigationStatus,
  InvestigationPriority,
  InvestigationFilter,
  InvestigationStatistics
} from '../models/investigation.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-investigation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="investigation-container">
      <div class="page-header">
        <h1><i class="material-icons">search</i> Investigation Module</h1>
        <p>Manage security investigations and track incidents</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Live data from <strong>/investigations</strong> API — no demo records.</span>
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
            <i class="material-icons">folder</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalInvestigations }}</div>
            <div class="stat-label">Total Investigations</div>
          </div>
        </div>
        <div class="stat-card open">
          <div class="stat-icon">
            <i class="material-icons">folder_open</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.openInvestigations }}</div>
            <div class="stat-label">Open</div>
          </div>
        </div>
        <div class="stat-card progress">
          <div class="stat-icon">
            <i class="material-icons">hourglass_empty</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.inProgressInvestigations }}</div>
            <div class="stat-label">In Progress</div>
          </div>
        </div>
        <div class="stat-card resolved">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.resolvedInvestigations }}</div>
            <div class="stat-label">Resolved</div>
          </div>
        </div>
        <div class="stat-card recent">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.recentInvestigations }}</div>
            <div class="stat-label">Last 7 Days</div>
          </div>
        </div>
        <div class="stat-card avg-time">
          <div class="stat-icon">
            <i class="material-icons">timer</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatHours(statistics.averageResolutionTime) }}</div>
            <div class="stat-label">Avg Resolution</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          New Investigation
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search investigations..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Type</label>
          <select [(ngModel)]="filter.type" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="InvestigationType.SECURITY_INCIDENT">Security Incident</option>
            <option [value]="InvestigationType.THEFT">Theft</option>
            <option [value]="InvestigationType.VANDALISM">Vandalism</option>
            <option [value]="InvestigationType.UNAUTHORIZED_ACCESS">Unauthorized Access</option>
            <option [value]="InvestigationType.SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
            <option [value]="InvestigationType.EMPTY_FLAT_INVESTIGATION">Empty Flat</option>
            <option [value]="InvestigationType.VISITOR_VIOLATION">Visitor Violation</option>
            <option [value]="InvestigationType.VEHICLE_VIOLATION">Vehicle Violation</option>
            <option [value]="InvestigationType.OTHER">Other</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="InvestigationStatus.OPEN">Open</option>
            <option [value]="InvestigationStatus.IN_PROGRESS">In Progress</option>
            <option [value]="InvestigationStatus.PENDING_REVIEW">Pending Review</option>
            <option [value]="InvestigationStatus.RESOLVED">Resolved</option>
            <option [value]="InvestigationStatus.CLOSED">Closed</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Priority</label>
          <select [(ngModel)]="filter.priority" (change)="applyFilters()" class="filter-select">
            <option value="">All Priorities</option>
            <option [value]="InvestigationPriority.URGENT">Urgent</option>
            <option [value]="InvestigationPriority.HIGH">High</option>
            <option [value]="InvestigationPriority.MEDIUM">Medium</option>
            <option [value]="InvestigationPriority.LOW">Low</option>
          </select>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Investigations List -->
      <div class="investigations-list" *ngIf="!isLoading && investigations.length > 0">
        <div 
          *ngFor="let investigation of investigations" 
          class="investigation-card"
          [ngClass]="getPriorityClass(investigation.priority)">
          <div class="card-header">
            <div class="card-title-section">
              <h3>{{ investigation.title }}</h3>
              <div class="card-badges">
                <span class="badge-type" [ngClass]="getTypeClass(investigation.type)">
                  {{ getTypeLabel(investigation.type) }}
                </span>
                <span class="badge-priority" [ngClass]="getPriorityClass(investigation.priority)">
                  {{ investigation.priority }}
                </span>
                <span class="badge-status" [ngClass]="getStatusClass(investigation.status)">
                  {{ getStatusLabel(investigation.status) }}
                </span>
                <span class="badge-confidential" *ngIf="investigation.isConfidential">
                  <i class="material-icons">lock</i>
                  Confidential
                </span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-action" (click)="viewInvestigation(investigation)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button class="btn-action" (click)="editInvestigation(investigation)" title="Edit">
                <i class="material-icons">edit</i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <p class="description">{{ investigation.description }}</p>
            <div class="card-details">
              <div class="detail-item" *ngIf="investigation.flatNumber">
                <i class="material-icons">apartment</i>
                <span>{{ investigation.flatNumber }}{{ investigation.buildingName ? ' - ' + investigation.buildingName : '' }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">person</i>
                <span>Reported by: {{ investigation.reportedByName || investigation.reportedBy }}</span>
              </div>
              <div class="detail-item" *ngIf="investigation.assignedToName">
                <i class="material-icons">assignment</i>
                <span>Assigned to: {{ investigation.assignedToName }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">calendar_today</i>
                <span>Reported: {{ formatDateTime(investigation.reportedAt) }}</span>
              </div>
              <div class="detail-item" *ngIf="investigation.tags && investigation.tags.length > 0">
                <i class="material-icons">label</i>
                <span>{{ investigation.tags.join(', ') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && investigations.length === 0">
        <i class="material-icons">search</i>
        <p>No investigations found</p>
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Create First Investigation
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading investigations...</p>
      </div>
    </div>
  `,
  styles: [`
    .investigation-container {
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

    .stat-card.open .stat-icon {
      background: #dc3545;
    }

    .stat-card.progress .stat-icon {
      background: #ffc107;
    }

    .stat-card.resolved .stat-icon {
      background: #28a745;
    }

    .stat-card.recent .stat-icon {
      background: #17a2b8;
    }

    .stat-card.avg-time .stat-icon {
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

    .investigations-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .investigation-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
      transition: all 0.2s;
    }

    .investigation-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .investigation-card.urgent {
      border-left-color: #dc3545;
    }

    .investigation-card.high {
      border-left-color: #fd7e14;
    }

    .investigation-card.medium {
      border-left-color: #ffc107;
    }

    .investigation-card.low {
      border-left-color: #28a745;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .card-title-section h3 {
      margin: 0 0 12px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .card-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-type,
    .badge-priority,
    .badge-status {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-confidential {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      background: #6c757d;
      color: white;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .badge-confidential .material-icons {
      font-size: 14px;
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      width: 36px;
      height: 36px;
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

    .card-body {
      margin-top: 16px;
    }

    .description {
      color: #7f8c8d;
      margin: 0 0 16px 0;
      line-height: 1.6;
    }

    .card-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .detail-item .material-icons {
      font-size: 18px;
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
  `]
})
export class InvestigationListComponent implements OnInit, OnDestroy {
  investigations: Investigation[] = [];
  statistics: InvestigationStatistics | null = null;
  isLoading = false;
  loadError = '';
  filter: InvestigationFilter = {};

  InvestigationType = InvestigationType;
  InvestigationStatus = InvestigationStatus;
  InvestigationPriority = InvestigationPriority;

  private destroy$ = new Subject<void>();

  constructor(
    private investigationService: InvestigationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInvestigations();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInvestigations(): void {
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
      this.investigations = [];
      this.statistics = null;
      return;
    }

    this.investigationService.getAllInvestigations(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (investigations) => {
          this.investigations = investigations;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading investigations:', error);
          this.loadError = 'Failed to load investigations from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.investigationService.getInvestigationStatistics()
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
    this.loadInvestigations();
  }

  clearFilters(): void {
    this.filter = {};
    this.loadInvestigations();
  }

  openAddForm(): void {
    this.router.navigate(['/admin/gate-security/investigation/add']);
  }

  viewInvestigation(investigation: Investigation): void {
    this.router.navigate(['/admin/gate-security/investigation', investigation.id]);
  }

  editInvestigation(investigation: Investigation): void {
    this.router.navigate(['/admin/gate-security/investigation', investigation.id, 'edit']);
  }

  getTypeLabel(type: InvestigationType): string {
    const labels: { [key: string]: string } = {
      'SECURITY_INCIDENT': 'Security Incident',
      'THEFT': 'Theft',
      'VANDALISM': 'Vandalism',
      'UNAUTHORIZED_ACCESS': 'Unauthorized Access',
      'SUSPICIOUS_ACTIVITY': 'Suspicious Activity',
      'EMPTY_FLAT_INVESTIGATION': 'Empty Flat',
      'VISITOR_VIOLATION': 'Visitor Violation',
      'VEHICLE_VIOLATION': 'Vehicle Violation',
      'OTHER': 'Other'
    };
    return labels[type] || type;
  }

  getTypeClass(type: InvestigationType): string {
    return type.toLowerCase().replace(/_/g, '-');
  }

  getPriorityClass(priority: InvestigationPriority): string {
    return priority.toLowerCase();
  }

  getStatusClass(status: InvestigationStatus): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  getStatusLabel(status: InvestigationStatus): string {
    const labels: { [key: string]: string } = {
      'OPEN': 'Open',
      'IN_PROGRESS': 'In Progress',
      'PENDING_REVIEW': 'Pending Review',
      'RESOLVED': 'Resolved',
      'CLOSED': 'Closed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
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

  formatHours(hours: number): string {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  }
}
















































