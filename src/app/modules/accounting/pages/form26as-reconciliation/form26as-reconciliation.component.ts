import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Form 26AS Reconciliation Component
 * Handles reconciliation of TDS entries with Form 26AS data
 */
interface Form26ASEntry {
  id: string;
  tan: string; // Tax Deduction Account Number
  deductorName: string;
  section: string; // TDS Section (194C, 194A, etc.)
  amount: number;
  tdsAmount: number;
  dateOfDeduction: Date;
  dateOfDeposit: Date;
  challanNumber?: string;
  bsrCode?: string;
  assessmentYear: string;
  quarter: string; // Q1, Q2, Q3, Q4
  status: 'matched' | 'unmatched' | 'discrepancy' | 'pending';
  matchedPaymentId?: string;
  discrepancyReason?: string;
}

interface VendorPayment {
  id: string;
  paymentNumber: string;
  vendorId: string;
  vendorName: string;
  vendorPAN?: string;
  paymentDate: Date;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  tdsSection?: string;
  paymentStatus: 'pending' | 'approved' | 'paid' | 'cancelled';
  tdsCertificateGenerated: boolean;
  tdsCertificateNumber?: string;
}

interface ReconciliationSummary {
  totalEntries: number;
  matchedEntries: number;
  unmatchedEntries: number;
  discrepancyEntries: number;
  totalTdsAmount: number;
  matchedTdsAmount: number;
  unmatchedTdsAmount: number;
}

