import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

/**
 * Interface representing a single trial balance line item.
 */
interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  group: string;
  subGroup?: string;
  debit: number;
  credit: number;
  hasMismatch: boolean;
}

/**
 * Interface representing a ledger that may be important for audit.
 */
interface AuditLedgerSummary {
  ledgerName: string;
  group: string;
  closingBalance: number;
  balanceType: 'debit' | 'credit';
  hasSupportingDocs: boolean;
  hasPan: boolean;
  hasGst: boolean;
  remarks?: string;
}

/**
 * Interface representing a simple audit checklist item.
 */
interface AuditChecklistItem {
  id: string;
  description: string;
  category: 'statutory' | 'internal' | 'tax' | 'disclosure';
  status: 'completed' | 'pending' | 'in-progress';
  owner: string;
  dueDate: Date;
}

/**
 * Interface for high level audit summary used in header cards.
 */
interface AuditSummary {
  financialYear: string;
  periodLabel: string;
  totalLedgers: number;
  totalTrialBalanceDebits: number;
  totalTrialBalanceCredits: number;
  difference: number;
  highRiskLedgers: number;
  pendingChecklistItems: number;
}

@Component({
  selector: 'app-audit-ready-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="audit-reports-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">assignment</i>
            Audit-ready Reports for CA
          </h1>
          <p>Get clean, audit-ready financial schedules and checklists for your CA</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="exportForCA()" title="Export for CA">
            <i class="material-icons">download</i>
            Export Pack
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Financial Year</label>
          <select [(ngModel)]="selectedFinancialYear" (change)="onFilterChange()">
            <option *ngFor="let fy of financialYears" [value]="fy">{{ fy }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Period</label>
          <select [(ngModel)]="selectedPeriod" (change)="onFilterChange()">
            <option value="full-year">Full Year</option>
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
            <option value="q3">Q3</option>
            <option value="q4">Q4</option>
          </select>
        </div>
        <div class="filter-group">
          <label>View</label>
          <select [(ngModel)]="activeTab">
            <option value="summary">Summary</option>
            <option value="trial-balance">Trial Balance</option>
            <option value="ledgers">Key Ledgers</option>
            <option value="checklist">Audit Checklist</option>
          </select>
        </div>
      </div>

      <!-- Summary Tab -->
      <div *ngIf="activeTab === 'summary'" class="tab-content">
        <div class="summary-cards">
          <div class="summary-card tb-balance">
            <div class="card-icon">
              <i class="material-icons">swap_horiz</i>
            </div>
            <div class="card-content">
              <div class="card-label">Trial Balance Status</div>
              <div class="card-value" [ngClass]="{'ok': auditSummary.difference === 0, 'issue': auditSummary.difference !== 0}">
                {{ auditSummary.difference === 0 ? 'Balanced' : 'Difference: ' + formatCurrency(Math.abs(auditSummary.difference)) }}
              </div>
              <div class="card-hint">
                Debits: {{ formatCurrency(auditSummary.totalTrialBalanceDebits) }} | Credits:
                {{ formatCurrency(auditSummary.totalTrialBalanceCredits) }}
              </div>
            </div>
          </div>

          <div class="summary-card ledgers">
            <div class="card-icon">
              <i class="material-icons">account_balance</i>
            </div>
            <div class="card-content">
              <div class="card-label">Ledgers Reviewed</div>
              <div class="card-value">{{ auditSummary.totalLedgers }}</div>
              <div class="card-hint">High risk / requiring clarification: {{ auditSummary.highRiskLedgers }}</div>
            </div>
          </div>

          <div class="summary-card checklist">
            <div class="card-icon">
              <i class="material-icons">checklist</i>
            </div>
            <div class="card-content">
              <div class="card-label">Pending Checklist Items</div>
              <div class="card-value" [ngClass]="{'ok': auditSummary.pendingChecklistItems === 0, 'issue': auditSummary.pendingChecklistItems > 0}">
                {{ auditSummary.pendingChecklistItems }}
              </div>
              <div class="card-hint">Complete these before sharing with CA</div>
            </div>
          </div>

          <div class="summary-card period">
            <div class="card-icon">
              <i class="material-icons">date_range</i>
            </div>
            <div class="card-content">
              <div class="card-label">Reporting Period</div>
              <div class="card-value">{{ auditSummary.financialYear }}</div>
              <div class="card-hint">{{ auditSummary.periodLabel }}</div>
            </div>
          </div>
        </div>

        <div class="summary-section">
          <h2>What your CA will get</h2>
          <ul>
            <li>Clean trial balance with clear groupings (Assets, Liabilities, Income, Expenses)</li>
            <li>Key ledger summaries for bank, maintenance income, expenses, and members</li>
            <li>Highlight of ledgers without PAN / GST details and other compliance gaps</li>
            <li>Simple checklist of items to complete before sharing books for audit</li>
          </ul>
        </div>
      </div>

      <!-- Trial Balance Tab -->
      <div *ngIf="activeTab === 'trial-balance'" class="tab-content">
        <div class="section-header">
          <h2>Trial Balance (Audit View)</h2>
          <span class="hint">Grouped for easy export to CA tools</span>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Group</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of trialBalance">
                <td>{{ item.accountCode }}</td>
                <td>{{ item.accountName }}</td>
                <td>{{ item.group }}</td>
                <td class="amount debit">{{ formatCurrency(item.debit) }}</td>
                <td class="amount credit">{{ formatCurrency(item.credit) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="{'ok': !item.hasMismatch, 'issue': item.hasMismatch}">
                    {{ item.hasMismatch ? 'Check' : 'OK' }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="total-label">Total</td>
                <td class="amount debit">{{ formatCurrency(auditSummary.totalTrialBalanceDebits) }}</td>
                <td class="amount credit">{{ formatCurrency(auditSummary.totalTrialBalanceCredits) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="{'ok': auditSummary.difference === 0, 'issue': auditSummary.difference !== 0}">
                    {{ auditSummary.difference === 0 ? 'Balanced' : 'Diff ' + formatCurrency(auditSummary.difference) }}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Key Ledgers Tab -->
      <div *ngIf="activeTab === 'ledgers'" class="tab-content">
        <div class="section-header">
          <h2>Key Ledgers for Audit</h2>
          <span class="hint">Bank, member outstanding, income and major expenses</span>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ledger</th>
                <th>Group</th>
                <th>Closing Balance</th>
                <th>Docs</th>
                <th>PAN</th>
                <th>GST</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ledger of auditLedgers">
                <td>{{ ledger.ledgerName }}</td>
                <td>{{ ledger.group }}</td>
                <td class="amount" [ngClass]="{'debit': ledger.balanceType === 'debit', 'credit': ledger.balanceType === 'credit'}">
                  {{ formatCurrency(ledger.closingBalance) }} {{ ledger.balanceType === 'debit' ? 'Dr' : 'Cr' }}
                </td>
                <td>
                  <span class="status-badge" [ngClass]="{'ok': ledger.hasSupportingDocs, 'issue': !ledger.hasSupportingDocs}">
                    {{ ledger.hasSupportingDocs ? 'Available' : 'Missing' }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="{'ok': ledger.hasPan, 'issue': !ledger.hasPan}">
                    {{ ledger.hasPan ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="{'ok': ledger.hasGst, 'issue': !ledger.hasGst}">
                    {{ ledger.hasGst ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="remarks">{{ ledger.remarks || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Checklist Tab -->
      <div *ngIf="activeTab === 'checklist'" class="tab-content">
        <div class="section-header">
          <h2>Audit Checklist</h2>
          <span class="hint">Tick off items before handing over to CA</span>
        </div>

        <div class="checklist-grid">
          <div class="checklist-card" *ngFor="let item of checklist">
            <div class="checklist-header">
              <span class="category" [ngClass]="item.category">{{ getChecklistCategoryLabel(item.category) }}</span>
              <span class="status" [ngClass]="item.status">{{ getChecklistStatusLabel(item.status) }}</span>
            </div>
            <p class="description">{{ item.description }}</p>
            <div class="meta">
              <span>Owner: <strong>{{ item.owner }}</strong></span>
              <span>Due: <strong>{{ formatDate(item.dueDate) }}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-reports-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .page-header {
      background: linear-gradient(135deg, #2c3e50 0%, #4a6074 100%);
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
      font-size: 22px;
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

    .filters-section {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 16px 24px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .filter-group label {
      font-size: 12px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .filter-group select {
      min-width: 150px;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #dfe6e9;
      font-size: 13px;
    }

    .tab-content {
      padding: 24px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .summary-card .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
    }

    .summary-card.tb-balance .card-icon {
      background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    }

    .summary-card.ledgers .card-icon {
      background: linear-gradient(135deg, #2980b9 0%, #3498db 100%);
    }

    .summary-card.checklist .card-icon {
      background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%);
    }

    .summary-card.period .card-icon {
      background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
    }

    .card-content {
      flex: 1;
    }

    .card-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #7f8c8d;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
      color: #2c3e50;
    }

    .card-value.ok {
      color: #27ae60;
    }

    .card-value.issue {
      color: #e74c3c;
    }

    .card-hint {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .summary-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .summary-section h2 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .summary-section ul {
      margin: 0;
      padding-left: 20px;
      color: #34495e;
      font-size: 14px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .section-header .hint {
      font-size: 13px;
      color: #7f8c8d;
    }

    .table-wrapper {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead {
      background: #f8f9fa;
    }

    .data-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #7f8c8d;
      border-bottom: 1px solid #ecf0f1;
    }

    .data-table td {
      padding: 10px 16px;
      font-size: 14px;
      color: #2c3e50;
      border-top: 1px solid #f2f4f5;
      white-space: nowrap;
    }

    .data-table tfoot td {
      font-weight: 600;
      background: #f8f9fa;
    }

    .data-table tbody tr:hover {
      background: #f8f9fa;
    }

    .total-label {
      text-align: right;
      font-weight: 600;
      color: #2c3e50;
    }

    .amount {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .amount.debit {
      color: #27ae60;
    }

    .amount.credit {
      color: #2980b9;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.ok {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-badge.issue {
      background: #ffeaea;
      color: #e74c3c;
    }

    .remarks {
      max-width: 260px;
      white-space: normal;
    }

    .checklist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }

    .checklist-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checklist-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .checklist-header .category {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .checklist-header .category.statutory {
      background: #e8f4ff;
      color: #1d6fa5;
    }

    .checklist-header .category.internal {
      background: #fdf4e3;
      color: #c77b07;
    }

    .checklist-header .category.tax {
      background: #fbeeee;
      color: #b9312c;
    }

    .checklist-header .category.disclosure {
      background: #eaf7f0;
      color: #18784a;
    }

    .checklist-header .status {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .checklist-header .status.completed {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .checklist-header .status.pending {
      background: #ffeaea;
      color: #e74c3c;
    }

    .checklist-header .status.in-progress {
      background: #fff3cd;
      color: #856404;
    }

    .checklist-card .description {
      margin: 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .checklist-card .meta {
      font-size: 12px;
      color: #7f8c8d;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .filters-section {
        padding: 12px 16px;
      }

      .tab-content {
        padding: 16px;
      }

      .data-table td,
      .data-table th {
        padding: 8px 10px;
      }
    }
  `]
})
export class AuditReadyReportsComponent implements OnInit {
  // Expose Math for template calculations (e.g., absolute values)
  Math = Math;

  // Filter state
  financialYears: string[] = [];
  selectedFinancialYear: string = '';
  selectedPeriod: 'full-year' | 'q1' | 'q2' | 'q3' | 'q4' = 'full-year';

  // Active tab for the view
  activeTab: 'summary' | 'trial-balance' | 'ledgers' | 'checklist' = 'summary';

  // Audit data
  auditSummary!: AuditSummary;
  trialBalance: TrialBalanceItem[] = [];
  auditLedgers: AuditLedgerSummary[] = [];
  checklist: AuditChecklistItem[] = [];

  constructor(private router: Router) {}

  /**
   * Lifecycle hook: initialize financial years and load sample data.
   */
  ngOnInit(): void {
    this.initializeFinancialYears();
    this.selectedFinancialYear = this.financialYears[0];
    this.loadSampleData();
  }

  /**
   * Navigate back to the main accounting dashboard.
   */
  goBack(): void {
    this.router.navigateByUrl('/admin/accounting');
  }

  /**
   * Handle filter changes by recomputing the sample data.
   * In a real app, this would refetch data from the backend.
   */
  onFilterChange(): void {
    this.loadSampleData();
  }

  /**
   * Initialize financial years for the dropdown based on current year.
   */
  private initializeFinancialYears(): void {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;
    const fyList: string[] = [];

    for (let year = startYear; year <= currentYear; year++) {
      const fy = `${year}-${(year + 1).toString().slice(-2)}`;
      fyList.unshift(fy);
    }

    this.financialYears = fyList;
  }

  /**
   * Load sample data for trial balance, key ledgers, and checklist.
   * This keeps the UI functional until real APIs are integrated.
   */
  private loadSampleData(): void {
    // Sample trial balance lines with minor difference for demonstration
    this.trialBalance = [
      {
        accountCode: '1001',
        accountName: 'Cash & Bank',
        group: 'Assets',
        debit: 250000,
        credit: 0,
        hasMismatch: false
      },
      {
        accountCode: '1101',
        accountName: 'Maintenance Receivables',
        group: 'Assets',
        debit: 175000,
        credit: 0,
        hasMismatch: false
      },
      {
        accountCode: '2001',
        accountName: 'Member Advance',
        group: 'Liabilities',
        debit: 0,
        credit: 85000,
        hasMismatch: false
      },
      {
        accountCode: '3001',
        accountName: 'Maintenance Income',
        group: 'Income',
        debit: 0,
        credit: 280000,
        hasMismatch: false
      },
      {
        accountCode: '4001',
        accountName: 'Security Expenses',
        group: 'Expenses',
        debit: 60000,
        credit: 0,
        hasMismatch: false
      },
      {
        accountCode: '4002',
        accountName: 'Electricity & Utilities',
        group: 'Expenses',
        debit: 50000,
        credit: 0,
        hasMismatch: false
      },
      {
        accountCode: '4003',
        accountName: 'Repairs & Maintenance',
        group: 'Expenses',
        debit: 30000,
        credit: 0,
        hasMismatch: false
      },
      {
        accountCode: '9999',
        accountName: 'Suspense / Rounding',
        group: 'Miscellaneous',
        debit: 500,
        credit: 0,
        hasMismatch: true
      }
    ];

    // Compute summary totals
    const totalDebits = this.trialBalance.reduce((sum, item) => sum + item.debit, 0);
    const totalCredits = this.trialBalance.reduce((sum, item) => sum + item.credit, 0);
    const difference = totalDebits - totalCredits;

    // Sample key ledgers focusing on CA relevant areas
    this.auditLedgers = [
      {
        ledgerName: 'HDFC Bank - Current A/C',
        group: 'Bank Accounts',
        closingBalance: 150000,
        balanceType: 'debit',
        hasSupportingDocs: true,
        hasPan: true,
        hasGst: true,
        remarks: 'Bank reconciliation completed till last month.'
      },
      {
        ledgerName: 'Maintenance Receivables',
        group: 'Sundry Debtors',
        closingBalance: 175000,
        balanceType: 'debit',
        hasSupportingDocs: true,
        hasPan: false,
        hasGst: false,
        remarks: 'Few members missing PAN details.'
      },
      {
        ledgerName: 'Vendors Payable',
        group: 'Sundry Creditors',
        closingBalance: 85000,
        balanceType: 'credit',
        hasSupportingDocs: false,
        hasPan: false,
        hasGst: true,
        remarks: 'Collect pending invoices and PAN details from vendors.'
      },
      {
        ledgerName: 'Fixed Asset - DG Set',
        group: 'Fixed Assets',
        closingBalance: 250000,
        balanceType: 'debit',
        hasSupportingDocs: true,
        hasPan: true,
        hasGst: true,
        remarks: 'Depreciation working shared with CA last year.'
      }
    ];

    // Sample audit checklist
    const today = new Date();
    this.checklist = [
      {
        id: 'CL-001',
        description: 'Complete bank reconciliation for all bank accounts up to month end.',
        category: 'statutory',
        status: 'in-progress',
        owner: 'Accountant',
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)
      },
      {
        id: 'CL-002',
        description: 'Collect PAN details for all members with outstanding balance above threshold.',
        category: 'tax',
        status: 'pending',
        owner: 'Society Manager',
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)
      },
      {
        id: 'CL-003',
        description: 'Verify fixed asset register and depreciation working.',
        category: 'internal',
        status: 'completed',
        owner: 'Accountant',
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)
      },
      {
        id: 'CL-004',
        description: 'Prepare related party transaction disclosure (if any).',
        category: 'disclosure',
        status: 'pending',
        owner: 'Committee Treasurer',
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15)
      }
    ];

    // Prepare high level summary for header cards
    this.auditSummary = {
      financialYear: this.selectedFinancialYear,
      periodLabel: this.getPeriodLabel(this.selectedPeriod),
      totalLedgers: this.auditLedgers.length,
      totalTrialBalanceDebits: totalDebits,
      totalTrialBalanceCredits: totalCredits,
      difference,
      highRiskLedgers: this.auditLedgers.filter(l => !l.hasSupportingDocs || !l.hasPan || !l.hasGst).length,
      pendingChecklistItems: this.checklist.filter(c => c.status !== 'completed').length
    };
  }

  /**
   * Get a user friendly label for the selected period.
   */
  private getPeriodLabel(period: 'full-year' | 'q1' | 'q2' | 'q3' | 'q4'): string {
    switch (period) {
      case 'q1':
        return 'Quarter 1 (Apr - Jun)';
      case 'q2':
        return 'Quarter 2 (Jul - Sep)';
      case 'q3':
        return 'Quarter 3 (Oct - Dec)';
      case 'q4':
        return 'Quarter 4 (Jan - Mar)';
      default:
        return 'Full Financial Year';
    }
  }

  /**
   * Helper to format dates consistently for the UI.
   */
  formatDate(date: Date): string {
    if (!date) {
      return '-';
    }
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Helper to format currency values with INR style and two decimals.
   */
  formatCurrency(amount: number): string {
    if (amount == null) {
      return '-';
    }
    return '₹ ' + amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Get a friendly label for checklist category.
   */
  getChecklistCategoryLabel(category: AuditChecklistItem['category']): string {
    switch (category) {
      case 'statutory':
        return 'Statutory';
      case 'internal':
        return 'Internal';
      case 'tax':
        return 'Tax';
      case 'disclosure':
        return 'Disclosure';
      default:
        return category;
    }
  }

  /**
   * Get a friendly status label for checklist items.
   */
  getChecklistStatusLabel(status: AuditChecklistItem['status']): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'in-progress':
        return 'In Progress';
      default:
        return status;
    }
  }

  /**
   * Placeholder for exporting all audit reports as a single pack for CA.
   * This can later be wired to a backend API that generates a PDF/Excel zip.
   */
  exportForCA(): void {
    // For now, just show a simple message; can be replaced with real export later.
    alert('Export pack generation is not yet wired to backend. This will download trial balance, ledgers, and checklist for your CA.');
  }
}


