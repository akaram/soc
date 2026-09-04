import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { IncomeExpenditureService } from '../../services/income-expenditure.service';
import {
  IncomeExpenditureData,
  IncomeExpenditureItem,
  IncomeExpenditurePeriod,
  IncomeExpenditureSummary
} from '../../models/income-expenditure.model';

/**
 * Income & Expenditure Statement Component
 * Displays income, expenses, and net profit/loss for a given period
 */

@Component({
  selector: 'app-income-expenditure',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="income-expenditure-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">trending_up</i>
            Income & Expenditure Statement
          </h1>
          <p>View your income, expenses, and profitability in real-time</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/income-expenditure-statements</strong> API.</span>
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
        <span>Loading statement…</span>
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
        <div class="summary-card income">
          <div class="card-icon">
            <i class="material-icons">arrow_upward</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Income</div>
            <div class="card-value income-value">{{ formatCurrency(summary.totalIncome) }}</div>
            <div class="card-change" *ngIf="summary.growthRate !== 0">
              <i class="material-icons" [ngClass]="{'positive': summary.growthRate > 0, 'negative': summary.growthRate < 0}">
                {{ summary.growthRate > 0 ? 'trending_up' : 'trending_down' }}
              </i>
              <span [ngClass]="{'positive': summary.growthRate > 0, 'negative': summary.growthRate < 0}">
                {{ summary.growthRate > 0 ? '+' : '' }}{{ summary.growthRate.toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>
        <div class="summary-card expenses">
          <div class="card-icon">
            <i class="material-icons">arrow_downward</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Expenses</div>
            <div class="card-value expense-value">{{ formatCurrency(summary.totalExpenses) }}</div>
            <div class="card-hint">Expense Ratio: {{ summary.expenseRatio.toFixed(1) }}%</div>
          </div>
        </div>
        <div class="summary-card gross-profit">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <div class="card-label">Gross Profit</div>
            <div class="card-value">{{ formatCurrency(summary.grossProfit) }}</div>
            <div class="card-hint">Gross Margin: {{ (summary.grossProfit / summary.totalIncome * 100).toFixed(1) }}%</div>
          </div>
        </div>
        <div class="summary-card operating-profit">
          <div class="card-icon">
            <i class="material-icons">business</i>
          </div>
          <div class="card-content">
            <div class="card-label">Operating Profit</div>
            <div class="card-value">{{ formatCurrency(summary.operatingProfit) }}</div>
          </div>
        </div>
        <div class="summary-card net-income" [ngClass]="{'profit': summary.netIncome >= 0, 'loss': summary.netIncome < 0}">
          <div class="card-icon">
            <i class="material-icons">{{ summary.netIncome >= 0 ? 'check_circle' : 'error' }}</i>
          </div>
          <div class="card-content">
            <div class="card-label">{{ summary.netIncome >= 0 ? 'Net Profit' : 'Net Loss' }}</div>
            <div class="card-value">{{ formatCurrency(Math.abs(summary.netIncome)) }}</div>
            <div class="card-hint">Profit Margin: {{ summary.profitMargin.toFixed(1) }}%</div>
          </div>
        </div>
      </div>

      <!-- Income & Expenditure Statement -->
      <div class="statement-container">
        <div class="statement-header">
          <h2>Income & Expenditure Statement</h2>
          <div class="statement-meta">
            <span>Period: <strong>{{ formatDate(statementData.periodStart) }} to {{ formatDate(statementData.periodEnd) }}</strong></span>
            <span>Financial Year: <strong>{{ statementData.financialYear }}</strong></span>
          </div>
        </div>

        <div class="statement-content">
          <!-- Income Section -->
          <div class="statement-section income-section">
            <div class="section-title">
              <h3>INCOME</h3>
            </div>

            <!-- Operating Income -->
            <div class="subsection-header">
              <strong>Operating Income</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.income.operating" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount income-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Operating Income</strong>
              <strong>{{ formatCurrency(getOperatingIncomeTotal()) }}</strong>
            </div>

            <!-- Non-Operating Income -->
            <div class="subsection-header">
              <strong>Non-Operating Income</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.income.nonOperating" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount income-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Non-Operating Income</strong>
              <strong>{{ formatCurrency(getNonOperatingIncomeTotal()) }}</strong>
            </div>

            <!-- Total Income -->
            <div class="section-total">
              <strong>TOTAL INCOME</strong>
              <strong>{{ formatCurrency(summary.totalIncome) }}</strong>
            </div>
          </div>

          <!-- Expenses Section -->
          <div class="statement-section expenses-section">
            <div class="section-title">
              <h3>EXPENSES</h3>
            </div>

            <!-- Operating Expenses -->
            <div class="subsection-header">
              <strong>Operating Expenses</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.expenses.operating" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount expense-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Operating Expenses</strong>
              <strong>{{ formatCurrency(getOperatingExpensesTotal()) }}</strong>
            </div>

            <!-- Non-Operating Expenses -->
            <div class="subsection-header">
              <strong>Non-Operating Expenses</strong>
            </div>
            <div class="items-list">
              <div *ngFor="let item of statementData.expenses.nonOperating" 
                   class="statement-item" 
                   [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}"
                   (click)="toggleItemExpansion(item)">
                <div class="item-name">
                  <i class="material-icons expand-icon" *ngIf="!item.isHeader && hasChildren(item)">{{ isExpanded(item) ? 'expand_more' : 'chevron_right' }}</i>
                  <span>{{ item.name }}</span>
                </div>
                <div class="item-amount expense-amount">{{ item.isHeader ? formatCurrency(getItemTotal(item)) : formatCurrency(item.amount) }}</div>
              </div>
            </div>
            <div class="subsection-total">
              <strong>Total Non-Operating Expenses</strong>
              <strong>{{ formatCurrency(getNonOperatingExpensesTotal()) }}</strong>
            </div>

            <!-- Total Expenses -->
            <div class="section-total">
              <strong>TOTAL EXPENSES</strong>
              <strong>{{ formatCurrency(summary.totalExpenses) }}</strong>
            </div>
          </div>
        </div>

        <!-- Net Income Section -->
        <div class="net-income-section" [ngClass]="{'profit': summary.netIncome >= 0, 'loss': summary.netIncome < 0}">
          <div class="net-income-label">
            <strong>{{ summary.netIncome >= 0 ? 'NET PROFIT' : 'NET LOSS' }}</strong>
          </div>
          <div class="net-income-amount">
            <strong>{{ formatCurrency(Math.abs(summary.netIncome)) }}</strong>
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
              <label>Show Budget Comparison</label>
              <input type="checkbox" [(ngModel)]="showBudgetComparison" (change)="loadStatement()" />
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
    .income-expenditure-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
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
      border-color: #27ae60;
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

    .summary-card.income .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.expenses .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.gross-profit .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .summary-card.operating-profit .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .summary-card.net-income.profit .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.net-income.loss .card-icon {
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

    .card-value.income-value {
      color: #2ed573;
    }

    .card-value.expense-value {
      color: #e74c3c;
    }

    .card-hint {
      font-size: 11px;
      margin-top: 4px;
      color: #7f8c8d;
    }

    .card-change {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .card-change .material-icons {
      font-size: 16px;
    }

    .card-change.positive {
      color: #2ed573;
    }

    .card-change.negative {
      color: #e74c3c;
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

    .statement-content {
      background: white;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .statement-section {
      padding: 20px;
      border-right: 1px solid #e9ecef;
    }

    .statement-section:last-child {
      border-right: none;
    }

    .section-title {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e9ecef;
    }

    .section-title h3 {
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

    .item-amount.income-amount {
      color: #2ed573;
    }

    .item-amount.expense-amount {
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

    .net-income-section {
      background: white;
      padding: 24px;
      margin-top: 0;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 4px solid;
    }

    .net-income-section.profit {
      border-top-color: #2ed573;
      background: linear-gradient(to right, #e8f8f0, white);
    }

    .net-income-section.loss {
      border-top-color: #e74c3c;
      background: linear-gradient(to right, #ffeaea, white);
    }

    .net-income-label {
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
    }

    .net-income-amount {
      font-size: 24px;
      font-weight: 700;
    }

    .net-income-section.profit .net-income-amount {
      color: #2ed573;
    }

    .net-income-section.loss .net-income-amount {
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
      border-color: #27ae60;
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
      background: #27ae60;
      color: white;
    }

    .btn-primary:hover {
      background: #229954;
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

      .statement-section {
        border-right: none;
        border-bottom: 1px solid #e9ecef;
      }

      .statement-section:last-child {
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
export class IncomeExpenditureComponent implements OnInit, OnDestroy {
  Math = Math;

  statementData!: IncomeExpenditureData;
  summary!: IncomeExpenditureSummary;
  periodStart: string = '';
  periodEnd: string = '';
  selectedFinancialYear: string = '';
  viewType: IncomeExpenditurePeriod = 'monthly';
  showZeroAmount: boolean = false;
  showBudgetComparison: boolean = false;
  showSettings: boolean = false;
  autoRefreshInterval: number = 0;
  expandedItems: Set<string> = new Set();
  financialYears: string[] = [];
  loadError = '';
  loading = false;

  private rawStatementData!: IncomeExpenditureData;
  private refreshInterval?: ReturnType<typeof setInterval>;
  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private incomeExpenditureService = inject(IncomeExpenditureService);

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

  /** Load statement from API for the selected period. */
  loadStatement(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.incomeExpenditureService
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
          this.loadError = 'Failed to load income & expenditure data from the API. Ensure the backend is running.';
        }
      });
  }

  private applyZeroAmountFilter(): void {
    if (!this.rawStatementData) {
      return;
    }
    const filterItems = (items: IncomeExpenditureItem[]) =>
      this.showZeroAmount ? [...items] : items.filter(i => Math.abs(i.amount) >= 0.01);

    this.statementData = {
      ...this.rawStatementData,
      income: {
        operating: filterItems(this.rawStatementData.income.operating),
        nonOperating: filterItems(this.rawStatementData.income.nonOperating),
        total: this.rawStatementData.income.total
      },
      expenses: {
        operating: filterItems(this.rawStatementData.expenses.operating),
        nonOperating: filterItems(this.rawStatementData.expenses.nonOperating),
        total: this.rawStatementData.expenses.total
      }
    };
  }

  private emptyStatement(): IncomeExpenditureData {
    return {
      periodStart: new Date(),
      periodEnd: new Date(),
      financialYear: '',
      period: 'monthly',
      income: { operating: [], nonOperating: [], total: 0 },
      expenses: { operating: [], nonOperating: [], total: 0 },
      netIncome: 0,
      grossProfit: 0,
      operatingProfit: 0
    };
  }

  private emptySummary(): IncomeExpenditureSummary {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      grossProfit: 0,
      operatingProfit: 0,
      netIncome: 0,
      profitMargin: 0,
      expenseRatio: 0,
      growthRate: 0
    };
  }

  getOperatingIncomeTotal(): number {
    return this.statementData.income.operating.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getNonOperatingIncomeTotal(): number {
    return this.statementData.income.nonOperating.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getOperatingExpensesTotal(): number {
    return this.statementData.expenses.operating.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getNonOperatingExpensesTotal(): number {
    return this.statementData.expenses.nonOperating.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  getItemTotal(item: IncomeExpenditureItem): number {
    return item.amount || 0;
  }

  hasChildren(_item: IncomeExpenditureItem): boolean {
    return false;
  }

  isExpanded(item: IncomeExpenditureItem): boolean {
    return this.expandedItems.has(item.id);
  }

  toggleItemExpansion(item: IncomeExpenditureItem): void {
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
    a.download = `income-expenditure-${this.periodStart}-${this.periodEnd}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  printStatement(): void {
    window.print();
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('income_expenditure_settings');
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
      if (settings.showBudgetComparison !== undefined) {
        this.showBudgetComparison = settings.showBudgetComparison;
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
      'income_expenditure_settings',
      JSON.stringify({
        viewType: this.viewType,
        showZeroAmount: this.showZeroAmount,
        showBudgetComparison: this.showBudgetComparison,
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

