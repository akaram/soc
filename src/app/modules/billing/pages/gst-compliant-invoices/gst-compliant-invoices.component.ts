import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillDocumentDownloadService } from '../../../../core/services/bill-document-download.service';

/**
 * GST-Compliant Invoices Component
 * Handles GST-compliant invoice generation and management
 */
interface GSTInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  invoiceType: 'tax' | 'bill_of_supply' | 'credit_note' | 'debit_note';
  placeOfSupply: string;
  supplyType: 'intra_state' | 'inter_state';
  customerId: string;
  customerName: string;
  customerGSTIN?: string;
  customerAddress: string;
  customerState: string;
  customerStateCode: string;
  items: GSTInvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  totalAmount: number;
  roundOff: number;
  grandTotal: number;
  reverseCharge: boolean;
  ewayBillNumber?: string;
  ewayBillDate?: Date;
  notes?: string;
  status: 'draft' | 'generated' | 'sent' | 'paid' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

interface GSTInvoiceItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxableAmount: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  totalAmount: number;
}

interface GSTConfiguration {
  id: string;
  businessName: string;
  businessAddress: string;
  businessState: string;
  businessStateCode: string;
  gstin: string;
  pan: string;
  placeOfBusiness: string;
  isActive: boolean;
}

interface TaxRate {
  id: string;
  hsnSac: string;
  description: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  isActive: boolean;
}

