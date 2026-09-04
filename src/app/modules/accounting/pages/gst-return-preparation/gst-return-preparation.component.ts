import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { GstReturnPreparationService } from '../../services/gst-return-preparation.service';
import {
  GstConfiguration,
  Gstr1Data,
  Gstr3bData,
  GstSummary
} from '../../models/gst-return-preparation.model';

/**
 * GST Return Preparation Component
 * Handles GST return preparation including GSTR-1, GSTR-3B, and related reports
 */

@Component({
  selector: 'app-gst-return-preparation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="gst-return-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">assessment</i>
            GST Return Preparation
          </h1>
          <p>Prepare and file GST returns (GSTR-1, GSTR-3B) with ease</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/gst-returns</strong> API (invoices + GST config).</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showConfiguration = true" title="GST Configuration">
            <i class="material-icons">settings</i>
            Configuration
          </button>
          <button class="icon-btn primary" (click)="prepareReturn()" title="Prepare Return">
            <i class="material-icons">description</i>
            Prepare Return
          </button>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="loading-banner" *ngIf="loading">
        <i class="material-icons spin">sync</i>
        <span>Loading GST return data…</span>
      </div>

      <!-- Period Selection -->
      <div class="period-section">
        <div class="period-selector">
          <label>Select Period:</label>
          <select [(ngModel)]="selectedPeriod" (change)="loadGSTData()">
            <option *ngFor="let period of availablePeriods" [value]="period">{{ period }}</option>
          </select>
          <select [(ngModel)]="selectedYear" (change)="loadGSTData()">
            <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
          </select>
        </div>
        <div class="period-actions">
          <button class="btn btn-secondary" (click)="exportData('json')">
            <i class="material-icons">download</i>
            Export JSON
          </button>
          <button class="btn btn-secondary" (click)="exportData('excel')">
            <i class="material-icons">file_download</i>
            Export Excel
          </button>
          <button class="btn btn-primary" (click)="validateReturn()">
            <i class="material-icons">check_circle</i>
            Validate Return
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card invoices">
          <div class="card-icon">
            <i class="material-icons">receipt_long</i>
          </div>
          <div class="card-content">
            <div class="card-value">{{ gstSummary.totalInvoices }}</div>
            <div class="card-label">Total Invoices</div>
            <div class="card-detail">
              <span class="paid">{{ gstSummary.paidInvoices }} Paid</span>
              <span class="pending">{{ gstSummary.pendingInvoices }} Pending</span>
            </div>
          </div>
        </div>
        <div class="summary-card taxable">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatCurrency(gstSummary.totalTaxableValue) }}</div>
            <div class="card-label">Taxable Value</div>
          </div>
        </div>
        <div class="summary-card cgst">
          <div class="card-icon">
            <i class="material-icons">calculate</i>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatCurrency(gstSummary.totalCgst) }}</div>
            <div class="card-label">CGST</div>
          </div>
        </div>
        <div class="summary-card sgst">
          <div class="card-icon">
            <i class="material-icons">calculate</i>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatCurrency(gstSummary.totalSgst) }}</div>
            <div class="card-label">SGST</div>
          </div>
        </div>
        <div class="summary-card igst">
          <div class="card-icon">
            <i class="material-icons">calculate</i>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatCurrency(gstSummary.totalIgst) }}</div>
            <div class="card-label">IGST</div>
          </div>
        </div>
        <div class="summary-card total-tax">
          <div class="card-icon">
            <i class="material-icons">payments</i>
          </div>
          <div class="card-content">
            <div class="card-value">{{ formatCurrency(gstSummary.totalTax) }}</div>
            <div class="card-label">Total Tax</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'gstr1'"
            (click)="activeTab = 'gstr1'"
          >
            <i class="material-icons">description</i>
            GSTR-1
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'gstr3b'"
            (click)="activeTab = 'gstr3b'"
          >
            <i class="material-icons">assessment</i>
            GSTR-3B
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'reconciliation'"
            (click)="activeTab = 'reconciliation'"
          >
            <i class="material-icons">compare_arrows</i>
            Reconciliation
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'reports'"
            (click)="activeTab = 'reports'"
          >
            <i class="material-icons">bar_chart</i>
            Reports
          </button>
        </div>
      </div>

      <!-- GSTR-1 Tab Content -->
      <div class="tab-content" *ngIf="activeTab === 'gstr1'">
        <div class="section-header">
          <h2>GSTR-1: Outward Supplies</h2>
          <button class="btn btn-primary" (click)="exportGSTR1()">
            <i class="material-icons">file_download</i>
            Export GSTR-1
          </button>
        </div>

        <!-- B2B Section -->
        <div class="data-section">
          <h3>B2B Supplies (Registered Customers)</h3>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>GSTIN</th>
                  <th>Customer Name</th>
                  <th>Invoice #</th>
                  <th>Invoice Date</th>
                  <th>Taxable Value</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>Place of Supply</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of gstr1Data.b2b">
                  <td>{{ item.gstin || 'N/A' }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.invoiceNumber }}</td>
                  <td>{{ formatDate(item.invoiceDate) }}</td>
                  <td class="amount">{{ formatCurrency(item.taxableValue) }}</td>
                  <td class="amount">{{ formatCurrency(item.cgst) }}</td>
                  <td class="amount">{{ formatCurrency(item.sgst) }}</td>
                  <td class="amount">{{ formatCurrency(item.igst) }}</td>
                  <td>{{ item.placeOfSupply }}</td>
                </tr>
                <tr *ngIf="gstr1Data.b2b.length === 0" class="empty-row">
                  <td colspan="9">No B2B supplies found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- B2CL Section -->
        <div class="data-section">
          <h3>B2CL Supplies (Unregistered Customers - Inter-State)</h3>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Invoice Date</th>
                  <th>Taxable Value</th>
                  <th>IGST</th>
                  <th>Place of Supply</th>
                  <th>State Code</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of gstr1Data.b2cl">
                  <td>{{ item.invoiceNumber }}</td>
                  <td>{{ formatDate(item.invoiceDate) }}</td>
                  <td class="amount">{{ formatCurrency(item.taxableValue) }}</td>
                  <td class="amount">{{ formatCurrency(item.igst) }}</td>
                  <td>{{ item.placeOfSupply }}</td>
                  <td>{{ item.stateCode }}</td>
                </tr>
                <tr *ngIf="gstr1Data.b2cl.length === 0" class="empty-row">
                  <td colspan="6">No B2CL supplies found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- HSN Summary -->
        <div class="data-section">
          <h3>HSN Summary</h3>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>HSN/SAC</th>
                  <th>Description</th>
                  <th>UOM</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Taxable Value</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of gstr1Data.hsn">
                  <td>{{ item.hsnSac || 'N/A' }}</td>
                  <td>{{ item.description }}</td>
                  <td>{{ item.uom }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ item.rate }}</td>
                  <td class="amount">{{ formatCurrency(item.taxableValue) }}</td>
                  <td class="amount">{{ formatCurrency(item.cgst) }}</td>
                  <td class="amount">{{ formatCurrency(item.sgst) }}</td>
                  <td class="amount">{{ formatCurrency(item.igst) }}</td>
                </tr>
                <tr *ngIf="gstr1Data.hsn.length === 0" class="empty-row">
                  <td colspan="9">No HSN data found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- GSTR-1 Summary -->
        <div class="summary-section">
          <h3>GSTR-1 Summary</h3>
          <div class="summary-grid-small">
            <div class="summary-item">
              <span class="label">Total Invoices:</span>
              <span class="value">{{ gstr1Data.summary.totalInvoices }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total Taxable Value:</span>
              <span class="value">{{ formatCurrency(gstr1Data.summary.totalTaxableValue) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total CGST:</span>
              <span class="value">{{ formatCurrency(gstr1Data.summary.totalCgst) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total SGST:</span>
              <span class="value">{{ formatCurrency(gstr1Data.summary.totalSgst) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total IGST:</span>
              <span class="value">{{ formatCurrency(gstr1Data.summary.totalIgst) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Total Tax:</span>
              <span class="value">{{ formatCurrency(gstr1Data.summary.totalTax) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- GSTR-3B Tab Content -->
      <div class="tab-content" *ngIf="activeTab === 'gstr3b'">
        <div class="section-header">
          <h2>GSTR-3B: Summary Return</h2>
          <button class="btn btn-primary" (click)="exportGSTR3B()">
            <i class="material-icons">file_download</i>
            Export GSTR-3B
          </button>
        </div>

        <div class="gstr3b-container">
          <!-- Outward Supplies -->
          <div class="gstr3b-section">
            <h3>3.1 Outward Taxable Supplies</h3>
            <div class="gstr3b-table">
              <div class="gstr3b-row">
                <span class="label">Taxable Value:</span>
                <span class="value">{{ formatCurrency(gstr3bData.outwardSupplies.taxableValue) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">CGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.outwardSupplies.cgst) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">SGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.outwardSupplies.sgst) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">IGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.outwardSupplies.igst) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">CESS:</span>
                <span class="value">{{ formatCurrency(gstr3bData.outwardSupplies.cess) }}</span>
              </div>
            </div>
          </div>

          <!-- Inward Supplies -->
          <div class="gstr3b-section">
            <h3>3.2 Inward Supplies (Reverse Charge)</h3>
            <div class="gstr3b-table">
              <div class="gstr3b-row">
                <span class="label">Taxable Value:</span>
                <span class="value">{{ formatCurrency(gstr3bData.inwardSupplies.taxableValue) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">CGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.inwardSupplies.cgst) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">SGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.inwardSupplies.sgst) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">IGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.inwardSupplies.igst) }}</span>
              </div>
            </div>
          </div>

          <!-- ITC -->
          <div class="gstr3b-section">
            <h3>4. Eligible ITC</h3>
            <div class="gstr3b-table">
              <div class="gstr3b-row">
                <span class="label">Eligible ITC:</span>
                <span class="value">{{ formatCurrency(gstr3bData.itc.eligible) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">Ineligible ITC:</span>
                <span class="value">{{ formatCurrency(gstr3bData.itc.ineligible) }}</span>
              </div>
              <div class="gstr3b-row total">
                <span class="label">Total ITC:</span>
                <span class="value">{{ formatCurrency(gstr3bData.itc.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Tax Liability -->
          <div class="gstr3b-section highlight">
            <h3>5. Tax Liability</h3>
            <div class="gstr3b-table">
              <div class="gstr3b-row">
                <span class="label">CGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.liability.cgst) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">SGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.liability.sgst) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">IGST:</span>
                <span class="value">{{ formatCurrency(gstr3bData.liability.igst) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">CESS:</span>
                <span class="value">{{ formatCurrency(gstr3bData.liability.cess) }}</span>
              </div>
              <div class="gstr3b-row total">
                <span class="label">Total Tax Liability:</span>
                <span class="value">{{ formatCurrency(gstr3bData.liability.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Payment -->
          <div class="gstr3b-section">
            <h3>6. Payment of Tax</h3>
            <div class="gstr3b-table">
              <div class="gstr3b-row">
                <span class="label">Cash Payment:</span>
                <span class="value">{{ formatCurrency(gstr3bData.payment.cash) }}</span>
              </div>
              <div class="gstr3b-row">
                <span class="label">ITC Utilized:</span>
                <span class="value">{{ formatCurrency(gstr3bData.payment.itc) }}</span>
              </div>
              <div class="gstr3b-row total">
                <span class="label">Total Payment:</span>
                <span class="value">{{ formatCurrency(gstr3bData.payment.total) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reconciliation Tab -->
      <div class="tab-content" *ngIf="activeTab === 'reconciliation'">
        <div class="section-header">
          <h2>GST Reconciliation</h2>
          <button class="btn btn-primary" (click)="reconcileData()">
            <i class="material-icons">sync</i>
            Reconcile
          </button>
        </div>
        <div class="reconciliation-info">
          <p>Reconciliation helps identify discrepancies between GSTR-1 and GSTR-3B data.</p>
          <div class="reconciliation-status">
            <div class="status-item success">
              <i class="material-icons">check_circle</i>
              <span>Matched Records: {{ reconciliationStats.matched }}</span>
            </div>
            <div class="status-item warning">
              <i class="material-icons">warning</i>
              <span>Mismatched Records: {{ reconciliationStats.mismatched }}</span>
            </div>
            <div class="status-item info">
              <i class="material-icons">info</i>
              <span>Pending Reconciliation: {{ reconciliationStats.pending }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports Tab -->
      <div class="tab-content" *ngIf="activeTab === 'reports'">
        <div class="section-header">
          <h2>GST Reports</h2>
        </div>
        <div class="reports-grid">
          <div class="report-card" (click)="generateReport('monthly')">
            <i class="material-icons">calendar_today</i>
            <h3>Monthly GST Report</h3>
            <p>Monthly GST summary and analysis</p>
          </div>
          <div class="report-card" (click)="generateReport('quarterly')">
            <i class="material-icons">assessment</i>
            <h3>Quarterly GST Report</h3>
            <p>Quarter-wise GST summary</p>
          </div>
          <div class="report-card" (click)="generateReport('annual')">
            <i class="material-icons">bar_chart</i>
            <h3>Annual GST Report</h3>
            <p>Yearly GST summary and trends</p>
          </div>
          <div class="report-card" (click)="generateReport('hsn')">
            <i class="material-icons">category</i>
            <h3>HSN-wise Report</h3>
            <p>GST breakdown by HSN/SAC codes</p>
          </div>
          <div class="report-card" (click)="generateReport('state')">
            <i class="material-icons">map</i>
            <h3>State-wise Report</h3>
            <p>GST breakdown by state</p>
          </div>
          <div class="report-card" (click)="generateReport('customer')">
            <i class="material-icons">people</i>
            <h3>Customer-wise Report</h3>
            <p>GST summary by customer</p>
          </div>
        </div>
      </div>

      <!-- GST Configuration Modal -->
      <div class="modal-overlay" *ngIf="showConfiguration" (click)="showConfiguration = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>GST Configuration</h2>
            <button class="close-btn" (click)="showConfiguration = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>GSTIN <span class="required">*</span></label>
              <input type="text" [(ngModel)]="gstConfig.gstin" placeholder="27ABCDE1234F1Z5" maxlength="15" />
            </div>
            <div class="form-group">
              <label>Business Name <span class="required">*</span></label>
              <input type="text" [(ngModel)]="gstConfig.businessName" placeholder="Business Name" />
            </div>
            <div class="form-group">
              <label>Business Address <span class="required">*</span></label>
              <textarea [(ngModel)]="gstConfig.businessAddress" placeholder="Complete address" rows="3"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>State <span class="required">*</span></label>
                <input type="text" [(ngModel)]="gstConfig.businessState" placeholder="State" />
              </div>
              <div class="form-group">
                <label>State Code <span class="required">*</span></label>
                <input type="text" [(ngModel)]="gstConfig.businessStateCode" placeholder="27" maxlength="2" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>PAN <span class="required">*</span></label>
                <input type="text" [(ngModel)]="gstConfig.pan" placeholder="ABCDE1234F" maxlength="10" />
              </div>
              <div class="form-group">
                <label>Place of Business</label>
                <input type="text" [(ngModel)]="gstConfig.placeOfBusiness" placeholder="Place of business" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showConfiguration = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveConfiguration()">Save Configuration</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gst-return-container {
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

    .load-error,
    .loading-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 24px 0;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
    }

    .load-error {
      background: #fdecea;
      color: #c0392b;
    }

    .loading-banner {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    /* Period Section */
    .period-section {
      padding: 24px;
      background: white;
      margin: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .period-selector {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .period-selector label {
      font-weight: 500;
      color: #2c3e50;
    }

    .period-selector select {
      padding: 8px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      cursor: pointer;
    }

    .period-actions {
      display: flex;
      gap: 8px;
    }

    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      padding: 0 24px 24px;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .summary-card .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .summary-card.invoices .card-icon { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .summary-card.taxable .card-icon { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .summary-card.cgst .card-icon { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .summary-card.sgst .card-icon { background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); }
    .summary-card.igst .card-icon { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .summary-card.total-tax .card-icon { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }

    .card-content {
      flex: 1;
    }

    .card-value {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .card-label {
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .card-detail {
      display: flex;
      gap: 12px;
      font-size: 12px;
    }

    .card-detail .paid {
      color: #2ed573;
      font-weight: 500;
    }

    .card-detail .pending {
      color: #f39c12;
      font-weight: 500;
    }

    /* Tabs */
    .tabs-container {
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
      background: transparent;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .tab:hover {
      color: #3498db;
    }

    .tab.active {
      color: #27ae60;
      border-bottom-color: #27ae60;
    }

    /* Tab Content */
    .tab-content {
      padding: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .data-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .data-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead {
      background: #f8f9fa;
    }

    .data-table th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      border-bottom: 2px solid #e9ecef;
    }

    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .data-table tr:hover {
      background: #f8f9fa;
    }

    .data-table .amount {
      font-weight: 600;
      text-align: right;
    }

    .empty-row {
      text-align: center;
      color: #95a5a6;
      font-style: italic;
    }

    .summary-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .summary-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .summary-grid-small {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .summary-item .label {
      font-size: 14px;
      color: #7f8c8d;
    }

    .summary-item .value {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    /* GSTR-3B */
    .gstr3b-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .gstr3b-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .gstr3b-section.highlight {
      border: 2px solid #27ae60;
    }

    .gstr3b-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .gstr3b-table {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gstr3b-row {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .gstr3b-row.total {
      background: #e8f8f0;
      font-weight: 600;
      border: 2px solid #27ae60;
    }

    .gstr3b-row .label {
      font-size: 14px;
      color: #7f8c8d;
    }

    .gstr3b-row .value {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    /* Reconciliation */
    .reconciliation-info {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .reconciliation-info p {
      margin: 0 0 20px 0;
      color: #7f8c8d;
    }

    .reconciliation-status {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .status-item {
      padding: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .status-item.success {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-item.warning {
      background: #fff4e6;
      color: #e67e22;
    }

    .status-item.info {
      background: #e7f3ff;
      color: #2980b9;
    }

    /* Reports Grid */
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .report-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .report-card:hover {
      border-color: #27ae60;
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .report-card i {
      font-size: 48px;
      color: #27ae60;
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
      border-color: #27ae60;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
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

    .btn-primary:hover {
      background: #229954;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    @media (max-width: 768px) {
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
        padding: 0 16px 16px;
      }

      .period-section {
        flex-direction: column;
        align-items: stretch;
        margin: 16px;
      }

      .tabs {
        overflow-x: auto;
      }

      .tab {
        white-space: nowrap;
      }
    }
  `]
})
export class GSTReturnPreparationComponent implements OnInit, OnDestroy {
  activeTab: 'gstr1' | 'gstr3b' | 'reconciliation' | 'reports' = 'gstr1';
  selectedPeriod: string = '';
  selectedYear: number = new Date().getFullYear();
  availablePeriods: string[] = [];
  availableYears: number[] = [];
  showConfiguration: boolean = false;
  loadError = '';
  loading = false;

  gstr1Data: Gstr1Data = {
    b2b: [],
    b2cl: [],
    b2cs: [],
    hsn: [],
    summary: {
      totalInvoices: 0,
      totalTaxableValue: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      totalCess: 0,
      totalTax: 0
    }
  };

  gstr3bData: Gstr3bData = {
    period: '',
    outwardSupplies: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    inwardSupplies: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    itc: { eligible: 0, ineligible: 0, total: 0 },
    liability: { cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0 },
    payment: { cash: 0, itc: 0, total: 0 }
  };

  gstSummary: GstSummary = {
    period: '',
    totalInvoices: 0,
    totalTaxableValue: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalCess: 0,
    totalTax: 0,
    paidInvoices: 0,
    pendingInvoices: 0
  };

  reconciliationStats = {
    matched: 0,
    mismatched: 0,
    pending: 0
  };

  gstConfig: GstConfiguration = {
    gstin: '',
    businessName: '',
    businessAddress: '',
    businessState: '',
    businessStateCode: '',
    pan: '',
    placeOfBusiness: ''
  };

  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private gstReturnService = inject(GstReturnPreparationService);

  ngOnInit(): void {
    this.initializePeriods();
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }
    this.loadConfig();
    this.loadGSTData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Initialize available periods (months up to current month for current year). */
  initializePeriods(): void {
    const currentYear = new Date().getFullYear();
    this.availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
    this.selectedYear = currentYear;

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = new Date().getMonth();
    this.availablePeriods = months.slice(0, currentMonth + 1);
    this.selectedPeriod = months[currentMonth];
  }

  /** Load GST configuration from API. */
  loadConfig(): void {
    this.gstReturnService
      .getConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: config => {
          this.gstConfig = config;
        },
        error: () => {
          // Config load failure is non-fatal; user can still enter config manually
        }
      });
  }

  /** Load GST return data for the selected period from API. */
  loadGSTData(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.gstReturnService
      .getReturnData(this.selectedPeriod, this.selectedYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.gstr1Data = data.gstr1;
          this.gstr3bData = data.gstr3b;
          this.gstSummary = data.gstSummary;
          this.reconciliationStats = data.reconciliation;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Failed to load GST return data from the API. Ensure the backend is running.';
        }
      });
  }

  /** Prepare and persist return snapshot via API. */
  prepareReturn(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected.';
      return;
    }
    this.loading = true;
    this.gstReturnService
      .prepareReturn(this.selectedPeriod, this.selectedYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.gstr1Data = data.gstr1;
          this.gstr3bData = data.gstr3b;
          this.gstSummary = data.gstSummary;
          this.reconciliationStats = data.reconciliation;
          this.loading = false;
          alert('GST return prepared successfully!');
        },
        error: () => {
          this.loading = false;
          alert('Failed to prepare GST return. Check backend connection.');
        }
      });
  }

  /** Validate return via API. */
  validateReturn(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected.';
      return;
    }
    this.gstReturnService
      .validateReturn(this.selectedPeriod, this.selectedYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if (result.errors.length > 0) {
            alert('Validation Errors:\n' + result.errors.join('\n'));
          } else {
            alert('Return validated successfully! All checks passed.');
          }
        },
        error: () => {
          alert('Failed to validate GST return.');
        }
      });
  }

  /** Export GSTR-1 as JSON download. */
  exportGSTR1(): void {
    const blob = new Blob([JSON.stringify(this.gstr1Data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr1-${this.selectedPeriod}-${this.selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Export GSTR-3B as JSON download. */
  exportGSTR3B(): void {
    const blob = new Blob([JSON.stringify(this.gstr3bData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gstr3b-${this.selectedPeriod}-${this.selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Export combined return data. */
  exportData(format: 'json' | 'excel'): void {
    const data = {
      gstr1: this.gstr1Data,
      gstr3b: this.gstr3bData,
      summary: this.gstSummary
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gst-return-${this.selectedPeriod}-${this.selectedYear}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Excel export would be implemented with a library like xlsx');
    }
  }

  /** Reconcile GSTR-1 vs GSTR-3B via API. */
  reconcileData(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected.';
      return;
    }
    this.gstReturnService
      .reconcile(this.selectedPeriod, this.selectedYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.reconciliationStats = stats;
          alert('Reconciliation completed!');
        },
        error: () => {
          alert('Failed to reconcile GST return data.');
        }
      });
  }

  /** Generate report placeholder (client-side summary export). */
  generateReport(type: string): void {
    const blob = new Blob(
      [JSON.stringify({ type, period: `${this.selectedPeriod} ${this.selectedYear}`, summary: this.gstSummary }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-report-${type}-${this.selectedPeriod}-${this.selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Save GST configuration via API. */
  saveConfiguration(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected.';
      return;
    }
    this.gstReturnService
      .saveConfig(this.gstConfig)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: config => {
          this.gstConfig = config;
          this.showConfiguration = false;
          alert('GST configuration saved successfully!');
        },
        error: () => {
          alert('Failed to save GST configuration.');
        }
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  goBack(): void {
    window.history.back();
  }
}

