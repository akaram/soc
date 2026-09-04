import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PatrollingRouteService } from '../services/patrolling-route.service';
import {
  PatrollingRoute,
  RouteStatus,
  PatrollingRouteFilter,
  PatrollingRouteStatistics
} from '../models/patrolling-route.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-patrolling-route-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="patrolling-routes-container">
      <div class="page-header">
        <h1><i class="material-icons">route</i> Define Patrolling Routes</h1>
        <p>Create and manage guard patrolling routes with checkpoints</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Live data from <strong>/patrol-routes</strong> API — no demo routes.</span>
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
            <i class="material-icons">route</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalRoutes }}</div>
            <div class="stat-label">Total Routes</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeRoutes }}</div>
            <div class="stat-label">Active Routes</div>
          </div>
        </div>
        <div class="stat-card checkpoints">
          <div class="stat-icon">
            <i class="material-icons">place</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalCheckpoints }}</div>
            <div class="stat-label">Total Checkpoints</div>
          </div>
        </div>
        <div class="stat-card completion">
          <div class="stat-icon">
            <i class="material-icons">trending_up</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.averageCompletionRate }}%</div>
            <div class="stat-label">Completion Rate</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <a [routerLink]="['/admin/guard-patrol/routes/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Create New Route
        </a>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search routes..."
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
            <option [value]="RouteStatus.ACTIVE">Active</option>
            <option [value]="RouteStatus.INACTIVE">Inactive</option>
            <option [value]="RouteStatus.DRAFT">Draft</option>
            <option [value]="RouteStatus.ARCHIVED">Archived</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Schedule Type</label>
          <select [(ngModel)]="filter.scheduleType" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="CUSTOM">Custom</option>
            <option value="ON_DEMAND">On Demand</option>
          </select>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Routes Grid -->
      <div class="routes-grid" *ngIf="!isLoading && routes.length > 0">
        <div 
          *ngFor="let route of routes" 
          class="route-card"
          [ngClass]="getStatusClass(route.status)">
          <div class="route-header">
            <div class="route-icon">
              <i class="material-icons">route</i>
            </div>
            <div class="route-title-section">
              <h3>{{ route.name }}</h3>
              <div class="route-badges">
                <span class="badge-status" [ngClass]="getStatusClass(route.status)">
                  {{ getStatusLabel(route.status) }}
                </span>
                <span class="badge-schedule">{{ route.scheduleType }}</span>
                <span class="badge-checkpoints">
                  <i class="material-icons">place</i>
                  {{ route.checkpoints.length }} Checkpoints
                </span>
              </div>
            </div>
            <div class="route-actions">
              <button class="btn-action" (click)="viewRoute(route)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button class="btn-action" (click)="editRoute(route)" title="Edit">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn-action danger" (click)="deleteRoute(route)" title="Delete">
                <i class="material-icons">delete</i>
              </button>
            </div>
          </div>
          <div class="route-body">
            <div class="route-info" *ngIf="route.description">
              <p>{{ route.description }}</p>
            </div>
            <div class="route-details">
              <div class="detail-item" *ngIf="route.code">
                <i class="material-icons">tag</i>
                <span>Code: {{ route.code }}</span>
              </div>
              <div class="detail-item" *ngIf="route.startTime">
                <i class="material-icons">schedule</i>
                <span>{{ route.startTime }}{{ route.endTime ? ' - ' + route.endTime : '' }}</span>
              </div>
              <div class="detail-item" *ngIf="route.estimatedDuration">
                <i class="material-icons">timer</i>
                <span>{{ route.estimatedDuration }} minutes</span>
              </div>
              <div class="detail-item" *ngIf="route.scheduleDays && route.scheduleDays.length > 0">
                <i class="material-icons">calendar_today</i>
                <span>{{ route.scheduleDays.join(', ') }}</span>
              </div>
            </div>
            <div class="checkpoints-preview">
              <div class="checkpoints-header">
                <span class="checkpoints-title">Checkpoints:</span>
                <span class="checkpoints-count">{{ route.checkpoints.length }}</span>
              </div>
              <div class="checkpoints-list">
                <div 
                  *ngFor="let checkpoint of route.checkpoints.slice(0, 3); let i = index" 
                  class="checkpoint-preview">
                  <span class="checkpoint-number">{{ i + 1 }}</span>
                  <span class="checkpoint-name">{{ checkpoint.name }}</span>
                  <span class="checkpoint-type">{{ getCheckpointTypeLabel(checkpoint.type) }}</span>
                </div>
                <div class="checkpoint-more" *ngIf="route.checkpoints.length > 3">
                  +{{ route.checkpoints.length - 3 }} more
                </div>
              </div>
            </div>
            <div class="route-stats">
              <div class="stat-item">
                <span class="stat-label">Total Patrols:</span>
                <span class="stat-value">{{ route.totalPatrols || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Completed:</span>
                <span class="stat-value success">{{ route.completedPatrols || 0 }}</span>
              </div>
              <div class="stat-item" *ngIf="route.averageCompletionTime">
                <span class="stat-label">Avg Time:</span>
                <span class="stat-value">{{ route.averageCompletionTime }}m</span>
              </div>
            </div>
            <div class="route-footer" *ngIf="route.lastPatrolAt">
              <span class="last-patrol">
                <i class="material-icons">history</i>
                Last patrol: {{ formatDateTime(route.lastPatrolAt) }}{{ route.lastPatrolBy ? ' by ' + route.lastPatrolBy : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && routes.length === 0">
        <i class="material-icons">route</i>
        <p>No patrolling routes found</p>
        <a [routerLink]="['/admin/guard-patrol/routes/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Create First Route
        </a>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading patrolling routes...</p>
      </div>
    </div>
  `,
  styles: [`
    .patrolling-routes-container {
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
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(39, 174, 96, 0.1);
      border-radius: 8px;
      color: #27ae60;
      font-size: 13px;
    }

    .load-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
      border-radius: 8px;
      margin-bottom: 16px;
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

    .stat-card.active .stat-icon {
      background: #28a745;
    }

    .stat-card.checkpoints .stat-icon {
      background: #17a2b8;
    }

    .stat-card.completion .stat-icon {
      background: #ffc107;
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
      display: inline-flex;
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

    .routes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
      gap: 20px;
    }

    .route-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
      transition: all 0.2s;
    }

    .route-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .route-card.active {
      border-left-color: #28a745;
    }

    .route-card.inactive {
      border-left-color: #6c757d;
    }

    .route-card.draft {
      border-left-color: #ffc107;
    }

    .route-card.archived {
      border-left-color: #dc3545;
    }

    .route-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .route-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      flex-shrink: 0;
    }

    .route-title-section {
      flex: 1;
    }

    .route-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .route-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-status,
    .badge-schedule,
    .badge-checkpoints {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .badge-status.active {
      background: #d4edda;
      color: #155724;
    }

    .badge-status.inactive {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-status.draft {
      background: #fff3cd;
      color: #856404;
    }

    .badge-status.archived {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-schedule {
      background: #e7f3ff;
      color: #004085;
    }

    .badge-checkpoints {
      background: #d1ecf1;
      color: #0c5460;
    }

    .route-actions {
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

    .route-body {
      margin-top: 16px;
    }

    .route-info {
      margin-bottom: 12px;
    }

    .route-info p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .route-details {
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

    .checkpoints-preview {
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkpoints-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .checkpoints-title {
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
    }

    .checkpoints-count {
      font-size: 12px;
      color: #7f8c8d;
    }

    .checkpoints-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .checkpoint-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .checkpoint-number {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
    }

    .checkpoint-name {
      flex: 1;
      color: #2c3e50;
    }

    .checkpoint-type {
      color: #7f8c8d;
      font-size: 11px;
    }

    .checkpoint-more {
      font-size: 12px;
      color: #667eea;
      font-weight: 600;
      margin-top: 4px;
    }

    .route-stats {
      display: flex;
      gap: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-value.success {
      color: #28a745;
    }

    .route-footer {
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      font-size: 12px;
      color: #7f8c8d;
    }

    .last-patrol {
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

    @media (max-width: 1024px) {
      .routes-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PatrollingRouteListComponent implements OnInit, OnDestroy {
  routes: PatrollingRoute[] = [];
  statistics: PatrollingRouteStatistics | null = null;
  isLoading = false;
  loadError = '';
  filter: PatrollingRouteFilter = {};

  RouteStatus = RouteStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private routeService: PatrollingRouteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadRoutes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoutes(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.routes = [];
      return;
    }

    this.routeService.getAllRoutes(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (routes) => {
          this.routes = routes;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading routes:', error);
          this.loadError = 'Failed to load patrol routes from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    if (!this.resolveSocietyId()) return;

    this.routeService.getStatistics()
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
    this.loadRoutes();
  }

  clearFilters(): void {
    this.filter = {};
    this.applyFilters();
  }

  viewRoute(route: PatrollingRoute): void {
    this.router.navigate(['/admin/guard-patrol/routes', route.id]);
  }

  editRoute(route: PatrollingRoute): void {
    this.router.navigate(['/admin/guard-patrol/routes', route.id, 'edit']);
  }

  deleteRoute(route: PatrollingRoute): void {
    if (confirm(`Are you sure you want to delete the route "${route.name}"?`)) {
      this.routeService.deleteRoute(route.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadRoutes();
              this.loadStatistics();
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error deleting route:', error);
            alert('Error deleting route');
          }
        });
    }
  }

  getStatusClass(status: RouteStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: RouteStatus): string {
    const labels: { [key: string]: string } = {
      'ACTIVE': 'Active',
      'INACTIVE': 'Inactive',
      'DRAFT': 'Draft',
      'ARCHIVED': 'Archived'
    };
    return labels[status] || status;
  }

  getCheckpointTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'QR_CODE': 'QR',
      'NFC_TAG': 'NFC',
      'GPS_LOCATION': 'GPS',
      'MANUAL': 'Manual'
    };
    return labels[type] || type;
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

  private resolveSocietyId(): string {
    const direct = localStorage.getItem('societyId') ?? sessionStorage.getItem('societyId');
    if (direct) return direct;
    try {
      const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
      return raw ? JSON.parse(raw).societyId ?? '' : '';
    } catch {
      return '';
    }
  }
}

