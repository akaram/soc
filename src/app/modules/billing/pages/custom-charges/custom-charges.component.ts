import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Custom Charges Component
 * Handles corpus fund, sinking fund, and special assessments
 */
interface CustomCharge {
  id: string;
  chargeNumber: string;
  chargeType: 'corpus' | 'sinking_fund' | 'special_assessment';
  name: string;
  description: string;
  amount: number;
  calculationType: 'fixed' | 'per_sqft' | 'per_unit' | 'percentage';
  calculationValue: number; // Fixed amount, per sqft rate, or percentage
  applicableTo: 'all' | 'residential' | 'commercial' | 'mixed';
  flatTypes?: string[]; // Specific flat types if applicable
  areaRange?: {
    min?: number;
    max?: number;
  };
  dueDate: Date;
  status: 'draft' | 'active' | 'collected' | 'cancelled';
  totalUnits: number;
  collectedUnits: number;
  totalAmount: number;
  collectedAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ChargeApplication {
  id: string;
  chargeId: string;
  chargeNumber: string;
  chargeName: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  flatArea?: number;
  flatType?: string;
  calculatedAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  dueDate: Date;
  paidDate?: Date;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
}

@Component({
  selector: 'app-custom-charges',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="custom-charges-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">account_balance</i>
            Custom Charges
          </h1>
          <p>Manage corpus fund, sinking fund, and special assessments</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showReports = true" title="Reports">
            <i class="material-icons">assessment</i>
            Reports
          </button>
          <button class="icon-btn primary" (click)="showCreateCharge = true" title="Create Charge">
            <i class="material-icons">add</i>
            Create Charge
          </button>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">receipt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ charges.length }}</div>
            <div class="stat-label">Total Charges</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activeChargesCount }}</div>
            <div class="stat-label">Active Charges</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">attach_money</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
            <div class="stat-label">Total Amount</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">payments</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(collectedAmount) }}</div>
            <div class="stat-label">Collected Amount</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'charges'"
            (click)="activeTab = 'charges'"
          >
            <i class="material-icons">receipt</i>
            Charges
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'applications'"
            (click)="activeTab = 'applications'"
          >
            <i class="material-icons">list</i>
            Applications
          </button>
        </div>
      </div>

      <!-- Charges Tab -->
      <div class="content-section" *ngIf="activeTab === 'charges'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search charges by name..." 
              [(ngModel)]="searchQuery"
              (input)="filterCharges()"
            />
          </div>
          <select [(ngModel)]="typeFilter" (change)="filterCharges()" class="filter-select">
            <option value="all">All Types</option>
            <option value="corpus">Corpus Fund</option>
            <option value="sinking_fund">Sinking Fund</option>
            <option value="special_assessment">Special Assessment</option>
          </select>
          <select [(ngModel)]="statusFilter" (change)="filterCharges()" class="filter-select">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="collected">Collected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <!-- Charges Grid -->
        <div class="charges-grid">
          <div *ngFor="let charge of filteredCharges" class="charge-card" [class.inactive]="charge.status !== 'active'">
            <div class="charge-header">
              <div class="charge-title">
                <h3>{{ charge.name }}</h3>
                <span class="charge-badge" [ngClass]="charge.chargeType">
                  {{ getChargeTypeLabel(charge.chargeType) }}
                </span>
              </div>
              <div class="charge-status">
                <span class="status-badge" [ngClass]="charge.status">
                  {{ getStatusLabel(charge.status) }}
                </span>
              </div>
            </div>
            <p class="charge-description">{{ charge.description }}</p>
            <div class="charge-details">
              <div class="detail-item">
                <i class="material-icons">attach_money</i>
                <span>Amount: <strong>{{ getAmountDisplay(charge) }}</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">calculate</i>
                <span>Calculation: <strong>{{ getCalculationTypeLabel(charge.calculationType) }}</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">people</i>
                <span>Applicable To: <strong>{{ getApplicableToLabel(charge.applicableTo) }}</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">calendar_today</i>
                <span>Due Date: <strong>{{ formatDate(charge.dueDate) }}</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">trending_up</i>
                <span>Collection: <strong>{{ charge.collectedAmount }} / {{ charge.totalAmount }}</strong></span>
              </div>
            </div>
            <div class="charge-progress">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="getCollectionPercentage(charge)"></div>
              </div>
              <span class="progress-text">{{ getCollectionPercentage(charge) }}% Collected</span>
            </div>
            <div class="charge-actions">
              <button class="action-btn view" (click)="viewCharge(charge)" title="View Details">
                <i class="material-icons">visibility</i>
                View
              </button>
              <button class="action-btn edit" (click)="editCharge(charge)" title="Edit">
                <i class="material-icons">edit</i>
                Edit
              </button>
              <button class="action-btn apply" (click)="applyCharge(charge)" title="Apply to Units" *ngIf="charge.status === 'draft'">
                <i class="material-icons">play_arrow</i>
                Apply
              </button>
              <button class="action-btn delete" (click)="deleteCharge(charge)" title="Delete">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredCharges.length === 0">
          <i class="material-icons">receipt</i>
          <p>No charges found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showCreateCharge = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Create First Charge
          </button>
        </div>
      </div>

