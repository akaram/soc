import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { IncidentReportService } from '../services/incident-report.service';
import {
  IncidentReport,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  Priority,
  IncidentReportFilter,
  IncidentReportStatistics
} from '../models/incident-report.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-incident-reports-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="incident-reports-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">report_problem</i>
          Incident Reporting
        </h1>
        <p>Report and manage incidents during patrols</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">report_problem</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalIncidents }}</div>
            <div class="stat-label">Total Incidents</div>
            <div class="stat-subtext">{{ statistics.incidentsToday }} today</div>
          </div>
        </div>
        <div class="stat-card open">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.openIncidents }}</div>
            <div class="stat-label">Open</div>
            <div class="stat-subtext">Requires attention</div>
          </div>
        </div>
        <div class="stat-card critical">
          <div class="stat-icon">
            <i class="material-icons">error</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.criticalIncidents }}</div>
            <div class="stat-label">Critical</div>
            <div class="stat-subtext">Urgent action needed</div>
          </div>
        </div>
        <div class="stat-card resolved">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.resolvedIncidents }}</div>
            <div class="stat-label">Resolved</div>
            <div class="stat-subtext">{{ statistics.averageResponseTime ? statistics.averageResponseTime + ' min avg' : 'N/A' }}</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="createIncident()">
          <i class="material-icons">add</i>
          Report New Incident
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search incidents..."
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
          <label>Type</label>
          <select [(ngModel)]="filter.type" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="IncidentType.THEFT">Theft</option>
            <option [value]="IncidentType.VANDALISM">Vandalism</option>
            <option [value]="IncidentType.UNAUTHORIZED_ACCESS">Unauthorized Access</option>
            <option [value]="IncidentType.TRESPASSING">Trespassing</option>
            <option [value]="IncidentType.MEDICAL_EMERGENCY">Medical Emergency</option>
            <option [value]="IncidentType.FIRE">Fire</option>
            <option [value]="IncidentType.SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
            <option [value]="IncidentType.EQUIPMENT_FAILURE">Equipment Failure</option>
            <option [value]="IncidentType.SECURITY_BREACH">Security Breach</option>
            <option [value]="IncidentType.ASSAULT">Assault</option>
            <option [value]="IncidentType.VEHICLE_ACCIDENT">Vehicle Accident</option>
            <option [value]="IncidentType.OTHER">Other</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Severity</label>
          <select [(ngModel)]="filter.severity" (change)="applyFilters()" class="filter-select">
            <option value="">All Severities</option>
            <option [value]="IncidentSeverity.CRITICAL">Critical</option>
            <option [value]="IncidentSeverity.HIGH">High</option>
            <option [value]="IncidentSeverity.MEDIUM">Medium</option>
            <option [value]="IncidentSeverity.LOW">Low</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="IncidentStatus.REPORTED">Reported</option>
            <option [value]="IncidentStatus.UNDER_INVESTIGATION">Under Investigation</option>
            <option [value]="IncidentStatus.RESOLVED">Resolved</option>
            <option [value]="IncidentStatus.ESCALATED">Escalated</option>
            <option [value]="IncidentStatus.CLOSED">Closed</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Priority</label>
          <select [(ngModel)]="filter.priority" (change)="applyFilters()" class="filter-select">
            <option value="">All Priorities</option>
            <option [value]="Priority.URGENT">Urgent</option>
            <option [value]="Priority.HIGH">High</option>
            <option [value]="Priority.NORMAL">Normal</option>
            <option [value]="Priority.LOW">Low</option>
          </select>
        </div>
        <div class="filter-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filter.showOnlyOpen" 
              (change)="applyFilters()">
            Open Only
          </label>
        </div>
        <div class="filter-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filter.showOnlyCritical" 
              (change)="applyFilters()">
            Critical Only
          </label>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Incidents List -->
      <div class="incidents-list" *ngIf="!isLoading && incidents.length > 0">
        <div 
          *ngFor="let incident of incidents" 
          class="incident-card"
          [ngClass]="'severity-' + incident.severity.toLowerCase() + ' priority-' + incident.priority.toLowerCase()">
          <div class="incident-header">
            <div class="incident-icon" [ngClass]="'severity-' + incident.severity.toLowerCase()">
              <i class="material-icons">
                {{ getIncidentTypeIcon(incident.type) }}
              </i>
            </div>
            <div class="incident-title-section">
              <h3>{{ incident.title }}</h3>
              <div class="incident-badges">
                <span class="badge-incident-number">{{ incident.incidentNumber }}</span>
                <span class="badge-severity" [ngClass]="'severity-' + incident.severity.toLowerCase()">
                  {{ incident.severity }}
                </span>
                <span class="badge-priority" [ngClass]="'priority-' + incident.priority.toLowerCase()">
                  {{ incident.priority }}
                </span>
                <span class="badge-status" [ngClass]="'status-' + incident.status.toLowerCase()">
                  {{ getStatusLabel(incident.status) }}
                </span>
                <span class="badge-type">
                  {{ getTypeLabel(incident.type) }}
                </span>
              </div>
            </div>
            <div class="incident-actions">
              <button class="btn-action" (click)="viewIncident(incident)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button class="btn-action" (click)="editIncident(incident)" title="Edit">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn-action danger" (click)="deleteIncident(incident)" title="Delete">
                <i class="material-icons">delete</i>
              </button>
            </div>
          </div>
          <div class="incident-body">
            <div class="incident-description">
              <p>{{ incident.description }}</p>
            </div>
            <div class="incident-details">
              <div class="detail-item">
                <i class="material-icons">place</i>
                <span><strong>Location:</strong> {{ incident.location }}</span>
              </div>
              <div class="detail-item" *ngIf="incident.routeName">
                <i class="material-icons">route</i>
                <span><strong>Route:</strong> {{ incident.routeName }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">person</i>
                <span><strong>Reported by:</strong> {{ incident.reportedByGuardName }}<span *ngIf="incident.reportedByGuardBadgeNumber"> ({{ incident.reportedByGuardBadgeNumber }})</span></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">schedule</i>
                <span><strong>Incident Time:</strong> {{ formatDateTime(incident.incidentDateTime) }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">history</i>
                <span><strong>Reported:</strong> {{ formatDateTime(incident.reportedDateTime) }}</span>
              </div>
              <div class="detail-item" *ngIf="incident.assignedToName">
                <i class="material-icons">assignment</i>
                <span><strong>Assigned to:</strong> {{ incident.assignedToName }}</span>
              </div>
              <div class="detail-item" *ngIf="incident.responseTime">
                <i class="material-icons">timer</i>
                <span><strong>Response Time:</strong> {{ incident.responseTime }} minutes</span>
              </div>
            </div>
            <div class="incident-notifications" *ngIf="incident.policeNotified || incident.fireDepartmentNotified || incident.medicalServicesNotified">
              <span class="notification-badge" *ngIf="incident.policeNotified">
                <i class="material-icons">local_police</i>
                Police Notified
              </span>
              <span class="notification-badge" *ngIf="incident.fireDepartmentNotified">
                <i class="material-icons">fire_truck</i>
                Fire Dept Notified
              </span>
              <span class="notification-badge" *ngIf="incident.medicalServicesNotified">
                <i class="material-icons">medical_services</i>
                Medical Services Notified
              </span>
            </div>
            <div class="incident-tags" *ngIf="incident.tags && incident.tags.length > 0">
              <span *ngFor="let tag of incident.tags" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && incidents.length === 0">
        <i class="material-icons">check_circle</i>
        <p>No incidents found</p>
        <button class="btn-primary" (click)="createIncident()">
          <i class="material-icons">add</i>
          Report First Incident
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading incidents...</p>
      </div>
    </div>
  `,
  styles: [`
    .incident-reports-container {
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
    .stat-card.open { border-left-color: #ffc107; }
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
    .stat-card.open .stat-icon { background: #ffc107; }
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

    .btn-refresh {
      padding: 12px 24px;
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
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: #e0e0e0;
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

    .incidents-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .incident-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid;
      transition: all 0.2s;
    }

    .incident-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .incident-card.severity-critical {
      border-left-color: #dc3545;
      background: #fff5f5;
    }

    .incident-card.severity-high {
      border-left-color: #ffc107;
      background: #fffbf0;
    }

    .incident-card.severity-medium {
      border-left-color: #17a2b8;
      background: #f0f9fa;
    }

    .incident-card.severity-low {
      border-left-color: #6c757d;
      background: #f8f9fa;
    }

    .incident-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .incident-icon {
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

    .incident-icon.severity-critical {
      background: #dc3545;
    }

    .incident-icon.severity-high {
      background: #ffc107;
    }

    .incident-icon.severity-medium {
      background: #17a2b8;
    }

    .incident-icon.severity-low {
      background: #6c757d;
    }

    .incident-title-section {
      flex: 1;
    }

    .incident-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .incident-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-incident-number,
    .badge-severity,
    .badge-priority,
    .badge-status,
    .badge-type {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-incident-number {
      background: #e7f3ff;
      color: #004085;
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

    .badge-priority.priority-urgent {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-priority.priority-high {
      background: #fff3cd;
      color: #856404;
    }

    .badge-priority.priority-normal {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-priority.priority-low {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-status.status-reported {
      background: #fff3cd;
      color: #856404;
    }

    .badge-status.status-under_investigation {
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

    .badge-status.status-closed {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-type {
      background: #e7f3ff;
      color: #004085;
    }

    .incident-actions {
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

    .incident-body {
      margin-left: 72px;
    }

    .incident-description {
      margin-bottom: 16px;
    }

    .incident-description p {
      margin: 0;
      color: #2c3e50;
      font-size: 14px;
      line-height: 1.6;
    }

    .incident-details {
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

    .incident-notifications {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .notification-badge {
      padding: 6px 12px;
      background: #fff3cd;
      color: #856404;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .incident-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tag {
      padding: 4px 10px;
      background: #e7f3ff;
      color: #004085;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
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
      .incident-body {
        margin-left: 0;
        margin-top: 12px;
      }
    }
  `]
})
export class IncidentReportsListComponent implements OnInit, OnDestroy {
  incidents: IncidentReport[] = [];
  statistics: IncidentReportStatistics | null = null;
  isLoading = false;
  filter: IncidentReportFilter = {};

  IncidentType = IncidentType;
  IncidentSeverity = IncidentSeverity;
  IncidentStatus = IncidentStatus;
  Priority = Priority;

  private destroy$ = new Subject<void>();

  constructor(
    private incidentService: IncidentReportService,
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
    
    this.incidentService.getAllIncidents(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (incidents) => {
          this.incidents = incidents;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading incidents:', error);
          this.isLoading = false;
        }
      });

    this.incidentService.getStatistics(this.filter)
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

  createIncident(): void {
    this.router.navigate(['/admin/guard-patrol/incidents/add']);
  }

  viewIncident(incident: IncidentReport): void {
    this.router.navigate(['/admin/guard-patrol/incidents', incident.id]);
  }

  editIncident(incident: IncidentReport): void {
    this.router.navigate(['/admin/guard-patrol/incidents', incident.id, 'edit']);
  }

  deleteIncident(incident: IncidentReport): void {
    if (window.confirm(`Are you sure you want to delete the incident "${incident.title}"?`)) {
      this.incidentService.deleteIncident(incident.id)
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
            console.error('Error deleting incident:', error);
            window.alert('Error deleting incident');
          }
        });
    }
  }

  getTypeLabel(type: IncidentType): string {
    const labels: { [key: string]: string } = {
      'THEFT': 'Theft',
      'VANDALISM': 'Vandalism',
      'UNAUTHORIZED_ACCESS': 'Unauthorized Access',
      'TRESPASSING': 'Trespassing',
      'MEDICAL_EMERGENCY': 'Medical Emergency',
      'FIRE': 'Fire',
      'SUSPICIOUS_ACTIVITY': 'Suspicious Activity',
      'EQUIPMENT_FAILURE': 'Equipment Failure',
      'SECURITY_BREACH': 'Security Breach',
      'ASSAULT': 'Assault',
      'VEHICLE_ACCIDENT': 'Vehicle Accident',
      'NATURAL_DISASTER': 'Natural Disaster',
      'OTHER': 'Other'
    };
    return labels[type] || type;
  }

  getIncidentTypeIcon(type: IncidentType): string {
    const icons: { [key: string]: string } = {
      'THEFT': 'shopping_bag',
      'VANDALISM': 'build',
      'UNAUTHORIZED_ACCESS': 'lock',
      'TRESPASSING': 'person_off',
      'MEDICAL_EMERGENCY': 'medical_services',
      'FIRE': 'local_fire_department',
      'SUSPICIOUS_ACTIVITY': 'visibility',
      'EQUIPMENT_FAILURE': 'settings',
      'SECURITY_BREACH': 'security',
      'ASSAULT': 'warning',
      'VEHICLE_ACCIDENT': 'directions_car',
      'NATURAL_DISASTER': 'nature',
      'OTHER': 'report_problem'
    };
    return icons[type] || 'report_problem';
  }

  getStatusLabel(status: IncidentStatus): string {
    const labels: { [key: string]: string } = {
      'REPORTED': 'Reported',
      'UNDER_INVESTIGATION': 'Under Investigation',
      'RESOLVED': 'Resolved',
      'ESCALATED': 'Escalated',
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
}

