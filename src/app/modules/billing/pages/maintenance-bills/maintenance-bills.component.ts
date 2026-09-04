import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillDocumentDownloadService } from '../../../../core/services/bill-document-download.service';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { MaintenanceBillService } from '../../services/maintenance-bill.service';
import {
  AutomationSettings,
  BillTemplate,
  MaintenanceBill
} from '../../models/maintenance-bill.model';

/**
 * Automated Monthly Maintenance Bills Component
 * Handles automated generation and distribution of monthly maintenance bills
 */

@Component({
  selector: 'app-maintenance-bills',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="maintenance-bills-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">autorenew</i>
            Automated Monthly Maintenance Bills
          </h1>
          <p>Automated generation and distribution of maintenance bills</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/maintenance-bills</strong> API — bills generated from society flats.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showSettings = true" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="showGenerateModal = true" title="Generate Bills">
            <i class="material-icons">add</i>
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
            <div class="stat-value">{{ totalBills }}</div>
            <div class="stat-label">Total Bills</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingBills.length }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card paid">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ paidBills.length }}</div>
            <div class="stat-label">Paid</div>
          </div>
        </div>
        <div class="stat-card overdue">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overdueBills.length }}</div>
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
            placeholder="Search by resident name, flat number, or bill number..." 
            [(ngModel)]="searchQuery"
            (input)="filterBills()"
          />
        </div>
        <select [(ngModel)]="statusFilter" (change)="filterBills()" class="filter-select">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="generated">Generated</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select [(ngModel)]="monthFilter" (change)="filterBills()" class="filter-select">
          <option value="all">All Months</option>
          <option *ngFor="let month of availableMonths" [value]="month">{{ formatMonth(month) }}</option>
        </select>
      </div>

      <!-- Bills Table -->
      <div class="bills-table-container">
        <table class="bills-table">
          <thead>
            <tr>
              <th>Bill Number</th>
              <th>Resident</th>
              <th>Flat</th>
              <th>Month</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let bill of filteredBills" [class.overdue]="bill.status === 'overdue'">
              <td>
                <strong>{{ bill.billNumber }}</strong>
              </td>
              <td>{{ bill.residentName }}</td>
              <td>{{ bill.flatNumber }}<span *ngIf="bill.building">, {{ bill.building }}</span></td>
              <td>{{ formatMonth(bill.billMonth) }}</td>
              <td class="amount">{{ formatCurrency(bill.totalAmount) }}</td>
              <td class="amount paid">{{ formatCurrency(bill.paidAmount) }}</td>
              <td class="amount" [class.overdue]="bill.balance > 0">{{ formatCurrency(bill.balance) }}</td>
              <td>{{ formatDate(bill.dueDate) }}</td>
              <td>
                <span class="status-badge" [ngClass]="bill.status">
                  {{ getStatusLabel(bill.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" (click)="viewBill(bill)" title="View Details">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button class="action-btn edit" (click)="editBill(bill)" title="Edit" *ngIf="bill.status === 'draft'">
                    <i class="material-icons">edit</i>
                  </button>
                  <button class="action-btn send" (click)="sendBill(bill)" title="Send" *ngIf="bill.status === 'generated'">
                    <i class="material-icons">send</i>
                  </button>
                  <button class="action-btn download" (click)="downloadBill(bill)" title="Download PDF">
                    <i class="material-icons">download</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredBills.length === 0">
          <i class="material-icons">receipt_long</i>
          <p>No bills found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
        </div>
      </div>

      <!-- Bill Details Modal -->
      <div class="modal-overlay" *ngIf="selectedBill" (click)="closeBillDetails()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Bill Details - {{ selectedBill.billNumber }}</h2>
            <button class="close-btn" (click)="closeBillDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedBill">
            <div class="bill-header">
              <div class="bill-info">
                <h3>{{ selectedBill.residentName }}</h3>
                <p>{{ selectedBill.flatNumber }}<span *ngIf="selectedBill.building">, {{ selectedBill.building }}</span></p>
                <p>Bill Month: <strong>{{ formatMonth(selectedBill.billMonth) }}</strong></p>
              </div>
              <div class="bill-status">
                <span class="status-badge large" [ngClass]="selectedBill.status">
                  {{ getStatusLabel(selectedBill.status) }}
                </span>
              </div>
            </div>

            <div class="bill-items">
              <h4>Bill Items</h4>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of selectedBill.items">
                    <td>{{ item.category }}</td>
                    <td>{{ item.description }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ formatCurrency(item.rate) }}</td>
                    <td class="amount">{{ formatCurrency(item.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="bill-summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>{{ formatCurrency(selectedBill.amount) }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedBill.previousBalance > 0">
                <span>Previous Balance:</span>
                <span>{{ formatCurrency(selectedBill.previousBalance) }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedBill.adjustments !== 0">
                <span>Adjustments:</span>
                <span [ngClass]="selectedBill.adjustments > 0 ? 'positive' : 'negative'">
                  {{ formatCurrency(selectedBill.adjustments) }}
                </span>
              </div>
              <div class="summary-row total">
                <span>Total Amount:</span>
                <span>{{ formatCurrency(selectedBill.totalAmount) }}</span>
              </div>
              <div class="summary-row" *ngIf="selectedBill.paidAmount > 0">
                <span>Paid Amount:</span>
                <span class="paid">{{ formatCurrency(selectedBill.paidAmount) }}</span>
              </div>
              <div class="summary-row balance">
                <span>Balance:</span>
                <span [ngClass]="selectedBill.balance > 0 ? 'overdue' : 'paid'">
                  {{ formatCurrency(selectedBill.balance) }}
                </span>
              </div>
            </div>

            <div class="bill-dates">
              <div class="date-row">
                <span>Bill Date:</span>
                <span>{{ formatDateTime(selectedBill.billDate) }}</span>
              </div>
              <div class="date-row">
                <span>Due Date:</span>
                <span [ngClass]="isOverdue(selectedBill.dueDate) ? 'overdue' : ''">
                  {{ formatDateTime(selectedBill.dueDate) }}
                </span>
              </div>
              <div class="date-row" *ngIf="selectedBill.paymentDate">
                <span>Payment Date:</span>
                <span>{{ formatDateTime(selectedBill.paymentDate) }}</span>
              </div>
            </div>

            <div class="bill-notes" *ngIf="selectedBill.notes">
              <h4>Notes</h4>
              <p>{{ selectedBill.notes }}</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeBillDetails()">Close</button>
            <button class="btn btn-primary" (click)="downloadBill(selectedBill!)">
              <i class="material-icons">download</i>
              Download PDF
            </button>
            <button class="btn btn-success" (click)="sendBill(selectedBill!)" *ngIf="selectedBill?.status === 'generated'">
              <i class="material-icons">send</i>
              Send Bill
            </button>
          </div>
        </div>
      </div>

      <!-- Generate Bills Modal -->
      <div class="modal-overlay" *ngIf="showGenerateModal" (click)="showGenerateModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Generate Monthly Bills</h2>
            <button class="close-btn" (click)="showGenerateModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Bill Month <span class="required">*</span></label>
              <input type="month" [(ngModel)]="generateMonth" [min]="getCurrentMonth()" />
            </div>
            <div class="form-group">
              <label>Bill Template</label>
              <select [(ngModel)]="selectedTemplate">
                <option value="">Default Template</option>
                <option *ngFor="let template of billTemplates" [value]="template.id">
                  {{ template.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="autoSend" />
                Automatically send bills after generation
              </label>
            </div>
            <div class="info-box">
              <i class="material-icons">info</i>
              <p>Bills will be generated for all active residents. Existing bills for the selected month will be skipped.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showGenerateModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="generateBills()" [disabled]="!generateMonth || isGenerating">
              <i class="material-icons">autorenew</i>
              {{ isGenerating ? 'Generating...' : 'Generate Bills' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="showSettings = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Automation Settings</h2>
            <button class="close-btn" (click)="showSettings = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="automationSettings.autoGenerate" />
                Enable automatic bill generation
              </label>
            </div>
            <div class="form-group" *ngIf="automationSettings.autoGenerate">
              <label>Generation Day <span class="required">*</span></label>
              <input type="number" [(ngModel)]="automationSettings.generationDay" min="1" max="28" />
              <small>Day of month to automatically generate bills (1-28)</small>
            </div>
            <div class="form-group">
              <label>Due Date Day <span class="required">*</span></label>
              <input type="number" [(ngModel)]="automationSettings.dueDateDay" min="1" max="31" />
              <small>Day of month for bill due date</small>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="automationSettings.sendNotifications" />
                Send email/SMS notifications
              </label>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="automationSettings.sendReminders" />
                Send payment reminders
              </label>
            </div>
            <div class="form-group" *ngIf="automationSettings.sendReminders">
              <label>Reminder Days</label>
              <input type="text" [(ngModel)]="reminderDaysInput" placeholder="e.g., 7,3,1" />
              <small>Days before due date to send reminders (comma-separated)</small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showSettings = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveSettings()">
              <i class="material-icons">save</i>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .maintenance-bills-container {
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
    .bills-table-container {
      padding: 0 24px 24px;
    }

    .bills-table {
      width: 100%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .bills-table thead {
      background: #f8f9fa;
    }

    .bills-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .bills-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .bills-table tr.overdue {
      background: #fff5f5;
    }

    .bills-table tr:hover {
      background: #f8f9fa;
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
    .status-badge.generated { background: #e7f3ff; color: #2980b9; }
    .status-badge.sent { background: #fff4e6; color: #e67e22; }
    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.overdue { background: #ffeaea; color: #c0392b; }
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

    .bill-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .bill-info h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .bill-info p {
      margin: 4px 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    .bill-items {
      margin-bottom: 24px;
    }

    .bill-items h4 {
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

    .bill-summary {
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

    .summary-row .positive {
      color: #2ed573;
    }

    .summary-row .negative {
      color: #e74c3c;
    }

    .bill-dates {
      margin-bottom: 24px;
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

    .bill-notes {
      padding: 16px;
      background: #fffbf0;
      border-radius: 8px;
      border-left: 4px solid #f39c12;
    }

    .bill-notes h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .bill-notes p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
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
    .form-group select {
      width: 100%;
      padding: 10px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #3498db;
    }

    .form-group small {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #95a5a6;
    }

    .info-box {
      padding: 12px;
      background: #e7f3ff;
      border-radius: 8px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 16px;
    }

    .info-box i {
      color: #2980b9;
      margin-top: 2px;
    }

    .info-box p {
      margin: 0;
      font-size: 13px;
      color: #2980b9;
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

      .bills-table-container {
        padding: 0 16px 16px;
        overflow-x: auto;
      }

      .bills-table {
        min-width: 1000px;
      }
    }
  `]
})
export class MaintenanceBillsComponent implements OnInit, OnDestroy {
  bills: MaintenanceBill[] = [];
  filteredBills: MaintenanceBill[] = [];
  selectedBill: MaintenanceBill | null = null;
  billTemplates: BillTemplate[] = [];
  searchQuery: string = '';
  statusFilter: string = 'all';
  monthFilter: string = 'all';
  showGenerateModal: boolean = false;
  showSettings: boolean = false;
  isGenerating: boolean = false;
  generateMonth: string = '';
  selectedTemplate: string = '';
  autoSend: boolean = false;
  reminderDaysInput: string = '7,3,1';
  loadError = '';
  isLoading = false;

  automationSettings: AutomationSettings = {
    autoGenerate: true,
    generationDay: 1,
    dueDateDay: 10,
    sendNotifications: true,
    sendReminders: true,
    reminderDays: [7, 3, 1]
  };

  private destroy$ = new Subject<void>();

  private billDownload = inject(BillDocumentDownloadService);
  private billService = inject(MaintenanceBillService);
  private session = inject(SessionContextService);

  constructor() {}

  ngOnInit(): void {
    this.loadBills();
    this.loadTemplates();
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load bills from API
   */
  loadBills(): void {
    this.loadError = '';
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.bills = [];
      this.filteredBills = [];
      return;
    }

    this.isLoading = true;
    this.billService.getAllBills()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bills) => {
          this.bills = bills;
          this.filterBills();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading bills:', error);
          this.loadError = 'Failed to load maintenance bills from the API. Ensure the backend is running.';
          this.bills = [];
          this.filteredBills = [];
          this.isLoading = false;
        }
      });
  }

  /**
   * Load bill templates from API
   */
  loadTemplates(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.billService.getTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          this.billTemplates = templates;
        },
        error: (error) => {
          console.error('Error loading templates:', error);
        }
      });
  }

  /**
   * Load automation settings from API
   */
  loadSettings(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.billService.getAutomationSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.automationSettings = settings;
          this.reminderDaysInput = this.automationSettings.reminderDays.join(',');
        },
        error: (error) => {
          console.error('Error loading settings:', error);
        }
      });
  }

  /**
   * Filter bills
   */
  filterBills(): void {
    let filtered = [...this.bills];

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === this.statusFilter);
    }

    // Apply month filter
    if (this.monthFilter !== 'all') {
      filtered = filtered.filter(b => b.billMonth === this.monthFilter);
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.residentName.toLowerCase().includes(query) ||
        b.flatNumber.toLowerCase().includes(query) ||
        b.billNumber.toLowerCase().includes(query)
      );
    }

    // Sort by bill date (newest first)
    filtered.sort((a, b) => b.billDate.getTime() - a.billDate.getTime());

    this.filteredBills = filtered;
  }

  /**
   * Get available months
   */
  get availableMonths(): string[] {
    const months = new Set(this.bills.map(b => b.billMonth));
    return Array.from(months).sort().reverse();
  }

  /**
   * Get pending bills
   */
  get pendingBills(): MaintenanceBill[] {
    return this.bills.filter(b => b.status === 'sent' || b.status === 'generated');
  }

  /**
   * Get paid bills
   */
  get paidBills(): MaintenanceBill[] {
    return this.bills.filter(b => b.status === 'paid');
  }

  /**
   * Get overdue bills
   */
  get overdueBills(): MaintenanceBill[] {
    return this.bills.filter(b => b.status === 'overdue');
  }

  /**
   * Get total bills count
   */
  get totalBills(): number {
    return this.bills.length;
  }

  /**
   * Get total amount
   */
  get totalAmount(): number {
    return this.bills.reduce((sum, b) => sum + b.totalAmount, 0);
  }

  /**
   * Get collected amount
   */
  get collectedAmount(): number {
    return this.bills.reduce((sum, b) => sum + b.paidAmount, 0);
  }

  /**
   * View bill details
   */
  viewBill(bill: MaintenanceBill): void {
    this.selectedBill = bill;
  }

  /**
   * Close bill details
   */
  closeBillDetails(): void {
    this.selectedBill = null;
  }

  /**
   * Edit bill
   */
  editBill(bill: MaintenanceBill): void {
    // In real app, navigate to edit page
    console.log('Edit bill:', bill);
  }

  /**
   * Send bill via API
   */
  sendBill(bill: MaintenanceBill): void {
    this.billService.sendBill(bill.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.bills.findIndex(b => b.id === updated.id);
          if (idx >= 0) {
            this.bills[idx] = updated;
          }
          if (this.selectedBill?.id === updated.id) {
            this.selectedBill = updated;
          }
          this.filterBills();
          window.alert('Bill sent successfully!');
        },
        error: (error) => {
          console.error('Error sending bill:', error);
          window.alert('Failed to send bill. Ensure the backend is running.');
        }
      });
  }

  /**
   * Download bill
   */
  downloadBill(bill: MaintenanceBill): void {
    this.billDownload.downloadBillPdf({
      documentTitle: 'Maintenance Bill',
      documentNumber: bill.billNumber,
      recipientName: bill.residentName,
      flatNumber: bill.flatNumber,
      building: bill.building,
      issueDate: bill.billDate,
      dueDate: bill.dueDate,
      status: bill.status,
      lineItems: (bill.items ?? []).map(item => ({
        description: item.description || item.category,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      })),
      summaryRows: [
        { label: 'Bill month', value: bill.billMonth },
        { label: 'Previous balance', value: this.formatCurrency(bill.previousBalance) },
        { label: 'Adjustments', value: this.formatCurrency(bill.adjustments) }
      ],
      totalAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      balance: bill.balance,
      notes: bill.notes
    });
  }

  /**
   * Generate bills for all occupied flats via API
   */
  generateBills(): void {
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }
    if (!this.generateMonth) {
      return;
    }

    this.isGenerating = true;
    this.billService.generateBills({
      billMonth: this.generateMonth,
      templateId: this.selectedTemplate || undefined,
      autoSend: this.autoSend,
      dueDateDay: this.automationSettings.dueDateDay
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.isGenerating = false;
          this.showGenerateModal = false;
          window.alert(
            created.length > 0
              ? `Generated ${created.length} bill(s) for ${this.formatMonth(this.generateMonth)}.`
              : `No new bills created — bills may already exist for ${this.formatMonth(this.generateMonth)} or no occupied flats found.`
          );
          this.loadBills();
        },
        error: (error) => {
          console.error('Error generating bills:', error);
          this.isGenerating = false;
          window.alert('Failed to generate bills. Ensure the backend is running and flats exist in Society Setup.');
        }
      });
  }

  /**
   * Save automation settings via API
   */
  saveSettings(): void {
    this.automationSettings.reminderDays = this.reminderDaysInput
      .split(',')
      .map(d => parseInt(d.trim(), 10))
      .filter(d => !isNaN(d));

    this.billService.saveAutomationSettings(this.automationSettings)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.automationSettings = settings;
          this.reminderDaysInput = settings.reminderDays.join(',');
          this.showSettings = false;
          window.alert('Settings saved successfully!');
        },
        error: (error) => {
          console.error('Error saving settings:', error);
          window.alert('Failed to save settings. Ensure the backend is running.');
        }
      });
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
   * Format month
   */
  formatMonth(month: string): string {
    if (!month) return '';
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  /**
   * Get current month
   */
  getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

