import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AttendanceReportsPayrollService } from '../services/attendance-reports-payroll.service';
import {
  AttendanceReport,
  PayrollIntegration,
  PayrollData,
  ReportStatistics,
  ReportType,
  ReportStatus,
  PayrollSystem,
  SyncFrequency,
  PayrollDataStatus
} from '../models/attendance-reports-payroll.model';
import {
  applyReportFilter,
  applyPayrollDataFilter,
  getReportTypeLabel,
  getReportStatusLabel,
  getPayrollSystemLabel,
  getIntegrationStatusLabel,
  getSyncFrequencyLabel,
  getSyncStatusLabel,
  getDataStatusLabel
} from '../services/attendance-reports-payroll-api.mapper';

@Component({
  selector: 'app-attendance-reports-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="attendance-reports-payroll-container">
      <div class="page-header">
        <button class="back-button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Dashboard
        </button>
        <div>
          <h1>
            <i class="material-icons">assessment</i>
            Attendance Reports & Payroll Integration
          </h1>
          <p>Generate reports and integrate with payroll systems</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/attendance-reports-payroll</strong> API — aggregates facial, fingerprint, leave &amp; overtime.</span>
          </div>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="form-panel" *ngIf="showGeneratePanel">
        <h3><i class="material-icons">add</i> Generate Attendance Report</h3>
        <div class="form-grid">
          <select [(ngModel)]="generateForm.reportType">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="summary">Summary (3 months)</option>
            <option value="custom">Custom Range</option>
          </select>
          <input type="date" [(ngModel)]="generateForm.startDate" *ngIf="generateForm.reportType === 'custom'">
          <input type="date" [(ngModel)]="generateForm.endDate" *ngIf="generateForm.reportType === 'custom'">
          <input type="text" placeholder="Report title (optional)" [(ngModel)]="generateForm.title" class="title-input">
        </div>
        <div class="panel-actions">
          <button type="button" class="btn-primary" (click)="submitGenerateReport()" [disabled]="isSaving">
            {{ isSaving ? 'Generating...' : 'Generate Report' }}
          </button>
          <button type="button" class="btn-secondary" (click)="closeGeneratePanel()">Cancel</button>
        </div>
      </div>

      <div class="form-panel" *ngIf="showIntegrationPanel">
        <h3><i class="material-icons">add</i> Add Payroll Integration</h3>
        <div class="form-grid">
          <select [(ngModel)]="integrationForm.payrollSystem">
            <option value="sap">SAP</option>
            <option value="adp">ADP</option>
            <option value="paychex">Paychex</option>
            <option value="quickbooks">QuickBooks</option>
            <option value="custom">Custom</option>
          </select>
          <input type="text" placeholder="System name" [(ngModel)]="integrationForm.systemName">
          <select [(ngModel)]="integrationForm.syncFrequency">
            <option value="real-time">Real-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input type="text" placeholder="API endpoint (optional)" [(ngModel)]="integrationForm.apiEndpoint" class="title-input">
        </div>
        <div class="panel-actions">
          <button type="button" class="btn-primary" (click)="submitAddIntegration()" [disabled]="isSaving">
            {{ isSaving ? 'Saving...' : 'Add Integration' }}
          </button>
          <button type="button" class="btn-secondary" (click)="closeIntegrationPanel()">Cancel</button>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <div class="view-options">
          <button 
            class="view-btn" 
            [class.active]="viewMode === 'reports'"
            (click)="viewMode = 'reports'">
            <i class="material-icons">description</i>
            Reports
          </button>
          <button 
            class="view-btn" 
            [class.active]="viewMode === 'payroll'"
            (click)="viewMode = 'payroll'">
            <i class="material-icons">account_balance</i>
            Payroll Integration
          </button>
          <button 
            class="view-btn" 
            [class.active]="viewMode === 'data'"
            (click)="viewMode = 'data'">
            <i class="material-icons">table_chart</i>
            Payroll Data
          </button>
        </div>
        <div class="action-buttons-group">
          <button class="btn-secondary" (click)="openSyncModal()">
            <i class="material-icons">sync</i>
            Sync Payroll
          </button>
          <button class="btn-primary" (click)="openGenerateReportModal()">
            <i class="material-icons">add</i>
            Generate Report
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total-reports">
          <div class="stat-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalReports }}</div>
            <div class="stat-label">Total Reports</div>
          </div>
        </div>
        <div class="stat-card this-month">
          <div class="stat-icon">
            <i class="material-icons">calendar_month</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.thisMonth }}</div>
            <div class="stat-label">This Month</div>
          </div>
        </div>
        <div class="stat-card synced">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.payrollSynced }}</div>
            <div class="stat-label">Synced to Payroll</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pendingSync }}</div>
            <div class="stat-label">Pending Sync</div>
          </div>
        </div>
      </div>

      <!-- Reports View -->
      <div class="reports-view" *ngIf="viewMode === 'reports'">
        <div class="section-header">
          <h2>
            <i class="material-icons">description</i>
            Attendance Reports
          </h2>
          <div class="filters">
            <div class="search-box">
              <i class="material-icons">search</i>
              <input 
                type="text" 
                placeholder="Search reports..."
                [(ngModel)]="reportSearchTerm"
                (input)="filterReports()">
            </div>
            <select [(ngModel)]="selectedReportType" (change)="filterReports()" class="type-filter">
              <option value="">All Types</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
              <option value="summary">Summary</option>
            </select>
            <select [(ngModel)]="selectedReportStatus" (change)="filterReports()" class="status-filter">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="exported">Exported</option>
            </select>
          </div>
        </div>

        <div class="loading" *ngIf="isLoading">Loading reports...</div>

        <div class="reports-grid" *ngIf="!isLoading">
          <div *ngFor="let report of filteredReports" class="report-card">
            <div class="report-header">
              <div class="report-title-section">
                <h3>{{ report.title }}</h3>
                <span class="report-type-badge" [ngClass]="'type-' + report.reportType">
                  {{ getReportTypeLabel(report.reportType) }}
                </span>
              </div>
              <div class="report-status-badge" [ngClass]="'status-' + report.status">
                {{ getReportStatusLabel(report.status) }}
              </div>
            </div>
            <div class="report-content">
              <div class="report-period">
                <i class="material-icons">calendar_today</i>
                <span>{{ formatDate(report.period.startDate) }} - {{ formatDate(report.period.endDate) }}</span>
              </div>
              <div class="report-stats">
                <div class="stat-item">
                  <span class="stat-label">Staff:</span>
                  <span class="stat-value">{{ report.totalStaff }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Present:</span>
                  <span class="stat-value present">{{ report.totalPresent }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Absent:</span>
                  <span class="stat-value absent">{{ report.totalAbsent }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Late:</span>
                  <span class="stat-value late">{{ report.totalLate }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Overtime:</span>
                  <span class="stat-value overtime">{{ report.totalOvertime }}h</span>
                </div>
              </div>
              <div class="report-meta">
                <div class="meta-item">
                  <i class="material-icons">person</i>
                  <span>Generated by {{ report.generatedBy }}</span>
                </div>
                <div class="meta-item">
                  <i class="material-icons">access_time</i>
                  <span>{{ formatDateTime(report.generatedAt) }}</span>
                </div>
                <div class="meta-item" *ngIf="report.payrollSynced">
                  <i class="material-icons">sync</i>
                  <span>Synced to Payroll</span>
                </div>
              </div>
            </div>
            <div class="report-actions">
              <button class="btn-action view" (click)="viewReport(report)">
                <i class="material-icons">visibility</i>
                View
              </button>
              <button class="btn-action download" (click)="downloadReport(report)">
                <i class="material-icons">download</i>
                Download
              </button>
              <button 
                class="btn-action sync" 
                (click)="syncToPayroll(report)"
                *ngIf="!report.payrollSynced">
                <i class="material-icons">sync</i>
                Sync
              </button>
              <button class="btn-action delete" (click)="deleteReport(report)">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
          <div class="no-data report-empty" *ngIf="filteredReports.length === 0">
            <i class="material-icons">inbox</i>
            <p>No attendance reports yet. Generate one from live attendance data.</p>
          </div>
        </div>
      </div>

      <!-- Payroll Integration View -->
      <div class="payroll-view" *ngIf="viewMode === 'payroll'">
        <div class="section-header">
          <h2>
            <i class="material-icons">account_balance</i>
            Payroll System Integration
          </h2>
          <button class="btn-secondary" (click)="openAddIntegrationModal()">
            <i class="material-icons">add</i>
            Add Integration
          </button>
        </div>

        <div class="integrations-grid">
          <div *ngFor="let integration of payrollIntegrations" class="integration-card" [ngClass]="'status-' + integration.status">
            <div class="integration-header">
              <div class="integration-info">
                <h3>{{ integration.systemName }}</h3>
                <span class="system-type">{{ getPayrollSystemLabel(integration.payrollSystem) }}</span>
              </div>
              <div class="integration-status" [ngClass]="'status-' + integration.status">
                <i class="material-icons">{{ getStatusIcon(integration.status) }}</i>
                <span>{{ getStatusLabel(integration.status) }}</span>
              </div>
            </div>
            <div class="integration-content">
              <div class="integration-details">
                <div class="detail-item">
                  <i class="material-icons">sync</i>
                  <span>Sync Frequency: {{ getSyncFrequencyLabel(integration.syncFrequency) }}</span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">access_time</i>
                  <span>Last Sync: {{ formatDateTime(integration.lastSync) }}</span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">list</i>
                  <span>Total Records: {{ integration.totalRecords }}</span>
                </div>
                <div class="detail-item" *ngIf="integration.lastSyncStatus">
                  <i class="material-icons" [ngClass]="'status-' + integration.lastSyncStatus">
                    {{ getSyncStatusIcon(integration.lastSyncStatus) }}
                  </i>
                  <span>Last Sync: {{ getSyncStatusLabel(integration.lastSyncStatus) }}</span>
                </div>
                <div class="detail-item error" *ngIf="integration.errorMessage">
                  <i class="material-icons">error</i>
                  <span>{{ integration.errorMessage }}</span>
                </div>
              </div>
            </div>
            <div class="integration-actions">
              <button class="btn-action sync" (click)="syncIntegration(integration)">
                <i class="material-icons">sync</i>
                Sync Now
              </button>
              <button class="btn-action test" (click)="testConnection(integration)">
                <i class="material-icons">check_circle</i>
                Test Connection
              </button>
              <button class="btn-action configure" (click)="configureIntegration(integration)">
                <i class="material-icons">settings</i>
                Configure
              </button>
              <button class="btn-action disconnect" (click)="disconnectIntegration(integration)">
                <i class="material-icons">link_off</i>
                Disconnect
              </button>
            </div>
          </div>
          <div class="no-data integration-empty" *ngIf="payrollIntegrations.length === 0">
            <i class="material-icons">link_off</i>
            <p>No payroll integrations configured yet.</p>
          </div>
        </div>
      </div>

      <!-- Payroll Data View -->
      <div class="data-view" *ngIf="viewMode === 'data'">
        <div class="section-header">
          <h2>
            <i class="material-icons">table_chart</i>
            Payroll Data
          </h2>
          <div class="filters">
            <div class="search-box">
              <i class="material-icons">search</i>
              <input 
                type="text" 
                placeholder="Search by staff name or ID..."
                [(ngModel)]="dataSearchTerm"
                (input)="filterPayrollData()">
            </div>
            <select [(ngModel)]="selectedDataStatus" (change)="filterPayrollData()" class="status-filter">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="paid">Paid</option>
            </select>
            <input 
              type="text" 
              placeholder="Period (e.g., Jan 2024)"
              [(ngModel)]="selectedPeriod"
              (input)="filterPayrollData()"
              class="period-filter">
          </div>
        </div>

        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Period</th>
                <th>Regular Hours</th>
                <th>Overtime Hours</th>
                <th>Present Days</th>
                <th>Leave Days</th>
                <th>Gross Salary</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let data of filteredPayrollData">
                <td>
                  <div class="staff-info">
                    <div class="staff-name">{{ data.staffName }}</div>
                    <div class="staff-details">{{ data.staffId }} • {{ data.department }}</div>
                  </div>
                </td>
                <td>{{ data.period }}</td>
                <td>{{ data.regularHours }}h</td>
                <td>{{ data.overtimeHours }}h</td>
                <td>{{ data.presentDays }}</td>
                <td>{{ data.leaveDays }}</td>
                <td class="amount">{{ data.grossSalary | number:'1.2-2' }}</td>
                <td class="amount">{{ data.deductions | number:'1.2-2' }}</td>
                <td class="amount net">{{ data.netSalary | number:'1.2-2' }}</td>
                <td>
                  <span class="status-badge" [ngClass]="'status-' + data.status">
                    {{ getDataStatusLabel(data.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon-small view" (click)="viewPayrollData(data)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="btn-icon-small export" (click)="exportPayrollData(data)" title="Export">
                      <i class="material-icons">download</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredPayrollData.length === 0">
                <td colspan="11" class="no-data">
                  <i class="material-icons">inbox</i>
                  <p>No payroll data found</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .attendance-reports-payroll-container {
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
      color: #00bcd4;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
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

    .form-panel {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      margin: 12px 0;
    }

    .form-grid input, .form-grid select {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .title-input { grid-column: 1 / -1; }

    .panel-actions {
      display: flex;
      gap: 12px;
    }

    .loading {
      padding: 24px;
      text-align: center;
      color: #7f8c8d;
    }

    .report-empty, .integration-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: #7f8c8d;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .view-options {
      display: flex;
      gap: 8px;
      background: #f8f9fa;
      padding: 4px;
      border-radius: 8px;
    }

    .view-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: #7f8c8d;
      font-size: 14px;
      transition: all 0.2s;
    }

    .view-btn.active {
      background: white;
      color: #00bcd4;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
      background: #00bcd4;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #00acc1;
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

    .stat-card.total-reports .stat-icon {
      background: rgba(0, 188, 212, 0.1);
      color: #00bcd4;
    }

    .stat-card.this-month .stat-icon {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .stat-card.synced .stat-icon {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .stat-card.pending .stat-icon {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
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

    .reports-view,
    .payroll-view,
    .data-view {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      margin-bottom: 20px;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      min-width: 200px;
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

    .type-filter,
    .status-filter,
    .period-filter {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 16px;
    }

    .report-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #00bcd4;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .report-title-section {
      flex: 1;
    }

    .report-title-section h3 {
      font-size: 18px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .report-type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      display: inline-block;
    }

    .type-daily { background: rgba(52, 152, 219, 0.1); color: #3498db; }
    .type-weekly { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
    .type-monthly { background: rgba(155, 89, 182, 0.1); color: #9b59b6; }
    .type-custom { background: rgba(230, 126, 34, 0.1); color: #e67e22; }
    .type-summary { background: rgba(0, 188, 212, 0.1); color: #00bcd4; }

    .report-status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-draft { background: rgba(52, 152, 219, 0.1); color: #3498db; }
    .status-final { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
    .status-exported { background: rgba(155, 89, 182, 0.1); color: #9b59b6; }

    .report-content {
      margin-bottom: 16px;
    }

    .report-period {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #7f8c8d;
      margin-bottom: 12px;
    }

    .report-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    .stat-label {
      color: #7f8c8d;
    }

    .stat-value {
      font-weight: 600;
      color: #2c3e50;
    }

    .stat-value.present { color: #27ae60; }
    .stat-value.absent { color: #e74c3c; }
    .stat-value.late { color: #e67e22; }
    .stat-value.overtime { color: #6c5ce7; }

    .report-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-item .material-icons {
      font-size: 16px;
    }

    .report-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
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

    .btn-action.view {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .btn-action.view:hover {
      background: rgba(52, 152, 219, 0.2);
    }

    .btn-action.download {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .btn-action.download:hover {
      background: rgba(39, 174, 96, 0.2);
    }

    .btn-action.sync {
      background: rgba(0, 188, 212, 0.1);
      color: #00bcd4;
    }

    .btn-action.sync:hover {
      background: rgba(0, 188, 212, 0.2);
    }

    .btn-action.delete {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .btn-action.delete:hover {
      background: rgba(231, 76, 60, 0.2);
    }

    .integrations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 16px;
    }

    .integration-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid;
    }

    .integration-card.status-connected {
      border-left-color: #27ae60;
    }

    .integration-card.status-disconnected {
      border-left-color: #95a5a6;
    }

    .integration-card.status-error {
      border-left-color: #e74c3c;
    }

    .integration-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .integration-info h3 {
      font-size: 18px;
      margin: 0 0 4px 0;
      color: #2c3e50;
    }

    .system-type {
      font-size: 12px;
      color: #7f8c8d;
    }

    .integration-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .integration-status.status-connected {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .integration-status.status-disconnected {
      background: rgba(149, 165, 166, 0.1);
      color: #95a5a6;
    }

    .integration-status.status-error {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .integration-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .detail-item.error {
      color: #e74c3c;
    }

    .detail-item .material-icons {
      font-size: 18px;
    }

    .integration-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-action.test {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .btn-action.test:hover {
      background: rgba(52, 152, 219, 0.2);
    }

    .btn-action.configure {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .btn-action.configure:hover {
      background: rgba(155, 89, 182, 0.2);
    }

    .btn-action.disconnect {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .btn-action.disconnect:hover {
      background: rgba(231, 76, 60, 0.2);
    }

    .data-table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      font-size: 13px;
      border-bottom: 2px solid #e9ecef;
    }

    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
      color: #2c3e50;
    }

    .staff-info {
      display: flex;
      flex-direction: column;
    }

    .staff-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .staff-details {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 2px;
    }

    .amount {
      font-weight: 500;
    }

    .amount.net {
      font-weight: 600;
      color: #27ae60;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-pending { background: rgba(52, 152, 219, 0.1); color: #3498db; }
    .status-processed { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
    .status-paid { background: rgba(155, 89, 182, 0.1); color: #9b59b6; }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .btn-icon-small {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ecf0f1;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .btn-icon-small.view:hover {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .btn-icon-small.export:hover {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .no-data {
      text-align: center;
      padding: 40px !important;
      color: #7f8c8d;
    }

    .no-data .material-icons {
      font-size: 48px;
      color: #bdc3c7;
      margin-bottom: 8px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .action-bar {
        flex-direction: column;
      }

      .filters {
        flex-direction: column;
      }

      .reports-grid,
      .integrations-grid {
        grid-template-columns: 1fr;
      }
    }
  `
  ]
})
export class AttendanceReportsPayrollComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  viewMode: 'reports' | 'payroll' | 'data' = 'reports';

  reports: AttendanceReport[] = [];
  filteredReports: AttendanceReport[] = [];
  payrollIntegrations: PayrollIntegration[] = [];
  payrollData: PayrollData[] = [];
  filteredPayrollData: PayrollData[] = [];

  reportSearchTerm = '';
  dataSearchTerm = '';
  selectedReportType = '';
  selectedReportStatus = '';
  selectedDataStatus = '';
  selectedPeriod = '';

  loadError = '';
  isLoading = false;
  isSaving = false;
  showGeneratePanel = false;
  showIntegrationPanel = false;

  generateForm = {
    reportType: 'monthly' as ReportType,
    startDate: '',
    endDate: '',
    title: ''
  };

  integrationForm = {
    payrollSystem: 'custom' as PayrollSystem,
    systemName: '',
    syncFrequency: 'daily' as SyncFrequency,
    apiEndpoint: ''
  };

  stats: ReportStatistics = {
    totalReports: 0,
    thisMonth: 0,
    payrollSynced: 0,
    pendingSync: 0
  };

  constructor(
    private router: Router,
    private reportsPayrollService: AttendanceReportsPayrollService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllData(): void {
    this.loadReports();
    this.loadIntegrations();
    this.loadPayrollData();
  }

  loadReports(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.reports = [];
      this.filteredReports = [];
      this.stats = { totalReports: 0, thisMonth: 0, payrollSynced: 0, pendingSync: 0 };
      return;
    }

    const filter = {
      reportType: this.selectedReportType ? (this.selectedReportType as ReportType) : undefined,
      status: this.selectedReportStatus ? (this.selectedReportStatus as ReportStatus) : undefined,
      searchTerm: this.reportSearchTerm || undefined
    };

    this.reportsPayrollService
      .getReports(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: reports => {
          this.reports = reports;
          this.filteredReports = applyReportFilter(reports, filter);
          this.isLoading = false;
        },
        error: err => {
          console.error('Error loading reports:', err);
          this.loadError = 'Failed to load attendance reports from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });

    this.reportsPayrollService
      .getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => { this.stats = stats; },
        error: err => console.error('Error loading statistics:', err)
      });
  }

  loadIntegrations(): void {
    if (!this.resolveSocietyId()) return;

    this.reportsPayrollService
      .getIntegrations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: integrations => { this.payrollIntegrations = integrations; },
        error: err => console.error('Error loading integrations:', err)
      });
  }

  loadPayrollData(): void {
    if (!this.resolveSocietyId()) return;

    const filter = {
      status: this.selectedDataStatus ? (this.selectedDataStatus as PayrollDataStatus) : undefined,
      searchTerm: this.dataSearchTerm || undefined,
      period: this.selectedPeriod || undefined
    };

    this.reportsPayrollService
      .getPayrollData(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.payrollData = data;
          this.filteredPayrollData = applyPayrollDataFilter(data, filter);
        },
        error: err => console.error('Error loading payroll data:', err)
      });
  }

  filterReports(): void {
    this.loadReports();
  }

  filterPayrollData(): void {
    this.loadPayrollData();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  formatDateTime(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getReportTypeLabel = getReportTypeLabel;
  getReportStatusLabel = getReportStatusLabel;
  getPayrollSystemLabel = getPayrollSystemLabel;
  getStatusLabel = getIntegrationStatusLabel;
  getSyncFrequencyLabel = getSyncFrequencyLabel;
  getSyncStatusLabel = getSyncStatusLabel;
  getDataStatusLabel = getDataStatusLabel;

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      connected: 'check_circle', disconnected: 'link_off', error: 'error'
    };
    return icons[status] || 'help';
  }

  getSyncStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      success: 'check_circle', failed: 'error', partial: 'warning'
    };
    return icons[status] || 'help';
  }

  viewReport(report: AttendanceReport): void {
    const details = `
Title: ${report.title}
Type: ${getReportTypeLabel(report.reportType)}
Period: ${this.formatDate(report.period.startDate)} - ${this.formatDate(report.period.endDate)}
Staff: ${report.totalStaff} | Present: ${report.totalPresent} | Absent: ${report.totalAbsent}
Late: ${report.totalLate} | Overtime: ${report.totalOvertime}h
Status: ${getReportStatusLabel(report.status)}
Payroll Synced: ${report.payrollSynced ? 'Yes' : 'No'}
Generated by: ${report.generatedBy} on ${this.formatDateTime(report.generatedAt)}
    `;
    window.alert(details);
  }

  downloadReport(report: AttendanceReport): void {
    const payload = JSON.stringify({
      id: report.id,
      title: report.title,
      reportType: report.reportType,
      period: report.period,
      totalStaff: report.totalStaff,
      totalPresent: report.totalPresent,
      totalAbsent: report.totalAbsent,
      totalLate: report.totalLate,
      totalOvertime: report.totalOvertime,
      status: report.status
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  syncToPayroll(report: AttendanceReport): void {
    if (!window.confirm(`Sync report "${report.title}" to payroll?`)) return;

    this.reportsPayrollService
      .syncReportToPayroll(report.id)
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
          console.error('Sync failed:', err);
          window.alert('Failed to sync report to payroll.');
        }
      });
  }

  deleteReport(report: AttendanceReport): void {
    if (!window.confirm(`Delete report "${report.title}"?`)) return;

    this.reportsPayrollService
      .deleteReport(report.id)
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
          console.error('Delete failed:', err);
          window.alert('Failed to delete report.');
        }
      });
  }

  syncIntegration(integration: PayrollIntegration): void {
    this.reportsPayrollService
      .syncIntegration(integration.id)
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
          console.error('Integration sync failed:', err);
          window.alert('Failed to sync integration.');
        }
      });
  }

  testConnection(integration: PayrollIntegration): void {
    this.reportsPayrollService
      .testConnection(integration.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.loadIntegrations();
        },
        error: err => {
          console.error('Test connection failed:', err);
          window.alert('Connection test failed.');
        }
      });
  }

  configureIntegration(integration: PayrollIntegration): void {
    const endpoint = window.prompt('API endpoint:', integration.apiEndpoint ?? '');
    if (endpoint === null) return;
    window.alert(`Configure ${integration.systemName} — full settings UI coming soon. Endpoint: ${endpoint}`);
  }

  disconnectIntegration(integration: PayrollIntegration): void {
    if (!window.confirm(`Disconnect ${integration.systemName}?`)) return;

    this.reportsPayrollService
      .disconnectIntegration(integration.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadIntegrations(),
        error: err => {
          console.error('Disconnect failed:', err);
          window.alert('Failed to disconnect integration.');
        }
      });
  }

  viewPayrollData(data: PayrollData): void {
    const details = `
Staff: ${data.staffName} (${data.staffId})
Period: ${data.period}
Regular Hours: ${data.regularHours}h
Overtime Hours: ${data.overtimeHours}h
Present Days: ${data.presentDays}
Leave Days: ${data.leaveDays}
Gross Salary: ₹${data.grossSalary.toFixed(2)}
Deductions: ₹${data.deductions.toFixed(2)}
Net Salary: ₹${data.netSalary.toFixed(2)}
Status: ${getDataStatusLabel(data.status)}
    `;
    window.alert(details);
  }

  exportPayrollData(data: PayrollData): void {
    this.reportsPayrollService
      .exportPayrollData(data.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: payload => {
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `payroll-${data.staffId}-${data.period.replace(/\s/g, '-')}.json`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: err => console.error('Export failed:', err)
      });
  }

  openGenerateReportModal(): void {
    this.showGeneratePanel = true;
    const today = new Date().toISOString().split('T')[0];
    this.generateForm = {
      reportType: 'monthly',
      startDate: today,
      endDate: today,
      title: ''
    };
  }

  closeGeneratePanel(): void {
    this.showGeneratePanel = false;
  }

  submitGenerateReport(): void {
    if (this.generateForm.reportType === 'custom' &&
        (!this.generateForm.startDate || !this.generateForm.endDate)) {
      window.alert('Start and end dates are required for custom reports.');
      return;
    }

    this.isSaving = true;
    this.reportsPayrollService
      .generateReport({
        reportType: this.generateForm.reportType,
        startDate: this.generateForm.reportType === 'custom' ? this.generateForm.startDate : undefined,
        endDate: this.generateForm.reportType === 'custom' ? this.generateForm.endDate : undefined,
        title: this.generateForm.title || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isSaving = false;
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.showGeneratePanel = false;
          this.loadAllData();
        },
        error: err => {
          console.error('Generate report failed:', err);
          this.isSaving = false;
          window.alert('Failed to generate report.');
        }
      });
  }

  openSyncModal(): void {
    if (!window.confirm('Sync all pending reports to payroll?')) return;

    this.reportsPayrollService
      .syncAllPending()
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
          console.error('Bulk sync failed:', err);
          window.alert('Failed to sync payroll.');
        }
      });
  }

  openAddIntegrationModal(): void {
    this.showIntegrationPanel = true;
    this.integrationForm = {
      payrollSystem: 'custom',
      systemName: '',
      syncFrequency: 'daily',
      apiEndpoint: ''
    };
  }

  closeIntegrationPanel(): void {
    this.showIntegrationPanel = false;
  }

  submitAddIntegration(): void {
    if (!this.integrationForm.systemName.trim()) {
      window.alert('System name is required.');
      return;
    }

    this.isSaving = true;
    this.reportsPayrollService
      .createIntegration({
        payrollSystem: this.integrationForm.payrollSystem,
        systemName: this.integrationForm.systemName.trim(),
        syncFrequency: this.integrationForm.syncFrequency,
        apiEndpoint: this.integrationForm.apiEndpoint || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isSaving = false;
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.showIntegrationPanel = false;
          this.loadIntegrations();
        },
        error: err => {
          console.error('Add integration failed:', err);
          this.isSaving = false;
          window.alert('Failed to add integration.');
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

