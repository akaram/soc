import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PatrolCompletionReportService } from '../services/patrol-completion-report.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  PatrolCompletionReport,
  ReportType,
  ReportStatus,
  PatrolCompletionReportFilter,
  PatrolCompletionReportStatistics,
  GenerateReportRequest
} from '../models/patrol-completion-report.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-patrol-completion-reports-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="patrol-completion-reports-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">assessment</i>
          Patrol Completion Reports
        </h1>
        <p>Generate and view patrol completion reports and analytics</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Live data from <strong>/patrol-completion-reports</strong>, <strong>/checkpoint-active-patrols</strong>, and <strong>/checkpoint-scans</strong> APIs.</span>
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
            <i class="material-icons">assessment</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalReports }}</div>
            <div class="stat-label">Total Reports</div>
          </div>
        </div>
        <div class="stat-card generated">
          <div class="stat-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.generatedReports }}</div>
            <div class="stat-label">Generated</div>
          </div>
        </div>
        <div class="stat-card approved">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.approvedReports }}</div>
            <div class="stat-label">Approved</div>
          </div>
        </div>
        <div class="stat-card archived">
          <div class="stat-icon">
            <i class="material-icons">archive</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.archivedReports }}</div>
            <div class="stat-label">Archived</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="showGenerateModal = true">
          <i class="material-icons">add</i>
          Generate New Report
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search reports..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Report Type</label>
          <select [(ngModel)]="filter.reportType" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="ReportType.DAILY">Daily</option>
            <option [value]="ReportType.WEEKLY">Weekly</option>
            <option [value]="ReportType.MONTHLY">Monthly</option>
            <option [value]="ReportType.CUSTOM">Custom</option>
            <option [value]="ReportType.ROUTE_SPECIFIC">Route Specific</option>
            <option [value]="ReportType.GUARD_SPECIFIC">Guard Specific</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="ReportStatus.DRAFT">Draft</option>
            <option [value]="ReportStatus.GENERATED">Generated</option>
            <option [value]="ReportStatus.APPROVED">Approved</option>
            <option [value]="ReportStatus.ARCHIVED">Archived</option>
          </select>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Reports Grid -->
      <div class="reports-grid" *ngIf="!isLoading && reports.length > 0">
        <div *ngFor="let report of reports" class="report-card" [ngClass]="'status-' + report.status.toLowerCase()">
          <div class="report-header">
            <div class="report-icon">
              <i class="material-icons">assessment</i>
            </div>
            <div class="report-title-section">
              <h3>{{ report.reportName }}</h3>
              <div class="report-badges">
                <span class="badge-type">{{ getReportTypeLabel(report.reportType) }}</span>
                <span class="badge-status" [ngClass]="'status-' + report.status.toLowerCase()">
                  {{ getStatusLabel(report.status) }}
                </span>
              </div>
            </div>
            <div class="report-actions">
              <button class="btn-action" (click)="viewReport(report)" title="View Report">
                <i class="material-icons">visibility</i>
              </button>
              <button class="btn-action" (click)="exportReport(report, 'PDF')" title="Export PDF">
                <i class="material-icons">picture_as_pdf</i>
              </button>
              <button class="btn-action" (click)="exportReport(report, 'EXCEL')" title="Export Excel">
                <i class="material-icons">table_chart</i>
              </button>
              <button class="btn-action danger" (click)="deleteReport(report)" title="Delete">
                <i class="material-icons">delete</i>
              </button>
            </div>
          </div>
          <div class="report-body">
            <div class="report-date-range">
              <i class="material-icons">calendar_today</i>
              <span>{{ formatDate(report.startDate) }} - {{ formatDate(report.endDate) }}</span>
            </div>
            <div class="report-summary">
              <div class="summary-item">
                <span class="summary-label">Total Patrols:</span>
                <span class="summary-value">{{ report.totalPatrols }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Completed:</span>
                <span class="summary-value success">{{ report.completedPatrols }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Completion Rate:</span>
                <span class="summary-value">{{ report.completionRate }}%</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">On-Time Rate:</span>
                <span class="summary-value">{{ report.onTimeRate }}%</span>
              </div>
            </div>
            <div class="report-details">
              <div class="detail-row">
                <span class="detail-label">Average Time:</span>
                <span class="detail-value">{{ report.averageCompletionTime }} minutes</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Checkpoints Scanned:</span>
                <span class="detail-value">{{ report.totalCheckpointsScanned }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Missed Checkpoints:</span>
                <span class="detail-value error">{{ report.totalCheckpointsMissed }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Issues:</span>
                <span class="detail-value" [ngClass]="{'error': report.totalIssues > 0}">
                  {{ report.totalIssues }} ({{ report.criticalIssues }} critical)
                </span>
              </div>
            </div>
            <div class="report-footer">
              <span class="report-generated">
                <i class="material-icons">person</i>
                Generated by {{ report.generatedBy }} on {{ formatDateTime(report.generatedAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && reports.length === 0">
        <i class="material-icons">assessment</i>
        <p>No reports found</p>
        <button class="btn-primary" (click)="showGenerateModal = true">
          <i class="material-icons">add</i>
          Generate First Report
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading reports...</p>
      </div>

      <!-- Generate Report Modal -->
      <div class="modal-overlay" *ngIf="showGenerateModal" (click)="showGenerateModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>
              <i class="material-icons">assessment</i>
              Generate Patrol Completion Report
            </h2>
            <button class="btn-close" (click)="showGenerateModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="generateReport()">
              <div class="form-group">
                <label>Report Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="generateRequest.reportName" 
                  name="reportName"
                  required
                  placeholder="e.g., Daily Patrol Report - Jan 15, 2024"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Report Type *</label>
                <select 
                  [(ngModel)]="generateRequest.reportType" 
                  name="reportType"
                  required
                  class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="ReportType.DAILY">Daily</option>
                  <option [value]="ReportType.WEEKLY">Weekly</option>
                  <option [value]="ReportType.MONTHLY">Monthly</option>
                  <option [value]="ReportType.CUSTOM">Custom</option>
                  <option [value]="ReportType.ROUTE_SPECIFIC">Route Specific</option>
                  <option [value]="ReportType.GUARD_SPECIFIC">Guard Specific</option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Start Date *</label>
                  <input 
                    type="date" 
                    [(ngModel)]="startDateInput"
                    (change)="onStartDateChange()"
                    name="startDate"
                    required
                    class="form-control">
                </div>
                <div class="form-group">
                  <label>End Date *</label>
                  <input 
                    type="date" 
                    [(ngModel)]="endDateInput"
                    (change)="onEndDateChange()"
                    name="endDate"
                    required
                    class="form-control">
                </div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="showGenerateModal = false">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="isGenerating">
                  <i class="material-icons">assessment</i>
                  {{ isGenerating ? 'Generating...' : 'Generate Report' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .patrol-completion-reports-container {
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
      border-left: 4px solid;
    }

    .stat-card.total { border-left-color: #667eea; }
    .stat-card.generated { border-left-color: #17a2b8; }
    .stat-card.approved { border-left-color: #28a745; }
    .stat-card.archived { border-left-color: #6c757d; }

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
    .stat-card.generated .stat-icon { background: #17a2b8; }
    .stat-card.approved .stat-icon { background: #28a745; }
    .stat-card.archived .stat-icon { background: #6c757d; }

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
      text-decoration: none;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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

    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
      gap: 20px;
    }

    .report-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
      transition: all 0.2s;
    }

    .report-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .report-card.status-generated {
      border-left-color: #17a2b8;
    }

    .report-card.status-approved {
      border-left-color: #28a745;
    }

    .report-card.status-archived {
      border-left-color: #6c757d;
    }

    .report-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .report-icon {
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

    .report-title-section {
      flex: 1;
    }

    .report-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .report-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-type,
    .badge-status {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-type {
      background: #e7f3ff;
      color: #004085;
    }

    .badge-status.status-generated {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-status.status-approved {
      background: #d4edda;
      color: #155724;
    }

    .badge-status.status-archived {
      background: #d6d8db;
      color: #383d41;
    }

    .report-actions {
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

    .report-body {
      margin-top: 16px;
    }

    .report-date-range {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .report-summary {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .summary-label {
      font-size: 13px;
      color: #7f8c8d;
    }

    .summary-value {
      font-size: 16px;
      font-weight: 700;
      color: #2c3e50;
    }

    .summary-value.success {
      color: #28a745;
    }

    .report-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    .detail-label {
      color: #7f8c8d;
    }

    .detail-value {
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-value.error {
      color: #dc3545;
    }

    .report-footer {
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      font-size: 12px;
      color: #7f8c8d;
    }

    .report-generated {
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

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: modal-appear 0.3s ease;
    }

    @keyframes modal-appear {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 2px solid #f0f0f0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-close {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f5f5f5;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close:hover {
      background: #e0e0e0;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .btn-secondary {
      padding: 12px 24px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    @media (max-width: 1024px) {
      .reports-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PatrolCompletionReportsListComponent implements OnInit, OnDestroy {
  reports: PatrolCompletionReport[] = [];
  statistics: PatrolCompletionReportStatistics | null = null;
  isLoading = false;
  isGenerating = false;
  showGenerateModal = false;
  loadError = '';

  filter: PatrolCompletionReportFilter = {};
  generateRequest: GenerateReportRequest = {
    reportName: '',
    reportType: ReportType.DAILY,
    startDate: new Date(),
    endDate: new Date()
  };

  startDateInput = '';
  endDateInput = '';

  ReportType = ReportType;
  ReportStatus = ReportStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private reportService: PatrolCompletionReportService,
    private router: Router,
    private session: SessionContextService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.initializeGenerateRequest();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeGenerateRequest(): void {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    this.generateRequest.startDate = yesterday;
    this.generateRequest.endDate = today;
    this.startDateInput = this.formatDateForInput(yesterday);
    this.endDateInput = this.formatDateForInput(today);
  }

  loadData(): void {
    this.loadError = '';
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.reports = [];
      this.statistics = null;
      return;
    }

    this.isLoading = true;

    this.reportService.getAllReports(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reports) => {
          this.reports = reports;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading reports:', error);
          this.loadError = 'Failed to load reports from the API. Ensure the backend is running.';
          this.reports = [];
          this.isLoading = false;
        }
      });

    this.reportService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
          if (!this.loadError) {
            this.loadError = 'Failed to load report statistics from the API.';
          }
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

  generateReport(): void {
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }
    if (!this.generateRequest.reportName || !this.generateRequest.reportType) {
      window.alert('Please fill in all required fields');
      return;
    }

    this.isGenerating = true;
    this.reportService.generateReport(this.generateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.isGenerating = false;
          this.showGenerateModal = false;
          this.loadData();
          this.router.navigate(['/admin/guard-patrol/completion-reports', report.id]);
        },
        error: (error) => {
          console.error('Error generating report:', error);
          this.isGenerating = false;
          window.alert(
            error?.message === 'No society selected'
              ? 'No society selected. Log in as admin and select a society in Society Setup.'
              : 'Failed to generate report from live patrol data. Ensure the backend is running and checkpoint scans exist for the selected period.'
          );
        }
      });
  }

  viewReport(report: PatrolCompletionReport): void {
    this.router.navigate(['/admin/guard-patrol/completion-reports', report.id]);
  }

  exportReport(report: PatrolCompletionReport, format: 'PDF' | 'EXCEL' | 'CSV'): void {
    this.reportService.exportReport(report.id, format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safe = report.reportName.replace(/[^a-z0-9-_]+/gi, '_').replace(/_+/g, '_') || 'patrol-report';
          const ext =
            format === 'PDF' ? (blob.type.includes('pdf') ? 'pdf' : 'html') : 'csv';
          a.download = `${safe}.${ext}`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error exporting report:', error);
          window.alert('Error exporting report');
        }
      });
  }

  deleteReport(report: PatrolCompletionReport): void {
    if (window.confirm(`Are you sure you want to delete the report "${report.reportName}"?`)) {
      this.reportService.deleteReport(report.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              this.loadData();
            } else {
              window.alert('Error deleting report');
            }
          },
          error: (error) => {
            console.error('Error deleting report:', error);
            window.alert('Error deleting report');
          }
        });
    }
  }

  onStartDateChange(): void {
    if (this.startDateInput) {
      this.generateRequest.startDate = new Date(this.startDateInput);
    }
  }

  onEndDateChange(): void {
    if (this.endDateInput) {
      this.generateRequest.endDate = new Date(this.endDateInput);
    }
  }

  formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getReportTypeLabel(type: ReportType): string {
    const labels: { [key: string]: string } = {
      'DAILY': 'Daily',
      'WEEKLY': 'Weekly',
      'MONTHLY': 'Monthly',
      'CUSTOM': 'Custom',
      'ROUTE_SPECIFIC': 'Route Specific',
      'GUARD_SPECIFIC': 'Guard Specific'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: ReportStatus): string {
    const labels: { [key: string]: string } = {
      'DRAFT': 'Draft',
      'GENERATED': 'Generated',
      'APPROVED': 'Approved',
      'ARCHIVED': 'Archived'
    };
    return labels[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

