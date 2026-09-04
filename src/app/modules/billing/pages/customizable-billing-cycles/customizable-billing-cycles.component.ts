import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { BillingCycleService } from '../../services/billing-cycle.service';
import { MaintenanceBillService } from '../../services/maintenance-bill.service';
import { BillingCycle } from '../../models/billing-cycle.model';

/**
 * Customizable Billing Cycles Component
 * Handles creation and management of custom billing cycles
 */
@Component({
  selector: 'app-customizable-billing-cycles',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="billing-cycles-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">schedule</i>
            Customizable Billing Cycles
          </h1>
          <p>Create and manage custom billing cycles for different billing scenarios</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/billing-cycles</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn primary" (click)="showCreateCycle = true" title="Create Cycle">
            <i class="material-icons">add</i>
            Create Cycle
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
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ cycles.length }}</div>
            <div class="stat-label">Total Cycles</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activeCyclesCount }}</div>
            <div class="stat-label">Active Cycles</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">autorenew</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ autoGenerateCount }}</div>
            <div class="stat-label">Auto-Generate</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">calendar_month</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ thisMonthBills }}</div>
            <div class="stat-label">This Month Bills</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search cycles by name..." 
            [(ngModel)]="searchQuery"
            (input)="filterCycles()"
          />
        </div>
        <select [(ngModel)]="statusFilter" (change)="filterCycles()" class="filter-select">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select [(ngModel)]="cycleTypeFilter" (change)="filterCycles()" class="filter-select">
          <option value="all">All Types</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="semi-annual">Semi-Annual</option>
          <option value="annual">Annual</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <!-- Cycles List -->
      <div class="cycles-grid">
        <div *ngFor="let cycle of filteredCycles" class="cycle-card" [class.inactive]="!cycle.isActive">
          <div class="cycle-header">
            <div class="cycle-title">
              <h3>{{ cycle.name }}</h3>
              <span class="cycle-badge" [ngClass]="cycle.cycleType">
                {{ getCycleTypeLabel(cycle.cycleType) }}
              </span>
            </div>
            <div class="cycle-status">
              <span class="status-badge" [ngClass]="cycle.isActive ? 'active' : 'inactive'">
                {{ cycle.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
          <p class="cycle-description">{{ cycle.description }}</p>
          <div class="cycle-details">
            <div class="detail-item">
              <i class="material-icons">calendar_today</i>
              <span>Billing Day: <strong>{{ cycle.billingDay }}</strong></span>
            </div>
            <div class="detail-item" *ngIf="cycle.cycleType === 'custom'">
              <i class="material-icons">repeat</i>
              <span>Frequency: <strong>{{ cycle.billingFrequency }} days</strong></span>
            </div>
            <div class="detail-item">
              <i class="material-icons">people</i>
              <span>Applicable To: <strong>{{ getApplicableToLabel(cycle.applicableTo) }}</strong></span>
            </div>
            <div class="detail-item">
              <i class="material-icons">autorenew</i>
              <span>Auto-Generate: <strong>{{ cycle.autoGenerate ? 'Yes' : 'No' }}</strong></span>
            </div>
          </div>
          <div class="cycle-features">
            <span class="feature-tag" *ngIf="cycle.lateFeeEnabled">
              <i class="material-icons">warning</i>
              Late Fee: {{ formatCurrency(cycle.lateFeeAmount || 0) }}
            </span>
            <span class="feature-tag" *ngIf="cycle.gracePeriodDays > 0">
              <i class="material-icons">timer</i>
              Grace: {{ cycle.gracePeriodDays }} days
            </span>
            <span class="feature-tag" *ngIf="cycle.reminderDays.length > 0">
              <i class="material-icons">notifications</i>
              Reminders: {{ cycle.reminderDays.join(', ') }} days
            </span>
          </div>
          <div class="cycle-actions">
            <button class="action-btn view" (click)="viewCycle(cycle)" title="View Details">
              <i class="material-icons">visibility</i>
              View
            </button>
            <button class="action-btn edit" (click)="editCycle(cycle)" title="Edit">
              <i class="material-icons">edit</i>
              Edit
            </button>
            <button class="action-btn toggle" (click)="toggleCycle(cycle)" [title]="cycle.isActive ? 'Deactivate' : 'Activate'">
              <i class="material-icons">{{ cycle.isActive ? 'pause' : 'play_arrow' }}</i>
              {{ cycle.isActive ? 'Deactivate' : 'Activate' }}
            </button>
            <button class="action-btn delete" (click)="deleteCycle(cycle)" title="Delete">
              <i class="material-icons">delete</i>
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="filteredCycles.length === 0">
        <i class="material-icons">schedule</i>
        <p>No billing cycles found</p>
        <span *ngIf="searchQuery">Try adjusting your search</span>
        <button class="btn btn-primary" (click)="showCreateCycle = true" *ngIf="!searchQuery">
          <i class="material-icons">add</i>
          Create First Cycle
        </button>
      </div>

      <!-- Create/Edit Cycle Modal -->
      <div class="modal-overlay" *ngIf="showCreateCycle || editingCycle" (click)="closeModal()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingCycle ? 'Edit Billing Cycle' : 'Create Billing Cycle' }}</h2>
            <button class="close-btn" (click)="closeModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Cycle Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newCycle.name" placeholder="e.g., Monthly Maintenance" required />
                </div>
                <div class="form-group">
                  <label>Cycle Type <span class="required">*</span></label>
                  <select [(ngModel)]="newCycle.cycleType" (change)="onCycleTypeChange()" required>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newCycle.description" placeholder="Describe this billing cycle" rows="3"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Start Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="startDate" required />
                </div>
                <div class="form-group">
                  <label>Billing Day <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newCycle.billingDay" min="1" max="31" placeholder="Day of month" required />
                </div>
                <div class="form-group" *ngIf="newCycle.cycleType === 'custom'">
                  <label>Frequency (Days) <span class="required">*</span></label>
                  <input type="number" [(ngModel)]="newCycle.billingFrequency" min="1" placeholder="e.g., 45" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Applicable To <span class="required">*</span></label>
                  <select [(ngModel)]="newCycle.applicableTo" required>
                    <option value="all">All Units</option>
                    <option value="residents">Residential Only</option>
                    <option value="commercial">Commercial Only</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Auto-Generate Bills</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newCycle.autoGenerate" id="autoGenerate" />
                    <label for="autoGenerate"></label>
                  </div>
                </div>
              </div>

              <!-- Reminder Settings -->
              <div class="form-section-inner">
                <h3>Reminder Settings</h3>
                <div class="form-group">
                  <label>Reminder Days (before due date)</label>
                  <div class="reminder-days">
                    <label *ngFor="let day of reminderDayOptions" class="checkbox-label">
                      <input type="checkbox" [value]="day" [checked]="isReminderDaySelected(day)" (change)="toggleReminderDay(day)" />
                      <span>{{ day }} days</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Late Fee Settings -->
              <div class="form-section-inner">
                <h3>Late Fee Settings</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Enable Late Fee</label>
                    <div class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="newCycle.lateFeeEnabled" id="lateFeeEnabled" (change)="onLateFeeToggle()" />
                      <label for="lateFeeEnabled"></label>
                    </div>
                  </div>
                  <div class="form-group" *ngIf="newCycle.lateFeeEnabled">
                    <label>Late Fee Type</label>
                    <select [(ngModel)]="newCycle.lateFeeType">
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div class="form-group" *ngIf="newCycle.lateFeeEnabled">
                    <label>Late Fee Amount</label>
                    <input type="number" [(ngModel)]="newCycle.lateFeeAmount" min="0" step="0.01" placeholder="0.00" />
                  </div>
                </div>
                <div class="form-group" *ngIf="newCycle.lateFeeEnabled">
                  <label>Grace Period (Days)</label>
                  <input type="number" [(ngModel)]="newCycle.gracePeriodDays" min="0" placeholder="0" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveCycle()" [disabled]="!isCycleValid() || isSaving">
              <i class="material-icons">save</i>
              {{ isSaving ? 'Saving...' : (editingCycle ? 'Update' : 'Create') + ' Cycle' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Cycle Details Modal -->
      <div class="modal-overlay" *ngIf="selectedCycle" (click)="selectedCycle = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ selectedCycle?.name }}</h2>
            <button class="close-btn" (click)="selectedCycle = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedCycle">
            <div class="cycle-detail-section">
              <h3>Cycle Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Type:</span>
                  <span class="value">{{ getCycleTypeLabel(selectedCycle.cycleType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Billing Day:</span>
                  <span class="value">{{ selectedCycle.billingDay }}</span>
                </div>
                <div class="detail-item" *ngIf="selectedCycle.cycleType === 'custom'">
                  <span class="label">Frequency:</span>
                  <span class="value">{{ selectedCycle.billingFrequency }} days</span>
                </div>
                <div class="detail-item">
                  <span class="label">Start Date:</span>
                  <span class="value">{{ formatDate(selectedCycle.startDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Applicable To:</span>
                  <span class="value">{{ getApplicableToLabel(selectedCycle.applicableTo) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Auto-Generate:</span>
                  <span class="value">{{ selectedCycle.autoGenerate ? 'Yes' : 'No' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="selectedCycle.isActive ? 'active' : 'inactive'">
                    {{ selectedCycle.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="cycle-detail-section" *ngIf="selectedCycle.lateFeeEnabled">
              <h3>Late Fee Settings</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Late Fee Type:</span>
                  <span class="value">{{ selectedCycle.lateFeeType === 'fixed' ? 'Fixed Amount' : 'Percentage' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Late Fee Amount:</span>
                  <span class="value">{{ formatCurrency(selectedCycle.lateFeeAmount || 0) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Grace Period:</span>
                  <span class="value">{{ selectedCycle.gracePeriodDays }} days</span>
                </div>
              </div>
            </div>

            <div class="cycle-detail-section" *ngIf="selectedCycle.reminderDays.length > 0">
              <h3>Reminder Settings</h3>
              <div class="reminder-list">
                <span class="reminder-badge" *ngFor="let day of selectedCycle.reminderDays">
                  {{ day }} days before due date
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedCycle = null">Close</button>
            <button class="btn btn-primary" (click)="editCycle(selectedCycle!)">
              <i class="material-icons">edit</i>
              Edit Cycle
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .billing-cycles-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
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
      background: linear-gradient(135deg, #16a085 0%, #138d75 100%);
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

    /* Cycles Grid */
    .cycles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
      padding: 0 24px 24px;
    }

    .cycle-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .cycle-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .cycle-card.inactive {
      opacity: 0.7;
    }

    .cycle-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .cycle-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .cycle-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .cycle-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .cycle-badge.monthly { background: #e7f3ff; color: #2980b9; }
    .cycle-badge.quarterly { background: #fff4e6; color: #e67e22; }
    .cycle-badge.semi-annual { background: #e8f8f0; color: #1e9e5a; }
    .cycle-badge.annual { background: #f4e7ff; color: #8e44ad; }
    .cycle-badge.custom { background: #ffeaea; color: #c0392b; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.inactive { background: #f5f7fa; color: #7f8c8d; }

    .cycle-description {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .cycle-details {
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
      color: #16a085;
    }

    .cycle-features {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .feature-tag {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: #f5f7fa;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #2c3e50;
    }

    .feature-tag i {
      font-size: 14px;
    }

    .cycle-actions {
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
    .action-btn.edit { background: #fff4e6; color: #e67e22; }
    .action-btn.toggle { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.delete { background: #ffeaea; color: #c0392b; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-section-inner {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-top: 16px;
    }

    .form-section-inner h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
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
      border-color: #16a085;
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
      background: #16a085;
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

    .reminder-days {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .cycle-detail-section {
      margin-bottom: 24px;
    }

    .cycle-detail-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item .label {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .detail-item .value {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .reminder-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .reminder-badge {
      padding: 6px 12px;
      background: #e7f3ff;
      color: #2980b9;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
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
      background: #16a085;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #138d75;
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

      .cycles-grid {
        grid-template-columns: 1fr;
        padding: 0 16px 16px;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CustomizableBillingCyclesComponent implements OnInit, OnDestroy {
  cycles: BillingCycle[] = [];
  filteredCycles: BillingCycle[] = [];
  selectedCycle: BillingCycle | null = null;
  editingCycle: BillingCycle | null = null;
  searchQuery: string = '';
  statusFilter: string = 'all';
  cycleTypeFilter: string = 'all';
  showCreateCycle: boolean = false;
  startDate: string = '';
  loadError = '';
  isSaving = false;
  thisMonthBillsCount = 0;

  newCycle: Partial<BillingCycle> = {
    name: '',
    description: '',
    cycleType: 'monthly',
    billingDay: 1,
    billingFrequency: 30,
    isActive: true,
    applicableTo: 'all',
    autoGenerate: false,
    reminderDays: [],
    lateFeeEnabled: false,
    gracePeriodDays: 0
  };

  reminderDayOptions: number[] = [1, 3, 5, 7, 10, 15, 30];

  private destroy$ = new Subject<void>();
  private billingCycleService = inject(BillingCycleService);
  private maintenanceBillService = inject(MaintenanceBillService);
  private session = inject(SessionContextService);

  constructor() {
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadCycles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load billing cycles and this-month bill count from APIs
   */
  loadCycles(): void {
    this.loadError = '';
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.cycles = [];
      this.filteredCycles = [];
      this.thisMonthBillsCount = 0;
      return;
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    forkJoin({
      cycles: this.billingCycleService.getAllCycles(),
      bills: this.maintenanceBillService.getAllBills()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ cycles, bills }) => {
          this.cycles = cycles;
          this.thisMonthBillsCount = bills.filter(b => b.billMonth === currentMonth).length;
          this.filterCycles();
        },
        error: err => {
          console.error('Failed to load billing cycles', err);
          this.loadError = 'Failed to load billing cycles from the API. Ensure the backend is running.';
        }
      });
  }

  /**
   * Filter cycles
   */
  filterCycles(): void {
    let filtered = [...this.cycles];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(c => 
        this.statusFilter === 'active' ? c.isActive : !c.isActive
      );
    }

    if (this.cycleTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.cycleType === this.cycleTypeFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
      );
    }

    this.filteredCycles = filtered;
  }

  /**
   * Get active cycles count
   */
  get activeCyclesCount(): number {
    return this.cycles.filter(c => c.isActive).length;
  }

  /**
   * Get auto-generate count
   */
  get autoGenerateCount(): number {
    return this.cycles.filter(c => c.autoGenerate).length;
  }

  /**
   * Get this month bills count (simulated)
   */
  get thisMonthBills(): number {
    return this.thisMonthBillsCount;
  }

  /**
   * View cycle details
   */
  viewCycle(cycle: BillingCycle): void {
    this.selectedCycle = cycle;
  }

  /**
   * Edit cycle
   */
  editCycle(cycle: BillingCycle): void {
    this.editingCycle = cycle;
    this.newCycle = { ...cycle };
    this.startDate = new Date(cycle.startDate).toISOString().split('T')[0];
    this.showCreateCycle = true;
  }

  /**
   * Toggle cycle status
   */
  toggleCycle(cycle: BillingCycle): void {
    this.billingCycleService
      .toggleCycle(cycle.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const index = this.cycles.findIndex(c => c.id === updated.id);
          if (index >= 0) {
            this.cycles[index] = updated;
          }
          this.filterCycles();
          window.alert(`Cycle ${updated.isActive ? 'activated' : 'deactivated'} successfully!`);
        },
        error: err => {
          console.error('Failed to toggle cycle', err);
          window.alert('Failed to update cycle status.');
        }
      });
  }

  deleteCycle(cycle: BillingCycle): void {
    if (!window.confirm(`Are you sure you want to delete "${cycle.name}"?`)) {
      return;
    }
    this.billingCycleService
      .deleteCycle(cycle.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cycles = this.cycles.filter(c => c.id !== cycle.id);
          this.filterCycles();
          window.alert('Cycle deleted successfully!');
        },
        error: err => {
          console.error('Failed to delete cycle', err);
          window.alert('Failed to delete cycle.');
        }
      });
  }

  saveCycle(): void {
    if (!this.isCycleValid() || this.isSaving) {
      return;
    }
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }

    const payload: Partial<BillingCycle> = {
      ...this.newCycle,
      name: this.newCycle.name!,
      description: this.newCycle.description || '',
      cycleType: this.newCycle.cycleType!,
      startDate: new Date(this.startDate),
      billingDay: this.newCycle.billingDay!,
      billingFrequency: this.newCycle.billingFrequency || 30,
      isActive: this.newCycle.isActive ?? true,
      applicableTo: this.newCycle.applicableTo!,
      autoGenerate: this.newCycle.autoGenerate ?? false,
      reminderDays: this.newCycle.reminderDays || [],
      lateFeeEnabled: this.newCycle.lateFeeEnabled ?? false,
      lateFeeAmount: this.newCycle.lateFeeAmount,
      lateFeeType: this.newCycle.lateFeeType,
      gracePeriodDays: this.newCycle.gracePeriodDays || 0
    };

    this.isSaving = true;
    const request$ = this.editingCycle
      ? this.billingCycleService.updateCycle({ ...payload, id: this.editingCycle.id } as BillingCycle)
      : this.billingCycleService.createCycle(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.isSaving = false;
        if (this.editingCycle) {
          const index = this.cycles.findIndex(c => c.id === saved.id);
          if (index >= 0) {
            this.cycles[index] = saved;
          }
        } else {
          this.cycles.unshift(saved);
        }
        this.filterCycles();
        this.closeModal();
        window.alert(this.editingCycle ? 'Cycle updated successfully!' : 'Cycle created successfully!');
      },
      error: err => {
        this.isSaving = false;
        console.error('Failed to save cycle', err);
        window.alert('Failed to save billing cycle.');
      }
    });
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showCreateCycle = false;
    this.editingCycle = null;
    this.resetNewCycle();
  }

  /**
   * Reset new cycle
   */
  resetNewCycle(): void {
    this.newCycle = {
      name: '',
      description: '',
      cycleType: 'monthly',
      billingDay: 1,
      billingFrequency: 30,
      isActive: true,
      applicableTo: 'all',
      autoGenerate: false,
      reminderDays: [],
      lateFeeEnabled: false,
      gracePeriodDays: 0
    };
    const today = new Date();
    this.startDate = today.toISOString().split('T')[0];
  }

  /**
   * On cycle type change
   */
  onCycleTypeChange(): void {
    // Set default frequency based on cycle type
    const defaults: { [key: string]: number } = {
      monthly: 30,
      quarterly: 90,
      'semi-annual': 180,
      annual: 365
    };
    if (this.newCycle.cycleType && defaults[this.newCycle.cycleType]) {
      this.newCycle.billingFrequency = defaults[this.newCycle.cycleType];
    }
  }

  /**
   * On late fee toggle
   */
  onLateFeeToggle(): void {
    if (!this.newCycle.lateFeeEnabled) {
      this.newCycle.lateFeeAmount = undefined;
      this.newCycle.lateFeeType = undefined;
    } else {
      this.newCycle.lateFeeType = 'fixed';
      this.newCycle.lateFeeAmount = 0;
    }
  }

  /**
   * Toggle reminder day
   */
  toggleReminderDay(day: number): void {
    if (!this.newCycle.reminderDays) {
      this.newCycle.reminderDays = [];
    }
    const index = this.newCycle.reminderDays.indexOf(day);
    if (index > -1) {
      this.newCycle.reminderDays.splice(index, 1);
    } else {
      this.newCycle.reminderDays.push(day);
    }
  }

  /**
   * Check if reminder day is selected
   */
  isReminderDaySelected(day: number): boolean {
    return this.newCycle.reminderDays?.includes(day) || false;
  }

  /**
   * Is cycle valid
   */
  isCycleValid(): boolean {
    return !!(
      this.newCycle.name &&
      this.newCycle.cycleType &&
      this.newCycle.billingDay &&
      this.newCycle.billingDay >= 1 &&
      this.newCycle.billingDay <= 31 &&
      this.startDate &&
      this.newCycle.applicableTo
    );
  }

  /**
   * Get cycle type label
   */
  getCycleTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      'semi-annual': 'Semi-Annual',
      annual: 'Annual',
      custom: 'Custom'
    };
    return labels[type] || type;
  }

  /**
   * Get applicable to label
   */
  getApplicableToLabel(type: string): string {
    const labels: { [key: string]: string } = {
      all: 'All Units',
      residents: 'Residential Only',
      commercial: 'Commercial Only',
      mixed: 'Mixed'
    };
    return labels[type] || type;
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

