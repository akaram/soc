import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Advance Payment Discounts Component
 * Handles discounts for advance payments
 */
interface DiscountRule {
  id: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // Percentage or fixed amount
  advanceMonths: number; // Number of months in advance
  minimumAmount?: number; // Minimum payment amount to qualify
  maximumDiscount?: number; // Maximum discount cap
  applicableTo: 'all' | 'maintenance' | 'utility' | 'service' | 'custom';
  isActive: boolean;
  autoApply: boolean;
  validFrom: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AdvancePayment {
  id: string;
  paymentNumber: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billId?: string;
  billNumber?: string;
  paymentType: 'maintenance' | 'utility' | 'service' | 'other';
  originalAmount: number;
  advanceMonths: number;
  discountRuleId: string;
  discountRuleName: string;
  discountAmount: number;
  finalAmount: number;
  paymentDate: Date;
  status: 'pending' | 'applied' | 'cancelled';
  notes?: string;
  createdAt: Date;
}

@Component({
  selector: 'app-advance-payment-discounts',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="discounts-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">local_offer</i>
            Advance Payment Discounts
          </h1>
          <p>Manage discounts for advance payments</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showReports = true" title="Reports">
            <i class="material-icons">assessment</i>
            Reports
          </button>
          <button class="icon-btn primary" (click)="showCreateRule = true" title="Create Rule">
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
            <div class="stat-value">{{ rules.length }}</div>
            <div class="stat-label">Discount Rules</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activeRulesCount }}</div>
            <div class="stat-label">Active Rules</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">payments</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ advancePaymentsCount }}</div>
            <div class="stat-label">Advance Payments</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">savings</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalDiscounts) }}</div>
            <div class="stat-label">Total Discounts</div>
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
            Discount Rules
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'payments'"
            (click)="activeTab = 'payments'"
          >
            <i class="material-icons">payments</i>
            Advance Payments
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'calculator'"
            (click)="activeTab = 'calculator'"
          >
            <i class="material-icons">calculate</i>
            Discount Calculator
          </button>
        </div>
      </div>

      <!-- Discount Rules Tab -->
      <div class="content-section" *ngIf="activeTab === 'rules'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search rules by name..." 
              [(ngModel)]="searchQuery"
              (input)="filterRules()"
            />
          </div>
          <select [(ngModel)]="statusFilter" (change)="filterRules()" class="filter-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select [(ngModel)]="typeFilter" (change)="filterRules()" class="filter-select">
            <option value="all">All Types</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>

