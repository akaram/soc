import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

/**
 * Budget Management Component
 * Manages budget planning and tracking for the society
 */

interface Budget {
  id: string;
  name: string;
  financialYear: string; // e.g., "2024-25"
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'approved' | 'active' | 'closed';
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercentage: number;
  createdBy: string;
  createdDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  description?: string;
  categories: BudgetCategory[];
}

interface BudgetCategory {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  items: BudgetItem[];
}

interface BudgetItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  period: 'monthly' | 'quarterly' | 'annual';
  monthlyBreakdown?: MonthlyBudget[];
}

interface MonthlyBudget {
  month: string; // e.g., "2024-04"
  budgeted: number;
  actual: number;
  variance: number;
}

interface BudgetTransaction {
  id: string;
  budgetId: string;
  budgetItemId: string;
  categoryId: string;
  date: Date;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  reference?: string;
  createdBy: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  budgetAllocation: number;
  actualSpent: number;
  variance: number;
  headOfDepartment?: string;
}

interface BudgetRevision {
  id: string;
  budgetId: string;
  budgetName: string;
  revisionType: 'amendment' | 'supplementary' | 'reallocation';
  reason: string;
  requestedBy: string;
  requestedDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  changes: RevisionChange[];
  totalChange: number;
}

interface RevisionChange {
  categoryId: string;
  categoryName: string;
  oldAmount: number;
  newAmount: number;
  change: number;
}

interface ApprovalWorkflow {
  id: string;
  budgetId: string;
  budgetName: string;
  currentStage: string;
  stages: ApprovalStage[];
  status: 'pending' | 'in-progress' | 'approved' | 'rejected';
  submittedBy: string;
  submittedDate: Date;
  completedDate?: Date;
}

interface ApprovalStage {
  stage: string;
  approver: string;
  approverRole: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  actionDate?: Date;
  order: number;
}

