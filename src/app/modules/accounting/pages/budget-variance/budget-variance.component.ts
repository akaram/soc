import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { BudgetVarianceService } from '../../services/budget-variance.service';
import {
  BudgetVarianceData,
  BudgetVarianceItem,
  BudgetVariancePeriod,
  VarianceSummary
} from '../../models/budget-variance.model';

/**
 * Budget vs Actual Variance Report Component
 * Compares budgeted amounts with actual amounts and shows variances
 */

@Component({
  selector: 'app-budget-variance',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="budget-variance-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">compare_arrows</i>
            Budget vs Actual Variance Report
          </h1>
          <p>Compare budgeted amounts with actual performance and analyze variances</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/budget-variance-reports</strong> API.</span>
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
        <span>Loading budget variance report…</span>
      </div>

      <!-- Period Selection -->
      <div class="period-selector">
        <div class="period-controls">
          <div class="control-group">
            <label>From Date</label>
            <input type="date" [(ngModel)]="periodStart" (change)="loadReport()" />
          </div>
          <div class="control-group">
            <label>To Date</label>
            <input type="date" [(ngModel)]="periodEnd" (change)="loadReport()" />
          </div>
          <div class="control-group">
            <label>Financial Year</label>
            <select [(ngModel)]="selectedFinancialYear" (change)="loadReport()">
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
          <button class="btn btn-primary" (click)="refreshReport()">
            <i class="material-icons">refresh</i>
            Refresh
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card income-budget">
          <div class="card-icon">
            <i class="material-icons">trending_up</i>
          </div>
          <div class="card-content">
            <div class="card-label">Income Budget</div>
            <div class="card-value">{{ formatCurrency(summary.totalIncomeBudget) }}</div>
            <div class="card-actual">Actual: {{ formatCurrency(summary.totalIncomeActual) }}</div>
            <div class="card-variance" [ngClass]="{'favorable': summary.totalIncomeVariance >= 0, 'unfavorable': summary.totalIncomeVariance < 0}">
              {{ summary.totalIncomeVariance >= 0 ? '+' : '' }}{{ formatCurrency(summary.totalIncomeVariance) }}
              ({{ getVariancePercentage(summary.totalIncomeBudget, summary.totalIncomeVariance) }}%)
            </div>
          </div>
        </div>
        <div class="summary-card expense-budget">
          <div class="card-icon">
            <i class="material-icons">trending_down</i>
          </div>
          <div class="card-content">
            <div class="card-label">Expense Budget</div>
            <div class="card-value">{{ formatCurrency(summary.totalExpenseBudget) }}</div>
            <div class="card-actual">Actual: {{ formatCurrency(summary.totalExpenseActual) }}</div>
            <div class="card-variance" [ngClass]="{'favorable': summary.totalExpenseVariance <= 0, 'unfavorable': summary.totalExpenseVariance > 0}">
              {{ summary.totalExpenseVariance >= 0 ? '+' : '' }}{{ formatCurrency(summary.totalExpenseVariance) }}
              ({{ getVariancePercentage(summary.totalExpenseBudget, summary.totalExpenseVariance) }}%)
            </div>
          </div>
        </div>
        <div class="summary-card net-income" [ngClass]="{'favorable': summary.netIncomeVariance >= 0, 'unfavorable': summary.netIncomeVariance < 0}">
          <div class="card-icon">
            <i class="material-icons">account_balance</i>
          </div>
          <div class="card-content">
            <div class="card-label">Net Income</div>
            <div class="card-value">Budget: {{ formatCurrency(summary.netIncomeBudget) }}</div>
            <div class="card-actual">Actual: {{ formatCurrency(summary.netIncomeActual) }}</div>
            <div class="card-variance">
              <strong>{{ summary.netIncomeVariance >= 0 ? '+' : '' }}{{ formatCurrency(summary.netIncomeVariance) }}</strong>
              ({{ getVariancePercentage(summary.netIncomeBudget, summary.netIncomeVariance) }}%)
            </div>
          </div>
        </div>
        <div class="summary-card variance-summary">
          <div class="card-content">
            <div class="card-label">Variance Summary</div>
            <div class="variance-stats">
              <div class="stat-item favorable">
                <i class="material-icons">check_circle</i>
                <span>Favorable: {{ summary.favorableVariances }}</span>
              </div>
              <div class="stat-item unfavorable">
                <i class="material-icons">error</i>
                <span>Unfavorable: {{ summary.unfavorableVariances }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Variance Report Table -->
      <div class="variance-report-container">
        <div class="report-header">
          <h2>Budget vs Actual Variance Report</h2>
          <div class="report-meta">
            <span>Period: <strong>{{ formatDate(varianceData.periodStart) }} to {{ formatDate(varianceData.periodEnd) }}</strong></span>
            <span>Financial Year: <strong>{{ varianceData.financialYear }}</strong></span>
          </div>
        </div>

        <!-- Income Section -->
        <div class="variance-section income-section">
          <div class="section-title">
            <h3>INCOME</h3>
          </div>
          <div class="table-wrapper">
            <table class="variance-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Budget</th>
                  <th>Actual</th>
                  <th>Variance</th>
                  <th>Variance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of displayIncomeItems" 
                    [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}">
                  <td class="item-name">
                    <span *ngIf="item.level > 0" [style.margin-left.px]="item.level * 16"></span>
                    {{ item.name }}
                  </td>
                  <td class="amount budget">{{ formatCurrency(item.budgetAmount) }}</td>
                  <td class="amount actual">{{ formatCurrency(item.actualAmount) }}</td>
                  <td class="amount variance" [ngClass]="{'favorable': item.isFavorable, 'unfavorable': !item.isFavorable}">
                    {{ item.variance >= 0 ? '+' : '' }}{{ formatCurrency(item.variance) }}
                  </td>
                  <td class="percentage" [ngClass]="{'favorable': item.isFavorable, 'unfavorable': !item.isFavorable}">
                    {{ item.variancePercentage >= 0 ? '+' : '' }}{{ item.variancePercentage.toFixed(1) }}%
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="{'favorable': item.isFavorable, 'unfavorable': !item.isFavorable}">
                      <i class="material-icons">{{ item.isFavorable ? 'check_circle' : 'error' }}</i>
                      {{ item.isFavorable ? 'Favorable' : 'Unfavorable' }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="section-total">
                  <td><strong>Total Income</strong></td>
                  <td class="amount budget"><strong>{{ formatCurrency(varianceData.income.totalBudget) }}</strong></td>
                  <td class="amount actual"><strong>{{ formatCurrency(varianceData.income.totalActual) }}</strong></td>
                  <td class="amount variance" [ngClass]="{'favorable': varianceData.income.totalVariance >= 0, 'unfavorable': varianceData.income.totalVariance < 0}">
                    <strong>{{ varianceData.income.totalVariance >= 0 ? '+' : '' }}{{ formatCurrency(varianceData.income.totalVariance) }}</strong>
                  </td>
                  <td class="percentage" [ngClass]="{'favorable': varianceData.income.totalVariance >= 0, 'unfavorable': varianceData.income.totalVariance < 0}">
                    <strong>{{ getVariancePercentage(varianceData.income.totalBudget, varianceData.income.totalVariance) }}%</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Expenses Section -->
        <div class="variance-section expense-section">
          <div class="section-title">
            <h3>EXPENSES</h3>
          </div>
          <div class="table-wrapper">
            <table class="variance-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Budget</th>
                  <th>Actual</th>
                  <th>Variance</th>
                  <th>Variance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of displayExpenseItems" 
                    [ngClass]="{'header': item.isHeader, 'level-1': item.level === 1, 'level-2': item.level === 2, 'level-3': item.level === 3}">
                  <td class="item-name">
                    <span *ngIf="item.level > 0" [style.margin-left.px]="item.level * 16"></span>
                    {{ item.name }}
                  </td>
                  <td class="amount budget">{{ formatCurrency(item.budgetAmount) }}</td>
                  <td class="amount actual">{{ formatCurrency(item.actualAmount) }}</td>
                  <td class="amount variance" [ngClass]="{'favorable': item.isFavorable, 'unfavorable': !item.isFavorable}">
                    {{ item.variance >= 0 ? '+' : '' }}{{ formatCurrency(item.variance) }}
                  </td>
                  <td class="percentage" [ngClass]="{'favorable': item.isFavorable, 'unfavorable': !item.isFavorable}">
                    {{ item.variancePercentage >= 0 ? '+' : '' }}{{ item.variancePercentage.toFixed(1) }}%
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="{'favorable': item.isFavorable, 'unfavorable': !item.isFavorable}">
                      <i class="material-icons">{{ item.isFavorable ? 'check_circle' : 'error' }}</i>
                      {{ item.isFavorable ? 'Favorable' : 'Unfavorable' }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="section-total">
                  <td><strong>Total Expenses</strong></td>
                  <td class="amount budget"><strong>{{ formatCurrency(varianceData.expenses.totalBudget) }}</strong></td>
                  <td class="amount actual"><strong>{{ formatCurrency(varianceData.expenses.totalActual) }}</strong></td>
                  <td class="amount variance" [ngClass]="{'favorable': varianceData.expenses.totalVariance <= 0, 'unfavorable': varianceData.expenses.totalVariance > 0}">
                    <strong>{{ varianceData.expenses.totalVariance >= 0 ? '+' : '' }}{{ formatCurrency(varianceData.expenses.totalVariance) }}</strong>
                  </td>
                  <td class="percentage" [ngClass]="{'favorable': varianceData.expenses.totalVariance <= 0, 'unfavorable': varianceData.expenses.totalVariance > 0}">
                    <strong>{{ getVariancePercentage(varianceData.expenses.totalBudget, varianceData.expenses.totalVariance) }}%</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Net Income Summary -->
        <div class="net-income-summary" [ngClass]="{'favorable': varianceData.netIncome.variance >= 0, 'unfavorable': varianceData.netIncome.variance < 0}">
          <div class="summary-row">
            <span><strong>Net Income (Budget)</strong></span>
            <span class="amount"><strong>{{ formatCurrency(varianceData.netIncome.budget) }}</strong></span>
          </div>
          <div class="summary-row">
            <span><strong>Net Income (Actual)</strong></span>
            <span class="amount"><strong>{{ formatCurrency(varianceData.netIncome.actual) }}</strong></span>
          </div>
          <div class="summary-row variance-row">
            <span><strong>Net Income Variance</strong></span>
            <span class="amount variance"><strong>{{ varianceData.netIncome.variance >= 0 ? '+' : '' }}{{ formatCurrency(varianceData.netIncome.variance) }}</strong></span>
            <span class="percentage"><strong>({{ getVariancePercentage(varianceData.netIncome.budget, varianceData.netIncome.variance) }}%)</strong></span>
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
              <label>Default View</label>
              <select [(ngModel)]="viewType">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div class="form-group">
              <label>Show Zero Variance Items</label>
              <input type="checkbox" [(ngModel)]="showZeroVariance" (change)="applyZeroVarianceFilter()" />
            </div>
            <div class="form-group">
              <label>Variance Threshold (%)</label>
              <input type="number" [(ngModel)]="varianceThreshold" min="0" max="100" step="1" />
              <small>Highlight variances above this percentage</small>
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
    .budget-variance-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
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
      border-color: #9b59b6;
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
    }

    .summary-card.income-budget .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.expense-budget .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.net-income.favorable .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.net-income.unfavorable .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.variance-summary {
      display: flex;
      align-items: center;
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
      margin-bottom: 12px;
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
      margin-bottom: 4px;
    }

    .card-actual {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 4px;
    }

    .card-variance {
      font-size: 14px;
      font-weight: 600;
      margin-top: 8px;
    }

    .card-variance.favorable {
      color: #2ed573;
    }

    .card-variance.unfavorable {
      color: #e74c3c;
    }

    .variance-stats {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
    }

    .stat-item.favorable {
      color: #2ed573;
    }

    .stat-item.unfavorable {
      color: #e74c3c;
    }

    /* Variance Report */
    .variance-report-container {
      padding: 0 24px 24px;
    }

    .report-header {
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

    .report-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .report-meta {
      display: flex;
      gap: 24px;
      align-items: center;
      flex-wrap: wrap;
    }

    .report-meta span {
      font-size: 14px;
      color: #7f8c8d;
    }

    .report-meta strong {
      color: #2c3e50;
    }

    .variance-section {
      background: white;
      margin-top: 0;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .variance-section.income-section {
      border-top: 4px solid #2ed573;
    }

    .variance-section.expense-section {
      border-top: 4px solid #e74c3c;
    }

    .section-title {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e9ecef;
    }

    .section-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .variance-table {
      width: 100%;
      border-collapse: collapse;
    }

    .variance-table thead {
      background: #f8f9fa;
    }

    .variance-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .variance-table td {
      padding: 12px 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .variance-table tbody tr:hover {
      background: #f8f9fa;
    }

    .variance-table tbody tr.header {
      font-weight: 600;
      background: #f8f9fa;
    }

    .item-name {
      font-weight: 500;
    }

    .amount {
      text-align: right;
      font-weight: 500;
    }

    .amount.budget {
      color: #3498db;
    }

    .amount.actual {
      color: #2c3e50;
    }

    .amount.variance.favorable {
      color: #2ed573;
      font-weight: 600;
    }

    .amount.variance.unfavorable {
      color: #e74c3c;
      font-weight: 600;
    }

    .percentage {
      text-align: right;
      font-weight: 500;
    }

    .percentage.favorable {
      color: #2ed573;
    }

    .percentage.unfavorable {
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

    .status-badge.favorable {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-badge.unfavorable {
      background: #ffeaea;
      color: #e74c3c;
    }

    .status-badge .material-icons {
      font-size: 14px;
    }

    .variance-table tfoot {
      border-top: 3px solid #2c3e50;
    }

    .variance-table tfoot .section-total {
      background: #f8f9fa;
      font-weight: 700;
    }

    .net-income-summary {
      background: white;
      padding: 24px;
      margin-top: 0;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-top: 4px solid;
    }

    .net-income-summary.favorable {
      border-top-color: #2ed573;
      background: linear-gradient(to right, #e8f8f0, white);
    }

    .net-income-summary.unfavorable {
      border-top-color: #e74c3c;
      background: linear-gradient(to right, #ffeaea, white);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 16px;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-row.variance-row {
      border-top: 2px solid #e9ecef;
      margin-top: 8px;
      padding-top: 16px;
      font-size: 18px;
      font-weight: 700;
    }

    .summary-row .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .summary-row .amount.variance.favorable {
      color: #2ed573;
    }

    .summary-row .amount.variance.unfavorable {
      color: #e74c3c;
    }

    .summary-row .percentage {
      margin-left: 12px;
      font-weight: 600;
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
      border-color: #9b59b6;
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
      background: #9b59b6;
      color: white;
    }

    .btn-primary:hover {
      background: #8e44ad;
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
        grid-template-columns: 1fr;
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

      .variance-table {
        min-width: 800px;
      }
    }
  `]
})
export class BudgetVarianceComponent implements OnInit, OnDestroy {
  varianceData: BudgetVarianceData;
  summary: VarianceSummary;
  displayIncomeItems: BudgetVarianceItem[] = [];
  displayExpenseItems: BudgetVarianceItem[] = [];
  periodStart: string = '';
  periodEnd: string = '';
  selectedFinancialYear: string = '';
  viewType: BudgetVariancePeriod = 'monthly';
  showZeroVariance: boolean = false;
  varianceThreshold: number = 10;
  showSettings: boolean = false;
  autoRefreshInterval: number = 0;
  financialYears: string[] = [];
  loadError = '';
  loading = false;

  private rawVarianceData!: BudgetVarianceData;
  private refreshInterval?: ReturnType<typeof setInterval>;
  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private budgetVarianceService = inject(BudgetVarianceService);

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

    this.varianceData = this.createEmptyData();
    this.summary = this.emptySummary();
    this.loadSettings();
  }

  ngOnInit(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }
    this.loadReport();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Create empty variance data structure
   */
  createEmptyData(): BudgetVarianceData {
    const startDate = this.periodStart ? new Date(this.periodStart) : new Date();
    const endDate = this.periodEnd ? new Date(this.periodEnd) : new Date();

    return {
      periodStart: startDate,
      periodEnd: endDate,
      financialYear: this.selectedFinancialYear,
      period: this.viewType,
      income: { items: [], totalBudget: 0, totalActual: 0, totalVariance: 0 },
      expenses: { items: [], totalBudget: 0, totalActual: 0, totalVariance: 0 },
      netIncome: { budget: 0, actual: 0, variance: 0 }
    };
  }

  private emptySummary(): VarianceSummary {
    return {
      totalIncomeBudget: 0,
      totalIncomeActual: 0,
      totalIncomeVariance: 0,
      totalExpenseBudget: 0,
      totalExpenseActual: 0,
      totalExpenseVariance: 0,
      netIncomeBudget: 0,
      netIncomeActual: 0,
      netIncomeVariance: 0,
      favorableVariances: 0,
      unfavorableVariances: 0,
      variancePercentage: 0
    };
  }

  /** Load variance report from API. */
  loadReport(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.budgetVarianceService
      .getReport(this.periodStart, this.periodEnd, this.selectedFinancialYear, this.viewType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.rawVarianceData = response.report;
          this.summary = response.summary;
          this.applyZeroVarianceFilter();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Failed to load budget variance report from the API. Ensure the backend is running.';
        }
      });
  }

  /** Optionally hide line items with zero variance. */
  applyZeroVarianceFilter(): void {
    if (!this.rawVarianceData) {
      return;
    }
    const filterItems = (items: BudgetVarianceItem[]) =>
      this.showZeroVariance ? items : items.filter(i => i.variance !== 0);

    this.varianceData = {
      ...this.rawVarianceData,
      income: {
        ...this.rawVarianceData.income,
        items: filterItems(this.rawVarianceData.income.items)
      },
      expenses: {
        ...this.rawVarianceData.expenses,
        items: filterItems(this.rawVarianceData.expenses.items)
      }
    };
    this.displayIncomeItems = this.varianceData.income.items;
    this.displayExpenseItems = this.varianceData.expenses.items;
  }

  /**
   * Get variance percentage
   */
  getVariancePercentage(budget: number, variance: number): string {
    if (budget === 0) return '0.0';
    return ((variance / budget) * 100).toFixed(1);
  }

  /**
   * Handle view type change
   */
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
    this.loadReport();
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
    const data = { report: this.rawVarianceData ?? this.varianceData, summary: this.summary };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-variance-${this.periodStart}-${this.periodEnd}.json`;
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
    localStorage.setItem('budget_variance_settings', JSON.stringify({
      viewType: this.viewType,
      showZeroVariance: this.showZeroVariance,
      varianceThreshold: this.varianceThreshold,
      autoRefreshInterval: this.autoRefreshInterval
    }));
    this.setupAutoRefresh();
    this.showSettings = false;
    this.applyZeroVarianceFilter();
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('budget_variance_settings');
    if (!stored) {
      return;
    }
    try {
      const settings = JSON.parse(stored);
      if (settings.viewType) {
        this.viewType = settings.viewType;
      }
      if (settings.showZeroVariance !== undefined) {
        this.showZeroVariance = settings.showZeroVariance;
      }
      if (settings.varianceThreshold !== undefined) {
        this.varianceThreshold = settings.varianceThreshold;
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