@Component({
  selector: 'app-gst-compliant-invoices',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="gst-invoices-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">receipt_long</i>
            GST-Compliant Invoices
          </h1>
          <p>Generate and manage GST-compliant invoices</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showConfiguration = true" title="GST Configuration">
            <i class="material-icons">settings</i>
            Configuration
          </button>
          <button class="icon-btn" (click)="showTaxRates = true" title="Tax Rates">
            <i class="material-icons">percent</i>
            Tax Rates
          </button>
          <button class="icon-btn primary" (click)="showCreateInvoice = true" title="Create Invoice">
            <i class="material-icons">add</i>
            Create Invoice
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ invoices.length }}</div>
            <div class="stat-label">Total Invoices</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalRevenue) }}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalTax) }}</div>
            <div class="stat-label">Total Tax</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ paidInvoicesCount }}</div>
            <div class="stat-label">Paid Invoices</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by invoice number, customer..." 
            [(ngModel)]="searchQuery"
            (input)="filterInvoices()"
          />
        </div>
        <select [(ngModel)]="statusFilter" (change)="filterInvoices()" class="filter-select">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="generated">Generated</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select [(ngModel)]="typeFilter" (change)="filterInvoices()" class="filter-select">
          <option value="all">All Types</option>
          <option value="tax">Tax Invoice</option>
          <option value="bill_of_supply">Bill of Supply</option>
          <option value="credit_note">Credit Note</option>
          <option value="debit_note">Debit Note</option>
        </select>
        <select [(ngModel)]="supplyTypeFilter" (change)="filterInvoices()" class="filter-select">
          <option value="all">All Supply Types</option>
          <option value="intra_state">Intra-State</option>
          <option value="inter_state">Inter-State</option>
        </select>
      </div>

      <!-- Invoices Table -->
      <div class="invoices-table-container">
        <table class="invoices-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Supply Type</th>
              <th>Subtotal</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let invoice of filteredInvoices">
              <td>
                <strong>{{ invoice.invoiceNumber }}</strong>
              </td>
              <td>{{ formatDate(invoice.invoiceDate) }}</td>
              <td>
                <div class="customer-info">
                  <div class="customer-name">{{ invoice.customerName }}</div>
                  <div class="customer-gstin" *ngIf="invoice.customerGSTIN">{{ invoice.customerGSTIN }}</div>
                </div>
              </td>
              <td>
                <span class="type-badge" [ngClass]="invoice.invoiceType">
                  {{ getInvoiceTypeLabel(invoice.invoiceType) }}
                </span>
              </td>
              <td>
                <span class="supply-badge" [ngClass]="invoice.supplyType">
                  {{ invoice.supplyType === 'intra_state' ? 'Intra-State' : 'Inter-State' }}
                </span>
              </td>
              <td>{{ formatCurrency(invoice.subtotal) }}</td>
              <td>{{ formatCurrency(invoice.totalTax) }}</td>
              <td class="total-amount">{{ formatCurrency(invoice.grandTotal) }}</td>
              <td>
                <span class="status-badge" [ngClass]="invoice.status">
                  {{ getStatusLabel(invoice.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewInvoice(invoice)" title="View">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn download" (click)="downloadInvoice(invoice)" title="Download">
                    <i class="material-icons">download</i>
                  </button>
                  <button class="action-btn eway" (click)="generateEwayBill(invoice)" title="E-Way Bill" *ngIf="invoice.grandTotal >= 50000 && !invoice.ewayBillNumber">
                    <i class="material-icons">local_shipping</i>
                  </button>
                  <button class="action-btn edit" (click)="editInvoice(invoice)" title="Edit" *ngIf="invoice.status === 'draft'">
                    <i class="material-icons">edit</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredInvoices.length === 0">
          <i class="material-icons">receipt_long</i>
          <p>No invoices found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
        </div>
      </div>

      <!-- Create/Edit Invoice Modal -->
      <div class="modal-overlay" *ngIf="showCreateInvoice || editingInvoice" (click)="closeInvoiceModal()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingInvoice ? 'Edit GST Invoice' : 'Create GST Invoice' }}</h2>
            <button class="close-btn" (click)="closeInvoiceModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Invoice Type <span class="required">*</span></label>
                  <select [(ngModel)]="newInvoice.invoiceType" (change)="onInvoiceTypeChange()" required>
                    <option value="tax">Tax Invoice</option>
                    <option value="bill_of_supply">Bill of Supply</option>
                    <option value="credit_note">Credit Note</option>
                    <option value="debit_note">Debit Note</option>
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
                  <label>Customer Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newInvoice.customerName" placeholder="Customer name" required />
                </div>
                <div class="form-group">
                  <label>Customer GSTIN</label>
                  <input type="text" [(ngModel)]="newInvoice.customerGSTIN" placeholder="GSTIN (optional)" maxlength="15" />
                </div>
              </div>

              <div class="form-group">
                <label>Customer Address <span class="required">*</span></label>
                <textarea [(ngModel)]="newInvoice.customerAddress" placeholder="Complete address" rows="2" required></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>State <span class="required">*</span></label>
                  <select [(ngModel)]="newInvoice.customerState" (change)="onStateChange()" required>
                    <option value="">Select State</option>
                    <option *ngFor="let state of states" [value]="state.name">
                      {{ state.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>State Code</label>
                  <input type="text" [(ngModel)]="newInvoice.customerStateCode" readonly />
                </div>
                <div class="form-group">
                  <label>Place of Supply <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newInvoice.placeOfSupply" placeholder="Place of supply" required />
                </div>
              </div>

              <div class="form-group">
                <label>Reverse Charge</label>
                <div class="toggle-switch">
                  <input type="checkbox" [(ngModel)]="newInvoice.reverseCharge" id="reverseCharge" />
                  <label for="reverseCharge"></label>
                </div>
              </div>

              <!-- Invoice Items -->
              <div class="items-section">
                <div class="section-header">
                  <h3>Invoice Items</h3>
                  <button class="btn btn-sm" (click)="addInvoiceItem()">
                    <i class="material-icons">add</i>
                    Add Item
                  </button>
                </div>
                <div class="items-list">
                  <div *ngFor="let item of newInvoice.items; let i = index" class="item-row">
                    <input type="text" [(ngModel)]="item.description" placeholder="Item description" class="item-description" />
                    <input type="text" [(ngModel)]="item.hsnSac" placeholder="HSN/SAC" class="item-hsn" />
                    <input type="number" [(ngModel)]="item.quantity" min="0" step="0.01" placeholder="Qty" class="item-qty" />
                    <input type="text" [(ngModel)]="item.unit" placeholder="Unit" class="item-unit" />
                    <input type="number" [(ngModel)]="item.unitPrice" min="0" step="0.01" placeholder="Price" class="item-price" />
                    <select [(ngModel)]="item.taxRate" (change)="calculateItemTax(item)" class="item-tax">
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                    <div class="item-amount">{{ formatCurrency(item.totalAmount) }}</div>
                    <button class="btn-icon" (click)="removeInvoiceItem(i)">
                      <i class="material-icons">delete</i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Invoice Totals -->
              <div class="invoice-totals">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>{{ formatCurrency(calculateSubtotal()) }}</span>
                </div>
                <div class="total-row" *ngIf="newInvoice.supplyType === 'intra_state'">
                  <span>CGST ({{ getCGSTRate() }}%):</span>
                  <span>{{ formatCurrency(calculateCGST()) }}</span>
                </div>
                <div class="total-row" *ngIf="newInvoice.supplyType === 'intra_state'">
                  <span>SGST ({{ getSGSTRate() }}%):</span>
                  <span>{{ formatCurrency(calculateSGST()) }}</span>
                </div>
                <div class="total-row" *ngIf="newInvoice.supplyType === 'inter_state'">
                  <span>IGST ({{ getIGSTRate() }}%):</span>
                  <span>{{ formatCurrency(calculateIGST()) }}</span>
                </div>
                <div class="total-row grand-total">
                  <span>Grand Total:</span>
                  <span>{{ formatCurrency(calculateGrandTotal()) }}</span>
                </div>
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea [(ngModel)]="newInvoice.notes" placeholder="Additional notes" rows="3"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeInvoiceModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveInvoice()" [disabled]="!isInvoiceValid()">
              <i class="material-icons">save</i>
              {{ editingInvoice ? 'Update' : 'Create' }} Invoice
            </button>
          </div>
        </div>
      </div>

      <!-- Invoice Details Modal -->
      <div class="modal-overlay" *ngIf="selectedInvoice" (click)="selectedInvoice = null">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>GST Invoice - {{ selectedInvoice?.invoiceNumber }}</h2>
            <button class="close-btn" (click)="selectedInvoice = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedInvoice">
            <!-- Invoice Header -->
            <div class="invoice-header">
              <div class="business-info">
                <h3>{{ gstConfig?.businessName || 'Business Name' }}</h3>
                <p>{{ gstConfig?.businessAddress || 'Business Address' }}</p>
                <p>GSTIN: {{ gstConfig?.gstin || 'GSTIN' }}</p>
              </div>
              <div class="invoice-info">
                <div class="info-row">
                  <span class="label">Invoice Number:</span>
                  <span class="value">{{ selectedInvoice.invoiceNumber }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Invoice Date:</span>
                  <span class="value">{{ formatDate(selectedInvoice.invoiceDate) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Due Date:</span>
                  <span class="value">{{ formatDate(selectedInvoice.dueDate) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Place of Supply:</span>
                  <span class="value">{{ selectedInvoice.placeOfSupply }}</span>
                </div>
              </div>
            </div>

            <!-- Customer Info -->
            <div class="customer-section">
              <h4>Bill To:</h4>
              <p><strong>{{ selectedInvoice.customerName }}</strong></p>
              <p>{{ selectedInvoice.customerAddress }}</p>
              <p *ngIf="selectedInvoice.customerGSTIN">GSTIN: {{ selectedInvoice.customerGSTIN }}</p>
            </div>

            <!-- Items Table -->
            <div class="invoice-items-table">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th>Tax Rate</th>
                    <th *ngIf="selectedInvoice.supplyType === 'intra_state'">CGST</th>
                    <th *ngIf="selectedInvoice.supplyType === 'intra_state'">SGST</th>
                    <th *ngIf="selectedInvoice.supplyType === 'inter_state'">IGST</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of selectedInvoice.items">
                    <td>{{ item.description }}</td>
                    <td>{{ item.hsnSac }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.unit }}</td>
                    <td>{{ formatCurrency(item.unitPrice) }}</td>
                    <td>{{ formatCurrency(item.taxableAmount) }}</td>
                    <td>{{ item.taxRate }}%</td>
                    <td *ngIf="selectedInvoice.supplyType === 'intra_state'">{{ formatCurrency(item.cgst) }}</td>
                    <td *ngIf="selectedInvoice.supplyType === 'intra_state'">{{ formatCurrency(item.sgst) }}</td>
                    <td *ngIf="selectedInvoice.supplyType === 'inter_state'">{{ formatCurrency(item.igst) }}</td>
                    <td>{{ formatCurrency(item.totalAmount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Invoice Totals -->
            <div class="invoice-totals-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>{{ formatCurrency(selectedInvoice.subtotal) }}</span>
              </div>
              <div class="total-row" *ngIf="selectedInvoice.supplyType === 'intra_state'">
                <span>CGST:</span>
                <span>{{ formatCurrency(selectedInvoice.cgst) }}</span>
              </div>
              <div class="total-row" *ngIf="selectedInvoice.supplyType === 'intra_state'">
                <span>SGST:</span>
                <span>{{ formatCurrency(selectedInvoice.sgst) }}</span>
              </div>
              <div class="total-row" *ngIf="selectedInvoice.supplyType === 'inter_state'">
                <span>IGST:</span>
                <span>{{ formatCurrency(selectedInvoice.igst) }}</span>
              </div>
              <div class="total-row grand-total">
                <span>Grand Total:</span>
                <span>{{ formatCurrency(selectedInvoice.grandTotal) }}</span>
              </div>
            </div>

            <!-- E-Way Bill -->
            <div class="eway-bill-section" *ngIf="selectedInvoice.ewayBillNumber">
              <h4>E-Way Bill</h4>
              <p>E-Way Bill Number: <strong>{{ selectedInvoice.ewayBillNumber }}</strong></p>
              <p *ngIf="selectedInvoice.ewayBillDate">Date: {{ formatDate(selectedInvoice.ewayBillDate) }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedInvoice = null">Close</button>
            <button class="btn btn-primary" (click)="downloadInvoice(selectedInvoice!)">
              <i class="material-icons">download</i>
              Download PDF
            </button>
            <button class="btn btn-success" (click)="generateEwayBill(selectedInvoice!)" *ngIf="selectedInvoice && selectedInvoice.grandTotal >= 50000 && !selectedInvoice.ewayBillNumber">
              <i class="material-icons">local_shipping</i>
              Generate E-Way Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gst-invoices-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
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
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
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
    }

    .invoices-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .customer-info {
      display: flex;
      flex-direction: column;
    }

    .customer-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .customer-gstin {
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

    .type-badge.tax { background: #e8f8f0; color: #1e9e5a; }
    .type-badge.bill_of_supply { background: #e7f3ff; color: #2980b9; }
    .type-badge.credit_note { background: #fff4e6; color: #e67e22; }
    .type-badge.debit_note { background: #ffeaea; color: #c0392b; }

    .supply-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .supply-badge.intra_state { background: #e8f8f0; color: #1e9e5a; }
    .supply-badge.inter_state { background: #e7f3ff; color: #2980b9; }

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

    .status-badge.draft { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.generated { background: #e7f3ff; color: #2980b9; }
    .status-badge.sent { background: #fff4e6; color: #e67e22; }
    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.cancelled { background: #ffeaea; color: #c0392b; }

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
    .action-btn.download { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.eway { background: #fff4e6; color: #e67e22; }
    .action-btn.edit { background: #f4e7ff; color: #8e44ad; }

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
      border-color: #27ae60;
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
      background: #27ae60;
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

    .items-section {
      margin-top: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .item-row {
      display: grid;
      grid-template-columns: 2fr 120px 80px 80px 120px 100px 100px 40px;
      gap: 8px;
      align-items: center;
    }

    .item-row input,
    .item-row select {
      padding: 8px;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      font-size: 13px;
    }

    .item-amount {
      font-weight: 600;
      color: #2c3e50;
      text-align: right;
    }

    .btn-icon {
      background: none;
      border: none;
      color: #e74c3c;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .invoice-totals {
      margin-top: 24px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .total-row.grand-total {
      font-weight: 700;
      font-size: 18px;
      color: #2c3e50;
      border-top: 2px solid #e9ecef;
      padding-top: 12px;
      margin-top: 8px;
    }

    /* Invoice Details */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e9ecef;
    }

    .business-info h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .invoice-info {
      text-align: right;
    }

    .info-row {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .info-row .label {
      font-weight: 500;
      color: #7f8c8d;
    }

    .info-row .value {
      color: #2c3e50;
    }

    .customer-section {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .customer-section h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .invoice-items-table {
      margin-bottom: 24px;
      overflow-x: auto;
    }

    .invoice-items-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .invoice-items-table th {
      padding: 12px;
      background: #f8f9fa;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #7f8c8d;
      border: 1px solid #e9ecef;
    }

    .invoice-items-table td {
      padding: 12px;
      border: 1px solid #e9ecef;
      font-size: 13px;
      color: #2c3e50;
    }

    .invoice-totals-section {
      margin-top: 24px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .eway-bill-section {
      margin-top: 24px;
      padding: 16px;
      background: #e7f3ff;
      border-radius: 8px;
    }

    .eway-bill-section h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
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
      background: #27ae60;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #229954;
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

      .invoices-table-container {
        padding: 0 16px 16px;
        overflow-x: auto;
      }

      .invoices-table {
        min-width: 1200px;
      }

      .item-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GSTCompliantInvoicesComponent implements OnInit, OnDestroy {
  invoices: GSTInvoice[] = [];
  filteredInvoices: GSTInvoice[] = [];
  selectedInvoice: GSTInvoice | null = null;
  editingInvoice: GSTInvoice | null = null;
  searchQuery: string = '';
  statusFilter: string = 'all';
  typeFilter: string = 'all';
  supplyTypeFilter: string = 'all';
  showCreateInvoice: boolean = false;
  showConfiguration: boolean = false;
  showTaxRates: boolean = false;
  invoiceDate: string = '';
  dueDate: string = '';

  gstConfig: GSTConfiguration | null = null;
  taxRates: TaxRate[] = [];

  newInvoice: Partial<GSTInvoice> = {
    invoiceType: 'tax',
    supplyType: 'intra_state',
    items: [],
    reverseCharge: false,
    status: 'draft'
  };

  states = [
    { name: 'Andhra Pradesh', code: '37' },
    { name: 'Arunachal Pradesh', code: '12' },
    { name: 'Assam', code: '18' },
    { name: 'Bihar', code: '10' },
    { name: 'Chhattisgarh', code: '22' },
    { name: 'Goa', code: '30' },
    { name: 'Gujarat', code: '24' },
    { name: 'Haryana', code: '06' },
    { name: 'Himachal Pradesh', code: '02' },
    { name: 'Jharkhand', code: '20' },
    { name: 'Karnataka', code: '29' },
    { name: 'Kerala', code: '32' },
    { name: 'Madhya Pradesh', code: '23' },
    { name: 'Maharashtra', code: '27' },
    { name: 'Manipur', code: '14' },
    { name: 'Meghalaya', code: '17' },
    { name: 'Mizoram', code: '15' },
    { name: 'Nagaland', code: '13' },
    { name: 'Odisha', code: '21' },
    { name: 'Punjab', code: '03' },
    { name: 'Rajasthan', code: '08' },
    { name: 'Sikkim', code: '11' },
    { name: 'Tamil Nadu', code: '33' },
    { name: 'Telangana', code: '36' },
    { name: 'Tripura', code: '16' },
    { name: 'Uttar Pradesh', code: '09' },
    { name: 'Uttarakhand', code: '05' },
    { name: 'West Bengal', code: '19' },
    { name: 'Delhi', code: '07' },
    { name: 'Jammu and Kashmir', code: '01' },
    { name: 'Ladakh', code: '38' },
    { name: 'Puducherry', code: '34' }
  ];

  private destroy$ = new Subject<void>();
  private billDownload = inject(BillDocumentDownloadService);

  constructor() {
    const today = new Date();
    this.invoiceDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadGSTConfig();
    this.loadTaxRates();
    this.loadInvoices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load GST configuration
   */
  loadGSTConfig(): void {
    this.gstConfig = {
      id: 'config-1',
      businessName: 'ABC Society Management',
      businessAddress: '123 Main Street, City, State - 123456',
      businessState: 'Maharashtra',
      businessStateCode: '27',
      gstin: '27ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      placeOfBusiness: 'Mumbai',
      isActive: true
    };
  }

  /**
   * Load tax rates
   */
  loadTaxRates(): void {
    this.taxRates = [
      { id: 'rate-1', hsnSac: '998314', description: 'Property Management Services', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0, isActive: true },
      { id: 'rate-2', hsnSac: '998315', description: 'Maintenance Services', cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0, isActive: true }
    ];
  }

  /**
   * Load invoices
   */
  loadInvoices(): void {
    this.invoices = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV/GST/2024/001',
        invoiceDate: new Date(2024, 1, 1),
        dueDate: new Date(2024, 1, 31),
        invoiceType: 'tax',
        placeOfSupply: 'Mumbai',
        supplyType: 'intra_state',
        customerId: 'cust-1',
        customerName: 'Rajesh Kumar',
        customerGSTIN: '27ABCDE1234F1Z5',
        customerAddress: 'A-101, Building Name, Mumbai',
        customerState: 'Maharashtra',
        customerStateCode: '27',
        items: [
          {
            id: 'item-1',
            description: 'Monthly Maintenance',
            hsnSac: '998315',
            quantity: 1,
            unit: 'Month',
            unitPrice: 5000,
            taxableAmount: 5000,
            taxRate: 18,
            cgst: 450,
            sgst: 450,
            igst: 0,
            cess: 0,
            totalTax: 900,
            totalAmount: 5900
          }
        ],
        subtotal: 5000,
        cgst: 450,
        sgst: 450,
        igst: 0,
        cess: 0,
        totalTax: 900,
        totalAmount: 5900,
        roundOff: 0,
        grandTotal: 5900,
        reverseCharge: false,
        status: 'generated',
        createdAt: new Date(2024, 1, 1),
        updatedAt: new Date(2024, 1, 1)
      }
    ];
    this.filterInvoices();
  }

  /**
   * Filter invoices
   */
  filterInvoices(): void {
    let filtered = [...this.invoices];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === this.statusFilter);
    }

    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(i => i.invoiceType === this.typeFilter);
    }

    if (this.supplyTypeFilter !== 'all') {
      filtered = filtered.filter(i => i.supplyType === this.supplyTypeFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.invoiceNumber.toLowerCase().includes(query) ||
        i.customerName.toLowerCase().includes(query) ||
        (i.customerGSTIN && i.customerGSTIN.toLowerCase().includes(query))
      );
    }

    this.filteredInvoices = filtered;
  }

  /**
   * Get total revenue
   */
  get totalRevenue(): number {
    return this.invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.grandTotal, 0);
  }

  /**
   * Get total tax
   */
  get totalTax(): number {
    return this.invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.totalTax, 0);
  }

  /**
   * Get paid invoices count
   */
  get paidInvoicesCount(): number {
    return this.invoices.filter(i => i.status === 'paid').length;
  }

  /**
   * View invoice
   */
  viewInvoice(invoice: GSTInvoice): void {
    this.selectedInvoice = invoice;
  }

  /**
   * Edit invoice
   */
  editInvoice(invoice: GSTInvoice): void {
    this.editingInvoice = invoice;
    this.newInvoice = { ...invoice };
    this.invoiceDate = new Date(invoice.invoiceDate).toISOString().split('T')[0];
    this.dueDate = new Date(invoice.dueDate).toISOString().split('T')[0];
    this.showCreateInvoice = true;
  }

  /**
   * Download invoice
   */
  downloadInvoice(invoice: GSTInvoice): void {
    this.billDownload.downloadBillPdf({
      documentTitle: 'GST Tax Invoice',
      documentNumber: invoice.invoiceNumber,
      recipientName: invoice.customerName,
      recipientAddress: invoice.customerAddress,
      issueDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      lineItems: (invoice.items ?? []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.unitPrice,
        amount: item.totalAmount,
        meta: item.hsnSac ? `HSN/SAC: ${item.hsnSac}` : undefined
      })),
      summaryRows: [
        { label: 'Customer GSTIN', value: invoice.customerGSTIN ?? '—' },
        { label: 'Place of supply', value: invoice.placeOfSupply },
        { label: 'Subtotal', value: this.formatCurrency(invoice.subtotal) },
        { label: 'CGST', value: this.formatCurrency(invoice.cgst) },
        { label: 'SGST', value: this.formatCurrency(invoice.sgst) },
        { label: 'IGST', value: this.formatCurrency(invoice.igst) },
        { label: 'Cess', value: this.formatCurrency(invoice.cess) },
        { label: 'Round off', value: this.formatCurrency(invoice.roundOff) }
      ],
      totalAmount: invoice.grandTotal,
      notes: invoice.notes
    });
  }

  /**
   * Generate E-Way Bill
   */
  generateEwayBill(invoice: GSTInvoice): void {
    if (invoice.grandTotal < 50000) {
      alert('E-Way Bill is required only for invoices with value >= ₹50,000');
      return;
    }

    invoice.ewayBillNumber = `EWB-${new Date().getFullYear()}-${String(this.invoices.length + 1).padStart(6, '0')}`;
    invoice.ewayBillDate = new Date();
    alert('E-Way Bill generated successfully!');
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
      hsnSac: '',
      quantity: 1,
      unit: 'Unit',
      unitPrice: 0,
      taxableAmount: 0,
      taxRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      totalTax: 0,
      totalAmount: 0
    });
  }

  /**
   * Remove invoice item
   */
  removeInvoiceItem(index: number): void {
    if (this.newInvoice.items) {
      this.newInvoice.items.splice(index, 1);
      this.calculateInvoiceTotals();
    }
  }

  /**
   * Calculate item tax
   */
  calculateItemTax(item: GSTInvoiceItem): void {
    item.taxableAmount = item.quantity * item.unitPrice;
    const taxAmount = (item.taxableAmount * item.taxRate) / 100;

    if (this.newInvoice.supplyType === 'intra_state') {
      item.cgst = taxAmount / 2;
      item.sgst = taxAmount / 2;
      item.igst = 0;
    } else {
      item.cgst = 0;
      item.sgst = 0;
      item.igst = taxAmount;
    }

    item.totalTax = taxAmount;
    item.totalAmount = item.taxableAmount + item.totalTax;
    this.calculateInvoiceTotals();
  }

  /**
   * Calculate invoice totals
   */
  calculateInvoiceTotals(): void {
    if (!this.newInvoice.items || this.newInvoice.items.length === 0) {
      this.newInvoice.subtotal = 0;
      this.newInvoice.cgst = 0;
      this.newInvoice.sgst = 0;
      this.newInvoice.igst = 0;
      this.newInvoice.totalTax = 0;
      this.newInvoice.grandTotal = 0;
      return;
    }

    this.newInvoice.subtotal = this.newInvoice.items.reduce((sum, item) => sum + item.taxableAmount, 0);
    this.newInvoice.cgst = this.newInvoice.items.reduce((sum, item) => sum + item.cgst, 0);
    this.newInvoice.sgst = this.newInvoice.items.reduce((sum, item) => sum + item.sgst, 0);
    this.newInvoice.igst = this.newInvoice.items.reduce((sum, item) => sum + item.igst, 0);
    this.newInvoice.totalTax = this.newInvoice.items.reduce((sum, item) => sum + item.totalTax, 0);
    this.newInvoice.grandTotal = this.newInvoice.subtotal + this.newInvoice.totalTax;
  }

  /**
   * Calculate subtotal
   */
  calculateSubtotal(): number {
    return this.newInvoice.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
  }

  /**
   * Calculate CGST
   */
  calculateCGST(): number {
    if (this.newInvoice.supplyType !== 'intra_state') return 0;
    return this.newInvoice.items?.reduce((sum, item) => {
      const taxAmount = (item.quantity * item.unitPrice * item.taxRate) / 100;
      return sum + (taxAmount / 2);
    }, 0) || 0;
  }

  /**
   * Calculate SGST
   */
  calculateSGST(): number {
    if (this.newInvoice.supplyType !== 'intra_state') return 0;
    return this.newInvoice.items?.reduce((sum, item) => {
      const taxAmount = (item.quantity * item.unitPrice * item.taxRate) / 100;
      return sum + (taxAmount / 2);
    }, 0) || 0;
  }

  /**
   * Calculate IGST
   */
  calculateIGST(): number {
    if (this.newInvoice.supplyType !== 'inter_state') return 0;
    return this.newInvoice.items?.reduce((sum, item) => {
      return sum + ((item.quantity * item.unitPrice * item.taxRate) / 100);
    }, 0) || 0;
  }

  /**
   * Calculate grand total
   */
  calculateGrandTotal(): number {
    return this.calculateSubtotal() + this.calculateCGST() + this.calculateSGST() + this.calculateIGST();
  }

  /**
   * Get CGST rate
   */
  getCGSTRate(): number {
    const avgRate = this.newInvoice.items?.reduce((sum, item) => sum + item.taxRate, 0) || 0;
    return this.newInvoice.items?.length ? (avgRate / this.newInvoice.items.length) / 2 : 0;
  }

  /**
   * Get SGST rate
   */
  getSGSTRate(): number {
    return this.getCGSTRate();
  }

  /**
   * Get IGST rate
   */
  getIGSTRate(): number {
    const avgRate = this.newInvoice.items?.reduce((sum, item) => sum + item.taxRate, 0) || 0;
    return this.newInvoice.items?.length ? (avgRate / this.newInvoice.items.length) : 0;
  }

  /**
   * On invoice type change
   */
  onInvoiceTypeChange(): void {
    // Update supply type based on customer state
    if (this.newInvoice.customerStateCode && this.gstConfig) {
      if (this.newInvoice.customerStateCode === this.gstConfig.businessStateCode) {
        this.newInvoice.supplyType = 'intra_state';
      } else {
        this.newInvoice.supplyType = 'inter_state';
      }
    }
  }

  /**
   * On state change
   */
  onStateChange(): void {
    const state = this.states.find(s => s.name === this.newInvoice.customerState);
    if (state) {
      this.newInvoice.customerStateCode = state.code;
      
      // Determine supply type
      if (this.gstConfig && state.code === this.gstConfig.businessStateCode) {
        this.newInvoice.supplyType = 'intra_state';
      } else {
        this.newInvoice.supplyType = 'inter_state';
      }
      
      // Recalculate taxes
      if (this.newInvoice.items) {
        this.newInvoice.items.forEach(item => this.calculateItemTax(item));
      }
    }
  }

  /**
   * Save invoice
   */
  saveInvoice(): void {
    if (!this.isInvoiceValid()) {
      return;
    }

    this.calculateInvoiceTotals();

    const invoice: GSTInvoice = {
      id: this.editingInvoice?.id || `inv-${Date.now()}`,
      invoiceNumber: this.editingInvoice?.invoiceNumber || `INV/GST/${new Date().getFullYear()}/${String(this.invoices.length + 1).padStart(3, '0')}`,
      invoiceDate: new Date(this.invoiceDate),
      dueDate: new Date(this.dueDate),
      invoiceType: this.newInvoice.invoiceType!,
      placeOfSupply: this.newInvoice.placeOfSupply!,
      supplyType: this.newInvoice.supplyType!,
      customerId: this.newInvoice.customerId || `cust-${Date.now()}`,
      customerName: this.newInvoice.customerName!,
      customerGSTIN: this.newInvoice.customerGSTIN,
      customerAddress: this.newInvoice.customerAddress!,
      customerState: this.newInvoice.customerState!,
      customerStateCode: this.newInvoice.customerStateCode!,
      items: this.newInvoice.items || [],
      subtotal: this.newInvoice.subtotal || 0,
      cgst: this.newInvoice.cgst || 0,
      sgst: this.newInvoice.sgst || 0,
      igst: this.newInvoice.igst || 0,
      cess: this.newInvoice.cess || 0,
      totalTax: this.newInvoice.totalTax || 0,
      totalAmount: this.newInvoice.totalAmount || 0,
      roundOff: this.newInvoice.roundOff || 0,
      grandTotal: this.newInvoice.grandTotal || 0,
      reverseCharge: this.newInvoice.reverseCharge || false,
      notes: this.newInvoice.notes,
      status: this.newInvoice.status || 'draft',
      createdAt: this.editingInvoice?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (this.editingInvoice) {
      const index = this.invoices.findIndex(i => i.id === this.editingInvoice!.id);
      if (index > -1) {
        this.invoices[index] = invoice;
      }
      alert('Invoice updated successfully!');
    } else {
      this.invoices.unshift(invoice);
      alert('GST Invoice created successfully!');
    }

    this.filterInvoices();
    this.closeInvoiceModal();
  }

  /**
   * Close invoice modal
   */
  closeInvoiceModal(): void {
    this.showCreateInvoice = false;
    this.editingInvoice = null;
    this.resetNewInvoice();
  }

  /**
   * Reset new invoice
   */
  resetNewInvoice(): void {
    this.newInvoice = {
      invoiceType: 'tax',
      supplyType: 'intra_state',
      items: [],
      reverseCharge: false,
      status: 'draft'
    };
    const today = new Date();
    this.invoiceDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate.toISOString().split('T')[0];
  }

  /**
   * Is invoice valid
   */
  isInvoiceValid(): boolean {
    return !!(
      this.newInvoice.customerName &&
      this.newInvoice.customerAddress &&
      this.newInvoice.customerState &&
      this.newInvoice.placeOfSupply &&
      this.invoiceDate &&
      this.dueDate &&
      this.newInvoice.items &&
      this.newInvoice.items.length > 0 &&
      this.newInvoice.items.every(item => item.description && item.hsnSac && item.quantity > 0 && item.unitPrice > 0)
    );
  }

  /**
   * Get invoice type label
   */
  getInvoiceTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      tax: 'Tax Invoice',
      bill_of_supply: 'Bill of Supply',
      credit_note: 'Credit Note',
      debit_note: 'Debit Note'
    };
    return labels[type] || type;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Draft',
      generated: 'Generated',
      sent: 'Sent',
      paid: 'Paid',
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

