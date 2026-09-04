import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BoomBarrierService } from '../services/boom-barrier.service';
import {
  BoomBarrier,
  BoomBarrierType,
  BoomBarrierStatus,
  OperationMode,
  BoomBarrierFilter,
  BoomBarrierStatistics
} from '../models/boom-barrier.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-boom-barrier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="boom-barrier-container">
      <div class="page-header">
        <h1><i class="material-icons">remove_road</i> Boom Barriers</h1>
        <p>Manage and monitor boom barrier and gate automation systems</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">devices</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalBarriers }}</div>
            <div class="stat-label">Total Barriers</div>
          </div>
        </div>
        <div class="stat-card online">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.onlineBarriers }}</div>
            <div class="stat-label">Online</div>
          </div>
        </div>
        <div class="stat-card open">
          <div class="stat-icon">
            <i class="material-icons">lock_open</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.openBarriers }}</div>
            <div class="stat-label">Open</div>
          </div>
        </div>
        <div class="stat-card closed">
          <div class="stat-icon">
            <i class="material-icons">lock</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.closedBarriers }}</div>
            <div class="stat-label">Closed</div>
          </div>
        </div>
        <div class="stat-card operations">
          <div class="stat-icon">
            <i class="material-icons">sync</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(statistics.totalOperations) }}</div>
            <div class="stat-label">Total Operations</div>
          </div>
        </div>
        <div class="stat-card integrated">
          <div class="stat-icon">
            <i class="material-icons">link</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.integrationStatus.active }}</div>
            <div class="stat-label">Active Integration</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <a [routerLink]="['/admin/hardware-integration/boom-barriers/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Add Boom Barrier
        </a>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search barriers..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Barrier Type</label>
          <select [(ngModel)]="filter.type" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="BoomBarrierType.SINGLE_ARM">Single Arm</option>
            <option [value]="BoomBarrierType.DOUBLE_ARM">Double Arm</option>
            <option [value]="BoomBarrierType.SLIDING_GATE">Sliding Gate</option>
            <option [value]="BoomBarrierType.SWING_GATE">Swing Gate</option>
            <option [value]="BoomBarrierType.LIFT_GATE">Lift Gate</option>
            <option [value]="BoomBarrierType.TURNSTILE">Turnstile</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="BoomBarrierStatus.ONLINE">Online</option>
            <option [value]="BoomBarrierStatus.OFFLINE">Offline</option>
            <option [value]="BoomBarrierStatus.MAINTENANCE">Maintenance</option>
            <option [value]="BoomBarrierStatus.ERROR">Error</option>
            <option [value]="BoomBarrierStatus.OPENING">Opening</option>
            <option [value]="BoomBarrierStatus.CLOSING">Closing</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Operation Mode</label>
          <select [(ngModel)]="filter.operationMode" (change)="applyFilters()" class="filter-select">
            <option value="">All Modes</option>
            <option [value]="OperationMode.MANUAL">Manual</option>
            <option [value]="OperationMode.AUTOMATIC">Automatic</option>
            <option [value]="OperationMode.SEMI_AUTOMATIC">Semi-Automatic</option>
            <option [value]="OperationMode.SCHEDULED">Scheduled</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Gate</label>
          <select [(ngModel)]="filter.gateId" (change)="applyFilters()" class="filter-select">
            <option value="">All Gates</option>
            <option value="MAIN_GATE">Main Gate</option>
            <option value="SIDE_GATE">Side Gate</option>
            <option value="PARKING_GATE">Parking Gate</option>
            <option value="EMERGENCY_GATE">Emergency Gate</option>
          </select>
        </div>
        <div class="filter-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filter.isIntegrated"
              (change)="applyFilters()">
            Integrated Only
          </label>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Barriers Grid -->
      <div class="barriers-grid" *ngIf="!isLoading && barriers.length > 0">
        <div 
          *ngFor="let barrier of barriers" 
          class="barrier-card"
          [ngClass]="getStatusClass(barrier.status)">
          <div class="barrier-header">
            <div class="barrier-icon" [ngClass]="getTypeClass(barrier.type)">
              <i class="material-icons">{{ getTypeIcon(barrier.type) }}</i>
            </div>
            <div class="barrier-title-section">
              <h3>{{ barrier.name }}</h3>
              <div class="barrier-badges">
                <span class="badge-type">{{ getTypeLabel(barrier.type) }}</span>
                <span class="badge-status" [ngClass]="getStatusClass(barrier.status)">
                  {{ getStatusLabel(barrier.status) }}
                </span>
                <span class="badge-state" [ngClass]="barrier.isOpen ? 'open' : 'closed'">
                  <i class="material-icons">{{ barrier.isOpen ? 'lock_open' : 'lock' }}</i>
                  {{ barrier.isOpen ? 'Open' : 'Closed' }}
                </span>
                <span class="badge-integration" *ngIf="barrier.isIntegrated" [ngClass]="barrier.integrationStatus?.toLowerCase()">
                  {{ barrier.integrationStatus }}
                </span>
              </div>
            </div>
            <div class="barrier-actions">
              <button class="btn-action" (click)="viewBarrier(barrier)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button class="btn-action" (click)="editBarrier(barrier)" title="Edit">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn-action" (click)="operateBarrier(barrier)" title="Operate" [disabled]="barrier.status !== BoomBarrierStatus.ONLINE">
                <i class="material-icons">{{ barrier.isOpen ? 'lock' : 'lock_open' }}</i>
              </button>
              <button class="btn-action" (click)="testBarrier(barrier)" title="Test Barrier">
                <i class="material-icons">bug_report</i>
              </button>
            </div>
          </div>
          <div class="barrier-body">
            <div class="barrier-info">
              <div class="info-item" *ngIf="barrier.model">
                <i class="material-icons">memory</i>
                <span>{{ barrier.model }}</span>
              </div>
              <div class="info-item" *ngIf="barrier.manufacturer">
                <i class="material-icons">business</i>
                <span>{{ barrier.manufacturer }}</span>
              </div>
              <div class="info-item" *ngIf="barrier.gateName">
                <i class="material-icons">location_on</i>
                <span>{{ barrier.gateName }}</span>
              </div>
              <div class="info-item" *ngIf="barrier.location">
                <i class="material-icons">place</i>
                <span>{{ barrier.location }}</span>
              </div>
              <div class="info-item" *ngIf="barrier.ipAddress">
                <i class="material-icons">dns</i>
                <span>{{ barrier.ipAddress }}{{ barrier.port ? ':' + barrier.port : '' }}</span>
              </div>
              <div class="info-item">
                <i class="material-icons">settings</i>
                <span>{{ getOperationModeLabel(barrier.operationMode) }}</span>
              </div>
            </div>
            <div class="barrier-stats">
              <div class="stat-item">
                <span class="stat-label">Operations:</span>
                <span class="stat-value">{{ formatNumber(barrier.totalOperations || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Success:</span>
                <span class="stat-value success">{{ formatNumber(barrier.successfulOperations || 0) }}</span>
              </div>
              <div class="stat-item" *ngIf="barrier.averageOperationTime">
                <span class="stat-label">Avg Time:</span>
                <span class="stat-value">{{ barrier.averageOperationTime.toFixed(1) }}s</span>
              </div>
              <div class="stat-item" *ngIf="barrier.errorCount !== undefined">
                <span class="stat-label">Errors:</span>
                <span class="stat-value" [ngClass]="{'error': barrier.errorCount > 0}">
                  {{ barrier.errorCount }}
                </span>
              </div>
            </div>
            <div class="barrier-footer" *ngIf="barrier.lastSeen || barrier.lastOperationAt">
              <span class="last-seen" *ngIf="barrier.lastSeen">
                <i class="material-icons">schedule</i>
                Last seen: {{ formatDateTime(barrier.lastSeen) }}
              </span>
              <span class="last-operation" *ngIf="barrier.lastOperationAt">
                <i class="material-icons">sync</i>
                Last {{ barrier.lastOperationType?.toLowerCase() }}: {{ formatDateTime(barrier.lastOperationAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && barriers.length === 0">
        <i class="material-icons">remove_road</i>
        <p>No barriers found</p>
        <a [routerLink]="['/admin/hardware-integration/boom-barriers/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Add First Barrier
        </a>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading barriers...</p>
      </div>
    </div>
  `,
  styles: [`
    .boom-barrier-container {
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

    .stat-card.online .stat-icon {
      background: #28a745;
    }

    .stat-card.open .stat-icon {
      background: #17a2b8;
    }

    .stat-card.closed .stat-icon {
      background: #6c757d;
    }

    .stat-card.operations .stat-icon {
      background: #fd7e14;
    }

    .stat-card.integrated .stat-icon {
      background: #20c997;
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

    .barriers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .barrier-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
      transition: all 0.2s;
    }

    .barrier-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .barrier-card.online {
      border-left-color: #28a745;
    }

    .barrier-card.offline {
      border-left-color: #dc3545;
    }

    .barrier-card.maintenance {
      border-left-color: #ffc107;
    }

    .barrier-card.error {
      border-left-color: #dc3545;
    }

    .barrier-card.opening,
    .barrier-card.closing {
      border-left-color: #17a2b8;
    }

    .barrier-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .barrier-icon {
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

    .barrier-title-section {
      flex: 1;
    }

    .barrier-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .barrier-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-type,
    .badge-status,
    .badge-integration,
    .badge-state {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .badge-type {
      background: #e7f3ff;
      color: #004085;
    }

    .badge-status.online {
      background: #d4edda;
      color: #155724;
    }

    .badge-status.offline {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-status.maintenance {
      background: #fff3cd;
      color: #856404;
    }

    .badge-status.error {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-state.open {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-state.closed {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-integration.active {
      background: #d4edda;
      color: #155724;
    }

    .badge-integration.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .barrier-actions {
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

    .btn-action:hover:not(:disabled) {
      background: #e0e0e0;
      transform: scale(1.1);
    }

    .btn-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .barrier-body {
      margin-top: 16px;
    }

    .barrier-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .info-item .material-icons {
      font-size: 18px;
    }

    .barrier-stats {
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

    .stat-value.error {
      color: #dc3545;
    }

    .barrier-footer {
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      font-size: 12px;
      color: #7f8c8d;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .last-seen,
    .last-operation {
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
      .barriers-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BoomBarrierListComponent implements OnInit, OnDestroy {
  barriers: BoomBarrier[] = [];
  statistics: BoomBarrierStatistics | null = null;
  isLoading = false;
  filter: BoomBarrierFilter = {};

  BoomBarrierType = BoomBarrierType;
  BoomBarrierStatus = BoomBarrierStatus;
  OperationMode = OperationMode;

  private destroy$ = new Subject<void>();

  constructor(
    private boomBarrierService: BoomBarrierService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadBarriers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBarriers(): void {
    this.isLoading = true;
    this.boomBarrierService.getAllBarriers(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (barriers) => {
          this.barriers = barriers;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading barriers:', error);
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.boomBarrierService.getStatistics()
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
    this.loadBarriers();
  }

  clearFilters(): void {
    this.filter = {};
    this.applyFilters();
  }

  viewBarrier(barrier: BoomBarrier): void {
    this.router.navigate(['/admin/hardware-integration/boom-barriers', barrier.id]);
  }

  editBarrier(barrier: BoomBarrier): void {
    this.router.navigate(['/admin/hardware-integration/boom-barriers', barrier.id, 'edit']);
  }

  operateBarrier(barrier: BoomBarrier): void {
    const operation = barrier.isOpen ? 'CLOSE' : 'OPEN';
    this.boomBarrierService.operateBarrier({
      barrierId: barrier.id,
      operation: operation
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert(`Barrier ${operation.toLowerCase()} command sent successfully`);
            this.loadBarriers();
          } else {
            alert('Error: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error operating barrier:', error);
          alert('Error operating barrier');
        }
      });
  }

  testBarrier(barrier: BoomBarrier): void {
    this.boomBarrierService.testBarrier({
      barrierId: barrier.id,
      testType: 'FULL'
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const message = result.overallStatus === 'PASS' 
            ? 'Barrier test passed!' 
            : `Barrier test ${result.overallStatus}: ${Object.values(result.results).map(r => r.message).join(', ')}`;
          alert(message);
        },
        error: (error) => {
          console.error('Error testing barrier:', error);
          alert('Error testing barrier');
        }
      });
  }

  getTypeLabel(type: BoomBarrierType): string {
    const labels: { [key: string]: string } = {
      'SINGLE_ARM': 'Single Arm',
      'DOUBLE_ARM': 'Double Arm',
      'SLIDING_GATE': 'Sliding Gate',
      'SWING_GATE': 'Swing Gate',
      'LIFT_GATE': 'Lift Gate',
      'TURNSTILE': 'Turnstile'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: BoomBarrierType): string {
    const icons: { [key: string]: string } = {
      'SINGLE_ARM': 'remove_road',
      'DOUBLE_ARM': 'remove_road',
      'SLIDING_GATE': 'settings_ethernet',
      'SWING_GATE': 'settings_ethernet',
      'LIFT_GATE': 'vertical_align_center',
      'TURNSTILE': 'sync_alt'
    };
    return icons[type] || 'remove_road';
  }

  getTypeClass(type: BoomBarrierType): string {
    return type.toLowerCase().replace('_', '-');
  }

  getStatusClass(status: BoomBarrierStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: BoomBarrierStatus): string {
    const labels: { [key: string]: string } = {
      'ONLINE': 'Online',
      'OFFLINE': 'Offline',
      'MAINTENANCE': 'Maintenance',
      'ERROR': 'Error',
      'CONFIGURING': 'Configuring',
      'OPENING': 'Opening',
      'CLOSING': 'Closing',
      'STUCK_OPEN': 'Stuck Open',
      'STUCK_CLOSED': 'Stuck Closed'
    };
    return labels[status] || status;
  }

  getOperationModeLabel(mode: OperationMode): string {
    const labels: { [key: string]: string } = {
      'MANUAL': 'Manual',
      'AUTOMATIC': 'Automatic',
      'SEMI_AUTOMATIC': 'Semi-Automatic',
      'SCHEDULED': 'Scheduled'
    };
    return labels[mode] || mode;
  }

  formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
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


