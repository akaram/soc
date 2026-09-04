import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Auto-pay/Recurring Payments Component
 * Handles automatic recurring payments for bills and invoices
 */
interface AutoPayRule {
  id: string;
  name: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodType: 'card' | 'upi' | 'net_banking' | 'wallet';
  paymentMethodMasked: string;
  billType: 'maintenance' | 'utility' | 'service' | 'all';
  frequency: 'monthly' | 'quarterly' | 'annually' | 'custom';
  customDays?: number; // For custom frequency
  paymentDay: number; // Day of month to process payment (1-31)
  startDate: Date;
  endDate?: Date;
  maxAmount?: number; // Maximum amount to auto-pay
  minAmount?: number; // Minimum amount to auto-pay
  isActive: boolean;
  autoRetry: boolean;
  retryAttempts: number;
  retryInterval: number; // Days between retries
  notifyOnPayment: boolean;
  notifyOnFailure: boolean;
  lastProcessed?: Date;
  nextPaymentDate: Date;
  totalPayments: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AutoPayTransaction {
  id: string;
  ruleId: string;
  ruleName: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billId?: string;
  billNumber?: string;
  amount: number;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentDate?: Date;
  scheduledDate: Date;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  failureReason?: string;
  retryCount: number;
  transactionId?: string;
  createdAt: Date;
}

@Component({
  selector: 'app-auto-pay-recurring',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="auto-pay-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">autorenew</i>
            Auto-pay / Recurring Payments
          </h1>
          <p>Set up and manage automatic recurring payments for bills and invoices</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showScheduledPayments = true" title="Scheduled Payments">
            <i class="material-icons">schedule</i>
            Scheduled
          </button>
          <button class="icon-btn primary" (click)="showCreateRule = true" title="Create Auto-pay Rule">
            <i class="material-icons">add</i>
            Create Rule
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">rule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activeRulesCount }}</div>
            <div class="stat-label">Active Rules</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ completedPaymentsCount }}</div>
            <div class="stat-label">Completed Payments</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ scheduledPaymentsCount }}</div>
            <div class="stat-label">Scheduled</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalAutoPayAmount) }}</div>
            <div class="stat-label">Total Auto-paid</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'rules'"
            (click)="activeTab = 'rules'"
          >
            <i class="material-icons">rule</i>
            Auto-pay Rules
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'transactions'"
            (click)="activeTab = 'transactions'"
          >
            <i class="material-icons">history</i>
            Payment History
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'scheduled'"
            (click)="activeTab = 'scheduled'"
          >
            <i class="material-icons">schedule</i>
            Scheduled Payments
          </button>
        </div>
      </div>

      <!-- Rules Tab -->
      <div class="content-section" *ngIf="activeTab === 'rules'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by rule name, resident..." 
              [(ngModel)]="searchQuery"
              (input)="filterRules()"
            />
          </div>
          <select [(ngModel)]="statusFilter" (change)="filterRules()" class="filter-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select [(ngModel)]="billTypeFilter" (change)="filterRules()" class="filter-select">
            <option value="all">All Bill Types</option>
            <option value="maintenance">Maintenance</option>
            <option value="utility">Utility</option>
            <option value="service">Service</option>
            <option value="all">All Bills</option>
          </select>
        </div>

        <!-- Rules Grid -->
        <div class="rules-grid">
          <div *ngFor="let rule of filteredRules" class="rule-card" [class.inactive]="!rule.isActive">
            <div class="rule-header">
              <div class="rule-title">
                <h3>{{ rule.name }}</h3>
                <span class="rule-badge" [ngClass]="rule.billType">
                  {{ getBillTypeLabel(rule.billType) }}
                </span>
              </div>
              <div class="rule-status">
                <span class="status-badge" [ngClass]="rule.isActive ? 'active' : 'inactive'">
                  {{ rule.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
            <div class="rule-details">
              <div class="detail-item">
                <i class="material-icons">person</i>
                <span>{{ rule.residentName }} - {{ rule.flatNumber }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">credit_card</i>
                <span>{{ rule.paymentMethodName }} ({{ rule.paymentMethodMasked }})</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">schedule</i>
                <span>Frequency: {{ getFrequencyLabel(rule.frequency) }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">calendar_today</i>
                <span>Payment Day: {{ rule.paymentDay }} of month</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">event</i>
                <span>Next Payment: {{ formatDate(rule.nextPaymentDate) }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">payments</i>
                <span>Total Payments: {{ rule.totalPayments }} ({{ formatCurrency(rule.totalAmount) }})</span>
              </div>
            </div>
            <div class="rule-actions">
              <button class="action-btn view" (click)="viewRule(rule)" title="View Details">
                <i class="material-icons">visibility</i>
                View
              </button>
              <button class="action-btn edit" (click)="editRule(rule)" title="Edit">
                <i class="material-icons">edit</i>
                Edit
              </button>
              <button class="action-btn toggle" (click)="toggleRule(rule)" [title]="rule.isActive ? 'Deactivate' : 'Activate'">
                <i class="material-icons">{{ rule.isActive ? 'pause' : 'play_arrow' }}</i>
                {{ rule.isActive ? 'Deactivate' : 'Activate' }}
              </button>
              <button class="action-btn delete" (click)="deleteRule(rule)" title="Delete">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredRules.length === 0">
          <i class="material-icons">rule</i>
          <p>No auto-pay rules found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showCreateRule = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Create First Rule
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
              placeholder="Search by transaction, resident..." 
              [(ngModel)]="transactionSearchQuery"
              (input)="filterTransactions()"
            />
          </div>
          <select [(ngModel)]="transactionStatusFilter" (change)="filterTransactions()" class="filter-select">
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <!-- Transactions Table -->
        <div class="transactions-table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Resident</th>
                <th>Invoice/Bill</th>
                <th>Amount</th>
                <th>Scheduled Date</th>
                <th>Payment Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let transaction of filteredTransactions">
                <td>
                  <strong>{{ transaction.ruleName }}</strong>
                </td>
                <td>
                  <div class="resident-info">
                    <div class="resident-name">{{ transaction.residentName }}</div>
                    <div class="resident-flat">{{ transaction.flatNumber }}</div>
                  </div>
                </td>
                <td>
                  <span *ngIf="transaction.invoiceNumber">{{ transaction.invoiceNumber }}</span>
                  <span *ngIf="transaction.billNumber">{{ transaction.billNumber }}</span>
                  <span *ngIf="!transaction.invoiceNumber && !transaction.billNumber">-</span>
                </td>
                <td class="amount">{{ formatCurrency(transaction.amount) }}</td>
                <td>{{ formatDate(transaction.scheduledDate) }}</td>
                <td>
                  <span *ngIf="transaction.paymentDate">{{ formatDate(transaction.paymentDate) }}</span>
                  <span *ngIf="!transaction.paymentDate">-</span>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="transaction.status">
                    {{ getTransactionStatusLabel(transaction.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewTransaction(transaction)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn retry" (click)="retryPayment(transaction)" title="Retry" *ngIf="transaction.status === 'failed'">
                      <i class="material-icons">refresh</i>
                    </button>
                    <button class="action-btn cancel" (click)="cancelPayment(transaction)" title="Cancel" *ngIf="transaction.status === 'scheduled'">
                      <i class="material-icons">cancel</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredTransactions.length === 0">
            <i class="material-icons">history</i>
            <p>No payment transactions found</p>
          </div>
        </div>
      </div>

      <!-- Scheduled Payments Tab -->
      <div class="content-section" *ngIf="activeTab === 'scheduled'">
        <div class="scheduled-payments-grid">
          <div *ngFor="let payment of scheduledPayments" class="scheduled-card">
            <div class="scheduled-header">
              <h3>{{ payment.ruleName }}</h3>
              <span class="days-badge" [ngClass]="getDaysUntilClass(payment.daysUntil)">
                {{ payment.daysUntil }} days
              </span>
            </div>
            <div class="scheduled-details">
              <div class="detail-item">
                <span class="label">Resident:</span>
                <span class="value">{{ payment.residentName }} - {{ payment.flatNumber }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Amount:</span>
                <span class="value amount">{{ formatCurrency(payment.amount) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Payment Date:</span>
                <span class="value">{{ formatDate(payment.scheduledDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Payment Method:</span>
                <span class="value">{{ payment.paymentMethodName }}</span>
              </div>
            </div>
            <div class="scheduled-actions">
              <button class="btn btn-secondary" (click)="cancelScheduledPayment(payment)">Cancel</button>
              <button class="btn btn-primary" (click)="processPaymentNow(payment)">Process Now</button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="scheduledPayments.length === 0">
          <i class="material-icons">schedule</i>
          <p>No scheduled payments</p>
        </div>
      </div>

      <!-- Create/Edit Rule Modal -->
      <div class="modal-overlay" *ngIf="showCreateRule || editingRule" (click)="closeRuleModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingRule ? 'Edit Auto-pay Rule' : 'Create Auto-pay Rule' }}</h2>
            <button class="close-btn" (click)="closeRuleModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-group">
                <label>Rule Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newRule.name" placeholder="e.g., Monthly Maintenance Auto-pay" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Resident/Flat <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newRule.flatNumber" placeholder="e.g., A-101" required />
                </div>
                <div class="form-group">
                  <label>Resident Name</label>
                  <input type="text" [(ngModel)]="newRule.residentName" placeholder="Resident name" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Bill Type <span class="required">*</span></label>
                  <select [(ngModel)]="newRule.billType" required>
                    <option value="">Select Type</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="utility">Utility</option>
                    <option value="service">Service</option>
                    <option value="all">All Bills</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Payment Method <span class="required">*</span></label>
                  <select [(ngModel)]="newRule.paymentMethodId" required>
                    <option value="">Select Payment Method</option>
                    <option *ngFor="let method of availablePaymentMethods" [value]="method.id">
                      {{ method.name }} ({{ method.maskedValue }})
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Frequency <span class="required">*</span></label>
                  <select [(ngModel)]="newRule.frequency" (change)="onFrequencyChange()" required>
                    <option value="">Select Frequency</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div class="form-group" *ngIf="newRule.frequency === 'custom'">
                  <label>Custom Days <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newRule.customDays" min="1" placeholder="Number of days" required />
                </div>
                <div class="form-group">
                  <label>Payment Day <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newRule.paymentDay" min="1" max="31" placeholder="Day of month (1-31)" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Start Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="startDate" required />
                </div>
                <div class="form-group">
                  <label>End Date (Optional)</label>
                  <input type="date" [(ngModel)]="endDate" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Minimum Amount (Optional)</label>
                  <input type="number" [(ngModel)]="newRule.minAmount" min="0" step="0.01" placeholder="No minimum" />
                </div>
                <div class="form-group">
                  <label>Maximum Amount (Optional)</label>
                  <input type="number" [(ngModel)]="newRule.maxAmount" min="0" step="0.01" placeholder="No maximum" />
                </div>
              </div>

              <div class="form-section-title">Retry Settings</div>
              <div class="form-row">
                <div class="form-group">
                  <label>Auto Retry on Failure</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.autoRetry" id="autoRetry" />
                    <label for="autoRetry"></label>
                  </div>
                </div>
                <div class="form-group" *ngIf="newRule.autoRetry">
                  <label>Retry Attempts</label>
                  <input type="number" [(ngModel)]="newRule.retryAttempts" min="1" max="5" value="3" />
                </div>
                <div class="form-group" *ngIf="newRule.autoRetry">
                  <label>Retry Interval (Days)</label>
                  <input type="number" [(ngModel)]="newRule.retryInterval" min="1" max="7" value="1" />
                </div>
              </div>

              <div class="form-section-title">Notification Settings</div>
              <div class="form-row">
                <div class="form-group">
                  <label>Notify on Payment</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.notifyOnPayment" id="notifyOnPayment" />
                    <label for="notifyOnPayment"></label>
                  </div>
                </div>
                <div class="form-group">
                  <label>Notify on Failure</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.notifyOnFailure" id="notifyOnFailure" />
                    <label for="notifyOnFailure"></label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeRuleModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveRule()" [disabled]="!isRuleValid()">
              <i class="material-icons">save</i>
              {{ editingRule ? 'Update' : 'Create' }} Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auto-pay-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
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
      background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
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
      color: #e67e22;
    }

    .tab.active {
      color: #e67e22;
      border-bottom-color: #e67e22;
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

    /* Rules Grid */
    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .rule-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .rule-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .rule-card.inactive {
      opacity: 0.7;
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .rule-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .rule-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .rule-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .rule-badge.maintenance { background: #e7f3ff; color: #2980b9; }
    .rule-badge.utility { background: #fff4e6; color: #e67e22; }
    .rule-badge.service { background: #e8f8f0; color: #1e9e5a; }
    .rule-badge.all { background: #f4e7ff; color: #8e44ad; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.inactive { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.scheduled { background: #fff4e6; color: #e67e22; }
    .status-badge.processing { background: #e7f3ff; color: #2980b9; }
    .status-badge.completed { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.failed { background: #ffeaea; color: #c0392b; }
    .status-badge.cancelled { background: #f5f7fa; color: #7f8c8d; }

    .rule-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #2c3e50;
    }

    .detail-item i {
      font-size: 18px;
      color: #e67e22;
    }

    .rule-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .action-btn.view { background: #e7f3ff; color: #2980b9; }
    .action-btn.edit { background: #fff4e6; color: #e67e22; }
    .action-btn.toggle { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.delete { background: #ffeaea; color: #c0392b; }
    .action-btn.retry { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.cancel { background: #f5f7fa; color: #7f8c8d; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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

    .resident-info {
      display: flex;
      flex-direction: column;
    }

    .resident-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .resident-flat {
      font-size: 12px;
      color: #7f8c8d;
    }

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .action-buttons .action-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      flex: none;
    }

    /* Scheduled Payments */
    .scheduled-payments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .scheduled-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #e67e22;
    }

    .scheduled-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .scheduled-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .days-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .days-badge.urgent { background: #ffeaea; color: #c0392b; }
    .days-badge.soon { background: #fff4e6; color: #e67e22; }
    .days-badge.upcoming { background: #e7f3ff; color: #2980b9; }

    .scheduled-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .scheduled-details .detail-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }

    .scheduled-details .label {
      color: #7f8c8d;
    }

    .scheduled-details .value {
      color: #2c3e50;
      font-weight: 500;
    }

    .scheduled-details .value.amount {
      font-weight: 600;
      font-size: 16px;
    }

    .scheduled-actions {
      display: flex;
      gap: 8px;
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

    .form-section-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      margin: 16px 0 8px 0;
      padding-top: 16px;
      border-top: 1px solid #e9ecef;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      border-color: #e67e22;
    }

    .toggle-switch {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toggle-switch input[type="checkbox"] {
      width: 48px;
      height: 24px;
      appearance: none;
      background: #ccc;
      border-radius: 24px;
      position: relative;
      cursor: pointer;
      transition: background 0.3s;
    }

    .toggle-switch input[type="checkbox"]:checked {
      background: #e67e22;
    }

    .toggle-switch input[type="checkbox"]::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: white;
      top: 2px;
      left: 2px;
      transition: transform 0.3s;
    }

    .toggle-switch input[type="checkbox"]:checked::before {
      transform: translateX(24px);
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
      background: #e67e22;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #d35400;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
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
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .empty-state span {
      font-size: 12px;
      display: block;
      margin-bottom: 16px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .filters-section {
        flex-direction: column;
      }

      .rules-grid {
        grid-template-columns: 1fr;
      }

      .scheduled-payments-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AutoPayRecurringComponent implements OnInit, OnDestroy {
  rules: AutoPayRule[] = [];
  filteredRules: AutoPayRule[] = [];
  transactions: AutoPayTransaction[] = [];
  filteredTransactions: AutoPayTransaction[] = [];
  scheduledPayments: any[] = [];
  availablePaymentMethods: any[] = [];
  selectedRule: AutoPayRule | null = null;
  editingRule: AutoPayRule | null = null;
  searchQuery: string = '';
  transactionSearchQuery: string = '';
  statusFilter: string = 'all';
  billTypeFilter: string = 'all';
  transactionStatusFilter: string = 'all';
  activeTab: 'rules' | 'transactions' | 'scheduled' = 'rules';
  showCreateRule: boolean = false;
  showScheduledPayments: boolean = false;
  startDate: string = '';
  endDate: string = '';

  newRule: Partial<AutoPayRule> = {
    name: '',
    flatNumber: '',
    residentName: '',
    paymentMethodId: '',
    billType: 'maintenance',
    frequency: 'monthly',
    paymentDay: 1,
    isActive: true,
    autoRetry: true,
    retryAttempts: 3,
    retryInterval: 1,
    notifyOnPayment: true,
    notifyOnFailure: true,
    totalPayments: 0,
    totalAmount: 0
  };

  private destroy$ = new Subject<void>();

  constructor() {
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadRules();
    this.loadTransactions();
    this.loadScheduledPayments();
    this.loadPaymentMethods();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load auto-pay rules
   */
  loadRules(): void {
    this.rules = [
      {
        id: 'rule-1',
        name: 'Monthly Maintenance Auto-pay',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        paymentMethodId: 'method-1',
        paymentMethodName: 'My Primary Card',
        paymentMethodType: 'card',
        paymentMethodMasked: '****1234',
        billType: 'maintenance',
        frequency: 'monthly',
        paymentDay: 5,
        startDate: new Date(2024, 0, 1),
        isActive: true,
        autoRetry: true,
        retryAttempts: 3,
        retryInterval: 1,
        notifyOnPayment: true,
        notifyOnFailure: true,
        lastProcessed: new Date(2024, 1, 5),
        nextPaymentDate: new Date(2024, 2, 5),
        totalPayments: 2,
        totalAmount: 10000,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 1, 5)
      },
      {
        id: 'rule-2',
        name: 'Quarterly Utility Auto-pay',
        residentId: 'res-2',
        residentName: 'Priya Sharma',
        flatNumber: 'B-205',
        paymentMethodId: 'method-2',
        paymentMethodName: 'My UPI',
        paymentMethodType: 'upi',
        paymentMethodMasked: 'pri***@paytm',
        billType: 'utility',
        frequency: 'quarterly',
        paymentDay: 1,
        startDate: new Date(2024, 0, 1),
        isActive: true,
        autoRetry: true,
        retryAttempts: 2,
        retryInterval: 2,
        notifyOnPayment: true,
        notifyOnFailure: true,
        nextPaymentDate: new Date(2024, 3, 1),
        totalPayments: 1,
        totalAmount: 3000,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      }
    ];
    this.filterRules();
  }

  /**
   * Load transactions
   */
  loadTransactions(): void {
    this.transactions = [
      {
        id: 'txn-1',
        ruleId: 'rule-1',
        ruleName: 'Monthly Maintenance Auto-pay',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2024-002',
        amount: 5000,
        paymentMethodId: 'method-1',
        paymentMethodName: 'My Primary Card',
        paymentDate: new Date(2024, 1, 5),
        scheduledDate: new Date(2024, 1, 5),
        status: 'completed',
        retryCount: 0,
        transactionId: 'TXN123456',
        createdAt: new Date(2024, 1, 5)
      },
      {
        id: 'txn-2',
        ruleId: 'rule-2',
        ruleName: 'Quarterly Utility Auto-pay',
        residentId: 'res-2',
        residentName: 'Priya Sharma',
        flatNumber: 'B-205',
        billId: 'bill-1',
        billNumber: 'UB-2024-001',
        amount: 3000,
        paymentMethodId: 'method-2',
        paymentMethodName: 'My UPI',
        paymentDate: new Date(2024, 0, 1),
        scheduledDate: new Date(2024, 0, 1),
        status: 'completed',
        retryCount: 0,
        transactionId: 'TXN789012',
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'txn-3',
        ruleId: 'rule-1',
        ruleName: 'Monthly Maintenance Auto-pay',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        invoiceId: 'inv-2',
        invoiceNumber: 'INV-2024-003',
        amount: 5000,
        paymentMethodId: 'method-1',
        paymentMethodName: 'My Primary Card',
        scheduledDate: new Date(2024, 2, 5),
        status: 'scheduled',
        retryCount: 0,
        createdAt: new Date(2024, 1, 6)
      }
    ];
    this.filterTransactions();
  }

  /**
   * Load scheduled payments
   */
  loadScheduledPayments(): void {
    const today = new Date();
    this.scheduledPayments = this.transactions
      .filter(t => t.status === 'scheduled')
      .map(t => {
        const daysUntil = Math.ceil((t.scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...t,
          daysUntil: daysUntil
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }

  /**
   * Load payment methods
   */
  loadPaymentMethods(): void {
    this.availablePaymentMethods = [
      { id: 'method-1', name: 'My Primary Card', maskedValue: '****1234' },
      { id: 'method-2', name: 'My UPI', maskedValue: 'raj***@paytm' },
      { id: 'method-3', name: 'HDFC Bank Account', maskedValue: '****5678' }
    ];
  }

  /**
   * Filter rules
   */
  filterRules(): void {
    let filtered = [...this.rules];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(r => 
        this.statusFilter === 'active' ? r.isActive : !r.isActive
      );
    }

    if (this.billTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.billType === this.billTypeFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.residentName.toLowerCase().includes(query) ||
        r.flatNumber.toLowerCase().includes(query)
      );
    }

    this.filteredRules = filtered;
  }

  /**
   * Filter transactions
   */
  filterTransactions(): void {
    let filtered = [...this.transactions];

    if (this.transactionStatusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === this.transactionStatusFilter);
    }

    if (this.transactionSearchQuery.trim()) {
      const query = this.transactionSearchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.ruleName.toLowerCase().includes(query) ||
        t.residentName.toLowerCase().includes(query) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(query)) ||
        (t.billNumber && t.billNumber.toLowerCase().includes(query))
      );
    }

    // Sort by scheduled date (newest first)
    filtered.sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());

    this.filteredTransactions = filtered;
  }

  /**
   * Get active rules count
   */
  get activeRulesCount(): number {
    return this.rules.filter(r => r.isActive).length;
  }

  /**
   * Get completed payments count
   */
  get completedPaymentsCount(): number {
    return this.transactions.filter(t => t.status === 'completed').length;
  }

  /**
   * Get scheduled payments count
   */
  get scheduledPaymentsCount(): number {
    return this.transactions.filter(t => t.status === 'scheduled').length;
  }

  /**
   * Get total auto-pay amount
   */
  get totalAutoPayAmount(): number {
    return this.transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * On frequency change
   */
  onFrequencyChange(): void {
    if (this.newRule.frequency !== 'custom') {
      this.newRule.customDays = undefined;
    }
  }

  /**
   * View rule
   */
  viewRule(rule: AutoPayRule): void {
    this.selectedRule = rule;
  }

  /**
   * Edit rule
   */
  editRule(rule: AutoPayRule): void {
    this.editingRule = rule;
    this.newRule = { ...rule };
    this.startDate = new Date(rule.startDate).toISOString().split('T')[0];
    this.endDate = rule.endDate ? new Date(rule.endDate).toISOString().split('T')[0] : '';
    this.showCreateRule = true;
  }

  /**
   * Toggle rule
   */
  toggleRule(rule: AutoPayRule): void {
    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date();
    this.filterRules();
    alert(`Auto-pay rule ${rule.isActive ? 'activated' : 'deactivated'} successfully!`);
  }

  /**
   * Delete rule
   */
  deleteRule(rule: AutoPayRule): void {
    if (confirm(`Delete auto-pay rule "${rule.name}"? This will cancel all scheduled payments.`)) {
      this.rules = this.rules.filter(r => r.id !== rule.id);
      this.transactions = this.transactions.filter(t => t.ruleId !== rule.id);
      this.filterRules();
      this.filterTransactions();
      alert('Auto-pay rule deleted successfully!');
    }
  }

  /**
   * View transaction
   */
  viewTransaction(transaction: AutoPayTransaction): void {
    // View transaction details
    console.log('View transaction:', transaction);
  }

  /**
   * Retry payment
   */
  retryPayment(transaction: AutoPayTransaction): void {
    if (confirm(`Retry failed payment for ${transaction.residentName}?`)) {
      transaction.status = 'processing';
      transaction.retryCount++;
      
      // Simulate payment processing
      setTimeout(() => {
        transaction.status = 'completed';
        transaction.paymentDate = new Date();
        this.filterTransactions();
      }, 2000);
      
      this.filterTransactions();
      alert('Payment retry initiated...');
    }
  }

  /**
   * Cancel payment
   */
  cancelPayment(transaction: AutoPayTransaction): void {
    if (confirm(`Cancel scheduled payment for ${transaction.residentName}?`)) {
      transaction.status = 'cancelled';
      this.filterTransactions();
      this.loadScheduledPayments();
      alert('Scheduled payment cancelled!');
    }
  }

  /**
   * Cancel scheduled payment
   */
  cancelScheduledPayment(payment: any): void {
    const transaction = this.transactions.find(t => t.id === payment.id);
    if (transaction) {
      this.cancelPayment(transaction);
    }
  }

  /**
   * Process payment now
   */
  processPaymentNow(payment: any): void {
    const transaction = this.transactions.find(t => t.id === payment.id);
    if (transaction) {
      transaction.status = 'processing';
      this.filterTransactions();
      
      // Simulate payment processing
      setTimeout(() => {
        transaction.status = 'completed';
        transaction.paymentDate = new Date();
        const rule = this.rules.find(r => r.id === transaction.ruleId);
        if (rule) {
          rule.lastProcessed = new Date();
          rule.totalPayments++;
          rule.totalAmount += transaction.amount;
          this.calculateNextPaymentDate(rule);
        }
        this.filterTransactions();
        this.loadScheduledPayments();
      }, 2000);
      
      alert('Processing payment...');
    }
  }

  /**
   * Calculate next payment date
   */
  calculateNextPaymentDate(rule: AutoPayRule): void {
    const lastDate = rule.lastProcessed || rule.startDate;
    const nextDate = new Date(lastDate);
    
    if (rule.frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (rule.frequency === 'quarterly') {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (rule.frequency === 'annually') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else if (rule.frequency === 'custom' && rule.customDays) {
      nextDate.setDate(nextDate.getDate() + rule.customDays);
    }
    
    // Set payment day
    nextDate.setDate(rule.paymentDay);
    
    rule.nextPaymentDate = nextDate;
    rule.updatedAt = new Date();
  }

  /**
   * Save rule
   */
  saveRule(): void {
    if (!this.isRuleValid()) {
      return;
    }

    const paymentMethod = this.availablePaymentMethods.find(m => m.id === this.newRule.paymentMethodId);
    if (!paymentMethod) return;

    const rule: AutoPayRule = {
      id: this.editingRule?.id || `rule-${Date.now()}`,
      name: this.newRule.name!,
      residentId: this.newRule.residentId || '',
      residentName: this.newRule.residentName || '',
      flatNumber: this.newRule.flatNumber!,
      paymentMethodId: this.newRule.paymentMethodId!,
      paymentMethodName: paymentMethod.name,
      paymentMethodType: 'card', // Default, should be from payment method
      paymentMethodMasked: paymentMethod.maskedValue,
      billType: this.newRule.billType!,
      frequency: this.newRule.frequency!,
      customDays: this.newRule.customDays,
      paymentDay: this.newRule.paymentDay!,
      startDate: new Date(this.startDate),
      endDate: this.endDate ? new Date(this.endDate) : undefined,
      maxAmount: this.newRule.maxAmount,
      minAmount: this.newRule.minAmount,
      isActive: this.newRule.isActive ?? true,
      autoRetry: this.newRule.autoRetry ?? true,
      retryAttempts: this.newRule.retryAttempts || 3,
      retryInterval: this.newRule.retryInterval || 1,
      notifyOnPayment: this.newRule.notifyOnPayment ?? true,
      notifyOnFailure: this.newRule.notifyOnFailure ?? true,
      nextPaymentDate: new Date(this.startDate),
      totalPayments: this.editingRule?.totalPayments || 0,
      totalAmount: this.editingRule?.totalAmount || 0,
      createdAt: this.editingRule?.createdAt || new Date(),
      updatedAt: new Date()
    };

    // Calculate next payment date
    this.calculateNextPaymentDate(rule);

    if (this.editingRule) {
      const index = this.rules.findIndex(r => r.id === this.editingRule!.id);
      if (index > -1) {
        this.rules[index] = rule;
      }
      alert('Auto-pay rule updated successfully!');
    } else {
      this.rules.unshift(rule);
      alert('Auto-pay rule created successfully!');
    }

    this.filterRules();
    this.closeRuleModal();
  }

  /**
   * Close rule modal
   */
  closeRuleModal(): void {
    this.showCreateRule = false;
    this.editingRule = null;
    this.resetNewRule();
  }

  /**
   * Reset new rule
   */
  resetNewRule(): void {
    this.newRule = {
      name: '',
      flatNumber: '',
      residentName: '',
      paymentMethodId: '',
      billType: 'maintenance',
      frequency: 'monthly',
      paymentDay: 1,
      isActive: true,
      autoRetry: true,
      retryAttempts: 3,
      retryInterval: 1,
      notifyOnPayment: true,
      notifyOnFailure: true,
      totalPayments: 0,
      totalAmount: 0
    };
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
    this.endDate = '';
  }

  /**
   * Is rule valid
   */
  isRuleValid(): boolean {
    return !!(
      this.newRule.name &&
      this.newRule.flatNumber &&
      this.newRule.paymentMethodId &&
      this.newRule.billType &&
      this.newRule.frequency &&
      this.newRule.paymentDay &&
      this.newRule.paymentDay >= 1 &&
      this.newRule.paymentDay <= 31 &&
      this.startDate &&
      (!this.newRule.frequency || this.newRule.frequency !== 'custom' || this.newRule.customDays)
    );
  }

  /**
   * Get bill type label
   */
  getBillTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      maintenance: 'Maintenance',
      utility: 'Utility',
      service: 'Service',
      all: 'All Bills'
    };
    return labels[type] || type;
  }

  /**
   * Get frequency label
   */
  getFrequencyLabel(frequency: string): string {
    const labels: { [key: string]: string } = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annually',
      custom: 'Custom'
    };
    return labels[frequency] || frequency;
  }

  /**
   * Get transaction status label
   */
  getTransactionStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      scheduled: 'Scheduled',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  /**
   * Get days until class
   */
  getDaysUntilClass(days: number): string {
    if (days <= 1) return 'urgent';
    if (days <= 7) return 'soon';
    return 'upcoming';
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
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