@Component({
  selector: 'app-form26as-reconciliation',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="form26as-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">description</i>
            Form 26AS Reconciliation
          </h1>
          <p>Reconcile TDS entries with Form 26AS data</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showUploadModal = true" title="Upload Form 26AS">
            <i class="material-icons">upload_file</i>
            Upload Form 26AS
          </button>
          <button class="icon-btn primary" (click)="autoReconcile()" title="Auto Reconcile">
            <i class="material-icons">sync</i>
            Auto Reconcile
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">list</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.totalEntries }}</div>
            <div class="stat-label">Total Entries</div>
          </div>
        </div>
        <div class="stat-card matched">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.matchedEntries }}</div>
            <div class="stat-label">Matched</div>
          </div>
        </div>
        <div class="stat-card unmatched">
          <div class="stat-icon">
            <i class="material-icons">error</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.unmatchedEntries }}</div>
            <div class="stat-label">Unmatched</div>
          </div>
        </div>
        <div class="stat-card discrepancy">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.discrepancyEntries }}</div>
            <div class="stat-label">Discrepancies</div>
          </div>
        </div>
        <div class="stat-card tds-total">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(summary.totalTdsAmount) }}</div>
            <div class="stat-label">Total TDS</div>
          </div>
        </div>
        <div class="stat-card tds-matched">
          <div class="stat-icon">
            <i class="material-icons">verified</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(summary.matchedTdsAmount) }}</div>
            <div class="stat-label">Matched TDS</div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by TAN, deductor name, section..." 
            [(ngModel)]="searchQuery"
            (input)="filterEntries()"
          />
        </div>
        <select [(ngModel)]="statusFilter" (change)="filterEntries()" class="filter-select">
          <option value="all">All Status</option>
          <option value="matched">Matched</option>
          <option value="unmatched">Unmatched</option>
          <option value="discrepancy">Discrepancy</option>
          <option value="pending">Pending</option>
        </select>
        <select [(ngModel)]="quarterFilter" (change)="filterEntries()" class="filter-select">
          <option value="all">All Quarters</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
        </select>
        <select [(ngModel)]="assessmentYearFilter" (change)="filterEntries()" class="filter-select">
          <option value="all">All Years</option>
          <option *ngFor="let year of assessmentYears" [value]="year">{{ year }}</option>
        </select>
      </div>

      <!-- Reconciliation Table -->
      <div class="table-container">
        <table class="reconciliation-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>TAN</th>
              <th>Deductor</th>
              <th>Section</th>
              <th>Amount</th>
              <th>TDS Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of filteredEntries" [ngClass]="entry.status">
              <td>{{ formatDate(entry.dateOfDeduction) }}</td>
              <td>{{ entry.tan }}</td>
              <td>
                <div class="deductor-info">
                  <div class="deductor-name">{{ entry.deductorName }}</div>
                  <div class="challan-info" *ngIf="entry.challanNumber">
                    Challan: {{ entry.challanNumber }}
                  </div>
                </div>
              </td>
              <td>{{ entry.section }}</td>
              <td class="amount">{{ formatCurrency(entry.amount) }}</td>
              <td class="tds-amount">{{ formatCurrency(entry.tdsAmount) }}</td>
              <td>
                <span *ngIf="entry.matchedPaymentId" class="payment-link" (click)="viewPayment(entry.matchedPaymentId!)">
                  {{ getPaymentNumber(entry.matchedPaymentId) }}
                </span>
                <span *ngIf="!entry.matchedPaymentId" class="no-payment">-</span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="entry.status">
                  {{ getStatusLabel(entry.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewEntry(entry)" title="View Details">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn match" (click)="openMatchModal(entry)" title="Match Payment" *ngIf="entry.status === 'unmatched' || entry.status === 'pending'">
                    <i class="material-icons">link</i>
                  </button>
                  <button class="action-btn resolve" (click)="resolveDiscrepancy(entry)" title="Resolve" *ngIf="entry.status === 'discrepancy'">
                    <i class="material-icons">check</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredEntries.length === 0">
          <i class="material-icons">description</i>
          <p>No Form 26AS entries found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showUploadModal = true" *ngIf="!searchQuery">
            <i class="material-icons">upload_file</i>
            Upload Form 26AS
          </button>
        </div>
      </div>

      <!-- Entry Details Modal -->
      <div class="modal-overlay" *ngIf="selectedEntry" (click)="closeEntryDetails()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Form 26AS Entry Details</h2>
            <button class="close-btn" (click)="closeEntryDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedEntry">
            <div class="entry-header">
              <div class="entry-info">
                <h3>{{ selectedEntry.deductorName }}</h3>
                <p>TAN: {{ selectedEntry.tan }}</p>
                <p>Section: {{ selectedEntry.section }}</p>
              </div>
              <div class="entry-status">
                <span class="status-badge large" [ngClass]="selectedEntry.status">
                  {{ getStatusLabel(selectedEntry.status) }}
                </span>
              </div>
            </div>

            <div class="entry-summary">
              <div class="summary-row">
                <span>Amount:</span>
                <span class="amount">{{ formatCurrency(selectedEntry.amount) }}</span>
              </div>
              <div class="summary-row">
                <span>TDS Amount:</span>
                <span class="tds-amount">{{ formatCurrency(selectedEntry.tdsAmount) }}</span>
              </div>
              <div class="summary-row">
                <span>Date of Deduction:</span>
                <span>{{ formatDate(selectedEntry.dateOfDeduction) }}</span>
              </div>
              <div class="summary-row">
                <span>Date of Deposit:</span>
                <span>{{ formatDate(selectedEntry.dateOfDeposit) }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedEntry.challanNumber">
                <span>Challan Number:</span>
                <span>{{ selectedEntry.challanNumber }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedEntry.bsrCode">
                <span>BSR Code:</span>
                <span>{{ selectedEntry.bsrCode }}</span>
              </div>
              <div class="summary-row">
                <span>Assessment Year:</span>
                <span>{{ selectedEntry.assessmentYear }}</span>
              </div>
              <div class="summary-row">
                <span>Quarter:</span>
                <span>{{ selectedEntry.quarter }}</span>
              </div>
            </div>

            <div class="matched-payment" *ngIf="selectedEntry.matchedPaymentId">
              <h4>Matched Payment</h4>
              <div class="payment-details">
                <div class="detail-row">
                  <span class="label">Payment Number:</span>
                  <span class="value">{{ getPaymentNumber(selectedEntry.matchedPaymentId) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Vendor:</span>
                  <span class="value">{{ getPaymentVendor(selectedEntry.matchedPaymentId) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">TDS Amount:</span>
                  <span class="value">{{ formatCurrency(getPaymentTds(selectedEntry.matchedPaymentId)) }}</span>
                </div>
              </div>
            </div>

            <div class="discrepancy-info" *ngIf="selectedEntry.status === 'discrepancy' && selectedEntry.discrepancyReason">
              <h4>Discrepancy Details</h4>
              <p>{{ selectedEntry.discrepancyReason }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeEntryDetails()">Close</button>
            <button class="btn btn-primary" (click)="openMatchModal(selectedEntry!)" *ngIf="selectedEntry?.status === 'unmatched' || selectedEntry?.status === 'pending'">
              <i class="material-icons">link</i>
              Match Payment
            </button>
            <button class="btn btn-success" (click)="resolveDiscrepancy(selectedEntry!)" *ngIf="selectedEntry?.status === 'discrepancy'">
              <i class="material-icons">check</i>
              Resolve Discrepancy
            </button>
          </div>
        </div>
      </div>

      <!-- Match Payment Modal -->
      <div class="modal-overlay" *ngIf="showMatchModal && entryToMatch" (click)="showMatchModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Match Payment with Form 26AS Entry</h2>
            <button class="close-btn" (click)="showMatchModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="match-info">
              <p><strong>Form 26AS Entry:</strong></p>
              <p>TDS Amount: {{ formatCurrency(entryToMatch.tdsAmount) }}</p>
              <p>Section: {{ entryToMatch.section }}</p>
              <p>Date: {{ formatDate(entryToMatch.dateOfDeduction) }}</p>
            </div>

            <div class="form-group">
              <label>Select Payment <span class="required">*</span></label>
              <select [(ngModel)]="selectedPaymentId" class="form-select">
                <option value="">Select Payment</option>
                <option *ngFor="let payment of availablePayments" [value]="payment.id">
                  {{ payment.paymentNumber }} - {{ payment.vendorName }} ({{ formatCurrency(payment.tdsAmount) }})
                </option>
              </select>
            </div>

            <div class="match-preview" *ngIf="selectedPaymentId">
              <h4>Match Preview</h4>
              <div class="preview-row">
                <span>Form 26AS TDS:</span>
                <span>{{ formatCurrency(entryToMatch.tdsAmount) }}</span>
              </div>
              <div class="preview-row">
                <span>Payment TDS:</span>
                <span>{{ formatCurrency(getPaymentTds(selectedPaymentId)) }}</span>
              </div>
              <div class="preview-row" [ngClass]="{'match': isAmountMatch(), 'mismatch': !isAmountMatch()}">
                <span>Match Status:</span>
                <span>{{ isAmountMatch() ? '✓ Match' : '✗ Mismatch' }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showMatchModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="matchPayment()" [disabled]="!selectedPaymentId">
              <i class="material-icons">link</i>
              Match Payment
            </button>
          </div>
        </div>
      </div>

      <!-- Upload Form 26AS Modal -->
      <div class="modal-overlay" *ngIf="showUploadModal" (click)="showUploadModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Upload Form 26AS</h2>
            <button class="close-btn" (click)="showUploadModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="upload-instructions">
              <p>Upload Form 26AS data in CSV or Excel format. The file should contain:</p>
              <ul>
                <li>TAN (Tax Deduction Account Number)</li>
                <li>Deductor Name</li>
                <li>Section</li>
                <li>Amount</li>
                <li>TDS Amount</li>
                <li>Date of Deduction</li>
                <li>Date of Deposit</li>
                <li>Challan Number (optional)</li>
                <li>BSR Code (optional)</li>
                <li>Assessment Year</li>
                <li>Quarter</li>
              </ul>
            </div>

            <div class="form-group">
              <label>Select File <span class="required">*</span></label>
              <input type="file" (change)="onFileSelected($event)" accept=".csv,.xlsx,.xls" />
            </div>

            <div class="upload-preview" *ngIf="uploadPreview.length > 0">
              <h4>Preview ({{ uploadPreview.length }} entries)</h4>
              <div class="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>TAN</th>
                      <th>Deductor</th>
                      <th>Section</th>
                      <th>TDS Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let entry of uploadPreview.slice(0, 5)">
                      <td>{{ entry.tan }}</td>
                      <td>{{ entry.deductorName }}</td>
                      <td>{{ entry.section }}</td>
                      <td>{{ formatCurrency(entry.tdsAmount) }}</td>
                      <td>{{ formatDate(entry.dateOfDeduction) }}</td>
                    </tr>
                  </tbody>
                </table>
                <p *ngIf="uploadPreview.length > 5" class="preview-note">
                  ... and {{ uploadPreview.length - 5 }} more entries
                </p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showUploadModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="uploadForm26AS()" [disabled]="uploadPreview.length === 0">
              <i class="material-icons">upload_file</i>
              Upload & Process
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form26as-container {
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
    .stat-card.matched .stat-icon { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }
    .stat-card.unmatched .stat-icon { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .stat-card.discrepancy .stat-icon { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .stat-card.tds-total .stat-icon { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .stat-card.tds-matched .stat-icon { background: linear-gradient(135deg, #16a085 0%, #138d75 100%); }

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
    .table-container {
      padding: 0 24px 24px;
    }

    .reconciliation-table {
      width: 100%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .reconciliation-table thead {
      background: #f8f9fa;
    }

    .reconciliation-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .reconciliation-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .reconciliation-table tr:hover {
      background: #f8f9fa;
    }

    .reconciliation-table tr.matched {
      background: #e8f8f0;
    }

    .reconciliation-table tr.unmatched {
      background: #ffeaea;
    }

    .reconciliation-table tr.discrepancy {
      background: #fff4e6;
    }

    .deductor-info {
      display: flex;
      flex-direction: column;
    }

    .deductor-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .challan-info {
      font-size: 12px;
      color: #7f8c8d;
    }

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .tds-amount {
      font-weight: 600;
      color: #e74c3c;
    }

    .payment-link {
      color: #3498db;
      cursor: pointer;
      text-decoration: underline;
    }

    .payment-link:hover {
      color: #2980b9;
    }

    .no-payment {
      color: #95a5a6;
      font-style: italic;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.matched { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.unmatched { background: #ffeaea; color: #c0392b; }
    .status-badge.discrepancy { background: #fff4e6; color: #e67e22; }
    .status-badge.pending { background: #f5f7fa; color: #95a5a6; }

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
    .action-btn.match { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.resolve { background: #fff4e6; color: #e67e22; }

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

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .entry-info h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .entry-info p {
      margin: 4px 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .entry-summary {
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

    .matched-payment,
    .discrepancy-info {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .matched-payment h4,
    .discrepancy-info h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .payment-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
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

    .match-info {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .match-preview {
      margin-top: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .match-preview h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .preview-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .preview-row.match {
      color: #1e9e5a;
      font-weight: 600;
    }

    .preview-row.mismatch {
      color: #c0392b;
      font-weight: 600;
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

    .form-select,
    .form-group input[type="file"] {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }

    .form-select:focus {
      border-color: #3498db;
    }

    .upload-instructions {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .upload-instructions ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }

    .upload-instructions li {
      margin: 4px 0;
      font-size: 13px;
      color: #7f8c8d;
    }

    .upload-preview {
      margin-top: 16px;
    }

    .upload-preview h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .preview-table {
      overflow-x: auto;
    }

    .preview-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .preview-table th,
    .preview-table td {
      padding: 8px;
      text-align: left;
      border: 1px solid #e9ecef;
      font-size: 12px;
    }

    .preview-table th {
      background: #f8f9fa;
      font-weight: 600;
    }

    .preview-note {
      margin: 8px 0 0 0;
      font-size: 12px;
      color: #7f8c8d;
      font-style: italic;
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

      .table-container {
        padding: 0 16px 16px;
        overflow-x: auto;
      }

      .reconciliation-table {
        min-width: 1200px;
      }
    }
  `]
})
export class Form26ASReconciliationComponent implements OnInit, OnDestroy {
  form26ASEntries: Form26ASEntry[] = [];
  filteredEntries: Form26ASEntry[] = [];
  vendorPayments: VendorPayment[] = [];
  availablePayments: VendorPayment[] = [];
  selectedEntry: Form26ASEntry | null = null;
  entryToMatch: Form26ASEntry | null = null;
  selectedPaymentId: string = '';
  searchQuery: string = '';
  statusFilter: string = 'all';
  quarterFilter: string = 'all';
  assessmentYearFilter: string = 'all';
  showUploadModal: boolean = false;
  showMatchModal: boolean = false;
  uploadPreview: Form26ASEntry[] = [];
  assessmentYears: string[] = [];

  summary: ReconciliationSummary = {
    totalEntries: 0,
    matchedEntries: 0,
    unmatchedEntries: 0,
    discrepancyEntries: 0,
    totalTdsAmount: 0,
    matchedTdsAmount: 0,
    unmatchedTdsAmount: 0
  };

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadForm26ASEntries();
    this.loadVendorPayments();
    this.calculateSummary();
    this.generateAssessmentYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Generate assessment years (last 5 years)
   */
  generateAssessmentYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.assessmentYears.push(`${currentYear - i}-${String(currentYear - i + 1).slice(-2)}`);
    }
  }

  /**
   * Load Form 26AS entries (mock data)
   */
  loadForm26ASEntries(): void {
    this.form26ASEntries = [
      {
        id: 'f26as-001',
        tan: 'BLRM12345A',
        deductorName: 'ABC Society Management',
        section: '194C',
        amount: 35400,
        tdsAmount: 3540,
        dateOfDeduction: new Date(2024, 0, 10),
        dateOfDeposit: new Date(2024, 0, 15),
        challanNumber: 'CH123456',
        bsrCode: 'BSR001',
        assessmentYear: '2024-25',
        quarter: 'Q1',
        status: 'matched',
        matchedPaymentId: '1'
      },
      {
        id: 'f26as-002',
        tan: 'BLRM12345A',
        deductorName: 'ABC Society Management',
        section: '194C',
        amount: 50000,
        tdsAmount: 5000,
        dateOfDeduction: new Date(2024, 1, 15),
        dateOfDeposit: new Date(2024, 1, 20),
        challanNumber: 'CH123457',
        assessmentYear: '2024-25',
        quarter: 'Q1',
        status: 'matched',
        matchedPaymentId: '2'
      },
      {
        id: 'f26as-003',
        tan: 'BLRM12345A',
        deductorName: 'ABC Society Management',
        section: '194A',
        amount: 25000,
        tdsAmount: 500,
        dateOfDeduction: new Date(2024, 1, 20),
        dateOfDeposit: new Date(2024, 1, 25),
        challanNumber: 'CH123458',
        assessmentYear: '2024-25',
        quarter: 'Q1',
        status: 'unmatched'
      },
      {
        id: 'f26as-004',
        tan: 'BLRM12345A',
        deductorName: 'ABC Society Management',
        section: '194C',
        amount: 40000,
        tdsAmount: 4500,
        dateOfDeduction: new Date(2024, 2, 5),
        dateOfDeposit: new Date(2024, 2, 10),
        challanNumber: 'CH123459',
        assessmentYear: '2024-25',
        quarter: 'Q2',
        status: 'discrepancy',
        matchedPaymentId: '3',
        discrepancyReason: 'TDS amount mismatch: Expected 4000, Found 4500'
      }
    ];
    this.filterEntries();
  }

  /**
   * Load vendor payments (mock data - should match vendor-payments component)
   */
  loadVendorPayments(): void {
    this.vendorPayments = [
      {
        id: '1',
        paymentNumber: 'VP-2024-001',
        vendorId: 'vendor-001',
        vendorName: 'ABC Cleaning Services',
        vendorPAN: 'ABCDE1234F',
        paymentDate: new Date(2024, 0, 10),
        grossAmount: 35400,
        tdsRate: 10,
        tdsAmount: 3540,
        tdsSection: '194C',
        paymentStatus: 'paid',
        tdsCertificateGenerated: true,
        tdsCertificateNumber: 'TDS-2024-001'
      },
      {
        id: '2',
        paymentNumber: 'VP-2024-002',
        vendorId: 'vendor-002',
        vendorName: 'XYZ Security Services',
        vendorPAN: 'XYZAB5678G',
        paymentDate: new Date(2024, 1, 15),
        grossAmount: 50000,
        tdsRate: 10,
        tdsAmount: 5000,
        tdsSection: '194C',
        paymentStatus: 'paid',
        tdsCertificateGenerated: true,
        tdsCertificateNumber: 'TDS-2024-002'
      },
      {
        id: '3',
        paymentNumber: 'VP-2024-003',
        vendorId: 'vendor-003',
        vendorName: 'Maintenance Pro',
        vendorPAN: 'MAINT9012H',
        paymentDate: new Date(2024, 2, 5),
        grossAmount: 40000,
        tdsRate: 10,
        tdsAmount: 4000,
        tdsSection: '194C',
        paymentStatus: 'paid',
        tdsCertificateGenerated: false
      }
    ];
  }

  /**
   * Filter entries
   */
  filterEntries(): void {
    let filtered = [...this.form26ASEntries];

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === this.statusFilter);
    }

    // Apply quarter filter
    if (this.quarterFilter !== 'all') {
      filtered = filtered.filter(e => e.quarter === this.quarterFilter);
    }

    // Apply assessment year filter
    if (this.assessmentYearFilter !== 'all') {
      filtered = filtered.filter(e => e.assessmentYear === this.assessmentYearFilter);
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.tan.toLowerCase().includes(query) ||
        e.deductorName.toLowerCase().includes(query) ||
        e.section.toLowerCase().includes(query) ||
        (e.challanNumber && e.challanNumber.toLowerCase().includes(query))
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => b.dateOfDeduction.getTime() - a.dateOfDeduction.getTime());

    this.filteredEntries = filtered;
  }

  /**
   * Calculate summary
   */
  calculateSummary(): void {
    this.summary = {
      totalEntries: this.form26ASEntries.length,
      matchedEntries: this.form26ASEntries.filter(e => e.status === 'matched').length,
      unmatchedEntries: this.form26ASEntries.filter(e => e.status === 'unmatched').length,
      discrepancyEntries: this.form26ASEntries.filter(e => e.status === 'discrepancy').length,
      totalTdsAmount: this.form26ASEntries.reduce((sum, e) => sum + e.tdsAmount, 0),
      matchedTdsAmount: this.form26ASEntries.filter(e => e.status === 'matched').reduce((sum, e) => sum + e.tdsAmount, 0),
      unmatchedTdsAmount: this.form26ASEntries.filter(e => e.status === 'unmatched' || e.status === 'pending').reduce((sum, e) => sum + e.tdsAmount, 0)
    };
  }

  /**
   * View entry details
   */
  viewEntry(entry: Form26ASEntry): void {
    this.selectedEntry = entry;
  }

  /**
   * Close entry details
   */
  closeEntryDetails(): void {
    this.selectedEntry = null;
  }

  /**
   * Open match modal
   */
  openMatchModal(entry: Form26ASEntry): void {
    this.entryToMatch = entry;
    this.selectedPaymentId = '';
    // Filter available payments (unmatched or with same section)
    this.availablePayments = this.vendorPayments.filter(p => 
      p.paymentStatus === 'paid' && 
      (!p.tdsCertificateGenerated || p.tdsSection === entry.section)
    );
    this.showMatchModal = true;
  }

  /**
   * Match payment with Form 26AS entry
   */
  matchPayment(): void {
    if (!this.entryToMatch || !this.selectedPaymentId) {
      return;
    }

    const payment = this.vendorPayments.find(p => p.id === this.selectedPaymentId);
    if (!payment) {
      return;
    }

    // Check for discrepancies
    const amountMatch = Math.abs(payment.tdsAmount - this.entryToMatch.tdsAmount) < 1; // Allow 1 rupee difference
    const sectionMatch = payment.tdsSection === this.entryToMatch.section;

    if (amountMatch && sectionMatch) {
      this.entryToMatch.status = 'matched';
      this.entryToMatch.matchedPaymentId = this.selectedPaymentId;
      this.entryToMatch.discrepancyReason = undefined;
    } else {
      this.entryToMatch.status = 'discrepancy';
      this.entryToMatch.matchedPaymentId = this.selectedPaymentId;
      let reasons: string[] = [];
      if (!amountMatch) {
        reasons.push(`TDS amount mismatch: Expected ${this.formatCurrency(this.entryToMatch.tdsAmount)}, Found ${this.formatCurrency(payment.tdsAmount)}`);
      }
      if (!sectionMatch) {
        reasons.push(`Section mismatch: Expected ${this.entryToMatch.section}, Found ${payment.tdsSection}`);
      }
      this.entryToMatch.discrepancyReason = reasons.join('; ');
    }

    this.filterEntries();
    this.calculateSummary();
    this.showMatchModal = false;
    this.entryToMatch = null;
    alert('Payment matched successfully!');
  }

  /**
   * Check if amounts match
   */
  isAmountMatch(): boolean {
    if (!this.entryToMatch || !this.selectedPaymentId) {
      return false;
    }
    const payment = this.vendorPayments.find(p => p.id === this.selectedPaymentId);
    if (!payment) {
      return false;
    }
    return Math.abs(payment.tdsAmount - this.entryToMatch.tdsAmount) < 1;
  }

  /**
   * Resolve discrepancy
   */
  resolveDiscrepancy(entry: Form26ASEntry): void {
    if (confirm('Mark this discrepancy as resolved?')) {
      entry.status = 'matched';
      entry.discrepancyReason = undefined;
      this.filterEntries();
      this.calculateSummary();
      alert('Discrepancy resolved!');
    }
  }

  /**
   * Auto reconcile entries with payments
   */
  autoReconcile(): void {
    if (confirm('Auto-reconcile all unmatched entries with available payments?')) {
      let matchedCount = 0;
      
      this.form26ASEntries.forEach(entry => {
        if (entry.status === 'unmatched' || entry.status === 'pending') {
          // Find matching payment by amount and section
          const matchingPayment = this.vendorPayments.find(p => 
            p.paymentStatus === 'paid' &&
            p.tdsSection === entry.section &&
            Math.abs(p.tdsAmount - entry.tdsAmount) < 1 &&
            !this.form26ASEntries.some(e => e.matchedPaymentId === p.id && e.id !== entry.id)
          );

          if (matchingPayment) {
            entry.status = 'matched';
            entry.matchedPaymentId = matchingPayment.id;
            entry.discrepancyReason = undefined;
            matchedCount++;
          }
        }
      });

      this.filterEntries();
      this.calculateSummary();
      alert(`Auto-reconciliation completed! ${matchedCount} entries matched.`);
    }
  }

  /**
   * Handle file selection for upload
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // In real app, parse CSV/Excel file
      // For now, simulate with mock data
      this.uploadPreview = [
        {
          id: 'upload-1',
          tan: 'BLRM12345A',
          deductorName: 'ABC Society Management',
          section: '194C',
          amount: 30000,
          tdsAmount: 3000,
          dateOfDeduction: new Date(2024, 2, 10),
          dateOfDeposit: new Date(2024, 2, 15),
          challanNumber: 'CH123460',
          assessmentYear: '2024-25',
          quarter: 'Q2',
          status: 'pending'
        }
      ];
    }
  }

  /**
   * Upload and process Form 26AS data
   */
  uploadForm26AS(): void {
    if (this.uploadPreview.length === 0) {
      return;
    }

    // Add uploaded entries
    this.uploadPreview.forEach(entry => {
      entry.id = `f26as-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.form26ASEntries.push(entry);
    });

    // Auto-reconcile new entries
    this.autoReconcile();

    this.uploadPreview = [];
    this.showUploadModal = false;
    this.filterEntries();
    this.calculateSummary();
    alert('Form 26AS data uploaded and processed successfully!');
  }

  /**
   * View payment details
   */
  viewPayment(paymentId: string): void {
    // In real app, navigate to payment details or show modal
    const payment = this.vendorPayments.find(p => p.id === paymentId);
    if (payment) {
      alert(`Payment: ${payment.paymentNumber}\nVendor: ${payment.vendorName}\nTDS: ${this.formatCurrency(payment.tdsAmount)}`);
    }
  }

  /**
   * Get payment number
   */
  getPaymentNumber(paymentId: string): string {
    const payment = this.vendorPayments.find(p => p.id === paymentId);
    return payment ? payment.paymentNumber : '-';
  }

  /**
   * Get payment vendor
   */
  getPaymentVendor(paymentId: string): string {
    const payment = this.vendorPayments.find(p => p.id === paymentId);
    return payment ? payment.vendorName : '-';
  }

  /**
   * Get payment TDS amount
   */
  getPaymentTds(paymentId: string): number {
    const payment = this.vendorPayments.find(p => p.id === paymentId);
    return payment ? payment.tdsAmount : 0;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      matched: 'Matched',
      unmatched: 'Unmatched',
      discrepancy: 'Discrepancy',
      pending: 'Pending'
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

