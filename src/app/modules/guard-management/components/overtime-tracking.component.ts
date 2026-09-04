import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OvertimeTrackingService } from '../services/overtime-tracking.service';
import {
  OvertimeRecord,
  OvertimeStatistics,
  StaffOvertimeSummary,
  OvertimeStaffMember,
  OvertimeType,
  OvertimeStatus
} from '../models/overtime-tracking.model';
import {
  applyOvertimeFilter,
  getOvertimeTypeLabel,
  getStatusLabel
} from '../services/overtime-tracking-api.mapper';

@Component({
  selector: 'app-overtime-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="overtime-tracking-container">
      <div class="page-header">
        <button class="back-button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Dashboard
        </button>
        <div>
          <h1>
            <i class="material-icons">access_time</i>
            Overtime Tracking
          </h1>
          <p>Track and manage staff overtime hours and approvals</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/overtime-tracking</strong> API — no demo records.</span>
          </div>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="form-panel" *ngIf="showCreatePanel">
        <h3><i class="material-icons">add</i> Create Overtime Record</h3>
        <div class="form-grid">
          <select [(ngModel)]="createForm.staffId">
            <option value="">Select staff</option>
            <option *ngFor="let staff of staffMembers" [value]="staff.id">
              {{ staff.name }} ({{ staff.department }})
            </option>
          </select>
          <input type="date" [(ngModel)]="createForm.overtimeDate">
          <input type="time" [(ngModel)]="createForm.startTime">
          <input type="time" [(ngModel)]="createForm.endTime">
          <select [(ngModel)]="createForm.overtimeType">
            <option value="regular">Regular Overtime</option>
            <option value="holiday">Holiday</option>
            <option value="weekend">Weekend</option>
            <option value="night">Night Shift</option>
          </select>
          <input type="text" placeholder="Reason" [(ngModel)]="createForm.reason" class="reason-input">
        </div>
        <div class="panel-actions">
          <button type="button" class="btn-primary" (click)="submitCreateOvertime()" [disabled]="isSaving">
            {{ isSaving ? 'Saving...' : 'Submit Record' }}
          </button>
          <button type="button" class="btn-secondary" (click)="closeCreatePanel()">Cancel</button>
        </div>
      </div>

      <div class="action-bar">
        <div class="view-options">
          <button class="view-btn" [class.active]="viewMode === 'records'" (click)="setViewMode('records')">
            <i class="material-icons">list</i>
            Overtime Records
          </button>
          <button class="view-btn" [class.active]="viewMode === 'summary'" (click)="setViewMode('summary')">
            <i class="material-icons">dashboard</i>
            Staff Summary
          </button>
        </div>
        <div class="action-buttons-group">
          <button class="btn-secondary" (click)="openBulkActionModal()">
            <i class="material-icons">settings</i>
            Bulk Approve
          </button>
          <button class="btn-primary" (click)="openCreateOvertimeModal()">
            <i class="material-icons">add</i>
            Create Overtime
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card total-hours">
          <div class="stat-icon"><i class="material-icons">schedule</i></div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalHours | number:'1.1-1' }}</div>
            <div class="stat-label">Total Hours</div>
          </div>
        </div>
        <div class="stat-card this-month">
          <div class="stat-icon"><i class="material-icons">calendar_month</i></div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.thisMonth | number:'1.1-1' }}</div>
            <div class="stat-label">This Month</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon"><i class="material-icons">pending</i></div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending | number:'1.1-1' }}</div>
            <div class="stat-label">Pending Hours</div>
          </div>
        </div>
        <div class="stat-card total-amount">
          <div class="stat-icon"><i class="material-icons">attach_money</i></div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalAmount | currency:'INR':'symbol':'1.0-0' }}</div>
            <div class="stat-label">Total Amount</div>
          </div>
        </div>
      </div>

      <div class="records-view" *ngIf="viewMode === 'records'">
        <div class="section-header">
          <h2><i class="material-icons">list</i> Overtime Records</h2>
          <div class="filters">
            <div class="search-box">
              <i class="material-icons">search</i>
              <input type="text" placeholder="Search by staff name or ID..."
                [(ngModel)]="searchTerm" (input)="filterRecords()">
            </div>
            <select [(ngModel)]="selectedStatus" (change)="filterRecords()" class="status-filter">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
            <select [(ngModel)]="selectedOvertimeType" (change)="filterRecords()" class="type-filter">
              <option value="">All Types</option>
              <option value="regular">Regular Overtime</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
              <option value="night">Night Shift</option>
            </select>
            <input type="date" [(ngModel)]="selectedDate" (change)="filterRecords()" class="date-filter">
          </div>
        </div>

        <div class="loading" *ngIf="isLoading">Loading overtime records...</div>

        <div class="records-table-container" *ngIf="!isLoading">
          <table class="records-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Date</th>
                <th>Time</th>
                <th>Hours</th>
                <th>Type</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let record of filteredRecords">
                <td>
                  <div class="staff-info">
                    <div class="staff-name">{{ record.staffName }}</div>
                    <div class="staff-details">{{ record.staffId }} • {{ record.department }}</div>
                  </div>
                </td>
                <td>{{ formatDate(record.date) }}</td>
                <td>
                  <div class="time-range">
                    <span>{{ record.startTime }}</span>
                    <i class="material-icons">arrow_forward</i>
                    <span>{{ record.endTime }}</span>
                  </div>
                </td>
                <td><span class="hours-badge">{{ record.totalHours | number:'1.1-1' }}h</span></td>
                <td>
                  <span class="type-badge" [ngClass]="'type-' + record.overtimeType">
                    {{ getOvertimeTypeLabel(record.overtimeType) }}
                  </span>
                </td>
                <td><span class="rate-badge">{{ record.rate }}x</span></td>
                <td><span class="amount-value">{{ record.amount | currency:'INR':'symbol':'1.0-0' }}</span></td>
                <td class="reason-cell">
                  <span class="reason-text" [title]="record.reason">{{ truncateText(record.reason, 40) }}</span>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="'status-' + record.status">
                    {{ getStatusLabel(record.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon-small approve" (click)="approveRecord(record)"
                      *ngIf="record.status === 'pending'" title="Approve">
                      <i class="material-icons">check_circle</i>
                    </button>
                    <button class="btn-icon-small reject" (click)="rejectRecord(record)"
                      *ngIf="record.status === 'pending'" title="Reject">
                      <i class="material-icons">cancel</i>
                    </button>
                    <button class="btn-icon-small view" (click)="viewRecord(record)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredRecords.length === 0">
                <td colspan="10" class="no-data">
                  <i class="material-icons">inbox</i>
                  <p>No overtime records found</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="summary-view" *ngIf="viewMode === 'summary'">
        <div class="section-header">
          <h2><i class="material-icons">dashboard</i> Staff Overtime Summary</h2>
          <div class="search-box">
            <i class="material-icons">search</i>
            <input type="text" placeholder="Search by staff name or ID..."
              [(ngModel)]="summarySearchTerm" (input)="loadSummaries()">
          </div>
        </div>

        <div class="summary-grid">
          <div *ngFor="let summary of staffSummaries" class="summary-card">
            <div class="summary-header">
              <h3>{{ summary.staffName }}</h3>
              <span class="staff-id">{{ summary.staffId }}</span>
            </div>
            <div class="summary-content">
              <div class="summary-item">
                <div class="summary-label">Total Hours</div>
                <div class="summary-value hours">{{ summary.totalHours | number:'1.1-1' }}h</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">This Month</div>
                <div class="summary-value">{{ summary.thisMonth | number:'1.1-1' }}h</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Pending</div>
                <div class="summary-value pending">{{ summary.pendingHours | number:'1.1-1' }}h</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Approved</div>
                <div class="summary-value approved">{{ summary.approvedHours | number:'1.1-1' }}h</div>
              </div>
              <div class="summary-item total-amount">
                <div class="summary-label">Total Amount</div>
                <div class="summary-value amount">{{ summary.totalAmount | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
            </div>
          </div>
          <div class="no-data summary-empty" *ngIf="staffSummaries.length === 0">
            <i class="material-icons">inbox</i>
            <p>No staff overtime summaries yet</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overtime-tracking-container { padding: 24px; max-width: 1600px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .back-button {
      display: flex; align-items: center; gap: 8px; padding: 8px 16px;
      background: #ecf0f1; border: none; border-radius: 8px; cursor: pointer;
      color: #2c3e50; font-size: 14px;
    }
    .back-button:hover { background: #bdc3c7; }
    .page-header h1 {
      display: flex; align-items: center; gap: 12px; font-size: 28px;
      margin: 0 0 4px 0; color: #2c3e50;
    }
    .page-header h1 .material-icons { font-size: 32px; color: #6c5ce7; }
    .page-header p { margin: 0; color: #7f8c8d; font-size: 14px; }
    .api-banner {
      display: flex; align-items: center; gap: 8px; margin-top: 8px;
      padding: 8px 12px; background: rgba(39, 174, 96, 0.1);
      border-radius: 8px; color: #27ae60; font-size: 13px;
    }
    .load-error {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      background: rgba(231, 76, 60, 0.1); color: #e74c3c; border-radius: 8px; margin-bottom: 16px;
    }
    .form-panel {
      background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .form-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px; margin: 12px 0;
    }
    .form-grid input, .form-grid select { padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
    .reason-input { grid-column: 1 / -1; }
    .panel-actions { display: flex; gap: 12px; }
    .action-bar {
      display: flex; justify-content: space-between; align-items: center;
      gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .view-options {
      display: flex; gap: 8px; background: #f8f9fa; padding: 4px; border-radius: 8px;
    }
    .view-btn {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      background: transparent; border: none; border-radius: 6px; cursor: pointer;
      color: #7f8c8d; font-size: 14px;
    }
    .view-btn.active { background: white; color: #6c5ce7; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .action-buttons-group { display: flex; gap: 12px; }
    .btn-primary, .btn-secondary {
      display: flex; align-items: center; gap: 8px; padding: 10px 20px;
      border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .btn-primary { background: #6c5ce7; color: white; }
    .btn-primary:hover { background: #5f4fcf; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: #ecf0f1; color: #2c3e50; }
    .btn-secondary:hover { background: #bdc3c7; }
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .stat-card {
      background: white; border-radius: 12px; padding: 20px;
      display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stat-icon {
      width: 56px; height: 56px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-card.total-hours .stat-icon { background: rgba(108,92,231,0.1); color: #6c5ce7; }
    .stat-card.this-month .stat-icon { background: rgba(155,89,182,0.1); color: #9b59b6; }
    .stat-card.pending .stat-icon { background: rgba(52,152,219,0.1); color: #3498db; }
    .stat-card.total-amount .stat-icon { background: rgba(39,174,96,0.1); color: #27ae60; }
    .stat-value { font-size: 28px; font-weight: 600; color: #2c3e50; }
    .stat-label { font-size: 12px; color: #7f8c8d; margin-top: 4px; }
    .records-view, .summary-view {
      background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .section-header h2 {
      display: flex; align-items: center; gap: 8px; font-size: 20px;
      margin: 0 0 16px 0; color: #2c3e50;
    }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; }
    .search-box {
      flex: 1; position: relative; display: flex; align-items: center; min-width: 200px;
    }
    .search-box .material-icons { position: absolute; left: 12px; color: #7f8c8d; }
    .search-box input {
      width: 100%; padding: 10px 12px 10px 40px; border: 1px solid #ddd; border-radius: 8px;
    }
    .status-filter, .type-filter, .date-filter {
      padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; background: white;
    }
    .loading { padding: 24px; text-align: center; color: #7f8c8d; }
    .records-table-container { overflow-x: auto; }
    .records-table { width: 100%; border-collapse: collapse; }
    .records-table th {
      background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600;
      color: #2c3e50; font-size: 13px; border-bottom: 2px solid #e9ecef;
    }
    .records-table td {
      padding: 12px; border-bottom: 1px solid #e9ecef; font-size: 14px; color: #2c3e50;
    }
    .staff-name { font-weight: 500; }
    .staff-details { font-size: 12px; color: #7f8c8d; margin-top: 2px; }
    .time-range { display: flex; align-items: center; gap: 4px; font-size: 13px; }
    .time-range .material-icons { font-size: 16px; color: #7f8c8d; }
    .hours-badge {
      padding: 4px 8px; background: rgba(108,92,231,0.1); color: #6c5ce7;
      border-radius: 8px; font-size: 12px; font-weight: 500;
    }
    .type-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .type-regular { background: rgba(52,152,219,0.1); color: #3498db; }
    .type-holiday { background: rgba(231,76,60,0.1); color: #e74c3c; }
    .type-weekend { background: rgba(230,126,34,0.1); color: #e67e22; }
    .type-night { background: rgba(155,89,182,0.1); color: #9b59b6; }
    .rate-badge {
      padding: 4px 8px; background: #f8f9fa; border-radius: 8px;
      font-size: 12px; font-weight: 500;
    }
    .amount-value { font-weight: 600; color: #27ae60; }
    .reason-cell { max-width: 200px; }
    .reason-text { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-pending { background: rgba(52,152,219,0.1); color: #3498db; }
    .status-approved { background: rgba(39,174,96,0.1); color: #27ae60; }
    .status-rejected { background: rgba(231,76,60,0.1); color: #e74c3c; }
    .status-paid { background: rgba(155,89,182,0.1); color: #9b59b6; }
    .action-buttons { display: flex; gap: 4px; }
    .btn-icon-small {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      background: #ecf0f1; border: none; border-radius: 6px; cursor: pointer; color: #2c3e50;
    }
    .btn-icon-small.approve:hover { background: rgba(39,174,96,0.1); color: #27ae60; }
    .btn-icon-small.reject:hover { background: rgba(231,76,60,0.1); color: #e74c3c; }
    .btn-icon-small.view:hover { background: rgba(52,152,219,0.1); color: #3498db; }
    .no-data { text-align: center; padding: 40px !important; color: #7f8c8d; }
    .no-data .material-icons { font-size: 48px; color: #bdc3c7; margin-bottom: 8px; }
    .summary-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;
    }
    .summary-card {
      background: #f8f9fa; border-radius: 12px; padding: 20px; border-left: 4px solid #6c5ce7;
    }
    .summary-header h3 { font-size: 18px; margin: 0 0 4px 0; color: #2c3e50; }
    .staff-id { font-size: 12px; color: #7f8c8d; }
    .summary-content { display: flex; flex-direction: column; gap: 12px; }
    .summary-item { display: flex; justify-content: space-between; align-items: center; }
    .summary-label { font-size: 13px; color: #7f8c8d; }
    .summary-value { font-size: 16px; font-weight: 600; color: #2c3e50; }
    .summary-value.hours { color: #6c5ce7; }
    .summary-value.pending { color: #3498db; }
    .summary-value.approved { color: #27ae60; }
    .summary-value.amount { color: #27ae60; font-size: 18px; }
    .summary-item.total-amount { padding-top: 12px; border-top: 1px solid #e9ecef; }
    .summary-empty { grid-column: 1 / -1; }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .action-bar { flex-direction: column; }
      .filters { flex-direction: column; }
    }
  `]
})
export class OvertimeTrackingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  viewMode: 'records' | 'summary' = 'records';

  overtimeRecords: OvertimeRecord[] = [];
  filteredRecords: OvertimeRecord[] = [];
  staffSummaries: StaffOvertimeSummary[] = [];
  staffMembers: OvertimeStaffMember[] = [];

  searchTerm = '';
  summarySearchTerm = '';
  selectedStatus = '';
  selectedOvertimeType = '';
  selectedDate = '';

  loadError = '';
  isLoading = false;
  isSaving = false;
  showCreatePanel = false;

  createForm = {
    staffId: '',
    overtimeDate: '',
    startTime: '18:00',
    endTime: '22:00',
    overtimeType: 'regular' as OvertimeType,
    reason: ''
  };

  stats: OvertimeStatistics = {
    totalHours: 0,
    thisMonth: 0,
    thisYear: 0,
    pending: 0,
    approved: 0,
    totalAmount: 0,
    averageHours: 0
  };

  constructor(
    private router: Router,
    private overtimeService: OvertimeTrackingService
  ) {}

  ngOnInit(): void {
    this.loadStaffMembers();
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllData(): void {
    this.loadRecords();
    if (this.viewMode === 'summary') {
      this.loadSummaries();
    }
  }

  loadStaffMembers(): void {
    if (!this.resolveSocietyId()) return;
    this.overtimeService
      .getStaffMembers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: staff => { this.staffMembers = staff; },
        error: err => console.error('Error loading staff:', err)
      });
  }

  loadRecords(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.overtimeRecords = [];
      this.filteredRecords = [];
      this.stats = {
        totalHours: 0, thisMonth: 0, thisYear: 0,
        pending: 0, approved: 0, totalAmount: 0, averageHours: 0
      };
      return;
    }

    const filter = {
      status: this.selectedStatus ? (this.selectedStatus as OvertimeStatus) : undefined,
      overtimeType: this.selectedOvertimeType ? (this.selectedOvertimeType as OvertimeType) : undefined,
      searchTerm: this.searchTerm || undefined,
      date: this.selectedDate || undefined
    };

    this.overtimeService
      .getRecords(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: records => {
          this.overtimeRecords = records;
          this.filteredRecords = applyOvertimeFilter(records, filter);
          this.isLoading = false;
        },
        error: err => {
          console.error('Error loading overtime records:', err);
          this.loadError = 'Failed to load overtime records from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });

    this.overtimeService
      .getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => { this.stats = stats; },
        error: err => console.error('Error loading statistics:', err)
      });
  }

  loadSummaries(): void {
    if (!this.resolveSocietyId()) return;

    this.overtimeService
      .getSummaries(this.summarySearchTerm || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: summaries => { this.staffSummaries = summaries; },
        error: err => console.error('Error loading summaries:', err)
      });
  }

  setViewMode(mode: 'records' | 'summary'): void {
    this.viewMode = mode;
    if (mode === 'summary') {
      this.loadSummaries();
    } else {
      this.loadRecords();
    }
  }

  filterRecords(): void {
    this.loadRecords();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  getOvertimeTypeLabel = getOvertimeTypeLabel;
  getStatusLabel = getStatusLabel;

  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  approveRecord(record: OvertimeRecord): void {
    if (!window.confirm(`Approve overtime for ${record.staffName}?`)) return;

    this.overtimeService
      .approveRecord(record.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.loadAllData();
        },
        error: err => {
          console.error('Approve failed:', err);
          window.alert('Failed to approve overtime record.');
        }
      });
  }

  rejectRecord(record: OvertimeRecord): void {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;

    this.overtimeService
      .rejectRecord(record.id, reason || 'Rejected')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.loadAllData();
        },
        error: err => {
          console.error('Reject failed:', err);
          window.alert('Failed to reject overtime record.');
        }
      });
  }

  viewRecord(record: OvertimeRecord): void {
    const details = `
Staff: ${record.staffName} (${record.staffId})
Department: ${record.department}
Date: ${this.formatDate(record.date)}
Time: ${record.startTime} - ${record.endTime}
Hours: ${record.totalHours}h
Type: ${getOvertimeTypeLabel(record.overtimeType)}
Rate: ${record.rate}x
Amount: ${record.amount ?? 0}
Reason: ${record.reason}
Status: ${getStatusLabel(record.status)}
${record.approvedBy ? `Approved by: ${record.approvedBy}` : ''}
${record.rejectionReason ? `Rejection Reason: ${record.rejectionReason}` : ''}
    `;
    window.alert(details);
  }

  openCreateOvertimeModal(): void {
    this.showCreatePanel = true;
    const today = new Date().toISOString().split('T')[0];
    this.createForm = {
      staffId: this.staffMembers[0]?.id ?? '',
      overtimeDate: today,
      startTime: '18:00',
      endTime: '22:00',
      overtimeType: 'regular',
      reason: ''
    };
  }

  closeCreatePanel(): void {
    this.showCreatePanel = false;
  }

  submitCreateOvertime(): void {
    if (!this.createForm.staffId || !this.createForm.overtimeDate ||
        !this.createForm.startTime || !this.createForm.endTime) {
      window.alert('Staff, date, start time, and end time are required.');
      return;
    }

    this.isSaving = true;
    this.overtimeService
      .createRecord({
        staffId: this.createForm.staffId,
        overtimeDate: this.createForm.overtimeDate,
        startTime: this.createForm.startTime,
        endTime: this.createForm.endTime,
        overtimeType: this.createForm.overtimeType,
        reason: this.createForm.reason
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isSaving = false;
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.showCreatePanel = false;
          this.loadAllData();
        },
        error: err => {
          console.error('Create overtime failed:', err);
          this.isSaving = false;
          window.alert('Failed to create overtime record.');
        }
      });
  }

  openBulkActionModal(): void {
    const pending = this.filteredRecords.filter(r => r.status === 'pending');
    if (pending.length === 0) {
      window.alert('No pending overtime records to approve.');
      return;
    }
    if (!window.confirm(`Approve all ${pending.length} pending record(s)?`)) return;

    this.overtimeService
      .bulkApprove(pending.map(r => r.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if (!result.success) {
            window.alert(result.message);
            return;
          }
          this.loadAllData();
        },
        error: err => {
          console.error('Bulk approve failed:', err);
          window.alert('Failed to bulk approve overtime records.');
        }
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

  goBack(): void {
    this.router.navigate(['/admin/guard-management']);
  }
}
