import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { TaxManagementService } from '../../services/tax-management.service';
import {
  GSTConfiguration,
  GSTTaxRate,
  TaxCompliance,
  TaxSummary,
  TDSConfiguration,
  TDSRate
} from '../../models/tax-management.model';

/**
 * Tax Management Component
 * Comprehensive tax management for GST and TDS calculations, compliance, and reporting
 */

@Component({
  selector: 'app-tax-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="tax-management-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">calculate</i>
            Tax Management
          </h1>
          <p>Manage GST and TDS calculations, compliance, and reporting</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/tax-management</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showSettings = true" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="exportTaxReport()" title="Export">
            <i class="material-icons">download</i>
            Export
          </button>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="loading-banner" *ngIf="loading">
        <i class="material-icons spin">sync</i>
        <span>Loading tax management data…</span>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tab-buttons">
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'overview'}" (click)="activeTab = 'overview'">
            <i class="material-icons">dashboard</i>
            Overview
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'gst'}" (click)="activeTab = 'gst'">
            <i class="material-icons">receipt</i>
            GST Management
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'tds'}" (click)="activeTab = 'tds'">
            <i class="material-icons">account_balance</i>
            TDS Management
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'compliance'}" (click)="activeTab = 'compliance'">
            <i class="material-icons">verified</i>
            Compliance
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'reports'}" (click)="activeTab = 'reports'">
            <i class="material-icons">assessment</i>
            Reports
          </button>
        </div>
      </div>

      <!-- Overview Tab -->
      <div class="tab-content" *ngIf="activeTab === 'overview'">
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="summary-card gst-sales">
            <div class="card-icon">
              <i class="material-icons">trending_up</i>
            </div>
            <div class="card-content">
              <div class="card-label">GST Sales</div>
              <div class="card-value">{{ formatCurrency(taxSummary.gst.totalSales) }}</div>
              <div class="card-hint">Output Tax: {{ formatCurrency(taxSummary.gst.outputTax) }}</div>
            </div>
          </div>
          <div class="summary-card gst-purchases">
            <div class="card-icon">
              <i class="material-icons">trending_down</i>
            </div>
            <div class="card-content">
              <div class="card-label">GST Purchases</div>
              <div class="card-value">{{ formatCurrency(taxSummary.gst.totalPurchases) }}</div>
              <div class="card-hint">Input Tax: {{ formatCurrency(taxSummary.gst.inputTax) }}</div>
            </div>
          </div>
          <div class="summary-card gst-liability">
            <div class="card-icon">
              <i class="material-icons">account_balance</i>
            </div>
            <div class="card-content">
              <div class="card-label">Net GST Liability</div>
              <div class="card-value" [ngClass]="{'positive': taxSummary.gst.netTaxLiability <= 0, 'negative': taxSummary.gst.netTaxLiability > 0}">
                {{ formatCurrency(Math.abs(taxSummary.gst.netTaxLiability)) }}
              </div>
              <div class="card-hint" [ngClass]="{'positive': taxSummary.gst.netTaxLiability <= 0, 'negative': taxSummary.gst.netTaxLiability > 0}">
                {{ taxSummary.gst.netTaxLiability <= 0 ? 'Refund' : 'Payable' }}
              </div>
            </div>
          </div>
          <div class="summary-card tds-deductions">
            <div class="card-icon">
              <i class="material-icons">money_off</i>
            </div>
            <div class="card-content">
              <div class="card-label">TDS Deductions</div>
              <div class="card-value">{{ formatCurrency(taxSummary.tds.totalDeductions) }}</div>
              <div class="card-hint">Deposits: {{ formatCurrency(taxSummary.tds.totalDeposits) }}</div>
            </div>
          </div>
          <div class="summary-card compliance-status" [ngClass]="{'good': getComplianceStatus() === 'good', 'warning': getComplianceStatus() === 'warning', 'critical': getComplianceStatus() === 'critical'}">
            <div class="card-icon">
              <i class="material-icons">{{ getComplianceStatus() === 'good' ? 'check_circle' : getComplianceStatus() === 'warning' ? 'warning' : 'error' }}</i>
            </div>
            <div class="card-content">
              <div class="card-label">Compliance Status</div>
              <div class="card-value">{{ getComplianceStatusLabel() }}</div>
              <div class="card-hint">Pending Returns: {{ taxCompliance.gst.returnsPending + taxCompliance.tds.certificatesPending }}</div>
            </div>
          </div>
          <div class="summary-card penalties">
            <div class="card-icon">
              <i class="material-icons">error</i>
            </div>
            <div class="card-content">
              <div class="card-label">Total Penalties</div>
              <div class="card-value">{{ formatCurrency(taxCompliance.gst.penalties + taxCompliance.tds.penalties) }}</div>
              <div class="card-hint">GST: {{ formatCurrency(taxCompliance.gst.penalties) }} | TDS: {{ formatCurrency(taxCompliance.tds.penalties) }}</div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <h3>Quick Actions</h3>
          <div class="actions-grid">
            <button class="action-card" (click)="activeTab = 'gst'; showGstReturn = true">
              <i class="material-icons">description</i>
              <span>File GST Return</span>
            </button>
            <button class="action-card" (click)="activeTab = 'tds'; showTdsDeposit = true">
              <i class="material-icons">account_balance</i>
              <span>Deposit TDS</span>
            </button>
            <button class="action-card" (click)="activeTab = 'gst'">
              <i class="material-icons">settings</i>
              <span>Configure GST Rates</span>
            </button>
            <button class="action-card" (click)="activeTab = 'tds'">
              <i class="material-icons">settings</i>
              <span>Configure TDS Rates</span>
            </button>
            <button class="action-card" (click)="activeTab = 'reports'">
              <i class="material-icons">assessment</i>
              <span>View Tax Reports</span>
            </button>
            <button class="action-card" (click)="activeTab = 'compliance'">
              <i class="material-icons">verified</i>
              <span>Compliance Status</span>
            </button>
          </div>
        </div>
      </div>

      <!-- GST Management Tab -->
      <div class="tab-content" *ngIf="activeTab === 'gst'">
        <div class="section-header">
          <h2>GST Configuration</h2>
          <button class="btn btn-primary" (click)="showGstConfig = true">
            <i class="material-icons">edit</i>
            Edit Configuration
          </button>
        </div>

        <div class="config-display">
          <div class="config-item">
            <span class="label">GSTIN:</span>
            <span class="value">{{ gstConfig.gstin || 'Not configured' }}</span>
          </div>
          <div class="config-item">
            <span class="label">Business Name:</span>
            <span class="value">{{ gstConfig.businessName || 'Not configured' }}</span>
          </div>
          <div class="config-item">
            <span class="label">Registration Type:</span>
            <span class="value">{{ getRegistrationTypeLabel(gstConfig.registrationType) }}</span>
          </div>
          <div class="config-item">
            <span class="label">Place of Supply:</span>
            <span class="value">{{ gstConfig.placeOfSupply || 'Not configured' }}</span>
          </div>
        </div>

        <div class="section-header">
          <h2>GST Tax Rates</h2>
          <button class="btn btn-primary" (click)="showAddGstRate = true">
            <i class="material-icons">add</i>
            Add Tax Rate
          </button>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>HSN/SAC</th>
                <th>Description</th>
                <th>CGST %</th>
                <th>SGST %</th>
                <th>IGST %</th>
                <th>CESS %</th>
                <th>Effective From</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rate of gstConfig.taxRates">
                <td>{{ rate.hsnSac }}</td>
                <td>{{ rate.description }}</td>
                <td>{{ rate.cgstRate }}%</td>
                <td>{{ rate.sgstRate }}%</td>
                <td>{{ rate.igstRate }}%</td>
                <td>{{ rate.cessRate }}%</td>
                <td>{{ formatDate(rate.effectiveFrom) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="{'active': rate.isActive, 'inactive': !rate.isActive}">
                    {{ rate.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <button class="action-btn edit" (click)="editGstRate(rate)" title="Edit">
                    <i class="material-icons">edit</i>
                  </button>
                  <button class="action-btn delete" (click)="deleteGstRate(rate)" title="Delete">
                    <i class="material-icons">delete</i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TDS Management Tab -->
      <div class="tab-content" *ngIf="activeTab === 'tds'">
        <div class="section-header">
          <h2>TDS Configuration</h2>
          <button class="btn btn-primary" (click)="showTdsConfig = true">
            <i class="material-icons">edit</i>
            Edit Configuration
          </button>
        </div>

        <div class="config-display">
          <div class="config-item">
            <span class="label">PAN:</span>
            <span class="value">{{ tdsConfig.pan || 'Not configured' }}</span>
          </div>
          <div class="config-item">
            <span class="label">TAN:</span>
            <span class="value">{{ tdsConfig.tan || 'Not configured' }}</span>
          </div>
          <div class="config-item">
            <span class="label">Business Name:</span>
            <span class="value">{{ tdsConfig.businessName || 'Not configured' }}</span>
          </div>
        </div>

        <div class="section-header">
          <h2>TDS Rates</h2>
          <button class="btn btn-primary" (click)="showAddTdsRate = true">
            <i class="material-icons">add</i>
            Add TDS Rate
          </button>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Description</th>
                <th>Rate %</th>
                <th>Threshold</th>
                <th>Effective From</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rate of tdsConfig.tdsRates">
                <td><strong>{{ rate.section }}</strong></td>
                <td>{{ rate.description }}</td>
                <td>{{ rate.rate }}%</td>
                <td>{{ formatCurrency(rate.threshold) }}</td>
                <td>{{ formatDate(rate.effectiveFrom) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="{'active': rate.isActive, 'inactive': !rate.isActive}">
                    {{ rate.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <button class="action-btn edit" (click)="editTdsRate(rate)" title="Edit">
                    <i class="material-icons">edit</i>
                  </button>
                  <button class="action-btn delete" (click)="deleteTdsRate(rate)" title="Delete">
                    <i class="material-icons">delete</i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Compliance Tab -->
      <div class="tab-content" *ngIf="activeTab === 'compliance'">
        <div class="compliance-section">
          <h2>GST Compliance</h2>
          <div class="compliance-cards">
            <div class="compliance-card">
              <div class="card-label">Last Return Filed</div>
              <div class="card-value">{{ formatDate(taxCompliance.gst.lastReturnFiled) }}</div>
            </div>
            <div class="compliance-card">
              <div class="card-label">Next Return Due</div>
              <div class="card-value" [ngClass]="{'overdue': isOverdue(taxCompliance.gst.nextReturnDue)}">
                {{ formatDate(taxCompliance.gst.nextReturnDue) }}
              </div>
            </div>
            <div class="compliance-card">
              <div class="card-label">Pending Returns</div>
              <div class="card-value">{{ taxCompliance.gst.returnsPending }}</div>
            </div>
            <div class="compliance-card">
              <div class="card-label">Penalties</div>
              <div class="card-value">{{ formatCurrency(taxCompliance.gst.penalties) }}</div>
            </div>
          </div>
        </div>

        <div class="compliance-section">
          <h2>TDS Compliance</h2>
          <div class="compliance-cards">
            <div class="compliance-card">
              <div class="card-label">Last Quarter Filed</div>
              <div class="card-value">{{ taxCompliance.tds.lastQuarterFiled || 'N/A' }}</div>
            </div>
            <div class="compliance-card">
              <div class="card-label">Next Quarter Due</div>
              <div class="card-value">{{ taxCompliance.tds.nextQuarterDue || 'N/A' }}</div>
            </div>
            <div class="compliance-card">
              <div class="card-label">Pending Certificates</div>
              <div class="card-value">{{ taxCompliance.tds.certificatesPending }}</div>
            </div>
            <div class="compliance-card">
              <div class="card-label">Penalties</div>
              <div class="card-value">{{ formatCurrency(taxCompliance.tds.penalties) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports Tab -->
      <div class="tab-content" *ngIf="activeTab === 'reports'">
        <div class="reports-section">
          <h2>Tax Reports</h2>
          <div class="reports-grid">
            <button class="report-card" (click)="generateReport('gst-summary')">
              <i class="material-icons">description</i>
              <span>GST Summary Report</span>
            </button>
            <button class="report-card" (click)="generateReport('tds-summary')">
              <i class="material-icons">account_balance</i>
              <span>TDS Summary Report</span>
            </button>
            <button class="report-card" (click)="generateReport('gst-return')">
              <i class="material-icons">receipt</i>
              <span>GST Return Report</span>
            </button>
            <button class="report-card" (click)="generateReport('tds-certificates')">
              <i class="material-icons">description</i>
              <span>TDS Certificates Report</span>
            </button>
            <button class="report-card" (click)="generateReport('compliance')">
              <i class="material-icons">verified</i>
              <span>Compliance Report</span>
            </button>
            <button class="report-card" (click)="generateReport('penalties')">
              <i class="material-icons">error</i>
              <span>Penalties Report</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="showSettings = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Tax Management Settings</h2>
            <button class="close-btn" (click)="showSettings = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Auto-calculate GST</label>
              <input type="checkbox" [(ngModel)]="autoCalculateGst" />
            </div>
            <div class="form-group">
              <label>Auto-calculate TDS</label>
              <input type="checkbox" [(ngModel)]="autoCalculateTds" />
            </div>
            <div class="form-group">
              <label>Send Compliance Reminders</label>
              <input type="checkbox" [(ngModel)]="sendComplianceReminders" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showSettings = false">Close</button>
            <button class="btn btn-primary" (click)="saveSettings()">Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tax-management-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
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

    .icon-btn {
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

    /* Tabs */
    .tabs-section {
      background: white;
      padding: 0 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-buttons {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    .tab-btn {
      padding: 16px 24px;
      border: none;
      background: transparent;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: #34495e;
      background: #f8f9fa;
    }

    .tab-btn.active {
      color: #34495e;
      border-bottom-color: #34495e;
      font-weight: 600;
    }

    /* Tab Content */
    .tab-content {
      padding: 24px;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
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

    .summary-card.gst-sales .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.gst-purchases .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.gst-liability .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .summary-card.tds-deductions .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .summary-card.compliance-status.good .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .summary-card.compliance-status.warning .card-icon {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .summary-card.compliance-status.critical .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .summary-card.penalties .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
    }

    .card-content {
      flex: 1;
    }

    .card-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    .card-value.positive {
      color: #2ed573;
    }

    .card-value.negative {
      color: #e74c3c;
    }

    .card-value.overdue {
      color: #e74c3c;
    }

    .card-hint {
      font-size: 11px;
      margin-top: 4px;
      color: #7f8c8d;
    }

    .card-hint.positive {
      color: #2ed573;
      font-weight: 600;
    }

    .card-hint.negative {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Quick Actions */
    .quick-actions {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .quick-actions h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .action-card {
      padding: 20px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .action-card:hover {
      border-color: #34495e;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .action-card .material-icons {
      font-size: 32px;
      color: #34495e;
    }

    .action-card span {
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    /* Section Header */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    /* Config Display */
    .config-display {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .config-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .config-item .label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .config-item .value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
    }

    /* Table */
    .table-wrapper {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .data-table td {
      padding: 12px 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .data-table tbody tr:hover {
      background: #f8f9fa;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-badge.inactive {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      transition: all 0.2s;
    }

    .action-btn.edit {
      background: #e7f3ff;
      color: #2980b9;
    }

    .action-btn.delete {
      background: #ffeaea;
      color: #e74c3c;
    }

    .action-btn:hover {
      transform: scale(1.1);
    }

    /* Compliance Section */
    .compliance-section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }

    .compliance-section h2 {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .compliance-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .compliance-card {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      text-align: center;
    }

    .compliance-card .card-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .compliance-card .card-value {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    /* Reports Section */
    .reports-section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .reports-section h2 {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    .report-card {
      padding: 24px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
    }

    .report-card:hover {
      border-color: #34495e;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .report-card .material-icons {
      font-size: 48px;
      color: #34495e;
    }

    .report-card span {
      font-size: 16px;
      font-weight: 500;
      color: #2c3e50;
    }

    /* Buttons */
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
      background: #34495e;
      color: white;
    }

    .btn-primary:hover {
      background: #2c3e50;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
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
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .form-group input[type="checkbox"] {
      width: 20px;
      height: 20px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: 1fr;
      }

      .tab-buttons {
        overflow-x: auto;
      }

      .tab-btn {
        white-space: nowrap;
      }
    }
  `]
})
export class TaxManagementComponent implements OnInit, OnDestroy {
  // Expose Math for use in templates
  Math = Math;

  activeTab: 'overview' | 'gst' | 'tds' | 'compliance' | 'reports' = 'overview';
  gstConfig: GSTConfiguration;
  tdsConfig: TDSConfiguration;
  taxSummary: TaxSummary;
  taxCompliance: TaxCompliance;
  showSettings: boolean = false;
  showGstConfig: boolean = false;
  showTdsConfig: boolean = false;
  showAddGstRate: boolean = false;
  showAddTdsRate: boolean = false;
  showGstReturn: boolean = false;
  showTdsDeposit: boolean = false;
  autoCalculateGst: boolean = true;
  autoCalculateTds: boolean = true;
  sendComplianceReminders: boolean = true;
  selectedFinancialYear: string = '';
  financialYears: string[] = [];
  loadError = '';
  loading = false;

  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private taxManagementService = inject(TaxManagementService);

  constructor() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    for (let i = 5; i >= 0; i--) {
      const year = fyStartYear - i;
      this.financialYears.push(`${year}-${String(year + 1).slice(-2)}`);
    }
    this.selectedFinancialYear = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

    this.gstConfig = this.createEmptyGstConfig();
    this.tdsConfig = this.createEmptyTdsConfig();
    this.taxSummary = this.createEmptyTaxSummary();
    this.taxCompliance = this.createEmptyTaxCompliance();
    this.loadSettings();
  }

  ngOnInit(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }
    this.loadTaxData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createEmptyGstConfig(): GSTConfiguration {
    return {
      gstin: '',
      businessName: '',
      registrationType: 'regular',
      placeOfSupply: '',
      stateCode: '',
      taxRates: []
    };
  }

  createEmptyTdsConfig(): TDSConfiguration {
    return {
      pan: '',
      tan: '',
      businessName: '',
      tdsRates: []
    };
  }

  createEmptyTaxSummary(): TaxSummary {
    return {
      gst: {
        totalSales: 0,
        totalPurchases: 0,
        outputTax: 0,
        inputTax: 0,
        netTaxLiability: 0,
        pendingReturns: 0
      },
      tds: {
        totalDeductions: 0,
        totalDeposits: 0,
        pendingDeposits: 0,
        pendingCertificates: 0
      }
    };
  }

  createEmptyTaxCompliance(): TaxCompliance {
    return {
      gst: {
        lastReturnFiled: new Date(),
        nextReturnDue: new Date(),
        returnsPending: 0,
        penalties: 0
      },
      tds: {
        lastQuarterFiled: '',
        nextQuarterDue: '',
        certificatesPending: 0,
        penalties: 0
      }
    };
  }

  /** Load tax dashboard from API. */
  loadTaxData(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.taxManagementService
      .getDashboard(this.selectedFinancialYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.gstConfig = response.gstConfig;
          this.tdsConfig = response.tdsConfig;
          this.taxSummary = response.taxSummary;
          this.taxCompliance = response.taxCompliance;
          this.selectedFinancialYear = response.financialYear;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Failed to load tax management data from the API. Ensure the backend is running.';
        }
      });
  }

  /** Persist GST config after local rate changes. */
  private persistGstConfig(): void {
    this.taxManagementService
      .saveGstConfig(this.gstConfig)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => alert('Failed to save GST configuration.')
      });
  }

  /** Persist TDS config after local rate changes. */
  private persistTdsConfig(): void {
    this.taxManagementService
      .saveTdsConfig(this.tdsConfig)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => alert('Failed to save TDS configuration.')
      });
  }

  /**
   * Get registration type label
   */
  getRegistrationTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'regular': 'Regular',
      'composition': 'Composition Scheme',
      'unregistered': 'Unregistered'
    };
    return labels[type] || type;
  }

  /**
   * Get compliance status
   */
  getComplianceStatus(): 'good' | 'warning' | 'critical' {
    const pendingReturns = this.taxCompliance.gst.returnsPending + this.taxCompliance.tds.certificatesPending;
    const totalPenalties = this.taxCompliance.gst.penalties + this.taxCompliance.tds.penalties;
    
    if (pendingReturns === 0 && totalPenalties === 0) {
      return 'good';
    } else if (pendingReturns <= 2 && totalPenalties < 10000) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  /**
   * Get compliance status label
   */
  getComplianceStatusLabel(): string {
    const status = this.getComplianceStatus();
    const labels = {
      'good': 'Compliant',
      'warning': 'Attention Required',
      'critical': 'Non-Compliant'
    };
    return labels[status];
  }

  /**
   * Check if date is overdue
   */
  isOverdue(date: Date): boolean {
    return new Date() > date;
  }

  /**
   * Edit GST rate
   */
  editGstRate(rate: GSTTaxRate): void {
    console.log('Edit GST rate:', rate);
    // In real app, open edit modal
  }

  /**
   * Delete GST rate
   */
  deleteGstRate(rate: GSTTaxRate): void {
    if (confirm(`Are you sure you want to delete the GST rate for ${rate.hsnSac}?`)) {
      this.gstConfig.taxRates = this.gstConfig.taxRates.filter(r => r.id !== rate.id);
      this.persistGstConfig();
    }
  }

  /**
   * Edit TDS rate
   */
  editTdsRate(rate: TDSRate): void {
    console.log('Edit TDS rate:', rate);
    // In real app, open edit modal
  }

  /**
   * Delete TDS rate
   */
  deleteTdsRate(rate: TDSRate): void {
    if (confirm(`Are you sure you want to delete the TDS rate for Section ${rate.section}?`)) {
      this.tdsConfig.tdsRates = this.tdsConfig.tdsRates.filter(r => r.id !== rate.id);
      this.persistTdsConfig();
    }
  }

  generateReport(reportType: string): void {
    const data = {
      reportType,
      financialYear: this.selectedFinancialYear,
      gstConfig: this.gstConfig,
      tdsConfig: this.tdsConfig,
      taxSummary: this.taxSummary,
      taxCompliance: this.taxCompliance
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${reportType}-${this.selectedFinancialYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportTaxReport(): void {
    this.generateReport('full-dashboard');
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    localStorage.setItem('tax_management_settings', JSON.stringify({
      autoCalculateGst: this.autoCalculateGst,
      autoCalculateTds: this.autoCalculateTds,
      sendComplianceReminders: this.sendComplianceReminders,
      selectedFinancialYear: this.selectedFinancialYear
    }));
    this.showSettings = false;
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('tax_management_settings');
    if (!stored) {
      return;
    }
    try {
      const settings = JSON.parse(stored);
      if (settings.autoCalculateGst !== undefined) {
        this.autoCalculateGst = settings.autoCalculateGst;
      }
      if (settings.autoCalculateTds !== undefined) {
        this.autoCalculateTds = settings.autoCalculateTds;
      }
      if (settings.sendComplianceReminders !== undefined) {
        this.sendComplianceReminders = settings.sendComplianceReminders;
      }
      if (settings.selectedFinancialYear) {
        this.selectedFinancialYear = settings.selectedFinancialYear;
      }
    } catch {
      // ignore invalid stored settings
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