      <!-- Applications Tab -->
      <div class="content-section" *ngIf="activeTab === 'applications'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by charge, resident..." 
              [(ngModel)]="applicationSearchQuery"
              (input)="filterApplications()"
            />
          </div>
          <select [(ngModel)]="applicationStatusFilter" (change)="filterApplications()" class="filter-select">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="waived">Waived</option>
          </select>
          <select [(ngModel)]="applicationChargeFilter" (change)="filterApplications()" class="filter-select">
            <option value="all">All Charges</option>
            <option *ngFor="let charge of charges" [value]="charge.id">{{ charge.name }}</option>
          </select>
        </div>

        <!-- Applications Table -->
        <div class="applications-table-container">
          <table class="applications-table">
            <thead>
              <tr>
                <th>Charge</th>
                <th>Resident</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let application of filteredApplications">
                <td>
                  <div class="charge-info">
                    <strong>{{ application.chargeName }}</strong>
                    <div class="charge-number">{{ application.chargeNumber }}</div>
                  </div>
                </td>
                <td>
                  <div class="resident-info">
                    <div class="resident-name">{{ application.residentName }}</div>
                    <div class="resident-flat">{{ application.flatNumber }}</div>
                  </div>
                </td>
                <td class="amount">{{ formatCurrency(application.calculatedAmount) }}</td>
                <td>{{ formatDate(application.dueDate) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="application.status">
                    {{ getStatusLabel(application.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="action-btn view" (click)="viewApplication(application)" title="View">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="action-btn mark-paid" (click)="markAsPaid(application)" title="Mark as Paid" *ngIf="application.status === 'pending' || application.status === 'overdue'">
                      <i class="material-icons">check</i>
                    </button>
                    <button class="action-btn waive" (click)="waiveApplication(application)" title="Waive" *ngIf="application.status === 'pending' || application.status === 'overdue'">
                      <i class="material-icons">cancel</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredApplications.length === 0">
            <i class="material-icons">list</i>
            <p>No applications found</p>
          </div>
        </div>
      </div>

      <!-- Create/Edit Charge Modal -->
      <div class="modal-overlay" *ngIf="showCreateCharge || editingCharge" (click)="closeModal()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingCharge ? 'Edit Custom Charge' : 'Create Custom Charge' }}</h2>
            <button class="close-btn" (click)="closeModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Charge Type <span class="required">*</span></label>
                  <select [(ngModel)]="newCharge.chargeType" (change)="onChargeTypeChange()" required>
                    <option value="corpus">Corpus Fund</option>
                    <option value="sinking_fund">Sinking Fund</option>
                    <option value="special_assessment">Special Assessment</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Charge Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newCharge.name" placeholder="e.g., Building Maintenance Corpus" required />
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newCharge.description" placeholder="Describe this charge" rows="3"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Calculation Type <span class="required">*</span></label>
                  <select [(ngModel)]="newCharge.calculationType" (change)="onCalculationTypeChange()" required>
                    <option value="fixed">Fixed Amount</option>
                    <option value="per_sqft">Per Square Foot</option>
                    <option value="per_unit">Per Unit</option>
                    <option value="percentage">Percentage of Maintenance</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>{{ getCalculationValueLabel() }} <span class="required">*</span></label>
                  <input 
                    type="number" 
                    [(ngModel)]="newCharge.calculationValue" 
                    min="0" 
                    step="0.01" 
                    placeholder="0.00" 
                    required 
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Applicable To <span class="required">*</span></label>
                  <select [(ngModel)]="newCharge.applicableTo" required>
                    <option value="all">All Units</option>
                    <option value="residential">Residential Only</option>
                    <option value="commercial">Commercial Only</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Due Date <span class="required">*</span></label>
                  <input type="date" [(ngModel)]="dueDate" required />
                </div>
              </div>

              <div class="form-section-inner" *ngIf="newCharge.calculationType === 'per_sqft' || newCharge.calculationType === 'per_unit'">
                <h3>Area/Unit Filters (Optional)</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Minimum Area (sqft)</label>
                    <input type="number" [(ngModel)]="areaRangeMin" min="0" placeholder="No minimum" />
                  </div>
                  <div class="form-group">
                    <label>Maximum Area (sqft)</label>
                    <input type="number" [(ngModel)]="areaRangeMax" min="0" placeholder="No maximum" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveCharge()" [disabled]="!isChargeValid()">
              <i class="material-icons">save</i>
              {{ editingCharge ? 'Update' : 'Create' }} Charge
            </button>
          </div>
        </div>
      </div>

      <!-- Charge Details Modal -->
      <div class="modal-overlay" *ngIf="selectedCharge" (click)="selectedCharge = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ selectedCharge?.name }}</h2>
            <button class="close-btn" (click)="selectedCharge = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedCharge">
            <div class="charge-detail-section">
              <h3>Charge Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Type:</span>
                  <span class="value">{{ getChargeTypeLabel(selectedCharge.chargeType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Calculation Type:</span>
                  <span class="value">{{ getCalculationTypeLabel(selectedCharge.calculationType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Amount:</span>
                  <span class="value">{{ getAmountDisplay(selectedCharge) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Applicable To:</span>
                  <span class="value">{{ getApplicableToLabel(selectedCharge.applicableTo) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Due Date:</span>
                  <span class="value">{{ formatDate(selectedCharge.dueDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="selectedCharge.status">
                    {{ getStatusLabel(selectedCharge.status) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">Total Units:</span>
                  <span class="value">{{ selectedCharge.totalUnits }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Collected Units:</span>
                  <span class="value">{{ selectedCharge.collectedUnits }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Total Amount:</span>
                  <span class="value">{{ formatCurrency(selectedCharge.totalAmount) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Collected Amount:</span>
                  <span class="value">{{ formatCurrency(selectedCharge.collectedAmount) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedCharge = null">Close</button>
            <button class="btn btn-primary" (click)="editCharge(selectedCharge!)">
              <i class="material-icons">edit</i>
              Edit Charge
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-charges-container {
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
      color: #27ae60;
    }

    .tab.active {
      color: #27ae60;
      border-bottom-color: #27ae60;
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

    /* Charges Grid */
    .charges-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .charge-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .charge-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .charge-card.inactive {
      opacity: 0.7;
    }

    .charge-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .charge-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .charge-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .charge-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .charge-badge.corpus { background: #e7f3ff; color: #2980b9; }
    .charge-badge.sinking_fund { background: #fff4e6; color: #e67e22; }
    .charge-badge.special_assessment { background: #e8f8f0; color: #1e9e5a; }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.draft { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.active { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.collected { background: #e7f3ff; color: #2980b9; }
    .status-badge.cancelled { background: #ffeaea; color: #c0392b; }
    .status-badge.pending { background: #fff4e6; color: #e67e22; }
    .status-badge.paid { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.overdue { background: #ffeaea; color: #c0392b; }
    .status-badge.waived { background: #f5f7fa; color: #7f8c8d; }

    .charge-description {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .charge-details {
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
      color: #27ae60;
    }

    .charge-progress {
      margin-bottom: 16px;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #27ae60 0%, #229954 100%);
      transition: width 0.3s;
    }

    .progress-text {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .charge-actions {
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
    .action-btn.apply { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.delete { background: #ffeaea; color: #c0392b; }
    .action-btn.mark-paid { background: #e8f8f0; color: #1e9e5a; }
    .action-btn.waive { background: #f5f7fa; color: #7f8c8d; }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    /* Applications Table */
    .applications-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .applications-table {
      width: 100%;
    }

    .applications-table thead {
      background: #f8f9fa;
    }

    .applications-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .applications-table td {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .charge-info {
      display: flex;
      flex-direction: column;
    }

    .charge-number {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
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
      border-color: #27ae60;
    }

    .charge-detail-section {
      margin-bottom: 24px;
    }

    .charge-detail-section h3 {
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
      }

      .charges-grid {
        grid-template-columns: 1fr;
      }

      .applications-table-container {
        overflow-x: auto;
      }

      .applications-table {
        min-width: 1200px;
      }
    }
  `]
})
export class CustomChargesComponent implements OnInit, OnDestroy {
  charges: CustomCharge[] = [];
  filteredCharges: CustomCharge[] = [];
  applications: ChargeApplication[] = [];
  filteredApplications: ChargeApplication[] = [];
  selectedCharge: CustomCharge | null = null;
  editingCharge: CustomCharge | null = null;
  searchQuery: string = '';
  applicationSearchQuery: string = '';
  typeFilter: string = 'all';
  statusFilter: string = 'all';
  applicationStatusFilter: string = 'all';
  applicationChargeFilter: string = 'all';
  activeTab: 'charges' | 'applications' = 'charges';
  showCreateCharge: boolean = false;
  showReports: boolean = false;
  dueDate: string = '';
  areaRangeMin: number | undefined;
  areaRangeMax: number | undefined;

  newCharge: Partial<CustomCharge> = {
    chargeType: 'corpus',
    name: '',
    description: '',
    calculationType: 'fixed',
    calculationValue: 0,
    applicableTo: 'all',
    status: 'draft',
    totalUnits: 0,
    collectedUnits: 0,
    totalAmount: 0,
    collectedAmount: 0
  };

  private destroy$ = new Subject<void>();

  constructor() {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    this.dueDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadCharges();
    this.loadApplications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load charges
   */
  loadCharges(): void {
    this.charges = [
      {
        id: 'charge-1',
        chargeNumber: 'CORP-2024-001',
        chargeType: 'corpus',
        name: 'Building Corpus Fund',
        description: 'Corpus fund for building maintenance and repairs',
        amount: 0,
        calculationType: 'per_sqft',
        calculationValue: 50,
        applicableTo: 'all',
        dueDate: new Date(2024, 2, 1),
        status: 'active',
        totalUnits: 100,
        collectedUnits: 75,
        totalAmount: 500000,
        collectedAmount: 375000,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      },
      {
        id: 'charge-2',
        chargeNumber: 'SINK-2024-001',
        chargeType: 'sinking_fund',
        name: 'Sinking Fund Contribution',
        description: 'Sinking fund for future major repairs and renovations',
        amount: 0,
        calculationType: 'fixed',
        calculationValue: 5000,
        applicableTo: 'residential',
        dueDate: new Date(2024, 2, 15),
        status: 'active',
        totalUnits: 80,
        collectedUnits: 60,
        totalAmount: 400000,
        collectedAmount: 300000,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1)
      },
      {
        id: 'charge-3',
        chargeNumber: 'SPEC-2024-001',
        chargeType: 'special_assessment',
        name: 'Elevator Modernization',
        description: 'Special assessment for elevator modernization project',
        amount: 0,
        calculationType: 'per_unit',
        calculationValue: 15000,
        applicableTo: 'all',
        dueDate: new Date(2024, 3, 1),
        status: 'draft',
        totalUnits: 0,
        collectedUnits: 0,
        totalAmount: 0,
        collectedAmount: 0,
        createdAt: new Date(2024, 1, 1),
        updatedAt: new Date(2024, 1, 1)
      }
    ];
    this.filterCharges();
  }

  /**
   * Load applications
   */
  loadApplications(): void {
    this.applications = [
      {
        id: 'app-1',
        chargeId: 'charge-1',
        chargeNumber: 'CORP-2024-001',
        chargeName: 'Building Corpus Fund',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        flatArea: 1200,
        calculatedAmount: 60000,
        status: 'paid',
        dueDate: new Date(2024, 2, 1),
        paidDate: new Date(2024, 2, 5),
        paymentId: 'pay-001',
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'app-2',
        chargeId: 'charge-1',
        chargeNumber: 'CORP-2024-001',
        chargeName: 'Building Corpus Fund',
        residentId: 'res-2',
        residentName: 'Priya Sharma',
        flatNumber: 'B-205',
        flatArea: 1500,
        calculatedAmount: 75000,
        status: 'pending',
        dueDate: new Date(2024, 2, 1),
        createdAt: new Date(2024, 0, 1)
      },
      {
        id: 'app-3',
        chargeId: 'charge-2',
        chargeNumber: 'SINK-2024-001',
        chargeName: 'Sinking Fund Contribution',
        residentId: 'res-1',
        residentName: 'Rajesh Kumar',
        flatNumber: 'A-101',
        calculatedAmount: 5000,
        status: 'paid',
        dueDate: new Date(2024, 2, 15),
        paidDate: new Date(2024, 2, 10),
        paymentId: 'pay-002',
        createdAt: new Date(2024, 0, 1)
      }
    ];
    this.filterApplications();
  }

  /**
   * Filter charges
   */
  filterCharges(): void {
    let filtered = [...this.charges];

    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(c => c.chargeType === this.typeFilter);
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === this.statusFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)) ||
        c.chargeNumber.toLowerCase().includes(query)
      );
    }

    this.filteredCharges = filtered;
  }

  /**
   * Filter applications
   */
  filterApplications(): void {
    let filtered = [...this.applications];

    if (this.applicationStatusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === this.applicationStatusFilter);
    }

    if (this.applicationChargeFilter !== 'all') {
      filtered = filtered.filter(a => a.chargeId === this.applicationChargeFilter);
    }

    if (this.applicationSearchQuery.trim()) {
      const query = this.applicationSearchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.chargeName.toLowerCase().includes(query) ||
        a.residentName.toLowerCase().includes(query) ||
        a.flatNumber.toLowerCase().includes(query) ||
        a.chargeNumber.toLowerCase().includes(query)
      );
    }

    this.filteredApplications = filtered;
  }

  /**
   * Get active charges count
   */
  get activeChargesCount(): number {
    return this.charges.filter(c => c.status === 'active').length;
  }

  /**
   * Get total amount
   */
  get totalAmount(): number {
    return this.charges.reduce((sum, c) => sum + c.totalAmount, 0);
  }

  /**
   * Get collected amount
   */
  get collectedAmount(): number {
    return this.charges.reduce((sum, c) => sum + c.collectedAmount, 0);
  }

  /**
   * View charge details
   */
  viewCharge(charge: CustomCharge): void {
    this.selectedCharge = charge;
  }

  /**
   * Edit charge
   */
  editCharge(charge: CustomCharge): void {
    this.editingCharge = charge;
    this.newCharge = { ...charge };
    this.dueDate = new Date(charge.dueDate).toISOString().split('T')[0];
    this.areaRangeMin = charge.areaRange?.min;
    this.areaRangeMax = charge.areaRange?.max;
    this.showCreateCharge = true;
  }

  /**
   * Apply charge to units
   */
  applyCharge(charge: CustomCharge): void {
    if (confirm(`Apply charge "${charge.name}" to all applicable units?`)) {
      charge.status = 'active';
      // In real app, calculate and create applications for all units
      alert('Charge applied to all applicable units!');
      this.filterCharges();
    }
  }

  /**
   * Delete charge
   */
  deleteCharge(charge: CustomCharge): void {
    if (confirm(`Are you sure you want to delete "${charge.name}"?`)) {
      this.charges = this.charges.filter(c => c.id !== charge.id);
      this.filterCharges();
      alert('Charge deleted successfully!');
    }
  }

  /**
   * Save charge
   */
  saveCharge(): void {
    if (!this.isChargeValid()) {
      return;
    }

    const charge: CustomCharge = {
      id: this.editingCharge?.id || `charge-${Date.now()}`,
      chargeNumber: this.editingCharge?.chargeNumber || `${this.getChargePrefix()}-${new Date().getFullYear()}-${String(this.charges.length + 1).padStart(3, '0')}`,
      chargeType: this.newCharge.chargeType!,
      name: this.newCharge.name!,
      description: this.newCharge.description || '',
      amount: 0,
      calculationType: this.newCharge.calculationType!,
      calculationValue: this.newCharge.calculationValue!,
      applicableTo: this.newCharge.applicableTo!,
      areaRange: (this.areaRangeMin || this.areaRangeMax) ? {
        min: this.areaRangeMin,
        max: this.areaRangeMax
      } : undefined,
      dueDate: new Date(this.dueDate),
      status: this.newCharge.status || 'draft',
      totalUnits: this.newCharge.totalUnits || 0,
      collectedUnits: this.newCharge.collectedUnits || 0,
      totalAmount: this.newCharge.totalAmount || 0,
      collectedAmount: this.newCharge.collectedAmount || 0,
      createdAt: this.editingCharge?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (this.editingCharge) {
      const index = this.charges.findIndex(c => c.id === this.editingCharge!.id);
      if (index > -1) {
        this.charges[index] = charge;
      }
      alert('Charge updated successfully!');
    } else {
      this.charges.unshift(charge);
      alert('Charge created successfully!');
    }

    this.filterCharges();
    this.closeModal();
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showCreateCharge = false;
    this.editingCharge = null;
    this.resetNewCharge();
  }

  /**
   * Reset new charge
   */
  resetNewCharge(): void {
    this.newCharge = {
      chargeType: 'corpus',
      name: '',
      description: '',
      calculationType: 'fixed',
      calculationValue: 0,
      applicableTo: 'all',
      status: 'draft',
      totalUnits: 0,
      collectedUnits: 0,
      totalAmount: 0,
      collectedAmount: 0
    };
    const today = new Date();
    today.setDate(today.getDate() + 30);
    this.dueDate = today.toISOString().split('T')[0];
    this.areaRangeMin = undefined;
    this.areaRangeMax = undefined;
  }

  /**
   * On charge type change
   */
  onChargeTypeChange(): void {
    // Reset values when type changes
  }

  /**
   * On calculation type change
   */
  onCalculationTypeChange(): void {
    // Reset calculation value when type changes
    this.newCharge.calculationValue = 0;
  }

  /**
   * Get charge prefix
   */
  getChargePrefix(): string {
    const prefixes: { [key: string]: string } = {
      corpus: 'CORP',
      sinking_fund: 'SINK',
      special_assessment: 'SPEC'
    };
    return prefixes[this.newCharge.chargeType || 'corpus'] || 'CHRG';
  }

  /**
   * Get calculation value label
   */
  getCalculationValueLabel(): string {
    const labels: { [key: string]: string } = {
      fixed: 'Fixed Amount',
      per_sqft: 'Rate Per Square Foot',
      per_unit: 'Amount Per Unit',
      percentage: 'Percentage (%)'
    };
    return labels[this.newCharge.calculationType || 'fixed'] || 'Value';
  }

  /**
   * Get amount display
   */
  getAmountDisplay(charge: CustomCharge): string {
    if (charge.calculationType === 'fixed') {
      return this.formatCurrency(charge.calculationValue);
    } else if (charge.calculationType === 'per_sqft') {
      return `${this.formatCurrency(charge.calculationValue)} / sqft`;
    } else if (charge.calculationType === 'per_unit') {
      return `${this.formatCurrency(charge.calculationValue)} / unit`;
    } else {
      return `${charge.calculationValue}%`;
    }
  }

  /**
   * Get collection percentage
   */
  getCollectionPercentage(charge: CustomCharge): number {
    if (charge.totalAmount === 0) return 0;
    return Math.round((charge.collectedAmount / charge.totalAmount) * 100);
  }

  /**
   * View application
   */
  viewApplication(application: ChargeApplication): void {
    // View application details
    console.log('View application:', application);
  }

  /**
   * Mark as paid
   */
  markAsPaid(application: ChargeApplication): void {
    if (confirm(`Mark charge application as paid for ${application.residentName}?`)) {
      application.status = 'paid';
      application.paidDate = new Date();
      this.filterApplications();
      alert('Application marked as paid!');
    }
  }

  /**
   * Waive application
   */
  waiveApplication(application: ChargeApplication): void {
    if (confirm(`Waive charge application for ${application.residentName}?`)) {
      application.status = 'waived';
      this.filterApplications();
      alert('Application waived!');
    }
  }

  /**
   * Is charge valid
   */
  isChargeValid(): boolean {
    return !!(
      this.newCharge.chargeType &&
      this.newCharge.name &&
      this.newCharge.calculationType &&
      this.newCharge.calculationValue &&
      this.newCharge.calculationValue > 0 &&
      this.newCharge.applicableTo &&
      this.dueDate
    );
  }

  /**
   * Get charge type label
   */
  getChargeTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      corpus: 'Corpus Fund',
      sinking_fund: 'Sinking Fund',
      special_assessment: 'Special Assessment'
    };
    return labels[type] || type;
  }

  /**
   * Get calculation type label
   */
  getCalculationTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      fixed: 'Fixed Amount',
      per_sqft: 'Per Square Foot',
      per_unit: 'Per Unit',
      percentage: 'Percentage'
    };
    return labels[type] || type;
  }

  /**
   * Get applicable to label
   */
  getApplicableToLabel(type: string): string {
    const labels: { [key: string]: string } = {
      all: 'All Units',
      residential: 'Residential Only',
      commercial: 'Commercial Only',
      mixed: 'Mixed'
    };
    return labels[type] || type;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Draft',
      active: 'Active',
      collected: 'Collected',
      cancelled: 'Cancelled',
      pending: 'Pending',
      paid: 'Paid',
      overdue: 'Overdue',
      waived: 'Waived'
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

