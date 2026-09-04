import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { BalanceSheetService } from '../../services/balance-sheet.service';
import {
  BalanceSheetData,
  BalanceSheetItem,
  BalanceSheetPeriod,
  BalanceSheetSummary
} from '../../models/balance-sheet.model';

/**
 * Balance Sheet Component
 * Displays real-time balance sheet with assets, liabilities, and equity
 */

@Component({
  selector: 'app-balance-sheet',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="balance-sheet-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">account_balance</i>
            Real-time Balance Sheet
          </h1>
          <p>View and analyze your financial position in real-time</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/balance-sheets</strong> API (invoices, bills, payments, vendors).</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showSettings = true" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="exportBalanceSheet()" title="Export">
            <i class="material-icons">download</i>
            Export
          </button>
          <button class="icon-btn" (click)="printBalanceSheet()" title="Print">
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
        <span>Loading balance sheet…</span>
      </div>

      <!-- Period Selection -->
      <div class="period-selector">
        <div class="period-controls">
          <div class="control-group">
            <label>As of Date</label>
            <input type="date" [(ngModel)]="selectedDate" (change)="loadBalanceSheet()" />
          </div>
          <div class="control-group">
            <label>Financial Year</label>
            <select [(ngModel)]="selectedFinancialYear" (change)="loadBalanceSheet()">
              <option *ngFor="let year of financialYears" [value]="year">{{ year }}</option>
            </select>
          </div>
          <div class="control-group">
            <label>View Type</label>
            <select [(ngModel)]="viewType" (change)="loadBalanceSheet()">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button class="btn btn-primary" (click)="refreshBalanceSheet()">
            <i class="material-icons">refresh</i>
            Refresh
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card assets">
          <div class="card-icon">
            <i class="material-icons">trending_up</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Assets</div>
            <div class="card-value">{{ formatCurrency(summary.totalAssets) }}</div>
          </div>
        </div>
        <div class="summary-card liabilities">
          <div class="card-icon">
            <i class="material-icons">trending_down</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Liabilities</div>
            <div class="card-value">{{ formatCurrency(summary.totalLiabilities) }}</div>
          </div>
        </div>
        <div class="summary-card equity">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Equity</div>
            <div class="card-value">{{ formatCurrency(summary.totalEquity) }}</div>
          </div>
        </div>
        <div class="summary-card networth">
          <div class="card-icon">
            <i class="material-icons">attach_money</i>
          </div>
          <div class="card-content">
            <div class="card-label">Net Worth</div>
            <div class="card-value">{{ formatCurrency(summary.netWorth) }}</div>
          </div>
        </div>
        <div class="summary-card ratio">
          <div class="card-content">
            <div class="card-label">Current Ratio</div>
            <div class="card-value">{{ summary.currentRatio.toFixed(2) }}</div>
            <div class="card-hint" [ngClass]="{'good': summary.currentRatio >= 1, 'warning': summary.currentRatio < 1}">
              {{ summary.currentRatio >= 1 ? 'Healthy' : 'Low' }}
            </div>
          </div>
        </div>
        <div class="summary-card ratio">
          <div class="card-content">
            <div class="card-label">Debt to Equity</div>
            <div class="card-value">{{ summary.debtToEquityRatio.toFixed(2) }}</div>
            <div class="card-hint" [ngClass]="{'good': summary.debtToEquityRatio <= 2, 'warning': summary.debtToEquityRatio > 2}">
              {{ summary.debtToEquityRatio <= 2 ? 'Good' : 'High' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Balance Sheet Table -->
      <div class="balance-sheet-table-container">
        <div class="balance-sheet-header">
          <h2>Balance Sheet</h2>
          <div class="balance-sheet-meta">
            <span>As of: <strong>{{ formatDate(balanceSheetData.asOfDate) }}</strong></span>
            <span>Financial Year: <strong>{{ balanceSheetData.financialYear }}</strong></span>
            <span class="balance-status" [ngClass]="{'balanced': summary.isBalanced, 'unbalanced': !summary.isBalanced}">
              <i class="material-icons">{{ summary.isBalanced ? 'check_circle' : 'error' }}</i>
              {{ summary.isBalanced ? 'Balanced' : 'Unbalanced' }}
            </span>
          </div>
        </div>

        <div class="balance-sheet-grid">
          <!-- Assets Column -->
          <div class="balance-column assets-column">
            <div class="column-header">
              <h3>ASSETS</h3>
            </div>

            <!-- Current Assets -->
            <div class="section-header">
              <strong>Current Assets</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of balanceSheetData.assets.current" 
                   class="balance-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="section-total">
              <strong>Total Current Assets</strong>
              <strong>{{ formatCurrency(getCurrentAssetsTotal()) }}</strong>
            </div>

            <!-- Non-Current Assets -->
            <div class="section-header">
              <strong>Non-Current Assets</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of balanceSheetData.assets.nonCurrent" 
                   class="balance-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="section-total">
              <strong>Total Non-Current Assets</strong>
              <strong>{{ formatCurrency(getNonCurrentAssetsTotal()) }}</strong>
            </div>

            <!-- Total Assets -->
            <div class="grand-total">
              <strong>TOTAL ASSETS</strong>
              <strong>{{ formatCurrency(summary.totalAssets) }}</strong>
            </div>
          </div>

          <!-- Liabilities & Equity Column -->
          <div class="balance-column liabilities-column">
            <div class="column-header">
              <h3>LIABILITIES & EQUITY</h3>
            </div>

            <!-- Current Liabilities -->
            <div class="section-header">
              <strong>Current Liabilities</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of balanceSheetData.liabilities.current" 
                   class="balance-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="section-total">
              <strong>Total Current Liabilities</strong>
              <strong>{{ formatCurrency(getCurrentLiabilitiesTotal()) }}</strong>
            </div>

            <!-- Non-Current Liabilities -->
            <div class="section-header">
              <strong>Non-Current Liabilities</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of balanceSheetData.liabilities.nonCurrent" 
                   class="balance-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="section-total">
              <strong>Total Non-Current Liabilities</strong>
              <strong>{{ formatCurrency(getNonCurrentLiabilitiesTotal()) }}</strong>
            </div>

            <!-- Equity -->
            <div class="section-header">
              <strong>Equity</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of balanceSheetData.equity" 
                   class="balance-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="section-total">
              <strong>Total Equity</strong>
              <strong>{{ formatCurrency(summary.totalEquity) }}</strong>
            </div>

            <!-- Total Liabilities & Equity -->
            <div class="grand-total">
              <strong>TOTAL LIABILITIES & EQUITY</strong>
              <strong>{{ formatCurrency(summary.totalLiabilitiesAndEquity) }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="showSettings = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Balance Sheet Settings</h2>
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
              <label>Show Zero Balance Items</label>
              <input type="checkbox" [(ngModel)]="showZeroBalance" (change)="loadBalanceSheet()" />
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
    .balance-sheet-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
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
      background: #e8f4fd;
      color: #2980b9;
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
      border-color: #2c3e50;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

    .summary-card.assets .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.liabilities .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.equity .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .summary-card.networth .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
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
      font-weight: 600;
    }

    .card-hint.good {
      color: #2ed573;
    }

    .card-hint.warning {
      color: #e74c3c;
    }

    /* Balance Sheet Table */
    .balance-sheet-table-container {
      padding: 0 24px 24px;
    }

    .balance-sheet-header {
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

    .balance-sheet-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .balance-sheet-meta {
      display: flex;
      gap: 24px;
      align-items: center;
      flex-wrap: wrap;
    }

    .balance-sheet-meta span {
      font-size: 14px;
      color: #7f8c8d;
    }

    .balance-sheet-meta strong {
      color: #2c3e50;
    }

    .balance-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .balance-status.balanced {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .balance-status.unbalanced {
      background: #ffeaea;
      color: #e74c3c;
    }

    .balance-sheet-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      background: white;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .balance-column {
      padding: 20px;
      border-right: 1px solid #e9ecef;
    }

    .balance-column:last-child {
      border-right: none;
    }

    .column-header {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e9ecef;
    }

    .column-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
    }

    .section-header {
      margin-top: 16px;
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .section-header strong {
      font-size: 14px;
      color: #2c3e50;
    }

    .items-list {
      margin-bottom: 12px;
    }

    .balance-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      cursor: pointer;
      transition: background 0.2s;
      border-radius: 4px;
    }

    .balance-item:hover {
      background: #f8f9fa;
    }

    .balance-item.header {
      font-weight: 600;
      color: #2c3e50;
      padding: 12px 0;
      border-top: 1px solid #f0f0f0;
      margin-top: 8px;
    }

    .balance-item.level-1 {
      padding-left: 16px;
    }

    .balance-item.level-2 {
      padding-left: 32px;
    }

    .balance-item.level-3 {
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
      color: #2c3e50;
      text-align: right;
      min-width: 120px;
    }

    .section-total {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      margin-top: 8px;
      border-top: 2px solid #e9ecef;
      font-weight: 600;
      font-size: 14px;
      color: #2c3e50;
    }

    .grand-total {
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
      border-color: #2c3e50;
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
      background: #2c3e50;
      color: white;
    }

    .btn-primary:hover {
      background: #34495e;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    @media (max-width: 1024px) {
      .balance-sheet-grid {
        grid-template-columns: 1fr;
      }

      .balance-column {
        border-right: none;
        border-bottom: 1px solid #e9ecef;
      }

      .balance-column:last-child {
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
export class BalanceSheetComponent implements OnInit, OnDestroy {
  balanceSheetData!: BalanceSheetData;
  summary!: BalanceSheetSummary;
  selectedDate: string = '';
  selectedFinancialYear: string = '';
  viewType: BalanceSheetPeriod = 'yearly';
  showZeroBalance: boolean = false;
  showSettings: boolean = false;
  autoRefreshInterval: number = 0;
  expandedItems: Set<string> = new Set();
  financialYears: string[] = [];
  loadError = '';
  loading = false;

  private rawBalanceSheetData!: BalanceSheetData;
  private refreshInterval?: ReturnType<typeof setInterval>;
  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private balanceSheetService = inject(BalanceSheetService);

  constructor() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    for (let i = 5; i >= 0; i--) {
      const year = fyStartYear - i;
      this.financialYears.push(`${year}-${String(year + 1).slice(-2)}`);
    }

    this.selectedDate = new Date().toISOString().split('T')[0];
    this.selectedFinancialYear = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
    this.balanceSheetData = this.emptyBalanceSheet();
    this.summary = this.emptySummary();
    this.loadSettings();
  }

  ngOnInit(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }
    this.loadBalanceSheet();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load balance sheet from API for selected date and period. */
  loadBalanceSheet(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.balanceSheetService
      .getBalanceSheet(this.selectedDate, this.selectedFinancialYear, this.viewType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.rawBalanceSheetData = response.balanceSheet;
          this.summary = response.summary;
          this.applyZeroBalanceFilter();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Failed to load balance sheet from the API. Ensure the backend is running.';
        }
      });
  }

  /** Hide line items with zero balance when setting is off. */
  private applyZeroBalanceFilter(): void {
    if (!this.rawBalanceSheetData) {
      return;
    }
    const filterItems = (items: BalanceSheetItem[]) =>
      this.showZeroBalance ? [...items] : items.filter(i => Math.abs(i.amount) >= 0.01);

    this.balanceSheetData = {
      ...this.rawBalanceSheetData,
      assets: {
        current: filterItems(this.rawBalanceSheetData.assets.current),
        nonCurrent: filterItems(this.rawBalanceSheetData.assets.nonCurrent),
        total: this.rawBalanceSheetData.assets.total
      },
      liabilities: {
        current: filterItems(this.rawBalanceSheetData.liabilities.current),
        nonCurrent: filterItems(this.rawBalanceSheetData.liabilities.nonCurrent),
        total: this.rawBalanceSheetData.liabilities.total
      },
      equity: filterItems(this.rawBalanceSheetData.equity)
    };
  }

  private emptyBalanceSheet(): BalanceSheetData {
    return {
      asOfDate: new Date(),
      financialYear: '',
      period: 'yearly',
      assets: { current: [], nonCurrent: [], total: 0 },
      liabilities: { current: [], nonCurrent: [], total: 0 },
      equity: [],
      totalEquity: 0,
      totalLiabilitiesAndEquity: 0
    };
  }

  private emptySummary(): BalanceSheetSummary {
    return {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalLiabilitiesAndEquity: 0,
      netWorth: 0,
      currentRatio: 0,
      debtToEquityRatio: 0,
      isBalanced: true
    };
  }

  getCurrentAssetsTotal(): number {
    return this.balanceSheetData.assets.current.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getNonCurrentAssetsTotal(): number {
    return this.balanceSheetData.assets.nonCurrent.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getCurrentLiabilitiesTotal(): number {
    return this.balanceSheetData.liabilities.current.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getNonCurrentLiabilitiesTotal(): number {
    return this.balanceSheetData.liabilities.nonCurrent.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getEquityTotal(): number {
    return this.balanceSheetData.equity.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getItemTotal(item: BalanceSheetItem): number {
    return item.amount || 0;
  }

  hasChildren(_item: BalanceSheetItem): boolean {
    return false;
  }

  isExpanded(item: BalanceSheetItem): boolean {
    return this.expandedItems.has(item.id);
  }

  toggleItemExpansion(item: BalanceSheetItem): void {
    if (this.expandedItems.has(item.id)) {
      this.expandedItems.delete(item.id);
    } else {
      this.expandedItems.add(item.id);
    }
  }

  refreshBalanceSheet(): void {
    this.loadBalanceSheet();
  }

  exportBalanceSheet(): void {
    const data = { balanceSheet: this.balanceSheetData, summary: this.summary };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${this.selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  printBalanceSheet(): void {
    window.print();
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('balance_sheet_settings');
    if (!stored) {
      return;
    }
    try {
      const settings = JSON.parse(stored);
      if (settings.viewType) {
        this.viewType = settings.viewType;
      }
      if (settings.showZeroBalance !== undefined) {
        this.showZeroBalance = settings.showZeroBalance;
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
      'balance_sheet_settings',
      JSON.stringify({
        viewType: this.viewType,
        showZeroBalance: this.showZeroBalance,
        autoRefreshInterval: this.autoRefreshInterval
      })
    );
    this.setupAutoRefresh();
    this.applyZeroBalanceFilter();
    this.showSettings = false;
    alert('Settings saved successfully!');
  }

  private setupAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    if (this.autoRefreshInterval > 0) {
      this.refreshInterval = setInterval(() => this.loadBalanceSheet(), this.autoRefreshInterval * 1000);
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
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  goBack(): void {
    window.history.back();
  }
}

