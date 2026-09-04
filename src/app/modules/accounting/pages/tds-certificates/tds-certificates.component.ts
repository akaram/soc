import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * TDS Certificate Component
 * Handles generation, viewing, downloading, and management of TDS certificates
 */

interface TdsCertificate {
  id: string;
  certificateNumber: string;
  paymentId: string;
  paymentNumber: string;
  vendorId: string;
  vendorName: string;
  vendorPAN: string;
  vendorAddress?: string;
  vendorGSTIN?: string;
  financialYear: string; // e.g., "2023-24"
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  paymentDate: Date;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  tdsSection: string;
  certificateType: '16' | '16A'; // Form 16 or Form 16A
  status: 'draft' | 'generated' | 'issued' | 'cancelled';
  generatedAt?: Date;
  generatedBy?: string;
  issuedAt?: Date;
  issuedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorPayment {
  id: string;
  paymentNumber: string;
  vendorId: string;
  vendorName: string;
  vendorPAN?: string;
  vendorAddress?: string;
  vendorGSTIN?: string;
  paymentDate: Date;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  tdsSection?: string;
  paymentStatus: 'pending' | 'approved' | 'paid' | 'cancelled';
  tdsCertificateGenerated: boolean;
  tdsCertificateNumber?: string;
}

interface CertificateSummary {
  totalCertificates: number;
  certificatesThisYear: number;
  certificatesThisQuarter: number;
  totalTdsAmount: number;
  pendingGeneration: number;
  issuedCertificates: number;
}

@Component({
  selector: 'app-tds-certificates',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="tds-certificates-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">description</i>
            TDS Certificate Generation
          </h1>
          <p>Generate and manage TDS certificates (Form 16/16A) for vendor payments</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showBulkGeneration = true" title="Bulk Generate">
            <i class="material-icons">batch_prediction</i>
            Bulk Generate
          </button>
          <button class="icon-btn primary" (click)="showGenerateModal = true" title="Generate Certificate">
            <i class="material-icons">add</i>
            Generate Certificate
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">description</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.totalCertificates }}</div>
            <div class="stat-label">Total Certificates</div>
          </div>
        </div>
        <div class="stat-card year">
          <div class="stat-icon">
            <i class="material-icons">calendar_today</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.certificatesThisYear }}</div>
            <div class="stat-label">This Financial Year</div>
          </div>
        </div>
        <div class="stat-card quarter">
          <div class="stat-icon">
            <i class="material-icons">event</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.certificatesThisQuarter }}</div>
            <div class="stat-label">This Quarter</div>
          </div>
        </div>
        <div class="stat-card tds">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(summary.totalTdsAmount) }}</div>
            <div class="stat-label">Total TDS Amount</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.pendingGeneration }}</div>
            <div class="stat-label">Pending Generation</div>
          </div>
        </div>
        <div class="stat-card issued">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.issuedCertificates }}</div>
            <div class="stat-label">Issued Certificates</div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by certificate number, vendor, payment..." 
            [(ngModel)]="searchQuery"
            (input)="filterCertificates()"
          />
        </div>
        <select [(ngModel)]="statusFilter" (change)="filterCertificates()" class="filter-select">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="generated">Generated</option>
          <option value="issued">Issued</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select [(ngModel)]="certificateTypeFilter" (change)="filterCertificates()" class="filter-select">
          <option value="all">All Types</option>
          <option value="16">Form 16</option>
          <option value="16A">Form 16A</option>
        </select>
        <select [(ngModel)]="financialYearFilter" (change)="filterCertificates()" class="filter-select">
          <option value="all">All Years</option>
          <option *ngFor="let year of financialYears" [value]="year">{{ year }}</option>
        </select>
        <select [(ngModel)]="quarterFilter" (change)="filterCertificates()" class="filter-select">
          <option value="all">All Quarters</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
        </select>
      </div>

      <!-- Certificates Table -->
      <div class="certificates-table-container">
        <table class="certificates-table">
          <thead>
            <tr>
              <th>Certificate #</th>
              <th>Payment #</th>
              <th>Vendor</th>
              <th>PAN</th>
              <th>Financial Year</th>
              <th>Quarter</th>
              <th>TDS Amount</th>
              <th>Type</th>
              <th>Status</th>
              <th>Generated Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let certificate of filteredCertificates">
              <td>
                <strong>{{ certificate.certificateNumber }}</strong>
              </td>
              <td>{{ certificate.paymentNumber }}</td>
              <td>
                <div class="vendor-info">
                  <div class="vendor-name">{{ certificate.vendorName }}</div>
                </div>
              </td>
              <td>{{ certificate.vendorPAN }}</td>
              <td>{{ certificate.financialYear }}</td>
              <td>{{ certificate.quarter }}</td>
              <td class="tds-amount">{{ formatCurrency(certificate.tdsAmount) }}</td>
              <td>
                <span class="cert-type-badge" [ngClass]="'cert-type-' + certificate.certificateType">
                  Form {{ certificate.certificateType }}
                </span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="certificate.status">
                  {{ getStatusLabel(certificate.status) }}
                </span>
              </td>
              <td>{{ certificate.generatedAt ? formatDate(certificate.generatedAt) : '-' }}</td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewCertificate(certificate)" title="View">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn download" (click)="downloadCertificate(certificate)" title="Download PDF" *ngIf="certificate.status !== 'draft'">
                    <i class="material-icons">download</i>
                  </button>
                  <button class="action-btn print" (click)="printCertificate(certificate)" title="Print" *ngIf="certificate.status !== 'draft'">
                    <i class="material-icons">print</i>
                  </button>
                  <button class="action-btn issue" (click)="issueCertificate(certificate)" title="Issue" *ngIf="certificate.status === 'generated'">
                    <i class="material-icons">send</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredCertificates.length === 0">
          <i class="material-icons">description</i>
          <p>No TDS certificates found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showGenerateModal = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Generate First Certificate
          </button>
        </div>
      </div>

      <!-- Certificate Details/Preview Modal -->
      <div class="modal-overlay" *ngIf="selectedCertificate" (click)="closeCertificateDetails()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>TDS Certificate - {{ selectedCertificate.certificateNumber }}</h2>
            <button class="close-btn" (click)="closeCertificateDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedCertificate">
            <!-- Certificate Preview -->
            <div class="certificate-preview">
              <div class="certificate-header">
                <h3>Certificate of Tax Deducted at Source</h3>
                <div class="certificate-meta">
                  <span>Certificate No: <strong>{{ selectedCertificate.certificateNumber }}</strong></span>
                  <span>Form: <strong>Form {{ selectedCertificate.certificateType }}</strong></span>
                </div>
              </div>

              <div class="certificate-body">
                <!-- Deductor Details -->
                <div class="cert-section">
                  <h4>Deductor Details</h4>
                  <div class="cert-details">
                    <div class="detail-row">
                      <span class="label">Name:</span>
                      <span class="value">{{ deductorDetails.name }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">PAN:</span>
                      <span class="value">{{ deductorDetails.pan }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">TAN:</span>
                      <span class="value">{{ deductorDetails.tan }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Address:</span>
                      <span class="value">{{ deductorDetails.address }}</span>
                    </div>
                  </div>
                </div>

                <!-- Deductee Details -->
                <div class="cert-section">
                  <h4>Deductee Details</h4>
                  <div class="cert-details">
                    <div class="detail-row">
                      <span class="label">Name:</span>
                      <span class="value">{{ selectedCertificate.vendorName }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">PAN:</span>
                      <span class="value">{{ selectedCertificate.vendorPAN }}</span>
                    </div>
                    <div class="detail-row" *ngIf="selectedCertificate.vendorGSTIN">
                      <span class="label">GSTIN:</span>
                      <span class="value">{{ selectedCertificate.vendorGSTIN }}</span>
                    </div>
                    <div class="detail-row" *ngIf="selectedCertificate.vendorAddress">
                      <span class="label">Address:</span>
                      <span class="value">{{ selectedCertificate.vendorAddress }}</span>
                    </div>
                  </div>
                </div>

                <!-- TDS Details -->
                <div class="cert-section">
                  <h4>TDS Details</h4>
                  <div class="cert-details">
                    <div class="detail-row">
                      <span class="label">Payment Number:</span>
                      <span class="value">{{ selectedCertificate.paymentNumber }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Payment Date:</span>
                      <span class="value">{{ formatDate(selectedCertificate.paymentDate) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Gross Amount:</span>
                      <span class="value">{{ formatCurrency(selectedCertificate.grossAmount) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">TDS Section:</span>
                      <span class="value">{{ selectedCertificate.tdsSection }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">TDS Rate:</span>
                      <span class="value">{{ selectedCertificate.tdsRate }}%</span>
                    </div>
                    <div class="detail-row total-row">
                      <span class="label">TDS Amount:</span>
                      <span class="value tds-amount">{{ formatCurrency(selectedCertificate.tdsAmount) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Period Details -->
                <div class="cert-section">
                  <h4>Period Details</h4>
                  <div class="cert-details">
                    <div class="detail-row">
                      <span class="label">Financial Year:</span>
                      <span class="value">{{ selectedCertificate.financialYear }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Quarter:</span>
                      <span class="value">{{ selectedCertificate.quarter }}</span>
                    </div>
                    <div class="detail-row" *ngIf="selectedCertificate.generatedAt">
                      <span class="label">Generated Date:</span>
                      <span class="value">{{ formatDateTime(selectedCertificate.generatedAt) }}</span>
                    </div>
                    <div class="detail-row" *ngIf="selectedCertificate.issuedAt">
                      <span class="label">Issued Date:</span>
                      <span class="value">{{ formatDateTime(selectedCertificate.issuedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="certificate-footer">
                <div class="signature-section">
                  <div class="signature-box">
                    <p>Authorized Signatory</p>
                    <p class="signature-name">{{ deductorDetails.authorizedSignatory }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeCertificateDetails()">Close</button>
            <button class="btn btn-info" (click)="downloadCertificate(selectedCertificate!)" *ngIf="selectedCertificate?.status !== 'draft'">
              <i class="material-icons">download</i>
              Download PDF
            </button>
            <button class="btn btn-info" (click)="printCertificate(selectedCertificate!)" *ngIf="selectedCertificate?.status !== 'draft'">
              <i class="material-icons">print</i>
              Print
            </button>
            <button class="btn btn-success" (click)="issueCertificate(selectedCertificate!)" *ngIf="selectedCertificate?.status === 'generated'">
              <i class="material-icons">send</i>
              Issue Certificate
            </button>
          </div>
        </div>
      </div>

      <!-- Generate Certificate Modal -->
      <div class="modal-overlay" *ngIf="showGenerateModal" (click)="showGenerateModal = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Generate TDS Certificate</h2>
            <button class="close-btn" (click)="showGenerateModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Select Payment <span class="required">*</span></label>
                <select [(ngModel)]="selectedPaymentId" (change)="onPaymentChange()" required>
                  <option value="">Select Payment</option>
                  <option *ngFor="let payment of eligiblePayments" [value]="payment.id">
                    {{ payment.paymentNumber }} - {{ payment.vendorName }} ({{ formatCurrency(payment.tdsAmount) }} TDS)
                  </option>
                </select>
                <small class="form-hint">Only paid payments with TDS are eligible</small>
              </div>
              <div class="form-group">
                <label>Certificate Type <span class="required">*</span></label>
                <select [(ngModel)]="newCertificate.certificateType" required>
                  <option value="">Select Type</option>
                  <option value="16">Form 16 - Salary Certificate</option>
                  <option value="16A">Form 16A - Non-Salary Certificate</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Financial Year <span class="required">*</span></label>
                <select [(ngModel)]="newCertificate.financialYear" required>
                  <option value="">Select Financial Year</option>
                  <option *ngFor="let year of financialYears" [value]="year">{{ year }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Quarter <span class="required">*</span></label>
                <select [(ngModel)]="newCertificate.quarter" required>
                  <option value="">Select Quarter</option>
                  <option value="Q1">Q1 (Apr - Jun)</option>
                  <option value="Q2">Q2 (Jul - Sep)</option>
                  <option value="Q3">Q3 (Oct - Dec)</option>
                  <option value="Q4">Q4 (Jan - Mar)</option>
                </select>
              </div>
            </div>

            <div class="form-group" *ngIf="selectedPayment">
              <label>Payment Details</label>
              <div class="payment-preview-box">
                <div class="preview-row">
                  <span>Vendor:</span>
                  <span><strong>{{ selectedPayment.vendorName }}</strong></span>
                </div>
                <div class="preview-row">
                  <span>PAN:</span>
                  <span>{{ selectedPayment.vendorPAN || 'N/A' }}</span>
                </div>
                <div class="preview-row">
                  <span>Payment Date:</span>
                  <span>{{ formatDate(selectedPayment.paymentDate) }}</span>
                </div>
                <div class="preview-row">
                  <span>Gross Amount:</span>
                  <span>{{ formatCurrency(selectedPayment.grossAmount) }}</span>
                </div>
                <div class="preview-row">
                  <span>TDS Rate:</span>
                  <span>{{ selectedPayment.tdsRate }}%</span>
                </div>
                <div class="preview-row">
                  <span>TDS Amount:</span>
                  <span class="tds-amount">{{ formatCurrency(selectedPayment.tdsAmount) }}</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="newCertificate.notes" placeholder="Additional notes (optional)" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showGenerateModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="generateCertificate()" [disabled]="!isCertificateValid()">
              <i class="material-icons">description</i>
              Generate Certificate
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Generation Modal -->
      <div class="modal-overlay" *ngIf="showBulkGeneration" (click)="showBulkGeneration = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Bulk Generate TDS Certificates</h2>
            <button class="close-btn" (click)="showBulkGeneration = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Financial Year <span class="required">*</span></label>
                <select [(ngModel)]="bulkGeneration.financialYear" (change)="watchBulkFilters()" required>
                  <option value="">Select Financial Year</option>
                  <option *ngFor="let year of financialYears" [value]="year">{{ year }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Quarter <span class="required">*</span></label>
                <select [(ngModel)]="bulkGeneration.quarter" (change)="watchBulkFilters()" required>
                  <option value="">Select Quarter</option>
                  <option value="Q1">Q1 (Apr - Jun)</option>
                  <option value="Q2">Q2 (Jul - Sep)</option>
                  <option value="Q3">Q3 (Oct - Dec)</option>
                  <option value="Q4">Q4 (Jan - Mar)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Certificate Type <span class="required">*</span></label>
              <select [(ngModel)]="bulkGeneration.certificateType" required>
                <option value="">Select Type</option>
                <option value="16">Form 16 - Salary Certificate</option>
                <option value="16A">Form 16A - Non-Salary Certificate</option>
              </select>
            </div>

            <div class="eligible-payments-list" *ngIf="bulkEligiblePayments.length > 0">
              <h4>Eligible Payments ({{ bulkEligiblePayments.length }})</h4>
              <div class="payments-checkbox-list">
                <label *ngFor="let payment of bulkEligiblePayments" class="checkbox-item">
                  <input 
                    type="checkbox" 
                    [checked]="bulkSelectedPayments.includes(payment.id)"
                    (change)="toggleBulkSelection(payment.id)"
                  />
                  <div class="payment-item-info">
                    <span class="payment-number">{{ payment.paymentNumber }}</span>
                    <span class="vendor-name">{{ payment.vendorName }}</span>
                    <span class="tds-amount">{{ formatCurrency(payment.tdsAmount) }} TDS</span>
                  </div>
                </label>
              </div>
              <div class="bulk-actions">
                <button class="btn btn-secondary" (click)="selectAllBulkPayments()">Select All</button>
                <button class="btn btn-secondary" (click)="deselectAllBulkPayments()">Deselect All</button>
              </div>
            </div>

            <div class="empty-state" *ngIf="bulkEligiblePayments.length === 0 && bulkGeneration.financialYear && bulkGeneration.quarter">
              <i class="material-icons">info</i>
              <p>No eligible payments found for the selected period</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showBulkGeneration = false">Cancel</button>
            <button class="btn btn-primary" (click)="bulkGenerateCertificates()" [disabled]="!isBulkGenerationValid() || bulkSelectedPayments.length === 0">
              <i class="material-icons">batch_prediction</i>
              Generate {{ bulkSelectedPayments.length }} Certificate(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tds-certificates-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%);
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
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon { background: linear-gradient(135deg, #8e44ad 0%, #6c3483 100%); }
    .stat-card.year .stat-icon { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .stat-card.quarter .stat-icon { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .stat-card.tds .stat-icon { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .stat-card.pending .stat-icon { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .stat-card.issued .stat-icon { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }

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
    .certificates-table-container {
      padding: 0 24px 24px;
    }

    .certificates-table {
      width: 100%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .certificates-table thead {
      background: #f8f9fa;
    }

    .certificates-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .certificates-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .certificates-table tr:hover {
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

    .tds-amount {
      font-weight: 600;
      color: #e74c3c;
    }

    .cert-type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .cert-type-badge.cert-type-16 { background: #e7f3ff; color: #2980b9; }
    .cert-type-badge.cert-type-16A { background: #f4e7ff; color: #8e44ad; }

    .status-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.draft { background: #fff4e6; color: #e67e22; }
    .status-badge.generated { background: #e7f3ff; color: #2980b9; }
    .status-badge.issued { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.cancelled { background: #f5f7fa; color: #95a5a6; }

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
    .action-btn.print { background: #fff4e6; color: #e67e22; }
    .action-btn.issue { background: #2ed573; color: white; }

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

    /* Certificate Preview */
    .certificate-preview {
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 24px;
      background: white;
    }

    .certificate-header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e9ecef;
    }

    .certificate-header h3 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;
    }

    .certificate-meta {
      display: flex;
      justify-content: space-around;
      gap: 16px;
      flex-wrap: wrap;
    }

    .certificate-meta span {
      font-size: 14px;
      color: #7f8c8d;
    }

    .certificate-meta strong {
      color: #2c3e50;
    }

    .cert-section {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .cert-section h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 8px;
    }

    .cert-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row.total-row {
      border-top: 2px solid #e9ecef;
      margin-top: 8px;
      padding-top: 12px;
      font-weight: 600;
      font-size: 16px;
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

    .certificate-footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #e9ecef;
    }

    .signature-section {
      display: flex;
      justify-content: flex-end;
    }

    .signature-box {
      text-align: right;
    }

    .signature-box p {
      margin: 4px 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .signature-name {
      font-weight: 600;
      color: #2c3e50;
      margin-top: 40px;
      border-top: 1px solid #e9ecef;
      padding-top: 8px;
    }

    /* Form Styles */
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
      border-color: #8e44ad;
    }

    .payment-preview-box {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e9ecef;
    }

    .preview-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      border-bottom: 1px solid #f0f0f0;
    }

    .preview-row:last-child {
      border-bottom: none;
    }

    .eligible-payments-list {
      margin-top: 24px;
    }

    .eligible-payments-list h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .payments-checkbox-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 8px;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background 0.2s;
    }

    .checkbox-item:hover {
      background: #f8f9fa;
    }

    .checkbox-item:last-child {
      border-bottom: none;
    }

    .checkbox-item input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .payment-item-info {
      flex: 1;
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .payment-number {
      font-weight: 600;
      color: #2c3e50;
      min-width: 120px;
    }

    .vendor-name {
      flex: 1;
      color: #7f8c8d;
    }

    .bulk-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
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
      background: #8e44ad;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #6c3483;
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

      .certificates-table-container {
        padding: 0 16px 16px;
        overflow-x: auto;
      }

      .certificates-table {
        min-width: 1400px;
      }
    }
  `]
})
export class TdsCertificatesComponent implements OnInit, OnDestroy {
  certificates: TdsCertificate[] = [];
  filteredCertificates: TdsCertificate[] = [];
  eligiblePayments: VendorPayment[] = [];
  bulkEligiblePayments: VendorPayment[] = [];
  bulkSelectedPayments: string[] = [];
  selectedCertificate: TdsCertificate | null = null;
  selectedPayment: VendorPayment | null = null;
  searchQuery: string = '';
  statusFilter: string = 'all';
  certificateTypeFilter: string = 'all';
  financialYearFilter: string = 'all';
  quarterFilter: string = 'all';
  showGenerateModal: boolean = false;
  showBulkGeneration: boolean = false;
  selectedPaymentId: string = '';

  // Deductor details (company/organization details)
  deductorDetails = {
    name: 'ABC Society',
    pan: 'AAAAA0000A',
    tan: 'ABCD12345D',
    address: '123 Society Street, City, State - 123456',
    authorizedSignatory: 'John Doe'
  };

  financialYears: string[] = [];
  currentFinancialYear: string = '';

  newCertificate: Partial<TdsCertificate> = {
    certificateType: '16A',
    status: 'draft',
    quarter: 'Q1'
  };

  bulkGeneration: {
    financialYear: string;
    quarter: string;
    certificateType: '16' | '16A' | '';
  } = {
    financialYear: '',
    quarter: '',
    certificateType: ''
  };

  summary: CertificateSummary = {
    totalCertificates: 0,
    certificatesThisYear: 0,
    certificatesThisQuarter: 0,
    totalTdsAmount: 0,
    pendingGeneration: 0,
    issuedCertificates: 0
  };

  private destroy$ = new Subject<void>();

  constructor() {
    // Initialize financial years (last 5 years and next year)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    this.currentFinancialYear = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
    
    for (let i = 4; i >= 0; i--) {
      const year = fyStartYear - i;
      this.financialYears.push(`${year}-${String(year + 1).slice(-2)}`);
    }
    this.financialYears.push(`${fyStartYear + 1}-${String(fyStartYear + 2).slice(-2)}`);
  }

  ngOnInit(): void {
    this.loadCertificates();
    this.loadEligiblePayments();
    this.calculateSummary();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load TDS certificates from storage/API
   */
  loadCertificates(): void {
    // In real app, load from API
    const stored = localStorage.getItem('tds_certificates');
    if (stored) {
      this.certificates = JSON.parse(stored).map((c: any) => ({
        ...c,
        paymentDate: new Date(c.paymentDate),
        generatedAt: c.generatedAt ? new Date(c.generatedAt) : undefined,
        issuedAt: c.issuedAt ? new Date(c.issuedAt) : undefined,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      }));
    } else {
      this.certificates = [];
    }
    this.filterCertificates();
  }

  /**
   * Load eligible payments (paid payments with TDS)
   */
  loadEligiblePayments(): void {
    // In real app, load from API
    const stored = localStorage.getItem('vendor_payments');
    if (stored) {
      const allPayments: VendorPayment[] = JSON.parse(stored).map((p: any) => ({
        ...p,
        paymentDate: new Date(p.paymentDate)
      }));
      this.eligiblePayments = allPayments.filter(
        p => p.paymentStatus === 'paid' && p.tdsAmount > 0 && !p.tdsCertificateGenerated
      );
    } else {
      this.eligiblePayments = [];
    }
  }

  /**
   * Filter certificates based on search and filters
   */
  filterCertificates(): void {
    let filtered = [...this.certificates];

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.certificateNumber.toLowerCase().includes(query) ||
        c.paymentNumber.toLowerCase().includes(query) ||
        c.vendorName.toLowerCase().includes(query) ||
        c.vendorPAN.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === this.statusFilter);
    }

    // Certificate type filter
    if (this.certificateTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.certificateType === this.certificateTypeFilter);
    }

    // Financial year filter
    if (this.financialYearFilter !== 'all') {
      filtered = filtered.filter(c => c.financialYear === this.financialYearFilter);
    }

    // Quarter filter
    if (this.quarterFilter !== 'all') {
      filtered = filtered.filter(c => c.quarter === this.quarterFilter);
    }

    this.filteredCertificates = filtered;
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(): void {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const currentFY = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
    
    // Determine current quarter
    let currentQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
    if (currentMonth >= 3 && currentMonth < 6) currentQuarter = 'Q1';
    else if (currentMonth >= 6 && currentMonth < 9) currentQuarter = 'Q2';
    else if (currentMonth >= 9 && currentMonth < 12) currentQuarter = 'Q3';
    else currentQuarter = 'Q4';

    this.summary = {
      totalCertificates: this.certificates.length,
      certificatesThisYear: this.certificates.filter(c => c.financialYear === currentFY).length,
      certificatesThisQuarter: this.certificates.filter(c => c.financialYear === currentFY && c.quarter === currentQuarter).length,
      totalTdsAmount: this.certificates.reduce((sum, c) => sum + c.tdsAmount, 0),
      pendingGeneration: this.eligiblePayments.length,
      issuedCertificates: this.certificates.filter(c => c.status === 'issued').length
    };
  }

  /**
   * Handle payment selection change
   */
  onPaymentChange(): void {
    if (this.selectedPaymentId) {
      this.selectedPayment = this.eligiblePayments.find(p => p.id === this.selectedPaymentId) || null;
      if (this.selectedPayment) {
        // Auto-populate certificate details
        this.newCertificate.paymentId = this.selectedPayment.id;
        this.newCertificate.paymentNumber = this.selectedPayment.paymentNumber;
        this.newCertificate.vendorId = this.selectedPayment.vendorId;
        this.newCertificate.vendorName = this.selectedPayment.vendorName;
        this.newCertificate.vendorPAN = this.selectedPayment.vendorPAN || '';
        this.newCertificate.vendorAddress = this.selectedPayment.vendorAddress;
        this.newCertificate.vendorGSTIN = this.selectedPayment.vendorGSTIN;
        this.newCertificate.paymentDate = this.selectedPayment.paymentDate;
        this.newCertificate.grossAmount = this.selectedPayment.grossAmount;
        this.newCertificate.tdsRate = this.selectedPayment.tdsRate;
        this.newCertificate.tdsAmount = this.selectedPayment.tdsAmount;
        this.newCertificate.tdsSection = this.selectedPayment.tdsSection || '194C';

        // Auto-determine financial year and quarter from payment date
        const paymentDate = new Date(this.selectedPayment.paymentDate);
        const paymentMonth = paymentDate.getMonth();
        const paymentYear = paymentDate.getFullYear();
        const fyStartYear = paymentMonth >= 3 ? paymentYear : paymentYear - 1;
        this.newCertificate.financialYear = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
        
        if (paymentMonth >= 3 && paymentMonth < 6) this.newCertificate.quarter = 'Q1';
        else if (paymentMonth >= 6 && paymentMonth < 9) this.newCertificate.quarter = 'Q2';
        else if (paymentMonth >= 9 && paymentMonth < 12) this.newCertificate.quarter = 'Q3';
        else this.newCertificate.quarter = 'Q4';
      }
    } else {
      this.selectedPayment = null;
    }
  }

  /**
   * Validate certificate form
   */
  isCertificateValid(): boolean {
    return !!(
      this.selectedPaymentId &&
      this.newCertificate.certificateType &&
      this.newCertificate.financialYear &&
      this.newCertificate.quarter
    );
  }

  /**
   * Generate TDS certificate
   */
  generateCertificate(): void {
    if (!this.isCertificateValid() || !this.selectedPayment) return;

    const certificate: TdsCertificate = {
      id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      certificateNumber: this.generateCertificateNumber(),
      paymentId: this.selectedPayment.id,
      paymentNumber: this.selectedPayment.paymentNumber,
      vendorId: this.selectedPayment.vendorId,
      vendorName: this.selectedPayment.vendorName,
      vendorPAN: this.selectedPayment.vendorPAN || '',
      vendorAddress: this.selectedPayment.vendorAddress,
      vendorGSTIN: this.selectedPayment.vendorGSTIN,
      financialYear: this.newCertificate.financialYear!,
      quarter: this.newCertificate.quarter!,
      paymentDate: this.selectedPayment.paymentDate,
      grossAmount: this.selectedPayment.grossAmount,
      tdsRate: this.selectedPayment.tdsRate,
      tdsAmount: this.selectedPayment.tdsAmount,
      tdsSection: this.selectedPayment.tdsSection || '194C',
      certificateType: this.newCertificate.certificateType as '16' | '16A',
      status: 'generated',
      generatedAt: new Date(),
      generatedBy: 'Current User', // In real app, get from auth service
      notes: this.newCertificate.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.certificates.push(certificate);
    this.saveCertificates();

    // Mark payment as certificate generated
    this.markPaymentCertificateGenerated(this.selectedPayment.id, certificate.certificateNumber);

    // Reset form
    this.selectedPaymentId = '';
    this.selectedPayment = null;
    this.newCertificate = {
      certificateType: '16A',
      status: 'draft',
      quarter: 'Q1'
    };
    this.showGenerateModal = false;

    // Reload data
    this.loadEligiblePayments();
    this.filterCertificates();
    this.calculateSummary();

    alert(`TDS Certificate ${certificate.certificateNumber} generated successfully!`);
  }

  /**
   * Generate certificate number
   */
  generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const count = this.certificates.length + 1;
    return `TDS-${year}-${String(count).padStart(5, '0')}`;
  }

  /**
   * Mark payment as certificate generated
   */
  markPaymentCertificateGenerated(paymentId: string, certificateNumber: string): void {
    const stored = localStorage.getItem('vendor_payments');
    if (stored) {
      const payments: any[] = JSON.parse(stored);
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        payment.tdsCertificateGenerated = true;
        payment.tdsCertificateNumber = certificateNumber;
        localStorage.setItem('vendor_payments', JSON.stringify(payments));
      }
    }
  }

  /**
   * Save certificates to storage
   */
  saveCertificates(): void {
    localStorage.setItem('tds_certificates', JSON.stringify(this.certificates));
  }

  /**
   * View certificate details
   */
  viewCertificate(certificate: TdsCertificate): void {
    this.selectedCertificate = certificate;
  }

  /**
   * Close certificate details modal
   */
  closeCertificateDetails(): void {
    this.selectedCertificate = null;
  }

  /**
   * Download certificate as PDF
   */
  downloadCertificate(certificate: TdsCertificate): void {
    // In real app, generate PDF using a library like jsPDF or pdfmake
    console.log('Download certificate:', certificate.certificateNumber);
    alert(`TDS Certificate ${certificate.certificateNumber} download started`);
    
    // Simulate PDF generation
    // In production, use jsPDF or similar library to generate PDF
  }

  /**
   * Print certificate
   */
  printCertificate(certificate: TdsCertificate): void {
    // In real app, open print dialog with formatted certificate
    console.log('Print certificate:', certificate.certificateNumber);
    window.print();
  }

  /**
   * Issue certificate (mark as issued)
   */
  issueCertificate(certificate: TdsCertificate): void {
    certificate.status = 'issued';
    certificate.issuedAt = new Date();
    certificate.issuedBy = 'Current User'; // In real app, get from auth service
    certificate.updatedAt = new Date();
    this.saveCertificates();
    this.filterCertificates();
    this.calculateSummary();
    alert(`TDS Certificate ${certificate.certificateNumber} has been issued`);
  }

  /**
   * Load eligible payments for bulk generation
   */
  loadBulkEligiblePayments(): void {
    if (!this.bulkGeneration.financialYear || !this.bulkGeneration.quarter) {
      this.bulkEligiblePayments = [];
      return;
    }

    const stored = localStorage.getItem('vendor_payments');
    if (stored) {
      const allPayments: VendorPayment[] = JSON.parse(stored).map((p: any) => ({
        ...p,
        paymentDate: new Date(p.paymentDate)
      }));

      // Filter payments for the selected period
      this.bulkEligiblePayments = allPayments.filter(p => {
        if (p.paymentStatus !== 'paid' || p.tdsAmount <= 0 || p.tdsCertificateGenerated) {
          return false;
        }

        const paymentDate = new Date(p.paymentDate);
        const paymentMonth = paymentDate.getMonth();
        const paymentYear = paymentDate.getFullYear();
        const fyStartYear = paymentMonth >= 3 ? paymentYear : paymentYear - 1;
        const paymentFY = `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

        if (paymentFY !== this.bulkGeneration.financialYear) {
          return false;
        }

        let paymentQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';
        if (paymentMonth >= 3 && paymentMonth < 6) paymentQuarter = 'Q1';
        else if (paymentMonth >= 6 && paymentMonth < 9) paymentQuarter = 'Q2';
        else if (paymentMonth >= 9 && paymentMonth < 12) paymentQuarter = 'Q3';
        else paymentQuarter = 'Q4';

        return paymentQuarter === this.bulkGeneration.quarter;
      });
    } else {
      this.bulkEligiblePayments = [];
    }
  }

  /**
   * Toggle bulk selection
   */
  toggleBulkSelection(paymentId: string): void {
    const index = this.bulkSelectedPayments.indexOf(paymentId);
    if (index > -1) {
      this.bulkSelectedPayments.splice(index, 1);
    } else {
      this.bulkSelectedPayments.push(paymentId);
    }
  }

  /**
   * Select all bulk payments
   */
  selectAllBulkPayments(): void {
    this.bulkSelectedPayments = this.bulkEligiblePayments.map(p => p.id);
  }

  /**
   * Deselect all bulk payments
   */
  deselectAllBulkPayments(): void {
    this.bulkSelectedPayments = [];
  }

  /**
   * Validate bulk generation form
   */
  isBulkGenerationValid(): boolean {
    return !!(
      this.bulkGeneration.financialYear &&
      this.bulkGeneration.quarter &&
      this.bulkGeneration.certificateType
    );
  }

  /**
   * Bulk generate certificates
   */
  bulkGenerateCertificates(): void {
    if (!this.isBulkGenerationValid() || this.bulkSelectedPayments.length === 0) return;

    const selectedPayments = this.bulkEligiblePayments.filter(p => 
      this.bulkSelectedPayments.includes(p.id)
    );

    let generatedCount = 0;
    selectedPayments.forEach(payment => {
      const certificate: TdsCertificate = {
        id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        certificateNumber: this.generateCertificateNumber(),
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        vendorId: payment.vendorId,
        vendorName: payment.vendorName,
        vendorPAN: payment.vendorPAN || '',
        vendorAddress: payment.vendorAddress,
        vendorGSTIN: payment.vendorGSTIN,
        financialYear: this.bulkGeneration.financialYear,
        quarter: this.bulkGeneration.quarter as 'Q1' | 'Q2' | 'Q3' | 'Q4',
        paymentDate: payment.paymentDate,
        grossAmount: payment.grossAmount,
        tdsRate: payment.tdsRate,
        tdsAmount: payment.tdsAmount,
        tdsSection: payment.tdsSection || '194C',
        certificateType: this.bulkGeneration.certificateType as '16' | '16A',
        status: 'generated',
        generatedAt: new Date(),
        generatedBy: 'Current User',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.certificates.push(certificate);
      this.markPaymentCertificateGenerated(payment.id, certificate.certificateNumber);
      generatedCount++;
    });

    this.saveCertificates();
    this.loadEligiblePayments();
    this.filterCertificates();
    this.calculateSummary();

    // Reset bulk generation
    this.bulkSelectedPayments = [];
    this.bulkEligiblePayments = [];
    this.bulkGeneration = {
      financialYear: '',
      quarter: '',
      certificateType: ''
    };
    this.showBulkGeneration = false;

    alert(`Successfully generated ${generatedCount} TDS certificate(s)!`);
  }

  /**
   * Watch bulk generation filters
   */
  watchBulkFilters(): void {
    // This would be called when financial year or quarter changes
    this.loadBulkEligiblePayments();
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
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
   * Format date and time
   */
  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Draft',
      'generated': 'Generated',
      'issued': 'Issued',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

