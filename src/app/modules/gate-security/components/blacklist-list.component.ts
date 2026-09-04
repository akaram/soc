import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BlacklistService } from '../services/blacklist.service';
import {
  BlacklistEntry,
  BlacklistType,
  BlacklistReason,
  BlacklistStatus,
  BlacklistSeverity,
  BlacklistFilter,
  BlacklistStatistics
} from '../models/blacklist.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-blacklist-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="blacklist-container">
      <div class="page-header">
        <h1><i class="material-icons">block</i> Blacklist Management</h1>
        <p>Manage blacklisted persons, vehicles, and entities</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Live data from <strong>/blacklist</strong> API — no demo records.</span>
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
            <i class="material-icons">block</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalEntries }}</div>
            <div class="stat-label">Total Entries</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeEntries }}</div>
            <div class="stat-label">Active</div>
          </div>
        </div>
        <div class="stat-card blocked">
          <div class="stat-icon">
            <i class="material-icons">security</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.blockedAttemptsToday }}</div>
            <div class="stat-label">Blocked Today</div>
          </div>
        </div>
        <div class="stat-card recent">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.recentAdditions }}</div>
            <div class="stat-label">Added (7 days)</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Add to Blacklist
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search by name, phone, vehicle, ID..."
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
            <option [value]="BlacklistType.PERSON">Person</option>
            <option [value]="BlacklistType.VEHICLE">Vehicle</option>
            <option [value]="BlacklistType.PHONE_NUMBER">Phone Number</option>
            <option [value]="BlacklistType.EMAIL">Email</option>
            <option [value]="BlacklistType.ID_PROOF">ID Proof</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="BlacklistStatus.ACTIVE">Active</option>
            <option [value]="BlacklistStatus.SUSPENDED">Suspended</option>
            <option [value]="BlacklistStatus.EXPIRED">Expired</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Severity</label>
          <select [(ngModel)]="filter.severity" (change)="applyFilters()" class="filter-select">
            <option value="">All Severity</option>
            <option [value]="BlacklistSeverity.CRITICAL">Critical</option>
            <option [value]="BlacklistSeverity.HIGH">High</option>
            <option [value]="BlacklistSeverity.MEDIUM">Medium</option>
            <option [value]="BlacklistSeverity.LOW">Low</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Reason</label>
          <select [(ngModel)]="filter.reason" (change)="applyFilters()" class="filter-select">
            <option value="">All Reasons</option>
            <option [value]="BlacklistReason.SECURITY_THREAT">Security Threat</option>
            <option [value]="BlacklistReason.THEFT">Theft</option>
            <option [value]="BlacklistReason.VANDALISM">Vandalism</option>
            <option [value]="BlacklistReason.HARASSMENT">Harassment</option>
            <option [value]="BlacklistReason.UNAUTHORIZED_ACCESS">Unauthorized Access</option>
            <option [value]="BlacklistReason.POLICY_VIOLATION">Policy Violation</option>
            <option [value]="BlacklistReason.COURT_ORDER">Court Order</option>
            <option [value]="BlacklistReason.OTHER">Other</option>
          </select>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Entries Table -->
      <div class="entries-table" *ngIf="!isLoading && entries.length > 0">
        <table>
          <thead>
            <tr>
              <th>Identifier</th>
              <th>Type</th>
              <th>Details</th>
              <th>Reason</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Blacklisted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of entries" [ngClass]="getSeverityClass(entry.severity)">
              <td>
                <div class="identifier-cell">
                  <strong>{{ entry.identifier }}</strong>
                  <span class="badge-type">{{ getTypeLabel(entry.type) }}</span>
                </div>
              </td>
              <td>
                <span class="type-badge" [ngClass]="getTypeClass(entry.type)">
                  {{ getTypeLabel(entry.type) }}
                </span>
              </td>
              <td>
                <div class="details-cell">
                  <div *ngIf="entry.personName">{{ entry.personName }}</div>
                  <div *ngIf="entry.phoneNumber" class="detail-item">
                    <i class="material-icons">phone</i>
                    {{ entry.phoneNumber }}
                  </div>
                  <div *ngIf="entry.vehicleNumber" class="detail-item">
                    <i class="material-icons">directions_car</i>
                    {{ entry.vehicleNumber }}
                  </div>
                  <div *ngIf="entry.email" class="detail-item">
                    <i class="material-icons">email</i>
                    {{ entry.email }}
                  </div>
                </div>
              </td>
              <td>
                <div class="reason-cell">
                  <div class="reason-badge" [ngClass]="getReasonClass(entry.reason)">
                    {{ getReasonLabel(entry.reason) }}
                  </div>
                  <div class="reason-desc">{{ entry.reasonDescription }}</div>
                </div>
              </td>
              <td>
                <span class="severity-badge" [ngClass]="getSeverityClass(entry.severity)">
                  {{ entry.severity }}
                </span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="getStatusClass(entry.status)">
                  {{ getStatusLabel(entry.status) }}
                </span>
              </td>
              <td>
                <div class="date-cell">
                  <div>{{ formatDate(entry.blacklistedDate) }}</div>
                  <div class="date-sub" *ngIf="entry.blacklistedByName">
                    by {{ entry.blacklistedByName }}
                  </div>
                  <div class="date-sub" *ngIf="entry.expiryDate && !entry.isPermanent">
                    Expires: {{ formatDate(entry.expiryDate) }}
                  </div>
                  <div class="date-sub permanent" *ngIf="entry.isPermanent">
                    Permanent
                  </div>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action" (click)="viewEntry(entry)" title="View Details">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="btn-action" (click)="editEntry(entry)" title="Edit">
                    <i class="material-icons">edit</i>
                  </button>
                  <button 
                    class="btn-action" 
                    (click)="suspendEntry(entry)"
                    *ngIf="entry.status === BlacklistStatus.ACTIVE"
                    title="Suspend">
                    <i class="material-icons">pause</i>
                  </button>
                  <button 
                    class="btn-action" 
                    (click)="reactivateEntry(entry)"
                    *ngIf="entry.status === BlacklistStatus.SUSPENDED"
                    title="Reactivate">
                    <i class="material-icons">play_arrow</i>
                  </button>
                  <button 
                    class="btn-action danger" 
                    (click)="removeEntry(entry)"
                    *ngIf="entry.status !== BlacklistStatus.REMOVED"
                    title="Remove">
                    <i class="material-icons">delete</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && entries.length === 0">
        <i class="material-icons">block</i>
        <p>No blacklist entries found</p>
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Add First Entry
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading entries...</p>
      </div>
    </div>
  `,
  styles: [`
    .blacklist-container {
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
      background: #dc3545;
    }

    .stat-card.blocked .stat-icon {
      background: #ffc107;
    }

    .stat-card.recent .stat-icon {
      background: #17a2b8;
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
      background: #dc3545;
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
      background: #c82333;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
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

    .entries-table {
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

    tbody tr.critical {
      border-left: 4px solid #dc3545;
    }

    tbody tr.high {
      border-left: 4px solid #fd7e14;
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

    .identifier-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .badge-type {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .type-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-badge.person {
      background: #e7f3ff;
      color: #004085;
    }

    .type-badge.vehicle {
      background: #fff3cd;
      color: #856404;
    }

    .type-badge.phone_number {
      background: #d1ecf1;
      color: #0c5460;
    }

    .type-badge.email {
      background: #d4edda;
      color: #155724;
    }

    .type-badge.id_proof {
      background: #f8d7da;
      color: #721c24;
    }

    .details-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .detail-item .material-icons {
      font-size: 16px;
    }

    .reason-cell {
      max-width: 250px;
    }

    .reason-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
      display: inline-block;
    }

    .reason-desc {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .severity-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity-badge.critical {
      background: #f8d7da;
      color: #721c24;
    }

    .severity-badge.high {
      background: #fff3cd;
      color: #856404;
    }

    .severity-badge.medium {
      background: #d1ecf1;
      color: #0c5460;
    }

    .severity-badge.low {
      background: #d4edda;
      color: #155724;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.suspended {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.expired {
      background: #e2e3e5;
      color: #383d41;
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

    .date-sub.permanent {
      color: #dc3545;
      font-weight: 600;
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

    .btn-action.danger {
      background: #f8d7da;
      color: #721c24;
      border-color: #f5c6cb;
    }

    .btn-action.danger:hover {
      background: #f5c6cb;
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
      .entries-table {
        overflow-x: auto;
      }

      table {
        min-width: 1200px;
      }
    }
  `]
})
export class BlacklistListComponent implements OnInit, OnDestroy {
  entries: BlacklistEntry[] = [];
  statistics: BlacklistStatistics | null = null;
  isLoading = false;
  loadError = '';
  filter: BlacklistFilter = {};

  BlacklistType = BlacklistType;
  BlacklistReason = BlacklistReason;
  BlacklistStatus = BlacklistStatus;
  BlacklistSeverity = BlacklistSeverity;

  private destroy$ = new Subject<void>();

  constructor(
    private blacklistService: BlacklistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEntries();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEntries(): void {
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
      this.entries = [];
      this.statistics = null;
      return;
    }

    this.blacklistService.getAllEntries(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entries) => {
          this.entries = entries;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading entries:', error);
          this.loadError = 'Failed to load blacklist entries from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.blacklistService.getStatistics()
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
    this.loadEntries();
  }

  clearFilters(): void {
    this.filter = {};
    this.loadEntries();
  }

  openAddForm(): void {
    this.router.navigate(['/admin/gate-security/blacklist/add']);
  }

  viewEntry(entry: BlacklistEntry): void {
    this.router.navigate(['/admin/gate-security/blacklist', entry.id]);
  }

  editEntry(entry: BlacklistEntry): void {
    this.router.navigate(['/admin/gate-security/blacklist', entry.id, 'edit']);
  }

  suspendEntry(entry: BlacklistEntry): void {
    if (confirm(`Suspend blacklist entry for ${entry.identifier}?`)) {
      this.blacklistService.suspendEntry(entry.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadEntries();
              this.loadStatistics();
            }
          },
          error: (error) => {
            console.error('Error suspending entry:', error);
          }
        });
    }
  }

  reactivateEntry(entry: BlacklistEntry): void {
    if (confirm(`Reactivate blacklist entry for ${entry.identifier}?`)) {
      this.blacklistService.reactivateEntry(entry.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadEntries();
              this.loadStatistics();
            }
          },
          error: (error) => {
            console.error('Error reactivating entry:', error);
          }
        });
    }
  }

  removeEntry(entry: BlacklistEntry): void {
    if (confirm(`Remove ${entry.identifier} from blacklist? This action cannot be undone.`)) {
      this.blacklistService.removeEntry(entry.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.loadEntries();
              this.loadStatistics();
            }
          },
          error: (error) => {
            console.error('Error removing entry:', error);
          }
        });
    }
  }

  getTypeLabel(type: BlacklistType): string {
    switch (type) {
      case BlacklistType.PERSON:
        return 'Person';
      case BlacklistType.VEHICLE:
        return 'Vehicle';
      case BlacklistType.PHONE_NUMBER:
        return 'Phone';
      case BlacklistType.EMAIL:
        return 'Email';
      case BlacklistType.ID_PROOF:
        return 'ID Proof';
      default:
        return type;
    }
  }

  getTypeClass(type: BlacklistType): string {
    return type.toLowerCase();
  }

  getReasonLabel(reason: BlacklistReason): string {
    switch (reason) {
      case BlacklistReason.SECURITY_THREAT:
        return 'Security Threat';
      case BlacklistReason.THEFT:
        return 'Theft';
      case BlacklistReason.VANDALISM:
        return 'Vandalism';
      case BlacklistReason.HARASSMENT:
        return 'Harassment';
      case BlacklistReason.UNAUTHORIZED_ACCESS:
        return 'Unauthorized Access';
      case BlacklistReason.POLICY_VIOLATION:
        return 'Policy Violation';
      case BlacklistReason.COURT_ORDER:
        return 'Court Order';
      case BlacklistReason.OTHER:
        return 'Other';
      default:
        return reason;
    }
  }

  getReasonClass(reason: BlacklistReason): string {
    const classes: { [key: string]: string } = {
      'SECURITY_THREAT': 'critical',
      'THEFT': 'high',
      'VANDALISM': 'medium',
      'HARASSMENT': 'medium',
      'UNAUTHORIZED_ACCESS': 'high',
      'POLICY_VIOLATION': 'low',
      'COURT_ORDER': 'critical',
      'OTHER': 'low'
    };
    return classes[reason] || 'low';
  }

  getSeverityClass(severity: BlacklistSeverity): string {
    return severity.toLowerCase();
  }

  getStatusClass(status: BlacklistStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: BlacklistStatus): string {
    switch (status) {
      case BlacklistStatus.ACTIVE:
        return 'Active';
      case BlacklistStatus.SUSPENDED:
        return 'Suspended';
      case BlacklistStatus.EXPIRED:
        return 'Expired';
      case BlacklistStatus.REMOVED:
        return 'Removed';
      default:
        return status;
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
















































