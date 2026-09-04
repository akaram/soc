import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillDocumentDownloadService } from '../../../../core/services/bill-document-download.service';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { UtilityBillService } from '../../services/utility-bill.service';
import {
  MeteredBill,
  MeteredMeter,
  MeteredRate,
  MeteredReading
} from '../../models/metered-utility.model';
import {
  buildMetersFromData,
  mapToMeteredBill,
  mapToMeteredRate,
  mapToMeteredReadings,
} from '../../services/metered-utility.mapper';

/**
 * Metered Utilities Billing Component
 * Handles billing for water, electricity, and gas based on meter readings
 */
@Component({
  selector: 'app-metered-utilities-billing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="metered-utilities-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">speed</i>
            Metered Utilities Billing
          </h1>
          <p>Manage billing for water, electricity, and gas based on meter readings</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/utility-bills</strong>, <strong>/utility-meter-readings</strong> &amp; <strong>/utility-rates</strong> APIs.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showRates = true" title="Rates">
            <i class="material-icons">attach_money</i>
            Rates
          </button>
          <button class="icon-btn primary" (click)="showAddReading = true" title="Add Reading">
            <i class="material-icons">add</i>
            Add Reading
          </button>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">speed</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ meters.length }}</div>
            <div class="stat-label">Total Meters</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ bills.length }}</div>
            <div class="stat-label">Total Bills</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingReadingsCount }}</div>
            <div class="stat-label">Pending Readings</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalBillingAmount) }}</div>
            <div class="stat-label">Total Billing</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'meters'"
            (click)="activeTab = 'meters'"
          >
            <i class="material-icons">speed</i>
            Meters
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'readings'"
            (click)="activeTab = 'readings'"
          >
            <i class="material-icons">description</i>
            Meter Readings
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'bills'"
            (click)="activeTab = 'bills'"
          >
            <i class="material-icons">receipt</i>
            Bills
          </button>
        </div>
      </div>

      <!-- Meters Tab -->
      <div class="content-section" *ngIf="activeTab === 'meters'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search meters by number, resident..." 
              [(ngModel)]="meterSearchQuery"
              (input)="filterMeters()"
            />
          </div>
          <select [(ngModel)]="meterUtilityFilter" (change)="filterMeters()" class="filter-select">
            <option value="all">All Utilities</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="gas">Gas</option>
          </select>
          <select [(ngModel)]="meterStatusFilter" (change)="filterMeters()" class="filter-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <!-- Meters Grid -->
        <div class="meters-grid">
          <div *ngFor="let meter of filteredMeters" class="meter-card" [class.inactive]="!meter.isActive">
            <div class="meter-header">
              <div class="meter-title">
                <h3>{{ meter.meterNumber }}</h3>
                <span class="utility-badge" [ngClass]="meter.utilityType">
                  {{ getUtilityTypeLabel(meter.utilityType) }}
                </span>
              </div>
              <div class="meter-status">
                <span class="status-badge" [ngClass]="meter.isActive ? 'active' : 'inactive'">
                  {{ meter.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
            <div class="meter-details">
              <div class="detail-item">
                <i class="material-icons">person</i>
                <span>{{ meter.residentName }}</span>
              </div>
              <div class="detail-item">
                <i class="material-icons">home</i>
                <span>{{ meter.flatNumber }}</span>
              </div>
              <div class="detail-item" *ngIf="meter.meterLocation">
                <i class="material-icons">location_on</i>
                <span>{{ meter.meterLocation }}</span>
              </div>
            </div>
            <div class="meter-actions">
              <button class="action-btn view" (click)="viewMeter(meter)" title="View Details">
                <i class="material-icons">visibility</i>
                View
              </button>
              <button class="action-btn reading" (click)="addReadingForMeter(meter)" title="Add Reading">
                <i class="material-icons">add</i>
                Add Reading
              </button>
              <button class="action-btn edit" (click)="editMeter(meter)" title="Edit">
                <i class="material-icons">edit</i>
                Edit
              </button>
              <button class="action-btn toggle" (click)="toggleMeter(meter)" [title]="meter.isActive ? 'Deactivate' : 'Activate'">
                <i class="material-icons">{{ meter.isActive ? 'pause' : 'play_arrow' }}</i>
                {{ meter.isActive ? 'Deactivate' : 'Activate' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredMeters.length === 0">
          <i class="material-icons">speed</i>
          <p>No meters found</p>
          <span *ngIf="meterSearchQuery">Try adjusting your search</span>
        </div>
      </div>

      <!-- Meter Readings Tab -->
      <div class="content-section" *ngIf="activeTab === 'readings'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by meter number, resident..." 
              [(ngModel)]="readingSearchQuery"
              (input)="filterReadings()"
            />
          </div>
          <select [(ngModel)]="readingUtilityFilter" (change)="filterReadings()" class="filter-select">
            <option value="all">All Utilities</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="gas">Gas</option>
          </select>
          <select [(ngModel)]="readingStatusFilter" (change)="filterReadings()" class="filter-select">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="billed">Billed</option>
          </select>
          <input type="month" [(ngModel)]="readingMonthFilter" (change)="filterReadings()" class="filter-select" />
        </div>

        <!-- Readings Table -->
        <div class="readings-table-container">
          <table class="readings-table">
            <thead>
              <tr>
                <th>Meter #</th>
                <th>Resident</th>
                <th>Utility</th>
                <th>Previous</th>
                <th>Current</th>
                <th>Consumption</th>
                <th>Reading Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let reading of filteredReadings">
                <td>
                  <strong>{{ reading.meterNumber }}</strong>
                </td>
                <td>
                  <div class="resident-info">
                    <div class="resident-name">{{ getMeterResidentName(reading.meterId) }}</div>
                    <div class="resident-flat">{{ getMeterFlatNumber(reading.meterId) }}</div>
                  </div>
                </td>
                <td>
                  <span class="utility-badge" [ngClass]="reading.utilityType">
                    {{ getUtilityTypeLabel(reading.utilityType) }}
                  </span>
                </td>
                <td>{{ reading.previousReading }}</td>
                <td>
                  <strong>{{ reading.currentReading }}</strong>
                </td>
                <td>
                  <span class="consumption-badge">{{ reading.consumption }} units</span>
                </td>
                <td>{{ formatDate(reading.readingDate) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="reading.status">
                    {{ getStatusLabel(reading.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewReading(reading)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn verify" (click)="verifyReading(reading)" title="Verify" *ngIf="reading.status === 'pending'">
                      <i class="material-icons">check</i>
                    </button>
                    <button class="action-btn bill" (click)="generateBill(reading)" title="Generate Bill" *ngIf="reading.status === 'verified'">
                      <i class="material-icons">receipt</i>
                    </button>
                    <button class="action-btn edit" (click)="editReading(reading)" title="Edit" *ngIf="reading.status === 'pending'">
                      <i class="material-icons">edit</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredReadings.length === 0">
            <i class="material-icons">description</i>
            <p>No meter readings found</p>
          </div>
        </div>
      </div>

      <!-- Bills Tab -->
      <div class="content-section" *ngIf="activeTab === 'bills'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by bill number, resident..." 
              [(ngModel)]="billSearchQuery"
              (input)="filterBills()"
            />
          </div>
          <select [(ngModel)]="billUtilityFilter" (change)="filterBills()" class="filter-select">
            <option value="all">All Utilities</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="gas">Gas</option>
          </select>
          <select [(ngModel)]="billStatusFilter" (change)="filterBills()" class="filter-select">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <!-- Bills Table -->
        <div class="bills-table-container">
          <table class="bills-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Meter #</th>
                <th>Resident</th>
                <th>Utility</th>
                <th>Consumption</th>
                <th>Amount</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let bill of filteredBills">
                <td>
                  <strong>{{ bill.billNumber }}</strong>
                </td>
                <td>{{ bill.meterNumber }}</td>
                <td>
                  <div class="resident-info">
                    <div class="resident-name">{{ bill.residentName }}</div>
                    <div class="resident-flat">{{ bill.flatNumber }}</div>
                  </div>
                </td>
                <td>
                  <span class="utility-badge" [ngClass]="bill.utilityType">
                    {{ getUtilityTypeLabel(bill.utilityType) }}
                  </span>
                </td>
                <td>
                  <span class="consumption-badge">{{ bill.consumption }} units</span>
                </td>
                <td class="amount">{{ formatCurrency(bill.totalAmount) }}</td>
                <td>{{ formatDate(bill.billDate) }}</td>
                <td>{{ formatDate(bill.dueDate) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="bill.status">
                    {{ getBillStatusLabel(bill.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewBill(bill)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn download" (click)="downloadBill(bill)" title="Download">
                      <i class="material-icons">download</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredBills.length === 0">
            <i class="material-icons">receipt</i>
            <p>No bills found</p>
          </div>
        </div>
      </div>

      <!-- Add/Edit Meter Reading Modal -->
      <div class="modal-overlay" *ngIf="showAddReading || editingReading" (click)="closeReadingModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingReading ? 'Edit Meter Reading' : 'Add Meter Reading' }}</h2>
            <button class="close-btn" (click)="closeReadingModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Select Meter <span class="required">*</span></label>
                  <select [(ngModel)]="newReading.meterId" (change)="onMeterChange()" required>
                    <option value="">Select a meter</option>
                    <option *ngFor="let meter of activeMeters" [value]="meter.id">
                      {{ meter.meterNumber }} - {{ meter.residentName }} ({{ meter.utilityType }})
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Reading Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="readingDate" required />
                </div>
                <div class="form-group">
                  <label>Reading Month <span class="required">*</span></label>
                  <input type="month" [(ngModel)]="readingMonth" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Previous Reading</label>
                  <input type="number" [(ngModel)]="newReading.previousReading" min="0" step="0.01" readonly [value]="getLastReading()" />
                </div>
                <div class="form-group">
                  <label>Current Reading <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newReading.currentReading" (input)="calculateConsumption()" min="0" step="0.01" required />
                </div>
                <div class="form-group">
                  <label>Consumption</label>
                  <input type="number" [(ngModel)]="newReading.consumption" readonly />
                </div>
              </div>

              <div class="form-group">
                <label>Read By <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newReading.readBy" placeholder="Name of person who read the meter" required />
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea [(ngModel)]="newReading.notes" placeholder="Additional notes" rows="3"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeReadingModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveReading()" [disabled]="!isReadingValid() || isSaving">
              <i class="material-icons">save</i>
              {{ isSaving ? 'Saving...' : (editingReading ? 'Update' : 'Save') + ' Reading' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Rates Modal -->
      <div class="modal-overlay" *ngIf="showRates" (click)="showRates = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Utility Rates</h2>
            <button class="close-btn" (click)="showRates = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="rates-grid">
              <div *ngFor="let rate of rates" class="rate-card">
                <div class="rate-header">
                  <h3>{{ getUtilityTypeLabel(rate.utilityType) }}</h3>
                  <span class="status-badge" [ngClass]="rate.isActive ? 'active' : 'inactive'">
                    {{ rate.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="rate-details">
                  <div class="rate-item">
                    <span>Rate Type:</span>
                    <strong>{{ getRateTypeLabel(rate.rateType) }}</strong>
                  </div>
                  <div class="rate-item" *ngIf="rate.rateType === 'fixed'">
                    <span>Base Rate:</span>
                    <strong>{{ formatCurrency(rate.baseRate) }} per unit</strong>
                  </div>
                  <div class="rate-item" *ngIf="rate.fixedCharges">
                    <span>Fixed Charges:</span>
                    <strong>{{ formatCurrency(rate.fixedCharges) }}</strong>
                  </div>
                  <div class="rate-item" *ngIf="rate.tiers && rate.tiers.length > 0">
                    <span>Tiers:</span>
                    <strong>{{ rate.tiers.length }} tiers</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showRates = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .metered-utilities-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%);
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
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      font-size: 12px;
    }

    .load-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 24px 0;
      padding: 12px 16px;
      background: rgba(231, 76, 60, 0.1);
      color: #c0392b;
      border-radius: 8px;
      font-size: 14px;
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
      background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%);
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

    /* Tabs */
    .tabs-section {
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
      background: none;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab:hover {
      color: #00bcd4;
    }

    .tab.active {
      color: #00bcd4;
      border-bottom-color: #00bcd4;
    }

    /* Content Section */
    .content-section {
      padding: 24px;
    }

    /* Filters */
    .filters-section {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 24px;
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

    /* Meters Grid */
    .meters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .meter-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .meter-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .meter-card.inactive {
      opacity: 0.7;
    }

    .meter-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .meter-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .meter-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .utility-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .utility-badge.water { background: #e7f3ff; color: #2980b9; }
    .utility-badge.electricity { background: #fff4e6; color: #e67e22; }
    .utility-badge.gas { background: #ffeaea; color: #c0392b; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.inactive { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.verified { background: #e7f3ff; color: #2980b9; }
    .status-badge.billed { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.overdue { background: #ffeaea; color: #c0392b; }
    .status-badge.cancelled { background: #f5f7fa; color: #7f8c8d; }

    .meter-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #2c3e50;
    }

    .detail-item i {
      font-size: 18px;
      color: #00bcd4;
    }

    .meter-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .action-btn.view { background: #e7f3ff; color: #2980b9; }
    .action-btn.reading { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.edit { background: #fff4e6; color: #e67e22; }
    .action-btn.toggle { background: #f5f7fa; color: #7f8c8d; }
    .action-btn.verify { background: #e7f3ff; color: #2980b9; }
    .action-btn.bill { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.download { background: #f4e7ff; color: #8e44ad; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    /* Tables */
    .readings-table-container,
    .bills-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .readings-table,
    .bills-table {
      width: 100%;
    }

    .readings-table thead,
    .bills-table thead {
      background: #f8f9fa;
    }

    .readings-table th,
    .bills-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .readings-table td,
    .bills-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
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

    .consumption-badge {
      padding: 4px 10px;
      background: #e7f3ff;
      color: #2980b9;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .amount {
      font-weight: 600;
      color: #2c3e50;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .action-buttons .action-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      flex: none;
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
      border-color: #00bcd4;
    }

    .form-group input[readonly] {
      background: #f8f9fa;
      color: #7f8c8d;
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
      background: #00bcd4;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0097a7;
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

    /* Rates Grid */
    .rates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .rate-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
      border: 2px solid #e9ecef;
    }

    .rate-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .rate-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .rate-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rate-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #2c3e50;
    }

    .rate-item strong {
      color: #00bcd4;
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
      }

      .meters-grid {
        grid-template-columns: 1fr;
      }

      .readings-table-container,
      .bills-table-container {
        overflow-x: auto;
      }

      .readings-table,
      .bills-table {
        min-width: 1200px;
      }
    }
  `]
})
export class MeteredUtilitiesBillingComponent implements OnInit, OnDestroy {
  meters: MeteredMeter[] = [];
  filteredMeters: MeteredMeter[] = [];
  readings: MeteredReading[] = [];
  filteredReadings: MeteredReading[] = [];
  bills: MeteredBill[] = [];
  filteredBills: MeteredBill[] = [];
  rates: MeteredRate[] = [];
  selectedMeter: MeteredMeter | null = null;
  editingReading: MeteredReading | null = null;
  loadError = '';
  isSaving = false;
  isGenerating = false;
  meterSearchQuery: string = '';
  readingSearchQuery: string = '';
  billSearchQuery: string = '';
  meterUtilityFilter: string = 'all';
  meterStatusFilter: string = 'all';
  readingUtilityFilter: string = 'all';
  readingStatusFilter: string = 'all';
  readingMonthFilter: string = '';
  billUtilityFilter: string = 'all';
  billStatusFilter: string = 'all';
  activeTab: 'meters' | 'readings' | 'bills' = 'meters';
  showAddReading: boolean = false;
  showRates: boolean = false;
  readingDate: string = '';
  readingMonth: string = '';

  newReading: Partial<MeteredReading> = {
    meterId: '',
    previousReading: 0,
    currentReading: 0,
    consumption: 0,
    readBy: '',
    status: 'pending'
  };

  private destroy$ = new Subject<void>();
  private billDownload = inject(BillDocumentDownloadService);
  private utilityBillService = inject(UtilityBillService);
  private session = inject(SessionContextService);

  constructor() {
    const today = new Date();
    this.readingDate = today.toISOString().split('T')[0];
    this.readingMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load bills, readings, rates, and derived meters from APIs. */
  loadAll(): void {
    this.loadError = '';
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.meters = [];
      this.filteredMeters = [];
      this.readings = [];
      this.filteredReadings = [];
      this.bills = [];
      this.filteredBills = [];
      this.rates = [];
      return;
    }

    forkJoin({
      bills: this.utilityBillService.getAllBills(),
      readings: this.utilityBillService.getMeterReadings(),
      rates: this.utilityBillService.getRates()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ bills, readings, rates }) => {
          this.bills = bills
            .filter(b => ['water', 'electricity', 'gas'].includes(b.utilityType))
            .map(mapToMeteredBill);
          this.readings = mapToMeteredReadings(
            readings.filter(r => ['water', 'electricity', 'gas'].includes(r.utilityType)),
            bills
          );
          this.meters = buildMetersFromData(this.readings, this.bills);
          this.rates = rates
            .filter(r => ['water', 'electricity', 'gas'].includes(r.utilityType))
            .map(mapToMeteredRate);
          this.filterMeters();
          this.filterReadings();
          this.filterBills();
        },
        error: err => {
          console.error('Failed to load metered utilities data', err);
          this.loadError =
            'Failed to load metered utilities data from the API. Ensure the backend is running.';
        }
      });
  }

  loadMeters(): void {
    this.loadAll();
  }

  loadReadings(): void {
    this.loadAll();
  }

  loadBills(): void {
    this.loadAll();
  }

  loadRates(): void {
    this.loadAll();
  }

  /**
   * Filter meters
   */
  filterMeters(): void {
    let filtered = [...this.meters];

    if (this.meterUtilityFilter !== 'all') {
      filtered = filtered.filter(m => m.utilityType === this.meterUtilityFilter);
    }

    if (this.meterStatusFilter !== 'all') {
      filtered = filtered.filter(m => 
        this.meterStatusFilter === 'active' ? m.isActive : !m.isActive
      );
    }

    if (this.meterSearchQuery.trim()) {
      const query = this.meterSearchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.meterNumber.toLowerCase().includes(query) ||
        m.residentName.toLowerCase().includes(query) ||
        m.flatNumber.toLowerCase().includes(query)
      );
    }

    this.filteredMeters = filtered;
  }

  /**
   * Filter readings
   */
  filterReadings(): void {
    let filtered = [...this.readings];

    if (this.readingUtilityFilter !== 'all') {
      filtered = filtered.filter(r => r.utilityType === this.readingUtilityFilter);
    }

    if (this.readingStatusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === this.readingStatusFilter);
    }

    if (this.readingMonthFilter) {
      filtered = filtered.filter(r => r.readingMonth === this.readingMonthFilter);
    }

    if (this.readingSearchQuery.trim()) {
      const query = this.readingSearchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.meterNumber.toLowerCase().includes(query) ||
        this.getMeterResidentName(r.meterId).toLowerCase().includes(query)
      );
    }

    // Sort by reading date (newest first)
    filtered.sort((a, b) => b.readingDate.getTime() - a.readingDate.getTime());

    this.filteredReadings = filtered;
  }

  /**
   * Filter bills
   */
  filterBills(): void {
    let filtered = [...this.bills];

    if (this.billUtilityFilter !== 'all') {
      filtered = filtered.filter(b => b.utilityType === this.billUtilityFilter);
    }

    if (this.billStatusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === this.billStatusFilter);
    }

    if (this.billSearchQuery.trim()) {
      const query = this.billSearchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.billNumber.toLowerCase().includes(query) ||
        b.residentName.toLowerCase().includes(query) ||
        b.meterNumber.toLowerCase().includes(query)
      );
    }

    // Sort by bill date (newest first)
    filtered.sort((a, b) => b.billDate.getTime() - a.billDate.getTime());

    this.filteredBills = filtered;
  }

  /**
   * Get pending readings count
   */
  get pendingReadingsCount(): number {
    return this.readings.filter(r => r.status === 'pending').length;
  }

  /**
   * Get total billing amount
   */
  get totalBillingAmount(): number {
    return this.bills.reduce((sum, b) => sum + b.totalAmount, 0);
  }

  /**
   * Get active meters
   */
  get activeMeters(): MeteredMeter[] {
    return this.meters.filter(m => m.isActive);
  }

  viewMeter(meter: MeteredMeter): void {
    this.selectedMeter = meter;
  }

  addReadingForMeter(meter: MeteredMeter): void {
    this.newReading.meterId = meter.id;
    this.newReading.previousReading = this.getLastReadingForMeter(meter.id);
    this.showAddReading = true;
  }

  editMeter(meter: MeteredMeter): void {
    console.log('Edit meter:', meter);
  }

  toggleMeter(meter: MeteredMeter): void {
    meter.isActive = !meter.isActive;
    this.filterMeters();
    window.alert(`Meter ${meter.isActive ? 'activated' : 'deactivated'} (display only).`);
  }

  viewReading(reading: MeteredReading): void {
    console.log('View reading:', reading);
  }

  verifyReading(reading: MeteredReading): void {
    if (!window.confirm(`Verify reading for meter ${reading.meterNumber}?`)) {
      return;
    }
    this.isSaving = true;
    this.utilityBillService
      .updateMeterReading(reading.id, {
        flatNumber: reading.flatNumber,
        utilityType: reading.utilityType,
        meterNumber: reading.meterNumber,
        reading: reading.currentReading,
        readingDate: reading.readingDate,
        readBy: reading.readBy,
        notes: reading.notes,
        status: 'verified'
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.loadAll();
          window.alert('Reading verified successfully!');
        },
        error: err => {
          this.isSaving = false;
          console.error('Failed to verify reading', err);
          window.alert('Failed to verify reading.');
        }
      });
  }

  generateBill(reading: MeteredReading): void {
    if (!window.confirm(`Generate bill for reading ${reading.meterNumber}?`)) {
      return;
    }
    this.isGenerating = true;
    this.utilityBillService
      .generateBills({
        utilityType: reading.utilityType,
        billMonth: reading.readingMonth,
        useMeterReadings: true,
        autoSend: false
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: created => {
          this.isGenerating = false;
          this.loadAll();
          window.alert(`Generated ${created.length} utility bill(s) successfully!`);
        },
        error: err => {
          this.isGenerating = false;
          console.error('Failed to generate bill', err);
          window.alert('Failed to generate bill. Ensure rates and readings exist for this month.');
        }
      });
  }

  editReading(reading: MeteredReading): void {
    this.editingReading = reading;
    this.newReading = { ...reading };
    this.readingDate = new Date(reading.readingDate).toISOString().split('T')[0];
    this.readingMonth = reading.readingMonth;
    this.showAddReading = true;
  }

  viewBill(bill: MeteredBill): void {
    console.log('View bill:', bill);
  }

  downloadBill(bill: MeteredBill): void {
    this.billDownload.downloadBillPdf({
      documentTitle: `${bill.utilityType.charAt(0).toUpperCase()}${bill.utilityType.slice(1)} Utility Bill`,
      documentNumber: bill.billNumber,
      recipientName: bill.residentName,
      flatNumber: bill.flatNumber,
      issueDate: bill.billDate,
      dueDate: bill.dueDate,
      status: bill.status,
      lineItems: [
        {
          description: 'Consumption charges',
          quantity: bill.consumption,
          rate: bill.rate,
          amount: bill.subtotal
        },
        { description: 'Fixed charges', amount: bill.fixedCharges },
        { description: 'Tax', amount: bill.tax }
      ],
      summaryRows: [
        { label: 'Meter', value: bill.meterNumber },
        {
          label: 'Readings',
          value: `${bill.previousReading} → ${bill.currentReading} (${bill.consumption} units)`
        }
      ],
      totalAmount: bill.totalAmount
    });
  }

  /**
   * On meter change
   */
  onMeterChange(): void {
    if (this.newReading.meterId) {
      this.newReading.previousReading = this.getLastReading();
    }
  }

  /**
   * Calculate consumption
   */
  calculateConsumption(): void {
    if (this.newReading.currentReading && this.newReading.previousReading) {
      this.newReading.consumption = this.newReading.currentReading - this.newReading.previousReading;
    }
  }

  /**
   * Get last reading
   */
  getLastReading(): number {
    if (!this.newReading.meterId) return 0;
    return this.getLastReadingForMeter(this.newReading.meterId);
  }

  /**
   * Get last reading for meter
   */
  getLastReadingForMeter(meterId: string): number {
    const meterReadings = this.readings
      .filter(r => r.meterId === meterId)
      .sort((a, b) => b.readingDate.getTime() - a.readingDate.getTime());
    
    return meterReadings.length > 0 ? meterReadings[0].currentReading : 0;
  }

  /**
   * Get meter resident name
   */
  getMeterResidentName(meterId: string): string {
    const meter = this.meters.find(m => m.id === meterId);
    return meter ? meter.residentName : 'N/A';
  }

  /**
   * Get meter flat number
   */
  getMeterFlatNumber(meterId: string): string {
    const meter = this.meters.find(m => m.id === meterId);
    return meter ? meter.flatNumber : 'N/A';
  }

  /**
   * Save reading
   */
  saveReading(): void {
    if (!this.isReadingValid() || this.isSaving) {
      return;
    }
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }

    const meter = this.meters.find(m => m.id === this.newReading.meterId);
    if (!meter) {
      return;
    }

    const payload = {
      flatNumber: meter.flatNumber,
      utilityType: meter.utilityType,
      meterNumber: meter.meterNumber,
      reading: this.newReading.currentReading!,
      readingDate: new Date(this.readingDate),
      readingType: 'manual' as const,
      readBy: this.newReading.readBy || this.session.getCurrentUserId() || 'admin',
      notes: this.newReading.notes,
      status: this.newReading.status ?? 'pending'
    };

    this.isSaving = true;
    const request$ = this.editingReading
      ? this.utilityBillService.updateMeterReading(this.editingReading.id, payload)
      : this.utilityBillService.addMeterReading(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        this.loadAll();
        this.closeReadingModal();
        window.alert(this.editingReading ? 'Reading updated successfully!' : 'Reading added successfully!');
      },
      error: err => {
        this.isSaving = false;
        console.error('Failed to save reading', err);
        window.alert('Failed to save meter reading.');
      }
    });
  }

  /**
   * Close reading modal
   */
  closeReadingModal(): void {
    this.showAddReading = false;
    this.editingReading = null;
    this.resetNewReading();
  }

  /**
   * Reset new reading
   */
  resetNewReading(): void {
    this.newReading = {
      meterId: '',
      previousReading: 0,
      currentReading: 0,
      consumption: 0,
      readBy: '',
      status: 'pending'
    };
    const today = new Date();
    this.readingDate = today.toISOString().split('T')[0];
    this.readingMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Is reading valid
   */
  isReadingValid(): boolean {
    return !!(
      this.newReading.meterId &&
      this.newReading.currentReading &&
      this.newReading.currentReading > 0 &&
      this.newReading.currentReading >= (this.newReading.previousReading || 0) &&
      this.readingDate &&
      this.readingMonth &&
      this.newReading.readBy
    );
  }

  /**
   * Get utility type label
   */
  getUtilityTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      water: 'Water',
      electricity: 'Electricity',
      gas: 'Gas'
    };
    return labels[type] || type;
  }

  /**
   * Get rate type label
   */
  getRateTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      fixed: 'Fixed',
      tiered: 'Tiered',
      slab: 'Slab'
    };
    return labels[type] || type;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      verified: 'Verified',
      billed: 'Billed'
    };
    return labels[status] || status;
  }

  /**
   * Get bill status label
   */
  getBillStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      paid: 'Paid',
      overdue: 'Overdue',
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