@Component({
  selector: 'app-budget-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="budget-management-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">pie_chart</i>
            Budget Management
          </h1>
          <p>Plan budgets and track actual vs budgeted amounts</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="exportReport()" title="Export Report">
            <i class="material-icons">download</i>
            Export
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tab-buttons">
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'planning'}" (click)="activeTab = 'planning'">
            <i class="material-icons">account_balance_wallet</i>
            Budget Planning
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'tracking'}" (click)="activeTab = 'tracking'">
            <i class="material-icons">track_changes</i>
            Budget Tracking
          </button>
        </div>
      </div>

      <!-- Budget Planning Tab -->
      <div class="tab-content" *ngIf="activeTab === 'planning'">
        <!-- Feature Cards Grid -->
        <div class="feature-cards-grid">
          <!-- Annual Budget Creation by Category Card -->
          <div class="feature-card" (click)="showCategoryBudget = true">
            <div class="card-icon category">
              <i class="material-icons">category</i>
            </div>
            <div class="card-content">
              <h3>Annual Budget Creation by Category</h3>
              <p>Create comprehensive annual budgets organized by expense and income categories</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">list</i>
                  {{ getCategoryCount() }} Categories
                </span>
                <span class="stat-item">
                  <i class="material-icons">account_balance</i>
                  Budget Planning
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Department-wise Budget Allocation Card -->
          <div class="feature-card" (click)="showDepartmentAllocation = true">
            <div class="card-icon department">
              <i class="material-icons">business</i>
            </div>
            <div class="card-content">
              <h3>Department-wise Budget Allocation</h3>
              <p>Allocate budgets across different departments and track department-wise spending</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">groups</i>
                  {{ departments.length }} Departments
                </span>
                <span class="stat-item">
                  <i class="material-icons">pie_chart</i>
                  Allocation Tracking
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Quarter-wise Budget Breakdown Card -->
          <div class="feature-card" (click)="showQuarterBreakdown = true">
            <div class="card-icon quarter">
              <i class="material-icons">calendar_view_quarter</i>
            </div>
            <div class="card-content">
              <h3>Quarter-wise Budget Breakdown</h3>
              <p>Break down annual budgets into quarterly allocations for better planning and control</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">event</i>
                  Q1-Q4 Breakdown
                </span>
                <span class="stat-item">
                  <i class="material-icons">timeline</i>
                  Quarterly View
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Budget Revision & Amendments Card -->
          <div class="feature-card" (click)="showBudgetRevision = true">
            <div class="card-icon revision">
              <i class="material-icons">edit_document</i>
            </div>
            <div class="card-content">
              <h3>Budget Revision & Amendments</h3>
              <p>Request and manage budget revisions, amendments, and reallocations</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">history</i>
                  {{ getPendingRevisionsCount() }} Pending
                </span>
                <span class="stat-item">
                  <i class="material-icons">sync</i>
                  Track Changes
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Committee Approval Workflow Card -->
          <div class="feature-card" (click)="showApprovalWorkflow = true">
            <div class="card-icon approval">
              <i class="material-icons">how_to_reg</i>
            </div>
            <div class="card-content">
              <h3>Committee Approval Workflow</h3>
              <p>Manage multi-stage approval workflows for budget approval by committees</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">pending_actions</i>
                  {{ getPendingApprovalsCount() }} Pending
                </span>
                <span class="stat-item">
                  <i class="material-icons">workflow</i>
                  Multi-stage
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon planning">
              <i class="material-icons">account_balance_wallet</i>
            </div>
            <div class="card-info">
              <h3>Total Budgets</h3>
              <p class="amount">{{ formatCurrency(getTotalBudgets()) }}</p>
              <span class="subtitle">{{ budgets.length }} Budget Plans</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon active">
              <i class="material-icons">check_circle</i>
            </div>
            <div class="card-info">
              <h3>Active Budgets</h3>
              <p class="amount">{{ getActiveBudgetsCount() }}</p>
              <span class="subtitle">Currently Active</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon draft">
              <i class="material-icons">edit</i>
            </div>
            <div class="card-info">
              <h3>Draft Budgets</h3>
              <p class="amount">{{ getDraftBudgetsCount() }}</p>
              <span class="subtitle">Pending Approval</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon approved">
              <i class="material-icons">verified</i>
            </div>
            <div class="card-info">
              <h3>Approved Budgets</h3>
              <p class="amount">{{ getApprovedBudgetsCount() }}</p>
              <span class="subtitle">Ready to Activate</span>
            </div>
          </div>
        </div>

        <!-- Filters and Actions -->
        <div class="filters-section">
          <div class="filters-left">
            <select class="filter-select" [(ngModel)]="planningFilterYear" (change)="filterBudgets()">
              <option value="">All Financial Years</option>
              <option *ngFor="let year of financialYears" [value]="year">{{ year }}</option>
            </select>
            <select class="filter-select" [(ngModel)]="planningFilterStatus" (change)="filterBudgets()">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <input 
              type="text" 
              class="search-input" 
              [(ngModel)]="planningSearchQuery" 
              (input)="filterBudgets()"
              placeholder="Search budgets...">
          </div>
          <div class="filters-right">
            <button class="btn btn-primary" (click)="showCreateBudget = true">
              <i class="material-icons">add</i>
              Create Budget
            </button>
          </div>
        </div>

        <!-- Budgets Table -->
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Budget Name</th>
                <th>Financial Year</th>
                <th>Period</th>
                <th>Budgeted Amount</th>
                <th>Actual Amount</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let budget of getFilteredBudgets()">
                <td>
                  <strong>{{ budget.name }}</strong>
                  <div class="subtitle" *ngIf="budget.description">{{ budget.description }}</div>
                </td>
                <td>{{ budget.financialYear }}</td>
                <td>{{ formatDate(budget.startDate) }} - {{ formatDate(budget.endDate) }}</td>
                <td><strong>{{ formatCurrency(budget.totalBudget) }}</strong></td>
                <td>{{ formatCurrency(budget.totalActual) }}</td>
                <td>
                  <span [ngClass]="{'positive': budget.variance >= 0, 'negative': budget.variance < 0}">
                    {{ formatCurrency(budget.variance) }}
                  </span>
                  <div class="subtitle">{{ budget.variancePercentage.toFixed(1) }}%</div>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="budget.status">
                    {{ budget.status | titlecase }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn" (click)="viewBudget(budget)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn" (click)="editBudget(budget)" title="Edit" *ngIf="budget.status === 'draft'">
                      <i class="material-icons">edit</i>
                    </button>
                    <button class="action-btn" (click)="approveBudget(budget)" title="Approve" *ngIf="budget.status === 'draft'">
                      <i class="material-icons">check_circle</i>
                    </button>
                    <button class="action-btn" (click)="activateBudget(budget)" title="Activate" *ngIf="budget.status === 'approved'">
                      <i class="material-icons">play_arrow</i>
                    </button>
                    <button class="action-btn delete" (click)="deleteBudget(budget)" title="Delete" *ngIf="budget.status === 'draft'">
                      <i class="material-icons">delete</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="getFilteredBudgets().length === 0">
                <td colspan="8" class="empty-state">
                  <i class="material-icons">pie_chart</i>
                  <p>No budgets found</p>
                  <button class="btn btn-primary" (click)="showCreateBudget = true">Create Your First Budget</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Budget Tracking Tab -->
      <div class="tab-content" *ngIf="activeTab === 'tracking'">
        <!-- Feature Cards Grid -->
        <div class="feature-cards-grid">
          <!-- Real-time Spend Tracking Card -->
          <div class="feature-card" (click)="showSpendTracking = true">
            <div class="card-icon spend-tracking">
              <i class="material-icons">timeline</i>
            </div>
            <div class="card-content">
              <h3>Real-time Spend Tracking vs Budget</h3>
              <p>Monitor actual spending against budgeted amounts in real-time with live updates</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">update</i>
                  Live Updates
                </span>
                <span class="stat-item">
                  <i class="material-icons">compare_arrows</i>
                  Budget Comparison
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Budget Utilization Percentage Card -->
          <div class="feature-card" (click)="showUtilizationPercentage = true">
            <div class="card-icon utilization">
              <i class="material-icons">pie_chart</i>
            </div>
            <div class="card-content">
              <h3>Budget Utilization Percentage</h3>
              <p>Track how much of your budget has been utilized across categories and departments</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">percent</i>
                  {{ getOverallUtilization().toFixed(1) }}% Used
                </span>
                <span class="stat-item">
                  <i class="material-icons">insights</i>
                  Utilization Analysis
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Over-budget Alerts Card -->
          <div class="feature-card" (click)="showOverBudgetAlerts = true">
            <div class="card-icon alerts">
              <i class="material-icons">warning</i>
            </div>
            <div class="card-content">
              <h3>Over-budget Alerts</h3>
              <p>Get instant alerts when spending exceeds budgeted amounts or approaches limits</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">notifications_active</i>
                  {{ getOverBudgetCount() }} Alerts
                </span>
                <span class="stat-item">
                  <i class="material-icons">priority_high</i>
                  Critical Items
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Budget Variance Reports Card -->
          <div class="feature-card" (click)="showVarianceReports = true">
            <div class="card-icon variance-report">
              <i class="material-icons">assessment</i>
            </div>
            <div class="card-content">
              <h3>Budget Variance Reports</h3>
              <p>Generate comprehensive reports analyzing variances between budgeted and actual amounts</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">description</i>
                  Detailed Reports
                </span>
                <span class="stat-item">
                  <i class="material-icons">download</i>
                  Export Options
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Forecast vs Actual Analysis Card -->
          <div class="feature-card" (click)="showForecastAnalysis = true">
            <div class="card-icon forecast">
              <i class="material-icons">trending_up</i>
            </div>
            <div class="card-content">
              <h3>Forecast vs Actual Analysis</h3>
              <p>Compare forecasted spending with actual results to improve future budget planning</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">analytics</i>
                  Trend Analysis
                </span>
                <span class="stat-item">
                  <i class="material-icons">compare</i>
                  Forecast Comparison
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Savings Identification Card -->
          <div class="feature-card" (click)="showSavingsIdentification = true">
            <div class="card-icon savings">
              <i class="material-icons">savings</i>
            </div>
            <div class="card-content">
              <h3>Savings Identification</h3>
              <p>Identify areas where spending is below budget and potential savings opportunities</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">attach_money</i>
                  {{ formatCurrency(getTotalSavings()) }} Saved
                </span>
                <span class="stat-item">
                  <i class="material-icons">search</i>
                  Opportunities
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon total">
              <i class="material-icons">account_balance</i>
            </div>
            <div class="card-info">
              <h3>Total Budgeted</h3>
              <p class="amount">{{ formatCurrency(getTotalBudgeted()) }}</p>
              <span class="subtitle">All Active Budgets</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon actual">
              <i class="material-icons">attach_money</i>
            </div>
            <div class="card-info">
              <h3>Total Actual</h3>
              <p class="amount">{{ formatCurrency(getTotalActual()) }}</p>
              <span class="subtitle">Spent So Far</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon variance" [ngClass]="{'positive': getTotalVariance() >= 0, 'negative': getTotalVariance() < 0}">
              <i class="material-icons">trending_up</i>
            </div>
            <div class="card-info">
              <h3>Total Variance</h3>
              <p class="amount">{{ formatCurrency(getTotalVariance()) }}</p>
              <span class="subtitle">{{ getTotalVariancePercentage().toFixed(1) }}% Variance</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon remaining">
              <i class="material-icons">account_balance_wallet</i>
            </div>
            <div class="card-info">
              <h3>Remaining Budget</h3>
              <p class="amount">{{ formatCurrency(getRemainingBudget()) }}</p>
              <span class="subtitle">Available to Spend</span>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="filters-section">
          <div class="filters-left">
            <select class="filter-select" [(ngModel)]="trackingFilterBudget" (change)="filterTracking()">
              <option value="">All Budgets</option>
              <option *ngFor="let budget of activeBudgets" [value]="budget.id">
                {{ budget.name }} ({{ budget.financialYear }})
              </option>
            </select>
            <select class="filter-select" [(ngModel)]="trackingFilterCategory" (change)="filterTracking()">
              <option value="">All Categories</option>
              <option *ngFor="let category of allCategories" [value]="category.id">
                {{ category.name }}
              </option>
            </select>
            <input 
              type="month" 
              class="filter-select" 
              [(ngModel)]="trackingFilterMonth" 
              (change)="filterTracking()"
              placeholder="Select Month">
          </div>
          <div class="filters-right">
            <button class="btn btn-secondary" (click)="exportTrackingReport()">
              <i class="material-icons">download</i>
              Export Report
            </button>
          </div>
        </div>

        <!-- Budget Tracking Table -->
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Budget Item</th>
                <th>Budgeted Amount</th>
                <th>Actual Amount</th>
                <th>Variance</th>
                <th>Variance %</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of getFilteredTrackingItems()">
                <td>
                  <strong>{{ getCategoryName(item.categoryId) }}</strong>
                </td>
                <td>{{ item.name }}</td>
                <td><strong>{{ formatCurrency(item.budgetedAmount) }}</strong></td>
                <td>{{ formatCurrency(item.actualAmount) }}</td>
                <td>
                  <span [ngClass]="{'positive': item.variance >= 0, 'negative': item.variance < 0}">
                    {{ formatCurrency(item.variance) }}
                  </span>
                </td>
                <td>
                  <span [ngClass]="{'positive': item.variancePercentage >= 0, 'negative': item.variancePercentage < 0}">
                    {{ item.variancePercentage.toFixed(1) }}%
                  </span>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="getTrackingStatus(item)">
                    {{ getTrackingStatus(item) | titlecase }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn" (click)="viewTrackingDetails(item)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn" (click)="addTransaction(item)" title="Add Transaction">
                      <i class="material-icons">add</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="getFilteredTrackingItems().length === 0">
                <td colspan="8" class="empty-state">
                  <i class="material-icons">track_changes</i>
                  <p>No tracking data found</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create/Edit Budget Modal -->
      <div class="modal-overlay" *ngIf="showCreateBudget" (click)="showCreateBudget = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>
              <i class="material-icons">account_balance_wallet</i>
              {{ editingBudget ? 'Edit Budget' : 'Create New Budget' }}
            </h2>
            <button class="close-btn" (click)="showCreateBudget = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveBudget()">
              <div class="form-row">
                <div class="form-group">
                  <label for="budgetName">Budget Name <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="budgetName" 
                    class="form-control" 
                    [(ngModel)]="newBudget.name" 
                    name="budgetName"
                    placeholder="e.g., Annual Budget 2024-25"
                    required>
                </div>
                <div class="form-group">
                  <label for="budgetFinancialYear">Financial Year <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="budgetFinancialYear" 
                    class="form-control" 
                    [(ngModel)]="newBudget.financialYear" 
                    name="budgetFinancialYear"
                    placeholder="e.g., 2024-25"
                    required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="budgetStartDate">Start Date <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="budgetStartDate" 
                    class="form-control" 
                    [(ngModel)]="newBudgetStartDateString" 
                    name="budgetStartDate"
                    required>
                </div>
                <div class="form-group">
                  <label for="budgetEndDate">End Date <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="budgetEndDate" 
                    class="form-control" 
                    [(ngModel)]="newBudgetEndDateString" 
                    name="budgetEndDate"
                    [min]="newBudgetStartDateString"
                    required>
                </div>
              </div>

              <div class="form-group">
                <label for="budgetDescription">Description</label>
                <textarea 
                  id="budgetDescription" 
                  class="form-control" 
                  [(ngModel)]="newBudget.description" 
                  name="budgetDescription"
                  rows="3"
                  placeholder="Budget description and notes..."></textarea>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelBudget()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">save</i>
                  {{ editingBudget ? 'Update Budget' : 'Create Budget' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Category Budget Creation Modal -->
      <div class="modal-overlay" *ngIf="showCategoryBudget" (click)="showCategoryBudget = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">category</i> Annual Budget Creation by Category</h2>
            <button class="close-btn" (click)="showCategoryBudget = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="selectedBudgetForCategory" (change)="loadCategoryBudget()">
                <option value="">Select Budget</option>
                <option *ngFor="let budget of budgets" [value]="budget.id">
                  {{ budget.name }} ({{ budget.financialYear }})
                </option>
              </select>
              <button class="btn btn-primary" (click)="showAddCategory = true">
                <i class="material-icons">add</i>
                Add Category
              </button>
            </div>

            <div class="table-wrapper" style="margin-top: 20px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Code</th>
                    <th>Budgeted Amount</th>
                    <th>Actual Amount</th>
                    <th>Variance</th>
                    <th>Items</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let category of getCategoryBudgets()">
                    <td><strong>{{ category.name }}</strong></td>
                    <td>{{ category.code }}</td>
                    <td>{{ formatCurrency(category.budgetedAmount) }}</td>
                    <td>{{ formatCurrency(category.actualAmount) }}</td>
                    <td>
                      <span [ngClass]="{'positive': category.variance >= 0, 'negative': category.variance < 0}">
                        {{ formatCurrency(category.variance) }}
                      </span>
                    </td>
                    <td>{{ category.items.length }} items</td>
                    <td>
                      <div class="action-buttons">
                        <button class="action-btn" (click)="viewCategoryDetails(category)" title="View">
                          <i class="material-icons">visibility</i>
                        </button>
                        <button class="action-btn" (click)="editCategory(category)" title="Edit">
                          <i class="material-icons">edit</i>
                        </button>
                        <button class="action-btn" (click)="addCategoryItem(category)" title="Add Item">
                          <i class="material-icons">add</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="getCategoryBudgets().length === 0">
                    <td colspan="7" class="empty-state">
                      <p>Select a budget to view categories or add new categories</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Category Modal -->
      <div class="modal-overlay" *ngIf="showAddCategory" (click)="showAddCategory = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">category</i> {{ editingCategory ? 'Edit Category' : 'Add Category' }}</h2>
            <button class="close-btn" (click)="showAddCategory = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveCategory()">
              <div class="form-group">
                <label for="categoryName">Category Name <span class="required">*</span></label>
                <input type="text" id="categoryName" class="form-control" [(ngModel)]="newCategory.name" name="categoryName" required>
              </div>
              <div class="form-group">
                <label for="categoryCode">Category Code <span class="required">*</span></label>
                <input type="text" id="categoryCode" class="form-control" [(ngModel)]="newCategory.code" name="categoryCode" required>
              </div>
              <div class="form-group">
                <label for="categoryBudget">Budgeted Amount <span class="required">*</span></label>
                <input type="number" id="categoryBudget" class="form-control" [(ngModel)]="newCategory.budgetedAmount" name="categoryBudget" min="0" required>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="showAddCategory = false">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Department Allocation Modal -->
      <div class="modal-overlay" *ngIf="showDepartmentAllocation" (click)="showDepartmentAllocation = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">business</i> Department-wise Budget Allocation</h2>
            <button class="close-btn" (click)="showDepartmentAllocation = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="selectedBudgetForDepartment" (change)="loadDepartmentAllocation()">
                <option value="">Select Budget</option>
                <option *ngFor="let budget of budgets" [value]="budget.id">
                  {{ budget.name }} ({{ budget.financialYear }})
                </option>
              </select>
              <button class="btn btn-primary" (click)="showAddDepartment = true">
                <i class="material-icons">add</i>
                Add Department
              </button>
            </div>

            <div class="summary-cards" style="margin: 20px 0;">
              <div class="summary-card">
                <div class="card-info">
                  <h3>Total Allocated</h3>
                  <p class="amount">{{ formatCurrency(getTotalDepartmentAllocation()) }}</p>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-info">
                  <h3>Total Spent</h3>
                  <p class="amount">{{ formatCurrency(getTotalDepartmentSpent()) }}</p>
                </div>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Code</th>
                    <th>Allocated Amount</th>
                    <th>Actual Spent</th>
                    <th>Variance</th>
                    <th>Head of Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let dept of departments">
                    <td><strong>{{ dept.name }}</strong></td>
                    <td>{{ dept.code }}</td>
                    <td>{{ formatCurrency(dept.budgetAllocation) }}</td>
                    <td>{{ formatCurrency(dept.actualSpent) }}</td>
                    <td>
                      <span [ngClass]="{'positive': dept.variance >= 0, 'negative': dept.variance < 0}">
                        {{ formatCurrency(dept.variance) }}
                      </span>
                    </td>
                    <td>{{ dept.headOfDepartment || '-' }}</td>
                    <td>
                      <div class="action-buttons">
                        <button class="action-btn" (click)="editDepartment(dept)" title="Edit">
                          <i class="material-icons">edit</i>
                        </button>
                        <button class="action-btn" (click)="viewDepartmentDetails(dept)" title="View">
                          <i class="material-icons">visibility</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Department Modal -->
      <div class="modal-overlay" *ngIf="showAddDepartment" (click)="showAddDepartment = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">business</i> {{ editingDepartment ? 'Edit Department' : 'Add Department' }}</h2>
            <button class="close-btn" (click)="showAddDepartment = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveDepartment()">
              <div class="form-group">
                <label for="deptName">Department Name <span class="required">*</span></label>
                <input type="text" id="deptName" class="form-control" [(ngModel)]="newDepartment.name" name="deptName" required>
              </div>
              <div class="form-group">
                <label for="deptCode">Department Code <span class="required">*</span></label>
                <input type="text" id="deptCode" class="form-control" [(ngModel)]="newDepartment.code" name="deptCode" required>
              </div>
              <div class="form-group">
                <label for="deptAllocation">Budget Allocation <span class="required">*</span></label>
                <input type="number" id="deptAllocation" class="form-control" [(ngModel)]="newDepartment.budgetAllocation" name="deptAllocation" min="0" required>
              </div>
              <div class="form-group">
                <label for="deptHead">Head of Department</label>
                <input type="text" id="deptHead" class="form-control" [(ngModel)]="newDepartment.headOfDepartment" name="deptHead">
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="showAddDepartment = false">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Quarter Breakdown Modal -->
      <div class="modal-overlay" *ngIf="showQuarterBreakdown" (click)="showQuarterBreakdown = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">calendar_view_quarter</i> Quarter-wise Budget Breakdown</h2>
            <button class="close-btn" (click)="showQuarterBreakdown = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="selectedBudgetForQuarter" (change)="loadQuarterBreakdown()">
                <option value="">Select Budget</option>
                <option *ngFor="let budget of budgets" [value]="budget.id">
                  {{ budget.name }} ({{ budget.financialYear }})
                </option>
              </select>
            </div>

            <div class="quarter-grid" *ngIf="selectedBudgetForQuarter">
              <div class="quarter-card" *ngFor="let quarter of getQuarterBreakdown()">
                <div class="quarter-header">
                  <h3>{{ quarter.name }}</h3>
                  <span class="quarter-period">{{ quarter.period }}</span>
                </div>
                <div class="quarter-stats">
                  <div class="stat-item">
                    <label>Budgeted</label>
                    <span class="amount">{{ formatCurrency(quarter.budgeted) }}</span>
                  </div>
                  <div class="stat-item">
                    <label>Actual</label>
                    <span class="amount">{{ formatCurrency(quarter.actual) }}</span>
                  </div>
                  <div class="stat-item">
                    <label>Variance</label>
                    <span class="amount" [ngClass]="{'positive': quarter.variance >= 0, 'negative': quarter.variance < 0}">
                      {{ formatCurrency(quarter.variance) }}
                    </span>
                  </div>
                  <div class="stat-item">
                    <label>Percentage</label>
                    <span class="percentage">{{ quarter.percentage.toFixed(1) }}%</span>
                  </div>
                </div>
                <button class="btn btn-secondary" (click)="viewQuarterDetails(quarter)">View Details</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget Revision Modal -->
      <div class="modal-overlay" *ngIf="showBudgetRevision" (click)="showBudgetRevision = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">edit_document</i> Budget Revision & Amendments</h2>
            <button class="close-btn" (click)="showBudgetRevision = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="revisionFilterStatus" (change)="filterRevisions()">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button class="btn btn-primary" (click)="showRequestRevision = true">
                <i class="material-icons">add</i>
                Request Revision
              </button>
            </div>

            <div class="table-wrapper" style="margin-top: 20px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Budget</th>
                    <th>Revision Type</th>
                    <th>Requested By</th>
                    <th>Request Date</th>
                    <th>Total Change</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let revision of getFilteredRevisions()">
                    <td><strong>{{ revision.budgetName }}</strong></td>
                    <td>
                      <span class="type-badge" [ngClass]="revision.revisionType">
                        {{ revision.revisionType | titlecase }}
                      </span>
                    </td>
                    <td>{{ revision.requestedBy }}</td>
                    <td>{{ formatDate(revision.requestedDate) }}</td>
                    <td>
                      <span [ngClass]="{'positive': revision.totalChange >= 0, 'negative': revision.totalChange < 0}">
                        {{ formatCurrency(revision.totalChange) }}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="revision.status">
                        {{ revision.status | titlecase }}
                      </span>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button class="action-btn" (click)="viewRevisionDetails(revision)" title="View">
                          <i class="material-icons">visibility</i>
                        </button>
                        <button class="action-btn" (click)="approveRevision(revision)" title="Approve" *ngIf="revision.status === 'pending'">
                          <i class="material-icons">check_circle</i>
                        </button>
                        <button class="action-btn delete" (click)="rejectRevision(revision)" title="Reject" *ngIf="revision.status === 'pending'">
                          <i class="material-icons">cancel</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Request Revision Modal -->
      <div class="modal-overlay" *ngIf="showRequestRevision" (click)="showRequestRevision = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">edit_document</i> Request Budget Revision</h2>
            <button class="close-btn" (click)="showRequestRevision = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveRevision()">
              <div class="form-row">
                <div class="form-group">
                  <label for="revisionBudget">Budget <span class="required">*</span></label>
                  <select id="revisionBudget" class="form-control" [(ngModel)]="newRevision.budgetId" name="revisionBudget" required>
                    <option value="">Select Budget</option>
                    <option *ngFor="let budget of budgets" [value]="budget.id">
                      {{ budget.name }} ({{ budget.financialYear }})
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="revisionType">Revision Type <span class="required">*</span></label>
                  <select id="revisionType" class="form-control" [(ngModel)]="newRevision.revisionType" name="revisionType" required>
                    <option value="amendment">Amendment</option>
                    <option value="supplementary">Supplementary</option>
                    <option value="reallocation">Reallocation</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="revisionReason">Reason <span class="required">*</span></label>
                <textarea id="revisionReason" class="form-control" [(ngModel)]="newRevision.reason" name="revisionReason" rows="3" required></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="showRequestRevision = false">Cancel</button>
                <button type="submit" class="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Approval Workflow Modal -->
      <div class="modal-overlay" *ngIf="showApprovalWorkflow" (click)="showApprovalWorkflow = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">how_to_reg</i> Committee Approval Workflow</h2>
            <button class="close-btn" (click)="showApprovalWorkflow = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="approvalFilterStatus" (change)="filterApprovals()">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div class="table-wrapper" style="margin-top: 20px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Budget</th>
                    <th>Current Stage</th>
                    <th>Submitted By</th>
                    <th>Submitted Date</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let workflow of getFilteredApprovals()">
                    <td><strong>{{ workflow.budgetName }}</strong></td>
                    <td>{{ workflow.currentStage }}</td>
                    <td>{{ workflow.submittedBy }}</td>
                    <td>{{ formatDate(workflow.submittedDate) }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="workflow.status">
                        {{ workflow.status | titlecase }}
                      </span>
                    </td>
                    <td>
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="getApprovalProgress(workflow)"></div>
                        <span class="progress-text">{{ getApprovalProgress(workflow) }}%</span>
                      </div>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button class="action-btn" (click)="viewWorkflowDetails(workflow)" title="View">
                          <i class="material-icons">visibility</i>
                        </button>
                        <button class="action-btn" (click)="approveWorkflowStage(workflow)" title="Approve Stage" *ngIf="workflow.status === 'in-progress'">
                          <i class="material-icons">check_circle</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time Spend Tracking Modal -->
      <div class="modal-overlay" *ngIf="showSpendTracking" (click)="showSpendTracking = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">timeline</i> Real-time Spend Tracking vs Budget</h2>
            <button class="close-btn" (click)="showSpendTracking = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="spendTrackingBudget" (change)="loadSpendTracking()">
                <option value="">Select Budget</option>
                <option *ngFor="let budget of activeBudgets" [value]="budget.id">
                  {{ budget.name }} ({{ budget.financialYear }})
                </option>
              </select>
              <select class="filter-select" [(ngModel)]="spendTrackingPeriod" (change)="loadSpendTracking()">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div class="summary-cards" style="margin: 20px 0;">
              <div class="summary-card">
                <div class="card-info">
                  <h3>Budgeted</h3>
                  <p class="amount">{{ formatCurrency(getSpendTrackingBudgeted()) }}</p>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-info">
                  <h3>Actual Spent</h3>
                  <p class="amount">{{ formatCurrency(getSpendTrackingActual()) }}</p>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-info">
                  <h3>Remaining</h3>
                  <p class="amount" [ngClass]="{'positive': getSpendTrackingRemaining() >= 0, 'negative': getSpendTrackingRemaining() < 0}">
                    {{ formatCurrency(getSpendTrackingRemaining()) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Category/Item</th>
                    <th>Budgeted</th>
                    <th>Actual</th>
                    <th>Variance</th>
                    <th>Utilization</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of getSpendTrackingItems()">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ formatCurrency(item.budgeted) }}</td>
                    <td>{{ formatCurrency(item.actual) }}</td>
                    <td>
                      <span [ngClass]="{'positive': item.variance >= 0, 'negative': item.variance < 0}">
                        {{ formatCurrency(item.variance) }}
                      </span>
                    </td>
                    <td>
                      <div class="utilization-bar">
                        <div class="utilization-fill" [style.width.%]="item.utilization" [ngClass]="{'over': item.utilization > 100}"></div>
                        <span class="utilization-text">{{ item.utilization.toFixed(1) }}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="getSpendTrackingStatus(item)">
                        {{ getSpendTrackingStatus(item) | titlecase }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget Utilization Percentage Modal -->
      <div class="modal-overlay" *ngIf="showUtilizationPercentage" (click)="showUtilizationPercentage = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">pie_chart</i> Budget Utilization Percentage</h2>
            <button class="close-btn" (click)="showUtilizationPercentage = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="utilizationBudget" (change)="loadUtilization()">
                <option value="">All Budgets</option>
                <option *ngFor="let budget of activeBudgets" [value]="budget.id">
                  {{ budget.name }} ({{ budget.financialYear }})
                </option>
              </select>
            </div>

            <div class="utilization-summary">
              <div class="utilization-card">
                <h3>Overall Utilization</h3>
                <div class="utilization-circle">
                  <div class="circle-progress" [style.background]="getUtilizationCircleColor()">
                    <span class="circle-text">{{ getOverallUtilization().toFixed(1) }}%</span>
                  </div>
                </div>
                <p class="utilization-details">
                  <span>Budgeted: {{ formatCurrency(getTotalBudgeted()) }}</span>
                  <span>Used: {{ formatCurrency(getTotalActual()) }}</span>
                  <span>Remaining: {{ formatCurrency(getRemainingBudget()) }}</span>
                </p>
              </div>
            </div>

            <div class="table-wrapper" style="margin-top: 20px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Category/Department</th>
                    <th>Budgeted</th>
                    <th>Actual</th>
                    <th>Utilization</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of getUtilizationItems()">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ formatCurrency(item.budgeted) }}</td>
                    <td>{{ formatCurrency(item.actual) }}</td>
                    <td>
                      <div class="utilization-bar">
                        <div class="utilization-fill" [style.width.%]="item.utilization" [ngClass]="{'over': item.utilization > 100}"></div>
                        <span class="utilization-text">{{ item.utilization.toFixed(1) }}%</span>
                      </div>
                    </td>
                    <td>{{ formatCurrency(item.remaining) }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="getUtilizationStatus(item)">
                        {{ getUtilizationStatus(item) | titlecase }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Over-budget Alerts Modal -->
      <div class="modal-overlay" *ngIf="showOverBudgetAlerts" (click)="showOverBudgetAlerts = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">warning</i> Over-budget Alerts</h2>
            <button class="close-btn" (click)="showOverBudgetAlerts = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="alert-banners">
              <div class="alert-banner critical" *ngIf="getCriticalAlerts().length > 0">
                <i class="material-icons">error</i>
                <div class="alert-content">
                  <strong>{{ getCriticalAlerts().length }} Critical Over-budget Items</strong>
                  <p>Immediate attention required</p>
                </div>
              </div>
              <div class="alert-banner warning" *ngIf="getWarningAlerts().length > 0">
                <i class="material-icons">warning</i>
                <div class="alert-content">
                  <strong>{{ getWarningAlerts().length }} Warning Items</strong>
                  <p>Approaching budget limits</p>
                </div>
              </div>
            </div>

            <div class="table-wrapper" style="margin-top: 20px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Budgeted</th>
                    <th>Actual</th>
                    <th>Over-budget</th>
                    <th>Utilization</th>
                    <th>Severity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let alert of getOverBudgetAlerts()" [ngClass]="{'critical-row': alert.severity === 'critical'}">
                    <td><strong>{{ alert.name }}</strong></td>
                    <td>{{ formatCurrency(alert.budgeted) }}</td>
                    <td>{{ formatCurrency(alert.actual) }}</td>
                    <td>
                      <span class="negative">{{ formatCurrency(alert.overBudget) }}</span>
                    </td>
                    <td>
                      <span class="negative">{{ alert.utilization.toFixed(1) }}%</span>
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="alert.severity">
                        {{ alert.severity | titlecase }}
                      </span>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button class="action-btn" (click)="viewAlertDetails(alert)" title="View Details">
                          <i class="material-icons">visibility</i>
                        </button>
                        <button class="action-btn" (click)="acknowledgeAlert(alert)" title="Acknowledge">
                          <i class="material-icons">check</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="getOverBudgetAlerts().length === 0">
                    <td colspan="7" class="empty-state">
                      <i class="material-icons">check_circle</i>
                      <p>No over-budget alerts at this time</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Budget Variance Reports Modal -->
      <div class="modal-overlay" *ngIf="showVarianceReports" (click)="showVarianceReports = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">assessment</i> Budget Variance Reports</h2>
            <button class="close-btn" (click)="showVarianceReports = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="varianceReportBudget" (change)="generateVarianceReport()">
                <option value="">Select Budget</option>
                <option *ngFor="let budget of activeBudgets" [value]="budget.id">
                  {{ budget.name }} ({{ budget.financialYear }})
                </option>
              </select>
              <select class="filter-select" [(ngModel)]="varianceReportType" (change)="generateVarianceReport()">
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Report</option>
                <option value="category">By Category</option>
                <option value="department">By Department</option>
              </select>
              <button class="btn btn-primary" (click)="exportVarianceReport()">
                <i class="material-icons">download</i>
                Export Report
              </button>
            </div>

            <div class="report-summary" *ngIf="varianceReportData">
              <h3>Report Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <label>Total Budgeted</label>
                  <span>{{ formatCurrency(varianceReportData.totalBudgeted) }}</span>
                </div>
                <div class="summary-item">
                  <label>Total Actual</label>
                  <span>{{ formatCurrency(varianceReportData.totalActual) }}</span>
                </div>
                <div class="summary-item">
                  <label>Total Variance</label>
                  <span [ngClass]="{'positive': varianceReportData.totalVariance >= 0, 'negative': varianceReportData.totalVariance < 0}">
                    {{ formatCurrency(varianceReportData.totalVariance) }}
                  </span>
                </div>
                <div class="summary-item">
                  <label>Variance %</label>
                  <span [ngClass]="{'positive': varianceReportData.variancePercentage >= 0, 'negative': varianceReportData.variancePercentage < 0}">
                    {{ varianceReportData.variancePercentage.toFixed(1) }}%
                  </span>
                </div>
              </div>
            </div>

            <div class="table-wrapper" style="margin-top: 20px;" *ngIf="varianceReportData">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Budgeted</th>
                    <th>Actual</th>
                    <th>Variance</th>
                    <th>Variance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of varianceReportData.items">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ formatCurrency(item.budgeted) }}</td>
                    <td>{{ formatCurrency(item.actual) }}</td>
                    <td>
                      <span [ngClass]="{'positive': item.variance >= 0, 'negative': item.variance < 0}">
                        {{ formatCurrency(item.variance) }}
                      </span>
                    </td>
                    <td>
                      <span [ngClass]="{'positive': item.variancePercentage >= 0, 'negative': item.variancePercentage < 0}">
                        {{ item.variancePercentage.toFixed(1) }}%
                      </span>
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="getVarianceStatus(item)">
                        {{ getVarianceStatus(item) | titlecase }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Forecast vs Actual Analysis Modal -->
      <div class="modal-overlay" *ngIf="showForecastAnalysis" (click)="showForecastAnalysis = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">trending_up</i> Forecast vs Actual Analysis</h2>
            <button class="close-btn" (click)="showForecastAnalysis = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="forecastBudget" (change)="loadForecastAnalysis()">
                <option value="">Select Budget</option>
                <option *ngFor="let budget of activeBudgets" [value]="budget.id">
                  {{ budget.name }} ({{ budget.financialYear }})
                </option>
              </select>
            </div>

            <div class="forecast-comparison" *ngIf="forecastData">
              <h3>Forecast vs Actual Comparison</h3>
              <div class="comparison-grid">
                <div class="comparison-card">
                  <h4>Forecasted</h4>
                  <p class="amount">{{ formatCurrency(forecastData.forecasted) }}</p>
                </div>
                <div class="comparison-card">
                  <h4>Actual</h4>
                  <p class="amount">{{ formatCurrency(forecastData.actual) }}</p>
                </div>
                <div class="comparison-card">
                  <h4>Difference</h4>
                  <p class="amount" [ngClass]="{'positive': forecastData.difference >= 0, 'negative': forecastData.difference < 0}">
                    {{ formatCurrency(forecastData.difference) }}
                  </p>
                </div>
                <div class="comparison-card">
                  <h4>Accuracy</h4>
                  <p class="amount">{{ forecastData.accuracy.toFixed(1) }}%</p>
                </div>
              </div>
            </div>

            <div class="table-wrapper" style="margin-top: 20px;" *ngIf="forecastData">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Forecasted</th>
                    <th>Actual</th>
                    <th>Difference</th>
                    <th>Accuracy</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of forecastData.items">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ formatCurrency(item.forecasted) }}</td>
                    <td>{{ formatCurrency(item.actual) }}</td>
                    <td>
                      <span [ngClass]="{'positive': item.difference >= 0, 'negative': item.difference < 0}">
                        {{ formatCurrency(item.difference) }}
                      </span>
                    </td>
                    <td>{{ item.accuracy.toFixed(1) }}%</td>
                    <td>
                      <i class="material-icons" [ngClass]="{'positive': item.trend === 'up', 'negative': item.trend === 'down'}">
                        {{ item.trend === 'up' ? 'trending_up' : item.trend === 'down' ? 'trending_down' : 'trending_flat' }}
                      </i>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Savings Identification Modal -->
      <div class="modal-overlay" *ngIf="showSavingsIdentification" (click)="showSavingsIdentification = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">savings</i> Savings Identification</h2>
            <button class="close-btn" (click)="showSavingsIdentification = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="filters-section">
              <select class="filter-select" [(ngModel)]="savingsBudget" (change)="loadSavingsIdentification()">
                <option value="">All Budgets</option>
                <option *ngFor="let budget of activeBudgets" [value]="budget.id">
                  {{ budget.name }} ({{ budget.financialYear }})
                </option>
              </select>
            </div>

            <div class="savings-summary">
              <div class="savings-card">
                <h3>Total Savings Identified</h3>
                <p class="amount positive">{{ formatCurrency(getTotalSavings()) }}</p>
                <span class="subtitle">{{ getSavingsItems().length }} items under budget</span>
              </div>
            </div>

            <div class="table-wrapper" style="margin-top: 20px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Budgeted</th>
                    <th>Actual</th>
                    <th>Savings</th>
                    <th>Savings %</th>
                    <th>Utilization</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of getSavingsItems()">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ formatCurrency(item.budgeted) }}</td>
                    <td>{{ formatCurrency(item.actual) }}</td>
                    <td>
                      <span class="positive">{{ formatCurrency(item.savings) }}</span>
                    </td>
                    <td>
                      <span class="positive">{{ item.savingsPercentage.toFixed(1) }}%</span>
                    </td>
                    <td>
                      <div class="utilization-bar">
                        <div class="utilization-fill" [style.width.%]="item.utilization"></div>
                        <span class="utilization-text">{{ item.utilization.toFixed(1) }}%</span>
                      </div>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button class="action-btn" (click)="viewSavingsDetails(item)" title="View Details">
                          <i class="material-icons">visibility</i>
                        </button>
                        <button class="action-btn" (click)="reallocateSavings(item)" title="Reallocate">
                          <i class="material-icons">swap_horiz</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="getSavingsItems().length === 0">
                    <td colspan="7" class="empty-state">
                      <i class="material-icons">search</i>
                      <p>No savings identified at this time</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .budget-management-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f5f7fa;
      min-height: 100vh;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      background: white;
      padding: 20px 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .back-btn {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: none;
      background: #f5f7fa;
      color: #2c3e50;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .back-btn:hover {
      background: #e9ecef;
      transform: translateX(-2px);
    }

    .header-content {
      flex: 1;
    }

    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 4px 0;
    }

    .header-content h1 .material-icons {
      font-size: 32px;
      color: #3498db;
    }

    .header-content p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .icon-btn:hover {
      background: #2980b9;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }

    /* Tabs */
    .tabs-section {
      background: white;
      border-radius: 12px;
      padding: 8px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .tab-buttons {
      display: flex;
      gap: 8px;
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 20px;
      background: transparent;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      color: #7f8c8d;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      background: #f5f7fa;
      color: #2c3e50;
    }

    .tab-btn.active {
      background: #3498db;
      color: white;
      box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
    }

    .tab-btn .material-icons {
      font-size: 20px;
    }

    /* Tab Content */
    .tab-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: all 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .card-icon.planning {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .card-icon.active {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }

    .card-icon.draft {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .card-icon.approved {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .card-icon.total {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .card-icon.actual {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .card-icon.variance.positive {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }

    .card-icon.variance.negative {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .card-icon.remaining {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
    }

    .card-icon.category {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .card-icon.department {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .card-icon.quarter {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .card-icon.revision {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .card-icon.approval {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }

    .card-icon .material-icons {
      font-size: 28px;
    }

    .card-info {
      flex: 1;
    }

    .card-info h3 {
      margin: 0 0 4px 0;
      font-size: 13px;
      font-weight: 500;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-info .amount {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    .card-info .subtitle {
      font-size: 12px;
      color: #95a5a6;
    }

    /* Filters */
    .filters-section {
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .filters-left {
      display: flex;
      gap: 12px;
      flex: 1;
    }

    .filter-select, .search-input {
      padding: 10px 14px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      color: #2c3e50;
      background: white;
      min-width: 180px;
    }

    .search-input {
      flex: 1;
      max-width: 300px;
    }

    .filters-right {
      display: flex;
      gap: 12px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    /* Table */
    .table-wrapper {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead {
      background: #f8f9fa;
    }

    .data-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e9ecef;
    }

    .data-table td {
      padding: 16px;
      border-bottom: 1px solid #f1f3f5;
      font-size: 14px;
      color: #2c3e50;
    }

    .data-table tbody tr:hover {
      background: #f8f9fa;
    }

    .subtitle {
      font-size: 12px;
      color: #95a5a6;
      margin-top: 4px;
    }

    .positive {
      color: #27ae60;
      font-weight: 600;
    }

    .negative {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Status Badge */
    .status-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.draft {
      background: #fff3e0;
      color: #e67e22;
    }

    .status-badge.approved {
      background: #f3e5f5;
      color: #9b59b6;
    }

    .status-badge.active {
      background: #e8f8f0;
      color: #27ae60;
    }

    .status-badge.closed {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .status-badge.on-track {
      background: #e8f8f0;
      color: #27ae60;
    }

    .status-badge.over-budget {
      background: #ffeaea;
      color: #e74c3c;
    }

    .status-badge.under-budget {
      background: #e7f3ff;
      color: #2980b9;
    }

    /* Action Buttons */
    .action-buttons {
      display: flex;
      gap: 6px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #f5f7fa;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #3498db;
      color: white;
      transform: scale(1.1);
    }

    .action-btn.delete:hover {
      background: #e74c3c;
      color: white;
    }

    .action-btn .material-icons {
      font-size: 18px;
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
      margin: 0 0 20px 0;
      font-size: 16px;
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
      animation: fadeIn 0.2s ease;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      animation: slideUp 0.3s ease;
    }

    .modal-content.large {
      max-width: 900px;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-header h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;
    }

    .modal-header h2 .material-icons {
      color: #3498db;
    }

    .close-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: none;
      background: #f5f7fa;
      color: #2c3e50;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #e9ecef;
    }

    .modal-body {
      padding: 24px;
    }

    /* Form */
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
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

    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e9ecef;
    }

    @media (max-width: 768px) {
      .budget-management-container {
        padding: 16px;
      }

      .summary-cards {
        grid-template-columns: 1fr;
      }

      .filters-section {
        flex-direction: column;
        align-items: stretch;
      }

      .filters-left {
        flex-direction: column;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }

    /* Feature Cards Grid */
    .feature-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .feature-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      display: flex;
      align-items: flex-start;
      gap: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .feature-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .feature-card:hover::before {
      transform: scaleX(1);
    }

    .feature-card .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .feature-card .card-icon .material-icons {
      font-size: 28px;
    }

    .feature-card .card-content {
      flex: 1;
    }

    .feature-card .card-content h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .feature-card .card-content p {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .card-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #95a5a6;
    }

    .stat-item .material-icons {
      font-size: 16px;
    }

    .card-arrow {
      color: #bdc3c7;
      transition: all 0.3s ease;
    }

    .feature-card:hover .card-arrow {
      color: #3498db;
      transform: translateX(4px);
    }

    .card-arrow .material-icons {
      font-size: 24px;
    }

    /* Quarter Grid */
    .quarter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .quarter-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .quarter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e9ecef;
    }

    .quarter-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    .quarter-period {
      font-size: 12px;
      color: #95a5a6;
    }

    .quarter-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-item label {
      font-size: 11px;
      color: #95a5a6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .stat-item .amount {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .stat-item .percentage {
      font-size: 14px;
      font-weight: 600;
    }

    /* Progress Bar */
    .progress-bar {
      position: relative;
      width: 100%;
      height: 24px;
      background: #e9ecef;
      border-radius: 12px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
      transition: width 0.3s ease;
    }

    .progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 11px;
      font-weight: 600;
      color: #2c3e50;
    }

    /* Type Badge */
    .type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .type-badge.amendment {
      background: #fff3e0;
      color: #e67e22;
    }

    .type-badge.supplementary {
      background: #e7f3ff;
      color: #2980b9;
    }

    .type-badge.reallocation {
      background: #f3e5f5;
      color: #9b59b6;
    }

    /* Tracking Feature Card Icons */
    .card-icon.spend-tracking {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .card-icon.utilization {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .card-icon.alerts {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .card-icon.variance-report {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .card-icon.forecast {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
    }

    .card-icon.savings {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }

    /* Utilization Bar */
    .utilization-bar {
      position: relative;
      width: 100%;
      height: 24px;
      background: #e9ecef;
      border-radius: 12px;
      overflow: hidden;
    }

    .utilization-fill {
      height: 100%;
      background: linear-gradient(90deg, #27ae60 0%, #229954 100%);
      transition: width 0.3s ease;
    }

    .utilization-fill.over {
      background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
    }

    .utilization-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 11px;
      font-weight: 600;
      color: #2c3e50;
    }

    /* Utilization Circle */
    .utilization-summary {
      margin: 20px 0;
    }

    .utilization-card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .utilization-card h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .utilization-circle {
      width: 150px;
      height: 150px;
      margin: 0 auto 20px;
      position: relative;
    }

    .circle-progress {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .circle-progress::before {
      content: '';
      position: absolute;
      width: 120px;
      height: 120px;
      background: white;
      border-radius: 50%;
    }

    .circle-text {
      position: relative;
      z-index: 1;
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
    }

    .utilization-details {
      display: flex;
      justify-content: space-around;
      gap: 20px;
      margin-top: 20px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .utilization-details span {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Alert Banners */
    .alert-banners {
      margin-bottom: 20px;
    }

    .alert-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .alert-banner.critical {
      background: #ffeaea;
      border-left: 4px solid #e74c3c;
    }

    .alert-banner.warning {
      background: #fff3e0;
      border-left: 4px solid #f39c12;
    }

    .alert-banner .material-icons {
      font-size: 32px;
    }

    .alert-banner.critical .material-icons {
      color: #e74c3c;
    }

    .alert-banner.warning .material-icons {
      color: #f39c12;
    }

    .alert-content {
      flex: 1;
    }

    .alert-content strong {
      display: block;
      font-size: 16px;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .alert-content p {
      margin: 0;
      font-size: 13px;
      color: #7f8c8d;
    }

    .critical-row {
      background: #ffeaea;
    }

    .status-badge.critical {
      background: #ffeaea;
      color: #e74c3c;
    }

    .status-badge.warning {
      background: #fff3e0;
      color: #f39c12;
    }

    .status-badge.moderate {
      background: #e7f3ff;
      color: #2980b9;
    }

    .status-badge.low {
      background: #e8f8f0;
      color: #27ae60;
    }

    /* Report Summary */
    .report-summary {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .report-summary h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .summary-item label {
      font-size: 12px;
      color: #95a5a6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-item span {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    /* Forecast Comparison */
    .forecast-comparison {
      margin: 20px 0;
    }

    .forecast-comparison h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .comparison-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .comparison-card h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .comparison-card .amount {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    /* Savings Summary */
    .savings-summary {
      margin: 20px 0;
    }

    .savings-card {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      color: white;
      box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
    }

    .savings-card h3 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 500;
    }

    .savings-card .amount {
      margin: 0 0 8px 0;
      font-size: 36px;
      font-weight: 700;
    }

    .savings-card .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
  `]
})
export class BudgetManagementComponent implements OnInit {
  activeTab: 'planning' | 'tracking' = 'planning';
  
  // Budget Planning
  budgets: Budget[] = [];
  planningFilterYear: string = '';
  planningFilterStatus: string = '';
  planningSearchQuery: string = '';
  financialYears: string[] = [];
  
  // Budget Tracking
  trackingFilterBudget: string = '';
  trackingFilterCategory: string = '';
  trackingFilterMonth: string = '';
  activeBudgets: Budget[] = [];
  allCategories: BudgetCategory[] = [];
  
  // Modals
  showCreateBudget: boolean = false;
  editingBudget: Budget | null = null;
  showCategoryBudget: boolean = false;
  showAddCategory: boolean = false;
  showDepartmentAllocation: boolean = false;
  showAddDepartment: boolean = false;
  showQuarterBreakdown: boolean = false;
  showBudgetRevision: boolean = false;
  showRequestRevision: boolean = false;
  showApprovalWorkflow: boolean = false;
  
  // New Budget Form
  newBudget: Partial<Budget> = {
    name: '',
    financialYear: '',
    status: 'draft',
    totalBudget: 0,
    totalActual: 0,
    variance: 0,
    variancePercentage: 0,
    createdBy: 'Current User',
    categories: []
  };
  newBudgetStartDateString: string = '';
  newBudgetEndDateString: string = '';

  // Category Budget
  selectedBudgetForCategory: string = '';
  editingCategory: BudgetCategory | null = null;
  newCategory: Partial<BudgetCategory> = {
    name: '',
    code: '',
    budgetedAmount: 0,
    actualAmount: 0,
    variance: 0,
    variancePercentage: 0,
    items: []
  };

  // Department Allocation
  departments: Department[] = [];
  selectedBudgetForDepartment: string = '';
  editingDepartment: Department | null = null;
  newDepartment: Partial<Department> = {
    name: '',
    code: '',
    budgetAllocation: 0,
    actualSpent: 0,
    variance: 0
  };

  // Quarter Breakdown
  selectedBudgetForQuarter: string = '';

  // Budget Revisions
  budgetRevisions: BudgetRevision[] = [];
  revisionFilterStatus: string = '';
  editingRevision: BudgetRevision | null = null;
  newRevision: Partial<BudgetRevision> = {
    revisionType: 'amendment',
    reason: '',
    requestedBy: 'Current User',
    status: 'pending',
    changes: [],
    totalChange: 0
  };

  // Approval Workflows
  approvalWorkflows: ApprovalWorkflow[] = [];
  approvalFilterStatus: string = '';

  // Tracking Features
  showSpendTracking: boolean = false;
  showUtilizationPercentage: boolean = false;
  showOverBudgetAlerts: boolean = false;
  showVarianceReports: boolean = false;
  showForecastAnalysis: boolean = false;
  showSavingsIdentification: boolean = false;

  // Spend Tracking
  spendTrackingBudget: string = '';
  spendTrackingPeriod: string = 'monthly';

  // Utilization
  utilizationBudget: string = '';

  // Variance Reports
  varianceReportBudget: string = '';
  varianceReportType: string = 'summary';
  varianceReportData: any = null;

  // Forecast Analysis
  forecastBudget: string = '';
  forecastData: any = null;

  // Savings
  savingsBudget: string = '';

  ngOnInit(): void {
    this.loadSampleData();
    this.initializeFinancialYears();
  }

  /**
   * Load sample budget data
   */
  loadSampleData(): void {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Sample budgets
    this.budgets = [
      {
        id: 'budget-1',
        name: 'Annual Budget 2024-25',
        financialYear: '2024-25',
        startDate: new Date(currentYear, 3, 1), // April 1
        endDate: new Date(currentYear + 1, 2, 31), // March 31
        status: 'active',
        totalBudget: 2500000,
        totalActual: 1850000,
        variance: 650000,
        variancePercentage: 26.0,
        createdBy: 'Admin',
        createdDate: new Date(currentYear, 2, 15),
        approvedBy: 'Board',
        approvedDate: new Date(currentYear, 2, 20),
        description: 'Main annual budget for society operations',
        categories: []
      },
      {
        id: 'budget-2',
        name: 'Maintenance Budget Q1 2024',
        financialYear: '2024-25',
        startDate: new Date(currentYear, 3, 1),
        endDate: new Date(currentYear, 5, 30),
        status: 'closed',
        totalBudget: 600000,
        totalActual: 625000,
        variance: -25000,
        variancePercentage: -4.2,
        createdBy: 'Admin',
        createdDate: new Date(currentYear, 2, 1),
        approvedBy: 'Board',
        approvedDate: new Date(currentYear, 2, 5),
        description: 'Q1 maintenance and repairs budget',
        categories: []
      },
      {
        id: 'budget-3',
        name: 'Annual Budget 2025-26',
        financialYear: '2025-26',
        startDate: new Date(currentYear + 1, 3, 1),
        endDate: new Date(currentYear + 2, 2, 31),
        status: 'draft',
        totalBudget: 2800000,
        totalActual: 0,
        variance: 2800000,
        variancePercentage: 100.0,
        createdBy: 'Admin',
        createdDate: new Date(currentYear, 11, 1),
        description: 'Draft budget for next financial year',
        categories: []
      },
      {
        id: 'budget-4',
        name: 'Infrastructure Budget 2024-25',
        financialYear: '2024-25',
        startDate: new Date(currentYear, 3, 1),
        endDate: new Date(currentYear + 1, 2, 31),
        status: 'approved',
        totalBudget: 1200000,
        totalActual: 0,
        variance: 1200000,
        variancePercentage: 100.0,
        createdBy: 'Admin',
        createdDate: new Date(currentYear, 2, 10),
        approvedBy: 'Board',
        approvedDate: new Date(currentYear, 2, 25),
        description: 'Infrastructure improvements and upgrades',
        categories: []
      }
    ];

    // Update active budgets for tracking
    this.updateActiveBudgets();
  }

  /**
   * Initialize financial years list
   */
  initializeFinancialYears(): void {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      years.push(`${year}-${String(year + 1).slice(-2)}`);
    }
    this.financialYears = years;
  }

  /**
   * Update active budgets list
   */
  updateActiveBudgets(): void {
    this.activeBudgets = this.budgets.filter(b => b.status === 'active');
    // Collect all categories from active budgets
    this.allCategories = [];
    this.activeBudgets.forEach(budget => {
      if (budget.categories) {
        this.allCategories.push(...budget.categories);
      }
    });
  }

  /**
   * Get filtered budgets for planning tab
   */
  getFilteredBudgets(): Budget[] {
    let filtered = [...this.budgets];

    if (this.planningFilterYear) {
      filtered = filtered.filter(b => b.financialYear === this.planningFilterYear);
    }

    if (this.planningFilterStatus) {
      filtered = filtered.filter(b => b.status === this.planningFilterStatus);
    }

    if (this.planningSearchQuery) {
      const query = this.planningSearchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(query) ||
        b.financialYear.toLowerCase().includes(query) ||
        (b.description && b.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }

  /**
   * Get filtered tracking items
   */
  getFilteredTrackingItems(): BudgetItem[] {
    // This would normally come from active budgets
    // For now, return empty array as we need to populate budget items
    return [];
  }

  /**
   * Filter budgets
   */
  filterBudgets(): void {
    // Filtering is handled by getFilteredBudgets()
  }

  /**
   * Filter tracking data
   */
  filterTracking(): void {
    // Filtering is handled by getFilteredTrackingItems()
  }

  /**
   * Get total budgets amount
   */
  getTotalBudgets(): number {
    return this.budgets.reduce((sum, b) => sum + b.totalBudget, 0);
  }

  /**
   * Get active budgets count
   */
  getActiveBudgetsCount(): number {
    return this.budgets.filter(b => b.status === 'active').length;
  }

  /**
   * Get draft budgets count
   */
  getDraftBudgetsCount(): number {
    return this.budgets.filter(b => b.status === 'draft').length;
  }

  /**
   * Get approved budgets count
   */
  getApprovedBudgetsCount(): number {
    return this.budgets.filter(b => b.status === 'approved').length;
  }

  /**
   * Get total budgeted amount
   */
  getTotalBudgeted(): number {
    return this.activeBudgets.reduce((sum, b) => sum + b.totalBudget, 0);
  }

  /**
   * Get total actual amount
   */
  getTotalActual(): number {
    return this.activeBudgets.reduce((sum, b) => sum + b.totalActual, 0);
  }

  /**
   * Get total variance
   */
  getTotalVariance(): number {
    return this.getTotalBudgeted() - this.getTotalActual();
  }

  /**
   * Get total variance percentage
   */
  getTotalVariancePercentage(): number {
    const total = this.getTotalBudgeted();
    if (total === 0) return 0;
    return (this.getTotalVariance() / total) * 100;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number {
    return this.getTotalVariance();
  }

  /**
   * Get category name by ID
   */
  getCategoryName(categoryId: string): string {
    const category = this.allCategories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  }

  /**
   * Get tracking status for item
   */
  getTrackingStatus(item: BudgetItem): string {
    if (item.variancePercentage > 10) return 'over-budget';
    if (item.variancePercentage < -10) return 'under-budget';
    return 'on-track';
  }

  /**
   * View budget details
   */
  viewBudget(budget: Budget): void {
    // Open budget details modal
    alert(`Viewing budget: ${budget.name}`);
  }

  /**
   * Edit budget
   */
  editBudget(budget: Budget): void {
    this.editingBudget = budget;
    this.newBudget = { ...budget };
    this.newBudgetStartDateString = this.formatDateForInput(budget.startDate);
    this.newBudgetEndDateString = this.formatDateForInput(budget.endDate);
    this.showCreateBudget = true;
  }

  /**
   * Approve budget
   */
  approveBudget(budget: Budget): void {
    if (confirm(`Approve budget "${budget.name}"?`)) {
      budget.status = 'approved';
      budget.approvedBy = 'Current User';
      budget.approvedDate = new Date();
      this.updateActiveBudgets();
      alert('Budget approved successfully');
    }
  }

  /**
   * Activate budget
   */
  activateBudget(budget: Budget): void {
    if (confirm(`Activate budget "${budget.name}"? This will deactivate other active budgets.`)) {
      // Deactivate other active budgets
      this.budgets.forEach(b => {
        if (b.status === 'active' && b.id !== budget.id) {
          b.status = 'closed';
        }
      });
      budget.status = 'active';
      this.updateActiveBudgets();
      alert('Budget activated successfully');
    }
  }

  /**
   * Delete budget
   */
  deleteBudget(budget: Budget): void {
    if (confirm(`Delete budget "${budget.name}"? This action cannot be undone.`)) {
      const index = this.budgets.findIndex(b => b.id === budget.id);
      if (index > -1) {
        this.budgets.splice(index, 1);
        this.updateActiveBudgets();
        alert('Budget deleted successfully');
      }
    }
  }

  /**
   * Save budget
   */
  saveBudget(): void {
    if (!this.newBudget.name || !this.newBudget.financialYear || !this.newBudgetStartDateString || !this.newBudgetEndDateString) {
      alert('Please fill in all required fields');
      return;
    }

    if (this.editingBudget) {
      // Update existing budget
      const index = this.budgets.findIndex(b => b.id === this.editingBudget!.id);
      if (index > -1) {
        this.budgets[index] = {
          ...this.budgets[index],
          name: this.newBudget.name!,
          financialYear: this.newBudget.financialYear!,
          startDate: new Date(this.newBudgetStartDateString),
          endDate: new Date(this.newBudgetEndDateString),
          description: this.newBudget.description
        };
        alert('Budget updated successfully');
      }
    } else {
      // Create new budget
      const newBudget: Budget = {
        id: 'budget-' + Date.now().toString(),
        name: this.newBudget.name!,
        financialYear: this.newBudget.financialYear!,
        startDate: new Date(this.newBudgetStartDateString),
        endDate: new Date(this.newBudgetEndDateString),
        status: 'draft',
        totalBudget: 0,
        totalActual: 0,
        variance: 0,
        variancePercentage: 0,
        createdBy: 'Current User',
        createdDate: new Date(),
        description: this.newBudget.description,
        categories: []
      };
      this.budgets.push(newBudget);
      alert('Budget created successfully');
    }

    this.cancelBudget();
    this.updateActiveBudgets();
  }

  /**
   * Cancel budget creation/edit
   */
  cancelBudget(): void {
    this.showCreateBudget = false;
    this.editingBudget = null;
    this.newBudget = {
      name: '',
      financialYear: '',
      status: 'draft',
      totalBudget: 0,
      totalActual: 0,
      variance: 0,
      variancePercentage: 0,
      createdBy: 'Current User',
      categories: []
    };
    this.newBudgetStartDateString = '';
    this.newBudgetEndDateString = '';
  }

  /**
   * View tracking details
   */
  viewTrackingDetails(item: BudgetItem): void {
    alert(`Viewing tracking details for: ${item.name}`);
  }

  /**
   * Add transaction
   */
  addTransaction(item: BudgetItem): void {
    alert(`Add transaction for: ${item.name}`);
  }

  /**
   * Export report
   */
  exportReport(): void {
    alert('Exporting budget report...');
  }

  /**
   * Export tracking report
   */
  exportTrackingReport(): void {
    alert('Exporting tracking report...');
  }

  /**
   * Go back
   */
  goBack(): void {
    window.history.back();
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
   * Format date for input field
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ========== Category Budget Methods ==========

  /**
   * Get category count
   */
  getCategoryCount(): number {
    return this.allCategories.length;
  }

  /**
   * Load category budget for selected budget
   */
  loadCategoryBudget(): void {
    // Load categories for selected budget
    const budget = this.budgets.find(b => b.id === this.selectedBudgetForCategory);
    if (budget && budget.categories) {
      this.allCategories = budget.categories;
    }
  }

  /**
   * Get category budgets
   */
  getCategoryBudgets(): BudgetCategory[] {
    const budget = this.budgets.find(b => b.id === this.selectedBudgetForCategory);
    return budget ? budget.categories : [];
  }

  /**
   * View category details
   */
  viewCategoryDetails(category: BudgetCategory): void {
    alert(`Viewing category: ${category.name}\nBudgeted: ${this.formatCurrency(category.budgetedAmount)}\nItems: ${category.items.length}`);
  }

  /**
   * Edit category
   */
  editCategory(category: BudgetCategory): void {
    this.editingCategory = category;
    this.newCategory = { ...category };
    this.showAddCategory = true;
  }

  /**
   * Add category item
   */
  addCategoryItem(category: BudgetCategory): void {
    alert(`Add item to category: ${category.name}`);
  }

  /**
   * Save category
   */
  saveCategory(): void {
    if (!this.newCategory.name || !this.newCategory.code || !this.newCategory.budgetedAmount) {
      alert('Please fill in all required fields');
      return;
    }

    const budget = this.budgets.find(b => b.id === this.selectedBudgetForCategory);
    if (!budget) {
      alert('Please select a budget first');
      return;
    }

    if (this.editingCategory) {
      // Update existing category
      const index = budget.categories.findIndex(c => c.id === this.editingCategory!.id);
      if (index > -1) {
        budget.categories[index] = {
          ...budget.categories[index],
          name: this.newCategory.name!,
          code: this.newCategory.code!,
          budgetedAmount: this.newCategory.budgetedAmount!
        };
      }
    } else {
      // Add new category
      const newCategory: BudgetCategory = {
        id: 'cat-' + Date.now().toString(),
        name: this.newCategory.name!,
        code: this.newCategory.code!,
        budgetedAmount: this.newCategory.budgetedAmount!,
        actualAmount: 0,
        variance: this.newCategory.budgetedAmount!,
        variancePercentage: 100,
        items: []
      };
      if (!budget.categories) {
        budget.categories = [];
      }
      budget.categories.push(newCategory);
      budget.totalBudget += newCategory.budgetedAmount;
    }

    this.showAddCategory = false;
    this.editingCategory = null;
    this.newCategory = {
      name: '',
      code: '',
      budgetedAmount: 0,
      actualAmount: 0,
      variance: 0,
      variancePercentage: 0,
      items: []
    };
    this.loadCategoryBudget();
    alert('Category saved successfully');
  }

  // ========== Department Allocation Methods ==========

  /**
   * Load department allocation
   */
  loadDepartmentAllocation(): void {
    // Departments are already loaded in loadSampleData
  }

  /**
   * Get total department allocation
   */
  getTotalDepartmentAllocation(): number {
    return this.departments.reduce((sum, d) => sum + d.budgetAllocation, 0);
  }

  /**
   * Get total department spent
   */
  getTotalDepartmentSpent(): number {
    return this.departments.reduce((sum, d) => sum + d.actualSpent, 0);
  }

  /**
   * Edit department
   */
  editDepartment(dept: Department): void {
    this.editingDepartment = dept;
    this.newDepartment = { ...dept };
    this.showAddDepartment = true;
  }

  /**
   * View department details
   */
  viewDepartmentDetails(dept: Department): void {
    alert(`Department: ${dept.name}\nAllocated: ${this.formatCurrency(dept.budgetAllocation)}\nSpent: ${this.formatCurrency(dept.actualSpent)}\nVariance: ${this.formatCurrency(dept.variance)}`);
  }

  /**
   * Save department
   */
  saveDepartment(): void {
    if (!this.newDepartment.name || !this.newDepartment.code || !this.newDepartment.budgetAllocation) {
      alert('Please fill in all required fields');
      return;
    }

    if (this.editingDepartment) {
      // Update existing department
      const index = this.departments.findIndex(d => d.id === this.editingDepartment!.id);
      if (index > -1) {
        this.departments[index] = {
          ...this.departments[index],
          name: this.newDepartment.name!,
          code: this.newDepartment.code!,
          budgetAllocation: this.newDepartment.budgetAllocation!,
          headOfDepartment: this.newDepartment.headOfDepartment
        };
        this.departments[index].variance = this.departments[index].budgetAllocation - this.departments[index].actualSpent;
      }
    } else {
      // Add new department
      const newDept: Department = {
        id: 'dept-' + Date.now().toString(),
        name: this.newDepartment.name!,
        code: this.newDepartment.code!,
        budgetAllocation: this.newDepartment.budgetAllocation!,
        actualSpent: 0,
        variance: this.newDepartment.budgetAllocation!,
        headOfDepartment: this.newDepartment.headOfDepartment
      };
      this.departments.push(newDept);
    }

    this.showAddDepartment = false;
    this.editingDepartment = null;
    this.newDepartment = {
      name: '',
      code: '',
      budgetAllocation: 0,
      actualSpent: 0,
      variance: 0
    };
    alert('Department saved successfully');
  }

  // ========== Quarter Breakdown Methods ==========

  /**
   * Load quarter breakdown
   */
  loadQuarterBreakdown(): void {
    // Quarter breakdown is calculated on the fly
  }

  /**
   * Get quarter breakdown
   */
  getQuarterBreakdown(): any[] {
    const budget = this.budgets.find(b => b.id === this.selectedBudgetForQuarter);
    if (!budget) return [];

    const quarters = [
      { name: 'Q1', period: 'Apr - Jun', startMonth: 3, endMonth: 5 },
      { name: 'Q2', period: 'Jul - Sep', startMonth: 6, endMonth: 8 },
      { name: 'Q3', period: 'Oct - Dec', startMonth: 9, endMonth: 11 },
      { name: 'Q4', period: 'Jan - Mar', startMonth: 0, endMonth: 2 }
    ];

    return quarters.map(q => {
      const budgeted = budget.totalBudget / 4;
      const actual = budget.totalActual / 4; // Simplified
      const variance = budgeted - actual;
      const percentage = budget.totalBudget > 0 ? (variance / budgeted) * 100 : 0;

      return {
        ...q,
        budgeted,
        actual,
        variance,
        percentage
      };
    });
  }

  /**
   * View quarter details
   */
  viewQuarterDetails(quarter: any): void {
    alert(`Quarter: ${quarter.name} (${quarter.period})\nBudgeted: ${this.formatCurrency(quarter.budgeted)}\nActual: ${this.formatCurrency(quarter.actual)}\nVariance: ${this.formatCurrency(quarter.variance)}`);
  }

  // ========== Budget Revision Methods ==========

  /**
   * Get pending revisions count
   */
  getPendingRevisionsCount(): number {
    return this.budgetRevisions.filter(r => r.status === 'pending').length;
  }

  /**
   * Filter revisions
   */
  filterRevisions(): void {
    // Filtering is handled by getFilteredRevisions()
  }

  /**
   * Get filtered revisions
   */
  getFilteredRevisions(): BudgetRevision[] {
    if (!this.revisionFilterStatus) {
      return this.budgetRevisions;
    }
    return this.budgetRevisions.filter(r => r.status === this.revisionFilterStatus);
  }

  /**
   * View revision details
   */
  viewRevisionDetails(revision: BudgetRevision): void {
    let details = `Revision: ${revision.budgetName}\nType: ${revision.revisionType}\nReason: ${revision.reason}\n\nChanges:\n`;
    revision.changes.forEach(change => {
      details += `${change.categoryName}: ${this.formatCurrency(change.oldAmount)} → ${this.formatCurrency(change.newAmount)}\n`;
    });
    alert(details);
  }

  /**
   * Approve revision
   */
  approveRevision(revision: BudgetRevision): void {
    if (confirm(`Approve revision for ${revision.budgetName}?`)) {
      revision.status = 'approved';
      revision.approvedBy = 'Current User';
      revision.approvedDate = new Date();
      alert('Revision approved successfully');
    }
  }

  /**
   * Reject revision
   */
  rejectRevision(revision: BudgetRevision): void {
    if (confirm(`Reject revision for ${revision.budgetName}?`)) {
      revision.status = 'rejected';
      alert('Revision rejected');
    }
  }

  /**
   * Save revision request
   */
  saveRevision(): void {
    if (!this.newRevision.budgetId || !this.newRevision.reason) {
      alert('Please fill in all required fields');
      return;
    }

    const budget = this.budgets.find(b => b.id === this.newRevision.budgetId);
    if (!budget) {
      alert('Please select a valid budget');
      return;
    }

    const newRevision: BudgetRevision = {
      id: 'rev-' + Date.now().toString(),
      budgetId: this.newRevision.budgetId!,
      budgetName: budget.name,
      revisionType: this.newRevision.revisionType!,
      reason: this.newRevision.reason!,
      requestedBy: 'Current User',
      requestedDate: new Date(),
      status: 'pending',
      changes: [],
      totalChange: 0
    };

    this.budgetRevisions.push(newRevision);
    this.showRequestRevision = false;
    this.newRevision = {
      revisionType: 'amendment',
      reason: '',
      requestedBy: 'Current User',
      status: 'pending',
      changes: [],
      totalChange: 0
    };
    alert('Revision request submitted successfully');
  }

  // ========== Approval Workflow Methods ==========

  /**
   * Get pending approvals count
   */
  getPendingApprovalsCount(): number {
    return this.approvalWorkflows.filter(w => w.status === 'pending' || w.status === 'in-progress').length;
  }

  /**
   * Filter approvals
   */
  filterApprovals(): void {
    // Filtering is handled by getFilteredApprovals()
  }

  /**
   * Get filtered approvals
   */
  getFilteredApprovals(): ApprovalWorkflow[] {
    if (!this.approvalFilterStatus) {
      return this.approvalWorkflows;
    }
    return this.approvalWorkflows.filter(w => w.status === this.approvalFilterStatus);
  }

  /**
   * Get approval progress
   */
  getApprovalProgress(workflow: ApprovalWorkflow): number {
    const totalStages = workflow.stages.length;
    const completedStages = workflow.stages.filter(s => s.status === 'approved').length;
    return Math.round((completedStages / totalStages) * 100);
  }

  /**
   * View workflow details
   */
  viewWorkflowDetails(workflow: ApprovalWorkflow): void {
    let details = `Workflow: ${workflow.budgetName}\nCurrent Stage: ${workflow.currentStage}\n\nStages:\n`;
    workflow.stages.forEach(stage => {
      details += `${stage.stage} (${stage.approverRole}): ${stage.status}\n`;
    });
    alert(details);
  }

  /**
   * Approve workflow stage
   */
  approveWorkflowStage(workflow: ApprovalWorkflow): void {
    const currentStage = workflow.stages.find(s => s.status === 'pending');
    if (!currentStage) {
      alert('No pending stage to approve');
      return;
    }

    if (confirm(`Approve ${currentStage.stage}?`)) {
      currentStage.status = 'approved';
      currentStage.actionDate = new Date();
      
      const nextStage = workflow.stages.find(s => s.order === currentStage.order + 1);
      if (nextStage) {
        workflow.currentStage = nextStage.stage;
      } else {
        workflow.status = 'approved';
        workflow.completedDate = new Date();
        workflow.currentStage = 'Completed';
      }
      alert('Stage approved successfully');
    }
  }

  // ========== Spend Tracking Methods ==========

  /**
   * Load spend tracking data
   */
  loadSpendTracking(): void {
    // Data is loaded on the fly
  }

  /**
   * Get spend tracking budgeted amount
   */
  getSpendTrackingBudgeted(): number {
    if (!this.spendTrackingBudget) return this.getTotalBudgeted();
    const budget = this.budgets.find(b => b.id === this.spendTrackingBudget);
    return budget ? budget.totalBudget : 0;
  }

  /**
   * Get spend tracking actual amount
   */
  getSpendTrackingActual(): number {
    if (!this.spendTrackingBudget) return this.getTotalActual();
    const budget = this.budgets.find(b => b.id === this.spendTrackingBudget);
    return budget ? budget.totalActual : 0;
  }

  /**
   * Get spend tracking remaining
   */
  getSpendTrackingRemaining(): number {
    return this.getSpendTrackingBudgeted() - this.getSpendTrackingActual();
  }

  /**
   * Get spend tracking items
   */
  getSpendTrackingItems(): any[] {
    const items: any[] = [];
    
    // Add category items
    this.allCategories.forEach(cat => {
      const utilization = cat.budgetedAmount > 0 ? (cat.actualAmount / cat.budgetedAmount) * 100 : 0;
      items.push({
        name: cat.name,
        budgeted: cat.budgetedAmount,
        actual: cat.actualAmount,
        variance: cat.budgetedAmount - cat.actualAmount,
        utilization: utilization
      });
    });

    // Add department items
    this.departments.forEach(dept => {
      const utilization = dept.budgetAllocation > 0 ? (dept.actualSpent / dept.budgetAllocation) * 100 : 0;
      items.push({
        name: dept.name + ' (Dept)',
        budgeted: dept.budgetAllocation,
        actual: dept.actualSpent,
        variance: dept.variance,
        utilization: utilization
      });
    });

    return items;
  }

  /**
   * Get spend tracking status
   */
  getSpendTrackingStatus(item: any): string {
    if (item.utilization > 100) return 'over-budget';
    if (item.utilization > 80) return 'warning';
    return 'on-track';
  }

  // ========== Utilization Methods ==========

  /**
   * Get overall utilization percentage
   */
  getOverallUtilization(): number {
    const total = this.getTotalBudgeted();
    if (total === 0) return 0;
    return (this.getTotalActual() / total) * 100;
  }

  /**
   * Load utilization data
   */
  loadUtilization(): void {
    // Data is loaded on the fly
  }

  /**
   * Get utilization items
   */
  getUtilizationItems(): any[] {
    const items: any[] = [];
    
    this.allCategories.forEach(cat => {
      const utilization = cat.budgetedAmount > 0 ? (cat.actualAmount / cat.budgetedAmount) * 100 : 0;
      items.push({
        name: cat.name,
        budgeted: cat.budgetedAmount,
        actual: cat.actualAmount,
        utilization: utilization,
        remaining: cat.budgetedAmount - cat.actualAmount
      });
    });

    this.departments.forEach(dept => {
      const utilization = dept.budgetAllocation > 0 ? (dept.actualSpent / dept.budgetAllocation) * 100 : 0;
      items.push({
        name: dept.name + ' (Dept)',
        budgeted: dept.budgetAllocation,
        actual: dept.actualSpent,
        utilization: utilization,
        remaining: dept.variance
      });
    });

    return items;
  }

  /**
   * Get utilization status
   */
  getUtilizationStatus(item: any): string {
    if (item.utilization > 100) return 'over-budget';
    if (item.utilization > 80) return 'warning';
    if (item.utilization > 50) return 'moderate';
    return 'low';
  }

  /**
   * Get utilization circle color
   */
  getUtilizationCircleColor(): string {
    const utilization = this.getOverallUtilization();
    if (utilization > 100) return 'conic-gradient(#e74c3c 0deg ' + (utilization * 3.6) + 'deg, #e9ecef ' + (utilization * 3.6) + 'deg 360deg)';
    if (utilization > 80) return 'conic-gradient(#f39c12 0deg ' + (utilization * 3.6) + 'deg, #e9ecef ' + (utilization * 3.6) + 'deg 360deg)';
    return 'conic-gradient(#27ae60 0deg ' + (utilization * 3.6) + 'deg, #e9ecef ' + (utilization * 3.6) + 'deg 360deg)';
  }

  // ========== Over-budget Alerts Methods ==========

  /**
   * Get over-budget count
   */
  getOverBudgetCount(): number {
    return this.getOverBudgetAlerts().length;
  }

  /**
   * Get over-budget alerts
   */
  getOverBudgetAlerts(): any[] {
    const alerts: any[] = [];
    
    this.allCategories.forEach(cat => {
      if (cat.actualAmount > cat.budgetedAmount) {
        const overBudget = cat.actualAmount - cat.budgetedAmount;
        const utilization = (cat.actualAmount / cat.budgetedAmount) * 100;
        alerts.push({
          name: cat.name,
          budgeted: cat.budgetedAmount,
          actual: cat.actualAmount,
          overBudget: overBudget,
          utilization: utilization,
          severity: utilization > 120 ? 'critical' : 'warning'
        });
      }
    });

    this.departments.forEach(dept => {
      if (dept.actualSpent > dept.budgetAllocation) {
        const overBudget = dept.actualSpent - dept.budgetAllocation;
        const utilization = (dept.actualSpent / dept.budgetAllocation) * 100;
        alerts.push({
          name: dept.name + ' (Dept)',
          budgeted: dept.budgetAllocation,
          actual: dept.actualSpent,
          overBudget: overBudget,
          utilization: utilization,
          severity: utilization > 120 ? 'critical' : 'warning'
        });
      }
    });

    return alerts.sort((a, b) => b.overBudget - a.overBudget);
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): any[] {
    return this.getOverBudgetAlerts().filter(a => a.severity === 'critical');
  }

  /**
   * Get warning alerts
   */
  getWarningAlerts(): any[] {
    return this.getOverBudgetAlerts().filter(a => a.severity === 'warning');
  }

  /**
   * View alert details
   */
  viewAlertDetails(alert: any): void {
    alert(`Alert Details:\nItem: ${alert.name}\nBudgeted: ${this.formatCurrency(alert.budgeted)}\nActual: ${this.formatCurrency(alert.actual)}\nOver-budget: ${this.formatCurrency(alert.overBudget)}\nUtilization: ${alert.utilization.toFixed(1)}%`);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alert: any): void {
    alert(`Alert for ${alert.name} acknowledged`);
  }

  // ========== Variance Reports Methods ==========

  /**
   * Generate variance report
   */
  generateVarianceReport(): void {
    if (!this.varianceReportBudget) {
      this.varianceReportData = null;
      return;
    }

    const budget = this.budgets.find(b => b.id === this.varianceReportBudget);
    if (!budget) {
      this.varianceReportData = null;
      return;
    }

    const items: any[] = [];
    
    if (budget.categories) {
      budget.categories.forEach(cat => {
        items.push({
          name: cat.name,
          budgeted: cat.budgetedAmount,
          actual: cat.actualAmount,
          variance: cat.variance,
          variancePercentage: cat.variancePercentage
        });
      });
    }

    this.varianceReportData = {
      totalBudgeted: budget.totalBudget,
      totalActual: budget.totalActual,
      totalVariance: budget.variance,
      variancePercentage: budget.variancePercentage,
      items: items
    };
  }

  /**
   * Get variance status
   */
  getVarianceStatus(item: any): string {
    if (item.variancePercentage > 10) return 'over-budget';
    if (item.variancePercentage < -10) return 'under-budget';
    return 'on-track';
  }

  /**
   * Export variance report
   */
  exportVarianceReport(): void {
    if (!this.varianceReportData) {
      alert('Please generate a report first');
      return;
    }
    alert('Exporting variance report...');
  }

  // ========== Forecast Analysis Methods ==========

  /**
   * Load forecast analysis
   */
  loadForecastAnalysis(): void {
    if (!this.forecastBudget) {
      this.forecastData = null;
      return;
    }

    const budget = this.budgets.find(b => b.id === this.forecastBudget);
    if (!budget) {
      this.forecastData = null;
      return;
    }

    // Simulate forecast data
    const forecasted = budget.totalBudget * 0.95; // 95% of budget
    const actual = budget.totalActual;
    const difference = forecasted - actual;
    const accuracy = forecasted > 0 ? (1 - Math.abs(difference) / forecasted) * 100 : 0;

    const items: any[] = [];
    if (budget.categories) {
      budget.categories.forEach(cat => {
        const catForecast = cat.budgetedAmount * 0.95;
        const catDiff = catForecast - cat.actualAmount;
        const catAccuracy = catForecast > 0 ? (1 - Math.abs(catDiff) / catForecast) * 100 : 0;
        items.push({
          name: cat.name,
          forecasted: catForecast,
          actual: cat.actualAmount,
          difference: catDiff,
          accuracy: catAccuracy,
          trend: catDiff > 0 ? 'down' : catDiff < 0 ? 'up' : 'flat'
        });
      });
    }

    this.forecastData = {
      forecasted: forecasted,
      actual: actual,
      difference: difference,
      accuracy: accuracy,
      items: items
    };
  }

  // ========== Savings Identification Methods ==========

  /**
   * Get total savings
   */
  getTotalSavings(): number {
    return this.getSavingsItems().reduce((sum, item) => sum + item.savings, 0);
  }

  /**
   * Load savings identification
   */
  loadSavingsIdentification(): void {
    // Data is loaded on the fly
  }

  /**
   * Get savings items
   */
  getSavingsItems(): any[] {
    const items: any[] = [];
    
    this.allCategories.forEach(cat => {
      if (cat.actualAmount < cat.budgetedAmount) {
        const savings = cat.budgetedAmount - cat.actualAmount;
        const savingsPercentage = (savings / cat.budgetedAmount) * 100;
        const utilization = (cat.actualAmount / cat.budgetedAmount) * 100;
        items.push({
          name: cat.name,
          budgeted: cat.budgetedAmount,
          actual: cat.actualAmount,
          savings: savings,
          savingsPercentage: savingsPercentage,
          utilization: utilization
        });
      }
    });

    this.departments.forEach(dept => {
      if (dept.actualSpent < dept.budgetAllocation) {
        const savings = dept.budgetAllocation - dept.actualSpent;
        const savingsPercentage = (savings / dept.budgetAllocation) * 100;
        const utilization = (dept.actualSpent / dept.budgetAllocation) * 100;
        items.push({
          name: dept.name + ' (Dept)',
          budgeted: dept.budgetAllocation,
          actual: dept.actualSpent,
          savings: savings,
          savingsPercentage: savingsPercentage,
          utilization: utilization
        });
      }
    });

    return items.sort((a, b) => b.savings - a.savings);
  }

  /**
   * View savings details
   */
  viewSavingsDetails(item: any): void {
    alert(`Savings Details:\nItem: ${item.name}\nBudgeted: ${this.formatCurrency(item.budgeted)}\nActual: ${this.formatCurrency(item.actual)}\nSavings: ${this.formatCurrency(item.savings)}\nSavings %: ${item.savingsPercentage.toFixed(1)}%`);
  }

  /**
   * Reallocate savings
   */
  reallocateSavings(item: any): void {
    alert(`Reallocate savings from ${item.name}?`);
  }
}
