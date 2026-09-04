import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillDocumentDownloadService } from '../../../../core/services/bill-document-download.service';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice, InvoiceItem, InvoiceTemplate } from '../../models/invoice.model';

/**
 * Invoice Management Component
 * Handles creation, management, and tracking of all invoices
 */

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="invoices-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">description</i>
            Invoice Management
          </h1>
          <p>Create, manage, and track all invoices</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/invoices</strong> and <strong>/invoice-templates</strong> APIs.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showTemplates = true" title="Templates">
            <i class="material-icons">file_copy</i>
          </button>
          <button class="icon-btn primary" (click)="showCreateModal = true" title="Create Invoice">
            <i class="material-icons">add</i>
            Create Invoice
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
            <div class="stat-value">{{ totalInvoices }}</div>
            <div class="stat-label">Total Invoices</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingInvoices.length }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card paid">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ paidInvoices.length }}</div>
            <div class="stat-label">Paid</div>
          </div>
        </div>
        <div class="stat-card overdue">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overdueInvoices.length }}</div>
            <div class="stat-label">Overdue</div>
          </div>
        </div>
        <div class="stat-card amount">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
            <div class="stat-label">Total Amount</div>
          </div>
        </div>
        <div class="stat-card collected">
          <div class="stat-icon">
            <i class="material-icons">payments</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(collectedAmount) }}</div>
            <div class="stat-label">Collected</div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by invoice number, resident, vendor..." 
            [(ngModel)]="searchQuery"
            (input)="filterInvoices()"
          />
        </div>
        <select [(ngModel)]="invoiceTypeFilter" (change)="filterInvoices()" class="filter-select">
          <option value="all">All Types</option>
          <option value="maintenance">Maintenance</option>
          <option value="utility">Utility</option>
          <option value="service">Service</option>
          <option value="penalty">Penalty</option>
          <option value="other">Other</option>
        </select>
        <select [(ngModel)]="statusFilter" (change)="filterInvoices()" class="filter-select">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="partially_paid">Partially Paid</option>
        </select>
        <select [(ngModel)]="dateRangeFilter" (change)="filterInvoices()" class="filter-select">
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      <!-- Invoices Table -->
      <div class="invoices-table-container">
        <table class="invoices-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Type</th>
              <th>Recipient</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let invoice of filteredInvoices" [class.overdue]="invoice.status === 'overdue'">
              <td>
                <strong>{{ invoice.invoiceNumber }}</strong>
              </td>
              <td>
                <span class="type-badge" [ngClass]="invoice.invoiceType">
                  {{ getInvoiceTypeLabel(invoice.invoiceType) }}
                </span>
              </td>
              <td>
                <div class="recipient-info">
                  <div class="recipient-name">{{ invoice.residentName || invoice.vendorName || 'N/A' }}</div>
                  <div class="recipient-details" *ngIf="invoice.flatNumber">{{ invoice.flatNumber }}</div>
                </div>
              </td>
              <td>{{ formatDate(invoice.invoiceDate) }}</td>
              <td [ngClass]="isOverdue(invoice.dueDate) && invoice.status !== 'paid' ? 'overdue' : ''">
                {{ formatDate(invoice.dueDate) }}
              </td>
              <td>{{ invoice.items.length }} item(s)</td>
              <td class="amount">{{ formatCurrency(invoice.totalAmount) }}</td>
              <td class="amount paid">{{ formatCurrency(invoice.paidAmount) }}</td>
              <td class="amount" [class.overdue]="invoice.balance > 0">{{ formatCurrency(invoice.balance) }}</td>
              <td>
                <span class="status-badge" [ngClass]="invoice.status">
                  {{ getStatusLabel(invoice.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewInvoice(invoice)" title="View Details">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn edit" (click)="editInvoice(invoice)" title="Edit" *ngIf="invoice.status === 'draft'">
                    <i class="material-icons">edit</i>
                  </button>
                  <button class="action-btn send" (click)="sendInvoice(invoice)" title="Send" *ngIf="invoice.status === 'draft' || invoice.status === 'sent'">
                    <i class="material-icons">send</i>
                  </button>
                  <button class="action-btn download" (click)="downloadInvoice(invoice)" title="Download PDF">
                    <i class="material-icons">download</i>
                  </button>
                  <button class="action-btn duplicate" (click)="duplicateInvoice(invoice)" title="Duplicate">
                    <i class="material-icons">content_copy</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredInvoices.length === 0">
          <i class="material-icons">description</i>
          <p>No invoices found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showCreateModal = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Create First Invoice
          </button>
        </div>
      </div>

      <!-- Invoice Details Modal -->
      <div class="modal-overlay" *ngIf="selectedInvoice" (click)="closeInvoiceDetails()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Invoice Details - {{ selectedInvoice.invoiceNumber }}</h2>
            <button class="close-btn" (click)="closeInvoiceDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedInvoice">
            <div class="invoice-header">
              <div class="invoice-info">
                <h3>{{ selectedInvoice.residentName || selectedInvoice.vendorName || 'N/A' }}</h3>
                <p *ngIf="selectedInvoice.flatNumber">{{ selectedInvoice.flatNumber }}</p>
                <p>Invoice Type: <strong>{{ getInvoiceTypeLabel(selectedInvoice.invoiceType) }}</strong></p>
              </div>
              <div class="invoice-status">
                <span class="status-badge large" [ngClass]="selectedInvoice.status">
                  {{ getStatusLabel(selectedInvoice.status) }}
                </span>
              </div>
            </div>

            <!-- Invoice Items -->
            <div class="invoice-items">
              <h4>Invoice Items</h4>
              <table class="items-table">
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
                  <tr *ngFor="let item of selectedInvoice.items">
                    <td>{{ item.description }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ formatCurrency(item.unitPrice) }}</td>
                    <td>{{ item.taxRate }}%</td>
                    <td class="amount">{{ formatCurrency(item.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Invoice Summary -->
            <div class="invoice-summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>{{ formatCurrency(selectedInvoice.subtotal) }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedInvoice.discount > 0">
                <span>Discount:</span>
                <span class="discount">-{{ formatCurrency(selectedInvoice.discount) }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedInvoice.tax > 0">
                <span>Total Tax (GST):</span>
                <span>{{ formatCurrency(selectedInvoice.tax) }}</span>
              </div>
              <!-- GST Breakdown -->
              <div class="gst-breakdown" *ngIf="selectedInvoice.tax > 0">
                <div class="summary-row gst-item" *ngIf="(selectedInvoice.cgst || 0) > 0">
                  <span>CGST:</span>
                  <span>{{ formatCurrency(selectedInvoice.cgst || 0) }}</span>
                </div>
                <div class="summary-row gst-item" *ngIf="(selectedInvoice.sgst || 0) > 0">
                  <span>SGST:</span>
                  <span>{{ formatCurrency(selectedInvoice.sgst || 0) }}</span>
                </div>
                <div class="summary-row gst-item" *ngIf="(selectedInvoice.igst || 0) > 0">
                  <span>IGST:</span>
                  <span>{{ formatCurrency(selectedInvoice.igst || 0) }}</span>
                </div>
              </div>
              <div class="summary-row" *ngIf="selectedInvoice.supplyType">
                <span>Supply Type:</span>
                <span>{{ selectedInvoice.supplyType === 'intra_state' ? 'Intra-State' : 'Inter-State' }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedInvoice.placeOfSupply">
                <span>Place of Supply:</span>
                <span>{{ selectedInvoice.placeOfSupply }}</span>
              </div>
              <div class="summary-row total">
                <span>Total Amount:</span>
                <span>{{ formatCurrency(selectedInvoice.totalAmount) }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedInvoice.paidAmount > 0">
                <span>Paid Amount:</span>
                <span class="paid">{{ formatCurrency(selectedInvoice.paidAmount) }}</span>
              </div>
              <div class="summary-row balance">
                <span>Balance:</span>
                <span [ngClass]="selectedInvoice.balance > 0 ? 'overdue' : 'paid'">
                  {{ formatCurrency(selectedInvoice.balance) }}
                </span>
              </div>
            </div>

            <div class="invoice-dates">
              <div class="date-row">
                <span>Invoice Date:</span>
                <span>{{ formatDateTime(selectedInvoice.invoiceDate) }}</span>
              </div>
              <div class="date-row">
                <span>Due Date:</span>
                <span [ngClass]="isOverdue(selectedInvoice.dueDate) && selectedInvoice.status !== 'paid' ? 'overdue' : ''">
                  {{ formatDateTime(selectedInvoice.dueDate) }}
                </span>
              </div>
              <div class="date-row" *ngIf="selectedInvoice.paidAt">
                <span>Paid Date:</span>
                <span>{{ formatDateTime(selectedInvoice.paidAt) }}</span>
              </div>
              <div class="date-row" *ngIf="selectedInvoice.paymentMethod">
                <span>Payment Method:</span>
                <span>{{ selectedInvoice.paymentMethod }}</span>
              </div>
            </div>

            <div class="invoice-notes" *ngIf="selectedInvoice.notes">
              <h4>Notes</h4>
              <p>{{ selectedInvoice.notes }}</p>
            </div>

            <div class="invoice-terms" *ngIf="selectedInvoice.termsAndConditions">
              <h4>Terms & Conditions</h4>
              <p>{{ selectedInvoice.termsAndConditions }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeInvoiceDetails()">Close</button>
            <button class="btn btn-primary" (click)="downloadInvoice(selectedInvoice!)">
              <i class="material-icons">download</i>
              Download PDF
            </button>
            <button class="btn btn-success" (click)="sendInvoice(selectedInvoice!)" *ngIf="selectedInvoice?.status === 'draft'">
              <i class="material-icons">send</i>
              Send Invoice
            </button>
            <button class="btn btn-info" (click)="duplicateInvoice(selectedInvoice!)">
              <i class="material-icons">content_copy</i>
              Duplicate
            </button>
          </div>
        </div>
      </div>

      <!-- Create Invoice Modal -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Create New Invoice</h2>
            <button class="close-btn" (click)="showCreateModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Invoice Type <span class="required">*</span></label>
                <select [(ngModel)]="newInvoice.invoiceType" required>
                  <option value="">Select Type</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="utility">Utility</option>
                  <option value="service">Service</option>
                  <option value="penalty">Penalty</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Invoice Date <span class="required">*</span></label>
                <input type="date" [(ngModel)]="invoiceDate" required />
              </div>
              <div class="form-group">
                <label>Due Date <span class="required">*</span></label>
                <input type="date" [(ngModel)]="dueDate" required />
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
                <input type="text" [(ngModel)]="newInvoice.flatNumber" placeholder="e.g., A-101" />
              </div>
              <div class="form-group" *ngIf="recipientType === 'vendor'">
                <label>Vendor Name</label>
                <input type="text" [(ngModel)]="newInvoice.vendorName" placeholder="Vendor name" />
              </div>
            </div>

            <!-- Invoice Items -->
            <div class="invoice-items-section">
              <div class="section-header">
                <h4>Invoice Items</h4>
                <button type="button" class="btn-add-item" (click)="addInvoiceItem()">
                  <i class="material-icons">add</i>
                  Add Item
                </button>
              </div>
              <table class="items-input-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Tax %</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of newInvoice.items; let i = index">
                    <td>
                      <input type="text" [(ngModel)]="item.description" placeholder="Item description" (input)="calculateItemAmount(item)" />
                    </td>
                    <td>
                      <input type="number" [(ngModel)]="item.quantity" min="1" step="1" (input)="calculateItemAmount(item)" />
                    </td>
                    <td>
                      <input type="number" [(ngModel)]="item.unitPrice" min="0" step="0.01" (input)="calculateItemAmount(item)" />
                    </td>
                    <td>
                      <input type="number" [(ngModel)]="item.taxRate" min="0" max="100" step="0.01" (input)="calculateItemAmount(item)" />
                    </td>
                    <td class="amount">{{ formatCurrency(item.amount) }}</td>
                    <td>
                      <button type="button" class="btn-remove" (click)="removeInvoiceItem(i)">
                        <i class="material-icons">delete</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- GST Configuration -->
            <div class="form-section-title">GST Configuration</div>
            <div class="form-row">
              <div class="form-group">
                <label>Supply Type <span class="required">*</span></label>
                <select [(ngModel)]="newInvoice.supplyType" (change)="calculateTotals()" required>
                  <option value="intra_state">Intra-State (CGST + SGST)</option>
                  <option value="inter_state">Inter-State (IGST)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Place of Supply</label>
                <input type="text" [(ngModel)]="newInvoice.placeOfSupply" placeholder="e.g., Maharashtra" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Discount</label>
                <input type="number" [(ngModel)]="newInvoice.discount" min="0" step="0.01" (input)="calculateTotals()" />
              </div>
              <div class="form-group">
                <label>Payment Terms</label>
                <input type="text" [(ngModel)]="newInvoice.paymentTerms" placeholder="e.g., Net 30" />
              </div>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="newInvoice.notes" placeholder="Additional notes" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>Terms & Conditions</label>
              <textarea [(ngModel)]="newInvoice.termsAndConditions" placeholder="Terms and conditions" rows="3"></textarea>
            </div>

            <div class="invoice-preview">
              <h4>Invoice Summary</h4>
              <div class="preview-summary">
                <div class="summary-row">
                  <span>Subtotal:</span>
                  <span>{{ formatCurrency(newInvoice.subtotal || 0) }}</span>
                </div>
                <div class="summary-row" *ngIf="(newInvoice.discount || 0) > 0">
                  <span>Discount:</span>
                  <span>-{{ formatCurrency(newInvoice.discount || 0) }}</span>
                </div>
                <div class="summary-row" *ngIf="(newInvoice.tax || 0) > 0">
                  <span>Total Tax (GST):</span>
                  <span>{{ formatCurrency(newInvoice.tax || 0) }}</span>
                </div>
                <!-- GST Breakdown -->
                <div class="gst-breakdown" *ngIf="(newInvoice.tax || 0) > 0">
                  <div class="summary-row gst-item" *ngIf="(newInvoice.cgst || 0) > 0">
                    <span>CGST:</span>
                    <span>{{ formatCurrency(newInvoice.cgst || 0) }}</span>
                  </div>
                  <div class="summary-row gst-item" *ngIf="(newInvoice.sgst || 0) > 0">
                    <span>SGST:</span>
                    <span>{{ formatCurrency(newInvoice.sgst || 0) }}</span>
                  </div>
                  <div class="summary-row gst-item" *ngIf="(newInvoice.igst || 0) > 0">
                    <span>IGST:</span>
                    <span>{{ formatCurrency(newInvoice.igst || 0) }}</span>
                  </div>
                </div>
                <div class="summary-row total">
                  <span>Total Amount:</span>
                  <span>{{ formatCurrency(newInvoice.totalAmount || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showCreateModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveAsDraft()">
              <i class="material-icons">save</i>
              Save as Draft
            </button>
            <button class="btn btn-success" (click)="createInvoice()" [disabled]="!isInvoiceValid()">
              <i class="material-icons">check</i>
              Create Invoice
            </button>
          </div>
        </div>
      </div>

      <!-- Templates Modal -->
      <div class="modal-overlay" *ngIf="showTemplates" (click)="showTemplates = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Invoice Templates</h2>
            <button class="close-btn" (click)="showTemplates = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="templates-list">
              <div class="template-item" *ngFor="let template of invoiceTemplates" (click)="useTemplate(template)">
                <div class="template-icon">
                  <i class="material-icons">file_copy</i>
                </div>
                <div class="template-info">
                  <h4>{{ template.name }}</h4>
                  <p>{{ template.description }}</p>
                  <span class="template-items">{{ template.items.length }} items</span>
                </div>
                <i class="material-icons">chevron_right</i>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showTemplates = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invoices-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
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
    .stat-card.pending .stat-icon { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .stat-card.paid .stat-icon { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }
    .stat-card.overdue .stat-icon { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .stat-card.amount .stat-icon { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .stat-card.collected .stat-icon { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); }

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
    .invoices-table-container {
      padding: 0 24px 24px;
    }

    .invoices-table {
      width: 100%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .invoices-table thead {
      background: #f8f9fa;
    }

    .invoices-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .invoices-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .invoices-table tr.overdue {
      background: #fff5f5;
    }

    .invoices-table tr:hover {
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

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .amount.paid {
      color: #2ed573;
    }

    .amount.overdue {
      color: #e74c3c;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.draft { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.sent { background: #fff4e6; color: #e67e22; }
    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.overdue { background: #ffeaea; color: #c0392b; }
    .status-badge.partially_paid { background: #fffbf0; color: #f39c12; }
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
    .action-btn.edit { background: #fff4e6; color: #e67e22; }
    .action-btn.send { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.download { background: #f4e7ff; color: #8e44ad; }
    .action-btn.duplicate { background: #e7f3ff; color: #2980b9; }

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

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .invoice-info h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .invoice-info p {
      margin: 4px 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .invoice-items,
    .invoice-summary,
    .invoice-dates,
    .invoice-notes,
    .invoice-terms {
      margin-bottom: 24px;
    }

    .invoice-items h4,
    .invoice-notes h4,
    .invoice-terms h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table th,
    .items-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #f0f0f0;
    }

    .items-table th {
      background: #f8f9fa;
      font-size: 12px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .invoice-summary {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .summary-row.total {
      border-top: 2px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 12px;
      font-weight: 600;
      font-size: 16px;
    }

    .summary-row.balance {
      border-top: 1px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 12px;
      font-weight: 600;
    }

    .summary-row .discount {
      color: #2ed573;
    }

    .summary-row .paid {
      color: #2ed573;
    }

    .summary-row .overdue {
      color: #e74c3c;
    }

    .gst-breakdown {
      margin: 8px 0;
      padding-left: 16px;
      border-left: 2px solid #e9ecef;
    }

    .summary-row.gst-item {
      font-size: 13px;
      color: #7f8c8d;
      padding: 4px 0;
    }

    .form-section-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      margin: 24px 0 16px 0;
      padding-top: 16px;
      border-top: 2px solid #e9ecef;
    }

    .invoice-dates {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .date-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .date-row .overdue {
      color: #e74c3c;
      font-weight: 600;
    }

    .invoice-notes,
    .invoice-terms {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .invoice-notes p,
    .invoice-terms p {
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
      border-color: #2ed573;
    }

    .invoice-items-section {
      margin: 24px 0;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .btn-add-item {
      padding: 8px 16px;
      background: #2ed573;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .items-input-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-input-table th,
    .items-input-table td {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .items-input-table th {
      background: white;
      font-size: 12px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .items-input-table input {
      width: 100%;
      padding: 6px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 13px;
    }

    .btn-remove {
      background: #ffeaea;
      color: #e74c3c;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
    }

    .invoice-preview {
      margin-top: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .invoice-preview h4 {
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

    .templates-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .template-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .template-item:hover {
      background: #e9ecef;
      transform: translateX(4px);
    }

    .template-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: #2ed573;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .template-info {
      flex: 1;
    }

    .template-info h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .template-info p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #7f8c8d;
    }

    .template-items {
      font-size: 12px;
      color: #95a5a6;
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
      background: #2ed573;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1e9e5a;
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
      background: #3498db;
      color: white;
    }

    .btn-info:hover {
      background: #2980b9;
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
      margin: 0 0 16px 0;
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

      .invoices-table-container {
        padding: 0 16px 16px;
        overflow-x: auto;
      }

      .invoices-table {
        min-width: 1200px;
      }
    }
  `]
})
export class InvoicesComponent implements OnInit, OnDestroy {
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  selectedInvoice: Invoice | null = null;
  invoiceTemplates: InvoiceTemplate[] = [];
  searchQuery: string = '';
  invoiceTypeFilter: string = 'all';
  statusFilter: string = 'all';
  dateRangeFilter: string = 'all';
  showCreateModal: boolean = false;
  showTemplates: boolean = false;
  recipientType: 'resident' | 'vendor' = 'resident';
  invoiceDate: string = '';
  dueDate: string = '';
  loadError = '';
  isLoading = false;

  newInvoice: Partial<Invoice> = {
    invoiceType: 'maintenance',
    items: [],
    subtotal: 0,
    tax: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    supplyType: 'intra_state', // Default to intra-state
    placeOfSupply: 'Maharashtra',
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    balance: 0,
    status: 'draft',
    paymentTerms: 'Net 30',
    createdBy: '',
    reminderSent: false,
    reminderCount: 0
  };

  private destroy$ = new Subject<void>();
  private billDownload = inject(BillDocumentDownloadService);
  private invoiceService = inject(InvoiceService);
  private session = inject(SessionContextService);

  constructor() {
    const today = new Date();
    this.invoiceDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadInvoices();
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load invoices from API
   */
  loadInvoices(): void {
    this.loadError = '';
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.invoices = [];
      this.filteredInvoices = [];
      return;
    }

    this.isLoading = true;
    this.invoiceService.getAllInvoices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoices) => {
          this.invoices = invoices;
          this.filterInvoices();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading invoices:', error);
          this.loadError = 'Failed to load invoices from the API. Ensure the backend is running.';
          this.invoices = [];
          this.filteredInvoices = [];
          this.isLoading = false;
        }
      });
  }

  /**
   * Load invoice templates from API
   */
  loadTemplates(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.invoiceService.getTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          this.invoiceTemplates = templates;
        },
        error: (error) => {
          console.error('Error loading templates:', error);
        }
      });
  }

  /**
   * Filter invoices
   */
  filterInvoices(): void {
    let filtered = [...this.invoices];

    // Apply invoice type filter
    if (this.invoiceTypeFilter !== 'all') {
      filtered = filtered.filter(i => i.invoiceType === this.invoiceTypeFilter);
    }

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === this.statusFilter);
    }

    // Apply date range filter
    if (this.dateRangeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(i => {
        const invoiceDate = new Date(i.invoiceDate);
        switch (this.dateRangeFilter) {
          case 'this_month':
            return invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear();
          case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return invoiceDate.getMonth() === lastMonth.getMonth() && invoiceDate.getFullYear() === lastMonth.getFullYear();
          case 'this_quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            return Math.floor(invoiceDate.getMonth() / 3) === quarter && invoiceDate.getFullYear() === now.getFullYear();
          case 'this_year':
            return invoiceDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.invoiceNumber.toLowerCase().includes(query) ||
        (i.residentName && i.residentName.toLowerCase().includes(query)) ||
        (i.vendorName && i.vendorName.toLowerCase().includes(query)) ||
        (i.flatNumber && i.flatNumber.toLowerCase().includes(query))
      );
    }

    // Sort by invoice date (newest first)
    filtered.sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime());

    this.filteredInvoices = filtered;
  }

  /**
   * Get pending invoices
   */
  get pendingInvoices(): Invoice[] {
    return this.invoices.filter(i => i.status === 'sent' || i.status === 'draft');
  }

  /**
   * Get paid invoices
   */
  get paidInvoices(): Invoice[] {
    return this.invoices.filter(i => i.status === 'paid');
  }

  /**
   * Get overdue invoices
   */
  get overdueInvoices(): Invoice[] {
    return this.invoices.filter(i => i.status === 'overdue');
  }

  /**
   * Get total invoices count
   */
  get totalInvoices(): number {
    return this.invoices.length;
  }

  /**
   * Get total amount
   */
  get totalAmount(): number {
    return this.invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  }

  /**
   * Get collected amount
   */
  get collectedAmount(): number {
    return this.invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  }

  /**
   * View invoice details
   */
  viewInvoice(invoice: Invoice): void {
    this.selectedInvoice = invoice;
  }

  /**
   * Close invoice details
   */
  closeInvoiceDetails(): void {
    this.selectedInvoice = null;
  }

  /**
   * Edit invoice
   */
  editInvoice(invoice: Invoice): void {
    // In real app, navigate to edit page or open edit modal
    console.log('Edit invoice:', invoice);
    this.newInvoice = { ...invoice };
    this.invoiceDate = new Date(invoice.invoiceDate).toISOString().split('T')[0];
    this.dueDate = new Date(invoice.dueDate).toISOString().split('T')[0];
    this.showCreateModal = true;
  }

  /**
   * Send invoice via API
   */
  sendInvoice(invoice: Invoice): void {
    this.invoiceService.sendInvoice(invoice.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.invoices.findIndex(i => i.id === updated.id);
          if (idx >= 0) {
            this.invoices[idx] = updated;
          }
          if (this.selectedInvoice?.id === updated.id) {
            this.selectedInvoice = updated;
          }
          this.filterInvoices();
          window.alert('Invoice sent successfully!');
        },
        error: (error) => {
          console.error('Error sending invoice:', error);
          window.alert('Failed to send invoice. Ensure the backend is running.');
        }
      });
  }

  /**
   * Download invoice
   */
  downloadInvoice(invoice: Invoice): void {
    this.billDownload.downloadBillPdf({
      documentTitle: 'Invoice',
      documentNumber: invoice.invoiceNumber,
      recipientName: invoice.residentName || invoice.vendorName || 'Customer',
      flatNumber: invoice.flatNumber,
      issueDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      lineItems: (invoice.items ?? []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.unitPrice,
        amount: item.amount,
        meta: item.category
      })),
      summaryRows: [
        { label: 'Subtotal', value: this.formatCurrency(invoice.subtotal) },
        { label: 'Tax', value: this.formatCurrency(invoice.tax) },
        { label: 'Discount', value: this.formatCurrency(invoice.discount) }
      ],
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balance: invoice.balance,
      notes: invoice.notes,
      footerLines: invoice.termsAndConditions
        ? [invoice.termsAndConditions, 'This is a computer-generated invoice.']
        : undefined
    });
  }

  /**
   * Duplicate invoice
   */
  duplicateInvoice(invoice: Invoice): void {
    this.newInvoice = {
      ...invoice,
      id: undefined,
      invoiceNumber: undefined,
      status: 'draft',
      paidAmount: 0,
      balance: invoice.totalAmount,
      createdAt: new Date(),
      sentAt: undefined,
      paidAt: undefined
    };
    this.invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
    this.showCreateModal = true;
  }

  /**
   * Add invoice item
   */
  addInvoiceItem(): void {
    if (!this.newInvoice.items) {
      this.newInvoice.items = [];
    }
    this.newInvoice.items.push({
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 10,
      amount: 0
    });
  }

  /**
   * Remove invoice item
   */
  removeInvoiceItem(index: number): void {
    if (this.newInvoice.items) {
      this.newInvoice.items.splice(index, 1);
      this.calculateTotals();
    }
  }

  /**
   * Calculate item amount with automatic GST calculation
   */
  calculateItemAmount(item: InvoiceItem): void {
    const subtotal = item.quantity * item.unitPrice;
    const taxRate = item.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    
    // Automatic GST calculation based on supply type
    const supplyType = this.newInvoice.supplyType || 'intra_state';
    
    if (taxRate > 0) {
      if (supplyType === 'intra_state') {
        // Intra-state: CGST + SGST (each half of total GST)
        item.cgst = taxAmount / 2;
        item.sgst = taxAmount / 2;
        item.igst = 0;
      } else {
        // Inter-state: IGST (full GST)
        item.cgst = 0;
        item.sgst = 0;
        item.igst = taxAmount;
      }
    } else {
      item.cgst = 0;
      item.sgst = 0;
      item.igst = 0;
    }
    
    item.amount = subtotal + taxAmount;
    this.calculateTotals();
  }

  /**
   * Calculate totals with automatic GST calculation
   */
  calculateTotals(): void {
    if (!this.newInvoice.items) {
      return;
    }

    // Calculate subtotal
    this.newInvoice.subtotal = this.newInvoice.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    // Calculate total tax (sum of all item taxes)
    this.newInvoice.tax = this.newInvoice.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * ((item.taxRate || 0) / 100));
    }, 0);

    // Automatic GST calculation based on supply type
    const supplyType = this.newInvoice.supplyType || 'intra_state';
    
    if (supplyType === 'intra_state') {
      // Intra-state: CGST + SGST (each half of total GST)
      this.newInvoice.cgst = this.newInvoice.tax / 2;
      this.newInvoice.sgst = this.newInvoice.tax / 2;
      this.newInvoice.igst = 0;
    } else {
      // Inter-state: IGST (full GST)
      this.newInvoice.cgst = 0;
      this.newInvoice.sgst = 0;
      this.newInvoice.igst = this.newInvoice.tax;
    }

    this.newInvoice.totalAmount = this.newInvoice.subtotal + this.newInvoice.tax - (this.newInvoice.discount || 0);
    this.newInvoice.balance = this.newInvoice.totalAmount - (this.newInvoice.paidAmount || 0);
  }

  /**
   * On recipient type change
   */
  onRecipientTypeChange(): void {
    if (this.recipientType === 'resident') {
      this.newInvoice.vendorId = undefined;
      this.newInvoice.vendorName = undefined;
    } else {
      this.newInvoice.residentId = undefined;
      this.newInvoice.residentName = undefined;
      this.newInvoice.flatNumber = undefined;
    }
  }

  /**
   * Use template
   */
  useTemplate(template: InvoiceTemplate): void {
    this.newInvoice.items = template.items.map(item => ({ ...item }));
    this.newInvoice.termsAndConditions = template.termsAndConditions;
    this.calculateTotals();
    this.showTemplates = false;
    this.showCreateModal = true;
  }

  /**
   * Build invoice payload from the create/edit form
   */
  private buildInvoiceFromForm(status: Invoice['status']): Partial<Invoice> {
    const now = new Date();
    const payload: Partial<Invoice> = {
      id: this.newInvoice.id,
      invoiceNumber: this.newInvoice.invoiceNumber,
      invoiceType: this.newInvoice.invoiceType!,
      residentId: this.newInvoice.residentId,
      residentName: this.newInvoice.residentName,
      flatNumber: this.newInvoice.flatNumber,
      vendorId: this.newInvoice.vendorId,
      vendorName: this.newInvoice.vendorName,
      invoiceDate: new Date(this.invoiceDate),
      dueDate: new Date(this.dueDate),
      items: this.newInvoice.items || [],
      subtotal: this.newInvoice.subtotal || 0,
      tax: this.newInvoice.tax || 0,
      cgst: this.newInvoice.cgst || 0,
      sgst: this.newInvoice.sgst || 0,
      igst: this.newInvoice.igst || 0,
      supplyType: this.newInvoice.supplyType || 'intra_state',
      placeOfSupply: this.newInvoice.placeOfSupply,
      discount: this.newInvoice.discount || 0,
      totalAmount: this.newInvoice.totalAmount || 0,
      paidAmount: this.newInvoice.paidAmount || 0,
      balance: this.newInvoice.balance ?? this.newInvoice.totalAmount ?? 0,
      status,
      paymentTerms: this.newInvoice.paymentTerms || 'Net 30',
      notes: this.newInvoice.notes,
      termsAndConditions: this.newInvoice.termsAndConditions,
      createdBy: this.session.getCurrentUserId() || 'admin',
      createdAt: this.newInvoice.createdAt || now,
      sentAt: status === 'sent' ? now : this.newInvoice.sentAt,
      reminderSent: this.newInvoice.reminderSent ?? false,
      reminderCount: this.newInvoice.reminderCount ?? 0
    };
    return payload;
  }

  /**
   * Persist invoice (create or update) via API
   */
  private persistInvoice(status: Invoice['status'], successMessage: string): void {
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }
    if (!this.isInvoiceValid()) {
      return;
    }

    const payload = this.buildInvoiceFromForm(status);
    const request$ = payload.id
      ? this.invoiceService.updateInvoice(payload as Invoice)
      : this.invoiceService.createInvoice(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.resetNewInvoice();
        this.showCreateModal = false;
        this.loadInvoices();
        window.alert(successMessage);
      },
      error: (error) => {
        console.error('Error saving invoice:', error);
        window.alert('Failed to save invoice. Ensure the backend is running.');
      }
    });
  }

  /**
   * Create and send invoice via API
   */
  createInvoice(): void {
    this.persistInvoice('sent', 'Invoice created successfully!');
  }

  /**
   * Save invoice as draft via API
   */
  saveAsDraft(): void {
    this.persistInvoice('draft', 'Invoice saved as draft!');
  }

  /**
   * Reset new invoice
   */
  resetNewInvoice(): void {
    this.newInvoice = {
      invoiceType: 'maintenance',
      items: [],
      subtotal: 0,
      tax: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      supplyType: 'intra_state',
      placeOfSupply: 'Maharashtra',
      discount: 0,
      totalAmount: 0,
      paidAmount: 0,
      balance: 0,
      status: 'draft',
      paymentTerms: 'Net 30',
      createdBy: this.session.getCurrentUserId() || 'admin',
      reminderSent: false,
      reminderCount: 0
    };
    const today = new Date();
    this.invoiceDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
    this.recipientType = 'resident';
  }

  /**
   * Check if invoice is valid
   */
  isInvoiceValid(): boolean {
    return !!(
      this.newInvoice.invoiceType &&
      this.invoiceDate &&
      this.dueDate &&
      this.newInvoice.items &&
      this.newInvoice.items.length > 0 &&
      this.newInvoice.items.every(item => item.description && item.quantity > 0 && item.unitPrice > 0)
    );
  }

  /**
   * Get invoice type label
   */
  getInvoiceTypeLabel(type: string): string {
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
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      overdue: 'Overdue',
      partially_paid: 'Partially Paid',
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
   * Check if due date is overdue
   */
  isOverdue(dueDate: Date): boolean {
    return new Date(dueDate) < new Date() && new Date(dueDate).getTime() !== new Date().setHours(0,0,0,0);
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

