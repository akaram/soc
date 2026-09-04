import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { MemberStatementService } from '../../services/member-statement.service';
import {
  MemberStatement,
  MemberStatementFlat,
  StatementTransaction
} from '../../models/member-statement.model';

/**
 * Member Statement Component (Per Flat)
 * Generates detailed financial statements for each flat/unit member
 */

@Component({
  selector: 'app-member-statement',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="member-statement-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">description</i>
            Member Statement (Per Flat)
          </h1>
          <p>Generate detailed financial statements for each flat/unit member</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/member-statements</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showSettings = true" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="exportStatement()" [disabled]="!selectedFlatId" title="Export">
            <i class="material-icons">download</i>
            Export
          </button>
          <button class="icon-btn" (click)="printStatement()" [disabled]="!selectedFlatId" title="Print">
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
        <span>Loading member statement…</span>
      </div>

      <!-- Filters & Selection -->
      <div class="filters-section">
        <div class="filter-controls">
          <div class="control-group">
            <label>Select Flat/Unit <span class="required">*</span></label>
            <select [(ngModel)]="selectedFlatId" (change)="loadStatement()" required>
              <option value="">Select Flat</option>
              <option *ngFor="let flat of flats" [value]="flat.id">
                {{ flat.unitNumber }} - {{ flat.ownerName }}
              </option>
            </select>
          </div>
          <div class="control-group">
            <label>Statement Period Start</label>
            <input type="date" [(ngModel)]="periodStart" (change)="loadStatement()" />
          </div>
          <div class="control-group">
            <label>Statement Period End</label>
            <input type="date" [(ngModel)]="periodEnd" (change)="loadStatement()" />
          </div>
          <div class="control-group">
            <label>Transaction Type</label>
            <select [(ngModel)]="transactionTypeFilter" (change)="filterTransactions()">
              <option value="all">All Transactions</option>
              <option value="invoice">Invoices</option>
              <option value="payment">Payments</option>
              <option value="adjustment">Adjustments</option>
              <option value="credit">Credits</option>
            </select>
          </div>
          <div class="control-group">
            <label>Search</label>
            <input type="text" [(ngModel)]="searchTerm" (input)="filterTransactions()" placeholder="Search transactions..." />
          </div>
          <button class="btn btn-primary" (click)="loadStatement()">
            <i class="material-icons">refresh</i>
            Generate Statement
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards" *ngIf="selectedFlatId && statement">
        <div class="summary-card opening-balance">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <div class="card-label">Opening Balance</div>
            <div class="card-value">{{ formatCurrency(statement.openingBalance) }}</div>
            <div class="card-hint">As of {{ formatDate(statement.statementPeriod.startDate) }}</div>
          </div>
        </div>
        <div class="summary-card closing-balance" [ngClass]="{'positive': statement.closingBalance <= 0, 'negative': statement.closingBalance > 0}">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <div class="card-label">Closing Balance</div>
            <div class="card-value">{{ formatCurrency(Math.abs(statement.closingBalance)) }}</div>
            <div class="card-hint" [ngClass]="{'positive': statement.closingBalance <= 0, 'negative': statement.closingBalance > 0}">
              {{ statement.closingBalance <= 0 ? 'Credit Balance' : 'Outstanding' }}
            </div>
          </div>
        </div>
        <div class="summary-card total-invoices">
          <div class="card-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Invoices</div>
            <div class="card-value">{{ statement.summary.totalInvoices }}</div>
            <div class="card-hint">Amount: {{ formatCurrency(statement.summary.totalDebits) }}</div>
          </div>
        </div>
        <div class="summary-card total-payments">
          <div class="card-icon">
            <i class="material-icons">payment</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Payments</div>
            <div class="card-value">{{ statement.summary.totalPayments }}</div>
            <div class="card-hint">Amount: {{ formatCurrency(statement.summary.totalCredits) }}</div>
          </div>
        </div>
        <div class="summary-card overdue" *ngIf="statement.summary.overdueAmount > 0">
          <div class="card-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="card-content">
            <div class="card-label">Overdue Amount</div>
            <div class="card-value">{{ formatCurrency(statement.summary.overdueAmount) }}</div>
            <div class="card-hint">Past due date</div>
          </div>
        </div>
        <div class="summary-card net-amount" [ngClass]="{'positive': statement.summary.netAmount <= 0, 'negative': statement.summary.netAmount > 0}">
          <div class="card-icon">
            <i class="material-icons">trending_up</i>
          </div>
          <div class="card-content">
            <div class="card-label">Net Amount</div>
            <div class="card-value">{{ formatCurrency(Math.abs(statement.summary.netAmount)) }}</div>
            <div class="card-hint">{{ statement.summary.netAmount > 0 ? 'Debit' : 'Credit' }}</div>
          </div>
        </div>
      </div>

      <!-- Statement Content -->
      <div class="statement-content" *ngIf="selectedFlatId && statement">
        <!-- Member Information -->
        <div class="member-info-section">
          <div class="info-header">
            <h2>Statement for {{ statement.flatNumber }}</h2>
            <div class="info-meta">
              <span>Owner: <strong>{{ statement.ownerName }}</strong></span>
              <span>Period: <strong>{{ formatDate(statement.statementPeriod.startDate) }} to {{ formatDate(statement.statementPeriod.endDate) }}</strong></span>
              <span>Generated: <strong>{{ formatDate(currentDate) }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Aging Analysis -->
        <div class="aging-section" *ngIf="statement.summary.overdueAmount > 0">
          <h3>Aging Analysis</h3>
          <div class="aging-cards">
            <div class="aging-card current">
              <div class="aging-label">Current (Not Due)</div>
              <div class="aging-value">{{ formatCurrency(statement.agingAnalysis.current) }}</div>
            </div>
            <div class="aging-card one-to-thirty">
              <div class="aging-label">1-30 Days</div>
              <div class="aging-value">{{ formatCurrency(statement.agingAnalysis['1-30']) }}</div>
            </div>
            <div class="aging-card thirtyone-to-sixty">
              <div class="aging-label">31-60 Days</div>
              <div class="aging-value">{{ formatCurrency(statement.agingAnalysis['31-60']) }}</div>
            </div>
            <div class="aging-card sixtyone-to-ninety">
              <div class="aging-label">61-90 Days</div>
              <div class="aging-value">{{ formatCurrency(statement.agingAnalysis['61-90']) }}</div>
            </div>
            <div class="aging-card ninety-plus">
              <div class="aging-label">90+ Days</div>
              <div class="aging-value">{{ formatCurrency(statement.agingAnalysis['90+']) }}</div>
            </div>
          </div>
        </div>

        <!-- Transaction Table -->
        <div class="transactions-section">
          <div class="section-header">
            <h3>Transaction Details</h3>
            <div class="section-actions">
              <span class="transaction-count">{{ filteredTransactions.length }} transactions</span>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="statement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let transaction of filteredTransactions" 
                    [ngClass]="{'debit-row': transaction.debit > 0, 'credit-row': transaction.credit > 0, 'overdue': transaction.status === 'overdue'}">
                  <td>{{ formatDate(transaction.date) }}</td>
                  <td>
                    <span class="type-badge" [ngClass]="transaction.transactionType">
                      {{ getTransactionTypeLabel(transaction.transactionType) }}
                    </span>
                  </td>
                  <td>{{ transaction.referenceNumber }}</td>
                  <td class="description">{{ transaction.description }}</td>
                  <td class="amount debit" *ngIf="transaction.debit > 0">{{ formatCurrency(transaction.debit) }}</td>
                  <td class="amount" *ngIf="transaction.debit === 0">-</td>
                  <td class="amount credit" *ngIf="transaction.credit > 0">{{ formatCurrency(transaction.credit) }}</td>
                  <td class="amount" *ngIf="transaction.credit === 0">-</td>
                  <td class="amount balance" [ngClass]="{'positive': transaction.balance <= 0, 'negative': transaction.balance > 0}">
                    {{ formatCurrency(Math.abs(transaction.balance)) }}
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="transaction.status">
                      {{ getStatusLabel(transaction.status) }}
                    </span>
                    <span *ngIf="transaction.daysOverdue && transaction.daysOverdue > 0" class="days-overdue">
                      ({{ transaction.daysOverdue }} days)
                    </span>
                  </td>
                  <td>
                    <button class="action-btn view" (click)="viewTransaction(transaction)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="summary-row">
                  <td colspan="4"><strong>Total</strong></td>
                  <td class="amount debit"><strong>{{ formatCurrency(statement.summary.totalDebits) }}</strong></td>
                  <td class="amount credit"><strong>{{ formatCurrency(statement.summary.totalCredits) }}</strong></td>
                  <td class="amount balance" [ngClass]="{'positive': statement.closingBalance <= 0, 'negative': statement.closingBalance > 0}">
                    <strong>{{ formatCurrency(Math.abs(statement.closingBalance)) }}</strong>
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Summary Notes -->
        <div class="summary-notes">
          <div class="notes-section">
            <h4>Statement Summary</h4>
            <ul>
              <li>Opening Balance: <strong>{{ formatCurrency(statement.openingBalance) }}</strong></li>
              <li>Total Charges (Debits): <strong>{{ formatCurrency(statement.summary.totalDebits) }}</strong></li>
              <li>Total Payments (Credits): <strong>{{ formatCurrency(statement.summary.totalCredits) }}</strong></li>
              <li>Net Amount: <strong>{{ formatCurrency(statement.summary.netAmount) }}</strong></li>
              <li>Closing Balance: <strong>{{ formatCurrency(statement.closingBalance) }}</strong></li>
            </ul>
          </div>
          <div class="notes-section" *ngIf="statement.summary.overdueAmount > 0">
            <h4>Important Notice</h4>
            <p class="warning-text">
              You have an outstanding amount of <strong>{{ formatCurrency(statement.summary.overdueAmount) }}</strong> that is past due. 
              Please make payment at your earliest convenience to avoid any penalties.
            </p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!selectedFlatId">
        <i class="material-icons">description</i>
        <h3>Select a Flat to Generate Statement</h3>
        <p>Choose a flat/unit from the dropdown above to view the member's financial statement</p>
      </div>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="showSettings = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Statement Settings</h2>
            <button class="close-btn" (click)="showSettings = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Default Period (Months)</label>
              <input type="number" [(ngModel)]="defaultPeriodMonths" min="1" max="12" />
              <small>Default number of months to include in statement</small>
            </div>
            <div class="form-group">
              <label>Show Zero Balance Transactions</label>
              <input type="checkbox" [(ngModel)]="showZeroBalance" />
            </div>
            <div class="form-group">
              <label>Include Pending Transactions</label>
              <input type="checkbox" [(ngModel)]="includePending" />
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
    .member-statement-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
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
    .icon-btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.3);
    }

    .icon-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    .api-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      font-size: 12px;
    }

    .load-error,
    .loading-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 24px 0;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
    }

    .load-error {
      background: #fdecea;
      color: #c0392b;
    }

    .loading-banner {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
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

    .required {
      color: #e74c3c;
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
      border-color: #3498db;
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
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

    .summary-card.opening-balance .card-icon {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
    }

    .summary-card.closing-balance.positive .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.closing-balance.negative .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.total-invoices .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .summary-card.total-payments .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.overdue .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.net-amount.positive .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.net-amount.negative .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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

    .card-hint.positive {
      color: #2ed573;
      font-weight: 600;
    }

    .card-hint.negative {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Statement Content */
    .statement-content {
      padding: 0 24px 24px;
    }

    .member-info-section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }

    .info-header h2 {
      margin: 0 0 12px 0;
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;
    }

    .info-meta {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #7f8c8d;
    }

    .info-meta strong {
      color: #2c3e50;
    }

    /* Aging Section */
    .aging-section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }

    .aging-section h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .aging-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }

    .aging-card {
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }

    .aging-card.current {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .aging-card.one-to-thirty {
      background: #fff4e6;
      color: #e67e22;
    }

    .aging-card.thirtyone-to-sixty {
      background: #ffe8d6;
      color: #e67e22;
    }

    .aging-card.sixtyone-to-ninety {
      background: #ffeaea;
      color: #e74c3c;
    }

    .aging-card.ninety-plus {
      background: #ffd6d6;
      color: #c0392b;
    }

    .aging-label {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .aging-value {
      font-size: 20px;
      font-weight: 700;
    }

    /* Transactions Section */
    .transactions-section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .transaction-count {
      font-size: 14px;
      color: #7f8c8d;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .statement-table {
      width: 100%;
      border-collapse: collapse;
    }

    .statement-table thead {
      background: #f8f9fa;
    }

    .statement-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .statement-table td {
      padding: 12px 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .statement-table tbody tr:hover {
      background: #f8f9fa;
    }

    .statement-table tbody tr.debit-row {
      background: #fff4e6;
    }

    .statement-table tbody tr.credit-row {
      background: #e8f8f0;
    }

    .statement-table tbody tr.overdue {
      border-left: 4px solid #e74c3c;
    }

    .description {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-badge.invoice {
      background: #e7f3ff;
      color: #2980b9;
    }

    .type-badge.payment {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .type-badge.adjustment {
      background: #fff4e6;
      color: #e67e22;
    }

    .type-badge.credit {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .type-badge.refund {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .type-badge.penalty {
      background: #ffeaea;
      color: #e74c3c;
    }

    .type-badge.discount {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .amount {
      text-align: right;
      font-weight: 500;
    }

    .amount.debit {
      color: #e74c3c;
    }

    .amount.credit {
      color: #2ed573;
    }

    .amount.balance.positive {
      color: #2ed573;
    }

    .amount.balance.negative {
      color: #e74c3c;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.paid {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-badge.pending {
      background: #fff4e6;
      color: #e67e22;
    }

    .status-badge.overdue {
      background: #ffeaea;
      color: #e74c3c;
    }

    .status-badge.cancelled {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .days-overdue {
      font-size: 11px;
      color: #e74c3c;
      margin-left: 4px;
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
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .action-btn:hover {
      transform: scale(1.1);
    }

    .summary-row {
      background: #f8f9fa;
      font-weight: 600;
    }

    /* Summary Notes */
    .summary-notes {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .notes-section h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .notes-section ul {
      margin: 0;
      padding-left: 20px;
      list-style: none;
    }

    .notes-section li {
      margin-bottom: 8px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .notes-section strong {
      color: #2c3e50;
    }

    .warning-text {
      margin: 0;
      padding: 12px;
      background: #fff4e6;
      border-left: 4px solid #e67e22;
      border-radius: 4px;
      font-size: 14px;
      color: #2c3e50;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 80px 24px;
      background: white;
      border-radius: 12px;
      margin: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .empty-state .material-icons {
      font-size: 64px;
      color: #bdc3c7;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0;
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
      max-width: 600px;
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

    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group input[type="date"] {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }

    .form-group input:focus {
      border-color: #3498db;
    }

    .form-group input[type="checkbox"] {
      width: 20px;
      height: 20px;
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

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .filter-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .summary-notes {
        grid-template-columns: 1fr;
      }

      .statement-table {
        min-width: 1200px;
      }
    }
  `]
})
export class MemberStatementComponent implements OnInit, OnDestroy {
  private readonly memberStatementService = inject(MemberStatementService);
  private readonly session = inject(SessionContextService);
  private readonly destroy$ = new Subject<void>();

  // Expose Math for use in templates
  Math = Math;

  currentDate: Date = new Date();
  loading = false;
  loadError = '';

  flats: MemberStatementFlat[] = [];
  selectedFlatId = '';
  periodStart = '';
  periodEnd = '';
  transactionTypeFilter = 'all';
  searchTerm = '';
  statement: MemberStatement | null = null;
  filteredTransactions: StatementTransaction[] = [];
  showSettings = false;
  defaultPeriodMonths = 3;
  showZeroBalance = false;
  includePending = true;

  constructor() {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    this.periodStart = threeMonthsAgo.toISOString().split('T')[0];
    this.periodEnd = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadFlats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load flats/units for the selected society. */
  loadFlats(): void {
    if (!this.session.getSocietyId()) {
      this.flats = [];
      this.loadError = 'Select a society to load flats.';
      return;
    }
    this.memberStatementService
      .getFlats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: flats => {
          this.flats = flats;
          this.loadError = flats.length === 0 ? 'No flats found for this society.' : '';
        },
        error: err => {
          this.flats = [];
          this.loadError = err?.message ?? 'Failed to load flats.';
        }
      });
  }

  /** Load statement for the selected flat and period. */
  loadStatement(): void {
    if (!this.selectedFlatId) {
      return;
    }
    if (!this.session.getSocietyId()) {
      this.loadError = 'Select a society to generate a statement.';
      return;
    }

    this.loading = true;
    this.loadError = '';
    this.memberStatementService
      .getStatement(this.selectedFlatId, this.periodStart, this.periodEnd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.statement = response.statement;
          this.filterTransactions();
          this.loading = false;
        },
        error: err => {
          this.statement = null;
          this.filteredTransactions = [];
          this.loadError = err?.message ?? 'Failed to load member statement.';
          this.loading = false;
        }
      });
  }

  /**
   * Filter transactions
   */
  filterTransactions(): void {
    if (!this.statement) return;

    let filtered = [...this.statement.transactions];

    // Filter by transaction type
    if (this.transactionTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.transactionType === this.transactionTypeFilter);
    }

    // Filter by search term
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(search) ||
        t.referenceNumber.toLowerCase().includes(search) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(search))
      );
    }

    // Filter zero balance if needed
    if (!this.showZeroBalance) {
      filtered = filtered.filter(t => t.balance !== 0);
    }

    // Filter pending if needed
    if (!this.includePending) {
      filtered = filtered.filter(t => t.status !== 'pending');
    }

    this.filteredTransactions = filtered;
  }

  /**
   * View transaction details
   */
  viewTransaction(transaction: StatementTransaction): void {
    // In real app, show detailed transaction view
    console.log('View transaction:', transaction);
    alert(`Transaction Details:\n\nReference: ${transaction.referenceNumber}\nDescription: ${transaction.description}\nAmount: ${this.formatCurrency(transaction.debit > 0 ? transaction.debit : transaction.credit)}\nStatus: ${this.getStatusLabel(transaction.status)}`);
  }

  /**
   * Export statement
   */
  exportStatement(): void {
    if (!this.statement) {
      return;
    }
    const blob = new Blob([JSON.stringify(this.statement, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `member-statement-${this.statement.flatNumber}-${this.periodStart}-${this.periodEnd}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Print statement
   */
  printStatement(): void {
    window.print();
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    localStorage.setItem('member_statement_settings', JSON.stringify({
      defaultPeriodMonths: this.defaultPeriodMonths,
      showZeroBalance: this.showZeroBalance,
      includePending: this.includePending
    }));
    this.showSettings = false;
    alert('Settings saved successfully!');
    this.loadStatement();
  }

  /**
   * Load settings
   */
  loadSettings(): void {
    const saved = localStorage.getItem('member_statement_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.defaultPeriodMonths = settings.defaultPeriodMonths || 3;
        this.showZeroBalance = settings.showZeroBalance || false;
        this.includePending = settings.includePending !== false;
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }

  /**
   * Get transaction type label
   */
  getTransactionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'invoice': 'Invoice',
      'payment': 'Payment',
      'adjustment': 'Adjustment',
      'credit': 'Credit',
      'refund': 'Refund',
      'penalty': 'Penalty',
      'discount': 'Discount'
    };
    return labels[type] || type;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'paid': 'Paid',
      'pending': 'Pending',
      'overdue': 'Overdue',
      'cancelled': 'Cancelled'
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



