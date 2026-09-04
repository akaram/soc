import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillDocumentDownloadService } from '../../../../core/services/bill-document-download.service';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { PaymentService } from '../../services/payment.service';
import { Payment, PaymentSummary } from '../../models/payment.model';

/**
 * Payment Tracking Component
 * Handles tracking and management of all payment transactions
 */

@Component({
  selector: 'app-payment-tracking',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="payment-tracking-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">payment</i>
            Payment Tracking
          </h1>
          <p>Track and manage all payment transactions</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/payment-transactions</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showReports = true" title="Reports">
            <i class="material-icons">assessment</i>
          </button>
          <button class="icon-btn primary" (click)="showAddPayment = true" title="Add Payment">
            <i class="material-icons">add</i>
            Add Payment
          </button>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">receipt_long</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.totalPayments }}</div>
            <div class="stat-label">Total Payments</div>
          </div>
        </div>
        <div class="stat-card amount">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(summary.totalAmount) }}</div>
            <div class="stat-label">Total Amount</div>
          </div>
        </div>
        <div class="stat-card completed">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.completedPayments }}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.pendingPayments }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card online">
          <div class="stat-icon">
            <i class="material-icons">payment</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.onlinePayments }}</div>
            <div class="stat-label">Online</div>
          </div>
        </div>
        <div class="stat-card today">
          <div class="stat-icon">
            <i class="material-icons">today</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(summary.todayAmount) }}</div>
            <div class="stat-label">Today's Collection</div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by payment number, resident, invoice, transaction ID..." 
            [(ngModel)]="searchQuery"
            (input)="filterPayments()"
          />
        </div>
        <select [(ngModel)]="paymentTypeFilter" (change)="filterPayments()" class="filter-select">
          <option value="all">All Types</option>
          <option value="maintenance">Maintenance</option>
          <option value="utility">Utility</option>
          <option value="service">Service</option>
          <option value="penalty">Penalty</option>
          <option value="other">Other</option>
        </select>
        <select [(ngModel)]="paymentMethodFilter" (change)="filterPayments()" class="filter-select">
          <option value="all">All Methods</option>
          <option value="online">Online</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
        <select [(ngModel)]="statusFilter" (change)="filterPayments()" class="filter-select">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select [(ngModel)]="dateRangeFilter" (change)="filterPayments()" class="filter-select">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      <!-- Payments Table -->
      <div class="payments-table-container">
        <table class="payments-table">
          <thead>
            <tr>
              <th>Payment #</th>
              <th>Date</th>
              <th>Recipient</th>
              <th>Type</th>
              <th>Invoice/Bill</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Transaction ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let payment of filteredPayments" [class.failed]="payment.status === 'failed'">
              <td>
                <strong>{{ payment.paymentNumber }}</strong>
              </td>
              <td>{{ formatDate(payment.paymentDate) }}</td>
              <td>
                <div class="recipient-info">
                  <div class="recipient-name">{{ payment.residentName || payment.vendorName || 'N/A' }}</div>
                  <div class="recipient-details" *ngIf="payment.flatNumber">{{ payment.flatNumber }}</div>
                </div>
              </td>
              <td>
                <span class="type-badge" [ngClass]="payment.paymentType">
                  {{ getPaymentTypeLabel(payment.paymentType) }}
                </span>
              </td>
              <td>
                <span *ngIf="payment.invoiceNumber">{{ payment.invoiceNumber }}</span>
                <span *ngIf="payment.billNumber">{{ payment.billNumber }}</span>
                <span *ngIf="!payment.invoiceNumber && !payment.billNumber">-</span>
              </td>
              <td class="amount">{{ formatCurrency(payment.amount) }}</td>
              <td>
                <span class="method-badge" [ngClass]="payment.paymentMethod">
                  {{ getPaymentMethodLabel(payment.paymentMethod) }}
                </span>
              </td>
              <td>
                <span *ngIf="payment.transactionId" class="transaction-id">{{ payment.transactionId }}</span>
                <span *ngIf="payment.chequeNumber" class="transaction-id">CHQ: {{ payment.chequeNumber }}</span>
                <span *ngIf="!payment.transactionId && !payment.chequeNumber">-</span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="payment.status">
                  {{ getStatusLabel(payment.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewPayment(payment)" title="View Details">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn receipt" (click)="generateReceipt(payment)" title="Generate Receipt" *ngIf="payment.status === 'completed'">
                    <i class="material-icons">receipt</i>
                  </button>
                  <button class="action-btn download" (click)="downloadReceipt(payment)" title="Download Receipt" *ngIf="payment.receiptGenerated">
                    <i class="material-icons">download</i>
                  </button>
                  <button class="action-btn refund" (click)="refundPayment(payment)" title="Refund" *ngIf="payment.status === 'completed'">
                    <i class="material-icons">undo</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredPayments.length === 0">
          <i class="material-icons">payment</i>
          <p>No payments found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
        </div>
      </div>

      <!-- Payment Details Modal -->
      <div class="modal-overlay" *ngIf="selectedPayment" (click)="closePaymentDetails()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Payment Details - {{ selectedPayment.paymentNumber }}</h2>
            <button class="close-btn" (click)="closePaymentDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedPayment">
            <div class="payment-header">
              <div class="payment-info">
                <h3>{{ selectedPayment.residentName || selectedPayment.vendorName || 'N/A' }}</h3>
                <p *ngIf="selectedPayment.flatNumber">{{ selectedPayment.flatNumber }}</p>
                <p>Payment Type: <strong>{{ getPaymentTypeLabel(selectedPayment.paymentType) }}</strong></p>
              </div>
              <div class="payment-status">
                <span class="status-badge large" [ngClass]="selectedPayment.status">
                  {{ getStatusLabel(selectedPayment.status) }}
                </span>
              </div>
            </div>

            <div class="payment-details">
              <div class="detail-row">
                <span class="label">Payment Amount:</span>
                <span class="value amount">{{ formatCurrency(selectedPayment.amount) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment Method:</span>
                <span class="value">{{ getPaymentMethodLabel(selectedPayment.paymentMethod) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment Date:</span>
                <span class="value">{{ formatDateTime(selectedPayment.paymentDate) }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.invoiceNumber">
                <span class="label">Invoice Number:</span>
                <span class="value">{{ selectedPayment.invoiceNumber }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.billNumber">
                <span class="label">Bill Number:</span>
                <span class="value">{{ selectedPayment.billNumber }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.transactionId">
                <span class="label">Transaction ID:</span>
                <span class="value transaction-id">{{ selectedPayment.transactionId }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.chequeNumber">
                <span class="label">Cheque Number:</span>
                <span class="value">{{ selectedPayment.chequeNumber }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.bankName">
                <span class="label">Bank Name:</span>
                <span class="value">{{ selectedPayment.bankName }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.accountNumber">
                <span class="label">Account Number:</span>
                <span class="value">{{ selectedPayment.accountNumber }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.upiId">
                <span class="label">UPI ID:</span>
                <span class="value">{{ selectedPayment.upiId }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Received By:</span>
                <span class="value">{{ selectedPayment.receivedBy }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.receiptNumber">
                <span class="label">Receipt Number:</span>
                <span class="value">{{ selectedPayment.receiptNumber }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Created At:</span>
                <span class="value">{{ formatDateTime(selectedPayment.createdAt) }}</span>
              </div>
            </div>

            <div class="payment-notes" *ngIf="selectedPayment.notes">
              <h4>Notes</h4>
              <p>{{ selectedPayment.notes }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closePaymentDetails()">Close</button>
            <button class="btn btn-primary" (click)="generateReceipt(selectedPayment!)" *ngIf="selectedPayment?.status === 'completed' && !selectedPayment?.receiptGenerated">
              <i class="material-icons">receipt</i>
              Generate Receipt
            </button>
            <button class="btn btn-success" (click)="downloadReceipt(selectedPayment!)" *ngIf="selectedPayment?.receiptGenerated">
              <i class="material-icons">download</i>
              Download Receipt
            </button>
            <button class="btn btn-warning" (click)="refundPayment(selectedPayment!)" *ngIf="selectedPayment?.status === 'completed'">
              <i class="material-icons">undo</i>
              Process Refund
            </button>
          </div>
        </div>
      </div>

      <!-- Add Payment Modal -->
      <div class="modal-overlay" *ngIf="showAddPayment" (click)="showAddPayment = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add Payment</h2>
            <button class="close-btn" (click)="showAddPayment = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Payment Type <span class="required">*</span></label>
                <select [(ngModel)]="newPayment.paymentType" required>
                  <option value="">Select Type</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="utility">Utility</option>
                  <option value="service">Service</option>
                  <option value="penalty">Penalty</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Payment Method <span class="required">*</span></label>
                <select [(ngModel)]="newPayment.paymentMethod" (change)="onPaymentMethodChange()" required>
                  <option value="">Select Method</option>
                  <option value="online">Online</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Recipient Type</label>
                <select [(ngModel)]="recipientType" (change)="onRecipientTypeChange()">
                  <option value="resident">Resident</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div class="form-group" *ngIf="recipientType === 'resident'">
                <label>Resident/Flat</label>
                <input type="text" [(ngModel)]="newPayment.flatNumber" placeholder="e.g., A-101" />
              </div>
              <div class="form-group" *ngIf="recipientType === 'vendor'">
                <label>Vendor Name</label>
                <input type="text" [(ngModel)]="newPayment.vendorName" placeholder="Vendor name" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Invoice/Bill Number</label>
                <input type="text" [(ngModel)]="invoiceBillNumber" placeholder="Invoice or Bill number" />
              </div>
              <div class="form-group">
                <label>Amount <span class="required">*</span></label>
                <input type="number" [(ngModel)]="newPayment.amount" placeholder="0.00" required min="0" step="0.01" />
              </div>
              <div class="form-group">
                <label>Payment Date <span class="required">*</span></label>
                <input type="date" [(ngModel)]="paymentDate" required />
              </div>
            </div>

            <!-- Payment Method Specific Fields -->
            <div class="payment-method-fields" *ngIf="newPayment.paymentMethod">
              <div class="form-group" *ngIf="newPayment.paymentMethod === 'online' || newPayment.paymentMethod === 'upi' || newPayment.paymentMethod === 'card'">
                <label>Transaction ID <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newPayment.transactionId" placeholder="Transaction ID" />
              </div>
              <div class="form-group" *ngIf="newPayment.paymentMethod === 'upi'">
                <label>UPI ID</label>
                <input type="text" [(ngModel)]="newPayment.upiId" placeholder="UPI ID" />
              </div>
              <div class="form-group" *ngIf="newPayment.paymentMethod === 'cheque'">
                <label>Cheque Number <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newPayment.chequeNumber" placeholder="Cheque number" />
              </div>
              <div class="form-group" *ngIf="newPayment.paymentMethod === 'bank_transfer' || newPayment.paymentMethod === 'cheque'">
                <label>Bank Name</label>
                <input type="text" [(ngModel)]="newPayment.bankName" placeholder="Bank name" />
              </div>
              <div class="form-group" *ngIf="newPayment.paymentMethod === 'bank_transfer'">
                <label>Account Number</label>
                <input type="text" [(ngModel)]="newPayment.accountNumber" placeholder="Account number" />
              </div>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="newPayment.notes" placeholder="Additional notes" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showAddPayment = false">Cancel</button>
            <button class="btn btn-primary" (click)="addPayment()" [disabled]="!isPaymentValid()">
              <i class="material-icons">check</i>
              Add Payment
            </button>
          </div>
        </div>
      </div>

      <!-- Reports Modal -->
      <div class="modal-overlay" *ngIf="showReports" (click)="showReports = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Payment Reports</h2>
            <button class="close-btn" (click)="showReports = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="reports-grid">
              <div class="report-card" (click)="generateReport('daily')">
                <i class="material-icons">today</i>
                <h3>Daily Report</h3>
                <p>Today's payment summary</p>
              </div>
              <div class="report-card" (click)="generateReport('monthly')">
                <i class="material-icons">calendar_month</i>
                <h3>Monthly Report</h3>
                <p>Monthly payment analysis</p>
              </div>
              <div class="report-card" (click)="generateReport('yearly')">
                <i class="material-icons">calendar_today</i>
                <h3>Yearly Report</h3>
                <p>Annual payment summary</p>
              </div>
              <div class="report-card" (click)="generateReport('method')">
                <i class="material-icons">payment</i>
                <h3>Payment Method Report</h3>
                <p>Breakdown by payment method</p>
              </div>
              <div class="report-card" (click)="generateReport('type')">
                <i class="material-icons">category</i>
                <h3>Payment Type Report</h3>
                <p>Breakdown by payment type</p>
              </div>
              <div class="report-card" (click)="generateReport('custom')">
                <i class="material-icons">tune</i>
                <h3>Custom Report</h3>
                <p>Generate custom date range report</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showReports = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payment-tracking-container {
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

    .api-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      font-size: 13px;
    }

    .load-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 24px 0;
      padding: 12px 16px;
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
      border-radius: 8px;
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
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .stat-card.amount .stat-icon { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .stat-card.completed .stat-icon { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }
    .stat-card.pending .stat-icon { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .stat-card.online .stat-icon { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); }
    .stat-card.today .stat-icon { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }

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

    /* Table */
    .payments-table-container {
      padding: 0 24px 24px;
    }

    .payments-table {
      width: 100%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
      letter-spacing: 0.5px;
    }

    .payments-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .payments-table tr.failed {
      background: #fff5f5;
    }

    .payments-table tr:hover {
      background: #f8f9fa;
    }

    .type-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-badge.maintenance { background: #e7f3ff; color: #2980b9; }
    .type-badge.utility { background: #fff4e6; color: #e67e22; }
    .type-badge.service { background: #e8f8f0; color: #1e9e5a; }
    .type-badge.penalty { background: #ffeaea; color: #c0392b; }
    .type-badge.other { background: #f5f7fa; color: #7f8c8d; }

    .method-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .method-badge.online { background: #e7f3ff; color: #2980b9; }
    .method-badge.cash { background: #e8f8f0; color: #1e9e5a; }
    .method-badge.cheque { background: #fff4e6; color: #e67e22; }
    .method-badge.bank_transfer { background: #f4e7ff; color: #8e44ad; }
    .method-badge.upi { background: #e7f3ff; color: #2980b9; }
    .method-badge.card { background: #ffeaea; color: #c0392b; }
    .method-badge.other { background: #f5f7fa; color: #7f8c8d; }

    .recipient-info {
      display: flex;
      flex-direction: column;
    }

    .recipient-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .recipient-details {
      font-size: 12px;
      color: #7f8c8d;
    }

    .transaction-id {
      font-family: monospace;
      font-size: 12px;
      color: #7f8c8d;
    }

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.completed { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.failed { background: #ffeaea; color: #c0392b; }
    .status-badge.refunded { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.cancelled { background: #f5f7fa; color: #95a5a6; }

    .status-badge.large {
      padding: 10px 20px;
      font-size: 14px;
    }

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
    .action-btn.receipt { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.download { background: #f4e7ff; color: #8e44ad; }
    .action-btn.refund { background: #fff4e6; color: #e67e22; }

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
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-content.large {
      max-width: 900px;
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

    .payment-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .payment-info h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .payment-info p {
      margin: 4px 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .payment-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f5f7fa;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row .label {
      font-weight: 500;
      color: #7f8c8d;
      font-size: 14px;
    }

    .detail-row .value {
      color: #2c3e50;
      font-size: 14px;
      font-weight: 500;
    }

    .detail-row .value.amount {
      font-weight: 600;
      font-size: 16px;
    }

    .payment-notes {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .payment-notes h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .payment-notes p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      border-color: #9b59b6;
    }

    .payment-method-fields {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .report-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .report-card:hover {
      background: white;
      border-color: #9b59b6;
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .report-card i {
      font-size: 48px;
      color: #9b59b6;
      margin-bottom: 12px;
    }

    .report-card h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .report-card p {
      margin: 0;
      font-size: 13px;
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

    .btn-success {
      background: #2ed573;
      color: white;
    }

    .btn-success:hover {
      background: #1e9e5a;
    }

    .btn-warning {
      background: #f39c12;
      color: white;
    }

    .btn-warning:hover {
      background: #e67e22;
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

      .payments-table-container {
        padding: 0 16px 16px;
        overflow-x: auto;
      }

      .payments-table {
        min-width: 1200px;
      }
    }
  `]
})
export class PaymentTrackingComponent implements OnInit, OnDestroy {
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  selectedPayment: Payment | null = null;
  searchQuery: string = '';
  paymentTypeFilter: string = 'all';
  paymentMethodFilter: string = 'all';
  statusFilter: string = 'all';
  dateRangeFilter: string = 'all';
  showAddPayment: boolean = false;
  showReports: boolean = false;
  recipientType: 'resident' | 'vendor' = 'resident';
  invoiceBillNumber: string = '';
  paymentDate: string = '';
  loadError = '';
  isLoading = false;

  newPayment: Partial<Payment> = {
    paymentType: 'maintenance',
    paymentMethod: 'cash',
    amount: 0,
    status: 'completed',
    receivedBy: '',
    receiptGenerated: false
  };

  summary: PaymentSummary = {
    totalPayments: 0,
    totalAmount: 0,
    onlinePayments: 0,
    offlinePayments: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    refundedPayments: 0,
    todayPayments: 0,
    todayAmount: 0,
    thisMonthPayments: 0,
    thisMonthAmount: 0
  };

  private destroy$ = new Subject<void>();
  private billDownload = inject(BillDocumentDownloadService);
  private paymentService = inject(PaymentService);
  private session = inject(SessionContextService);

  constructor() {
    this.paymentDate = new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadPayments();
    this.calculateSummary();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load payments from API
   */
  loadPayments(): void {
    this.loadError = '';
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.payments = [];
      this.filteredPayments = [];
      this.calculateSummary();
      return;
    }

    this.isLoading = true;
    this.paymentService.getAllPayments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payments) => {
          this.payments = payments;
          this.filterPayments();
          this.calculateSummary();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading payments:', error);
          this.loadError = 'Failed to load payments from the API. Ensure the backend is running.';
          this.payments = [];
          this.filteredPayments = [];
          this.calculateSummary();
          this.isLoading = false;
        }
      });
  }

  /**
   * Calculate summary
   */
  calculateSummary(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    this.summary = {
      totalPayments: this.payments.length,
      totalAmount: this.payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0),
      onlinePayments: this.payments.filter(p => ['online', 'upi', 'card'].includes(p.paymentMethod) && p.status === 'completed').length,
      offlinePayments: this.payments.filter(p => ['cash', 'cheque', 'bank_transfer'].includes(p.paymentMethod) && p.status === 'completed').length,
      pendingPayments: this.payments.filter(p => p.status === 'pending').length,
      completedPayments: this.payments.filter(p => p.status === 'completed').length,
      failedPayments: this.payments.filter(p => p.status === 'failed').length,
      refundedPayments: this.payments.filter(p => p.status === 'refunded').length,
      todayPayments: this.payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= today && p.status === 'completed';
      }).length,
      todayAmount: this.payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= today && p.status === 'completed';
      }).reduce((sum, p) => sum + p.amount, 0),
      thisMonthPayments: this.payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= thisMonth && p.status === 'completed';
      }).length,
      thisMonthAmount: this.payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= thisMonth && p.status === 'completed';
      }).reduce((sum, p) => sum + p.amount, 0)
    };
  }

  /**
   * Filter payments
   */
  filterPayments(): void {
    let filtered = [...this.payments];

    // Apply payment type filter
    if (this.paymentTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentType === this.paymentTypeFilter);
    }

    // Apply payment method filter
    if (this.paymentMethodFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentMethod === this.paymentMethodFilter);
    }

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.statusFilter);
    }

    // Apply date range filter
    if (this.dateRangeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        switch (this.dateRangeFilter) {
          case 'today':
            return paymentDate.toDateString() === now.toDateString();
          case 'this_week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return paymentDate >= weekAgo;
          case 'this_month':
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return paymentDate >= thisMonth;
          case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            return paymentDate >= lastMonth && paymentDate <= lastMonthEnd;
          case 'this_quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
            return paymentDate >= quarterStart;
          case 'this_year':
            return paymentDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.paymentNumber.toLowerCase().includes(query) ||
        (p.residentName && p.residentName.toLowerCase().includes(query)) ||
        (p.vendorName && p.vendorName.toLowerCase().includes(query)) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(query)) ||
        (p.billNumber && p.billNumber.toLowerCase().includes(query)) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(query)) ||
        (p.chequeNumber && p.chequeNumber.toLowerCase().includes(query))
      );
    }

    // Sort by payment date (newest first)
    filtered.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());

    this.filteredPayments = filtered;
  }

  /**
   * View payment details
   */
  viewPayment(payment: Payment): void {
    this.selectedPayment = payment;
  }

  /**
   * Close payment details
   */
  closePaymentDetails(): void {
    this.selectedPayment = null;
  }

  /**
   * Generate receipt via API
   */
  generateReceipt(payment: Payment): void {
    if (payment.status !== 'completed') {
      return;
    }

    this.paymentService.generateReceipt(payment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.updatePaymentInList(updated);
          window.alert('Receipt generated successfully!');
        },
        error: (error) => {
          console.error('Error generating receipt:', error);
          window.alert('Failed to generate receipt. Ensure the backend is running.');
        }
      });
  }

  /**
   * Download receipt
   */
  downloadReceipt(payment: Payment): void {
    this.billDownload.downloadBillPdf({
      documentTitle: 'Payment Receipt',
      documentNumber: payment.receiptNumber || payment.paymentNumber,
      recipientName: payment.residentName || payment.vendorName || 'Customer',
      flatNumber: payment.flatNumber,
      issueDate: payment.paymentDate,
      status: payment.status,
      lineItems: [
        {
          description: `${payment.paymentType} payment`,
          amount: payment.amount
        }
      ],
      summaryRows: [
        { label: 'Payment no.', value: payment.paymentNumber },
        { label: 'Method', value: payment.paymentMethod },
        { label: 'Invoice / bill', value: payment.invoiceNumber || payment.billNumber || '—' },
        { label: 'Transaction ID', value: payment.transactionId || '—' },
        { label: 'Received by', value: payment.receivedBy }
      ],
      totalAmount: payment.amount,
      notes: payment.notes
    });
  }

  /**
   * Refund payment via API
   */
  refundPayment(payment: Payment): void {
    if (payment.status !== 'completed') {
      return;
    }

    if (!window.confirm(`Are you sure you want to refund payment ${payment.paymentNumber}?`)) {
      return;
    }

    this.paymentService.refundPayment(payment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.updatePaymentInList(updated);
          this.calculateSummary();
          window.alert('Payment refunded successfully!');
        },
        error: (error) => {
          console.error('Error refunding payment:', error);
          window.alert('Failed to refund payment. Ensure the backend is running.');
        }
      });
  }

  /** Replace a payment in the local list after API update. */
  private updatePaymentInList(updated: Payment): void {
    const idx = this.payments.findIndex(p => p.id === updated.id);
    if (idx >= 0) {
      this.payments[idx] = updated;
    }
    if (this.selectedPayment?.id === updated.id) {
      this.selectedPayment = updated;
    }
    this.filterPayments();
  }

  /**
   * Add payment via API
   */
  addPayment(): void {
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }
    if (!this.isPaymentValid()) {
      return;
    }

    if (this.invoiceBillNumber) {
      if (this.invoiceBillNumber.startsWith('INV-')) {
        this.newPayment.invoiceNumber = this.invoiceBillNumber;
      } else {
        this.newPayment.billNumber = this.invoiceBillNumber;
      }
    }

    const payload: Partial<Payment> = {
      ...this.newPayment,
      paymentDate: new Date(this.paymentDate),
      receivedBy: this.session.getCurrentUserId() || 'admin',
      receiptGenerated: false
    };

    this.paymentService.createPayment(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetNewPayment();
          this.showAddPayment = false;
          this.loadPayments();
          window.alert('Payment added successfully!');
        },
        error: (error) => {
          console.error('Error adding payment:', error);
          window.alert('Failed to add payment. Ensure the backend is running.');
        }
      });
  }

  /**
   * Reset new payment
   */
  resetNewPayment(): void {
    this.newPayment = {
      paymentType: 'maintenance',
      paymentMethod: 'cash',
      amount: 0,
      status: 'completed',
      receivedBy: '',
      receiptGenerated: false
    };
    this.paymentDate = new Date().toISOString().split('T')[0];
    this.invoiceBillNumber = '';
    this.recipientType = 'resident';
  }

  /**
   * On payment method change
   */
  onPaymentMethodChange(): void {
    // Clear method-specific fields when method changes
    this.newPayment.transactionId = undefined;
    this.newPayment.chequeNumber = undefined;
    this.newPayment.bankName = undefined;
    this.newPayment.accountNumber = undefined;
    this.newPayment.upiId = undefined;
  }

  /**
   * On recipient type change
   */
  onRecipientTypeChange(): void {
    if (this.recipientType === 'resident') {
      this.newPayment.vendorId = undefined;
      this.newPayment.vendorName = undefined;
    } else {
      this.newPayment.residentId = undefined;
      this.newPayment.residentName = undefined;
      this.newPayment.flatNumber = undefined;
    }
  }

  /**
   * Check if payment is valid
   */
  isPaymentValid(): boolean {
    return !!(
      this.newPayment.paymentType &&
      this.newPayment.paymentMethod &&
      this.newPayment.amount &&
      this.newPayment.amount > 0 &&
      this.paymentDate &&
      this.newPayment.receivedBy
    );
  }

  /**
   * Generate report
   */
  generateReport(type: string): void {
    // In real app, generate and download report
    console.log('Generate report:', type);
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} report generation started`);
    this.showReports = false;
  }

  /**
   * Get payment type label
   */
  getPaymentTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      maintenance: 'Maintenance',
      utility: 'Utility',
      service: 'Service',
      penalty: 'Penalty',
      other: 'Other'
    };
    return labels[type] || 'Other';
  }

  /**
   * Get payment method label
   */
  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      online: 'Online',
      cash: 'Cash',
      cheque: 'Cheque',
      bank_transfer: 'Bank Transfer',
      upi: 'UPI',
      card: 'Card',
      other: 'Other'
    };
    return labels[method] || 'Other';
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      completed: 'Completed',
      failed: 'Failed',
      refunded: 'Refunded',
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
   * Format date time
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}


