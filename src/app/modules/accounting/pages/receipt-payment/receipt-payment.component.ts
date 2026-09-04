import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { ReceiptPaymentService } from '../../services/receipt-payment.service';
import {
  ReceiptPaymentData,
  ReceiptPaymentItem,
  ReceiptPaymentPeriod,
  ReceiptPaymentSummary
} from '../../models/receipt-payment.model';

/**
 * Receipt & Payment Statement Component
 * Tracks actual cash receipts and payments (cash flow statement)
 */

@Component({
  selector: 'app-receipt-payment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="receipt-payment-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">account_balance_wallet</i>
            Receipt & Payment Statement
          </h1>
          <p>Track actual cash receipts and payments (Cash Flow Statement)</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/receipt-payment-statements</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showSettings = true" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="exportStatement()" title="Export">
            <i class="material-icons">download</i>
            Export
          </button>
          <button class="icon-btn" (click)="printStatement()" title="Print">
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
        <span>Loading cash flow statement…</span>
      </div>

      <!-- Period Selection -->
      <div class="period-selector">
        <div class="period-controls">
          <div class="control-group">
            <label>From Date</label>
            <input type="date" [(ngModel)]="periodStart" (change)="loadStatement()" />
          </div>
          <div class="control-group">
            <label>To Date</label>
            <input type="date" [(ngModel)]="periodEnd" (change)="loadStatement()" />
          </div>
          <div class="control-group">
            <label>Financial Year</label>
            <select [(ngModel)]="selectedFinancialYear" (change)="loadStatement()">
              <option *ngFor="let year of financialYears" [value]="year">{{ year }}</option>
            </select>
          </div>
          <div class="control-group">
            <label>View Type</label>
            <select [(ngModel)]="viewType" (change)="onViewTypeChange()">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button class="btn btn-primary" (click)="refreshStatement()">
            <i class="material-icons">refresh</i>
            Refresh
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card opening-balance">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <div class="card-label">Opening Balance</div>
            <div class="card-value">{{ formatCurrency(summary.openingBalance) }}</div>
          </div>
        </div>
        <div class="summary-card receipts">
          <div class="card-icon">
            <i class="material-icons">arrow_downward</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Receipts</div>
            <div class="card-value receipt-value">{{ formatCurrency(summary.totalReceipts) }}</div>
            <div class="card-breakdown">
              <span>Operating: {{ formatCurrency(summary.operatingCashFlow > 0 ? summary.operatingCashFlow : 0) }}</span>
            </div>
          </div>
        </div>
        <div class="summary-card payments">
          <div class="card-icon">
            <i class="material-icons">arrow_upward</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Payments</div>
            <div class="card-value payment-value">{{ formatCurrency(summary.totalPayments) }}</div>
            <div class="card-breakdown">
              <span>Operating: {{ formatCurrency(summary.operatingCashFlow < 0 ? Math.abs(summary.operatingCashFlow) : 0) }}</span>
            </div>
          </div>
        </div>
        <div class="summary-card net-cashflow" [ngClass]="{'positive': summary.netCashFlow >= 0, 'negative': summary.netCashFlow < 0}">
          <div class="card-icon">
            <i class="material-icons">{{ summary.netCashFlow >= 0 ? 'trending_up' : 'trending_down' }}</i>
          </div>
          <div class="card-content">
            <div class="card-label">Net Cash Flow</div>
            <div class="card-value">{{ formatCurrency(Math.abs(summary.netCashFlow)) }}</div>
            <div class="card-hint" [ngClass]="{'positive': summary.netCashFlow >= 0, 'negative': summary.netCashFlow < 0}">
              {{ summary.netCashFlow >= 0 ? 'Cash Inflow' : 'Cash Outflow' }}
            </div>
          </div>
        </div>
        <div class="summary-card closing-balance" [ngClass]="{'positive': summary.closingBalance >= 0, 'negative': summary.closingBalance < 0}">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <div class="card-label">Closing Balance</div>
            <div class="card-value">{{ formatCurrency(Math.abs(summary.closingBalance)) }}</div>
            <div class="card-hint" [ngClass]="{'positive': summary.closingBalance >= 0, 'negative': summary.closingBalance < 0}">
              {{ summary.closingBalance >= 0 ? 'Positive' : 'Overdraft' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Receipt & Payment Statement -->
      <div class="statement-container">
        <div class="statement-header">
          <h2>Receipt & Payment Statement</h2>
          <div class="statement-meta">
            <span>Period: <strong>{{ formatDate(statementData.periodStart) }} to {{ formatDate(statementData.periodEnd) }}</strong></span>
            <span>Financial Year: <strong>{{ statementData.financialYear }}</strong></span>
            <span class="cashflow-trend" [ngClass]="summary.cashFlowTrend">
              <i class="material-icons">{{ summary.cashFlowTrend === 'positive' ? 'trending_up' : summary.cashFlowTrend === 'negative' ? 'trending_down' : 'remove' }}</i>
              {{ summary.cashFlowTrend === 'positive' ? 'Positive Trend' : summary.cashFlowTrend === 'negative' ? 'Negative Trend' : 'Neutral' }}
            </span>
          </div>
        </div>

        <div class="statement-content">
          <!-- Receipts Column -->
          <div class="statement-column receipts-column">
            <div class="column-title">
              <h3>RECEIPTS (Cash Inflows)</h3>
            </div>

            <!-- Operating Receipts -->
            <div class="subsection-header">
              <strong>Operating Activities</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.receipts.operating" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount receipt-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Operating Receipts</strong>
              <strong>{{ formatCurrency(getOperatingReceiptsTotal()) }}</strong>
            </div>

            <!-- Investing Receipts -->
            <div class="subsection-header">
              <strong>Investing Activities</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.receipts.investing" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount receipt-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Investing Receipts</strong>
              <strong>{{ formatCurrency(getInvestingReceiptsTotal()) }}</strong>
            </div>

            <!-- Financing Receipts -->
            <div class="subsection-header">
              <strong>Financing Activities</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.receipts.financing" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount receipt-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Financing Receipts</strong>
              <strong>{{ formatCurrency(getFinancingReceiptsTotal()) }}</strong>
            </div>

            <!-- Total Receipts -->
            <div class="section-total">
              <strong>TOTAL RECEIPTS</strong>
              <strong>{{ formatCurrency(summary.totalReceipts) }}</strong>
            </div>
          </div>

          <!-- Payments Column -->
          <div class="statement-column payments-column">
            <div class="column-title">
              <h3>PAYMENTS (Cash Outflows)</h3>
            </div>

            <!-- Operating Payments -->
            <div class="subsection-header">
              <strong>Operating Activities</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.payments.operating" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount payment-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Operating Payments</strong>
              <strong>{{ formatCurrency(getOperatingPaymentsTotal()) }}</strong>
            </div>

            <!-- Investing Payments -->
            <div class="subsection-header">
              <strong>Investing Activities</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.payments.investing" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount payment-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Investing Payments</strong>
              <strong>{{ formatCurrency(getInvestingPaymentsTotal()) }}</strong>
            </div>

            <!-- Financing Payments -->
            <div class="subsection-header">
              <strong>Financing Activities</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.payments.financing" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount payment-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Financing Payments</strong>
              <strong>{{ formatCurrency(getFinancingPaymentsTotal()) }}</strong>
            </div>

            <!-- Total Payments -->
            <div class="section-total">
              <strong>TOTAL PAYMENTS</strong>
              <strong>{{ formatCurrency(summary.totalPayments) }}</strong>
            </div>
          </div>
        </div>

        <!-- Cash Flow Summary -->
        <div class="cashflow-summary">
          <div class="summary-row">
            <span>Opening Cash Balance</span>
            <span class="amount">{{ formatCurrency(summary.openingBalance) }}</span>
          </div>
          <div class="summary-row">
            <span>Total Receipts</span>
            <span class="amount receipt-amount">+ {{ formatCurrency(summary.totalReceipts) }}</span>
          </div>
          <div class="summary-row">
            <span>Total Payments</span>
            <span class="amount payment-amount">- {{ formatCurrency(summary.totalPayments) }}</span>
          </div>
          <div class="summary-row net-cashflow-row" [ngClass]="{'positive': summary.netCashFlow >= 0, 'negative': summary.netCashFlow < 0}">
            <span><strong>Net Cash Flow</strong></span>
            <span class="amount"><strong>{{ formatCurrency(summary.netCashFlow) }}</strong></span>
          </div>
          <div class="summary-row closing-balance-row" [ngClass]="{'positive': summary.closingBalance >= 0, 'negative': summary.closingBalance < 0}">
            <span><strong>Closing Cash Balance</strong></span>
            <span class="amount"><strong>{{ formatCurrency(summary.closingBalance) }}</strong></span>
          </div>
        </div>
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
              <label>Default View</label>
              <select [(ngModel)]="viewType">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div class="form-group">
              <label>Show Zero Amount Items</label>
              <input type="checkbox" [(ngModel)]="showZeroAmount" (change)="loadStatement()" />
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
    .receipt-payment-container {
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

    /* Period Selector */
    .period-selector {
      background: white;
      padding: 20px 24px;
      margin: 24px 24px 0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .period-controls {
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
      border-color: #3498db;
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

    .summary-card.receipts .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.payments .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.net-cashflow.positive .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.net-cashflow.negative .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.closing-balance.positive .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .summary-card.closing-balance.negative .card-icon {
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

    .card-value.receipt-value {
      color: #2ed573;
    }

    .card-value.payment-value {
      color: #e74c3c;
    }

    .card-hint {
      font-size: 11px;
      margin-top: 4px;
      font-weight: 600;
    }

    .card-hint.positive {
      color: #2ed573;
    }

    .card-hint.negative {
      color: #e74c3c;
    }

    .card-breakdown {
      font-size: 11px;
      margin-top: 4px;
      color: #7f8c8d;
    }

    /* Statement Container */
    .statement-container {
      padding: 0 24px 24px;
    }

    .statement-header {
      background: white;
      padding: 20px;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .statement-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .statement-meta {
      display: flex;
      gap: 24px;
      align-items: center;
      flex-wrap: wrap;
    }

    .statement-meta span {
      font-size: 14px;
      color: #7f8c8d;
    }

    .statement-meta strong {
      color: #2c3e50;
    }

    .cashflow-trend {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .cashflow-trend.positive {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .cashflow-trend.negative {
      background: #ffeaea;
      color: #e74c3c;
    }

    .cashflow-trend.neutral {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .statement-content {
      background: white;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .statement-column {
      padding: 20px;
      border-right: 1px solid #e9ecef;
    }

    .statement-column:last-child {
      border-right: none;
    }

    .column-title {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e9ecef;
    }

    .column-title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
    }

    .subsection-header {
      margin-top: 16px;
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .subsection-header strong {
      font-size: 14px;
      color: #2c3e50;
    }

    .items-list {
      margin-bottom: 12px;
    }

    .statement-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      cursor: pointer;
      transition: background 0.2s;
      border-radius: 4px;
    }

    .statement-item:hover {
      background: #f8f9fa;
    }

    .statement-item.header {
      font-weight: 600;
      color: #2c3e50;
      padding: 12px 0;
      border-top: 1px solid #f0f0f0;
      margin-top: 8px;
    }

    .statement-item.level-1 {
      padding-left: 16px;
    }

    .statement-item.level-2 {
      padding-left: 32px;
    }

    .statement-item.level-3 {
      padding-left: 48px;
    }

    .item-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #2c3e50;
      flex: 1;
    }

    .expand-icon {
      font-size: 18px;
      color: #95a5a6;
      cursor: pointer;
    }

    .item-amount {
      font-size: 14px;
      font-weight: 500;
      text-align: right;
      min-width: 120px;
    }

    .item-amount.receipt-amount {
      color: #2ed573;
    }

    .item-amount.payment-amount {
      color: #e74c3c;
    }

    .subsection-total {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      margin-top: 8px;
      border-top: 2px solid #e9ecef;
      font-weight: 600;
      font-size: 14px;
      color: #2c3e50;
    }

    .section-total {
      display: flex;
      justify-content: space-between;
      padding: 16px 0;
      margin-top: 16px;
      border-top: 3px solid #2c3e50;
      font-weight: 700;
      font-size: 16px;
      color: #2c3e50;
      background: #f8f9fa;
      padding: 16px;
      margin-left: -20px;
      margin-right: -20px;
      padding-left: 20px;
      padding-right: 20px;
    }

    .cashflow-summary {
      background: white;
      padding: 24px;
      margin-top: 0;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-top: 4px solid #3498db;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-row.net-cashflow-row {
      border-top: 2px solid #e9ecef;
      margin-top: 8px;
      padding-top: 16px;
      font-size: 16px;
    }

    .summary-row.net-cashflow-row.positive {
      background: #e8f8f0;
      padding: 16px;
      margin-left: -24px;
      margin-right: -24px;
      padding-left: 24px;
      padding-right: 24px;
    }

    .summary-row.net-cashflow-row.negative {
      background: #ffeaea;
      padding: 16px;
      margin-left: -24px;
      margin-right: -24px;
      padding-left: 24px;
      padding-right: 24px;
    }

    .summary-row.closing-balance-row {
      border-top: 3px solid #2c3e50;
      margin-top: 8px;
      padding-top: 16px;
      font-size: 18px;
      font-weight: 700;
    }

    .summary-row.closing-balance-row.positive {
      background: #e7f3ff;
      padding: 20px;
      margin-left: -24px;
      margin-right: -24px;
      padding-left: 24px;
      padding-right: 24px;
      color: #2980b9;
    }

    .summary-row.closing-balance-row.negative {
      background: #ffeaea;
      padding: 20px;
      margin-left: -24px;
      margin-right: -24px;
      padding-left: 24px;
      padding-right: 24px;
      color: #e74c3c;
    }

    .summary-row .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .summary-row .amount.receipt-amount {
      color: #2ed573;
    }

    .summary-row .amount.payment-amount {
      color: #e74c3c;
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
      max-width: 500px;
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
      border-color: #3498db;
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
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    @media (max-width: 1024px) {
      .statement-content {
        grid-template-columns: 1fr;
      }

      .statement-column {
        border-right: none;
        border-bottom: 1px solid #e9ecef;
      }

      .statement-column:last-child {
        border-bottom: none;
      }
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .period-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .control-group input,
      .control-group select {
        width: 100%;
      }
    }
  `]
})
export class ReceiptPaymentComponent implements OnInit, OnDestroy {
  Math = Math;

  statementData!: ReceiptPaymentData;
  summary!: ReceiptPaymentSummary;
  periodStart: string = '';
  periodEnd: string = '';
  selectedFinancialYear: string = '';
  viewType: ReceiptPaymentPeriod = 'monthly';
  showZeroAmount: boolean = false;
  showSettings: boolean = false;
  autoRefreshInterval: number = 0;
  expandedItems: Set<string> = new Set();
  financialYears: string[] = [];
  loadError = '';
  loading = false;

  private rawStatementData!: ReceiptPaymentData;
  private refreshInterval?: ReturnType<typeof setInterval>;
  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private receiptPaymentService = inject(ReceiptPaymentService);

  constructor() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    for (let i = 5; i >= 0; i--) {
      const year = fyStartYear - i;
      this.financialYears.push(`${year}-${String(year + 1).slice(-2)}`);
    }

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.periodStart = firstDay.toISOString().split('T')[0];
    this.periodEnd = lastDay.toISOString().split('T')[0];
    this.selectedFinancialYear = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

    this.statementData = this.emptyStatement();
    this.summary = this.emptySummary();
    this.loadSettings();
  }

  ngOnInit(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }
    this.loadStatement();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load cash flow statement from API. */
  loadStatement(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.receiptPaymentService
      .getStatement(this.periodStart, this.periodEnd, this.selectedFinancialYear, this.viewType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.rawStatementData = response.statement;
          this.summary = response.summary;
          this.applyZeroAmountFilter();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Failed to load receipt & payment data from the API. Ensure the backend is running.';
        }
      });
  }

  private applyZeroAmountFilter(): void {
    if (!this.rawStatementData) {
      return;
    }
    const filterItems = (items: ReceiptPaymentItem[]) =>
      this.showZeroAmount ? [...items] : items.filter(i => Math.abs(i.amount) >= 0.01);

    this.statementData = {
      ...this.rawStatementData,
      receipts: {
        operating: filterItems(this.rawStatementData.receipts.operating),
        investing: filterItems(this.rawStatementData.receipts.investing),
        financing: filterItems(this.rawStatementData.receipts.financing),
        total: this.rawStatementData.receipts.total
      },
      payments: {
        operating: filterItems(this.rawStatementData.payments.operating),
        investing: filterItems(this.rawStatementData.payments.investing),
        financing: filterItems(this.rawStatementData.payments.financing),
        total: this.rawStatementData.payments.total
      }
    };
  }

  private emptyStatement(): ReceiptPaymentData {
    return {
      periodStart: new Date(),
      periodEnd: new Date(),
      financialYear: '',
      period: 'monthly',
      openingBalance: 0,
      receipts: { operating: [], investing: [], financing: [], total: 0 },
      payments: { operating: [], investing: [], financing: [], total: 0 },
      netCashFlow: 0,
      closingBalance: 0
    };
  }

  private emptySummary(): ReceiptPaymentSummary {
    return {
      totalReceipts: 0,
      totalPayments: 0,
      netCashFlow: 0,
      openingBalance: 0,
      closingBalance: 0,
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
      cashFlowTrend: 'neutral'
    };
  }

  getOperatingReceiptsTotal(): number {
    return this.statementData.receipts.operating.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getInvestingReceiptsTotal(): number {
    return this.statementData.receipts.investing.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getFinancingReceiptsTotal(): number {
    return this.statementData.receipts.financing.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getOperatingPaymentsTotal(): number {
    return this.statementData.payments.operating.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getInvestingPaymentsTotal(): number {
    return this.statementData.payments.investing.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getFinancingPaymentsTotal(): number {
    return this.statementData.payments.financing.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getItemTotal(item: ReceiptPaymentItem): number {
    return item.amount || 0;
  }

  hasChildren(_item: ReceiptPaymentItem): boolean {
    return false;
  }

  isExpanded(item: ReceiptPaymentItem): boolean {
    return this.expandedItems.has(item.id);
  }

  toggleItemExpansion(item: ReceiptPaymentItem): void {
    if (this.expandedItems.has(item.id)) {
      this.expandedItems.delete(item.id);
    } else {
      this.expandedItems.add(item.id);
    }
  }

  onViewTypeChange(): void {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    if (this.viewType === 'monthly') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (this.viewType === 'quarterly') {
      const quarter = Math.floor(today.getMonth() / 3);
      startDate = new Date(today.getFullYear(), quarter * 3, 1);
      endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
    } else {
      const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      startDate = new Date(fyStartYear, 3, 1);
      endDate = new Date(fyStartYear + 1, 2, 31);
    }

    this.periodStart = startDate.toISOString().split('T')[0];
    this.periodEnd = endDate.toISOString().split('T')[0];
    this.loadStatement();
  }

  refreshStatement(): void {
    this.loadStatement();
  }

  exportStatement(): void {
    const data = { statement: this.statementData, summary: this.summary };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-payment-${this.periodStart}-${this.periodEnd}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  printStatement(): void {
    window.print();
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('receipt_payment_settings');
    if (!stored) {
      return;
    }
    try {
      const settings = JSON.parse(stored);
      if (settings.viewType) {
        this.viewType = settings.viewType;
      }
      if (settings.showZeroAmount !== undefined) {
        this.showZeroAmount = settings.showZeroAmount;
      }
      if (settings.autoRefreshInterval !== undefined) {
        this.autoRefreshInterval = settings.autoRefreshInterval;
        this.setupAutoRefresh();
      }
    } catch {
      // ignore invalid stored settings
    }
  }

  saveSettings(): void {
    localStorage.setItem(
      'receipt_payment_settings',
      JSON.stringify({
        viewType: this.viewType,
        showZeroAmount: this.showZeroAmount,
        autoRefreshInterval: this.autoRefreshInterval
      })
    );
    this.setupAutoRefresh();
    this.applyZeroAmountFilter();
    this.showSettings = false;
    alert('Settings saved successfully!');
  }

  private setupAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    if (this.autoRefreshInterval > 0) {
      this.refreshInterval = setInterval(() => this.loadStatement(), this.autoRefreshInterval * 1000);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  goBack(): void {
    window.history.back();
  }
}



