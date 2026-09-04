import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { VendorPaymentService } from '../../services/vendor-payment.service';
import { Vendor, VendorPayment, VendorPaymentSummary } from '../../models/vendor-payment.model';

/**
 * Vendor Payments Component with TDS Deduction
 * Handles vendor payments with automatic TDS calculation
 */

@Component({
  selector: 'app-vendor-payments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="vendor-payments-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">account_balance</i>
            Vendor Payments with TDS
          </h1>
          <p>Manage vendor payments with automatic TDS deduction</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/vendor-payments</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showTdsReports = true" title="TDS Reports">
            <i class="material-icons">assessment</i>
            TDS Reports
          </button>
          <button class="icon-btn primary" (click)="showCreatePayment = true" title="Create Payment">
            <i class="material-icons">add</i>
            Create Payment
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
        <div class="stat-card gross">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(summary.totalGrossAmount) }}</div>
            <div class="stat-label">Gross Amount</div>
          </div>
        </div>
        <div class="stat-card tds">
          <div class="stat-icon">
            <i class="material-icons">calculate</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(summary.totalTdsAmount) }}</div>
            <div class="stat-label">Total TDS</div>
          </div>
        </div>
        <div class="stat-card net">
          <div class="stat-icon">
            <i class="material-icons">payments</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(summary.totalNetAmount) }}</div>
            <div class="stat-label">Net Amount</div>
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
        <div class="stat-card paid">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.paidPayments }}</div>
            <div class="stat-label">Paid</div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by payment number, vendor, invoice..." 
            [(ngModel)]="searchQuery"
            (input)="filterPayments()"
          />
        </div>
        <select [(ngModel)]="statusFilter" (change)="filterPayments()" class="filter-select">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select [(ngModel)]="dateRangeFilter" (change)="filterPayments()" class="filter-select">
          <option value="all">All Time</option>
          <option value="today">Today</option>
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
              <th>Vendor</th>
              <th>Invoice/Bill</th>
              <th>Date</th>
              <th>Gross Amount</th>
              <th>TDS Rate</th>
              <th>TDS Amount</th>
              <th>Net Amount</th>
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
                <div class="vendor-info">
                  <div class="vendor-name">{{ payment.vendorName }}</div>
                  <div class="vendor-pan" *ngIf="payment.vendorPAN">PAN: {{ payment.vendorPAN }}</div>
                </div>
              </td>
              <td>
                <span *ngIf="payment.invoiceNumber">{{ payment.invoiceNumber }}</span>
                <span *ngIf="payment.billNumber">{{ payment.billNumber }}</span>
                <span *ngIf="!payment.invoiceNumber && !payment.billNumber">-</span>
              </td>
              <td>{{ formatDate(payment.paymentDate) }}</td>
              <td class="amount">{{ formatCurrency(payment.grossAmount) }}</td>
              <td>{{ payment.tdsRate }}%</td>
              <td class="tds-amount">{{ formatCurrency(payment.tdsAmount) }}</td>
              <td class="amount net">{{ formatCurrency(payment.netAmount) }}</td>
              <td>
                <span class="status-badge" [ngClass]="payment.paymentStatus">
                  {{ getStatusLabel(payment.paymentStatus) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewPayment(payment)" title="View Details">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn approve" (click)="approvePayment(payment)" title="Approve" *ngIf="payment.paymentStatus === 'pending'">
                    <i class="material-icons">check</i>
                  </button>
                  <button class="action-btn pay" (click)="processPayment(payment)" title="Process Payment" *ngIf="payment.paymentStatus === 'approved'">
                    <i class="material-icons">payment</i>
                  </button>
                  <button class="action-btn certificate" (click)="generateTdsCertificate(payment)" title="TDS Certificate" *ngIf="payment.paymentStatus === 'paid'">
                    <i class="material-icons">description</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredPayments.length === 0">
          <i class="material-icons">account_balance</i>
          <p>No vendor payments found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showCreatePayment = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Create First Payment
          </button>
        </div>
      </div>

      <!-- Payment Details Modal -->
      <div class="modal-overlay" *ngIf="selectedPayment" (click)="closePaymentDetails()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Payment Details - {{ selectedPayment.paymentNumber }}</h2>
            <button class="close-btn" (click)="closePaymentDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedPayment">
            <div class="payment-header">
              <div class="payment-info">
                <h3>{{ selectedPayment.vendorName }}</h3>
                <p *ngIf="selectedPayment.vendorPAN">PAN: {{ selectedPayment.vendorPAN }}</p>
                <p *ngIf="selectedPayment.vendorGSTIN">GSTIN: {{ selectedPayment.vendorGSTIN }}</p>
              </div>
              <div class="payment-status">
                <span class="status-badge large" [ngClass]="selectedPayment.paymentStatus">
                  {{ getStatusLabel(selectedPayment.paymentStatus) }}
                </span>
              </div>
            </div>

            <div class="payment-summary">
              <div class="summary-row">
                <span>Gross Amount:</span>
                <span class="amount">{{ formatCurrency(selectedPayment.grossAmount) }}</span>
              </div>
              <div class="summary-row">
                <span>TDS Rate:</span>
                <span>{{ selectedPayment.tdsRate }}%</span>
              </div>
              <div class="summary-row" *ngIf="selectedPayment.tdsSection">
                <span>TDS Section:</span>
                <span>{{ selectedPayment.tdsSection }}</span>
              </div>
              <div class="summary-row tds-row">
                <span>TDS Amount:</span>
                <span class="tds-amount">{{ formatCurrency(selectedPayment.tdsAmount) }}</span>
              </div>
              <div class="summary-row total">
                <span>Net Amount (Payable):</span>
                <span class="amount net">{{ formatCurrency(selectedPayment.netAmount) }}</span>
              </div>
            </div>

            <div class="payment-details">
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
              <div class="detail-row">
                <span class="label">Payment Method:</span>
                <span class="value">{{ getPaymentMethodLabel(selectedPayment.paymentMethod) }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.transactionId">
                <span class="label">Transaction ID:</span>
                <span class="value">{{ selectedPayment.transactionId }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.chequeNumber">
                <span class="label">Cheque Number:</span>
                <span class="value">{{ selectedPayment.chequeNumber }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.bankName">
                <span class="label">Bank Name:</span>
                <span class="value">{{ selectedPayment.bankName }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.approvedBy">
                <span class="label">Approved By:</span>
                <span class="value">{{ selectedPayment.approvedBy }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.approvedAt">
                <span class="label">Approved At:</span>
                <span class="value">{{ formatDateTime(selectedPayment.approvedAt) }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.paidAt">
                <span class="label">Paid At:</span>
                <span class="value">{{ formatDateTime(selectedPayment.paidAt) }}</span>
              </div>
              <div class="detail-row" *ngIf="selectedPayment.tdsCertificateNumber">
                <span class="label">TDS Certificate:</span>
                <span class="value">{{ selectedPayment.tdsCertificateNumber }}</span>
              </div>
            </div>

            <div class="payment-notes" *ngIf="selectedPayment.notes">
              <h4>Notes</h4>
              <p>{{ selectedPayment.notes }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closePaymentDetails()">Close</button>
            <button class="btn btn-success" (click)="approvePayment(selectedPayment!)" *ngIf="selectedPayment?.paymentStatus === 'pending'">
              <i class="material-icons">check</i>
              Approve Payment
            </button>
            <button class="btn btn-primary" (click)="processPayment(selectedPayment!)" *ngIf="selectedPayment?.paymentStatus === 'approved'">
              <i class="material-icons">payment</i>
              Process Payment
            </button>
            <button class="btn btn-info" (click)="generateTdsCertificate(selectedPayment!)" *ngIf="selectedPayment?.paymentStatus === 'paid' && !selectedPayment?.tdsCertificateGenerated">
              <i class="material-icons">description</i>
              Generate TDS Certificate
            </button>
            <button class="btn btn-info" (click)="downloadTdsCertificate(selectedPayment!)" *ngIf="selectedPayment?.tdsCertificateGenerated">
              <i class="material-icons">download</i>
              Download TDS Certificate
            </button>
          </div>
        </div>
      </div>

      <!-- Create Payment Modal -->
      <div class="modal-overlay" *ngIf="showCreatePayment" (click)="showCreatePayment = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Create Vendor Payment</h2>
            <button class="close-btn" (click)="showCreatePayment = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Vendor <span class="required">*</span></label>
                <select [(ngModel)]="selectedVendorId" (change)="onVendorChange()" required>
                  <option value="">Select Vendor</option>
                  <option *ngFor="let vendor of vendors" [value]="vendor.id">
                    {{ vendor.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Payment Date <span class="required">*</span></label>
                <input type="date" [(ngModel)]="paymentDate" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Invoice/Bill Number</label>
                <input type="text" [(ngModel)]="newPayment.invoiceNumber" placeholder="Invoice or Bill number" />
              </div>
              <div class="form-group">
                <label>Gross Amount <span class="required">*</span></label>
                <input type="number" [(ngModel)]="newPayment.grossAmount" min="0" step="0.01" placeholder="0.00" (input)="calculateTds()" required />
              </div>
            </div>

            <!-- TDS Configuration -->
            <div class="form-section-title">TDS Configuration</div>
            <div class="form-row">
              <div class="form-group">
                <label>TDS Rate (%) <span class="required">*</span></label>
                <input type="number" [(ngModel)]="newPayment.tdsRate" min="0" max="100" step="0.01" placeholder="e.g., 10" (input)="calculateTds()" required />
                <small class="form-hint">Common rates: 10% (194C), 2% (194A), etc.</small>
              </div>
              <div class="form-group">
                <label>TDS Section</label>
                <select [(ngModel)]="newPayment.tdsSection" (change)="onTdsSectionChange()">
                  <option value="">Select Section</option>
                  <option value="194A">194A - Interest (Other than Interest on Securities)</option>
                  <option value="194C">194C - Payment to Contractors</option>
                  <option value="194H">194H - Commission or Brokerage</option>
                  <option value="194I">194I - Rent</option>
                  <option value="194J">194J - Professional/Technical Services</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Payment Method <span class="required">*</span></label>
                <select [(ngModel)]="newPayment.paymentMethod" (change)="onPaymentMethodChange()" required>
                  <option value="">Select Method</option>
                  <option value="online">Online</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group" *ngIf="newPayment.paymentMethod === 'cheque'">
                <label>Cheque Number <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newPayment.chequeNumber" placeholder="Cheque number" />
              </div>
              <div class="form-group" *ngIf="newPayment.paymentMethod === 'bank_transfer' || newPayment.paymentMethod === 'neft' || newPayment.paymentMethod === 'rtgs'">
                <label>Transaction ID <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newPayment.transactionId" placeholder="Transaction ID" />
              </div>
            </div>

            <div class="form-row" *ngIf="newPayment.paymentMethod === 'cheque' || newPayment.paymentMethod === 'bank_transfer' || newPayment.paymentMethod === 'neft' || newPayment.paymentMethod === 'rtgs'">
              <div class="form-group">
                <label>Bank Name</label>
                <input type="text" [(ngModel)]="newPayment.bankName" placeholder="Bank name" />
              </div>
              <div class="form-group">
                <label>Account Number</label>
                <input type="text" [(ngModel)]="newPayment.accountNumber" placeholder="Account number" />
              </div>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="newPayment.notes" placeholder="Additional notes" rows="3"></textarea>
            </div>

            <!-- Payment Summary -->
            <div class="payment-preview">
              <h4>Payment Summary</h4>
              <div class="preview-summary">
                <div class="summary-row">
                  <span>Gross Amount:</span>
                  <span>{{ formatCurrency(newPayment.grossAmount || 0) }}</span>
                </div>
                <div class="summary-row" *ngIf="(newPayment.tdsRate || 0) > 0">
                  <span>TDS Rate:</span>
                  <span>{{ newPayment.tdsRate }}%</span>
                </div>
                <div class="summary-row tds-row" *ngIf="(newPayment.tdsAmount || 0) > 0">
                  <span>TDS Amount:</span>
                  <span class="tds-amount">{{ formatCurrency(newPayment.tdsAmount || 0) }}</span>
                </div>
                <div class="summary-row total">
                  <span>Net Amount (Payable):</span>
                  <span class="amount net">{{ formatCurrency(newPayment.netAmount || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showCreatePayment = false">Cancel</button>
            <button class="btn btn-primary" (click)="createPayment()" [disabled]="!isPaymentValid()">
              <i class="material-icons">check</i>
              Create Payment
            </button>
          </div>
        </div>
      </div>

      <!-- TDS Reports Modal -->
      <div class="modal-overlay" *ngIf="showTdsReports" (click)="showTdsReports = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>TDS Reports</h2>
            <button class="close-btn" (click)="showTdsReports = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="reports-grid">
              <div class="report-card" (click)="generateTdsReport('quarterly')">
                <i class="material-icons">calendar_today</i>
                <h3>Quarterly TDS Report</h3>
                <p>Q1, Q2, Q3, Q4 TDS summary</p>
              </div>
              <div class="report-card" (click)="generateTdsReport('annual')">
                <i class="material-icons">assessment</i>
                <h3>Annual TDS Report</h3>
                <p>Yearly TDS summary and certificates</p>
              </div>
              <div class="report-card" (click)="generateTdsReport('section')">
                <i class="material-icons">category</i>
                <h3>TDS by Section</h3>
                <p>Breakdown by TDS sections</p>
              </div>
              <div class="report-card" (click)="generateTdsReport('vendor')">
                <i class="material-icons">business</i>
                <h3>TDS by Vendor</h3>
                <p>Vendor-wise TDS summary</p>
              </div>
              <div class="report-card" (click)="generateTdsReport('form26as')">
                <i class="material-icons">description</i>
                <h3>Form 26AS</h3>
                <p>Form 26AS reconciliation</p>
              </div>
              <div class="report-card" (click)="generateTdsReport('certificates')">
                <i class="material-icons">receipt_long</i>
                <h3>TDS Certificates</h3>
                <p>Generate TDS certificates</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showTdsReports = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vendor-payments-container {
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
      gap: 6px;
      margin-top: 8px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      font-size: 12px;
    }

    .api-banner i {
      font-size: 16px;
    }

    .load-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 24px 0;
      padding: 12px 16px;
      border-radius: 8px;
      background: #fdecea;
      color: #c0392b;
      font-size: 14px;
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
    .stat-card.gross .stat-icon { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .stat-card.tds .stat-icon { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .stat-card.net .stat-icon { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }
    .stat-card.pending .stat-icon { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .stat-card.paid .stat-icon { background: linear-gradient(135deg, #16a085 0%, #138d75 100%); }

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

    .payments-table tr:hover {
      background: #f8f9fa;
    }

    .vendor-info {
      display: flex;
      flex-direction: column;
    }

    .vendor-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .vendor-pan {
      font-size: 12px;
      color: #7f8c8d;
    }

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .amount.net {
      color: #2ed573;
      font-size: 16px;
    }

    .tds-amount {
      font-weight: 600;
      color: #e74c3c;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.approved { background: #e7f3ff; color: #2980b9; }
    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
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
    .action-btn.approve { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.pay { background: #2ed573; color: white; }
    .action-btn.certificate { background: #f4e7ff; color: #8e44ad; }

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

    .payment-summary {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .summary-row.tds-row {
      border-top: 1px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 12px;
      font-weight: 600;
    }

    .summary-row.total {
      border-top: 2px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 12px;
      font-weight: 600;
      font-size: 16px;
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

    .form-hint {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #7f8c8d;
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
      border-color: #3498db;
    }

    .form-section-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      margin: 24px 0 16px 0;
      padding-top: 16px;
      border-top: 2px solid #e9ecef;
    }

    .payment-preview {
      margin-top: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .payment-preview h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .preview-summary {
      display: flex;
      flex-direction: column;
      gap: 8px;
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

    .btn-primary:hover:not(:disabled) {
      background: #2980b9;
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

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-info:hover {
      background: #138496;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      border-color: #3498db;
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .report-card i {
      font-size: 48px;
      color: #3498db;
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
export class VendorPaymentsComponent implements OnInit, OnDestroy {
  payments: VendorPayment[] = [];
  filteredPayments: VendorPayment[] = [];
  vendors: Vendor[] = [];
  selectedPayment: VendorPayment | null = null;
  searchQuery: string = '';
  statusFilter: string = 'all';
  dateRangeFilter: string = 'all';
  showCreatePayment: boolean = false;
  showTdsReports: boolean = false;
  selectedVendorId: string = '';
  paymentDate: string = '';
  loadError = '';

  newPayment: Partial<VendorPayment> = {
    grossAmount: 0,
    tdsRate: 10,
    tdsAmount: 0,
    netAmount: 0,
    paymentStatus: 'pending',
    paymentMethod: 'cheque',
    tdsCertificateGenerated: false
  };

  summary: VendorPaymentSummary = {
    totalPayments: 0,
    totalGrossAmount: 0,
    totalTdsAmount: 0,
    totalNetAmount: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    paidPayments: 0
  };

  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private vendorPaymentService = inject(VendorPaymentService);

  constructor() {
    this.paymentDate = new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load vendors, payments, and summary from API. */
  loadAll(): void {
    this.loadError = '';
    forkJoin({
      vendors: this.vendorPaymentService.getVendors(),
      payments: this.vendorPaymentService.getPayments(),
      summary: this.vendorPaymentService.getSummary()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ vendors, payments, summary }) => {
          this.vendors = vendors;
          this.payments = payments;
          this.summary = summary;
          this.filterPayments();
        },
        error: () => {
          this.loadError = 'Failed to load vendor payment data from the API. Ensure the backend is running.';
        }
      });
  }

  filterPayments(): void {
    let filtered = [...this.payments];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentStatus === this.statusFilter);
    }

    if (this.dateRangeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        switch (this.dateRangeFilter) {
          case 'today':
            return paymentDate.toDateString() === now.toDateString();
          case 'this_month':
            return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
          case 'last_month': {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return paymentDate.getMonth() === lastMonth.getMonth() && paymentDate.getFullYear() === lastMonth.getFullYear();
          }
          case 'this_quarter': {
            const quarter = Math.floor(now.getMonth() / 3);
            return Math.floor(paymentDate.getMonth() / 3) === quarter && paymentDate.getFullYear() === now.getFullYear();
          }
          case 'this_year':
            return paymentDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.paymentNumber.toLowerCase().includes(query) ||
        p.vendorName.toLowerCase().includes(query) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(query)) ||
        (p.billNumber && p.billNumber.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    this.filteredPayments = filtered;
  }

  /** Client-side TDS preview while creating a payment. */
  calculateTds(): void {
    const grossAmount = this.newPayment.grossAmount || 0;
    const tdsRate = this.newPayment.tdsRate || 0;
    this.newPayment.tdsAmount = Math.round(grossAmount * (tdsRate / 100) * 100) / 100;
    this.newPayment.netAmount = Math.round((grossAmount - this.newPayment.tdsAmount) * 100) / 100;
  }

  onVendorChange(): void {
    const vendor = this.vendors.find(v => v.id === this.selectedVendorId);
    if (vendor) {
      this.newPayment.vendorId = vendor.id;
      this.newPayment.vendorName = vendor.name;
      this.newPayment.vendorPAN = vendor.pan;
      this.newPayment.vendorGSTIN = vendor.gstin;
      if (vendor.defaultTdsRate) {
        this.newPayment.tdsRate = vendor.defaultTdsRate;
      }
      if (vendor.tdsSection) {
        this.newPayment.tdsSection = vendor.tdsSection;
      }
      this.calculateTds();
    }
  }

  onTdsSectionChange(): void {
    const sectionRates: { [key: string]: number } = {
      '194A': 2,
      '194C': 10,
      '194H': 5,
      '194I': 10,
      '194J': 10
    };

    if (this.newPayment.tdsSection && sectionRates[this.newPayment.tdsSection]) {
      this.newPayment.tdsRate = sectionRates[this.newPayment.tdsSection];
      this.calculateTds();
    }
  }

  onPaymentMethodChange(): void {
    this.newPayment.transactionId = undefined;
    this.newPayment.chequeNumber = undefined;
    this.newPayment.bankName = undefined;
    this.newPayment.accountNumber = undefined;
  }

  viewPayment(payment: VendorPayment): void {
    this.selectedPayment = payment;
  }

  closePaymentDetails(): void {
    this.selectedPayment = null;
  }

  approvePayment(payment: VendorPayment): void {
    if (!confirm(`Approve payment ${payment.paymentNumber}?`)) {
      return;
    }
    this.vendorPaymentService
      .approvePayment(payment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.updateLocalPayment(updated);
          alert('Payment approved successfully!');
        },
        error: () => alert('Failed to approve payment.')
      });
  }

  processPayment(payment: VendorPayment): void {
    if (!confirm(`Process payment ${payment.paymentNumber}? Net amount: ${this.formatCurrency(payment.netAmount)}`)) {
      return;
    }
    this.vendorPaymentService
      .processPayment(payment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.updateLocalPayment(updated);
          alert('Payment processed successfully!');
        },
        error: () => alert('Failed to process payment.')
      });
  }

  generateTdsCertificate(payment: VendorPayment): void {
    this.vendorPaymentService
      .generateTdsCertificate(payment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          this.updateLocalPayment(updated);
          alert(`TDS Certificate ${updated.tdsCertificateNumber} generated successfully!`);
        },
        error: () => alert('Failed to generate TDS certificate.')
      });
  }

  downloadTdsCertificate(payment: VendorPayment): void {
    const data = {
      certificateNumber: payment.tdsCertificateNumber,
      vendorName: payment.vendorName,
      vendorPAN: payment.vendorPAN,
      paymentNumber: payment.paymentNumber,
      tdsSection: payment.tdsSection,
      tdsRate: payment.tdsRate,
      tdsAmount: payment.tdsAmount,
      paymentDate: payment.paymentDate
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payment.tdsCertificateNumber || 'tds-certificate'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  createPayment(): void {
    if (!this.isPaymentValid()) {
      return;
    }

    const payload: Partial<VendorPayment> = {
      vendorId: this.newPayment.vendorId!,
      vendorName: this.newPayment.vendorName!,
      vendorPAN: this.newPayment.vendorPAN,
      vendorGSTIN: this.newPayment.vendorGSTIN,
      invoiceId: this.newPayment.invoiceId,
      invoiceNumber: this.newPayment.invoiceNumber,
      billId: this.newPayment.billId,
      billNumber: this.newPayment.billNumber,
      paymentDate: new Date(this.paymentDate),
      grossAmount: this.newPayment.grossAmount || 0,
      tdsRate: this.newPayment.tdsRate || 0,
      tdsAmount: this.newPayment.tdsAmount || 0,
      netAmount: this.newPayment.netAmount || 0,
      tdsSection: this.newPayment.tdsSection,
      paymentMethod: this.newPayment.paymentMethod!,
      paymentStatus: 'pending',
      transactionId: this.newPayment.transactionId,
      chequeNumber: this.newPayment.chequeNumber,
      bankName: this.newPayment.bankName,
      accountNumber: this.newPayment.accountNumber,
      notes: this.newPayment.notes,
      tdsCertificateGenerated: false
    };

    this.vendorPaymentService
      .createPayment(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: created => {
          this.payments.unshift(created);
          this.vendorPaymentService.getSummary().pipe(takeUntil(this.destroy$)).subscribe(s => (this.summary = s));
          this.filterPayments();
          this.resetNewPayment();
          this.showCreatePayment = false;
          alert('Vendor payment created successfully!');
        },
        error: () => alert('Failed to create vendor payment.')
      });
  }

  resetNewPayment(): void {
    this.newPayment = {
      grossAmount: 0,
      tdsRate: 10,
      tdsAmount: 0,
      netAmount: 0,
      paymentStatus: 'pending',
      paymentMethod: 'cheque',
      tdsCertificateGenerated: false
    };
    this.selectedVendorId = '';
    this.paymentDate = new Date().toISOString().split('T')[0];
  }

  isPaymentValid(): boolean {
    return !!(
      this.selectedVendorId &&
      this.paymentDate &&
      this.newPayment.grossAmount &&
      this.newPayment.grossAmount > 0 &&
      this.newPayment.tdsRate !== undefined &&
      this.newPayment.paymentMethod
    );
  }

  generateTdsReport(type: string): void {
    const blob = new Blob(
      [JSON.stringify({ type, summary: this.summary, payments: this.payments }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tds-report-${type}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showTdsReports = false;
  }

  /** Sync a single payment in local state after API action. */
  private updateLocalPayment(updated: VendorPayment): void {
    const idx = this.payments.findIndex(p => p.id === updated.id);
    if (idx >= 0) {
      this.payments[idx] = updated;
    }
    if (this.selectedPayment?.id === updated.id) {
      this.selectedPayment = updated;
    }
    this.vendorPaymentService.getSummary().pipe(takeUntil(this.destroy$)).subscribe(s => (this.summary = s));
    this.filterPayments();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      approved: 'Approved',
      paid: 'Paid',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      online: 'Online',
      cash: 'Cash',
      cheque: 'Cheque',
      bank_transfer: 'Bank Transfer',
      neft: 'NEFT',
      rtgs: 'RTGS',
      other: 'Other'
    };
    return labels[method] || method;
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

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  goBack(): void {
    window.history.back();
  }
}

