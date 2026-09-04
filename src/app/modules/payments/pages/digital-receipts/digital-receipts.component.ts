import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Digital Receipts Component
 * Handles digital receipts with PDF download functionality
 */
interface DigitalReceipt {
  id: string;
  receiptNumber: string;
  transactionId: string;
  transactionNumber: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billId?: string;
  billNumber?: string;
  paymentMethod: string;
  paymentMethodType: 'card' | 'upi' | 'net_banking' | 'neft' | 'cash' | 'cheque' | 'wallet';
  amount: number;
  tax?: number;
  discount?: number;
  totalAmount: number;
  paymentDate: Date;
  status: 'paid' | 'refunded' | 'partial';
  items: ReceiptItem[];
  notes?: string;
  pdfGenerated: boolean;
  pdfGeneratedAt?: Date;
  emailed: boolean;
  emailedAt?: Date;
  emailRecipient?: string;
  createdAt: Date;
}

interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  tax?: number;
}

@Component({
  selector: 'app-digital-receipts',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="digital-receipts-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">receipt</i>
            Digital Receipts
          </h1>
          <p>View, download, and manage digital payment receipts</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showBulkActions = !showBulkActions" title="Bulk Actions">
            <i class="material-icons">more_vert</i>
            Bulk Actions
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalReceiptsCount }}</div>
            <div class="stat-label">Total Receipts</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">download</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pdfGeneratedCount }}</div>
            <div class="stat-label">PDF Generated</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">email</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ emailedCount }}</div>
            <div class="stat-label">Emailed</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
            <div class="stat-label">Total Amount</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input type="text" placeholder="Search by receipt number, resident, transaction..." [(ngModel)]="searchQuery" (input)="filterReceipts()" />
        </div>
        <select [(ngModel)]="statusFilter" (change)="filterReceipts()" class="filter-select">
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
          <option value="partial">Partial</option>
        </select>
        <select [(ngModel)]="paymentMethodFilter" (change)="filterReceipts()" class="filter-select">
          <option value="all">All Payment Methods</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="net_banking">Net Banking</option>
          <option value="neft">NEFT</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="wallet">Wallet</option>
        </select>
        <input type="date" [(ngModel)]="dateFrom" (change)="filterReceipts()" class="filter-date" placeholder="From Date" />
        <input type="date" [(ngModel)]="dateTo" (change)="filterReceipts()" class="filter-date" placeholder="To Date" />
      </div>

      <!-- Bulk Actions -->
      <div class="bulk-actions" *ngIf="showBulkActions">
        <div class="bulk-actions-content">
          <span class="selected-count">{{ selectedReceipts.length }} selected</span>
          <div class="bulk-buttons">
            <button class="btn btn-secondary" (click)="selectAll()">Select All</button>
            <button class="btn btn-secondary" (click)="deselectAll()">Deselect All</button>
            <button class="btn btn-primary" (click)="downloadSelectedPDFs()" [disabled]="selectedReceipts.length === 0">
              <i class="material-icons">download</i>
              Download PDFs
            </button>
            <button class="btn btn-primary" (click)="emailSelectedReceipts()" [disabled]="selectedReceipts.length === 0">
              <i class="material-icons">email</i>
              Email Receipts
            </button>
          </div>
        </div>
      </div>

      <!-- Receipts Table -->
      <div class="receipts-table-container">
        <table class="receipts-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" [(ngModel)]="selectAllChecked" (change)="toggleSelectAll()" />
              </th>
              <th>Receipt #</th>
              <th>Transaction #</th>
              <th>Resident</th>
              <th>Invoice/Bill</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Payment Date</th>
              <th>Status</th>
              <th>PDF</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let receipt of filteredReceipts" [class.selected]="isSelected(receipt.id)">
              <td>
                <input type="checkbox" [checked]="isSelected(receipt.id)" (change)="toggleSelection(receipt.id)" />
              </td>
              <td><strong>{{ receipt.receiptNumber }}</strong></td>
              <td>{{ receipt.transactionNumber }}</td>
              <td>
                <div class="resident-info">
                  <div class="resident-name">{{ receipt.residentName }}</div>
                  <div class="resident-flat">{{ receipt.flatNumber }}</div>
                </div>
              </td>
              <td>
                <span *ngIf="receipt.invoiceNumber">{{ receipt.invoiceNumber }}</span>
                <span *ngIf="receipt.billNumber">{{ receipt.billNumber }}</span>
                <span *ngIf="!receipt.invoiceNumber && !receipt.billNumber">-</span>
              </td>
              <td class="amount">{{ formatCurrency(receipt.totalAmount) }}</td>
              <td>
                <span class="payment-method-badge" [ngClass]="receipt.paymentMethodType">
                  {{ getPaymentMethodLabel(receipt.paymentMethodType) }}
                </span>
              </td>
              <td>{{ formatDate(receipt.paymentDate) }}</td>
              <td>
                <span class="status-badge" [ngClass]="receipt.status">
                  {{ getStatusLabel(receipt.status) }}
                </span>
              </td>
              <td>
                <span class="pdf-status" [ngClass]="receipt.pdfGenerated ? 'generated' : 'not-generated'">
                  <i class="material-icons">{{ receipt.pdfGenerated ? 'check_circle' : 'cancel' }}</i>
                </span>
              </td>
              <td>
                <span class="email-status" [ngClass]="receipt.emailed ? 'sent' : 'not-sent'">
                  <i class="material-icons">{{ receipt.emailed ? 'email' : 'email_outline' }}</i>
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewReceipt(receipt)" title="View">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn download" (click)="downloadPDF(receipt)" title="Download PDF">
                    <i class="material-icons">download</i>
                  </button>
                  <button class="action-btn email" (click)="emailReceipt(receipt)" title="Email Receipt">
                    <i class="material-icons">email</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredReceipts.length === 0">
          <i class="material-icons">receipt</i>
          <p>No receipts found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
        </div>
      </div>

      <!-- Receipt Preview Modal -->
      <div class="modal-overlay" *ngIf="selectedReceipt && showReceiptPreview" (click)="closeReceiptPreview()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Receipt - {{ selectedReceipt!.receiptNumber }}</h2>
            <div class="header-actions">
              <button class="icon-btn" (click)="downloadPDF(selectedReceipt!)" title="Download PDF">
                <i class="material-icons">download</i>
              </button>
              <button class="icon-btn" (click)="emailReceipt(selectedReceipt!)" title="Email Receipt">
                <i class="material-icons">email</i>
              </button>
              <button class="close-btn" (click)="closeReceiptPreview()">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
          <div class="modal-body" *ngIf="selectedReceipt">
            <div class="receipt-preview" id="receipt-preview">
              <!-- Receipt Header -->
              <div class="receipt-header">
                <div class="receipt-logo">
                  <h1>Society Management</h1>
                  <p>Digital Receipt</p>
                </div>
                <div class="receipt-info">
                  <div class="receipt-number">
                    <strong>Receipt #:</strong> {{ selectedReceipt.receiptNumber }}
                  </div>
                  <div class="receipt-date">
                    <strong>Date:</strong> {{ formatDateTime(selectedReceipt.paymentDate) }}
                  </div>
                </div>
              </div>

              <!-- Receipt Details -->
              <div class="receipt-details">
                <div class="detail-section">
                  <h3>Payment Information</h3>
                  <div class="detail-grid">
                    <div class="detail-item">
                      <span class="label">Transaction #:</span>
                      <span class="value">{{ selectedReceipt.transactionNumber }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Payment Method:</span>
                      <span class="value">{{ selectedReceipt.paymentMethod }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Payment Date:</span>
                      <span class="value">{{ formatDateTime(selectedReceipt.paymentDate) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Status:</span>
                      <span class="value status-badge" [ngClass]="selectedReceipt.status">
                        {{ getStatusLabel(selectedReceipt.status) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="detail-section">
                  <h3>Resident Information</h3>
                  <div class="detail-grid">
                    <div class="detail-item">
                      <span class="label">Name:</span>
                      <span class="value">{{ selectedReceipt.residentName }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Flat Number:</span>
                      <span class="value">{{ selectedReceipt.flatNumber }}</span>
                    </div>
                    <div class="detail-item" *ngIf="selectedReceipt.invoiceNumber">
                      <span class="label">Invoice #:</span>
                      <span class="value">{{ selectedReceipt.invoiceNumber }}</span>
                    </div>
                    <div class="detail-item" *ngIf="selectedReceipt.billNumber">
                      <span class="label">Bill #:</span>
                      <span class="value">{{ selectedReceipt.billNumber }}</span>
                    </div>
                  </div>
                </div>

                <div class="detail-section" *ngIf="selectedReceipt.items && selectedReceipt.items.length > 0">
                  <h3>Payment Items</h3>
                  <table class="receipt-items-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Tax</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of selectedReceipt.items">
                        <td>{{ item.description }}</td>
                        <td>{{ item.quantity }}</td>
                        <td>{{ formatCurrency(item.unitPrice) }}</td>
                        <td>{{ item.tax ? formatCurrency(item.tax) : '-' }}</td>
                        <td><strong>{{ formatCurrency(item.amount) }}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="receipt-summary">
                  <div class="summary-row" *ngIf="selectedReceipt.discount">
                    <span class="label">Subtotal:</span>
                    <span class="value">{{ formatCurrency(selectedReceipt.amount) }}</span>
                  </div>
                  <div class="summary-row" *ngIf="selectedReceipt.discount">
                    <span class="label">Discount:</span>
                    <span class="value discount">-{{ formatCurrency(selectedReceipt.discount) }}</span>
                  </div>
                  <div class="summary-row" *ngIf="selectedReceipt.tax">
                    <span class="label">Tax:</span>
                    <span class="value">{{ formatCurrency(selectedReceipt.tax) }}</span>
                  </div>
                  <div class="summary-row total">
                    <span class="label">Total Amount:</span>
                    <span class="value">{{ formatCurrency(selectedReceipt.totalAmount) }}</span>
                  </div>
                </div>

                <div class="receipt-notes" *ngIf="selectedReceipt.notes">
                  <h4>Notes:</h4>
                  <p>{{ selectedReceipt.notes }}</p>
                </div>

                <div class="receipt-footer">
                  <p>This is a computer-generated receipt. No signature required.</p>
                  <p>Generated on: {{ getCurrentDateTime() }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeReceiptPreview()">Close</button>
            <button class="btn btn-primary" (click)="downloadPDF(selectedReceipt!)">
              <i class="material-icons">download</i>
              Download PDF
            </button>
            <button class="btn btn-primary" (click)="emailReceipt(selectedReceipt!)">
              <i class="material-icons">email</i>
              Email Receipt
            </button>
          </div>
        </div>
      </div>

      <!-- Email Receipt Modal -->
      <div class="modal-overlay" *ngIf="showEmailModal" (click)="showEmailModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Email Receipt</h2>
            <button class="close-btn" (click)="showEmailModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-group">
                <label>Recipient Email <span class="required">*</span></label>
                <input type="email" [(ngModel)]="emailRecipient" placeholder="email@example.com" required />
              </div>
              <div class="form-group">
                <label>Subject</label>
                <input type="text" [(ngModel)]="emailSubject" placeholder="Payment Receipt - {{ receiptToEmail?.receiptNumber }}" />
              </div>
              <div class="form-group">
                <label>Message</label>
                <textarea [(ngModel)]="emailMessage" rows="4" placeholder="Please find attached the payment receipt."></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showEmailModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="sendEmail()" [disabled]="!emailRecipient">
              <i class="material-icons">send</i>
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .digital-receipts-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .page-header {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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

    .filters-section {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      padding: 0 24px 24px 24px;
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

    .filter-select, .filter-date {
      padding: 8px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      outline: none;
      min-width: 150px;
    }

    .bulk-actions {
      background: white;
      padding: 16px 24px;
      margin: 0 24px 24px 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .bulk-actions-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .selected-count {
      font-weight: 600;
      color: #2c3e50;
    }

    .bulk-buttons {
      display: flex;
      gap: 8px;
    }

    .receipts-table-container {
      background: white;
      border-radius: 12px;
      margin: 0 24px 24px 24px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .receipts-table {
      width: 100%;
    }

    .receipts-table thead {
      background: #f8f9fa;
    }

    .receipts-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .receipts-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .receipts-table tr.selected {
      background: #e8f4f8;
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

    .payment-method-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .payment-method-badge.card { background: #e7f3ff; color: #2980b9; }
    .payment-method-badge.upi { background: #e8f8f0; color: #1e9e5a; }
    .payment-method-badge.net_banking { background: #fff4e6; color: #e67e22; }
    .payment-method-badge.neft { background: #f4e7ff; color: #8e44ad; }
    .payment-method-badge.cash { background: #e8f8f0; color: #1e9e5a; }
    .payment-method-badge.cheque { background: #ffeaea; color: #c0392b; }
    .payment-method-badge.wallet { background: #fff4e6; color: #e67e22; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.refunded { background: #ffeaea; color: #c0392b; }
    .status-badge.partial { background: #fff4e6; color: #e67e22; }

    .pdf-status, .email-status {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pdf-status.generated, .email-status.sent {
      color: #1e9e5a;
    }

    .pdf-status.not-generated, .email-status.not-sent {
      color: #95a5a6;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .action-btn.view { background: #e7f3ff; color: #2980b9; }
    .action-btn.download { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.email { background: #fff4e6; color: #e67e22; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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

    .receipt-preview {
      background: white;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e9ecef;
    }

    .receipt-logo h1 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    .receipt-logo p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .receipt-info {
      text-align: right;
    }

    .receipt-number, .receipt-date {
      margin-bottom: 8px;
      font-size: 14px;
      color: #2c3e50;
    }

    .receipt-details {
      margin-bottom: 32px;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      padding-bottom: 8px;
      border-bottom: 1px solid #e9ecef;
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

    .receipt-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .receipt-items-table th,
    .receipt-items-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }

    .receipt-items-table th {
      background: #f8f9fa;
      font-weight: 600;
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .receipt-summary {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #e9ecef;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .summary-row .label {
      color: #7f8c8d;
    }

    .summary-row .value {
      color: #2c3e50;
      font-weight: 500;
    }

    .summary-row .value.discount {
      color: #1e9e5a;
    }

    .summary-row.total {
      font-size: 18px;
      font-weight: 700;
      padding-top: 12px;
      border-top: 1px solid #e9ecef;
      margin-top: 8px;
    }

    .summary-row.total .value {
      color: #e74c3c;
    }

    .receipt-notes {
      margin-top: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .receipt-notes h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .receipt-notes p {
      margin: 0;
      font-size: 13px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .receipt-footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e9ecef;
      text-align: center;
    }

    .receipt-footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #95a5a6;
    }

    .form-section {
      display: flex;
      flex-direction: column;
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
    .form-group textarea:focus {
      border-color: #e74c3c;
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
      background: #e74c3c;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #c0392b;
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

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 16px;
      }

      .filters-section {
        flex-direction: column;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }

      .receipt-preview {
        padding: 20px;
      }
    }
  `]
})
export class DigitalReceiptsComponent implements OnInit, OnDestroy {
  receipts: DigitalReceipt[] = [];
  filteredReceipts: DigitalReceipt[] = [];
  selectedReceipt: DigitalReceipt | null = null;
  receiptToEmail: DigitalReceipt | null = null;
  selectedReceipts: string[] = [];
  selectAllChecked: boolean = false;
  showReceiptPreview: boolean = false;
  showEmailModal: boolean = false;
  showBulkActions: boolean = false;
  searchQuery: string = '';
  statusFilter: string = 'all';
  paymentMethodFilter: string = 'all';
  dateFrom: string = '';
  dateTo: string = '';
  emailRecipient: string = '';
  emailSubject: string = '';
  emailMessage: string = '';

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadReceipts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReceipts(): void {
    this.receipts = [
      {
        id: 'receipt-1',
        receiptNumber: 'RCP-2024-001',
        transactionId: 'txn-1',
        transactionNumber: 'TXN123456',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2024-001',
        paymentMethod: 'Credit Card ending 1234',
        paymentMethodType: 'card',
        amount: 4500,
        tax: 810,
        totalAmount: 5310,
        paymentDate: new Date(2024, 1, 15),
        status: 'paid',
        items: [
          { description: 'Maintenance Charges', quantity: 1, unitPrice: 4000, amount: 4000, tax: 720 },
          { description: 'Water Charges', quantity: 1, unitPrice: 500, amount: 500, tax: 90 }
        ],
        pdfGenerated: true,
        pdfGeneratedAt: new Date(2024, 1, 15),
        emailed: true,
        emailedAt: new Date(2024, 1, 15),
        emailRecipient: 'rajesh@example.com',
        createdAt: new Date(2024, 1, 15)
      },
      {
        id: 'receipt-2',
        receiptNumber: 'RCP-2024-002',
        transactionId: 'txn-2',
        transactionNumber: 'TXN789012',
        residentId: 'res-2',
        residentName: 'Priya Sharma',
        flatNumber: 'B-205',
        billId: 'bill-1',
        billNumber: 'BILL-2024-001',
        paymentMethod: 'UPI - priya@paytm',
        paymentMethodType: 'upi',
        amount: 3000,
        totalAmount: 3000,
        paymentDate: new Date(2024, 1, 10),
        status: 'paid',
        items: [
          { description: 'Utility Bill Payment', quantity: 1, unitPrice: 3000, amount: 3000 }
        ],
        pdfGenerated: false,
        emailed: false,
        createdAt: new Date(2024, 1, 10)
      }
    ];
    this.filterReceipts();
  }

  filterReceipts(): void {
    let filtered = [...this.receipts];
    
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === this.statusFilter);
    }
    
    if (this.paymentMethodFilter !== 'all') {
      filtered = filtered.filter(r => r.paymentMethodType === this.paymentMethodFilter);
    }
    
    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);
      filtered = filtered.filter(r => r.paymentDate >= fromDate);
    }
    
    if (this.dateTo) {
      const toDate = new Date(this.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => r.paymentDate <= toDate);
    }
    
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.receiptNumber.toLowerCase().includes(query) ||
        r.transactionNumber.toLowerCase().includes(query) ||
        r.residentName.toLowerCase().includes(query) ||
        (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(query)) ||
        (r.billNumber && r.billNumber.toLowerCase().includes(query))
      );
    }
    
    filtered.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
    this.filteredReceipts = filtered;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'paid': 'Paid',
      'refunded': 'Refunded',
      'partial': 'Partial'
    };
    return labels[status] || status;
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'card': 'Card',
      'upi': 'UPI',
      'net_banking': 'Net Banking',
      'neft': 'NEFT',
      'cash': 'Cash',
      'cheque': 'Cheque',
      'wallet': 'Wallet'
    };
    return labels[method] || method;
  }

  goBack(): void {
    window.history.back();
  }

  // Statistics getters
  get totalReceiptsCount(): number {
    return this.receipts.length;
  }

  get pdfGeneratedCount(): number {
    return this.receipts.filter(r => r.pdfGenerated).length;
  }

  get emailedCount(): number {
    return this.receipts.filter(r => r.emailed).length;
  }

  get totalAmount(): number {
    return this.receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }

  // Selection methods
  isSelected(receiptId: string): boolean {
    return this.selectedReceipts.includes(receiptId);
  }

  toggleSelection(receiptId: string): void {
    const index = this.selectedReceipts.indexOf(receiptId);
    if (index > -1) {
      this.selectedReceipts.splice(index, 1);
    } else {
      this.selectedReceipts.push(receiptId);
    }
    this.selectAllChecked = this.selectedReceipts.length === this.filteredReceipts.length;
  }

  toggleSelectAll(): void {
    if (this.selectAllChecked) {
      this.selectedReceipts = this.filteredReceipts.map(r => r.id);
    } else {
      this.selectedReceipts = [];
    }
  }

  selectAll(): void {
    this.selectedReceipts = this.filteredReceipts.map(r => r.id);
    this.selectAllChecked = true;
  }

  deselectAll(): void {
    this.selectedReceipts = [];
    this.selectAllChecked = false;
  }

  // Receipt actions
  viewReceipt(receipt: DigitalReceipt): void {
    this.selectedReceipt = receipt;
    this.showReceiptPreview = true;
  }

  closeReceiptPreview(): void {
    this.showReceiptPreview = false;
    this.selectedReceipt = null;
  }

  downloadPDF(receipt: DigitalReceipt): void {
    // Generate and download PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const receiptContent = this.generateReceiptHTML(receipt);
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.print();
      
      // Mark as PDF generated
      receipt.pdfGenerated = true;
      receipt.pdfGeneratedAt = new Date();
    }
  }

  downloadSelectedPDFs(): void {
    const selected = this.receipts.filter(r => this.selectedReceipts.includes(r.id));
    selected.forEach(receipt => {
      setTimeout(() => this.downloadPDF(receipt), 100);
    });
  }

  emailReceipt(receipt: DigitalReceipt): void {
    this.receiptToEmail = receipt;
    this.emailRecipient = receipt.emailRecipient || '';
    this.emailSubject = `Payment Receipt - ${receipt.receiptNumber}`;
    this.emailMessage = `Dear ${receipt.residentName},\n\nPlease find attached the payment receipt for your transaction.\n\nThank you.`;
    this.showEmailModal = true;
  }

  emailSelectedReceipts(): void {
    const selected = this.receipts.filter(r => this.selectedReceipts.includes(r.id));
    if (selected.length > 0) {
      this.emailReceipt(selected[0]);
    }
  }

  sendEmail(): void {
    if (!this.emailRecipient || !this.receiptToEmail) return;
    
    // In real app, send email via API
    this.receiptToEmail.emailed = true;
    this.receiptToEmail.emailedAt = new Date();
    this.receiptToEmail.emailRecipient = this.emailRecipient;
    
    alert(`Receipt emailed to ${this.emailRecipient}`);
    this.showEmailModal = false;
    this.receiptToEmail = null;
    this.emailRecipient = '';
  }

  getCurrentDateTime(): string {
    return this.formatDateTime(new Date());
  }

  generateReceiptHTML(receipt: DigitalReceipt): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .receipt-header { display: flex; justify-content: space-between; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e9ecef; }
          .receipt-logo h1 { margin: 0; font-size: 24px; }
          .receipt-info { text-align: right; }
          .detail-section { margin-bottom: 24px; }
          .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e9ecef; }
          th { background: #f8f9fa; }
          .receipt-summary { margin-top: 24px; padding-top: 24px; border-top: 2px solid #e9ecef; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .summary-row.total { font-size: 18px; font-weight: 700; border-top: 1px solid #e9ecef; margin-top: 8px; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <div class="receipt-logo">
            <h1>Society Management</h1>
            <p>Digital Receipt</p>
          </div>
          <div class="receipt-info">
            <div><strong>Receipt #:</strong> ${receipt.receiptNumber}</div>
            <div><strong>Date:</strong> ${this.formatDateTime(receipt.paymentDate)}</div>
          </div>
        </div>
        <div class="detail-section">
          <h3>Payment Information</h3>
          <div class="detail-grid">
            <div><strong>Transaction #:</strong> ${receipt.transactionNumber}</div>
            <div><strong>Payment Method:</strong> ${receipt.paymentMethod}</div>
            <div><strong>Payment Date:</strong> ${this.formatDateTime(receipt.paymentDate)}</div>
            <div><strong>Status:</strong> ${this.getStatusLabel(receipt.status)}</div>
          </div>
        </div>
        <div class="detail-section">
          <h3>Resident Information</h3>
          <div class="detail-grid">
            <div><strong>Name:</strong> ${receipt.residentName}</div>
            <div><strong>Flat Number:</strong> ${receipt.flatNumber}</div>
            ${receipt.invoiceNumber ? `<div><strong>Invoice #:</strong> ${receipt.invoiceNumber}</div>` : ''}
            ${receipt.billNumber ? `<div><strong>Bill #:</strong> ${receipt.billNumber}</div>` : ''}
          </div>
        </div>
        ${receipt.items && receipt.items.length > 0 ? `
        <div class="detail-section">
          <h3>Payment Items</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Tax</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${this.formatCurrency(item.unitPrice)}</td>
                  <td>${item.tax ? this.formatCurrency(item.tax) : '-'}</td>
                  <td><strong>${this.formatCurrency(item.amount)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        <div class="receipt-summary">
          ${receipt.discount ? `<div class="summary-row"><span>Subtotal:</span><span>${this.formatCurrency(receipt.amount)}</span></div>` : ''}
          ${receipt.discount ? `<div class="summary-row"><span>Discount:</span><span>-${this.formatCurrency(receipt.discount)}</span></div>` : ''}
          ${receipt.tax ? `<div class="summary-row"><span>Tax:</span><span>${this.formatCurrency(receipt.tax)}</span></div>` : ''}
          <div class="summary-row total"><span>Total Amount:</span><span>${this.formatCurrency(receipt.totalAmount)}</span></div>
        </div>
        ${receipt.notes ? `<div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px;"><h4>Notes:</h4><p>${receipt.notes}</p></div>` : ''}
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e9ecef; text-align: center;">
          <p>This is a computer-generated receipt. No signature required.</p>
          <p>Generated on: ${this.formatDateTime(new Date())}</p>
        </div>
      </body>
      </html>
    `;
  }
}

