import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { DefaultersReportService } from '../../services/defaulters-report.service';
import { DefaulterRecord, DefaulterSummary } from '../../models/defaulters-report.model';

/**
 * Defaulters Report Component with Aging Analysis
 * Shows list of defaulters and categorizes outstanding amounts by aging buckets
 */

@Component({
  selector: 'app-defaulters-report',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="defaulters-report-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">warning</i>
            Defaulters Report with Aging Analysis
          </h1>
          <p>Track overdue payments and analyze outstanding amounts by aging buckets</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/defaulters-reports</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showSettings = true" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="exportReport()" title="Export">
            <i class="material-icons">download</i>
            Export
          </button>
          <button class="icon-btn" (click)="printReport()" title="Print">
            <i class="material-icons">print</i>
            Print
          </button>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="loading-banner" *ngIf="loading">
        <i class="material-icons spin">sync</i>
        <span>Loading defaulters report…</span>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-controls">
          <div class="control-group">
            <label>As of Date</label>
            <input type="date" [(ngModel)]="asOfDate" (change)="loadReport()" />
          </div>
          <div class="control-group">
            <label>Aging Bucket</label>
            <select [(ngModel)]="agingFilter" (change)="filterDefaulters()">
              <option value="all">All Buckets</option>
              <option value="current">Current (0 days)</option>
              <option value="1-30">1-30 Days</option>
              <option value="31-60">31-60 Days</option>
              <option value="61-90">61-90 Days</option>
              <option value="90+">90+ Days</option>
            </select>
          </div>
          <div class="control-group">
            <label>Invoice Type</label>
            <select [(ngModel)]="invoiceTypeFilter" (change)="filterDefaulters()">
              <option value="all">All Types</option>
              <option value="maintenance">Maintenance</option>
              <option value="utility">Utility</option>
              <option value="parking">Parking</option>
              <option value="amenity">Amenity</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="control-group">
            <label>Minimum Amount</label>
            <input type="number" [(ngModel)]="minAmountFilter" min="0" step="100" placeholder="0" (input)="filterDefaulters()" />
          </div>
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by unit, name, invoice..." 
              [(ngModel)]="searchQuery"
              (input)="filterDefaulters()"
            />
          </div>
          <button class="btn btn-primary" (click)="refreshReport()">
            <i class="material-icons">refresh</i>
            Refresh
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card total-defaulters">
          <div class="card-icon">
            <i class="material-icons">people</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Defaulters</div>
            <div class="card-value">{{ summary.totalDefaulters }}</div>
            <div class="card-hint">Units with outstanding</div>
          </div>
        </div>
        <div class="summary-card total-outstanding">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Outstanding</div>
            <div class="card-value">{{ formatCurrency(summary.totalOutstanding) }}</div>
            <div class="card-hint">Average: {{ formatCurrency(summary.averageOutstanding) }}</div>
          </div>
        </div>
        <div class="summary-card oldest">
          <div class="card-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="card-content">
            <div class="card-label">Oldest Overdue</div>
            <div class="card-value">{{ summary.oldestOverdue }} days</div>
            <div class="card-hint" [ngClass]="{'critical': summary.oldestOverdue > 90}">
              {{ summary.oldestOverdue > 90 ? 'Critical' : 'Attention Required' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Aging Analysis Chart -->
      <div class="aging-analysis-section">
        <div class="section-header">
          <h2>Aging Analysis</h2>
          <span class="section-subtitle">Outstanding amounts by aging buckets</span>
        </div>
        <div class="aging-buckets">
          <div class="aging-bucket current" [style.width.%]="getBucketPercentage(summary.agingSummary.current)">
            <div class="bucket-header">
              <span class="bucket-label">Current (0 days)</span>
              <span class="bucket-amount">{{ formatCurrency(summary.agingSummary.current) }}</span>
            </div>
            <div class="bucket-bar">
              <div class="bucket-fill" [style.width.%]="getBucketPercentage(summary.agingSummary.current)"></div>
            </div>
            <div class="bucket-count">{{ getBucketCount('current') }} invoices</div>
          </div>
          <div class="aging-bucket bucket-1-30" [style.width.%]="getBucketPercentage(summary.agingSummary['1-30'])">
            <div class="bucket-header">
              <span class="bucket-label">1-30 Days</span>
              <span class="bucket-amount">{{ formatCurrency(summary.agingSummary['1-30']) }}</span>
            </div>
            <div class="bucket-bar">
              <div class="bucket-fill" [style.width.%]="getBucketPercentage(summary.agingSummary['1-30'])"></div>
            </div>
            <div class="bucket-count">{{ getBucketCount('1-30') }} invoices</div>
          </div>
          <div class="aging-bucket bucket-31-60" [style.width.%]="getBucketPercentage(summary.agingSummary['31-60'])">
            <div class="bucket-header">
              <span class="bucket-label">31-60 Days</span>
              <span class="bucket-amount">{{ formatCurrency(summary.agingSummary['31-60']) }}</span>
            </div>
            <div class="bucket-bar">
              <div class="bucket-fill" [style.width.%]="getBucketPercentage(summary.agingSummary['31-60'])"></div>
            </div>
            <div class="bucket-count">{{ getBucketCount('31-60') }} invoices</div>
          </div>
          <div class="aging-bucket bucket-61-90" [style.width.%]="getBucketPercentage(summary.agingSummary['61-90'])">
            <div class="bucket-header">
              <span class="bucket-label">61-90 Days</span>
              <span class="bucket-amount">{{ formatCurrency(summary.agingSummary['61-90']) }}</span>
            </div>
            <div class="bucket-bar">
              <div class="bucket-fill" [style.width.%]="getBucketPercentage(summary.agingSummary['61-90'])"></div>
            </div>
            <div class="bucket-count">{{ getBucketCount('61-90') }} invoices</div>
          </div>
          <div class="aging-bucket bucket-90plus" [style.width.%]="getBucketPercentage(summary.agingSummary['90+'])">
            <div class="bucket-header">
              <span class="bucket-label">90+ Days</span>
              <span class="bucket-amount">{{ formatCurrency(summary.agingSummary['90+']) }}</span>
            </div>
            <div class="bucket-bar">
              <div class="bucket-fill" [style.width.%]="getBucketPercentage(summary.agingSummary['90+'])"></div>
            </div>
            <div class="bucket-count">{{ getBucketCount('90+') }} invoices</div>
          </div>
        </div>
      </div>

      <!-- Defaulters Table -->
      <div class="defaulters-table-container">
        <div class="table-header">
          <h2>Defaulters List</h2>
          <div class="table-actions">
            <span class="record-count">{{ filteredDefaulters.length }} record(s) found</span>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="defaulters-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Owner Name</th>
                <th>Invoice #</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Invoice Amount</th>
                <th>Paid Amount</th>
                <th>Outstanding</th>
                <th>Days Overdue</th>
                <th>Aging Bucket</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let defaulter of filteredDefaulters" 
                  [ngClass]="{'critical': defaulter.agingBucket === '90+', 'warning': defaulter.agingBucket === '61-90'}">
                <td>
                  <strong>{{ defaulter.unitNumber }}</strong>
                </td>
                <td>
                  <div class="owner-info">
                    <div class="owner-name">{{ defaulter.ownerName }}</div>
                    <div class="owner-contact" *ngIf="defaulter.ownerPhone">{{ defaulter.ownerPhone }}</div>
                  </div>
                </td>
                <td>{{ defaulter.invoiceNumber }}</td>
                <td>{{ formatDate(defaulter.invoiceDate) }}</td>
                <td>
                  <span [ngClass]="{'overdue': defaulter.daysOverdue > 0}">{{ formatDate(defaulter.dueDate) }}</span>
                </td>
                <td class="amount">{{ formatCurrency(defaulter.invoiceAmount) }}</td>
                <td class="amount paid">{{ formatCurrency(defaulter.paidAmount) }}</td>
                <td class="amount outstanding">
                  <strong>{{ formatCurrency(defaulter.outstandingAmount) }}</strong>
                </td>
                <td>
                  <span class="days-badge" [ngClass]="getAgingBucketClass(defaulter.agingBucket)">
                    {{ defaulter.daysOverdue }} days
                  </span>
                </td>
                <td>
                  <span class="aging-badge" [ngClass]="getAgingBucketClass(defaulter.agingBucket)">
                    {{ getAgingLabel(defaulter.agingBucket) }}
                  </span>
                </td>
                <td>
                  <span class="type-badge" [ngClass]="defaulter.invoiceType">
                    {{ getInvoiceTypeLabel(defaulter.invoiceType) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewDefaulterDetails(defaulter)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn send" (click)="sendReminder(defaulter)" title="Send Reminder">
                      <i class="material-icons">mail</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredDefaulters.length === 0">
            <i class="material-icons">check_circle</i>
            <p>No defaulters found</p>
            <span *ngIf="searchQuery || agingFilter !== 'all' || invoiceTypeFilter !== 'all'">Try adjusting your filters</span>
          </div>
        </div>
      </div>

      <!-- Defaulter Details Modal -->
      <div class="modal-overlay" *ngIf="selectedDefaulter" (click)="closeDefaulterDetails()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Defaulter Details - {{ selectedDefaulter.unitNumber }}</h2>
            <button class="close-btn" (click)="closeDefaulterDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedDefaulter">
            <div class="defaulter-info">
              <div class="info-section">
                <h3>Owner Information</h3>
                <div class="info-row">
                  <span class="label">Name:</span>
                  <span class="value">{{ selectedDefaulter.ownerName }}</span>
                </div>
                <div class="info-row" *ngIf="selectedDefaulter.ownerEmail">
                  <span class="label">Email:</span>
                  <span class="value">{{ selectedDefaulter.ownerEmail }}</span>
                </div>
                <div class="info-row" *ngIf="selectedDefaulter.ownerPhone">
                  <span class="label">Phone:</span>
                  <span class="value">{{ selectedDefaulter.ownerPhone }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Unit Number:</span>
                  <span class="value"><strong>{{ selectedDefaulter.unitNumber }}</strong></span>
                </div>
              </div>

              <div class="info-section">
                <h3>Invoice Details</h3>
                <div class="info-row">
                  <span class="label">Invoice Number:</span>
                  <span class="value">{{ selectedDefaulter.invoiceNumber }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Invoice Date:</span>
                  <span class="value">{{ formatDate(selectedDefaulter.invoiceDate) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Due Date:</span>
                  <span class="value overdue">{{ formatDate(selectedDefaulter.dueDate) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Invoice Type:</span>
                  <span class="value">{{ getInvoiceTypeLabel(selectedDefaulter.invoiceType) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Invoice Amount:</span>
                  <span class="value amount">{{ formatCurrency(selectedDefaulter.invoiceAmount) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Paid Amount:</span>
                  <span class="value amount paid">{{ formatCurrency(selectedDefaulter.paidAmount) }}</span>
                </div>
                <div class="info-row total">
                  <span class="label">Outstanding Amount:</span>
                  <span class="value amount outstanding"><strong>{{ formatCurrency(selectedDefaulter.outstandingAmount) }}</strong></span>
                </div>
              </div>

              <div class="info-section">
                <h3>Aging Information</h3>
                <div class="info-row">
                  <span class="label">Days Overdue:</span>
                  <span class="value days-badge" [ngClass]="getAgingBucketClass(selectedDefaulter.agingBucket)">
                    {{ selectedDefaulter.daysOverdue }} days
                  </span>
                </div>
                <div class="info-row">
                  <span class="label">Aging Bucket:</span>
                  <span class="value aging-badge" [ngClass]="getAgingBucketClass(selectedDefaulter.agingBucket)">
                    {{ getAgingLabel(selectedDefaulter.agingBucket) }}
                  </span>
                </div>
                <div class="info-row" *ngIf="selectedDefaulter.lastPaymentDate">
                  <span class="label">Last Payment Date:</span>
                  <span class="value">{{ formatDate(selectedDefaulter.lastPaymentDate) }}</span>
                </div>
                <div class="info-row" *ngIf="selectedDefaulter.lastPaymentAmount">
                  <span class="label">Last Payment Amount:</span>
                  <span class="value amount">{{ formatCurrency(selectedDefaulter.lastPaymentAmount) }}</span>
                </div>
              </div>

              <div class="info-section" *ngIf="selectedDefaulter.notes">
                <h3>Notes</h3>
                <p class="notes-text">{{ selectedDefaulter.notes }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDefaulterDetails()">Close</button>
            <button class="btn btn-primary" (click)="sendReminder(selectedDefaulter!)">
              <i class="material-icons">mail</i>
              Send Reminder
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="showSettings = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Report Settings</h2>
            <button class="close-btn" (click)="showSettings = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Default As of Date</label>
              <input type="date" [(ngModel)]="asOfDate" />
            </div>
            <div class="form-group">
              <label>Show Zero Outstanding</label>
              <input type="checkbox" [(ngModel)]="showZeroOutstanding" (change)="loadReport()" />
            </div>
            <div class="form-group">
              <label>Auto Refresh Interval (seconds)</label>
              <input type="number" [(ngModel)]="autoRefreshInterval" min="0" step="10" />
              <small>Set to 0 to disable auto-refresh</small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showSettings = false">Close</button>
            <button class="btn btn-primary" (click)="saveSettings()">Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .defaulters-report-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn,
    .icon-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }

    .icon-btn {
      padding: 8px 16px;
      width: auto;
      border-radius: 20px;
      gap: 6px;
    }

    .back-btn:hover,
    .icon-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .header-content {
      flex: 1;
    }

    .header-content h1 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    /* Filters */
    .filters-section {
      background: white;
      padding: 20px 24px;
      margin: 24px 24px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .filter-controls {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .control-group label {
      font-size: 12px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .control-group input,
    .control-group select {
      padding: 8px 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      min-width: 150px;
    }

    .control-group input:focus,
    .control-group select:focus {
      border-color: #e74c3c;
    }

    .search-box {
      flex: 1;
      min-width: 200px;
      position: relative;
      display: flex;
      align-items: center;
      background: #f8f9fa;
      border-radius: 24px;
      padding: 8px 16px;
      border: 2px solid #e9ecef;
    }

    .search-box i {
      color: #95a5a6;
      margin-right: 8px;
    }

    .search-box input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 14px;
      color: #2c3e50;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      padding: 24px;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .summary-card.total-defaulters .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.total-outstanding .card-icon {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .summary-card.oldest .card-icon {
      background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%);
    }

    .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
    }

    .card-content {
      flex: 1;
    }

    .card-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    .card-hint {
      font-size: 11px;
      margin-top: 4px;
      color: #7f8c8d;
    }

    .card-hint.critical {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Aging Analysis */
    .aging-analysis-section {
      background: white;
      padding: 24px;
      margin: 0 24px 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section-header {
      margin-bottom: 24px;
    }

    .section-header h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .section-subtitle {
      font-size: 14px;
      color: #7f8c8d;
    }

    .aging-buckets {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .aging-bucket {
      flex: 1;
      min-width: 150px;
      padding: 16px;
      border-radius: 8px;
      border: 2px solid;
    }

    .aging-bucket.current {
      border-color: #2ed573;
      background: #e8f8f0;
    }

    .aging-bucket.bucket-1-30 {
      border-color: #f39c12;
      background: #fff4e6;
    }

    .aging-bucket.bucket-31-60 {
      border-color: #e67e22;
      background: #ffe8d6;
    }

    .aging-bucket.bucket-61-90 {
      border-color: #e74c3c;
      background: #ffeaea;
    }

    .aging-bucket.bucket-90plus {
      border-color: #c0392b;
      background: #ffd6d6;
    }

    .bucket-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .bucket-label {
      font-size: 12px;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
    }

    .bucket-amount {
      font-size: 14px;
      font-weight: 700;
      color: #2c3e50;
    }

    .bucket-bar {
      height: 8px;
      background: rgba(0,0,0,0.1);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .bucket-fill {
      height: 100%;
      background: currentColor;
      transition: width 0.3s;
    }

    .bucket-count {
      font-size: 11px;
      color: #7f8c8d;
    }

    /* Table */
    .defaulters-table-container {
      padding: 0 24px 24px;
    }

    .table-header {
      background: white;
      padding: 20px;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .record-count {
      font-size: 14px;
      color: #7f8c8d;
    }

    .table-wrapper {
      background: white;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow-x: auto;
    }

    .defaulters-table {
      width: 100%;
      border-collapse: collapse;
    }

    .defaulters-table thead {
      background: #f8f9fa;
    }

    .defaulters-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .defaulters-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .defaulters-table tbody tr:hover {
      background: #f8f9fa;
    }

    .defaulters-table tbody tr.critical {
      background: #ffeaea;
    }

    .defaulters-table tbody tr.warning {
      background: #fff4e6;
    }

    .owner-info {
      display: flex;
      flex-direction: column;
    }

    .owner-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .owner-contact {
      font-size: 12px;
      color: #7f8c8d;
    }

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .amount.paid {
      color: #2ed573;
    }

    .amount.outstanding {
      color: #e74c3c;
    }

    .overdue {
      color: #e74c3c;
      font-weight: 600;
    }

    .days-badge,
    .aging-badge,
    .type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .days-badge.current,
    .aging-badge.current {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .days-badge.one-to-thirty,
    .aging-badge.one-to-thirty {
      background: #fff4e6;
      color: #e67e22;
    }

    .days-badge.thirtyone-to-sixty,
    .aging-badge.thirtyone-to-sixty {
      background: #ffe8d6;
      color: #e67e22;
    }

    .days-badge.sixtyone-to-ninety,
    .aging-badge.sixtyone-to-ninety {
      background: #ffeaea;
      color: #e74c3c;
    }

    .days-badge.ninety-plus,
    .aging-badge.ninety-plus {
      background: #ffd6d6;
      color: #c0392b;
    }

    .type-badge.maintenance {
      background: #e7f3ff;
      color: #2980b9;
    }

    .type-badge.utility {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .type-badge.parking {
      background: #fff4e6;
      color: #e67e22;
    }

    .type-badge.amenity {
      background: #f4e7ff;
      color: #8e44ad;
    }

    .type-badge.other {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .action-btn.view {
      background: #e7f3ff;
      color: #2980b9;
    }

    .action-btn.send {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .action-btn:hover {
      transform: scale(1.1);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-content.large {
      max-width: 800px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .close-btn {
      background: none;
      border: none;
      color: #95a5a6;
      cursor: pointer;
      padding: 4px;
    }

    .modal-body {
      padding: 20px;
    }

    .defaulter-info {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .info-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f5f7fa;
    }

    .info-row.total {
      border-top: 2px solid #e9ecef;
      margin-top: 8px;
      padding-top: 16px;
      font-weight: 600;
    }

    .info-row .label {
      font-weight: 500;
      color: #7f8c8d;
      font-size: 14px;
    }

    .info-row .value {
      color: #2c3e50;
      font-size: 14px;
      font-weight: 500;
    }

    .notes-text {
      margin: 0;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      color: #2c3e50;
      line-height: 1.5;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #e74c3c;
    }

    .form-group small {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #e74c3c;
      color: white;
    }

    .btn-primary:hover {
      background: #c0392b;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #95a5a6;
    }

    .empty-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .empty-state span {
      font-size: 12px;
      display: block;
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: 1fr;
        padding: 16px;
      }

      .aging-buckets {
        flex-direction: column;
      }

      .filter-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .defaulters-table {
        min-width: 1400px;
      }
    }
  `]
})
export class DefaultersReportComponent implements OnInit, OnDestroy {
  defaulters: DefaulterRecord[] = [];
  filteredDefaulters: DefaulterRecord[] = [];
  selectedDefaulter: DefaulterRecord | null = null;
  summary: DefaulterSummary;
  asOfDate: string = '';
  agingFilter: string = 'all';
  invoiceTypeFilter: string = 'all';
  minAmountFilter: number = 0;
  searchQuery: string = '';
  showZeroOutstanding: boolean = false;
  showSettings: boolean = false;
  autoRefreshInterval: number = 0;
  loadError = '';
  loading = false;

  private refreshInterval?: ReturnType<typeof setInterval>;
  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private defaultersReportService = inject(DefaultersReportService);

  constructor() {
    this.asOfDate = new Date().toISOString().split('T')[0];
    this.summary = {
      totalDefaulters: 0,
      totalOutstanding: 0,
      averageOutstanding: 0,
      oldestOverdue: 0,
      agingSummary: {
        current: 0,
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
        total: 0
      },
      defaultersByType: {
        maintenance: 0,
        utility: 0,
        parking: 0,
        amenity: 0,
        other: 0
      }
    };
  }

  ngOnInit(): void {
    this.loadReport();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load defaulters report from API for the selected as-of date. */
  loadReport(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.defaultersReportService
      .getReport(this.asOfDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.defaulters = response.defaulters;
          this.summary = response.summary;
          this.filterDefaulters();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Failed to load defaulters report from the API. Ensure the backend is running.';
        }
      });
  }

  /**
   * Filter defaulters based on criteria
   */
  filterDefaulters(): void {
    let filtered = [...this.defaulters];

    // Filter by outstanding amount
    if (!this.showZeroOutstanding) {
      filtered = filtered.filter(d => d.outstandingAmount > 0);
    }

    // Filter by aging bucket
    if (this.agingFilter !== 'all') {
      filtered = filtered.filter(d => d.agingBucket === this.agingFilter);
    }

    // Filter by invoice type
    if (this.invoiceTypeFilter !== 'all') {
      filtered = filtered.filter(d => d.invoiceType === this.invoiceTypeFilter);
    }

    // Filter by minimum amount
    if (this.minAmountFilter > 0) {
      filtered = filtered.filter(d => d.outstandingAmount >= this.minAmountFilter);
    }

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.unitNumber.toLowerCase().includes(query) ||
        d.ownerName.toLowerCase().includes(query) ||
        d.invoiceNumber.toLowerCase().includes(query) ||
        (d.ownerEmail && d.ownerEmail.toLowerCase().includes(query)) ||
        (d.ownerPhone && d.ownerPhone.includes(query))
      );
    }

    this.filteredDefaulters = filtered;
  }

  /**
   * Get bucket percentage for visualization
   */
  getBucketPercentage(amount: number): number {
    if (this.summary.agingSummary.total === 0) return 0;
    return (amount / this.summary.agingSummary.total) * 100;
  }

  /**
   * Get count of invoices in a bucket
   */
  getBucketCount(bucket: string): number {
    return this.defaulters.filter(d => d.agingBucket === bucket && d.outstandingAmount > 0).length;
  }

  /**
   * Get aging label
   */
  getAgingLabel(bucket: string): string {
    const labels: { [key: string]: string } = {
      'current': 'Current',
      '1-30': '1-30 Days',
      '31-60': '31-60 Days',
      '61-90': '61-90 Days',
      '90+': '90+ Days'
    };
    return labels[bucket] || bucket;
  }

  /**
   * Get CSS class name for aging bucket
   */
  getAgingBucketClass(bucket: string): string {
    const classMap: { [key: string]: string } = {
      'current': 'current',
      '1-30': 'one-to-thirty',
      '31-60': 'thirtyone-to-sixty',
      '61-90': 'sixtyone-to-ninety',
      '90+': 'ninety-plus'
    };
    return classMap[bucket] || 'current';
  }

  /**
   * Get invoice type label
   */
  getInvoiceTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'maintenance': 'Maintenance',
      'utility': 'Utility',
      'parking': 'Parking',
      'amenity': 'Amenity',
      'other': 'Other'
    };
    return labels[type] || type;
  }

  /**
   * View defaulter details
   */
  viewDefaulterDetails(defaulter: DefaulterRecord): void {
    this.selectedDefaulter = defaulter;
  }

  /**
   * Close defaulter details modal
   */
  closeDefaulterDetails(): void {
    this.selectedDefaulter = null;
  }

  /**
   * Send reminder to defaulter
   */
  sendReminder(defaulter: DefaulterRecord): void {
    // In real app, send email/SMS reminder
    console.log('Send reminder to:', defaulter);
    alert(`Reminder sent to ${defaulter.ownerName} (${defaulter.unitNumber}) for invoice ${defaulter.invoiceNumber}`);
  }

  /**
   * Refresh report
   */
  refreshReport(): void {
    this.loadReport();
  }

  /**
   * Export report
   */
  exportReport(): void {
    const data = { asOfDate: this.asOfDate, defaulters: this.defaulters, summary: this.summary };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defaulters-report-${this.asOfDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Print report
   */
  printReport(): void {
    window.print();
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    localStorage.setItem('defaulters_report_settings', JSON.stringify({
      asOfDate: this.asOfDate,
      showZeroOutstanding: this.showZeroOutstanding,
      autoRefreshInterval: this.autoRefreshInterval
    }));
    this.setupAutoRefresh();
    this.showSettings = false;
    this.loadReport();
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('defaulters_report_settings');
    if (!stored) {
      return;
    }
    try {
      const settings = JSON.parse(stored);
      if (settings.asOfDate) {
        this.asOfDate = settings.asOfDate;
      }
      if (settings.showZeroOutstanding !== undefined) {
        this.showZeroOutstanding = settings.showZeroOutstanding;
      }
      if (settings.autoRefreshInterval !== undefined) {
        this.autoRefreshInterval = settings.autoRefreshInterval;
        this.setupAutoRefresh();
      }
    } catch {
      // ignore invalid stored settings
    }
  }

  private setupAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    if (this.autoRefreshInterval > 0) {
      this.refreshInterval = setInterval(() => this.loadReport(), this.autoRefreshInterval * 1000);
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}



