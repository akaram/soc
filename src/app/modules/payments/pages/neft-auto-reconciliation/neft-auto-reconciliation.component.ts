import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * NEFT Auto-Reconciliation Component
 * Handles NEFT payment collection and automatic reconciliation with invoices/bills
 */
interface NEFTTransaction {
  id: string;
  transactionId: string;
  utrNumber: string; // Unique Transaction Reference
  amount: number;
  transactionDate: Date;
  valueDate: Date;
  remitterName: string;
  remitterAccount: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryIFSC: string;
  bankName: string;
  branchName?: string;
  paymentNarration?: string;
  status: 'pending' | 'matched' | 'reconciled' | 'unmatched' | 'duplicate' | 'rejected';
  matchedInvoiceId?: string;
  matchedInvoiceNumber?: string;
  matchedBillId?: string;
  matchedBillNumber?: string;
  matchedResidentId?: string;
  matchedResidentName?: string;
  reconciliationDate?: Date;
  reconciledBy?: string;
  notes?: string;
  createdAt: Date;
}

interface ReconciliationRule {
  id: string;
  name: string;
  matchBy: 'amount' | 'utr' | 'narration' | 'remitter' | 'combined';
  toleranceAmount: number; // Amount difference tolerance
  autoReconcile: boolean;
  priority: number;
  isActive: boolean;
  createdAt: Date;
}

