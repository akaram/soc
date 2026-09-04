import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { PettyCashService } from '../../services/petty-cash.service';
import {
  PettyCashLedger,
  PettyCashSummary,
  PettyCashTransaction
} from '../../models/petty-cash.model';

/**
 * Petty Cash Management Component
 * Manages petty cash float, vouchers, approvals, and day-wise reconciliation
 */

@Component({
  selector: 'app-petty-cash',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="petty-cash-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">account_balance_wallet</i>
            Petty Cash Management
          </h1>
          <p>Control day-to-day small expenses with proper petty cash controls</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/petty-cash</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="openSettings()" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="exportLedger()" title="Export">
            <i class="material-icons">download</i>
            Export
          </button>
          <button class="icon-btn" (click)="printLedger()" title="Print">
            <i class="material-icons">print</i>
            Print
          </button>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="loading-banner" *ngIf="loading">
        <i class="material-icons spin">sync</i>
        <span>Loading petty cash data…</span>
      </div>

      <!-- Ledger & Period Selection -->
      <div class="selection-section">
        <div class="selection-controls">
          <div class="control-group">
            <label>Petty Cash Ledger <span class="required">*</span></label>
            <select [(ngModel)]="selectedLedgerId" (change)="onLedgerChange()" required>
              <option value="">Select Ledger</option>
              <option *ngFor="let ledger of ledgers" [value]="ledger.id">
                {{ ledger.name }} - {{ ledger.location }}
              </option>
            </select>
          </div>
          <div class="control-group">
            <label>From Date</label>
            <input type="date" [(ngModel)]="fromDate" (change)="filterTransactions()" />
          </div>
          <div class="control-group">
            <label>To Date</label>
            <input type="date" [(ngModel)]="toDate" (change)="filterTransactions()" />
          </div>
          <div class="control-group">
            <label>Search</label>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (input)="filterTransactions()"
              placeholder="Search description, voucher, user"
            />
          </div>
          <button class="btn btn-primary" (click)="openNewVoucherModal()">
            <i class="material-icons">add</i>
            New Voucher
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards" *ngIf="selectedLedger">
        <div class="summary-card balance">
          <div class="card-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="card-content">
            <div class="card-label">Current Balance</div>
            <div class="card-value">
              {{ formatCurrency(summary.remainingBalance) }}
            </div>
            <div class="card-hint">
              Opening: {{ formatCurrency(selectedLedger.openingBalance) }}
            </div>
          </div>
        </div>
        <div class="summary-card debits">
          <div class="card-icon">
            <i class="material-icons">arrow_downward</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Expenses</div>
            <div class="card-value">
              {{ formatCurrency(summary.totalDebits) }}
            </div>
            <div class="card-hint">
              Today's Spend:
              {{ formatCurrency(summary.todaysSpend) }}
            </div>
          </div>
        </div>
        <div class="summary-card credits">
          <div class="card-icon">
            <i class="material-icons">arrow_upward</i>
          </div>
          <div class="card-content">
            <div class="card-label">Total Reimbursements</div>
            <div class="card-value">
              {{ formatCurrency(summary.totalCredits) }}
            </div>
            <div class="card-hint">
              Net Outflow:
              {{ formatCurrency(summary.netOutflow) }}
            </div>
          </div>
        </div>
        <div class="summary-card approvals">
          <div class="card-icon">
            <i class="material-icons">pending_actions</i>
          </div>
          <div class="card-content">
            <div class="card-label">Pending Approvals</div>
            <div class="card-value">{{ summary.pendingApprovals }}</div>
            <div class="card-hint">
              Daily Limit:
              {{ formatCurrency(selectedLedger.dailyLimit) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="transactions-section" *ngIf="selectedLedger">
        <div class="table-header">
          <h3>Petty Cash Vouchers</h3>
          <div class="table-actions">
            <button class="btn btn-secondary" (click)="approveSelected()" [disabled]="!hasSelectedPending()">
              <i class="material-icons">check_circle</i>
              Approve Selected
            </button>
            <button class="btn btn-secondary" (click)="resetFilters()">
              <i class="material-icons">filter_alt_off</i>
              Reset Filters
            </button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    [checked]="allVisibleSelected()"
                    (change)="toggleSelectAll($event)"
                  />
                </th>
                <th>Date</th>
                <th>Voucher No</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Requested By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let tx of filteredTransactions"
                [ngClass]="{
                  debit: tx.type === 'debit',
                  credit: tx.type === 'credit',
                  pending: tx.status === 'pending'
                }"
              >
                <td>
                  <input
                    type="checkbox"
                    [(ngModel)]="selection[tx.id]"
                    [disabled]="tx.status !== 'pending'"
                  />
                </td>
                <td>{{ formatDate(tx.date) }}</td>
                <td>{{ tx.voucherNumber }}</td>
                <td class="description">{{ tx.description }}</td>
                <td>
                  <span class="category-badge" [ngClass]="tx.category">
                    {{ getCategoryLabel(tx.category) }}
                  </span>
                </td>
                <td>
                  <span class="type-badge" [ngClass]="tx.type">
                    {{ tx.type === 'debit' ? 'Expense' : 'Reimbursement' }}
                  </span>
                </td>
                <td class="amount" [ngClass]="tx.type">
                  {{ tx.type === 'debit' ? '-' : '+' }}
                  {{ formatCurrency(tx.amount) }}
                </td>
                <td>{{ tx.requestedBy }}</td>
                <td>
                  <span class="status-badge" [ngClass]="tx.status">
                    {{ getStatusLabel(tx.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button
                      class="action-btn view"
                      (click)="viewVoucher(tx)"
                      title="View Details"
                    >
                      <i class="material-icons">visibility</i>
                    </button>
                    <button
                      class="action-btn approve"
                      *ngIf="tx.status === 'pending'"
                      (click)="approveVoucher(tx)"
                      title="Approve"
                    >
                      <i class="material-icons">check</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredTransactions.length === 0">
                <td colspan="10" class="empty-state">
                  No petty cash vouchers found for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- New Voucher Modal -->
      <div class="modal-overlay" *ngIf="showVoucherModal" (click)="closeVoucherModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>New Petty Cash Voucher</h2>
            <button class="close-btn" (click)="closeVoucherModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveVoucher()" #voucherForm="ngForm">
              <div class="form-row">
                <div class="form-group">
                  <label>Date</label>
                  <input type="date" [(ngModel)]="voucherFormModel.date" name="date" required />
                </div>
                <div class="form-group">
                  <label>Voucher Number</label>
                  <input
                    type="text"
                    [(ngModel)]="voucherFormModel.voucherNumber"
                    name="voucherNumber"
                    placeholder="Auto-generated if left blank"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group full-width">
                  <label>Description</label>
                  <textarea
                    [(ngModel)]="voucherFormModel.description"
                    name="description"
                    rows="2"
                    required
                  ></textarea>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Category</label>
                  <select [(ngModel)]="voucherFormModel.category" name="category" required>
                    <option value="office-supplies">Office Supplies</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="travel">Travel</option>
                    <option value="utilities">Utilities</option>
                    <option value="staff-welfare">Staff Welfare</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Type</label>
                  <select [(ngModel)]="voucherFormModel.type" name="type" required>
                    <option value="debit">Expense (Debit)</option>
                    <option value="credit">Reimbursement / Refill (Credit)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    [(ngModel)]="voucherFormModel.amount"
                    name="amount"
                    required
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Requested By</label>
                  <input
                    type="text"
                    [(ngModel)]="voucherFormModel.requestedBy"
                    name="requestedBy"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>Remarks (Optional)</label>
                  <input
                    type="text"
                    [(ngModel)]="voucherFormModel.remarks"
                    name="remarks"
                    placeholder="Any additional notes"
                  />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeVoucherModal()">Cancel</button>
            <button
              class="btn btn-primary"
              (click)="saveVoucher()"
              [disabled]="!canSaveVoucher()"
            >
              <i class="material-icons">save</i>
              Save Voucher
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="closeSettings()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Petty Cash Settings</h2>
            <button class="close-btn" (click)="closeSettings()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Daily Expense Alert Threshold (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                [(ngModel)]="dailyAlertThreshold"
              />
              <small>
                Show warning when daily spend exceeds this percentage of daily limit.
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeSettings()">Close</button>
            <button class="btn btn-primary" (click)="saveSettings()">Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .petty-cash-container {
        min-height: 100vh;
        background: #f5f7fa;
      }

      /* Header */
      .page-header {
        background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
        color: white;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .back-btn,
      .icon-btn {
        background: rgba(255, 255, 255, 0.2);
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
        background: rgba(255, 255, 255, 0.3);
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
        background: rgba(255, 255, 255, 0.15);
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

      /* Selection Section */
      .selection-section {
        background: white;
        padding: 20px 24px;
        margin: 24px 24px 0;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .selection-controls {
        display: flex;
        gap: 16px;
        align-items: flex-end;
        flex-wrap: wrap;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .control-group label {
        font-size: 12px;
        font-weight: 600;
        color: #7f8c8d;
        text-transform: uppercase;
      }

      .required {
        color: #e74c3c;
      }

      .control-group input,
      .control-group select {
        padding: 8px 12px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        min-width: 160px;
      }

      .control-group input:focus,
      .control-group select:focus {
        border-color: #e67e22;
      }

      /* Summary Cards */
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        padding: 24px;
      }

      .summary-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .summary-card.balance .card-icon {
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      }

      .summary-card.debits .card-icon {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      }

      .summary-card.credits .card-icon {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      }

      .summary-card.approvals .card-icon {
        background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
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
        font-size: 22px;
        font-weight: 700;
        color: #2c3e50;
      }

      .card-hint {
        font-size: 11px;
        margin-top: 4px;
        color: #7f8c8d;
      }

      /* Transactions */
      .transactions-section {
        padding: 0 24px 24px;
      }

      .table-header {
        background: white;
        padding: 16px 20px;
        border-radius: 12px 12px 0 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .table-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
      }

      .table-wrapper {
        background: white;
        border-radius: 0 0 12px 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow-x: auto;
      }

      .transactions-table {
        width: 100%;
        border-collapse: collapse;
      }

      .transactions-table thead {
        background: #f8f9fa;
      }

      .transactions-table th {
        padding: 12px 16px;
        text-align: left;
        font-size: 12px;
        font-weight: 600;
        color: #7f8c8d;
        text-transform: uppercase;
      }

      .transactions-table td {
        padding: 10px 16px;
        border-top: 1px solid #f0f0f0;
        font-size: 14px;
        color: #2c3e50;
      }

      .transactions-table tbody tr:hover {
        background: #f8f9fa;
      }

      .transactions-table tbody tr.debit {
        background: #fff8f6;
      }

      .transactions-table tbody tr.credit {
        background: #f6fbff;
      }

      .transactions-table tbody tr.pending {
        border-left: 4px solid #f39c12;
      }

      .description {
        max-width: 260px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .category-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .category-badge.office-supplies {
        background: #e7f3ff;
        color: #2980b9;
      }

      .category-badge.maintenance {
        background: #e8f8f0;
        color: #1e9e5a;
      }

      .category-badge.travel {
        background: #fff4e6;
        color: #e67e22;
      }

      .category-badge.utilities {
        background: #ffeaea;
        color: #e74c3c;
      }

      .category-badge.staff-welfare {
        background: #f5e6ff;
        color: #8e44ad;
      }

      .type-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .type-badge.debit {
        background: #ffeaea;
        color: #e74c3c;
      }

      .type-badge.credit {
        background: #e8f8f0;
        color: #1e9e5a;
      }

      .amount {
        text-align: right;
        font-weight: 600;
      }

      .amount.debit {
        color: #e74c3c;
      }

      .amount.credit {
        color: #1e9e5a;
      }

      .status-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-badge.pending {
        background: #fff4e6;
        color: #e67e22;
      }

      .status-badge.approved {
        background: #e8f8f0;
        color: #1e9e5a;
      }

      .status-badge.rejected {
        background: #ffeaea;
        color: #e74c3c;
      }

      .status-badge.posted {
        background: #e7f3ff;
        color: #2980b9;
      }

      .empty-state {
        text-align: center;
        padding: 24px;
        color: #7f8c8d;
      }

      .action-buttons {
        display: flex;
        gap: 4px;
      }

      .action-btn {
        width: 30px;
        height: 30px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .action-btn.view {
        background: #f5f7fa;
        color: #7f8c8d;
      }

      .action-btn.approve {
        background: #e8f8f0;
        color: #1e9e5a;
      }

      .action-btn:hover {
        transform: scale(1.05);
      }

      /* Buttons */
      .btn {
        padding: 10px 18px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
      }

      .btn-primary {
        background: #e67e22;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #d35400;
      }

      .btn-secondary {
        background: #95a5a6;
        color: white;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #7f8c8d;
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
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

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
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
        padding: 16px 20px 0;
      }

      .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid #e9ecef;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      .form-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .form-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .form-group.full-width {
        flex: 0 0 100%;
      }

      .form-group label {
        font-size: 13px;
        font-weight: 500;
        color: #2c3e50;
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        padding: 8px 10px;
        border-radius: 8px;
        border: 2px solid #e9ecef;
        font-size: 14px;
        outline: none;
      }

      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        border-color: #e67e22;
      }

      .form-group small {
        font-size: 11px;
        color: #7f8c8d;
      }

      @media (max-width: 1024px) {
        .transactions-table {
          min-width: 1000px;
        }
      }

      @media (max-width: 768px) {
        .selection-controls {
          flex-direction: column;
          align-items: stretch;
        }

        .summary-cards {
          padding: 16px;
        }

        .transactions-section {
          padding: 0 16px 16px;
        }
      }
    `,
  ],
})
export class PettyCashComponent implements OnInit, OnDestroy {
  // Expose Math for use in templates if needed later
  Math = Math;

  ledgers: PettyCashLedger[] = [];
  selectedLedgerId: string = '';
  selectedLedger: PettyCashLedger | null = null;

  transactions: PettyCashTransaction[] = [];
  filteredTransactions: PettyCashTransaction[] = [];
  summary: PettyCashSummary = {
    totalDebits: 0,
    totalCredits: 0,
    netOutflow: 0,
    remainingBalance: 0,
    pendingApprovals: 0,
    todaysSpend: 0,
  };

  fromDate: string = '';
  toDate: string = '';
  searchTerm: string = '';

  selection: { [id: string]: boolean } = {};

  showVoucherModal: boolean = false;
  showSettings: boolean = false;

  dailyAlertThreshold: number = 80;
  loadError = '';
  loading = false;

  voucherFormModel: {
    date: string;
    voucherNumber: string;
    description: string;
    category: PettyCashTransaction['category'];
    type: PettyCashTransaction['type'];
    amount: number;
    requestedBy: string;
    remarks?: string;
  } = {
    date: '',
    voucherNumber: '',
    description: '',
    category: 'office-supplies',
    type: 'debit',
    amount: 0,
    requestedBy: '',
    remarks: '',
  };

  private destroy$ = new Subject<void>();
  private session = inject(SessionContextService);
  private pettyCashService = inject(PettyCashService);

  constructor() {
    // Initialize default dates to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.fromDate = firstDay.toISOString().split('T')[0];
    this.toDate = lastDay.toISOString().split('T')[0];
    this.loadSettings();
  }

  ngOnInit(): void {
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load ledgers and vouchers from API. */
  loadData(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.loading = true;
    this.loadError = '';
    this.pettyCashService
      .listLedgers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ledgers => {
          this.ledgers = ledgers;
          if (!this.selectedLedgerId && ledgers.length > 0) {
            this.selectedLedgerId = ledgers[0].id;
          }
          this.onLedgerChange();
          this.loadVouchers();
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Failed to load petty cash ledgers from the API. Ensure the backend is running.';
        }
      });
  }

  /** Load vouchers for the selected ledger. */
  loadVouchers(): void {
    if (!this.session.getSocietyId() || !this.selectedLedgerId) {
      this.loading = false;
      return;
    }
    this.pettyCashService
      .listVouchers(this.selectedLedgerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: vouchers => {
          this.transactions = vouchers;
          this.filterTransactions();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.loadError = 'Failed to load petty cash vouchers from the API.';
        }
      });
  }

  /**
   * Handle ledger change and recompute summary
   */
  onLedgerChange(): void {
    this.selectedLedger = this.ledgers.find((l) => l.id === this.selectedLedgerId) || null;
    this.selection = {};
    if (this.selectedLedgerId) {
      this.loadVouchers();
    } else {
      this.filteredTransactions = [];
      this.updateSummary();
    }
  }

  /**
   * Filter transactions based on ledger, dates, and search term
   */
  filterTransactions(): void {
    if (!this.selectedLedger) {
      this.filteredTransactions = [];
      this.updateSummary();
      return;
    }

    const from = this.fromDate ? new Date(this.fromDate) : null;
    const to = this.toDate ? new Date(this.toDate) : null;

    const term = this.searchTerm.trim().toLowerCase();

    this.filteredTransactions = this.transactions.filter((tx) => {
      if (tx.ledgerId !== this.selectedLedgerId) {
        return false;
      }

      if (from && tx.date < from) {
        return false;
      }

      if (to && tx.date > to) {
        return false;
      }

      if (term) {
        const combined =
          `${tx.description} ${tx.voucherNumber} ${tx.requestedBy} ${tx.approvedBy || ''}`.toLowerCase();
        if (!combined.includes(term)) {
          return false;
        }
      }

      return true;
    });

    this.updateSummary();
  }

  /**
   * Reset all filters to defaults
   */
  resetFilters(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.fromDate = firstDay.toISOString().split('T')[0];
    this.toDate = lastDay.toISOString().split('T')[0];
    this.searchTerm = '';
    this.filterTransactions();
  }

  /**
   * Update petty cash summary for current ledger and filters
   */
  updateSummary(): void {
    if (!this.selectedLedger) {
      this.summary = {
        totalDebits: 0,
        totalCredits: 0,
        netOutflow: 0,
        remainingBalance: 0,
        pendingApprovals: 0,
        todaysSpend: 0,
      };
      return;
    }

    const isCounted = (tx: PettyCashTransaction) =>
      tx.status === 'approved' || tx.status === 'posted';

    const totalDebits = this.filteredTransactions
      .filter((tx) => tx.type === 'debit' && isCounted(tx))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalCredits = this.filteredTransactions
      .filter((tx) => tx.type === 'credit' && isCounted(tx))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const netOutflow = totalDebits - totalCredits;

    const remainingBalance = this.selectedLedger.currentBalance;

    const pendingApprovals = this.filteredTransactions.filter(
      (tx) => tx.status === 'pending'
    ).length;

    const today = new Date();
    const todaysSpend = this.filteredTransactions
      .filter(
        (tx) =>
          tx.type === 'debit' &&
          isCounted(tx) &&
          tx.date.toDateString() === today.toDateString()
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    this.summary = {
      totalDebits,
      totalCredits,
      netOutflow,
      remainingBalance,
      pendingApprovals,
      todaysSpend,
    };

    this.checkDailyAlert();
  }

  /**
   * Check if daily spend exceeds configured alert threshold
   */
  checkDailyAlert(): void {
    if (!this.selectedLedger || !this.selectedLedger.dailyLimit) {
      return;
    }

    const thresholdAmount =
      (this.selectedLedger.dailyLimit * this.dailyAlertThreshold) / 100;

    if (this.summary.todaysSpend > thresholdAmount) {
      // Simple alert; replace with toast/notification in real app
      console.warn(
        'Daily petty cash spend has exceeded the configured alert threshold.'
      );
    }
  }

  /**
   * Open new voucher modal with default values
   */
  openNewVoucherModal(): void {
    if (!this.selectedLedgerId) {
      alert('Please select a petty cash ledger first.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    this.voucherFormModel = {
      date: today,
      voucherNumber: '',
      description: '',
      category: 'office-supplies',
      type: 'debit',
      amount: 0,
      requestedBy: '',
      remarks: '',
    };

    this.showVoucherModal = true;
  }

  /**
   * Close voucher modal
   */
  closeVoucherModal(): void {
    this.showVoucherModal = false;
  }

  /**
   * Validate if voucher can be saved
   */
  canSaveVoucher(): boolean {
    const v = this.voucherFormModel;
    return !!(
      v.date &&
      v.description.trim() &&
      v.amount > 0 &&
      v.requestedBy.trim()
    );
  }

  /**
   * Save new petty cash voucher into the ledger
   */
  saveVoucher(): void {
    if (!this.canSaveVoucher() || !this.selectedLedgerId) {
      return;
    }

    const v = this.voucherFormModel;
    this.pettyCashService
      .createVoucher({
        ledgerId: this.selectedLedgerId,
        date: v.date,
        voucherNumber: v.voucherNumber || undefined,
        description: v.description.trim(),
        category: v.category,
        type: v.type,
        amount: v.amount,
        requestedBy: v.requestedBy.trim(),
        remarks: v.remarks?.trim()
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showVoucherModal = false;
          this.loadData();
        },
        error: () => {
          alert('Failed to save petty cash voucher.');
        }
      });
  }

  /**
   * Check if any visible pending vouchers are selected
   */
  hasSelectedPending(): boolean {
    return this.filteredTransactions.some(
      (tx) => tx.status === 'pending' && this.selection[tx.id]
    );
  }

  /**
   * Approve a single voucher
   */
  approveVoucher(tx: PettyCashTransaction): void {
    if (tx.status !== 'pending') {
      return;
    }
    this.pettyCashService
      .approveVoucher(tx.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loadData(),
        error: () => alert('Failed to approve voucher.')
      });
  }

  approveSelected(): void {
    const ids = this.filteredTransactions
      .filter((tx) => tx.status === 'pending' && this.selection[tx.id])
      .map((tx) => tx.id);

    if (ids.length === 0) {
      return;
    }

    this.pettyCashService
      .approveVouchers(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (approved) => {
          alert(`Approved ${approved.length} petty cash voucher(s).`);
          this.selection = {};
          this.loadData();
        },
        error: () => alert('Failed to approve selected vouchers.')
      });
  }

  /**
   * Determine if all visible pending vouchers are selected
   */
  allVisibleSelected(): boolean {
    const visiblePending = this.filteredTransactions.filter(
      (tx) => tx.status === 'pending'
    );
    if (visiblePending.length === 0) {
      return false;
    }
    return visiblePending.every((tx) => this.selection[tx.id]);
  }

  /**
   * Toggle select all for visible pending vouchers
   */
  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredTransactions.forEach((tx) => {
      if (tx.status === 'pending') {
        this.selection[tx.id] = checked;
      }
    });
  }

  /**
   * View voucher details (placeholder for future detailed view)
   */
  viewVoucher(tx: PettyCashTransaction): void {
    console.log('Petty cash voucher details:', tx);
  }

  /**
   * Open settings modal
   */
  openSettings(): void {
    this.showSettings = true;
  }

  /**
   * Close settings modal
   */
  closeSettings(): void {
    this.showSettings = false;
  }

  /**
   * Save petty cash settings to local storage
   */
  saveSettings(): void {
    localStorage.setItem(
      'petty_cash_settings',
      JSON.stringify({
        dailyAlertThreshold: this.dailyAlertThreshold,
      })
    );
    this.showSettings = false;
    this.checkDailyAlert();
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('petty_cash_settings');
    if (!stored) {
      return;
    }
    try {
      const settings = JSON.parse(stored);
      if (settings.dailyAlertThreshold !== undefined) {
        this.dailyAlertThreshold = settings.dailyAlertThreshold;
      }
    } catch {
      // ignore invalid stored settings
    }
  }

  exportLedger(): void {
    const data = {
      ledger: this.selectedLedger,
      summary: this.summary,
      vouchers: this.filteredTransactions
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petty-cash-${this.selectedLedgerId || 'ledger'}-${this.fromDate}-${this.toDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Print petty cash ledger (browser print)
   */
  printLedger(): void {
    window.print();
  }

  /**
   * Get human-readable label for category
   */
  getCategoryLabel(category: PettyCashTransaction['category']): string {
    const labels: { [key: string]: string } = {
      'office-supplies': 'Office Supplies',
      maintenance: 'Maintenance',
      travel: 'Travel',
      utilities: 'Utilities',
      'staff-welfare': 'Staff Welfare',
      other: 'Other',
    };
    return labels[category] || category;
  }

  /**
   * Get human-readable label for voucher status
   */
  getStatusLabel(status: PettyCashTransaction['status']): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      posted: 'Posted to Ledger',
    };
    return labels[status] || status;
  }

  /**
   * Format currency values as INR with no decimals
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  /**
   * Format date values for display
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  /**
   * Navigate back to previous page
   */
  goBack(): void {
    window.history.back();
  }
}




