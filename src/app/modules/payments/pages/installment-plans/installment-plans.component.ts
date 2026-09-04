import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Installment Plans Component
 * Handles installment plans for invoices and bills
 */
interface InstallmentPlan {
  id: string;
  planNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billId?: string;
  billNumber?: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  totalAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'custom';
  customDays?: number;
  startDate: Date;
  endDate: Date;
  paymentDay?: number; // Day of month for monthly/quarterly
  status: 'active' | 'completed' | 'cancelled' | 'overdue';
  paidInstallments: number;
  remainingInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  lateFeeEnabled: boolean;
  lateFeeAmount?: number;
  gracePeriodDays: number;
  autoDebit: boolean;
  paymentMethodId?: string;
  paymentMethodName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InstallmentPayment {
  id: string;
  planId: string;
  planNumber: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'waived';
  paymentMethodId?: string;
  paymentMethodName?: string;
  transactionId?: string;
  lateFee?: number;
  reminderSent: boolean;
  reminderSentDate?: Date;
  notes?: string;
  createdAt: Date;
}

@Component({
  selector: 'app-installment-plans',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="installment-plans-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">payment_plan</i>
            Installment Plans
          </h1>
          <p>Create and manage installment payment plans for invoices and bills</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="activeTab = 'scheduled'" title="Scheduled Payments">
            <i class="material-icons">schedule</i>
            Scheduled
          </button>
          <button class="icon-btn primary" (click)="showCreatePlan = true" title="Create Installment Plan">
            <i class="material-icons">add</i>
            Create Plan
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">payment_plan</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activePlansCount }}</div>
            <div class="stat-label">Active Plans</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ completedPaymentsCount }}</div>
            <div class="stat-label">Paid Installments</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingPaymentsCount }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalPaidAmount) }}</div>
            <div class="stat-label">Total Paid</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs">
          <button class="tab" [class.active]="activeTab === 'plans'" (click)="activeTab = 'plans'">
            <i class="material-icons">payment_plan</i>
            Installment Plans
          </button>
          <button class="tab" [class.active]="activeTab === 'payments'" (click)="activeTab = 'payments'">
            <i class="material-icons">history</i>
            Payment History
          </button>
          <button class="tab" [class.active]="activeTab === 'scheduled'" (click)="activeTab = 'scheduled'">
            <i class="material-icons">schedule</i>
            Scheduled Payments
          </button>
        </div>
      </div>

      <!-- Plans Tab -->
      <div class="content-section" *ngIf="activeTab === 'plans'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input type="text" placeholder="Search by plan number, resident..." [(ngModel)]="searchQuery" (input)="filterPlans()" />
          </div>
          <select [(ngModel)]="statusFilter" (change)="filterPlans()" class="filter-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <!-- Plans Grid -->
        <div class="plans-grid">
          <div *ngFor="let plan of filteredPlans" class="plan-card" [class.inactive]="plan.status === 'cancelled'">
            <div class="plan-header">
              <div class="plan-title">
                <h3>{{ plan.planNumber }}</h3>
                <span class="plan-badge" [ngClass]="plan.status">
                  {{ getStatusLabel(plan.status) }}
                </span>
              </div>
            </div>
            <div class="plan-details">
              <div class="detail-item">
                <i class="material-icons">person</i>
                <span>{{ plan.residentName }} - {{ plan.flatNumber }}</span>
              </div>
              <div class="detail-item" *ngIf="plan.invoiceNumber">
                <i class="material-icons">receipt</i>
                <span>Invoice: {{ plan.invoiceNumber }}</span>
              </div>
              <div class="detail-item" *ngIf="plan.billNumber">
                <i class="material-icons">description</i>
                <span>Bill: {{ plan.billNumber }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">account_balance_wallet</i>
                <span>Total: {{ formatCurrency(plan.totalAmount) }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">schedule</i>
                <span>{{ plan.paidInstallments }} / {{ plan.numberOfInstallments }} installments</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">payments</i>
                <span>Per Installment: {{ formatCurrency(plan.installmentAmount) }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">event</i>
                <span>Start: {{ formatDate(plan.startDate) }}</span>
              </div>
            </div>
            <div class="plan-actions">
              <button class="action-btn view" (click)="viewPlan(plan)" title="View Details">
                <i class="material-icons">visibility</i>
                View
              </button>
              <button class="action-btn edit" (click)="editPlan(plan)" title="Edit" *ngIf="plan.status === 'active'">
                <i class="material-icons">edit</i>
                Edit
              </button>
              <button class="action-btn cancel" (click)="cancelPlan(plan)" title="Cancel" *ngIf="plan.status === 'active'">
                <i class="material-icons">cancel</i>
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredPlans.length === 0">
          <i class="material-icons">payment_plan</i>
          <p>No installment plans found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showCreatePlan = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Create First Plan
          </button>
        </div>
      </div>

      <!-- Payments Tab -->
      <div class="content-section" *ngIf="activeTab === 'payments'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input type="text" placeholder="Search by plan number, resident..." [(ngModel)]="paymentSearchQuery" (input)="filterPayments()" />
          </div>
          <select [(ngModel)]="paymentStatusFilter" (change)="filterPayments()" class="filter-select">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
            <option value="waived">Waived</option>
          </select>
        </div>

        <!-- Payments Table -->
        <div class="payments-table-container">
          <table class="payments-table">
            <thead>
              <tr>
                <th>Plan #</th>
                <th>Installment</th>
                <th>Resident</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let payment of filteredPayments">
                <td><strong>{{ payment.planNumber }}</strong></td>
                <td>#{{ payment.installmentNumber }}</td>
                <td>
                  <div class="resident-info">
                    <div class="resident-name">{{ getResidentName(payment.planId) }}</div>
                  </div>
                </td>
                <td class="amount">{{ formatCurrency(payment.amount) }}</td>
                <td>{{ formatDate(payment.dueDate) }}</td>
                <td>
                  <span *ngIf="payment.paidDate">{{ formatDate(payment.paidDate) }}</span>
                  <span *ngIf="!payment.paidDate">-</span>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="payment.status">
                    {{ getPaymentStatusLabel(payment.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewPayment(payment)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn pay" (click)="markAsPaid(payment)" title="Mark as Paid" *ngIf="payment.status === 'pending'">
                      <i class="material-icons">check</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredPayments.length === 0">
            <i class="material-icons">history</i>
            <p>No payment records found</p>
          </div>
        </div>
      </div>

      <!-- Scheduled Payments Tab -->
      <div class="content-section" *ngIf="activeTab === 'scheduled'">
        <div class="scheduled-payments-grid">
          <div *ngFor="let payment of scheduledPayments" class="scheduled-card">
            <div class="scheduled-header">
              <h3>{{ payment.planNumber }} - Installment #{{ payment.installmentNumber }}</h3>
              <span class="days-badge" [ngClass]="getDaysUntilClass(payment.daysUntil)">
                {{ payment.daysUntil }} days
              </span>
            </div>
            <div class="scheduled-details">
              <div class="detail-item">
                <span class="label">Resident:</span>
                <span class="value">{{ getResidentName(payment.planId) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Amount:</span>
                <span class="value amount">{{ formatCurrency(payment.amount) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Due Date:</span>
                <span class="value">{{ formatDate(payment.dueDate) }}</span>
              </div>
            </div>
            <div class="scheduled-actions">
              <button class="btn btn-primary" (click)="markAsPaid(payment)">Mark as Paid</button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="scheduledPayments.length === 0">
          <i class="material-icons">schedule</i>
          <p>No scheduled payments</p>
        </div>
      </div>

      <!-- Create/Edit Plan Modal -->
      <div class="modal-overlay" *ngIf="showCreatePlan || editingPlan" (click)="closePlanModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingPlan ? 'Edit Installment Plan' : 'Create Installment Plan' }}</h2>
            <button class="close-btn" (click)="closePlanModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Invoice Number (Optional)</label>
                  <input type="text" [(ngModel)]="invoiceNumber" placeholder="e.g., INV-2024-001" />
                </div>
                <div class="form-group">
                  <label>Bill Number (Optional)</label>
                  <input type="text" [(ngModel)]="billNumber" placeholder="e.g., BILL-2024-001" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Resident/Flat <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newPlan.flatNumber" placeholder="e.g., A-101" required />
                </div>
                <div class="form-group">
                  <label>Resident Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newPlan.residentName" placeholder="Resident name" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Total Amount <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newPlan.totalAmount" (input)="calculateInstallmentAmount()" min="0" step="0.01" placeholder="0.00" required />
                </div>
                <div class="form-group">
                  <label>Number of Installments <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newPlan.numberOfInstallments" (input)="calculateInstallmentAmount()" min="1" max="24" placeholder="e.g., 3" required />
                </div>
              </div>

              <div class="form-group">
                <label>Installment Amount</label>
                <input type="number" [(ngModel)]="newPlan.installmentAmount" readonly class="readonly" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Frequency <span class="required">*</span></label>
                  <select [(ngModel)]="newPlan.frequency" (change)="onFrequencyChange()" required>
                    <option value="">Select Frequency</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div class="form-group" *ngIf="newPlan.frequency === 'custom'">
                  <label>Custom Days <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newPlan.customDays" min="1" placeholder="Number of days" required />
                </div>
                <div class="form-group" *ngIf="newPlan.frequency === 'monthly' || newPlan.frequency === 'quarterly'">
                  <label>Payment Day <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newPlan.paymentDay" min="1" max="31" placeholder="Day of month (1-31)" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Start Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="startDate" (change)="calculateEndDate()" required />
                </div>
                <div class="form-group">
                  <label>End Date</label>
                  <input type="date" [(ngModel)]="endDate" readonly class="readonly" />
                </div>
              </div>

              <div class="form-section-title">Late Fee Settings</div>
              <div class="form-row">
                <div class="form-group">
                  <label>Enable Late Fee</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newPlan.lateFeeEnabled" id="lateFeeEnabled" />
                    <label for="lateFeeEnabled"></label>
                  </div>
                </div>
                <div class="form-group" *ngIf="newPlan.lateFeeEnabled">
                  <label>Late Fee Amount</label>
                  <input type="number" [(ngModel)]="newPlan.lateFeeAmount" min="0" step="0.01" placeholder="0.00" />
                </div>
                <div class="form-group" *ngIf="newPlan.lateFeeEnabled">
                  <label>Grace Period (Days)</label>
                  <input type="number" [(ngModel)]="newPlan.gracePeriodDays" min="0" placeholder="0" />
                </div>
              </div>

              <div class="form-section-title">Payment Settings</div>
              <div class="form-row">
                <div class="form-group">
                  <label>Auto Debit</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newPlan.autoDebit" id="autoDebit" />
                    <label for="autoDebit"></label>
                  </div>
                </div>
                <div class="form-group" *ngIf="newPlan.autoDebit">
                  <label>Payment Method</label>
                  <select [(ngModel)]="newPlan.paymentMethodId">
                    <option value="">Select Payment Method</option>
                    <option *ngFor="let method of availablePaymentMethods" [value]="method.id">
                      {{ method.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea [(ngModel)]="newPlan.notes" placeholder="Additional notes" rows="3"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closePlanModal()">Cancel</button>
            <button class="btn btn-primary" (click)="savePlan()" [disabled]="!isPlanValid()">
              <i class="material-icons">save</i>
              {{ editingPlan ? 'Update' : 'Create' }} Plan
            </button>
          </div>
        </div>
      </div>

      <!-- Plan Details Modal -->
      <div class="modal-overlay" *ngIf="selectedPlan && showPlanDetails" (click)="showPlanDetails = false; selectedPlan = null">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Plan Details - {{ selectedPlan?.planNumber }}</h2>
            <button class="close-btn" (click)="showPlanDetails = false; selectedPlan = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedPlan">
            <div class="plan-detail-section">
              <h3>Plan Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Plan Number:</span>
                  <span class="value">{{ selectedPlan.planNumber }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="selectedPlan.status">
                    {{ getStatusLabel(selectedPlan.status) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">Total Amount:</span>
                  <span class="value">{{ formatCurrency(selectedPlan.totalAmount) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Installments:</span>
                  <span class="value">{{ selectedPlan.numberOfInstallments }}</span>
                </div>
              </div>
            </div>

            <div class="plan-detail-section">
              <h3>Payment Schedule</h3>
              <div class="payments-list">
                <div *ngFor="let payment of getPlanPayments(selectedPlan.id)" class="payment-item" [ngClass]="payment.status">
                  <div class="payment-info">
                    <span class="installment-number">#{{ payment.installmentNumber }}</span>
                    <span class="payment-amount">{{ formatCurrency(payment.amount) }}</span>
                  </div>
                  <div class="payment-dates">
                    <span>Due: {{ formatDate(payment.dueDate) }}</span>
                    <span *ngIf="payment.paidDate">Paid: {{ formatDate(payment.paidDate) }}</span>
                  </div>
                  <span class="status-badge" [ngClass]="payment.status">
                    {{ getPaymentStatusLabel(payment.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showPlanDetails = false; selectedPlan = null">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .installment-plans-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .page-header {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn, .icon-btn {
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

    .back-btn:hover, .icon-btn:hover {
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
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
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
      color: #9b59b6;
    }

    .tab.active {
      color: #9b59b6;
      border-bottom-color: #9b59b6;
    }

    .content-section {
      padding: 24px;
    }

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

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .plan-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .plan-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .plan-card.inactive {
      opacity: 0.7;
    }

    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .plan-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .plan-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .plan-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .plan-badge.active { background: #e8f8f0; color: #1e9e5a; }
    .plan-badge.completed { background: #e7f3ff; color: #2980b9; }
    .plan-badge.cancelled { background: #f5f7fa; color: #7f8c8d; }
    .plan-badge.overdue { background: #ffeaea; color: #c0392b; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.completed { background: #e7f3ff; color: #2980b9; }
    .status-badge.cancelled { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.overdue { background: #ffeaea; color: #c0392b; }
    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.waived { background: #f4e7ff; color: #8e44ad; }

    .plan-details {
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
      color: #9b59b6;
    }

    .plan-actions {
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
    .action-btn.cancel { background: #f5f7fa; color: #7f8c8d; }
    .action-btn.pay { background: #e8f8f0; color: #1e9e5a; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .payments-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .payments-table {
      width: 100%;
    }

    .payments-table thead {
      background: #f8f9fa;
    }

    .payments-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .payments-table td {
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
      border-left: 4px solid #9b59b6;
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

    .modal-content.large {
      max-width: 1000px;
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
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }

    .form-group input.readonly {
      background: #f8f9fa;
      cursor: not-allowed;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #9b59b6;
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
      background: #9b59b6;
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
      background: #9b59b6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #8e44ad;
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

    .plan-detail-section {
      margin-bottom: 24px;
    }

    .plan-detail-section h3 {
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

    .payments-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .payment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #9b59b6;
    }

    .payment-item.paid {
      border-left-color: #1e9e5a;
    }

    .payment-item.overdue {
      border-left-color: #c0392b;
    }

    .payment-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .installment-number {
      font-weight: 600;
      color: #2c3e50;
    }

    .payment-amount {
      font-size: 16px;
      font-weight: 700;
      color: #9b59b6;
    }

    .payment-dates {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .filters-section {
        flex-direction: column;
      }

      .plans-grid {
        grid-template-columns: 1fr;
      }

      .scheduled-payments-grid {
        grid-template-columns: 1fr;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class InstallmentPlansComponent implements OnInit, OnDestroy {
  plans: InstallmentPlan[] = [];
  filteredPlans: InstallmentPlan[] = [];
  payments: InstallmentPayment[] = [];
  filteredPayments: InstallmentPayment[] = [];
  selectedPlan: InstallmentPlan | null = null;
  editingPlan: InstallmentPlan | null = null;
  searchQuery: string = '';
  paymentSearchQuery: string = '';
  statusFilter: string = 'all';
  paymentStatusFilter: string = 'all';
  activeTab: 'plans' | 'payments' | 'scheduled' = 'plans';
  showCreatePlan: boolean = false;
  showPlanDetails: boolean = false;
  startDate: string = '';
  endDate: string = '';
  invoiceNumber: string = '';
  billNumber: string = '';

  newPlan: Partial<InstallmentPlan> = {
    planNumber: '',
    residentId: '',
    residentName: '',
    flatNumber: '',
    totalAmount: 0,
    numberOfInstallments: 1,
    installmentAmount: 0,
    frequency: 'monthly',
    status: 'active',
    paidInstallments: 0,
    remainingInstallments: 0,
    paidAmount: 0,
    remainingAmount: 0,
    lateFeeEnabled: false,
    gracePeriodDays: 0,
    autoDebit: false
  };

  private destroy$ = new Subject<void>();

  constructor() {
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);
    this.endDate = endDate.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadPlans();
    this.loadPayments();
    this.loadPaymentMethods();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  availablePaymentMethods: any[] = [];
  scheduledPayments: any[] = [];

  loadPlans(): void {
    // Dummy data
    this.plans = [
      {
        id: 'plan-1',
        planNumber: 'IP-2024-001',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        totalAmount: 15000,
        numberOfInstallments: 3,
        installmentAmount: 5000,
        frequency: 'monthly',
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 2, 1),
        paymentDay: 5,
        status: 'active',
        paidInstallments: 1,
        remainingInstallments: 2,
        paidAmount: 5000,
        remainingAmount: 10000,
        lateFeeEnabled: true,
        lateFeeAmount: 500,
        gracePeriodDays: 5,
        autoDebit: false,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      }
    ];
    this.filterPlans();
    this.loadScheduledPayments();
  }

  loadPayments(): void {
    // Dummy data
    this.payments = [
      {
        id: 'pay-1',
        planId: 'plan-1',
        planNumber: 'IP-2024-001',
        installmentNumber: 1,
        amount: 5000,
        dueDate: new Date(2024, 0, 5),
        paidDate: new Date(2024, 0, 5),
        status: 'paid',
        transactionId: 'TXN123456',
        reminderSent: true,
        reminderSentDate: new Date(2024, 0, 1),
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'pay-2',
        planId: 'plan-1',
        planNumber: 'IP-2024-001',
        installmentNumber: 2,
        amount: 5000,
        dueDate: new Date(2024, 1, 5),
        status: 'pending',
        reminderSent: false,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'pay-3',
        planId: 'plan-1',
        planNumber: 'IP-2024-001',
        installmentNumber: 3,
        amount: 5000,
        dueDate: new Date(2024, 2, 5),
        status: 'pending',
        reminderSent: false,
        createdAt: new Date(2024, 0, 1)
      }
    ];
    this.filterPayments();
    this.loadScheduledPayments();
  }

  loadScheduledPayments(): void {
    const today = new Date();
    this.scheduledPayments = this.payments
      .filter(p => p.status === 'pending')
      .map(p => {
        const daysUntil = Math.ceil((p.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...p,
          daysUntil: daysUntil
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }

  loadPaymentMethods(): void {
    this.availablePaymentMethods = [
      { id: 'method-1', name: 'My Primary Card' },
      { id: 'method-2', name: 'My UPI' },
      { id: 'method-3', name: 'HDFC Bank Account' }
    ];
  }

  filterPlans(): void {
    let filtered = [...this.plans];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.statusFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.planNumber.toLowerCase().includes(query) ||
        p.residentName.toLowerCase().includes(query) ||
        p.flatNumber.toLowerCase().includes(query) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(query)) ||
        (p.billNumber && p.billNumber.toLowerCase().includes(query))
      );
    }

    this.filteredPlans = filtered;
  }

  filterPayments(): void {
    let filtered = [...this.payments];

    if (this.paymentStatusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.paymentStatusFilter);
    }

    if (this.paymentSearchQuery.trim()) {
      const query = this.paymentSearchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.planNumber.toLowerCase().includes(query) ||
        this.getResidentName(p.planId).toLowerCase().includes(query)
      );
    }

    // Sort by due date
    filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    this.filteredPayments = filtered;
  }

  calculateInstallmentAmount(): void {
    if (this.newPlan.totalAmount && this.newPlan.numberOfInstallments) {
      this.newPlan.installmentAmount = Math.round((this.newPlan.totalAmount / this.newPlan.numberOfInstallments) * 100) / 100;
      this.newPlan.remainingAmount = this.newPlan.totalAmount;
      this.newPlan.remainingInstallments = this.newPlan.numberOfInstallments;
    }
  }

  onFrequencyChange(): void {
    if (this.newPlan.frequency !== 'custom') {
      this.newPlan.customDays = undefined;
    }
    this.calculateEndDate();
  }

  calculateEndDate(): void {
    if (!this.startDate || !this.newPlan.numberOfInstallments || !this.newPlan.frequency) {
      return;
    }

    const start = new Date(this.startDate);
    let end = new Date(start);
    const installments = this.newPlan.numberOfInstallments || 1;

    if (this.newPlan.frequency === 'weekly') {
      end.setDate(end.getDate() + (installments * 7));
    } else if (this.newPlan.frequency === 'bi-weekly') {
      end.setDate(end.getDate() + (installments * 14));
    } else if (this.newPlan.frequency === 'monthly') {
      end.setMonth(end.getMonth() + installments);
    } else if (this.newPlan.frequency === 'quarterly') {
      end.setMonth(end.getMonth() + (installments * 3));
    } else if (this.newPlan.frequency === 'custom' && this.newPlan.customDays) {
      end.setDate(end.getDate() + (installments * this.newPlan.customDays));
    }

    this.endDate = end.toISOString().split('T')[0];
  }

  viewPlan(plan: InstallmentPlan): void {
    this.selectedPlan = plan;
    this.showPlanDetails = true;
  }

  editPlan(plan: InstallmentPlan): void {
    this.editingPlan = plan;
    this.newPlan = { ...plan };
    this.startDate = new Date(plan.startDate).toISOString().split('T')[0];
    this.endDate = new Date(plan.endDate).toISOString().split('T')[0];
    this.invoiceNumber = plan.invoiceNumber || '';
    this.billNumber = plan.billNumber || '';
    this.showCreatePlan = true;
  }

  cancelPlan(plan: InstallmentPlan): void {
    if (confirm(`Cancel installment plan "${plan.planNumber}"?`)) {
      plan.status = 'cancelled';
      plan.updatedAt = new Date();
      this.filterPlans();
      alert('Installment plan cancelled successfully!');
    }
  }

  viewPayment(payment: InstallmentPayment): void {
    // View payment details
    console.log('View payment:', payment);
  }

  markAsPaid(payment: InstallmentPayment): void {
    if (confirm(`Mark installment #${payment.installmentNumber} as paid?`)) {
      payment.status = 'paid';
      payment.paidDate = new Date();
      
      const plan = this.plans.find(p => p.id === payment.planId);
      if (plan) {
        plan.paidInstallments++;
        plan.remainingInstallments--;
        plan.paidAmount += payment.amount;
        plan.remainingAmount -= payment.amount;
        
        if (plan.paidInstallments === plan.numberOfInstallments) {
          plan.status = 'completed';
        }
        plan.updatedAt = new Date();
      }
      
      this.filterPayments();
      this.filterPlans();
      this.loadScheduledPayments();
      alert('Payment marked as paid successfully!');
    }
  }

  savePlan(): void {
    if (!this.isPlanValid()) {
      return;
    }

    const plan: InstallmentPlan = {
      id: this.editingPlan?.id || `plan-${Date.now()}`,
      planNumber: this.editingPlan?.planNumber || `IP-${new Date().getFullYear()}-${String(this.plans.length + 1).padStart(3, '0')}`,
      invoiceId: this.invoiceNumber ? 'inv-' + Date.now() : undefined,
      invoiceNumber: this.invoiceNumber || undefined,
      billId: this.billNumber ? 'bill-' + Date.now() : undefined,
      billNumber: this.billNumber || undefined,
      residentId: this.newPlan.residentId || '',
      residentName: this.newPlan.residentName!,
      flatNumber: this.newPlan.flatNumber!,
      totalAmount: this.newPlan.totalAmount!,
      numberOfInstallments: this.newPlan.numberOfInstallments!,
      installmentAmount: this.newPlan.installmentAmount!,
      frequency: this.newPlan.frequency!,
      customDays: this.newPlan.customDays,
      startDate: new Date(this.startDate),
      endDate: new Date(this.endDate),
      paymentDay: this.newPlan.paymentDay,
      status: this.newPlan.status || 'active',
      paidInstallments: this.editingPlan?.paidInstallments || 0,
      remainingInstallments: this.newPlan.numberOfInstallments!,
      paidAmount: this.editingPlan?.paidAmount || 0,
      remainingAmount: this.newPlan.totalAmount!,
      lateFeeEnabled: this.newPlan.lateFeeEnabled || false,
      lateFeeAmount: this.newPlan.lateFeeAmount,
      gracePeriodDays: this.newPlan.gracePeriodDays || 0,
      autoDebit: this.newPlan.autoDebit || false,
      paymentMethodId: this.newPlan.paymentMethodId,
      paymentMethodName: this.newPlan.paymentMethodName,
      notes: this.newPlan.notes,
      createdAt: this.editingPlan?.createdAt || new Date(),
      updatedAt: new Date()
    };

    // Generate installment payments
    if (!this.editingPlan) {
      this.generateInstallmentPayments(plan);
    }

    if (this.editingPlan) {
      const index = this.plans.findIndex(p => p.id === this.editingPlan!.id);
      if (index > -1) {
        this.plans[index] = plan;
      }
      alert('Installment plan updated successfully!');
    } else {
      this.plans.unshift(plan);
      alert('Installment plan created successfully!');
    }

    this.filterPlans();
    this.closePlanModal();
  }

  generateInstallmentPayments(plan: InstallmentPlan): void {
    const payments: InstallmentPayment[] = [];
    let currentDate = new Date(plan.startDate);

    for (let i = 1; i <= plan.numberOfInstallments; i++) {
      const dueDate = new Date(currentDate);
      
      if (plan.paymentDay && (plan.frequency === 'monthly' || plan.frequency === 'quarterly')) {
        dueDate.setDate(plan.paymentDay);
      }

      payments.push({
        id: `pay-${plan.id}-${i}`,
        planId: plan.id,
        planNumber: plan.planNumber,
        installmentNumber: i,
        amount: plan.installmentAmount,
        dueDate: dueDate,
        status: 'pending',
        reminderSent: false,
        createdAt: new Date()
      });

      // Calculate next due date
      if (plan.frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (plan.frequency === 'bi-weekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      } else if (plan.frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (plan.frequency === 'quarterly') {
        currentDate.setMonth(currentDate.getMonth() + 3);
      } else if (plan.frequency === 'custom' && plan.customDays) {
        currentDate.setDate(currentDate.getDate() + plan.customDays);
      }
    }

    this.payments.push(...payments);
    this.filterPayments();
  }

  closePlanModal(): void {
    this.showCreatePlan = false;
    this.editingPlan = null;
    this.resetNewPlan();
  }

  resetNewPlan(): void {
    this.newPlan = {
      planNumber: '',
      residentId: '',
      residentName: '',
      flatNumber: '',
      totalAmount: 0,
      numberOfInstallments: 1,
      installmentAmount: 0,
      frequency: 'monthly',
      status: 'active',
      paidInstallments: 0,
      remainingInstallments: 0,
      paidAmount: 0,
      remainingAmount: 0,
      lateFeeEnabled: false,
      gracePeriodDays: 0,
      autoDebit: false
    };
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);
    this.endDate = endDate.toISOString().split('T')[0];
    this.invoiceNumber = '';
    this.billNumber = '';
  }

  isPlanValid(): boolean {
    return !!(
      this.newPlan.flatNumber &&
      this.newPlan.residentName &&
      this.newPlan.totalAmount &&
      this.newPlan.totalAmount > 0 &&
      this.newPlan.numberOfInstallments &&
      this.newPlan.numberOfInstallments > 0 &&
      this.newPlan.frequency &&
      this.startDate &&
      (!this.newPlan.frequency || this.newPlan.frequency !== 'custom' || this.newPlan.customDays) &&
      (!this.newPlan.autoDebit || this.newPlan.paymentMethodId)
    );
  }

  get activePlansCount(): number {
    return this.plans.filter(p => p.status === 'active').length;
  }

  get completedPaymentsCount(): number {
    return this.payments.filter(p => p.status === 'paid').length;
  }

  get pendingPaymentsCount(): number {
    return this.payments.filter(p => p.status === 'pending').length;
  }

  get totalPaidAmount(): number {
    return this.payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  getPlanPayments(planId: string): InstallmentPayment[] {
    return this.payments.filter(p => p.planId === planId);
  }

  getResidentName(planId: string): string {
    const plan = this.plans.find(p => p.id === planId);
    return plan ? plan.residentName : 'Unknown';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      active: 'Active',
      completed: 'Completed',
      cancelled: 'Cancelled',
      overdue: 'Overdue'
    };
    return labels[status] || status;
  }

  getPaymentStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
      waived: 'Waived'
    };
    return labels[status] || status;
  }

  getDaysUntilClass(days: number): string {
    if (days <= 1) return 'urgent';
    if (days <= 7) return 'soon';
    return 'upcoming';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  goBack(): void {
    window.history.back();
  }
}
