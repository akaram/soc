import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DoubleShiftDetectionService } from '../services/double-shift-detection.service';
import {
  DoubleShiftConflict,
  DoubleShiftStatistics,
  ConflictSeverity,
  ConflictStatus,
  ConflictType
} from '../models/double-shift-detection.model';
import {
  applyConflictFilter,
  conflictsToCsv
} from '../services/double-shift-detection-api.mapper';

@Component({
  selector: 'app-double-shift-detection',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="double-shift-detection-container">
      <div class="page-header">
        <button class="back-button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Dashboard
        </button>
        <div>
          <h1>
            <i class="material-icons">warning</i>
            Double Shift Detection
          </h1>
          <p>Detect and manage overlapping shift assignments</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/double-shift-detection</strong> API — scans shift assignments.</span>
          </div>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <div class="search-filter">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by staff name or ID..."
              [(ngModel)]="searchTerm"
              (input)="filterConflicts()">
          </div>
          <select [(ngModel)]="selectedSeverity" (change)="filterConflicts()" class="severity-filter">
            <option value="">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select [(ngModel)]="selectedStatus" (change)="filterConflicts()" class="status-filter">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
          <select [(ngModel)]="selectedConflictType" (change)="filterConflicts()" class="type-filter">
            <option value="">All Types</option>
            <option value="full-overlap">Full Overlap</option>
            <option value="partial-overlap">Partial Overlap</option>
            <option value="consecutive">Consecutive</option>
          </select>
        </div>
        <div class="action-buttons-group">
          <button class="btn-secondary" (click)="runDetection()" [disabled]="isDetecting">
            <i class="material-icons">refresh</i>
            {{ isDetecting ? 'Detecting...' : 'Run Detection' }}
          </button>
          <button class="btn-secondary" (click)="bulkResolve()" [disabled]="selectedConflicts.length === 0">
            <i class="material-icons">check_circle</i>
            Bulk Resolve ({{ selectedConflicts.length }})
          </button>
          <button class="btn-primary" (click)="exportReport()">
            <i class="material-icons">download</i>
            Export Report
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalDetected }}</div>
            <div class="stat-label">Total Detected</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card resolved">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.resolved }}</div>
            <div class="stat-label">Resolved</div>
          </div>
        </div>
        <div class="stat-card high-severity">
          <div class="stat-icon">
            <i class="material-icons">error</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.highSeverity }}</div>
            <div class="stat-label">High Severity</div>
          </div>
        </div>
      </div>

      <!-- Conflicts List -->
      <div class="conflicts-section">
        <div class="section-header">
          <h2>
            <i class="material-icons">list</i>
            Detected Conflicts
            <span class="badge-count" *ngIf="filteredConflicts.length > 0">
              {{ filteredConflicts.length }}
            </span>
          </h2>
          <div class="section-actions">
            <label class="select-all-checkbox">
              <input 
                type="checkbox" 
                [checked]="isAllSelected()"
                (change)="toggleSelectAll()">
              Select All
            </label>
          </div>
        </div>

        <div class="conflicts-list">
          <div 
            *ngFor="let conflict of filteredConflicts" 
            class="conflict-card"
            [ngClass]="{
              'conflict-pending': conflict.status === 'pending',
              'conflict-resolved': conflict.status === 'resolved',
              'conflict-ignored': conflict.status === 'ignored',
              'severity-high': conflict.severity === 'high',
              'severity-medium': conflict.severity === 'medium',
              'severity-low': conflict.severity === 'low'
            }">
            <div class="conflict-header">
              <div class="conflict-checkbox">
                <input 
                  type="checkbox" 
                  [checked]="isSelected(conflict.id)"
                  (change)="toggleSelection(conflict.id)">
              </div>
              <div class="conflict-staff-info">
                <h3>{{ conflict.staffName }}</h3>
                <p class="staff-details">
                  <span class="staff-id">ID: {{ conflict.staffId }}</span>
                  <span class="staff-dept">{{ conflict.department }}</span>
                </p>
              </div>
              <div class="conflict-badges">
                <span class="severity-badge" [ngClass]="'severity-' + conflict.severity">
                  {{ conflict.severity | titlecase }} Severity
                </span>
                <span class="status-badge" [ngClass]="'status-' + conflict.status">
                  {{ conflict.status | titlecase }}
                </span>
                <span class="type-badge" [ngClass]="'type-' + conflict.conflictType">
                  {{ getConflictTypeLabel(conflict.conflictType) }}
                </span>
              </div>
            </div>

            <div class="conflict-shifts">
              <div class="shift-item first-shift">
                <div class="shift-header">
                  <i class="material-icons">schedule</i>
                  <span class="shift-label">First Shift</span>
                </div>
                <div class="shift-details">
                  <div class="shift-name">{{ conflict.firstShift.name }}</div>
                  <div class="shift-date-time">
                    <span class="shift-date">{{ formatDate(conflict.firstShift.date) }}</span>
                    <span class="shift-time">{{ conflict.firstShift.startTime }} - {{ conflict.firstShift.endTime }}</span>
                  </div>
                  <div class="shift-location" *ngIf="conflict.firstShift.location">
                    <i class="material-icons">location_on</i>
                    {{ conflict.firstShift.location }}
                  </div>
                </div>
              </div>

              <div class="conflict-indicator">
                <div class="overlap-info">
                  <i class="material-icons">sync_alt</i>
                  <span class="overlap-duration">{{ conflict.overlapDuration }} min overlap</span>
                </div>
              </div>

              <div class="shift-item second-shift">
                <div class="shift-header">
                  <i class="material-icons">schedule</i>
                  <span class="shift-label">Second Shift</span>
                </div>
                <div class="shift-details">
                  <div class="shift-name">{{ conflict.secondShift.name }}</div>
                  <div class="shift-date-time">
                    <span class="shift-date">{{ formatDate(conflict.secondShift.date) }}</span>
                    <span class="shift-time">{{ conflict.secondShift.startTime }} - {{ conflict.secondShift.endTime }}</span>
                  </div>
                  <div class="shift-location" *ngIf="conflict.secondShift.location">
                    <i class="material-icons">location_on</i>
                    {{ conflict.secondShift.location }}
                  </div>
                </div>
              </div>
            </div>

            <div class="conflict-footer">
              <div class="conflict-meta">
                <span class="detected-at">
                  <i class="material-icons">access_time</i>
                  Detected: {{ formatDateTime(conflict.detectedAt) }}
                </span>
                <span class="resolved-at" *ngIf="conflict.resolvedAt">
                  <i class="material-icons">check</i>
                  Resolved: {{ formatDateTime(conflict.resolvedAt) }}
                </span>
              </div>
              <div class="conflict-actions">
                <button 
                  class="btn-action resolve" 
                  (click)="resolveConflict(conflict)"
                  *ngIf="conflict.status === 'pending'">
                  <i class="material-icons">check_circle</i>
                  Resolve
                </button>
                <button 
                  class="btn-action ignore" 
                  (click)="ignoreConflict(conflict)"
                  *ngIf="conflict.status === 'pending'">
                  <i class="material-icons">close</i>
                  Ignore
                </button>
                <button 
                  class="btn-action view" 
                  (click)="viewDetails(conflict)">
                  <i class="material-icons">visibility</i>
                  View Details
                </button>
                <button 
                  class="btn-action edit" 
                  (click)="editShifts(conflict)">
                  <i class="material-icons">edit</i>
                  Edit Shifts
                </button>
              </div>
            </div>
          </div>

          <div class="no-conflicts" *ngIf="filteredConflicts.length === 0">
            <i class="material-icons">check_circle</i>
            <h3>No Conflicts Detected</h3>
            <p *ngIf="!loadError">All shift assignments are properly scheduled without overlaps. Run detection to scan assignments.</p>
            <p *ngIf="loadError">{{ loadError }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .double-shift-detection-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .back-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #ecf0f1;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #2c3e50;
      font-size: 14px;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: #bdc3c7;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 28px;
      margin: 0 0 4px 0;
      color: #2c3e50;
    }

    .page-header h1 .material-icons {
      font-size: 32px;
      color: #e67e22;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .api-banner {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      color: #1b5e20;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .api-banner .material-icons { font-size: 20px; color: #2e7d32; flex-shrink: 0; }

    .load-error {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #fdecea;
      border: 1px solid #f5c6cb;
      color: #721c24;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .search-filter {
      display: flex;
      gap: 12px;
      flex: 1;
      min-width: 300px;
    }

    .search-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-box .material-icons {
      position: absolute;
      left: 12px;
      color: #7f8c8d;
    }

    .search-box input {
      width: 100%;
      padding: 10px 12px 10px 40px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }

    .severity-filter,
    .status-filter,
    .type-filter {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .action-buttons-group {
      display: flex;
      gap: 12px;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #e67e22;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #d35400;
    }

    .btn-primary:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    .btn-secondary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #ecf0f1;
      color: #2c3e50;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #bdc3c7;
    }

    .btn-secondary:disabled {
      background: #ecf0f1;
      color: #95a5a6;
      cursor: not-allowed;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-card.total .stat-icon {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .stat-card.pending .stat-icon {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .stat-card.resolved .stat-icon {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .stat-card.high-severity .stat-icon {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #2c3e50;
    }

    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .conflicts-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      margin: 0;
      color: #2c3e50;
    }

    .badge-count {
      background: #e67e22;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .select-all-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      color: #2c3e50;
    }

    .conflicts-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .conflict-card {
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s ease;
    }

    .conflict-card.severity-high {
      border-left: 4px solid #e74c3c;
    }

    .conflict-card.severity-medium {
      border-left: 4px solid #e67e22;
    }

    .conflict-card.severity-low {
      border-left: 4px solid #f39c12;
    }

    .conflict-card.conflict-resolved {
      background: #f8f9fa;
      opacity: 0.7;
    }

    .conflict-card.conflict-ignored {
      background: #f8f9fa;
      opacity: 0.6;
    }

    .conflict-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .conflict-checkbox {
      display: flex;
      align-items: center;
    }

    .conflict-staff-info {
      flex: 1;
    }

    .conflict-staff-info h3 {
      font-size: 18px;
      margin: 0 0 4px 0;
      color: #2c3e50;
    }

    .staff-details {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #7f8c8d;
      margin: 0;
    }

    .conflict-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .severity-badge,
    .status-badge,
    .type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .severity-high {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .severity-medium {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .severity-low {
      background: rgba(243, 156, 18, 0.1);
      color: #f39c12;
    }

    .status-pending {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .status-resolved {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .status-ignored {
      background: rgba(149, 165, 166, 0.1);
      color: #95a5a6;
    }

    .type-full-overlap,
    .type-partial-overlap,
    .type-consecutive {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .conflict-shifts {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      margin-bottom: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .shift-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .shift-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #2c3e50;
      font-size: 13px;
    }

    .shift-name {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .shift-date-time {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .shift-time {
      font-weight: 500;
      color: #2c3e50;
    }

    .shift-location {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .conflict-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .overlap-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px;
      background: rgba(231, 76, 60, 0.1);
      border-radius: 8px;
      color: #e74c3c;
      font-weight: 600;
      font-size: 13px;
    }

    .conflict-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid #e9ecef;
    }

    .conflict-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .conflict-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .conflict-actions {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-action.resolve {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .btn-action.resolve:hover {
      background: rgba(39, 174, 96, 0.2);
    }

    .btn-action.ignore {
      background: rgba(149, 165, 166, 0.1);
      color: #95a5a6;
    }

    .btn-action.ignore:hover {
      background: rgba(149, 165, 166, 0.2);
    }

    .btn-action.view {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .btn-action.view:hover {
      background: rgba(52, 152, 219, 0.2);
    }

    .btn-action.edit {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .btn-action.edit:hover {
      background: rgba(155, 89, 182, 0.2);
    }

    .no-conflicts {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .no-conflicts .material-icons {
      font-size: 64px;
      color: #27ae60;
      margin-bottom: 16px;
    }

    .no-conflicts h3 {
      font-size: 20px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .no-conflicts p {
      margin: 0;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .conflict-shifts {
        grid-template-columns: 1fr;
      }

      .conflict-indicator {
        order: 2;
      }

      .action-bar {
        flex-direction: column;
      }

      .search-filter {
        width: 100%;
      }
    }
  `]
})
export class DoubleShiftDetectionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  conflicts: DoubleShiftConflict[] = [];
  filteredConflicts: DoubleShiftConflict[] = [];
  selectedConflicts: string[] = [];

  searchTerm = '';
  selectedSeverity = '';
  selectedStatus = '';
  selectedConflictType = '';

  loadError = '';
  isLoading = false;
  isDetecting = false;

  stats: DoubleShiftStatistics = {
    totalDetected: 0,
    pending: 0,
    resolved: 0,
    ignored: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private detectionService: DoubleShiftDetectionService
  ) {}

  ngOnInit(): void {
    this.loadConflicts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConflicts(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.conflicts = [];
      this.filteredConflicts = [];
      this.stats = {
        totalDetected: 0,
        pending: 0,
        resolved: 0,
        ignored: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0
      };
      return;
    }

    const filter = this.buildFilter();

    this.detectionService
      .getConflicts(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: conflicts => {
          this.conflicts = conflicts;
          this.filteredConflicts = applyConflictFilter(conflicts, {
            severity: this.selectedSeverity ? (this.selectedSeverity as ConflictSeverity) : undefined,
            status: this.selectedStatus ? (this.selectedStatus as ConflictStatus) : undefined,
            conflictType: this.selectedConflictType ? (this.selectedConflictType as ConflictType) : undefined,
            searchTerm: this.searchTerm || undefined
          });
          this.isLoading = false;
        },
        error: err => {
          console.error('Error loading conflicts:', err);
          this.loadError = 'Failed to load conflicts from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });

    this.detectionService
      .getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
        },
        error: err => console.error('Error loading statistics:', err)
      });
  }

  filterConflicts(): void {
    this.loadConflicts();
  }

  private buildFilter() {
    return {
      severity: this.selectedSeverity ? (this.selectedSeverity as ConflictSeverity) : undefined,
      status: this.selectedStatus ? (this.selectedStatus as ConflictStatus) : undefined,
      conflictType: this.selectedConflictType ? (this.selectedConflictType as ConflictType) : undefined,
      searchTerm: this.searchTerm || undefined
    };
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getConflictTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'full-overlap': 'Full Overlap',
      'partial-overlap': 'Partial Overlap',
      'consecutive': 'Consecutive'
    };
    return labels[type] || type;
  }

  isSelected(conflictId: string): boolean {
    return this.selectedConflicts.includes(conflictId);
  }

  toggleSelection(conflictId: string): void {
    const index = this.selectedConflicts.indexOf(conflictId);
    if (index > -1) {
      this.selectedConflicts.splice(index, 1);
    } else {
      this.selectedConflicts.push(conflictId);
    }
  }

  isAllSelected(): boolean {
    return this.filteredConflicts.length > 0 && 
           this.selectedConflicts.length === this.filteredConflicts.length;
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedConflicts = [];
    } else {
      this.selectedConflicts = this.filteredConflicts.map(c => c.id);
    }
  }

  runDetection(): void {
    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }

    this.isDetecting = true;
    this.detectionService
      .runDetection()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isDetecting = false;
          if (!result.success) {
            window.alert(result.message);
            return;
          }
          window.alert(
            result.newConflicts && result.newConflicts > 0
              ? `Detection complete. ${result.newConflicts} new conflict(s) found.`
              : 'Detection complete. No new conflicts found.'
          );
          this.loadConflicts();
        },
        error: err => {
          console.error('Detection failed:', err);
          this.isDetecting = false;
          window.alert('Failed to run detection. Ensure the backend is running.');
        }
      });
  }

  resolveConflict(conflict: DoubleShiftConflict): void {
    const note = window.prompt('Enter resolution note (optional):');
    if (note === null) return;

    this.detectionService
      .resolveConflict(conflict.id, note || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.selectedConflicts = this.selectedConflicts.filter(id => id !== conflict.id);
          this.loadConflicts();
        },
        error: err => {
          console.error('Resolve failed:', err);
          window.alert('Failed to resolve conflict.');
        }
      });
  }

  ignoreConflict(conflict: DoubleShiftConflict): void {
    if (!window.confirm(`Ignore conflict for ${conflict.staffName}?`)) return;

    this.detectionService
      .ignoreConflict(conflict.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.selectedConflicts = this.selectedConflicts.filter(id => id !== conflict.id);
          this.loadConflicts();
        },
        error: err => {
          console.error('Ignore failed:', err);
          window.alert('Failed to ignore conflict.');
        }
      });
  }

  bulkResolve(): void {
    if (this.selectedConflicts.length === 0) return;

    if (!window.confirm(`Resolve ${this.selectedConflicts.length} selected conflict(s)?`)) return;

    this.detectionService
      .bulkResolve(this.selectedConflicts)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if (!result.success) {
            window.alert(result.message);
            return;
          }
          this.selectedConflicts = [];
          this.loadConflicts();
        },
        error: err => {
          console.error('Bulk resolve failed:', err);
          window.alert('Failed to bulk resolve conflicts.');
        }
      });
  }

  viewDetails(conflict: DoubleShiftConflict): void {
    const details = `
Staff: ${conflict.staffName} (${conflict.staffId})
Department: ${conflict.department}
Severity: ${conflict.severity}
Type: ${this.getConflictTypeLabel(conflict.conflictType)}
Overlap: ${conflict.overlapDuration} minutes
Status: ${conflict.status}
Detected: ${this.formatDateTime(conflict.detectedAt)}
${conflict.resolutionNote ? `Resolution: ${conflict.resolutionNote}` : ''}
    `;
    window.alert(details);
  }

  editShifts(conflict: DoubleShiftConflict): void {
    window.alert(`Editing shifts for ${conflict.staffName}`);
    // Implement edit shifts logic - navigate to shift management
    this.router.navigate(['/admin/guard-management/shift-management']);
  }

  exportReport(): void {
    if (this.filteredConflicts.length === 0) {
      window.alert('No conflicts to export.');
      return;
    }

    const csv = conflictsToCsv(this.filteredConflicts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `double-shift-conflicts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private resolveSocietyId(): string {
    const direct = localStorage.getItem('societyId');
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

