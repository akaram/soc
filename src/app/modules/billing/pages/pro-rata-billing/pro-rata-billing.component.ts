import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillDocumentDownloadService } from '../../../../core/services/bill-document-download.service';

/**
 * Pro-rata Billing Component
 * Handles pro-rata billing for new residents based on move-in dates
 */
interface Resident {
  id: string;
  name: string;
  flatNumber: string;
  email?: string;
  phone?: string;
  moveInDate: Date;
  moveOutDate?: Date;
  isActive: boolean;
}

interface ProRataBill {
  id: string;
  billNumber: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  billType: 'maintenance' | 'utility' | 'service' | 'other';
  billingPeriod: {
    startDate: Date;
    endDate: Date;
    totalDays: number;
  };
  moveInDate: Date;
  daysInPeriod: number;
  fullPeriodAmount: number;
  proRataAmount: number;
  tax: number;
  totalAmount: number;
  billDate: Date;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
}

interface BillingRule {
  id: string;
  name: string;
  billType: 'maintenance' | 'utility' | 'service' | 'other';
  calculationMethod: 'daily' | 'monthly' | 'custom';
  baseAmount: number;
  taxRate: number;
  applicableFrom: Date;
  applicableUntil?: Date;
  isActive: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-pro-rata-billing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="pro-rata-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">calculate</i>
            Pro-rata Billing for New Residents
          </h1>
          <p>Calculate and generate pro-rata bills for residents based on move-in dates</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showRules = true" title="Billing Rules">
            <i class="material-icons">rule</i>
            Rules
          </button>
          <button class="icon-btn primary" (click)="showGenerateBill = true" title="Generate Bill">
            <i class="material-icons">add</i>
            Generate Bill
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">people</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ newResidentsCount }}</div>
            <div class="stat-label">New Residents</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ bills.length }}</div>
            <div class="stat-label">Pro-rata Bills</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingBillsCount }}</div>
            <div class="stat-label">Pending Bills</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalBillingAmount) }}</div>
            <div class="stat-label">Total Billing</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by bill number, resident name, flat number..." 
            [(ngModel)]="searchQuery"
            (input)="filterBills()"
          />
        </div>
        <select [(ngModel)]="billTypeFilter" (change)="filterBills()" class="filter-select">
          <option value="all">All Types</option>
          <option value="maintenance">Maintenance</option>
          <option value="utility">Utility</option>
          <option value="service">Service</option>
          <option value="other">Other</option>
        </select>
        <select [(ngModel)]="statusFilter" (change)="filterBills()" class="filter-select">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="month" [(ngModel)]="monthFilter" (change)="filterBills()" class="filter-select" />
      </div>

      <!-- Bills Table -->
      <div class="bills-table-container">
        <table class="bills-table">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Resident</th>
              <th>Flat</th>
              <th>Bill Type</th>
              <th>Move-in Date</th>
              <th>Period</th>
              <th>Days</th>
              <th>Full Amount</th>
              <th>Pro-rata Amount</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let bill of filteredBills">
              <td>
                <strong>{{ bill.billNumber }}</strong>
              </td>
              <td>
                <div class="resident-info">
                  <div class="resident-name">{{ bill.residentName }}</div>
                  <div class="resident-contact" *ngIf="getResidentEmail(bill.residentId)">
                    {{ getResidentEmail(bill.residentId) }}
                  </div>
                </div>
              </td>
              <td>{{ bill.flatNumber }}</td>
              <td>
                <span class="type-badge" [ngClass]="bill.billType">
                  {{ getBillTypeLabel(bill.billType) }}
                </span>
              </td>
              <td>{{ formatDate(bill.moveInDate) }}</td>
              <td>
                <div class="period-info">
                  <div>{{ formatDate(bill.billingPeriod.startDate) }}</div>
                  <div>to</div>
                  <div>{{ formatDate(bill.billingPeriod.endDate) }}</div>
                </div>
              </td>
              <td>
                <span class="days-badge">{{ bill.daysInPeriod }} / {{ bill.billingPeriod.totalDays }}</span>
              </td>
              <td>{{ formatCurrency(bill.fullPeriodAmount) }}</td>
              <td class="pro-rata-amount">{{ formatCurrency(bill.proRataAmount) }}</td>
              <td class="total-amount">{{ formatCurrency(bill.totalAmount) }}</td>
              <td>
                <span class="status-badge" [ngClass]="bill.status">
                  {{ getStatusLabel(bill.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewBill(bill)" title="View Details">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn download" (click)="downloadBill(bill)" title="Download">
                    <i class="material-icons">download</i>
                  </button>
                  <button class="action-btn edit" (click)="editBill(bill)" title="Edit" *ngIf="bill.status === 'pending'">
                    <i class="material-icons">edit</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredBills.length === 0">
          <i class="material-icons">receipt</i>
          <p>No pro-rata bills found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
        </div>
      </div>

      <!-- Generate Bill Modal -->
      <div class="modal-overlay" *ngIf="showGenerateBill" (click)="showGenerateBill = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Generate Pro-rata Bill</h2>
            <button class="close-btn" (click)="showGenerateBill = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Select Resident <span class="required">*</span></label>
                  <select [(ngModel)]="newBill.residentId" (change)="onResidentChange()" required>
                    <option value="">Select a resident</option>
                    <option *ngFor="let resident of newResidents" [value]="resident.id">
                      {{ resident.name }} - {{ resident.flatNumber }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Bill Type <span class="required">*</span></label>
                  <select [(ngModel)]="newBill.billType" (change)="onBillTypeChange()" required>
                    <option value="">Select Type</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="utility">Utility</option>
                    <option value="service">Service</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Move-in Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="moveInDate" (change)="calculateProRata()" required />
                </div>
                <div class="form-group">
                  <label>Billing Period Start <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="periodStartDate" (change)="calculateProRata()" required />
                </div>
                <div class="form-group">
                  <label>Billing Period End <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="periodEndDate" (change)="calculateProRata()" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Full Period Amount <span class="required">*</span></label>
                  <input 
                    type="number" 
                    [(ngModel)]="newBill.fullPeriodAmount" 
                    (input)="calculateProRata()"
                    min="0" 
                    step="0.01" 
                    placeholder="0.00" 
                    required 
                  />
                </div>
                <div class="form-group">
                  <label>Tax Rate (%)</label>
                  <input 
                    type="number" 
                    [(ngModel)]="taxRate" 
                    (input)="calculateProRata()"
                    min="0" 
                    max="100" 
                    step="0.01" 
                    placeholder="18" 
                  />
                </div>
              </div>

              <!-- Calculation Preview -->
              <div class="calculation-preview" *ngIf="(newBill.daysInPeriod || 0) > 0">
                <h3>Calculation Preview</h3>
                <div class="calc-details">
                  <div class="calc-row">
                    <span>Total Days in Period:</span>
                    <strong>{{ newBill.billingPeriod?.totalDays || 0 }} days</strong>
                  </div>
                  <div class="calc-row">
                    <span>Days Resident in Period:</span>
                    <strong>{{ newBill.daysInPeriod }} days</strong>
                  </div>
                  <div class="calc-row">
                    <span>Full Period Amount:</span>
                    <strong>{{ formatCurrency(newBill.fullPeriodAmount || 0) }}</strong>
                  </div>
                  <div class="calc-row">
                    <span>Pro-rata Amount:</span>
                    <strong class="pro-rata">{{ formatCurrency(newBill.proRataAmount || 0) }}</strong>
                  </div>
                  <div class="calc-row">
                    <span>Tax ({{ taxRate }}%):</span>
                    <strong>{{ formatCurrency(newBill.tax || 0) }}</strong>
                  </div>
                  <div class="calc-row total">
                    <span>Total Amount:</span>
                    <strong>{{ formatCurrency(newBill.totalAmount || 0) }}</strong>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Bill Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="billDate" required />
                </div>
                <div class="form-group">
                  <label>Due Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="dueDate" required />
                </div>
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea [(ngModel)]="newBill.notes" placeholder="Additional notes" rows="3"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showGenerateBill = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveBill()" [disabled]="!isBillValid()">
              <i class="material-icons">save</i>
              Generate Bill
            </button>
          </div>
        </div>
      </div>

      <!-- Bill Details Modal -->
      <div class="modal-overlay" *ngIf="selectedBill" (click)="selectedBill = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Bill Details - {{ selectedBill?.billNumber }}</h2>
            <button class="close-btn" (click)="selectedBill = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedBill">
            <div class="bill-detail-section">
              <h3>Resident Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Name:</span>
                  <span class="value">{{ selectedBill.residentName }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Flat Number:</span>
                  <span class="value">{{ selectedBill.flatNumber }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Move-in Date:</span>
                  <span class="value">{{ formatDate(selectedBill.moveInDate) }}</span>
                </div>
              </div>
            </div>

            <div class="bill-detail-section">
              <h3>Billing Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Bill Type:</span>
                  <span class="value">{{ getBillTypeLabel(selectedBill.billType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Billing Period:</span>
                  <span class="value">
                    {{ formatDate(selectedBill.billingPeriod.startDate) }} - 
                    {{ formatDate(selectedBill.billingPeriod.endDate) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">Total Days in Period:</span>
                  <span class="value">{{ selectedBill.billingPeriod.totalDays }} days</span>
                </div>
                <div class="detail-item">
                  <span class="label">Days Resident in Period:</span>
                  <span class="value">{{ selectedBill.daysInPeriod }} days</span>
                </div>
              </div>
            </div>

            <div class="bill-detail-section">
              <h3>Amount Breakdown</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Full Period Amount:</span>
                  <span class="value">{{ formatCurrency(selectedBill.fullPeriodAmount) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Pro-rata Amount:</span>
                  <span class="value pro-rata">{{ formatCurrency(selectedBill.proRataAmount) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Tax:</span>
                  <span class="value">{{ formatCurrency(selectedBill.tax) }}</span>
                </div>
                <div class="detail-item total">
                  <span class="label">Total Amount:</span>
                  <span class="value">{{ formatCurrency(selectedBill.totalAmount) }}</span>
                </div>
              </div>
            </div>

            <div class="bill-detail-section">
              <h3>Payment Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Bill Date:</span>
                  <span class="value">{{ formatDate(selectedBill.billDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Due Date:</span>
                  <span class="value">{{ formatDate(selectedBill.dueDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="selectedBill.status">
                    {{ getStatusLabel(selectedBill.status) }}
                  </span>
                </div>
                <div class="detail-item" *ngIf="selectedBill.paidDate">
                  <span class="label">Paid Date:</span>
                  <span class="value">{{ formatDate(selectedBill.paidDate) }}</span>
                </div>
              </div>
            </div>

            <div class="bill-detail-section" *ngIf="selectedBill.notes">
              <h3>Notes</h3>
              <p>{{ selectedBill.notes }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedBill = null">Close</button>
            <button class="btn btn-primary" (click)="downloadBill(selectedBill!)">
              <i class="material-icons">download</i>
              Download Bill
            </button>
          </div>
        </div>
      </div>

      <!-- Billing Rules Modal -->
      <div class="modal-overlay" *ngIf="showRules" (click)="showRules = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Billing Rules</h2>
            <button class="close-btn" (click)="showRules = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="rules-grid">
              <div *ngFor="let rule of rules" class="rule-card">
                <div class="rule-header">
                  <h3>{{ rule.name }}</h3>
                  <span class="status-badge" [ngClass]="rule.isActive ? 'active' : 'inactive'">
                    {{ rule.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="rule-details">
                  <div class="rule-item">
                    <span>Bill Type:</span>
                    <strong>{{ getBillTypeLabel(rule.billType) }}</strong>
                  </div>
                  <div class="rule-item">
                    <span>Calculation Method:</span>
                    <strong>{{ getCalculationMethodLabel(rule.calculationMethod) }}</strong>
                  </div>
                  <div class="rule-item">
                    <span>Base Amount:</span>
                    <strong>{{ formatCurrency(rule.baseAmount) }}</strong>
                  </div>
                  <div class="rule-item">
                    <span>Tax Rate:</span>
                    <strong>{{ rule.taxRate }}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showRules = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pro-rata-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #673ab7 0%, #512da8 100%);
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
      background: linear-gradient(135deg, #673ab7 0%, #512da8 100%);
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

    /* Filters */
    .filters-section {
      padding: 0 24px 24px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
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

    /* Bills Table */
    .bills-table-container {
      padding: 0 24px 24px;
    }

    .bills-table {
      width: 100%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .bills-table thead {
      background: #f8f9fa;
    }

    .bills-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .bills-table td {
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

    .resident-contact {
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

    .period-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
    }

    .days-badge {
      padding: 4px 10px;
      background: #f4e7ff;
      color: #8e44ad;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .pro-rata-amount {
      font-weight: 600;
      color: #673ab7;
    }

    .total-amount {
      font-weight: 700;
      color: #2c3e50;
      font-size: 16px;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.overdue { background: #ffeaea; color: #c0392b; }
    .status-badge.cancelled { background: #f5f7fa; color: #7f8c8d; }

    .action-buttons {
      display: flex;
      gap: 4px;
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

    .action-btn.view { background: #e7f3ff; color: #2980b9; }
    .action-btn.download { background: #f4e7ff; color: #8e44ad; }
    .action-btn.edit { background: #fff4e6; color: #e67e22; }

    .action-btn:hover {
      transform: scale(1.1);
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
      border-color: #673ab7;
    }

    .calculation-preview {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 16px;
    }

    .calculation-preview h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .calc-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .calc-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
    }

    .calc-row:last-child {
      border-bottom: none;
    }

    .calc-row.total {
      border-top: 2px solid #e9ecef;
      padding-top: 12px;
      margin-top: 8px;
      font-weight: 700;
      font-size: 18px;
    }

    .calc-row .pro-rata {
      color: #673ab7;
      font-weight: 600;
    }

    .bill-detail-section {
      margin-bottom: 24px;
    }

    .bill-detail-section h3 {
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

    .detail-item .value.pro-rata {
      color: #673ab7;
      font-weight: 600;
    }

    .detail-item.total {
      grid-column: 1 / -1;
      border-top: 2px solid #e9ecef;
      padding-top: 12px;
      margin-top: 8px;
    }

    .detail-item.total .value {
      font-size: 18px;
      font-weight: 700;
    }

    .bill-detail-section p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .rule-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
      border: 2px solid #e9ecef;
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .rule-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .rule-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rule-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #2c3e50;
    }

    .rule-item strong {
      color: #673ab7;
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
      background: #673ab7;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #512da8;
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
        padding: 0 16px 16px;
      }

      .bills-table-container {
        padding: 0 16px 16px;
        overflow-x: auto;
      }

      .bills-table {
        min-width: 1400px;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProRataBillingComponent implements OnInit, OnDestroy {
  residents: Resident[] = [];
  bills: ProRataBill[] = [];
  filteredBills: ProRataBill[] = [];
  rules: BillingRule[] = [];
  selectedBill: ProRataBill | null = null;
  editingBill: ProRataBill | null = null;
  searchQuery: string = '';
  billTypeFilter: string = 'all';
  statusFilter: string = 'all';
  monthFilter: string = '';
  showGenerateBill: boolean = false;
  showRules: boolean = false;
  moveInDate: string = '';
  periodStartDate: string = '';
  periodEndDate: string = '';
  billDate: string = '';
  dueDate: string = '';
  taxRate: number = 18;

  newBill: Partial<ProRataBill> = {
    residentId: '',
    billType: 'maintenance',
    fullPeriodAmount: 0,
    proRataAmount: 0,
    tax: 0,
    totalAmount: 0,
    daysInPeriod: 0,
    status: 'pending'
  };

  private destroy$ = new Subject<void>();
  private billDownload = inject(BillDocumentDownloadService);

  constructor() {
    const today = new Date();
    this.billDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadResidents();
    this.loadBills();
    this.loadRules();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load residents
   */
  loadResidents(): void {
    this.residents = [
      {
        id: 'res-1',
        name: 'Rajesh Kumar',
        flatNumber: 'A-101',
        email: 'rajesh@example.com',
        phone: '9876543210',
        moveInDate: new Date(2024, 1, 15),
        isActive: true
      },
      {
        id: 'res-2',
        name: 'Priya Sharma',
        flatNumber: 'B-205',
        email: 'priya@example.com',
        phone: '9876543211',
        moveInDate: new Date(2024, 1, 20),
        isActive: true
      },
      {
        id: 'res-3',
        name: 'Amit Patel',
        flatNumber: 'A-302',
        email: 'amit@example.com',
        phone: '9876543212',
        moveInDate: new Date(2024, 0, 10),
        isActive: true
      }
    ];
  }

  /**
   * Load bills
   */
  loadBills(): void {
    this.bills = [
      {
        id: 'bill-1',
        billNumber: 'PR-2024-02-001',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        billType: 'maintenance',
        billingPeriod: {
          startDate: new Date(2024, 1, 1),
          endDate: new Date(2024, 1, 29),
          totalDays: 29
        },
        moveInDate: new Date(2024, 1, 15),
        daysInPeriod: 15,
        fullPeriodAmount: 5000,
        proRataAmount: 2586.21,
        tax: 465.52,
        totalAmount: 3051.73,
        billDate: new Date(2024, 1, 16),
        dueDate: new Date(2024, 2, 16),
        status: 'pending',
        createdAt: new Date(2024, 1, 16)
      },
      {
        id: 'bill-2',
        billNumber: 'PR-2024-02-002',
        residentId: 'res-2',
        residentName: 'Priya Sharma',
        flatNumber: 'B-205',
        billType: 'maintenance',
        billingPeriod: {
          startDate: new Date(2024, 1, 1),
          endDate: new Date(2024, 1, 29),
          totalDays: 29
        },
        moveInDate: new Date(2024, 1, 20),
        daysInPeriod: 10,
        fullPeriodAmount: 5000,
        proRataAmount: 1724.14,
        tax: 310.34,
        totalAmount: 2034.48,
        billDate: new Date(2024, 1, 21),
        dueDate: new Date(2024, 2, 21),
        status: 'paid',
        paidDate: new Date(2024, 1, 25),
        createdAt: new Date(2024, 1, 21)
      }
    ];
    this.filterBills();
  }

  /**
   * Load billing rules
   */
  loadRules(): void {
    this.rules = [
      {
        id: 'rule-1',
        name: 'Monthly Maintenance - Pro-rata',
        billType: 'maintenance',
        calculationMethod: 'daily',
        baseAmount: 5000,
        taxRate: 18,
        applicableFrom: new Date(2024, 0, 1),
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'rule-2',
        name: 'Utility Charges - Pro-rata',
        billType: 'utility',
        calculationMethod: 'daily',
        baseAmount: 2000,
        taxRate: 18,
        applicableFrom: new Date(2024, 0, 1),
        isActive: true,
        createdAt: new Date(2024, 0, 1)
      }
    ];
  }

  /**
   * Filter bills
   */
  filterBills(): void {
    let filtered = [...this.bills];

    if (this.billTypeFilter !== 'all') {
      filtered = filtered.filter(b => b.billType === this.billTypeFilter);
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === this.statusFilter);
    }

    if (this.monthFilter) {
      const [year, month] = this.monthFilter.split('-').map(Number);
      filtered = filtered.filter(b => {
        const billMonth = b.billDate.getMonth() + 1;
        const billYear = b.billDate.getFullYear();
        return billMonth === month && billYear === year;
      });
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.billNumber.toLowerCase().includes(query) ||
        b.residentName.toLowerCase().includes(query) ||
        b.flatNumber.toLowerCase().includes(query)
      );
    }

    // Sort by bill date (newest first)
    filtered.sort((a, b) => b.billDate.getTime() - a.billDate.getTime());

    this.filteredBills = filtered;
  }

  /**
   * Get new residents count
   */
  get newResidentsCount(): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.residents.filter(r => 
      r.isActive && new Date(r.moveInDate) >= thirtyDaysAgo
    ).length;
  }

  /**
   * Get new residents
   */
  get newResidents(): Resident[] {
    return this.residents.filter(r => r.isActive);
  }

  /**
   * Get pending bills count
   */
  get pendingBillsCount(): number {
    return this.bills.filter(b => b.status === 'pending').length;
  }

  /**
   * Get total billing amount
   */
  get totalBillingAmount(): number {
    return this.bills.reduce((sum, b) => sum + b.totalAmount, 0);
  }

  /**
   * On resident change
   */
  onResidentChange(): void {
    if (this.newBill.residentId) {
      const resident = this.residents.find(r => r.id === this.newBill.residentId);
      if (resident) {
        this.moveInDate = new Date(resident.moveInDate).toISOString().split('T')[0];
        this.calculateProRata();
      }
    }
  }

  /**
   * On bill type change
   */
  onBillTypeChange(): void {
    const rule = this.rules.find(r => 
      r.billType === this.newBill.billType && 
      r.isActive
    );
    if (rule) {
      this.newBill.fullPeriodAmount = rule.baseAmount;
      this.taxRate = rule.taxRate;
      this.calculateProRata();
    }
  }

  /**
   * Calculate pro-rata
   */
  calculateProRata(): void {
    if (!this.moveInDate || !this.periodStartDate || !this.periodEndDate || !this.newBill.fullPeriodAmount) {
      this.newBill.proRataAmount = 0;
      this.newBill.tax = 0;
      this.newBill.totalAmount = 0;
      this.newBill.daysInPeriod = 0;
      return;
    }

    const moveIn = new Date(this.moveInDate);
    const periodStart = new Date(this.periodStartDate);
    const periodEnd = new Date(this.periodEndDate);

    // Calculate total days in period
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate days resident is in period
    let daysInPeriod = 0;
    if (moveIn <= periodEnd) {
      const startDate = moveIn > periodStart ? moveIn : periodStart;
      daysInPeriod = Math.ceil((periodEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Calculate pro-rata amount
    const proRataAmount = (this.newBill.fullPeriodAmount! / totalDays) * daysInPeriod;

    // Calculate tax
    const tax = (proRataAmount * this.taxRate) / 100;

    // Calculate total
    const totalAmount = proRataAmount + tax;

    this.newBill.daysInPeriod = daysInPeriod;
    this.newBill.proRataAmount = Math.round(proRataAmount * 100) / 100;
    this.newBill.tax = Math.round(tax * 100) / 100;
    this.newBill.totalAmount = Math.round(totalAmount * 100) / 100;
    this.newBill.billingPeriod = {
      startDate: periodStart,
      endDate: periodEnd,
      totalDays: totalDays
    };
  }

  /**
   * Save bill
   */
  saveBill(): void {
    if (!this.isBillValid()) {
      return;
    }

    const resident = this.residents.find(r => r.id === this.newBill.residentId);
    if (!resident) return;

    const bill: ProRataBill = {
      id: `bill-${Date.now()}`,
      billNumber: `PR-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(this.bills.length + 1).padStart(3, '0')}`,
      residentId: this.newBill.residentId!,
      residentName: resident.name,
      flatNumber: resident.flatNumber,
      billType: this.newBill.billType!,
      billingPeriod: this.newBill.billingPeriod!,
      moveInDate: new Date(this.moveInDate),
      daysInPeriod: this.newBill.daysInPeriod!,
      fullPeriodAmount: this.newBill.fullPeriodAmount!,
      proRataAmount: this.newBill.proRataAmount!,
      tax: this.newBill.tax!,
      totalAmount: this.newBill.totalAmount!,
      billDate: new Date(this.billDate),
      dueDate: new Date(this.dueDate),
      status: 'pending',
      notes: this.newBill.notes,
      createdAt: new Date()
    };

    this.bills.unshift(bill);
    this.filterBills();
    this.resetNewBill();
    this.showGenerateBill = false;
    alert('Pro-rata bill generated successfully!');
  }

  /**
   * Reset new bill
   */
  resetNewBill(): void {
    this.newBill = {
      residentId: '',
      billType: 'maintenance',
      fullPeriodAmount: 0,
      proRataAmount: 0,
      tax: 0,
      totalAmount: 0,
      daysInPeriod: 0,
      status: 'pending'
    };
    const today = new Date();
    this.billDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
    this.moveInDate = '';
    this.periodStartDate = '';
    this.periodEndDate = '';
    this.taxRate = 18;
  }

  /**
   * View bill
   */
  viewBill(bill: ProRataBill): void {
    this.selectedBill = bill;
  }

  /**
   * Edit bill
   */
  editBill(bill: ProRataBill): void {
    this.editingBill = bill;
    this.newBill = { ...bill };
    this.moveInDate = new Date(bill.moveInDate).toISOString().split('T')[0];
    this.periodStartDate = new Date(bill.billingPeriod.startDate).toISOString().split('T')[0];
    this.periodEndDate = new Date(bill.billingPeriod.endDate).toISOString().split('T')[0];
    this.billDate = new Date(bill.billDate).toISOString().split('T')[0];
    this.dueDate = new Date(bill.dueDate).toISOString().split('T')[0];
    this.showGenerateBill = true;
  }

  /**
   * Download bill
   */
  downloadBill(bill: ProRataBill): void {
    this.billDownload.downloadBillPdf({
      documentTitle: 'Pro-rata Bill',
      documentNumber: bill.billNumber,
      recipientName: bill.residentName,
      flatNumber: bill.flatNumber,
      issueDate: bill.billDate,
      dueDate: bill.dueDate,
      status: bill.status,
      lineItems: [
        {
          description: `${this.getBillTypeLabel(bill.billType)} (pro-rata)`,
          amount: bill.proRataAmount
        },
        { description: 'Tax', amount: bill.tax }
      ],
      summaryRows: [
        { label: 'Move-in date', value: this.formatDate(bill.moveInDate) },
        { label: 'Days in period', value: String(bill.daysInPeriod) },
        { label: 'Full period amount', value: this.formatCurrency(bill.fullPeriodAmount) },
        {
          label: 'Billing period',
          value: `${this.formatDate(bill.billingPeriod.startDate)} – ${this.formatDate(bill.billingPeriod.endDate)}`
        }
      ],
      totalAmount: bill.totalAmount,
      notes: bill.notes
    });
  }

  /**
   * Get resident email
   */
  getResidentEmail(residentId: string): string {
    const resident = this.residents.find(r => r.id === residentId);
    return resident?.email || '';
  }

  /**
   * Is bill valid
   */
  isBillValid(): boolean {
    return !!(
      this.newBill.residentId &&
      this.newBill.billType &&
      this.moveInDate &&
      this.periodStartDate &&
      this.periodEndDate &&
      this.newBill.fullPeriodAmount &&
      this.newBill.fullPeriodAmount > 0 &&
      this.billDate &&
      this.dueDate &&
      this.newBill.daysInPeriod &&
      this.newBill.daysInPeriod > 0
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
      other: 'Other'
    };
    return labels[type] || type;
  }

  /**
   * Get calculation method label
   */
  getCalculationMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      daily: 'Daily',
      monthly: 'Monthly',
      custom: 'Custom'
    };
    return labels[method] || method;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      paid: 'Paid',
      overdue: 'Overdue',
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

