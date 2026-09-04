import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AccessControlService } from '../services/access-control.service';
import {
  AccessControl,
  AccessControlType,
  AccessControlStatus,
  AccessMode,
  AccessControlFilter,
  AccessControlStatistics
} from '../models/access-control.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-access-control-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="access-control-container">
      <div class="page-header">
        <h1><i class="material-icons">lock</i> Access Control Systems</h1>
        <p>Manage and monitor access control and door lock automation systems</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">devices</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalSystems }}</div>
            <div class="stat-label">Total Systems</div>
          </div>
        </div>
        <div class="stat-card online">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.onlineSystems }}</div>
            <div class="stat-label">Online</div>
          </div>
        </div>
        <div class="stat-card locked">
          <div class="stat-icon">
            <i class="material-icons">lock</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.lockedSystems }}</div>
            <div class="stat-label">Locked</div>
          </div>
        </div>
        <div class="stat-card unlocked">
          <div class="stat-icon">
            <i class="material-icons">lock_open</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.unlockedSystems }}</div>
            <div class="stat-label">Unlocked</div>
          </div>
        </div>
        <div class="stat-card access">
          <div class="stat-icon">
            <i class="material-icons">login</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(statistics.totalAccessAttempts) }}</div>
            <div class="stat-label">Access Attempts</div>
          </div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">
            <i class="material-icons">check</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ getSuccessRate() }}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <a [routerLink]="['/admin/hardware-integration/access-control/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Add Access Control
        </a>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search access control systems..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>System Type</label>
          <select [(ngModel)]="filter.type" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="AccessControlType.ELECTRONIC_LOCK">Electronic Lock</option>
            <option [value]="AccessControlType.SMART_LOCK">Smart Lock</option>
            <option [value]="AccessControlType.KEYPAD">Keypad</option>
            <option [value]="AccessControlType.CARD_READER">Card Reader</option>
            <option [value]="AccessControlType.BIOMETRIC_ACCESS">Biometric Access</option>
            <option [value]="AccessControlType.INTERCOM">Intercom</option>
            <option [value]="AccessControlType.TURNSTILE">Turnstile</option>
            <option [value]="AccessControlType.REVOLVING_DOOR">Revolving Door</option>
            <option [value]="AccessControlType.MULTI_FACTOR">Multi-Factor</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="AccessControlStatus.ONLINE">Online</option>
            <option [value]="AccessControlStatus.OFFLINE">Offline</option>
            <option [value]="AccessControlStatus.MAINTENANCE">Maintenance</option>
            <option [value]="AccessControlStatus.ERROR">Error</option>
            <option [value]="AccessControlStatus.LOCKED">Locked</option>
            <option [value]="AccessControlStatus.UNLOCKED">Unlocked</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Access Mode</label>
          <select [(ngModel)]="filter.accessMode" (change)="applyFilters()" class="filter-select">
            <option value="">All Modes</option>
            <option [value]="AccessMode.ALWAYS_LOCKED">Always Locked</option>
            <option [value]="AccessMode.ALWAYS_UNLOCKED">Always Unlocked</option>
            <option [value]="AccessMode.SCHEDULED">Scheduled</option>
            <option [value]="AccessMode.AUTO_LOCK">Auto-Lock</option>
            <option [value]="AccessMode.REMOTE_CONTROL">Remote Control</option>
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

      <!-- Access Control Systems Grid -->
      <div class="systems-grid" *ngIf="!isLoading && accessControls.length > 0">
        <div 
          *ngFor="let accessControl of accessControls" 
          class="system-card"
          [ngClass]="getStatusClass(accessControl.status)">
          <div class="system-header">
            <div class="system-icon" [ngClass]="getTypeClass(accessControl.type)">
              <i class="material-icons">{{ getTypeIcon(accessControl.type) }}</i>
            </div>
            <div class="system-title-section">
              <h3>{{ accessControl.name }}</h3>
              <div class="system-badges">
                <span class="badge-type">{{ getTypeLabel(accessControl.type) }}</span>
                <span class="badge-status" [ngClass]="getStatusClass(accessControl.status)">
                  {{ getStatusLabel(accessControl.status) }}
                </span>
                <span class="badge-state" [ngClass]="accessControl.isLocked ? 'locked' : 'unlocked'">
                  <i class="material-icons">{{ accessControl.isLocked ? 'lock' : 'lock_open' }}</i>
                  {{ accessControl.isLocked ? 'Locked' : 'Unlocked' }}
                </span>
                <span class="badge-integration" *ngIf="accessControl.isIntegrated" [ngClass]="accessControl.integrationStatus?.toLowerCase()">
                  {{ accessControl.integrationStatus }}
                </span>
              </div>
            </div>
            <div class="system-actions">
              <button class="btn-action" (click)="viewAccessControl(accessControl)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button class="btn-action" (click)="editAccessControl(accessControl)" title="Edit">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn-action" (click)="operateAccessControl(accessControl)" title="Operate" [disabled]="accessControl.status !== AccessControlStatus.ONLINE">
                <i class="material-icons">{{ accessControl.isLocked ? 'lock_open' : 'lock' }}</i>
              </button>
              <button class="btn-action" (click)="testAccessControl(accessControl)" title="Test System">
                <i class="material-icons">bug_report</i>
              </button>
            </div>
          </div>
          <div class="system-body">
            <div class="system-info">
              <div class="info-item" *ngIf="accessControl.model">
                <i class="material-icons">memory</i>
                <span>{{ accessControl.model }}</span>
              </div>
              <div class="info-item" *ngIf="accessControl.manufacturer">
                <i class="material-icons">business</i>
                <span>{{ accessControl.manufacturer }}</span>
              </div>
              <div class="info-item" *ngIf="accessControl.gateName">
                <i class="material-icons">location_on</i>
                <span>{{ accessControl.gateName }}</span>
              </div>
              <div class="info-item" *ngIf="accessControl.location">
                <i class="material-icons">place</i>
                <span>{{ accessControl.location }}</span>
              </div>
              <div class="info-item" *ngIf="accessControl.doorNumber">
                <i class="material-icons">door_front</i>
                <span>Door: {{ accessControl.doorNumber }}</span>
              </div>
              <div class="info-item" *ngIf="accessControl.ipAddress">
                <i class="material-icons">dns</i>
                <span>{{ accessControl.ipAddress }}{{ accessControl.port ? ':' + accessControl.port : '' }}</span>
              </div>
              <div class="info-item" *ngIf="accessControl.authenticationMethods && accessControl.authenticationMethods.length > 0">
                <i class="material-icons">fingerprint</i>
                <span>{{ getAuthenticationMethodsLabel(accessControl.authenticationMethods) }}</span>
              </div>
            </div>
            <div class="system-stats">
              <div class="stat-item">
                <span class="stat-label">Access Attempts:</span>
                <span class="stat-value">{{ formatNumber(accessControl.totalAccessAttempts || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Successful:</span>
                <span class="stat-value success">{{ formatNumber(accessControl.successfulAccess || 0) }}</span>
              </div>
              <div class="stat-item" *ngIf="accessControl.currentUsers !== undefined">
                <span class="stat-label">Users:</span>
                <span class="stat-value">{{ accessControl.currentUsers }}{{ accessControl.maxUsers ? ' / ' + accessControl.maxUsers : '' }}</span>
              </div>
              <div class="stat-item" *ngIf="accessControl.errorCount !== undefined">
                <span class="stat-label">Errors:</span>
                <span class="stat-value" [ngClass]="{'error': accessControl.errorCount > 0}">
                  {{ accessControl.errorCount }}
                </span>
              </div>
            </div>
            <div class="system-footer" *ngIf="accessControl.lastSeen || accessControl.lastAccessAt">
              <span class="last-seen" *ngIf="accessControl.lastSeen">
                <i class="material-icons">schedule</i>
                Last seen: {{ formatDateTime(accessControl.lastSeen) }}
              </span>
              <span class="last-access" *ngIf="accessControl.lastAccessAt">
                <i class="material-icons">login</i>
                Last access: {{ formatDateTime(accessControl.lastAccessAt) }}{{ accessControl.lastAccessBy ? ' by ' + accessControl.lastAccessBy : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && accessControls.length === 0">
        <i class="material-icons">lock</i>
        <p>No access control systems found</p>
        <a [routerLink]="['/admin/hardware-integration/access-control/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Add First System
        </a>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading access control systems...</p>
      </div>
    </div>
  `,
  styles: [`
    .access-control-container {
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

    .stat-card.locked .stat-icon {
      background: #6c757d;
    }

    .stat-card.unlocked .stat-icon {
      background: #17a2b8;
    }

    .stat-card.access .stat-icon {
      background: #fd7e14;
    }

    .stat-card.success .stat-icon {
      background: #28a745;
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

    .systems-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .system-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
      transition: all 0.2s;
    }

    .system-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .system-card.online {
      border-left-color: #28a745;
    }

    .system-card.offline {
      border-left-color: #dc3545;
    }

    .system-card.maintenance {
      border-left-color: #ffc107;
    }

    .system-card.error {
      border-left-color: #dc3545;
    }

    .system-card.locked {
      border-left-color: #6c757d;
    }

    .system-card.unlocked {
      border-left-color: #17a2b8;
    }

    .system-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .system-icon {
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

    .system-title-section {
      flex: 1;
    }

    .system-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .system-badges {
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

    .badge-state.locked {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-state.unlocked {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-integration.active {
      background: #d4edda;
      color: #155724;
    }

    .badge-integration.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .system-actions {
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

    .system-body {
      margin-top: 16px;
    }

    .system-info {
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

    .system-stats {
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

    .system-footer {
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
    .last-access {
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
      .systems-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AccessControlListComponent implements OnInit, OnDestroy {
  accessControls: AccessControl[] = [];
  statistics: AccessControlStatistics | null = null;
  isLoading = false;
  filter: AccessControlFilter = {};

  AccessControlType = AccessControlType;
  AccessControlStatus = AccessControlStatus;
  AccessMode = AccessMode;

  private destroy$ = new Subject<void>();

  constructor(
    private accessControlService: AccessControlService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadAccessControls();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAccessControls(): void {
    this.isLoading = true;
    this.accessControlService.getAllAccessControls(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (accessControls) => {
          this.accessControls = accessControls;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading access controls:', error);
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.accessControlService.getStatistics()
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
    this.loadAccessControls();
  }

  clearFilters(): void {
    this.filter = {};
    this.applyFilters();
  }

  viewAccessControl(accessControl: AccessControl): void {
    this.router.navigate(['/admin/hardware-integration/access-control', accessControl.id]);
  }

  editAccessControl(accessControl: AccessControl): void {
    this.router.navigate(['/admin/hardware-integration/access-control', accessControl.id, 'edit']);
  }

  operateAccessControl(accessControl: AccessControl): void {
    const operation = accessControl.isLocked ? 'UNLOCK' : 'LOCK';
    this.accessControlService.operateAccessControl({
      accessControlId: accessControl.id,
      operation: operation
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert(`Access control ${operation.toLowerCase()} command sent successfully`);
            this.loadAccessControls();
          } else {
            alert('Error: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error operating access control:', error);
          alert('Error operating access control');
        }
      });
  }

  testAccessControl(accessControl: AccessControl): void {
    this.accessControlService.testAccessControl({
      accessControlId: accessControl.id,
      testType: 'FULL'
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const message = result.overallStatus === 'PASS' 
            ? 'Access control test passed!' 
            : `Access control test ${result.overallStatus}: ${Object.values(result.results).map(r => r.message).join(', ')}`;
          alert(message);
        },
        error: (error) => {
          console.error('Error testing access control:', error);
          alert('Error testing access control');
        }
      });
  }

  getTypeLabel(type: AccessControlType): string {
    const labels: { [key: string]: string } = {
      'ELECTRONIC_LOCK': 'Electronic Lock',
      'SMART_LOCK': 'Smart Lock',
      'KEYPAD': 'Keypad',
      'CARD_READER': 'Card Reader',
      'BIOMETRIC_ACCESS': 'Biometric Access',
      'INTERCOM': 'Intercom',
      'TURNSTILE': 'Turnstile',
      'REVOLVING_DOOR': 'Revolving Door',
      'MULTI_FACTOR': 'Multi-Factor'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: AccessControlType): string {
    const icons: { [key: string]: string } = {
      'ELECTRONIC_LOCK': 'lock',
      'SMART_LOCK': 'lock',
      'KEYPAD': 'dialpad',
      'CARD_READER': 'credit_card',
      'BIOMETRIC_ACCESS': 'fingerprint',
      'INTERCOM': 'phone',
      'TURNSTILE': 'sync_alt',
      'REVOLVING_DOOR': 'rotate_right',
      'MULTI_FACTOR': 'security'
    };
    return icons[type] || 'lock';
  }

  getTypeClass(type: AccessControlType): string {
    return type.toLowerCase().replace('_', '-');
  }

  getStatusClass(status: AccessControlStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: AccessControlStatus): string {
    const labels: { [key: string]: string } = {
      'ONLINE': 'Online',
      'OFFLINE': 'Offline',
      'MAINTENANCE': 'Maintenance',
      'ERROR': 'Error',
      'CONFIGURING': 'Configuring',
      'LOCKED': 'Locked',
      'UNLOCKED': 'Unlocked',
      'JAMMED': 'Jammed'
    };
    return labels[status] || status;
  }

  getAuthenticationMethodsLabel(methods: string[]): string {
    const labels: { [key: string]: string } = {
      'PIN': 'PIN',
      'CARD': 'Card',
      'BIOMETRIC': 'Biometric',
      'MOBILE_APP': 'Mobile App',
      'KEY_FOB': 'Key Fob',
      'MULTI_FACTOR': 'Multi-Factor'
    };
    return methods.map(m => labels[m] || m).join(', ');
  }

  getSuccessRate(): number {
    if (!this.statistics || this.statistics.totalAccessAttempts === 0) {
      return 0;
    }
    return Math.round((this.statistics.successfulAccess / this.statistics.totalAccessAttempts) * 100);
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