        <!-- Rules Grid -->
        <div class="rules-grid">
          <div *ngFor="let rule of filteredRules" class="rule-card" [class.inactive]="!rule.isActive">
            <div class="rule-header">
              <div class="rule-title">
                <h3>{{ rule.name }}</h3>
                <span class="rule-badge" [ngClass]="rule.discountType">
                  {{ getDiscountTypeLabel(rule.discountType) }}
                </span>
              </div>
              <div class="rule-status">
                <span class="status-badge" [ngClass]="rule.isActive ? 'active' : 'inactive'">
                  {{ rule.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
            <p class="rule-description">{{ rule.description }}</p>
            <div class="rule-details">
              <div class="detail-item">
                <i class="material-icons">percent</i>
                <span>Discount: <strong>{{ getDiscountDisplay(rule) }}</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">calendar_month</i>
                <span>Advance Months: <strong>{{ rule.advanceMonths }}</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">category</i>
                <span>Applicable To: <strong>{{ getApplicableToLabel(rule.applicableTo) }}</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">autorenew</i>
                <span>Auto-Apply: <strong>{{ rule.autoApply ? 'Yes' : 'No' }}</strong></span>
              </div>
              <div class="detail-item" *ngIf="rule.minimumAmount">
                <i class="material-icons">attach_money</i>
                <span>Minimum Amount: <strong>{{ formatCurrency(rule.minimumAmount) }}</strong></span>
              </div>
              <div class="detail-item" *ngIf="rule.maximumDiscount">
                <i class="material-icons">trending_up</i>
                <span>Max Discount: <strong>{{ formatCurrency(rule.maximumDiscount) }}</strong></span>
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
          <p>No discount rules found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showCreateRule = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Create First Rule
          </button>
        </div>
      </div>

      <!-- Advance Payments Tab -->
      <div class="content-section" *ngIf="activeTab === 'payments'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by payment, resident..." 
              [(ngModel)]="paymentSearchQuery"
              (input)="filterPayments()"
            />
          </div>
          <select [(ngModel)]="paymentStatusFilter" (change)="filterPayments()" class="filter-select">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <!-- Payments Table -->
        <div class="payments-table-container">
          <table class="payments-table">
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Resident</th>
                <th>Type</th>
                <th>Original Amount</th>
                <th>Advance Months</th>
                <th>Discount</th>
                <th>Final Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let payment of filteredPayments">
                <td>
                  <strong>{{ payment.paymentNumber }}</strong>
                </td>
                <td>
                  <div class="resident-info">
                    <div class="resident-name">{{ payment.residentName }}</div>
                    <div class="resident-flat">{{ payment.flatNumber }}</div>
                  </div>
                </td>
                <td>
                  <span class="type-badge" [ngClass]="payment.paymentType">
                    {{ getPaymentTypeLabel(payment.paymentType) }}
                  </span>
                </td>
                <td>{{ formatCurrency(payment.originalAmount) }}</td>
                <td>
                  <span class="months-badge">{{ payment.advanceMonths }} months</span>
                </td>
                <td class="discount-amount">{{ formatCurrency(payment.discountAmount) }}</td>
                <td class="final-amount">{{ formatCurrency(payment.finalAmount) }}</td>
                <td>{{ formatDate(payment.paymentDate) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="payment.status">
                    {{ getStatusLabel(payment.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewPayment(payment)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn apply" (click)="applyDiscount(payment)" title="Apply" *ngIf="payment.status === 'pending'">
                      <i class="material-icons">check</i>
                    </button>
                    <button class="action-btn cancel" (click)="cancelPayment(payment)" title="Cancel" *ngIf="payment.status === 'pending'">
                      <i class="material-icons">cancel</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredPayments.length === 0">
            <i class="material-icons">payments</i>
            <p>No advance payments found</p>
          </div>
        </div>
      </div>

      <!-- Discount Calculator Tab -->
      <div class="content-section" *ngIf="activeTab === 'calculator'">
        <div class="calculator-card">
          <h2>
            <i class="material-icons">calculate</i>
            Discount Calculator
          </h2>
          <p>Calculate discount for advance payment</p>
          
          <div class="calculator-form">
            <div class="form-row">
              <div class="form-group">
                <label>Original Amount <span class="required">*</span></label>
                <input 
                  type="number" 
                  [(ngModel)]="calculator.originalAmount" 
                  (input)="calculateDiscount()"
                  placeholder="0.00" 
                  min="0" 
                  step="0.01" 
                />
              </div>
              <div class="form-group">
                <label>Advance Months <span class="required">*</span></label>
                <input 
                  type="number" 
                  [(ngModel)]="calculator.advanceMonths" 
                  (input)="calculateDiscount()"
                  placeholder="0" 
                  min="1" 
                />
              </div>
              <div class="form-group">
                <label>Select Discount Rule</label>
                <select [(ngModel)]="calculator.ruleId" (change)="calculateDiscount()">
                  <option value="">Select a rule</option>
                  <option *ngFor="let rule of activeRules" [value]="rule.id">
                    {{ rule.name }} ({{ getDiscountDisplay(rule) }})
                  </option>
                </select>
              </div>
            </div>

            <div class="calculator-results" *ngIf="calculator.discountAmount > 0">
              <div class="result-row">
                <span class="result-label">Original Amount:</span>
                <span class="result-value">{{ formatCurrency(calculator.originalAmount) }}</span>
              </div>
              <div class="result-row">
                <span class="result-label">Discount Amount:</span>
                <span class="result-value discount">{{ formatCurrency(calculator.discountAmount) }}</span>
              </div>
              <div class="result-row total">
                <span class="result-label">Final Amount:</span>
                <span class="result-value">{{ formatCurrency(calculator.finalAmount) }}</span>
              </div>
              <div class="result-row savings">
                <span class="result-label">You Save:</span>
                <span class="result-value">{{ formatCurrency(calculator.discountAmount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create/Edit Rule Modal -->
      <div class="modal-overlay" *ngIf="showCreateRule || editingRule" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingRule ? 'Edit Discount Rule' : 'Create Discount Rule' }}</h2>
            <button class="close-btn" (click)="closeModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Rule Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newRule.name" placeholder="e.g., 3 Months Advance - 5% Discount" required />
                </div>
                <div class="form-group">
                  <label>Discount Type <span class="required">*</span></label>
                  <select [(ngModel)]="newRule.discountType" (change)="onDiscountTypeChange()" required>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newRule.description" placeholder="Describe this discount rule" rows="3"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Advance Months <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newRule.advanceMonths" min="1" placeholder="e.g., 3" required />
                </div>
                <div class="form-group">
                  <label>{{ newRule.discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount' }} <span class="required">*</span></label>
                  <input 
                    type="number" 
                    [(ngModel)]="newRule.discountValue" 
                    min="0" 
                    [max]="getMaxDiscountValue()"
                    step="0.01" 
                    placeholder="0.00" 
                    required 
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Applicable To <span class="required">*</span></label>
                  <select [(ngModel)]="newRule.applicableTo" required>
                    <option value="all">All Bills</option>
                    <option value="maintenance">Maintenance Only</option>
                    <option value="utility">Utility Only</option>
                    <option value="service">Service Only</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Auto-Apply</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.autoApply" id="autoApply" />
                    <label for="autoApply"></label>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Minimum Amount (Optional)</label>
                  <input type="number" [(ngModel)]="newRule.minimumAmount" min="0" step="0.01" placeholder="No minimum" />
                </div>
                <div class="form-group" *ngIf="newRule.discountType === 'percentage'">
                  <label>Maximum Discount (Optional)</label>
                  <input type="number" [(ngModel)]="newRule.maximumDiscount" min="0" step="0.01" placeholder="No limit" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Valid From <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="validFrom" required />
                </div>
                <div class="form-group">
                  <label>Valid Until (Optional)</label>
                  <input type="date" [(ngModel)]="validUntil" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveRule()" [disabled]="!isRuleValid()">
              <i class="material-icons">save</i>
              {{ editingRule ? 'Update' : 'Create' }} Rule
            </button>
          </div>
        </div>
      </div>

      <!-- Rule Details Modal -->
      <div class="modal-overlay" *ngIf="selectedRule" (click)="selectedRule = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ selectedRule?.name }}</h2>
            <button class="close-btn" (click)="selectedRule = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedRule">
            <div class="rule-detail-section">
              <h3>Rule Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Discount Type:</span>
                  <span class="value">{{ getDiscountTypeLabel(selectedRule.discountType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Discount Value:</span>
                  <span class="value">{{ getDiscountDisplay(selectedRule) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Advance Months:</span>
                  <span class="value">{{ selectedRule.advanceMonths }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Applicable To:</span>
                  <span class="value">{{ getApplicableToLabel(selectedRule.applicableTo) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Auto-Apply:</span>
                  <span class="value">{{ selectedRule.autoApply ? 'Yes' : 'No' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="selectedRule.isActive ? 'active' : 'inactive'">
                    {{ selectedRule.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedRule = null">Close</button>
            <button class="btn btn-primary" (click)="editRule(selectedRule!)">
              <i class="material-icons">edit</i>
              Edit Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .discounts-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
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
      background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
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
      color: #e91e63;
    }

    .tab.active {
      color: #e91e63;
      border-bottom-color: #e91e63;
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
      margin-bottom: 12px;
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

    .rule-badge.percentage { background: #e8f8f0; color: #1e9e5a; }
    .rule-badge.fixed { background: #e7f3ff; color: #2980b9; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.inactive { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.applied { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.cancelled { background: #ffeaea; color: #c0392b; }

    .rule-description {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

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
      color: #e91e63;
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
    .action-btn.apply { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.cancel { background: #f5f7fa; color: #7f8c8d; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    /* Payments Table */
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

    .resident-flat {
      font-size: 12px;
      color: #7f8c8d;
    }

    .type-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-badge.maintenance { background: #e7f3ff; color: #2980b9; }
    .type-badge.utility { background: #fff4e6; color: #e67e22; }
    .type-badge.service { background: #e8f8f0; color: #1e9e5a; }
    .type-badge.other { background: #f5f7fa; color: #7f8c8d; }

    .months-badge {
      padding: 4px 10px;
      background: #f4e7ff;
      color: #8e44ad;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .discount-amount {
      font-weight: 600;
      color: #1e9e5a;
    }

    .final-amount {
      font-weight: 700;
      color: #2c3e50;
      font-size: 16px;
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

    /* Calculator */
    .calculator-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 800px;
      margin: 0 auto;
    }

    .calculator-card h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .calculator-card p {
      margin: 0 0 24px 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .calculator-form {
      margin-top: 24px;
    }

    .calculator-results {
      margin-top: 24px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .result-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e9ecef;
    }

    .result-row:last-child {
      border-bottom: none;
    }

    .result-row.total {
      border-top: 2px solid #e9ecef;
      padding-top: 16px;
      margin-top: 8px;
      font-weight: 700;
      font-size: 18px;
    }

    .result-row.savings {
      background: #e8f8f0;
      padding: 12px;
      border-radius: 8px;
      margin-top: 8px;
      font-weight: 600;
    }

    .result-label {
      color: #7f8c8d;
      font-size: 14px;
    }

    .result-value {
      color: #2c3e50;
      font-weight: 600;
      font-size: 16px;
    }

    .result-value.discount {
      color: #1e9e5a;
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

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
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

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #e91e63;
    }

    .toggle-switch {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toggle-switch input[type="checkbox"] {
      width: 40px;
      height: 20px;
      appearance: none;
      background: #ccc;
      border-radius: 20px;
      position: relative;
      cursor: pointer;
      transition: background 0.3s;
    }

    .toggle-switch input[type="checkbox"]:checked {
      background: #e91e63;
    }

    .toggle-switch input[type="checkbox"]::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      top: 2px;
      left: 2px;
      transition: transform 0.3s;
    }

    .toggle-switch input[type="checkbox"]:checked::before {
      transform: translateX(20px);
    }

    .rule-detail-section {
      margin-bottom: 24px;
    }

    .rule-detail-section h3 {
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
      background: #e91e63;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #c2185b;
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

      .payments-table-container {
        overflow-x: auto;
      }

      .payments-table {
        min-width: 1200px;
      }
    }
  `]
})
export class AdvancePaymentDiscountsComponent implements OnInit, OnDestroy {
  rules: DiscountRule[] = [];
  filteredRules: DiscountRule[] = [];
  payments: AdvancePayment[] = [];
  filteredPayments: AdvancePayment[] = [];
  selectedRule: DiscountRule | null = null;
  editingRule: DiscountRule | null = null;
  searchQuery: string = '';
  paymentSearchQuery: string = '';
  statusFilter: string = 'all';
  typeFilter: string = 'all';
  paymentStatusFilter: string = 'all';
  activeTab: 'rules' | 'payments' | 'calculator' = 'rules';
  showCreateRule: boolean = false;
  showReports: boolean = false;
  validFrom: string = '';
  validUntil: string = '';

  newRule: Partial<DiscountRule> = {
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    advanceMonths: 1,
    applicableTo: 'all',
    isActive: true,
    autoApply: false
  };

  calculator = {
    originalAmount: 0,
    advanceMonths: 0,
    ruleId: '',
    discountAmount: 0,
    finalAmount: 0
  };

  private destroy$ = new Subject<void>();

  constructor() {
    const today = new Date();
    this.validFrom = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadRules();
    this.loadPayments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load discount rules
   */
  loadRules(): void {
    this.rules = [
      {
        id: 'rule-1',
        name: '3 Months Advance - 5% Discount',
        description: '5% discount for paying 3 months in advance',
        discountType: 'percentage',
        discountValue: 5,
        advanceMonths: 3,
        applicableTo: 'all',
        isActive: true,
        autoApply: true,
        validFrom: new Date(2024, 0, 1),
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      },
      {
        id: 'rule-2',
        name: '6 Months Advance - 10% Discount',
        description: '10% discount for paying 6 months in advance',
        discountType: 'percentage',
        discountValue: 10,
        advanceMonths: 6,
        maximumDiscount: 5000,
        applicableTo: 'maintenance',
        isActive: true,
        autoApply: true,
        validFrom: new Date(2024, 0, 1),
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      },
      {
        id: 'rule-3',
        name: '12 Months Advance - Fixed Discount',
        description: 'Fixed ₹2000 discount for paying 12 months in advance',
        discountType: 'fixed',
        discountValue: 2000,
        advanceMonths: 12,
        minimumAmount: 50000,
        applicableTo: 'all',
        isActive: true,
        autoApply: false,
        validFrom: new Date(2024, 0, 1),
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      }
    ];
    this.filterRules();
  }

  /**
   * Load advance payments
   */
  loadPayments(): void {
    this.payments = [
      {
        id: 'pay-1',
        paymentNumber: 'ADV-2024-001',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        paymentType: 'maintenance',
        originalAmount: 16500,
        advanceMonths: 3,
        discountRuleId: 'rule-1',
        discountRuleName: '3 Months Advance - 5% Discount',
        discountAmount: 825,
        finalAmount: 15675,
        paymentDate: new Date(2024, 1, 1),
        status: 'applied',
        createdAt: new Date(2024, 1, 1)
      },
      {
        id: 'pay-2',
        paymentNumber: 'ADV-2024-002',
        residentId: 'res-2',
        residentName: 'Priya Sharma',
        flatNumber: 'B-205',
        billId: 'bill-1',
        billNumber: 'UB-2024-001',
        paymentType: 'utility',
        originalAmount: 3000,
        advanceMonths: 6,
        discountRuleId: 'rule-2',
        discountRuleName: '6 Months Advance - 10% Discount',
        discountAmount: 300,
        finalAmount: 2700,
        paymentDate: new Date(2024, 1, 5),
        status: 'pending',
        createdAt: new Date(2024, 1, 5)
      }
    ];
    this.filterPayments();
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

    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(r => r.discountType === this.typeFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query))
      );
    }

    this.filteredRules = filtered;
  }

  /**
   * Filter payments
   */
  filterPayments(): void {
    let filtered = [...this.payments];

    if (this.paymentStatusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.paymentStatusFilter);
    }

    if (this.paymentSearchQuery.trim()) {
      const query = this.paymentSearchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.paymentNumber.toLowerCase().includes(query) ||
        p.residentName.toLowerCase().includes(query) ||
        p.flatNumber.toLowerCase().includes(query) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(query)) ||
        (p.billNumber && p.billNumber.toLowerCase().includes(query))
      );
    }

    this.filteredPayments = filtered;
  }

  /**
   * Get active rules count
   */
  get activeRulesCount(): number {
    return this.rules.filter(r => r.isActive).length;
  }

  /**
   * Get advance payments count
   */
  get advancePaymentsCount(): number {
    return this.payments.length;
  }

  /**
   * Get total discounts
   */
  get totalDiscounts(): number {
    return this.payments
      .filter(p => p.status === 'applied')
      .reduce((sum, p) => sum + p.discountAmount, 0);
  }

  /**
   * Get active rules
   */
  get activeRules(): DiscountRule[] {
    return this.rules.filter(r => r.isActive);
  }

  /**
   * View rule details
   */
  viewRule(rule: DiscountRule): void {
    this.selectedRule = rule;
  }

  /**
   * Edit rule
   */
  editRule(rule: DiscountRule): void {
    this.editingRule = rule;
    this.newRule = { ...rule };
    this.validFrom = new Date(rule.validFrom).toISOString().split('T')[0];
    this.validUntil = rule.validUntil ? new Date(rule.validUntil).toISOString().split('T')[0] : '';
    this.showCreateRule = true;
  }

  /**
   * Toggle rule status
   */
  toggleRule(rule: DiscountRule): void {
    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date();
    this.filterRules();
    alert(`Rule ${rule.isActive ? 'activated' : 'deactivated'} successfully!`);
  }

  /**
   * Delete rule
   */
  deleteRule(rule: DiscountRule): void {
    if (confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      this.rules = this.rules.filter(r => r.id !== rule.id);
      this.filterRules();
      alert('Rule deleted successfully!');
    }
  }

  /**
   * Save rule
   */
  saveRule(): void {
    if (!this.isRuleValid()) {
      return;
    }

    const rule: DiscountRule = {
      id: this.editingRule?.id || `rule-${Date.now()}`,
      name: this.newRule.name!,
      description: this.newRule.description || '',
      discountType: this.newRule.discountType!,
      discountValue: this.newRule.discountValue!,
      advanceMonths: this.newRule.advanceMonths!,
      minimumAmount: this.newRule.minimumAmount,
      maximumDiscount: this.newRule.maximumDiscount,
      applicableTo: this.newRule.applicableTo!,
      isActive: this.newRule.isActive ?? true,
      autoApply: this.newRule.autoApply ?? false,
      validFrom: new Date(this.validFrom),
      validUntil: this.validUntil ? new Date(this.validUntil) : undefined,
      createdAt: this.editingRule?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (this.editingRule) {
      const index = this.rules.findIndex(r => r.id === this.editingRule!.id);
      if (index > -1) {
        this.rules[index] = rule;
      }
      alert('Rule updated successfully!');
    } else {
      this.rules.unshift(rule);
      alert('Rule created successfully!');
    }

    this.filterRules();
    this.closeModal();
  }

  /**
   * Close modal
   */
  closeModal(): void {
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
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      advanceMonths: 1,
      applicableTo: 'all',
      isActive: true,
      autoApply: false
    };
    const today = new Date();
    this.validFrom = today.toISOString().split('T')[0];
    this.validUntil = '';
  }

  /**
   * On discount type change
   */
  onDiscountTypeChange(): void {
    // Reset discount value when type changes
    this.newRule.discountValue = 0;
    this.newRule.maximumDiscount = undefined;
  }

  /**
   * Calculate discount
   */
  calculateDiscount(): void {
    if (!this.calculator.originalAmount || !this.calculator.advanceMonths || !this.calculator.ruleId) {
      this.calculator.discountAmount = 0;
      this.calculator.finalAmount = this.calculator.originalAmount || 0;
      return;
    }

    const rule = this.rules.find(r => r.id === this.calculator.ruleId);
    if (!rule || !rule.isActive) {
      this.calculator.discountAmount = 0;
      this.calculator.finalAmount = this.calculator.originalAmount;
      return;
    }

    // Check if advance months match
    if (rule.advanceMonths !== this.calculator.advanceMonths) {
      this.calculator.discountAmount = 0;
      this.calculator.finalAmount = this.calculator.originalAmount;
      return;
    }

    // Check minimum amount
    if (rule.minimumAmount && this.calculator.originalAmount < rule.minimumAmount) {
      this.calculator.discountAmount = 0;
      this.calculator.finalAmount = this.calculator.originalAmount;
      return;
    }

    // Calculate discount
    let discount = 0;
    if (rule.discountType === 'percentage') {
      discount = (this.calculator.originalAmount * rule.discountValue) / 100;
      // Apply maximum discount cap if set
      if (rule.maximumDiscount && discount > rule.maximumDiscount) {
        discount = rule.maximumDiscount;
      }
    } else {
      discount = rule.discountValue;
    }

    this.calculator.discountAmount = discount;
    this.calculator.finalAmount = this.calculator.originalAmount - discount;
  }

  /**
   * View payment
   */
  viewPayment(payment: AdvancePayment): void {
    // View payment details
    console.log('View payment:', payment);
  }

  /**
   * Apply discount
   */
  applyDiscount(payment: AdvancePayment): void {
    if (confirm(`Apply discount of ${this.formatCurrency(payment.discountAmount)} to payment ${payment.paymentNumber}?`)) {
      payment.status = 'applied';
      this.filterPayments();
      alert('Discount applied successfully!');
    }
  }

  /**
   * Cancel payment
   */
  cancelPayment(payment: AdvancePayment): void {
    if (confirm(`Cancel advance payment ${payment.paymentNumber}?`)) {
      payment.status = 'cancelled';
      this.filterPayments();
      alert('Payment cancelled successfully!');
    }
  }

  /**
   * Is rule valid
   */
  isRuleValid(): boolean {
    return !!(
      this.newRule.name &&
      this.newRule.discountType &&
      this.newRule.discountValue &&
      this.newRule.discountValue > 0 &&
      this.newRule.advanceMonths &&
      this.newRule.advanceMonths > 0 &&
      this.newRule.applicableTo &&
      this.validFrom
    );
  }

  /**
   * Get discount type label
   */
  getDiscountTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      percentage: 'Percentage',
      fixed: 'Fixed'
    };
    return labels[type] || type;
  }

  /**
   * Get discount display
   */
  getDiscountDisplay(rule: DiscountRule): string {
    if (rule.discountType === 'percentage') {
      return `${rule.discountValue}%`;
    } else {
      return this.formatCurrency(rule.discountValue);
    }
  }

  /**
   * Get max discount value for input field
   */
  getMaxDiscountValue(): number | null {
    const discountType = this.newRule.discountType;
    if (discountType === 'percentage') {
      return 100;
    }
    return null;
  }

  /**
   * Get applicable to label
   */
  getApplicableToLabel(type: string): string {
    const labels: { [key: string]: string } = {
      all: 'All Bills',
      maintenance: 'Maintenance Only',
      utility: 'Utility Only',
      service: 'Service Only',
      custom: 'Custom'
    };
    return labels[type] || type;
  }

  /**
   * Get payment type label
   */
  getPaymentTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      maintenance: 'Maintenance',
      utility: 'Utility',
      service: 'Service',
      other: 'Other'
    };
    return labels[type] || type;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      applied: 'Applied',
      cancelled: 'Cancelled'
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
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}
