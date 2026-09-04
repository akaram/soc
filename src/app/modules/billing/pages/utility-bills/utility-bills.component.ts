import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillDocumentDownloadService } from '../../../../core/services/bill-document-download.service';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { UtilityBillService } from '../../services/utility-bill.service';
import {
  MeterReading,
  UtilityBill,
  UtilityRate,
  UtilityType
} from '../../models/utility-bill.model';

/**
 * Utility Bills Component
 * Handles electricity, water, gas, and other utility bills
 */

@Component({
  selector: 'app-utility-bills',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="utility-bills-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">bolt</i>
            Utility Bills
          </h1>
          <p>Manage electricity, water, gas, and other utility bills</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/utility-bills</strong>, <strong>/utility-meter-readings</strong>, and <strong>/utility-rates</strong> APIs.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showMeterReading = true" title="Add Meter Reading">
            <i class="material-icons">speed</i>
          </button>
          <button class="icon-btn" (click)="showRateSettings = true" title="Rate Settings">
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
        <div class="stat-card electricity">
          <div class="stat-icon">
            <i class="material-icons">bolt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ electricityBills.length }}</div>
            <div class="stat-label">Electricity</div>
          </div>
        </div>
        <div class="stat-card water">
          <div class="stat-icon">
            <i class="material-icons">water_drop</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ waterBills.length }}</div>
            <div class="stat-label">Water</div>
          </div>
        </div>
        <div class="stat-card gas">
          <div class="stat-icon">
            <i class="material-icons">local_fire_department</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ gasBills.length }}</div>
            <div class="stat-label">Gas</div>
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
        <div class="stat-card amount">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
            <div class="stat-label">Total Amount</div>
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
        <select [(ngModel)]="utilityTypeFilter" (change)="filterBills()" class="filter-select">
          <option value="all">All Utilities</option>
          <option value="electricity">Electricity</option>
          <option value="water">Water</option>
          <option value="gas">Gas</option>
          <option value="internet">Internet</option>
          <option value="cable">Cable</option>
          <option value="other">Other</option>
        </select>
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
              <th>Utility Type</th>
              <th>Month</th>
              <th>Consumption</th>
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
              <td>
                <span class="utility-badge" [ngClass]="bill.utilityType">
                  <i class="material-icons">{{ getUtilityIcon(bill.utilityType) }}</i>
                  {{ getUtilityLabel(bill.utilityType) }}
                </span>
              </td>
              <td>{{ formatMonth(bill.billMonth) }}</td>
              <td>
                <span *ngIf="bill.consumption !== undefined">
                  {{ bill.consumption }} {{ getUnit(bill.utilityType) }}
                </span>
                <span *ngIf="bill.consumption === undefined">-</span>
              </td>
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
          <i class="material-icons">bolt</i>
          <p>No utility bills found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
        </div>
      </div>

      <!-- Bill Details Modal -->
      <div class="modal-overlay" *ngIf="selectedBill" (click)="closeBillDetails()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Utility Bill Details - {{ selectedBill.billNumber }}</h2>
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
                <p>Utility Type: <strong>{{ getUtilityLabel(selectedBill.utilityType) }}</strong></p>
                <p *ngIf="selectedBill.meterNumber">Meter Number: <strong>{{ selectedBill.meterNumber }}</strong></p>
              </div>
              <div class="bill-status">
                <span class="status-badge large" [ngClass]="selectedBill.status">
                  {{ getStatusLabel(selectedBill.status) }}
                </span>
              </div>
            </div>

            <!-- Meter Reading Info -->
            <div class="meter-reading-section" *ngIf="selectedBill.consumption !== undefined">
              <h4>Meter Reading</h4>
              <div class="reading-details">
                <div class="reading-item">
                  <span class="label">Previous Reading:</span>
                  <span class="value">{{ selectedBill.previousReading }} {{ getUnit(selectedBill.utilityType) }}</span>
                </div>
                <div class="reading-item">
                  <span class="label">Current Reading:</span>
                  <span class="value">{{ selectedBill.currentReading }} {{ getUnit(selectedBill.utilityType) }}</span>
                </div>
                <div class="reading-item">
                  <span class="label">Consumption:</span>
                  <span class="value highlight">{{ selectedBill.consumption }} {{ getUnit(selectedBill.utilityType) }}</span>
                </div>
              </div>
            </div>

            <!-- Bill Calculation -->
            <div class="bill-calculation">
              <h4>Bill Calculation</h4>
              <div class="calculation-details">
                <div class="calc-row">
                  <span>Consumption:</span>
                  <span>{{ selectedBill.consumption || 0 }} {{ getUnit(selectedBill.utilityType) }}</span>
                </div>
                <div class="calc-row">
                  <span>Unit Rate:</span>
                  <span>{{ formatCurrency(selectedBill.unitRate) }} per {{ getUnit(selectedBill.utilityType) }}</span>
                </div>
                <div class="calc-row">
                  <span>Consumption Charge:</span>
                  <span>{{ formatCurrency((selectedBill.consumption || 0) * selectedBill.unitRate) }}</span>
                </div>
                <div class="calc-row" *ngIf="selectedBill.baseCharge > 0">
                  <span>Base Charge:</span>
                  <span>{{ formatCurrency(selectedBill.baseCharge) }}</span>
                </div>
                <div class="calc-row">
                  <span>Subtotal:</span>
                  <span>{{ formatCurrency(selectedBill.totalAmount - selectedBill.tax) }}</span>
                </div>
                <div class="calc-row">
                  <span>Tax ({{ (selectedBill.tax / (selectedBill.totalAmount - selectedBill.tax) * 100).toFixed(2) }}%):</span>
                  <span>{{ formatCurrency(selectedBill.tax) }}</span>
                </div>
                <div class="calc-row total">
                  <span>Total Amount:</span>
                  <span>{{ formatCurrency(selectedBill.totalAmount) }}</span>
                </div>
                <div class="calc-row" *ngIf="selectedBill.paidAmount > 0">
                  <span>Paid Amount:</span>
                  <span class="paid">{{ formatCurrency(selectedBill.paidAmount) }}</span>
                </div>
                <div class="calc-row balance">
                  <span>Balance:</span>
                  <span [ngClass]="selectedBill.balance > 0 ? 'overdue' : 'paid'">
                    {{ formatCurrency(selectedBill.balance) }}
                  </span>
                </div>
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
            <h2>Generate Utility Bills</h2>
            <button class="close-btn" (click)="showGenerateModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Utility Type <span class="required">*</span></label>
              <select [(ngModel)]="generateUtilityType" required>
                <option value="">Select Utility Type</option>
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="gas">Gas</option>
                <option value="internet">Internet</option>
                <option value="cable">Cable TV</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Bill Month <span class="required">*</span></label>
              <input type="month" [(ngModel)]="generateMonth" [min]="getCurrentMonth()" required />
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="useMeterReadings" />
                Use meter readings for consumption-based utilities
              </label>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="autoSend" />
                Automatically send bills after generation
              </label>
            </div>
            <div class="info-box">
              <i class="material-icons">info</i>
              <p>Bills will be generated for all active residents. For consumption-based utilities (electricity, water, gas), meter readings are required.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showGenerateModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="generateBills()" [disabled]="!generateUtilityType || !generateMonth || isGenerating">
              <i class="material-icons">autorenew</i>
              {{ isGenerating ? 'Generating...' : 'Generate Bills' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Meter Reading Modal -->
      <div class="modal-overlay" *ngIf="showMeterReading" (click)="showMeterReading = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add Meter Reading</h2>
            <button class="close-btn" (click)="showMeterReading = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Utility Type <span class="required">*</span></label>
              <select [(ngModel)]="newMeterReading.utilityType" required>
                <option value="">Select Utility Type</option>
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="gas">Gas</option>
              </select>
            </div>
            <div class="form-group">
              <label>Flat Number <span class="required">*</span></label>
              <input type="text" [(ngModel)]="newMeterReading.flatNumber" placeholder="e.g., A-101" required />
            </div>
            <div class="form-group">
              <label>Meter Number <span class="required">*</span></label>
              <input type="text" [(ngModel)]="newMeterReading.meterNumber" placeholder="Meter number" required />
            </div>
            <div class="form-group">
              <label>Reading <span class="required">*</span></label>
              <input type="number" [(ngModel)]="newMeterReading.reading" placeholder="Current meter reading" required min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label>Reading Date <span class="required">*</span></label>
              <input type="date" [(ngModel)]="readingDate" required />
            </div>
            <div class="form-group">
              <label>Reading Type</label>
              <select [(ngModel)]="newMeterReading.readingType">
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="newMeterReading.notes" placeholder="Additional notes" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showMeterReading = false">Cancel</button>
            <button class="btn btn-primary" (click)="addMeterReading()" [disabled]="!isMeterReadingValid()">
              <i class="material-icons">save</i>
              Save Reading
            </button>
          </div>
        </div>
      </div>

      <!-- Rate Settings Modal -->
      <div class="modal-overlay" *ngIf="showRateSettings" (click)="showRateSettings = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Utility Rate Settings</h2>
            <button class="close-btn" (click)="showRateSettings = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="rate-tabs">
              <button 
                class="rate-tab" 
                *ngFor="let type of utilityTypes"
                [class.active]="selectedRateType === type"
                (click)="selectedRateType = type; syncCurrentRateFromLoaded()">
                {{ getUtilityLabel(type) }}
              </button>
            </div>

            <div class="rate-form" *ngIf="selectedRateType">
              <div class="form-group">
                <label>Unit Rate (per {{ getUnit(selectedRateType) }}) <span class="required">*</span></label>
                <input type="number" [(ngModel)]="currentRate.unitRate" placeholder="0.00" required min="0" step="0.01" />
              </div>
              <div class="form-group">
                <label>Base Charge <span class="required">*</span></label>
                <input type="number" [(ngModel)]="currentRate.baseCharge" placeholder="0.00" required min="0" step="0.01" />
              </div>
              <div class="form-group">
                <label>Tax Rate (%) <span class="required">*</span></label>
                <input type="number" [(ngModel)]="currentRate.taxRate" placeholder="0.00" required min="0" step="0.01" />
              </div>
              <div class="form-group">
                <label>Effective From <span class="required">*</span></label>
                <input type="date" [(ngModel)]="rateEffectiveFrom" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showRateSettings = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveRate()" [disabled]="!isRateValid()">
              <i class="material-icons">save</i>
              Save Rate
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .utility-bills-container {
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
    .stat-card.electricity .stat-icon { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .stat-card.water .stat-icon { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .stat-card.gas .stat-icon { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .stat-card.pending .stat-icon { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .stat-card.amount .stat-icon { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }

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

    .utility-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .utility-badge .material-icons {
      font-size: 16px;
    }

    .utility-badge.electricity { background: #fff4e6; color: #e67e22; }
    .utility-badge.water { background: #e7f3ff; color: #2980b9; }
    .utility-badge.gas { background: #ffeaea; color: #c0392b; }
    .utility-badge.internet { background: #f4e7ff; color: #8e44ad; }
    .utility-badge.cable { background: #e8f8f0; color: #1e9e5a; }
    .utility-badge.other { background: #f5f7fa; color: #7f8c8d; }

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

    .meter-reading-section,
    .bill-calculation {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .meter-reading-section h4,
    .bill-calculation h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .reading-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reading-item {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: white;
      border-radius: 8px;
    }

    .reading-item .label {
      font-weight: 500;
      color: #7f8c8d;
    }

    .reading-item .value {
      font-weight: 600;
      color: #2c3e50;
    }

    .reading-item .value.highlight {
      color: #f39c12;
      font-size: 18px;
    }

    .calculation-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .calc-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .calc-row.total {
      border-top: 2px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 12px;
      font-weight: 600;
      font-size: 16px;
    }

    .calc-row.balance {
      border-top: 1px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 12px;
      font-weight: 600;
    }

    .calc-row .paid {
      color: #2ed573;
    }

    .calc-row .overdue {
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
      border-color: #f39c12;
    }

    .form-group small {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #95a5a6;
    }

    .info-box {
      padding: 12px;
      background: #fff4e6;
      border-radius: 8px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 16px;
    }

    .info-box i {
      color: #e67e22;
      margin-top: 2px;
    }

    .info-box p {
      margin: 0;
      font-size: 13px;
      color: #e67e22;
    }

    .rate-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 2px solid #e9ecef;
    }

    .rate-tab {
      padding: 12px 20px;
      border: none;
      background: none;
      border-bottom: 3px solid transparent;
      font-size: 14px;
      font-weight: 500;
      color: #7f8c8d;
      cursor: pointer;
      transition: all 0.2s;
    }

    .rate-tab.active {
      color: #f39c12;
      border-bottom-color: #f39c12;
    }

    .rate-tab:hover {
      color: #f39c12;
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
      background: #f39c12;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #e67e22;
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
        min-width: 1200px;
      }
    }
  `]
})
export class UtilityBillsComponent implements OnInit, OnDestroy {
  bills: UtilityBill[] = [];
  filteredBills: UtilityBill[] = [];
  selectedBill: UtilityBill | null = null;
  meterReadings: MeterReading[] = [];
  utilityRates: UtilityRate[] = [];
  searchQuery: string = '';
  utilityTypeFilter: string = 'all';
  statusFilter: string = 'all';
  monthFilter: string = 'all';
  showGenerateModal: boolean = false;
  showMeterReading: boolean = false;
  showRateSettings: boolean = false;
  isGenerating: boolean = false;
  generateUtilityType: string = '';
  generateMonth: string = '';
  useMeterReadings: boolean = true;
  autoSend: boolean = false;
  selectedRateType: string = '';
  rateEffectiveFrom: string = '';
  readingDate: string = '';
  loadError = '';
  isLoading = false;

  newMeterReading: Partial<MeterReading> = {
    utilityType: 'electricity',
    readingType: 'manual',
    readBy: 'admin-001'
  };

  currentRate: Partial<UtilityRate> = {
    unitRate: 0,
    baseCharge: 0,
    taxRate: 0
  };

  utilityTypes: UtilityType[] = ['electricity', 'water', 'gas', 'internet', 'cable'];

  private destroy$ = new Subject<void>();

  private billDownload = inject(BillDocumentDownloadService);
  private utilityBillService = inject(UtilityBillService);
  private session = inject(SessionContextService);

  constructor() {}

  ngOnInit(): void {
    this.loadBills();
    this.loadMeterReadings();
    this.loadRates();
    this.readingDate = new Date().toISOString().split('T')[0];
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
    this.utilityBillService.getAllBills()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bills) => {
          this.bills = bills;
          this.filterBills();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading utility bills:', error);
          this.loadError = 'Failed to load utility bills from the API. Ensure the backend is running.';
          this.bills = [];
          this.filteredBills = [];
          this.isLoading = false;
        }
      });
  }

  /**
   * Load meter readings from API
   */
  loadMeterReadings(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.utilityBillService.getMeterReadings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (readings) => {
          this.meterReadings = readings;
        },
        error: (error) => {
          console.error('Error loading meter readings:', error);
        }
      });
  }

  /**
   * Load utility rates from API
   */
  loadRates(): void {
    if (!this.session.getSocietyId()) {
      return;
    }
    this.utilityBillService.getRates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rates) => {
          this.utilityRates = rates;
          if (!this.selectedRateType && this.utilityTypes.length > 0) {
            this.selectedRateType = this.utilityTypes[0];
          }
          this.syncCurrentRateFromLoaded();
        },
        error: (error) => {
          console.error('Error loading utility rates:', error);
        }
      });
  }

  /** Populate rate form from active rate for selected utility type. */
  syncCurrentRateFromLoaded(): void {
    if (!this.selectedRateType) {
      return;
    }
    const active = this.utilityRates.find(
      r => r.utilityType === this.selectedRateType && r.isActive
    );
    if (active) {
      this.currentRate = {
        unitRate: active.unitRate,
        baseCharge: active.baseCharge,
        taxRate: active.taxRate
      };
      this.rateEffectiveFrom = active.effectiveFrom.toISOString().split('T')[0];
    }
  }

  /**
   * Filter bills
   */
  filterBills(): void {
    let filtered = [...this.bills];

    // Apply utility type filter
    if (this.utilityTypeFilter !== 'all') {
      filtered = filtered.filter(b => b.utilityType === this.utilityTypeFilter);
    }

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
   * Get electricity bills
   */
  get electricityBills(): UtilityBill[] {
    return this.bills.filter(b => b.utilityType === 'electricity');
  }

  /**
   * Get water bills
   */
  get waterBills(): UtilityBill[] {
    return this.bills.filter(b => b.utilityType === 'water');
  }

  /**
   * Get gas bills
   */
  get gasBills(): UtilityBill[] {
    return this.bills.filter(b => b.utilityType === 'gas');
  }

  /**
   * Get pending bills
   */
  get pendingBills(): UtilityBill[] {
    return this.bills.filter(b => b.status === 'sent' || b.status === 'generated');
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
   * View bill details
   */
  viewBill(bill: UtilityBill): void {
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
  editBill(bill: UtilityBill): void {
    // In real app, navigate to edit page
    console.log('Edit bill:', bill);
  }

  /**
   * Send bill via API
   */
  sendBill(bill: UtilityBill): void {
    this.utilityBillService.sendBill(bill.id)
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
  downloadBill(bill: UtilityBill): void {
    this.billDownload.downloadBillPdf({
      documentTitle: `${this.getUtilityLabel(bill.utilityType)} Bill`,
      documentNumber: bill.billNumber,
      recipientName: bill.residentName,
      flatNumber: bill.flatNumber,
      building: bill.building,
      issueDate: bill.billDate,
      dueDate: bill.dueDate,
      status: bill.status,
      lineItems: [
        {
          description: `${this.getUtilityLabel(bill.utilityType)} charges`,
          quantity: bill.consumption,
          rate: bill.unitRate,
          amount: bill.baseCharge
        },
        { description: 'Tax', amount: bill.tax }
      ],
      summaryRows: [
        { label: 'Bill month', value: bill.billMonth },
        { label: 'Meter', value: bill.meterNumber ?? '—' },
        {
          label: 'Readings',
          value: `${bill.previousReading} → ${bill.currentReading} (${bill.consumption} units)`
        }
      ],
      totalAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      balance: bill.balance,
      notes: bill.notes
    });
  }

  /**
   * Generate utility bills via API
   */
  generateBills(): void {
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }
    if (!this.generateUtilityType || !this.generateMonth) {
      return;
    }

    this.isGenerating = true;
    this.utilityBillService.generateBills({
      utilityType: this.generateUtilityType as UtilityType,
      billMonth: this.generateMonth,
      useMeterReadings: this.useMeterReadings,
      autoSend: this.autoSend
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.isGenerating = false;
          this.showGenerateModal = false;
          const label = this.getUtilityLabel(this.generateUtilityType);
          window.alert(
            created.length > 0
              ? `Generated ${created.length} ${label} bill(s) for ${this.formatMonth(this.generateMonth)}.`
              : `No new bills created. Add meter readings for consumption utilities or check if bills already exist for this month.`
          );
          this.loadBills();
        },
        error: (error) => {
          console.error('Error generating bills:', error);
          this.isGenerating = false;
          window.alert('Failed to generate utility bills. Ensure the backend is running and flats exist in Society Setup.');
        }
      });
  }

  /**
   * Add meter reading via API
   */
  addMeterReading(): void {
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }
    if (!this.isMeterReadingValid()) {
      return;
    }

    const reading: Partial<MeterReading> = {
      flatNumber: this.newMeterReading.flatNumber!,
      utilityType: this.newMeterReading.utilityType!,
      meterNumber: this.newMeterReading.meterNumber!,
      reading: this.newMeterReading.reading!,
      readingDate: new Date(this.readingDate),
      readingType: this.newMeterReading.readingType!,
      readBy: this.session.getCurrentUserId() || 'admin',
      notes: this.newMeterReading.notes
    };

    this.utilityBillService.addMeterReading(reading)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showMeterReading = false;
          this.newMeterReading = {
            utilityType: 'electricity',
            readingType: 'manual',
            readBy: this.session.getCurrentUserId() || 'admin'
          };
          this.readingDate = new Date().toISOString().split('T')[0];
          this.loadMeterReadings();
          window.alert('Meter reading added successfully!');
        },
        error: (error) => {
          console.error('Error adding meter reading:', error);
          window.alert('Failed to save meter reading. Ensure the backend is running.');
        }
      });
  }

  /**
   * Check if meter reading is valid
   */
  isMeterReadingValid(): boolean {
    return !!(
      this.newMeterReading.utilityType &&
      this.newMeterReading.flatNumber &&
      this.newMeterReading.meterNumber &&
      this.newMeterReading.reading !== undefined &&
      this.readingDate
    );
  }

  /**
   * Save utility rate via API
   */
  saveRate(): void {
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }
    if (!this.isRateValid()) {
      return;
    }

    this.utilityBillService.saveRate({
      utilityType: this.selectedRateType as UtilityType,
      unitRate: this.currentRate.unitRate!,
      baseCharge: this.currentRate.baseCharge!,
      taxRate: this.currentRate.taxRate!,
      effectiveFrom: new Date(this.rateEffectiveFrom),
      isActive: true
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showRateSettings = false;
          this.loadRates();
          window.alert('Rate saved successfully!');
        },
        error: (error) => {
          console.error('Error saving rate:', error);
          window.alert('Failed to save rate. Ensure the backend is running.');
        }
      });
  }

  /**
   * Check if rate is valid
   */
  isRateValid(): boolean {
    return !!(
      this.selectedRateType &&
      this.currentRate.unitRate !== undefined &&
      this.currentRate.baseCharge !== undefined &&
      this.currentRate.taxRate !== undefined &&
      this.rateEffectiveFrom
    );
  }

  /**
   * Get utility icon
   */
  getUtilityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      electricity: 'bolt',
      water: 'water_drop',
      gas: 'local_fire_department',
      internet: 'wifi',
      cable: 'tv',
      other: 'category'
    };
    return icons[type] || 'category';
  }

  /**
   * Get utility label
   */
  getUtilityLabel(type: string): string {
    const labels: { [key: string]: string } = {
      electricity: 'Electricity',
      water: 'Water',
      gas: 'Gas',
      internet: 'Internet',
      cable: 'Cable TV',
      other: 'Other'
    };
    return labels[type] || 'Other';
  }

  /**
   * Get unit for utility
   */
  getUnit(type: string): string {
    const units: { [key: string]: string } = {
      electricity: 'kWh',
      water: 'Liters',
      gas: 'Units',
      internet: '',
      cable: '',
      other: ''
    };
    return units[type] || '';
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