interface BankAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  ifscCode: string;
  branchName: string;
  isActive: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-neft-auto-reconciliation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="neft-reconciliation-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">account_balance</i>
            NEFT Auto-Reconciliation
          </h1>
          <p>Collect and automatically reconcile NEFT payments with invoices and bills</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showRules = true" title="Reconciliation Rules">
            <i class="material-icons">rule</i>
            Rules
          </button>
          <button class="icon-btn" (click)="showBankAccounts = true" title="Bank Accounts">
            <i class="material-icons">account_balance</i>
            Accounts
          </button>
          <button class="icon-btn primary" (click)="showUploadStatement = true" title="Upload Statement">
            <i class="material-icons">upload</i>
            Upload Statement
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ transactions.length }}</div>
            <div class="stat-label">Total Transactions</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ reconciledCount }}</div>
            <div class="stat-label">Reconciled</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingCount }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
            <div class="stat-label">Total Amount</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'transactions'"
            (click)="activeTab = 'transactions'"
          >
            <i class="material-icons">list</i>
            Transactions
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'reconciliation'"
            (click)="activeTab = 'reconciliation'"
          >
            <i class="material-icons">sync</i>
            Reconciliation
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'reports'"
            (click)="activeTab = 'reports'"
          >
            <i class="material-icons">assessment</i>
            Reports
          </button>
        </div>
      </div>

      <!-- Transactions Tab -->
      <div class="content-section" *ngIf="activeTab === 'transactions'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by UTR, transaction ID, remitter name..." 
              [(ngModel)]="searchQuery"
              (input)="filterTransactions()"
            />
          </div>
          <select [(ngModel)]="statusFilter" (change)="filterTransactions()" class="filter-select">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="matched">Matched</option>
            <option value="reconciled">Reconciled</option>
            <option value="unmatched">Unmatched</option>
            <option value="duplicate">Duplicate</option>
            <option value="rejected">Rejected</option>
          </select>
          <input type="date" [(ngModel)]="dateFromFilter" (change)="filterTransactions()" class="filter-select" />
          <input type="date" [(ngModel)]="dateToFilter" (change)="filterTransactions()" class="filter-select" />
          <button class="btn btn-secondary" (click)="runAutoReconciliation()">
            <i class="material-icons">sync</i>
            Run Auto-Reconciliation
          </button>
        </div>

        <!-- Transactions Table -->
        <div class="transactions-table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>UTR Number</th>
                <th>Transaction Date</th>
                <th>Remitter</th>
                <th>Amount</th>
                <th>Bank</th>
                <th>Status</th>
                <th>Matched To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let transaction of filteredTransactions" [class.reconciled]="transaction.status === 'reconciled'">
                <td>
                  <strong class="utr-number">{{ transaction.utrNumber }}</strong>
                </td>
                <td>{{ formatDate(transaction.transactionDate) }}</td>
                <td>
                  <div class="remitter-info">
                    <div class="remitter-name">{{ transaction.remitterName }}</div>
                    <div class="remitter-account" *ngIf="transaction.remitterAccount">
                      A/C: {{ transaction.remitterAccount }}
                    </div>
                  </div>
                </td>
                <td class="amount">{{ formatCurrency(transaction.amount) }}</td>
                <td>
                  <div class="bank-info">
                    <div class="bank-name">{{ transaction.bankName }}</div>
                    <div class="bank-ifsc" *ngIf="transaction.beneficiaryIFSC">
                      IFSC: {{ transaction.beneficiaryIFSC }}
                    </div>
                  </div>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="transaction.status">
                    {{ getStatusLabel(transaction.status) }}
                  </span>
                </td>
                <td>
                  <div class="matched-info" *ngIf="transaction.matchedInvoiceNumber || transaction.matchedBillNumber">
                    <div *ngIf="transaction.matchedInvoiceNumber">
                      Invoice: {{ transaction.matchedInvoiceNumber }}
                    </div>
                    <div *ngIf="transaction.matchedBillNumber">
                      Bill: {{ transaction.matchedBillNumber }}
                    </div>
                    <div *ngIf="transaction.matchedResidentName" class="resident-name">
                      {{ transaction.matchedResidentName }}
                    </div>
                  </div>
                  <span *ngIf="!transaction.matchedInvoiceNumber && !transaction.matchedBillNumber" class="no-match">-</span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewTransaction(transaction)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn match" (click)="manualMatch(transaction)" title="Manual Match" *ngIf="transaction.status === 'pending' || transaction.status === 'unmatched'">
                      <i class="material-icons">link</i>
                    </button>
                    <button class="action-btn reconcile" (click)="reconcileTransaction(transaction)" title="Reconcile" *ngIf="transaction.status === 'matched'">
                      <i class="material-icons">check</i>
                    </button>
                    <button class="action-btn reject" (click)="rejectTransaction(transaction)" title="Reject" *ngIf="transaction.status === 'pending'">
                      <i class="material-icons">close</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredTransactions.length === 0">
            <i class="material-icons">receipt</i>
            <p>No NEFT transactions found</p>
          </div>
        </div>
      </div>

      <!-- Reconciliation Tab -->
      <div class="content-section" *ngIf="activeTab === 'reconciliation'">
        <div class="reconciliation-dashboard">
          <div class="dashboard-cards">
            <div class="dashboard-card">
              <h3>Auto-Reconciliation</h3>
              <p>Automatically match NEFT transactions with pending invoices and bills</p>
              <button class="btn btn-primary" (click)="runAutoReconciliation()">
                <i class="material-icons">sync</i>
                Run Auto-Reconciliation
              </button>
            </div>
            <div class="dashboard-card">
              <h3>Manual Reconciliation</h3>
              <p>Manually match transactions with invoices or bills</p>
              <button class="btn btn-secondary" (click)="showManualReconciliation = true">
                <i class="material-icons">link</i>
                Manual Match
              </button>
            </div>
          </div>

          <!-- Reconciliation Results -->
          <div class="reconciliation-results" *ngIf="reconciliationResults.length > 0">
            <h3>Recent Reconciliation Results</h3>
            <div class="results-list">
              <div *ngFor="let result of reconciliationResults" class="result-item">
                <div class="result-header">
                  <span class="result-date">{{ formatDateTime(result.date) }}</span>
                  <span class="result-status" [ngClass]="result.status">
                    {{ result.status }}
                  </span>
                </div>
                <div class="result-details">
                  <span>Processed: {{ result.processed }}</span>
                  <span>Matched: {{ result.matched }}</span>
                  <span>Reconciled: {{ result.reconciled }}</span>
                  <span>Unmatched: {{ result.unmatched }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports Tab -->
      <div class="content-section" *ngIf="activeTab === 'reports'">
        <div class="reports-grid">
          <div class="report-card" (click)="generateReport('daily')">
            <i class="material-icons">today</i>
            <h3>Daily Report</h3>
            <p>Daily NEFT transaction and reconciliation summary</p>
          </div>
          <div class="report-card" (click)="generateReport('monthly')">
            <i class="material-icons">calendar_month</i>
            <h3>Monthly Report</h3>
            <p>Monthly reconciliation analysis</p>
          </div>
          <div class="report-card" (click)="generateReport('unmatched')">
            <i class="material-icons">warning</i>
            <h3>Unmatched Transactions</h3>
            <p>List of unmatched NEFT transactions</p>
          </div>
          <div class="report-card" (click)="generateReport('reconciliation')">
            <i class="material-icons">assessment</i>
            <h3>Reconciliation Report</h3>
            <p>Detailed reconciliation report</p>
          </div>
        </div>
      </div>

      <!-- Upload Statement Modal -->
      <div class="modal-overlay" *ngIf="showUploadStatement" (click)="showUploadStatement = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Upload Bank Statement</h2>
            <button class="close-btn" (click)="showUploadStatement = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-group">
                <label>Select Bank Account <span class="required">*</span></label>
                <select [(ngModel)]="selectedBankAccount" required>
                  <option value="">Select Account</option>
                  <option *ngFor="let account of bankAccounts" [value]="account.id">
                    {{ account.accountName }} - {{ account.accountNumber }} ({{ account.bankName }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Statement File <span class="required">*</span></label>
                <div class="file-upload-area" (click)="fileInput.click()">
                  <input 
                    #fileInput 
                    type="file" 
                    accept=".csv,.xlsx,.xls" 
                    (change)="onFileSelected($event)"
                    style="display: none"
                  />
                  <i class="material-icons">cloud_upload</i>
                  <p *ngIf="!selectedFile">Click to upload or drag and drop</p>
                  <p *ngIf="selectedFile" class="file-name">{{ selectedFile.name }}</p>
                  <span class="file-hint">CSV, XLSX, or XLS files only</span>
                </div>
              </div>
              <div class="form-group">
                <label>Statement Period</label>
                <div class="form-row">
                  <input type="date" [(ngModel)]="statementFromDate" placeholder="From Date" />
                  <input type="date" [(ngModel)]="statementToDate" placeholder="To Date" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showUploadStatement = false">Cancel</button>
            <button class="btn btn-primary" (click)="uploadStatement()" [disabled]="!selectedFile || !selectedBankAccount">
              <i class="material-icons">upload</i>
              Upload & Process
            </button>
          </div>
        </div>
      </div>

      <!-- Transaction Details Modal -->
      <div class="modal-overlay" *ngIf="selectedTransaction" (click)="selectedTransaction = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Transaction Details - {{ selectedTransaction.utrNumber }}</h2>
            <button class="close-btn" (click)="selectedTransaction = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedTransaction">
            <div class="transaction-details">
              <div class="detail-section">
                <h3>Transaction Information</h3>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="label">UTR Number:</span>
                    <span class="value">{{ selectedTransaction.utrNumber }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Transaction ID:</span>
                    <span class="value">{{ selectedTransaction.transactionId }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Amount:</span>
                    <span class="value amount">{{ formatCurrency(selectedTransaction.amount) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Transaction Date:</span>
                    <span class="value">{{ formatDate(selectedTransaction.transactionDate) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Value Date:</span>
                    <span class="value">{{ formatDate(selectedTransaction.valueDate) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Status:</span>
                    <span class="value status-badge" [ngClass]="selectedTransaction.status">
                      {{ getStatusLabel(selectedTransaction.status) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <h3>Remitter Information</h3>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="label">Name:</span>
                    <span class="value">{{ selectedTransaction.remitterName }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Account Number:</span>
                    <span class="value">{{ selectedTransaction.remitterAccount }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <h3>Beneficiary Information</h3>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="label">Name:</span>
                    <span class="value">{{ selectedTransaction.beneficiaryName }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Account Number:</span>
                    <span class="value">{{ selectedTransaction.beneficiaryAccount }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">IFSC Code:</span>
                    <span class="value">{{ selectedTransaction.beneficiaryIFSC }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <h3>Bank Information</h3>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="label">Bank Name:</span>
                    <span class="value">{{ selectedTransaction.bankName }}</span>
                  </div>
                  <div class="detail-item" *ngIf="selectedTransaction.branchName">
                    <span class="label">Branch:</span>
                    <span class="value">{{ selectedTransaction.branchName }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section" *ngIf="selectedTransaction.paymentNarration">
                <h3>Payment Narration</h3>
                <p>{{ selectedTransaction.paymentNarration }}</p>
              </div>

              <div class="detail-section" *ngIf="selectedTransaction.matchedInvoiceNumber || selectedTransaction.matchedBillNumber">
                <h3>Matched Information</h3>
                <div class="detail-grid">
                  <div class="detail-item" *ngIf="selectedTransaction.matchedInvoiceNumber">
                    <span class="label">Invoice Number:</span>
                    <span class="value">{{ selectedTransaction.matchedInvoiceNumber }}</span>
                  </div>
                  <div class="detail-item" *ngIf="selectedTransaction.matchedBillNumber">
                    <span class="label">Bill Number:</span>
                    <span class="value">{{ selectedTransaction.matchedBillNumber }}</span>
                  </div>
                  <div class="detail-item" *ngIf="selectedTransaction.matchedResidentName">
                    <span class="label">Resident:</span>
                    <span class="value">{{ selectedTransaction.matchedResidentName }}</span>
                  </div>
                  <div class="detail-item" *ngIf="selectedTransaction.reconciliationDate">
                    <span class="label">Reconciled Date:</span>
                    <span class="value">{{ formatDate(selectedTransaction.reconciliationDate) }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section" *ngIf="selectedTransaction.notes">
                <h3>Notes</h3>
                <p>{{ selectedTransaction.notes }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedTransaction = null">Close</button>
            <button class="btn btn-primary" (click)="manualMatch(selectedTransaction!)" *ngIf="selectedTransaction?.status === 'pending' || selectedTransaction?.status === 'unmatched'">
              <i class="material-icons">link</i>
              Manual Match
            </button>
            <button class="btn btn-success" (click)="reconcileTransaction(selectedTransaction!)" *ngIf="selectedTransaction?.status === 'matched'">
              <i class="material-icons">check</i>
              Reconcile
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .neft-reconciliation-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
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

    .icon-btn.primary {
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

    /* Statistics */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding: 24px;
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
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 28px;
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

    /* Tabs */
    .tabs-section {
      padding: 0 24px;
    }

    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    .tab {
      padding: 12px 24px;
      border: none;
      background: none;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab:hover {
      color: #16a085;
    }

    .tab.active {
      color: #16a085;
      border-bottom-color: #16a085;
    }

    /* Content Section */
    .content-section {
      padding: 24px;
    }

    /* Filters */
    .filters-section {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 24px;
      align-items: center;
    }

    .search-box {
      flex: 1;
      min-width: 300px;
      position: relative;
      display: flex;
      align-items: center;
      background: white;
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

    .filter-select {
      padding: 8px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      outline: none;
      min-width: 150px;
    }

    /* Transactions Table */
    .transactions-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .transactions-table {
      width: 100%;
    }

    .transactions-table thead {
      background: #f8f9fa;
    }

    .transactions-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .transactions-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .transactions-table tr.reconciled {
      background: #f0f9f7;
    }

    .utr-number {
      font-family: monospace;
      font-weight: 600;
      color: #16a085;
    }

    .remitter-info,
    .bank-info {
      display: flex;
      flex-direction: column;
    }

    .remitter-name,
    .bank-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .remitter-account,
    .bank-ifsc {
      font-size: 12px;
      color: #7f8c8d;
    }

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.matched { background: #e7f3ff; color: #2980b9; }
    .status-badge.reconciled { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.unmatched { background: #ffeaea; color: #c0392b; }
    .status-badge.duplicate { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.rejected { background: #ffeaea; color: #c0392b; }

    .matched-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
    }

    .matched-info .resident-name {
      font-size: 12px;
      color: #7f8c8d;
    }

    .no-match {
      color: #95a5a6;
      font-style: italic;
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

    .action-btn.view { background: #e7f3ff; color: #2980b9; }
    .action-btn.match { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.reconcile { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.reject { background: #ffeaea; color: #c0392b; }

    .action-btn:hover {
      transform: scale(1.1);
    }

    /* Reconciliation Dashboard */
    .reconciliation-dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .dashboard-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .dashboard-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .dashboard-card h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .dashboard-card p {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .reconciliation-results {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .reconciliation-results h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .result-item {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .result-date {
      font-size: 13px;
      color: #7f8c8d;
    }

    .result-status {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .result-status.success { background: #e8f8f0; color: #1e9e5a; }
    .result-status.partial { background: #fff4e6; color: #e67e22; }

    .result-details {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #2c3e50;
    }

    /* Reports Grid */
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    .report-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .report-card:hover {
      border-color: #16a085;
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .report-card i {
      font-size: 48px;
      color: #16a085;
      margin-bottom: 12px;
    }

    .report-card h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .report-card p {
      margin: 0;
      font-size: 13px;
      color: #7f8c8d;
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
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
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

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .required {
      color: #e74c3c;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #16a085;
    }

    .file-upload-area {
      border: 2px dashed #e9ecef;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .file-upload-area:hover {
      border-color: #16a085;
      background: #f0f9f7;
    }

    .file-upload-area i {
      font-size: 48px;
      color: #16a085;
      margin-bottom: 12px;
    }

    .file-upload-area p {
      margin: 8px 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .file-name {
      font-weight: 600;
      color: #16a085;
    }

    .file-hint {
      font-size: 12px;
      color: #7f8c8d;
    }

    .transaction-details {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item .label {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .detail-item .value {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .detail-item .value.amount {
      font-weight: 600;
      font-size: 16px;
    }

    .detail-section p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
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
      background: #16a085;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #138d75;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    .btn-success {
      background: #2ed573;
      color: white;
    }

    .btn-success:hover {
      background: #1e9e5a;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Empty State */
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
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .filters-section {
        flex-direction: column;
      }

      .transactions-table-container {
        overflow-x: auto;
      }

      .transactions-table {
        min-width: 1200px;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class NEFTAutoReconciliationComponent implements OnInit, OnDestroy {
  transactions: NEFTTransaction[] = [];
  filteredTransactions: NEFTTransaction[] = [];
  rules: ReconciliationRule[] = [];
  bankAccounts: BankAccount[] = [];
  selectedTransaction: NEFTTransaction | null = null;
  searchQuery: string = '';
  statusFilter: string = 'all';
  dateFromFilter: string = '';
  dateToFilter: string = '';
  activeTab: 'transactions' | 'reconciliation' | 'reports' = 'transactions';
  showUploadStatement: boolean = false;
  showRules: boolean = false;
  showBankAccounts: boolean = false;
  showManualReconciliation: boolean = false;
  selectedBankAccount: string = '';
  selectedFile: File | null = null;
  statementFromDate: string = '';
  statementToDate: string = '';
  reconciliationResults: any[] = [];

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadTransactions();
    this.loadRules();
    this.loadBankAccounts();
    this.loadReconciliationResults();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load transactions
   */
  loadTransactions(): void {
    this.transactions = [
      {
        id: 'txn-1',
        transactionId: 'TXN20240201001',
        utrNumber: 'NEFT123456789012',
        amount: 5000,
        transactionDate: new Date(2024, 1, 1),
        valueDate: new Date(2024, 1, 1),
        remitterName: 'Rajesh Kumar',
        remitterAccount: '1234567890',
        beneficiaryName: 'Society Account',
        beneficiaryAccount: '9876543210',
        beneficiaryIFSC: 'HDFC0001234',
        bankName: 'HDFC Bank',
        branchName: 'Mumbai Main',
        paymentNarration: 'Maintenance for A-101',
        status: 'reconciled',
        matchedInvoiceId: 'inv-1',
        matchedInvoiceNumber: 'INV-2024-001',
        matchedResidentId: 'res-1',
        matchedResidentName: 'Rajesh Kumar',
        reconciliationDate: new Date(2024, 1, 2),
        reconciledBy: 'admin-001',
        createdAt: new Date(2024, 1, 1)
      },
      {
        id: 'txn-2',
        transactionId: 'TXN20240202001',
        utrNumber: 'NEFT123456789013',
        amount: 3000,
        transactionDate: new Date(2024, 1, 2),
        valueDate: new Date(2024, 1, 2),
        remitterName: 'Priya Sharma',
        remitterAccount: '2345678901',
        beneficiaryName: 'Society Account',
        beneficiaryAccount: '9876543210',
        beneficiaryIFSC: 'HDFC0001234',
        bankName: 'HDFC Bank',
        paymentNarration: 'Utility bill payment',
        status: 'matched',
        matchedBillId: 'bill-1',
        matchedBillNumber: 'UB-2024-001',
        matchedResidentId: 'res-2',
        matchedResidentName: 'Priya Sharma',
        createdAt: new Date(2024, 1, 2)
      },
      {
        id: 'txn-3',
        transactionId: 'TXN20240203001',
        utrNumber: 'NEFT123456789014',
        amount: 7500,
        transactionDate: new Date(2024, 1, 3),
        valueDate: new Date(2024, 1, 3),
        remitterName: 'Amit Patel',
        remitterAccount: '3456789012',
        beneficiaryName: 'Society Account',
        beneficiaryAccount: '9876543210',
        beneficiaryIFSC: 'HDFC0001234',
        bankName: 'HDFC Bank',
        status: 'pending',
        createdAt: new Date(2024, 1, 3)
      }
    ];
    this.filterTransactions();
  }

  /**
   * Load reconciliation rules
   */
  loadRules(): void {
    this.rules = [
      {
        id: 'rule-1',
        name: 'Amount Match',
        matchBy: 'amount',
        toleranceAmount: 10,
        autoReconcile: true,
        priority: 1,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'rule-2',
        name: 'UTR Match',
        matchBy: 'utr',
        toleranceAmount: 0,
        autoReconcile: true,
        priority: 2,
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      }
    ];
  }

  /**
   * Load bank accounts
   */
  loadBankAccounts(): void {
    this.bankAccounts = [
      {
        id: 'account-1',
        accountNumber: '9876543210',
        accountName: 'Society Main Account',
        bankName: 'HDFC Bank',
        ifscCode: 'HDFC0001234',
        branchName: 'Mumbai Main',
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'account-2',
        accountNumber: '9876543211',
        accountName: 'Society Savings Account',
        bankName: 'ICICI Bank',
        ifscCode: 'ICIC0005678',
        branchName: 'Mumbai Branch',
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      }
    ];
  }

  /**
   * Load reconciliation results
   */
  loadReconciliationResults(): void {
    this.reconciliationResults = [
      {
        date: new Date(2024, 1, 3),
        status: 'success',
        processed: 15,
        matched: 12,
        reconciled: 10,
        unmatched: 3
      },
      {
        date: new Date(2024, 1, 2),
        status: 'partial',
        processed: 10,
        matched: 8,
        reconciled: 7,
        unmatched: 2
      }
    ];
  }

  /**
   * Filter transactions
   */
  filterTransactions(): void {
    let filtered = [...this.transactions];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === this.statusFilter);
    }

    if (this.dateFromFilter) {
      const fromDate = new Date(this.dateFromFilter);
      filtered = filtered.filter(t => t.transactionDate >= fromDate);
    }

    if (this.dateToFilter) {
      const toDate = new Date(this.dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => t.transactionDate <= toDate);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.utrNumber.toLowerCase().includes(query) ||
        t.transactionId.toLowerCase().includes(query) ||
        t.remitterName.toLowerCase().includes(query) ||
        (t.matchedInvoiceNumber && t.matchedInvoiceNumber.toLowerCase().includes(query)) ||
        (t.matchedBillNumber && t.matchedBillNumber.toLowerCase().includes(query))
      );
    }

    // Sort by transaction date (newest first)
    filtered.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

    this.filteredTransactions = filtered;
  }

  /**
   * Get reconciled count
   */
  get reconciledCount(): number {
    return this.transactions.filter(t => t.status === 'reconciled').length;
  }

  /**
   * Get pending count
   */
  get pendingCount(): number {
    return this.transactions.filter(t => t.status === 'pending' || t.status === 'unmatched').length;
  }

  /**
   * Get total amount
   */
  get totalAmount(): number {
    return this.transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Run auto-reconciliation
   */
  runAutoReconciliation(): void {
    // Simulate auto-reconciliation
    const pendingTransactions = this.transactions.filter(t => t.status === 'pending' || t.status === 'unmatched');
    let matched = 0;
    let reconciled = 0;

    pendingTransactions.forEach(transaction => {
      // Simulate matching logic
      if (Math.random() > 0.3) {
        transaction.status = 'matched';
        transaction.matchedInvoiceNumber = `INV-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        transaction.matchedResidentName = 'Auto-matched Resident';
        matched++;

        // Auto-reconcile if rule allows
        if (Math.random() > 0.5) {
          transaction.status = 'reconciled';
          transaction.reconciliationDate = new Date();
          transaction.reconciledBy = 'system';
          reconciled++;
        }
      }
    });

    // Add reconciliation result
    this.reconciliationResults.unshift({
      date: new Date(),
      status: matched > 0 ? 'success' : 'partial',
      processed: pendingTransactions.length,
      matched: matched,
      reconciled: reconciled,
      unmatched: pendingTransactions.length - matched
    });

    this.filterTransactions();
    alert(`Auto-reconciliation completed! Processed: ${pendingTransactions.length}, Matched: ${matched}, Reconciled: ${reconciled}`);
  }

  /**
   * Manual match
   */
  manualMatch(transaction: NEFTTransaction): void {
    // Simulate manual matching
    if (confirm(`Manually match transaction ${transaction.utrNumber}?`)) {
      transaction.status = 'matched';
      transaction.matchedInvoiceNumber = `INV-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      transaction.matchedResidentName = 'Manually Matched Resident';
      this.filterTransactions();
      alert('Transaction matched successfully!');
    }
  }

  /**
   * Reconcile transaction
   */
  reconcileTransaction(transaction: NEFTTransaction): void {
    if (confirm(`Reconcile transaction ${transaction.utrNumber}?`)) {
      transaction.status = 'reconciled';
      transaction.reconciliationDate = new Date();
      transaction.reconciledBy = 'admin-001';
      this.filterTransactions();
      alert('Transaction reconciled successfully!');
    }
  }

  /**
   * Reject transaction
   */
  rejectTransaction(transaction: NEFTTransaction): void {
    if (confirm(`Reject transaction ${transaction.utrNumber}?`)) {
      transaction.status = 'rejected';
      this.filterTransactions();
      alert('Transaction rejected!');
    }
  }

  /**
   * View transaction
   */
  viewTransaction(transaction: NEFTTransaction): void {
    this.selectedTransaction = transaction;
  }

  /**
   * On file selected
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  /**
   * Upload statement
   */
  uploadStatement(): void {
    if (!this.selectedFile || !this.selectedBankAccount) {
      return;
    }

    // Simulate statement processing
    alert(`Processing bank statement: ${this.selectedFile.name}`);
    
    // Simulate adding new transactions from statement
    const newTransactions: NEFTTransaction[] = [
      {
        id: `txn-${Date.now()}`,
        transactionId: `TXN${Date.now()}`,
        utrNumber: `NEFT${Date.now()}`,
        amount: Math.floor(Math.random() * 10000) + 1000,
        transactionDate: new Date(),
        valueDate: new Date(),
        remitterName: 'New Remitter',
        remitterAccount: '1234567890',
        beneficiaryName: 'Society Account',
        beneficiaryAccount: this.bankAccounts.find(a => a.id === this.selectedBankAccount)?.accountNumber || '',
        beneficiaryIFSC: this.bankAccounts.find(a => a.id === this.selectedBankAccount)?.ifscCode || '',
        bankName: this.bankAccounts.find(a => a.id === this.selectedBankAccount)?.bankName || '',
        status: 'pending',
        createdAt: new Date()
      }
    ];

    this.transactions.unshift(...newTransactions);
    this.filterTransactions();
    this.showUploadStatement = false;
    this.selectedFile = null;
    this.selectedBankAccount = '';
    alert('Bank statement processed successfully!');
  }

  /**
   * Generate report
   */
  generateReport(type: string): void {
    alert(`Generating ${type} report...`);
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      matched: 'Matched',
      reconciled: 'Reconciled',
      unmatched: 'Unmatched',
      duplicate: 'Duplicate',
      rejected: 'Rejected'
    };
    return labels[status] || status;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  /**
   * Format date time
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

