import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { LatePaymentPenaltyService } from '../../services/late-payment-penalty.service';
import { PenaltyApplication, PenaltyRule } from '../../models/late-payment-penalty.model';

/**
 * Late Payment Penalties Component
 * Handles automatic calculation and management of late payment penalties
 */
@Component({
  selector: 'app-late-payment-penalties',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="penalties-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">warning</i>
            Late Payment Penalties
          </h1>
          <p>Automatically calculate and manage late payment penalties</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/late-payment-penalties</strong> API.</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showReports = true" title="Reports">
            <i class="material-icons">assessment</i>
            Reports
          </button>
          <button class="icon-btn primary" (click)="showCreateRule = true" title="Create Rule">
            <i class="material-icons">add</i>
            Create Rule
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
            <i class="material-icons">rule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ rules.length }}</div>
            <div class="stat-label">Penalty Rules</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ activeRulesCount }}</div>
            <div class="stat-label">Active Rules</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">attach_money</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(totalPenalties) }}</div>
            <div class="stat-label">Total Penalties</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingPenaltiesCount }}</div>
            <div class="stat-label">Pending Applications</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'rules'"
            (click)="activeTab = 'rules'"
          >
            <i class="material-icons">rule</i>
            Penalty Rules
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'applications'"
            (click)="activeTab = 'applications'; onApplicationsTab()"
          >
            <i class="material-icons">receipt</i>
            Penalty Applications
          </button>
        </div>
      </div>

      <!-- Penalty Rules Tab -->
      <div class="content-section" *ngIf="activeTab === 'rules'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search rules by name..." 
              [(ngModel)]="searchQuery"
              (input)="filterRules()"
            />
          </div>
          <select [(ngModel)]="statusFilter" (change)="filterRules()" class="filter-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select [(ngModel)]="typeFilter" (change)="filterRules()" class="filter-select">
            <option value="all">All Types</option>
            <option value="fixed">Fixed</option>
            <option value="percentage">Percentage</option>
            <option value="progressive">Progressive</option>
          </select>
        </div>

        <!-- Rules Grid -->
        <div class="rules-grid">
          <div *ngFor="let rule of filteredRules" class="rule-card" [class.inactive]="!rule.isActive">
            <div class="rule-header">
              <div class="rule-title">
                <h3>{{ rule.name }}</h3>
                <span class="rule-badge" [ngClass]="rule.penaltyType">
                  {{ getPenaltyTypeLabel(rule.penaltyType) }}
                </span>
              </div>
              <div class="rule-status">
                <span class="status-badge" [ngClass]="rule.isActive ? 'active' : 'inactive'">
                  {{ rule.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
            <p class="rule-description">{{ rule.description }}</p>
            <div class="rule-details">
              <div class="detail-item">
                <i class="material-icons">category</i>
                <span>Applicable To: <strong>{{ getApplicableToLabel(rule.applicableTo) }}</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">timer</i>
                <span>Grace Period: <strong>{{ rule.gracePeriodDays }} days</strong></span>
              </div>
              <div class="detail-item">
                <i class="material-icons">autorenew</i>
                <span>Auto-Calculate: <strong>{{ rule.autoCalculate ? 'Yes' : 'No' }}</strong></span>
              </div>
              <!-- Fixed Penalty Details -->
              <div class="detail-item" *ngIf="rule.penaltyType === 'fixed'">
                <i class="material-icons">attach_money</i>
                <span>Amount: <strong>{{ formatCurrency(getFixedAmount(rule)) }}</strong></span>
              </div>
              <!-- Percentage Penalty Details -->
              <div class="detail-item" *ngIf="rule.penaltyType === 'percentage'">
                <i class="material-icons">percent</i>
                <span>Rate: <strong>{{ getPercentageRate(rule) }}%</strong> per {{ getCalculationPeriod(rule) }}</span>
              </div>
              <!-- Progressive Penalty Details -->
              <div class="detail-item" *ngIf="rule.penaltyType === 'progressive'">
                <i class="material-icons">trending_up</i>
                <span>Tiers: <strong>{{ getTiersCount(rule) }}</strong></span>
              </div>
            </div>
            <div class="rule-actions">
              <button class="action-btn view" (click)="viewRule(rule)" title="View Details">
                <i class="material-icons">visibility</i>
                View
              </button>
              <button class="action-btn edit" (click)="editRule(rule)" title="Edit">
                <i class="material-icons">edit</i>
                Edit
              </button>
              <button class="action-btn toggle" (click)="toggleRule(rule)" [title]="rule.isActive ? 'Deactivate' : 'Activate'">
                <i class="material-icons">{{ rule.isActive ? 'pause' : 'play_arrow' }}</i>
                {{ rule.isActive ? 'Deactivate' : 'Activate' }}
              </button>
              <button class="action-btn delete" (click)="deleteRule(rule)" title="Delete">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredRules.length === 0">
          <i class="material-icons">rule</i>
          <p>No penalty rules found</p>
          <span *ngIf="searchQuery">Try adjusting your search</span>
          <button class="btn btn-primary" (click)="showCreateRule = true" *ngIf="!searchQuery">
            <i class="material-icons">add</i>
            Create First Rule
          </button>
        </div>
      </div>

      <!-- Penalty Applications Tab -->
      <div class="content-section" *ngIf="activeTab === 'applications'">
        <!-- Filters -->
        <div class="filters-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by invoice, resident..." 
              [(ngModel)]="applicationSearchQuery"
              (input)="filterApplications()"
            />
          </div>
          <select [(ngModel)]="applicationStatusFilter" (change)="filterApplications()" class="filter-select">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
            <option value="waived">Waived</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        <!-- Applications Table -->
        <div class="applications-table-container">
          <table class="applications-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Resident</th>
                <th>Due Date</th>
                <th>Days Late</th>
                <th>Original Amount</th>
                <th>Penalty Amount</th>
                <th>Rule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let application of filteredApplications">
                <td>
                  <strong>{{ application.invoiceNumber }}</strong>
                </td>
                <td>
                  <div class="resident-info">
                    <div class="resident-name">{{ application.residentName }}</div>
                    <div class="resident-flat">{{ application.flatNumber }}</div>
                  </div>
                </td>
                <td>{{ formatDate(application.dueDate) }}</td>
                <td>
                  <span class="days-late-badge">{{ application.daysLate }} days</span>
                </td>
                <td>{{ formatCurrency(application.originalAmount) }}</td>
                <td class="penalty-amount">{{ formatCurrency(application.penaltyAmount) }}</td>
                <td>{{ application.penaltyRuleName }}</td>
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
                    <button class="action-btn apply" (click)="applyPenalty(application)" title="Apply" *ngIf="application.status === 'pending'">
                      <i class="material-icons">check</i>
                    </button>
                    <button class="action-btn waive" (click)="waivePenalty(application)" title="Waive" *ngIf="application.status === 'pending' || application.status === 'applied'">
                      <i class="material-icons">cancel</i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredApplications.length === 0">
            <i class="material-icons">receipt</i>
            <p>No penalty applications found</p>
          </div>
        </div>
      </div>

      <!-- Create/Edit Rule Modal -->
      <div class="modal-overlay" *ngIf="showCreateRule || editingRule" (click)="closeModal()">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingRule ? 'Edit Penalty Rule' : 'Create Penalty Rule' }}</h2>
            <button class="close-btn" (click)="closeModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label>Rule Name <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newRule.name" placeholder="e.g., Standard Late Fee" required />
                </div>
                <div class="form-group">
                  <label>Penalty Type <span class="required">*</span></label>
                  <select [(ngModel)]="newRule.penaltyType" (change)="onPenaltyTypeChange()" required>
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                    <option value="progressive">Progressive</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newRule.description" placeholder="Describe this penalty rule" rows="3"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Applicable To <span class="required">*</span></label>
                  <select [(ngModel)]="newRule.applicableTo" required>
                    <option value="all">All Bills</option>
                    <option value="maintenance">Maintenance Only</option>
                    <option value="utility">Utility Only</option>
                    <option value="service">Service Only</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Grace Period (Days)</label>
                  <input type="number" [(ngModel)]="newRule.gracePeriodDays" min="0" placeholder="0" />
                </div>
                <div class="form-group">
                  <label>Auto-Calculate</label>
                  <div class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="newRule.autoCalculate" id="autoCalculate" />
                    <label for="autoCalculate"></label>
                  </div>
                </div>
              </div>

              <!-- Fixed Penalty Configuration -->
              <div class="form-section-inner" *ngIf="newRule.penaltyType === 'fixed'">
                <h3>Fixed Penalty Configuration</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Fixed Amount <span class="required">*</span></label>
                    <input type="number" [(ngModel)]="fixedRule.fixedAmount" min="0" step="0.01" placeholder="0.00" required />
                  </div>
                  <div class="form-group">
                    <label>Max Penalty Amount (Optional)</label>
                    <input type="number" [(ngModel)]="fixedRule.maxPenaltyAmount" min="0" step="0.01" placeholder="No limit" />
                  </div>
                </div>
              </div>

              <!-- Percentage Penalty Configuration -->
              <div class="form-section-inner" *ngIf="newRule.penaltyType === 'percentage'">
                <h3>Percentage Penalty Configuration</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Percentage Rate <span class="required">*</span></label>
                    <input type="number" [(ngModel)]="percentageRule.percentageRate" min="0" max="100" step="0.01" placeholder="0.00" required />
                  </div>
                  <div class="form-group">
                    <label>Calculation Period <span class="required">*</span></label>
                    <select [(ngModel)]="percentageRule.calculationPeriod" required>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Max Penalty Percentage (Optional)</label>
                    <input type="number" [(ngModel)]="percentageRule.maxPenaltyPercentage" min="0" max="100" step="0.01" placeholder="No limit" />
                  </div>
                  <div class="form-group">
                    <label>Max Penalty Amount (Optional)</label>
                    <input type="number" [(ngModel)]="percentageRule.maxPenaltyAmount" min="0" step="0.01" placeholder="No limit" />
                  </div>
                </div>
              </div>

              <!-- Progressive Penalty Configuration -->
              <div class="form-section-inner" *ngIf="newRule.penaltyType === 'progressive'">
                <h3>Progressive Penalty Configuration</h3>
                <div class="tiers-section">
                  <div class="section-header">
                    <h4>Penalty Tiers</h4>
                    <button class="btn btn-sm" (click)="addTier()">
                      <i class="material-icons">add</i>
                      Add Tier
                    </button>
                  </div>
                  <div class="tiers-list">
                    <div *ngFor="let tier of progressiveRule.tiers; let i = index" class="tier-row">
                      <div class="tier-inputs">
                        <input type="number" [(ngModel)]="tier.daysFrom" min="0" placeholder="Days from" />
                        <input type="number" [(ngModel)]="tier.daysTo" min="0" placeholder="Days to (optional)" />
                        <select [(ngModel)]="tier.penaltyType">
                          <option value="fixed">Fixed</option>
                          <option value="percentage">Percentage</option>
                        </select>
                        <input type="number" [(ngModel)]="tier.amount" min="0" step="0.01" placeholder="Amount" *ngIf="tier.penaltyType === 'fixed'" />
                        <input type="number" [(ngModel)]="tier.percentage" min="0" max="100" step="0.01" placeholder="Percentage" *ngIf="tier.penaltyType === 'percentage'" />
                      </div>
                      <button class="btn-icon" (click)="removeTier(i)">
                        <i class="material-icons">delete</i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveRule()" [disabled]="!isRuleValid() || isSaving">
              <i class="material-icons">save</i>
              {{ isSaving ? 'Saving...' : (editingRule ? 'Update' : 'Create') + ' Rule' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Rule Details Modal -->
      <div class="modal-overlay" *ngIf="selectedRule" (click)="selectedRule = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ selectedRule?.name }}</h2>
            <button class="close-btn" (click)="selectedRule = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedRule">
            <div class="rule-detail-section">
              <h3>Rule Information</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Type:</span>
                  <span class="value">{{ getPenaltyTypeLabel(selectedRule.penaltyType) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Applicable To:</span>
                  <span class="value">{{ getApplicableToLabel(selectedRule.applicableTo) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Grace Period:</span>
                  <span class="value">{{ selectedRule.gracePeriodDays }} days</span>
                </div>
                <div class="detail-item">
                  <span class="label">Auto-Calculate:</span>
                  <span class="value">{{ selectedRule.autoCalculate ? 'Yes' : 'No' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="selectedRule.isActive ? 'active' : 'inactive'">
                    {{ selectedRule.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="selectedRule = null">Close</button>
            <button class="btn btn-primary" (click)="editRule(selectedRule!)">
              <i class="material-icons">edit</i>
              Edit Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .penalties-container {
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
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
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
      color: #f39c12;
    }

    .tab.active {
      color: #f39c12;
      border-bottom-color: #f39c12;
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

    /* Rules Grid */
    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .rule-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .rule-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .rule-card.inactive {
      opacity: 0.7;
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .rule-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .rule-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .rule-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .rule-badge.fixed { background: #e7f3ff; color: #2980b9; }
    .rule-badge.percentage { background: #fff4e6; color: #e67e22; }
    .rule-badge.progressive { background: #e8f8f0; color: #1e9e5a; }

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
    .status-badge.applied { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.waived { background: #f5f7fa; color: #7f8c8d; }
    .status-badge.disputed { background: #ffeaea; color: #c0392b; }

    .rule-description {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .rule-details {
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
      color: #f39c12;
    }

    .rule-actions {
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
    .action-btn.apply { background: #e8f8f0; color: #1e9e5a; }
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

    .days-late-badge {
      padding: 4px 10px;
      background: #fff4e6;
      color: #e67e22;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .penalty-amount {
      font-weight: 600;
      color: #e67e22;
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
      border-color: #f39c12;
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
      background: #f39c12;
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

    .tiers-section {
      margin-top: 16px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .section-header h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .tiers-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .tier-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .tier-inputs {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      flex: 1;
    }

    .tier-inputs input,
    .tier-inputs select {
      padding: 8px;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      font-size: 13px;
    }

    .btn-icon {
      background: none;
      border: none;
      color: #e74c3c;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .rule-detail-section {
      margin-bottom: 24px;
    }

    .rule-detail-section h3 {
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

      .rules-grid {
        grid-template-columns: 1fr;
      }

      .applications-table-container {
        overflow-x: auto;
      }

      .applications-table {
        min-width: 1200px;
      }

      .tier-inputs {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LatePaymentPenaltiesComponent implements OnInit, OnDestroy {
  rules: PenaltyRule[] = [];
  filteredRules: PenaltyRule[] = [];
  applications: PenaltyApplication[] = [];
  filteredApplications: PenaltyApplication[] = [];
  selectedRule: PenaltyRule | null = null;
  editingRule: PenaltyRule | null = null;
  searchQuery: string = '';
  applicationSearchQuery: string = '';
  statusFilter: string = 'all';
  typeFilter: string = 'all';
  applicationStatusFilter: string = 'all';
  activeTab: 'rules' | 'applications' = 'rules';
  showCreateRule: boolean = false;
  showReports: boolean = false;
  loadError = '';
  isSaving = false;
  isCalculating = false;

  newRule: Partial<PenaltyRule> = {
    name: '',
    description: '',
    penaltyType: 'fixed',
    applicableTo: 'all',
    gracePeriodDays: 0,
    isActive: true,
    autoCalculate: true
  };

  fixedRule: Partial<PenaltyRule> = {
    fixedAmount: 0
  };

  percentageRule: Partial<PenaltyRule> = {
    percentageRate: 0,
    calculationPeriod: 'daily'
  };

  progressiveRule: Partial<PenaltyRule> = {
    tiers: []
  };

  private destroy$ = new Subject<void>();
  private penaltyService = inject(LatePaymentPenaltyService);
  private session = inject(SessionContextService);

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load rules and applications from APIs. */
  loadAll(): void {
    this.loadError = '';
    if (!this.session.getSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.rules = [];
      this.filteredRules = [];
      this.applications = [];
      this.filteredApplications = [];
      return;
    }

    forkJoin({
      rules: this.penaltyService.getRules(),
      applications: this.penaltyService.getApplications()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ rules, applications }) => {
          this.rules = rules;
          this.applications = applications;
          this.filterRules();
          this.filterApplications();
        },
        error: err => {
          console.error('Failed to load penalty data', err);
          this.loadError = 'Failed to load penalty data from the API. Ensure the backend is running.';
        }
      });
  }

  loadRules(): void {
    this.loadAll();
  }

  loadApplications(): void {
    this.loadAll();
  }

  /** Scan overdue bills and refresh applications when opening the tab. */
  onApplicationsTab(): void {
    if (!this.session.getSocietyId() || this.isCalculating) {
      return;
    }
    this.isCalculating = true;
    this.penaltyService
      .calculatePenalties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isCalculating = false;
          this.penaltyService
            .getApplications()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: apps => {
                this.applications = apps;
                this.filterApplications();
              },
              error: () => this.loadAll()
            });
        },
        error: err => {
          this.isCalculating = false;
          console.error('Failed to calculate penalties', err);
          this.loadAll();
        }
      });
  }

  /**
   * Filter rules
   */
  filterRules(): void {
    let filtered = [...this.rules];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(r => 
        this.statusFilter === 'active' ? r.isActive : !r.isActive
      );
    }

    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(r => r.penaltyType === this.typeFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query))
      );
    }

    this.filteredRules = filtered;
  }

  /**
   * Filter applications
   */
  filterApplications(): void {
    let filtered = [...this.applications];

    if (this.applicationStatusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === this.applicationStatusFilter);
    }

    if (this.applicationSearchQuery.trim()) {
      const query = this.applicationSearchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.invoiceNumber.toLowerCase().includes(query) ||
        a.residentName.toLowerCase().includes(query) ||
        a.flatNumber.toLowerCase().includes(query)
      );
    }

    this.filteredApplications = filtered;
  }

  /**
   * Get active rules count
   */
  get activeRulesCount(): number {
    return this.rules.filter(r => r.isActive).length;
  }

  /**
   * Get total penalties
   */
  get totalPenalties(): number {
    return this.applications
      .filter(a => a.status === 'applied')
      .reduce((sum, a) => sum + a.penaltyAmount, 0);
  }

  /**
   * Get pending penalties count
   */
  get pendingPenaltiesCount(): number {
    return this.applications.filter(a => a.status === 'pending').length;
  }

  /**
   * View rule details
   */
  viewRule(rule: PenaltyRule): void {
    this.selectedRule = rule;
  }

  /**
   * Edit rule
   */
  editRule(rule: PenaltyRule): void {
    this.editingRule = rule;
    this.newRule = { ...rule };

    if (rule.penaltyType === 'fixed') {
      this.fixedRule = { fixedAmount: rule.fixedAmount, maxPenaltyAmount: rule.maxPenaltyAmount };
    } else if (rule.penaltyType === 'percentage') {
      this.percentageRule = {
        percentageRate: rule.percentageRate,
        calculationPeriod: rule.calculationPeriod,
        maxPenaltyPercentage: rule.maxPenaltyPercentage,
        maxPenaltyAmount: rule.maxPenaltyAmount
      };
    } else if (rule.penaltyType === 'progressive') {
      this.progressiveRule = { tiers: rule.tiers ? [...rule.tiers] : [] };
    }

    this.showCreateRule = true;
  }

  toggleRule(rule: PenaltyRule): void {
    this.penaltyService
      .toggleRule(rule.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const index = this.rules.findIndex(r => r.id === updated.id);
          if (index >= 0) {
            this.rules[index] = updated;
          }
          this.filterRules();
          window.alert(`Rule ${updated.isActive ? 'activated' : 'deactivated'} successfully!`);
        },
        error: err => {
          console.error('Failed to toggle rule', err);
          window.alert('Failed to update rule status.');
        }
      });
  }

  deleteRule(rule: PenaltyRule): void {
    if (!window.confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      return;
    }
    this.penaltyService
      .deleteRule(rule.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.rules = this.rules.filter(r => r.id !== rule.id);
          this.filterRules();
          window.alert('Rule deleted successfully!');
        },
        error: err => {
          console.error('Failed to delete rule', err);
          window.alert('Failed to delete rule.');
        }
      });
  }

  saveRule(): void {
    if (!this.isRuleValid() || this.isSaving) {
      return;
    }
    if (!this.session.getSocietyId()) {
      window.alert('No society selected. Log in as admin and select a society in Society Setup.');
      return;
    }

    const payload: Partial<PenaltyRule> = {
      ...this.newRule,
      name: this.newRule.name!,
      description: this.newRule.description || '',
      penaltyType: this.newRule.penaltyType!,
      applicableTo: this.newRule.applicableTo!,
      gracePeriodDays: this.newRule.gracePeriodDays ?? 0,
      isActive: this.newRule.isActive ?? true,
      autoCalculate: this.newRule.autoCalculate ?? true
    };

    if (this.newRule.penaltyType === 'fixed') {
      payload.fixedAmount = this.fixedRule.fixedAmount;
      payload.maxPenaltyAmount = this.fixedRule.maxPenaltyAmount;
    } else if (this.newRule.penaltyType === 'percentage') {
      payload.percentageRate = this.percentageRule.percentageRate;
      payload.calculationPeriod = this.percentageRule.calculationPeriod;
      payload.maxPenaltyPercentage = this.percentageRule.maxPenaltyPercentage;
      payload.maxPenaltyAmount = this.percentageRule.maxPenaltyAmount;
    } else {
      payload.tiers = this.progressiveRule.tiers || [];
    }

    this.isSaving = true;
    const request$ = this.editingRule
      ? this.penaltyService.updateRule({ ...payload, id: this.editingRule.id } as PenaltyRule)
      : this.penaltyService.createRule(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.isSaving = false;
        if (this.editingRule) {
          const index = this.rules.findIndex(r => r.id === saved.id);
          if (index >= 0) {
            this.rules[index] = saved;
          }
        } else {
          this.rules.unshift(saved);
        }
        this.filterRules();
        this.closeModal();
        window.alert(this.editingRule ? 'Rule updated successfully!' : 'Rule created successfully!');
      },
      error: err => {
        this.isSaving = false;
        console.error('Failed to save rule', err);
        window.alert('Failed to save penalty rule.');
      }
    });
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showCreateRule = false;
    this.editingRule = null;
    this.resetNewRule();
  }

  /**
   * Reset new rule
   */
  resetNewRule(): void {
    this.newRule = {
      name: '',
      description: '',
      penaltyType: 'fixed',
      applicableTo: 'all',
      gracePeriodDays: 0,
      isActive: true,
      autoCalculate: true
    };
    this.fixedRule = { fixedAmount: 0 };
    this.percentageRule = { percentageRate: 0, calculationPeriod: 'daily' };
    this.progressiveRule = { tiers: [] };
  }

  /**
   * On penalty type change
   */
  onPenaltyTypeChange(): void {
    // Reset type-specific fields
    this.fixedRule = { fixedAmount: 0 };
    this.percentageRule = { percentageRate: 0, calculationPeriod: 'daily' };
    this.progressiveRule = { tiers: [] };
  }

  /**
   * Add tier
   */
  addTier(): void {
    if (!this.progressiveRule.tiers) {
      this.progressiveRule.tiers = [];
    }
    this.progressiveRule.tiers.push({
      daysFrom: 0,
      penaltyType: 'fixed',
      amount: 0
    });
  }

  /**
   * Remove tier
   */
  removeTier(index: number): void {
    if (this.progressiveRule.tiers) {
      this.progressiveRule.tiers.splice(index, 1);
    }
  }

  /**
   * View application
   */
  viewApplication(application: PenaltyApplication): void {
    // View application details
    console.log('View application:', application);
  }

  /**
   * Apply penalty
   */
  applyPenalty(application: PenaltyApplication): void {
    if (
      !window.confirm(
        `Apply penalty of ${this.formatCurrency(application.penaltyAmount)} to invoice ${application.invoiceNumber}?`
      )
    ) {
      return;
    }
    this.penaltyService
      .applyPenalty(application.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const index = this.applications.findIndex(a => a.id === updated.id);
          if (index >= 0) {
            this.applications[index] = updated;
          }
          this.filterApplications();
          window.alert('Penalty applied successfully!');
        },
        error: err => {
          console.error('Failed to apply penalty', err);
          window.alert('Failed to apply penalty.');
        }
      });
  }

  waivePenalty(application: PenaltyApplication): void {
    if (
      !window.confirm(
        `Waive penalty of ${this.formatCurrency(application.penaltyAmount)} for invoice ${application.invoiceNumber}?`
      )
    ) {
      return;
    }
    this.penaltyService
      .waivePenalty(application.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const index = this.applications.findIndex(a => a.id === updated.id);
          if (index >= 0) {
            this.applications[index] = updated;
          }
          this.filterApplications();
          window.alert('Penalty waived successfully!');
        },
        error: err => {
          console.error('Failed to waive penalty', err);
          window.alert('Failed to waive penalty.');
        }
      });
  }

  /**
   * Is rule valid
   */
  isRuleValid(): boolean {
    if (!this.newRule.name || !this.newRule.penaltyType || !this.newRule.applicableTo) {
      return false;
    }

    if (this.newRule.penaltyType === 'fixed') {
      return !!this.fixedRule.fixedAmount && this.fixedRule.fixedAmount > 0;
    } else if (this.newRule.penaltyType === 'percentage') {
      return !!this.percentageRule.percentageRate && this.percentageRule.percentageRate > 0;
    } else if (this.newRule.penaltyType === 'progressive') {
      return !!this.progressiveRule.tiers && this.progressiveRule.tiers.length > 0;
    }

    return false;
  }

  /**
   * Get penalty type label
   */
  getPenaltyTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      fixed: 'Fixed',
      percentage: 'Percentage',
      progressive: 'Progressive'
    };
    return labels[type] || type;
  }

  /**
   * Get applicable to label
   */
  getApplicableToLabel(type: string): string {
    const labels: { [key: string]: string } = {
      all: 'All Bills',
      maintenance: 'Maintenance Only',
      utility: 'Utility Only',
      service: 'Service Only',
      custom: 'Custom'
    };
    return labels[type] || type;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pending',
      applied: 'Applied',
      waived: 'Waived',
      disputed: 'Disputed'
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

  /**
   * Get fixed amount from rule
   */
  getFixedAmount(rule: PenaltyRule): number {
    return rule.fixedAmount || 0;
  }

  getPercentageRate(rule: PenaltyRule): number {
    return rule.percentageRate || 0;
  }

  getCalculationPeriod(rule: PenaltyRule): string {
    return rule.calculationPeriod || 'daily';
  }

  getTiersCount(rule: PenaltyRule): number {
    return rule.tiers?.length || 0;
  }
}

