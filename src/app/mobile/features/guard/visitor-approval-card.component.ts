import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, interval, of, forkJoin } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { VisitorManagementService } from '../../../modules/visitor-management/services/visitor-management.service';
import { Visitor, VisitorStatus } from '../../../modules/visitor-management/models/visitor.model';
import { SessionContextService } from '../../../core/services/session-context.service';

// Visitor interface matching the visitor management model
interface VisitorCard {
  id: string;
  name: string;
  phone: string;
  email?: string;
  purpose: string;
  visitingFlat: string;
  visitingUnit?: string;
  hostName: string;
  hostPhone: string;
  visitDate: Date;
  visitTime: string;
  expectedDuration?: number;
  vehicleNumber?: string;
  vehicleType?: string;
  numberOfVisitors?: number;
  photo?: string;
  idProof?: string;
  idProofNumber?: string;
  qrCode?: string;
  qrCodeData?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'EXPIRED' | 'CANCELLED';
  approvalStatus: 'PENDING' | 'AUTO_APPROVED' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  checkInTime?: Date;
  checkOutTime?: Date;
  gateApprovedAt?: Date;
  towerApprovedAt?: Date;
  guardNotes?: string;
  rejectionReason?: string;
  invitedBy: string;
  invitedDate: Date;
  expiryDate?: Date;
  isRecurring?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Time tracking
  timeSinceRequest?: string;
}

@Component({
  selector: 'app-visitor-approval-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="visitor-approval-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">how_to_reg</i>
            Visitor Approvals
          </h1>
          <p>One-tap approval for pending visitors</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="refreshVisitors()" title="Refresh">
            <i class="material-icons">refresh</i>
          </button>
          <button class="icon-btn" (click)="toggleFilterPanel()" title="Filter">
            <i class="material-icons">filter_list</i>
            <span class="filter-badge" *ngIf="activeFilterCount > 0">{{ activeFilterCount }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">pending_actions</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card today">
          <div class="stat-icon">
            <i class="material-icons">today</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.today }}</div>
            <div class="stat-label">Today</div>
          </div>
        </div>
        <div class="stat-card approved">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.onSite }}</div>
            <div class="stat-label">On Site</div>
          </div>
        </div>
      </div>

      <!-- Search and Filter Panel -->
      <div class="search-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by name, flat, phone..."
            [(ngModel)]="searchTerm"
            (input)="filterVisitors()">
          <button class="clear-search" *ngIf="searchTerm" (click)="clearSearch()">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>

      <!-- Filter Panel -->
      <div class="filter-panel" *ngIf="showFilters">
        <div class="filter-group">
          <label class="filter-label">Status</label>
          <div class="filter-chips">
            <button 
              *ngFor="let status of statusFilters"
              class="filter-chip"
              [class.active]="status.selected"
              (click)="toggleStatusFilter(status)">
              {{ status.label }}
            </button>
          </div>
        </div>
        <div class="filter-group">
          <label class="filter-label">Purpose</label>
          <div class="filter-chips">
            <button 
              *ngFor="let purpose of purposeFilters"
              class="filter-chip"
              [class.active]="purpose.selected"
              (click)="togglePurposeFilter(purpose)">
              {{ purpose.label }}
            </button>
          </div>
        </div>
        <div class="filter-actions">
          <button class="btn-clear-filters" (click)="clearAllFilters()">Clear All</button>
        </div>
      </div>

      <!-- Error/Success Messages -->
      <div class="message-toast error" *ngIf="errorMessage" (click)="errorMessage = null">
        <i class="material-icons">error</i>
        <span>{{ errorMessage }}</span>
        <button class="close-toast">
          <i class="material-icons">close</i>
        </button>
      </div>
      <div class="message-toast success" *ngIf="successMessage" (click)="successMessage = null">
        <i class="material-icons">check_circle</i>
        <span>{{ successMessage }}</span>
        <button class="close-toast">
          <i class="material-icons">close</i>
        </button>
      </div>

      <!-- Loading Indicator (first visit only — avoids blink on tab switch / auto-refresh) -->
      <div class="loading-overlay" *ngIf="isLoading && isFirstLoad">
        <div class="spinner"></div>
        <span>Loading visitors...</span>
      </div>

      <!-- Bulk Actions Bar -->
      <div class="bulk-actions-bar" *ngIf="showBulkActions">
        <div class="bulk-info">
          <span>{{ selectedVisitors.size }} selected</span>
        </div>
        <div class="bulk-buttons">
          <button class="bulk-btn approve" (click)="bulkApprove()">
            <i class="material-icons">check_circle</i>
            Approve All
          </button>
          <button class="bulk-btn reject" (click)="bulkReject()">
            <i class="material-icons">cancel</i>
            Reject All
          </button>
          <button class="bulk-btn clear" (click)="clearSelection()">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>

      <!-- Reusable visitor card (pending + walk-ins share the same layout) -->
      <ng-template #visitorCard let-visitor>
          <div 
            class="visitor-card"
            [class.urgent]="isUrgent(visitor)"
            [class.selected]="isSelected(visitor.id)">
            <!-- Selection Checkbox -->
            <div class="selection-checkbox" (click)="toggleSelection(visitor.id)">
              <i class="material-icons" *ngIf="isSelected(visitor.id)">check_circle</i>
              <i class="material-icons" *ngIf="!isSelected(visitor.id)">radio_button_unchecked</i>
            </div>
            
            <!-- Card Header -->
            <div class="card-header">
              <div class="visitor-photo-section">
                <div class="photo-wrapper">
                  <img 
                    [src]="getVisitorPhoto(visitor)" 
                    [alt]="visitor.name"
                    class="visitor-photo"
                    (error)="onVisitorPhotoError($event, visitor)">
                  <button class="scan-qr-btn" (click)="scanVisitorQR(visitor)" title="Scan QR Code">
                    <i class="material-icons">qr_code_scanner</i>
                  </button>
                </div>
                <div class="urgency-badge" *ngIf="visitor.status === 'PENDING' && isUrgent(visitor)">
                  <i class="material-icons">schedule</i>
                  Urgent
                </div>
              </div>
              
              <div class="visitor-main-info">
                <div class="name-row">
                  <h3 class="visitor-name">{{ visitor.name }}</h3>
                  <span class="visitor-status-chip" [ngClass]="getStatusClass(visitor.status)">
                    {{ getVisitorStatusLabel(visitor) }}
                  </span>
                </div>
                <div class="visitor-meta">
                  <span class="meta-item">
                    <i class="material-icons">home</i>
                    {{ visitor.visitingFlat }}{{ visitor.visitingUnit ? ' - ' + visitor.visitingUnit : '' }}
                  </span>
                  <span class="meta-item">
                    <i class="material-icons">person</i>
                    {{ visitor.hostName }}
                  </span>
                </div>
                <div class="time-info">
                  <i class="material-icons">schedule</i>
                  <span>{{ formatVisitTime(visitor) }}</span>
                  <span class="time-ago" *ngIf="visitor.timeSinceRequest">• {{ visitor.timeSinceRequest }}</span>
                </div>
              </div>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <div class="info-row">
                <div class="info-item">
                  <i class="material-icons">description</i>
                  <div class="info-content">
                    <span class="info-label">Purpose</span>
                    <span class="info-value">{{ visitor.purpose }}</span>
                  </div>
                </div>
              </div>

              <div class="info-row" *ngIf="visitor.vehicleNumber">
                <div class="info-item">
                  <i class="material-icons">directions_car</i>
                  <div class="info-content">
                    <span class="info-label">Vehicle</span>
                    <span class="info-value">{{ visitor.vehicleNumber }}</span>
                  </div>
                </div>
              </div>

              <div class="info-row" *ngIf="visitor.numberOfVisitors && visitor.numberOfVisitors > 1">
                <div class="info-item">
                  <i class="material-icons">group</i>
                  <div class="info-content">
                    <span class="info-label">Group Size</span>
                    <span class="info-value">{{ visitor.numberOfVisitors }} visitors</span>
                  </div>
                </div>
              </div>

              <div class="info-row" *ngIf="visitor.idProofNumber">
                <div class="info-item">
                  <i class="material-icons">badge</i>
                  <div class="info-content">
                    <span class="info-label">ID Proof</span>
                    <span class="info-value">{{ visitor.idProofNumber }}</span>
                  </div>
                </div>
              </div>

              <div class="info-row" *ngIf="visitor.isRecurring">
                <div class="info-item recurring">
                  <i class="material-icons">repeat</i>
                  <div class="info-content">
                    <span class="info-label">Recurring Visitor</span>
                    <span class="info-value">Frequent visitor</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="card-actions">
              <button 
                class="action-btn view-details" 
                (click)="viewVisitorDetails(visitor)"
                title="View Details">
                <i class="material-icons">visibility</i>
                <span>Details</span>
              </button>
              <button 
                class="action-btn call" 
                (click)="callVisitor(visitor)"
                title="Call Visitor">
                <i class="material-icons">phone</i>
                <span>Call</span>
              </button>
              <button 
                class="action-btn call-host" 
                (click)="callHost(visitor)"
                title="Call Host">
                <i class="material-icons">phone_in_talk</i>
                <span>Host</span>
              </button>
            </div>

            <!-- One-Tap Approval Buttons -->
            <div class="approval-buttons" *ngIf="visitor.status === 'PENDING'">
              <button 
                class="approve-btn" 
                (click)="approveVisitor(visitor)"
                [disabled]="isProcessing[visitor.id]">
                <i class="material-icons">check_circle</i>
                <span>Approve</span>
              </button>
              <button 
                class="reject-btn" 
                (click)="rejectVisitor(visitor)"
                [disabled]="isProcessing[visitor.id]">
                <i class="material-icons">cancel</i>
                <span>Reject</span>
              </button>
            </div>

            <!-- Quick Check-in for Approved Visitors -->
            <div class="checkin-section" *ngIf="visitor.status === 'APPROVED' && !visitor.checkInTime">
              <button 
                class="checkin-btn" 
                (click)="quickCheckIn(visitor)"
                [disabled]="isProcessing[visitor.id]">
                <i class="material-icons">login</i>
                <span>Check In Visitor</span>
              </button>
            </div>

            <!-- Processing Indicator -->
            <div class="processing-overlay" *ngIf="isProcessing[visitor.id]">
              <div class="spinner"></div>
              <span>Processing...</span>
            </div>
          </div>
      </ng-template>

      <!-- Visitor list: pending approvals vs today's walk-ins / check-ins -->
      <div class="visitors-section" *ngIf="filteredVisitors.length > 0">
        <div class="list-toolbar">
          <span class="list-summary">{{ filteredVisitors.length }} visitor{{ filteredVisitors.length !== 1 ? 's' : '' }}</span>
          <div class="sort-options">
            <button class="sort-btn" [class.active]="sortBy === 'time'" (click)="sortBy = 'time'; sortVisitors()">
              <i class="material-icons">schedule</i>
              Time
            </button>
            <button class="sort-btn" [class.active]="sortBy === 'name'" (click)="sortBy = 'name'; sortVisitors()">
              <i class="material-icons">sort_by_alpha</i>
              Name
            </button>
          </div>
        </div>

        <div class="list-subsection" *ngIf="pendingVisitors.length > 0">
          <h3 class="subsection-title">
            Pending Approvals
            <span class="count-badge urgent">{{ pendingVisitors.length }}</span>
          </h3>
          <div class="visitor-cards">
            <ng-container *ngFor="let visitor of pendingVisitors">
              <ng-container *ngTemplateOutlet="visitorCard; context: { $implicit: visitor }"></ng-container>
            </ng-container>
          </div>
        </div>

        <div class="list-subsection" *ngIf="processedVisitors.length > 0">
          <h3 class="subsection-title">
            Today's Walk-ins &amp; Check-ins
            <span class="count-badge">{{ processedVisitors.length }}</span>
          </h3>
          <div class="visitor-cards">
            <ng-container *ngFor="let visitor of processedVisitors">
              <ng-container *ngTemplateOutlet="visitorCard; context: { $implicit: visitor }"></ng-container>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- Empty State (hidden while first load to avoid flash) -->
      <div class="empty-state" *ngIf="filteredVisitors.length === 0 && !isLoading">
        <div class="empty-icon">
          <i class="material-icons">check_circle_outline</i>
        </div>
        <h3>All Clear!</h3>
        <p>{{ searchTerm || activeFilterCount > 0 ? 'No visitors match your filters' : 'No pending visitor approvals' }}</p>
        <button class="btn-primary" (click)="clearAllFilters()" *ngIf="searchTerm || activeFilterCount > 0">
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Visitor Details Modal -->
    <div class="modal-overlay" *ngIf="selectedVisitor" (click)="closeDetails()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Visitor Details</h2>
          <button class="close-btn" (click)="closeDetails()">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="modal-body" *ngIf="selectedVisitor">
          <div class="detail-photo">
            <img 
              [src]="getVisitorPhoto(selectedVisitor)" 
              [alt]="selectedVisitor.name"
              (error)="onVisitorPhotoError($event, selectedVisitor)">
          </div>
          <div class="detail-section">
            <div class="detail-name-row">
              <h3>{{ selectedVisitor.name }}</h3>
              <span class="visitor-status-chip large" [ngClass]="getStatusClass(selectedVisitor.status)">
                {{ getVisitorStatusLabel(selectedVisitor) }}
              </span>
            </div>
            <p class="status-hint" *ngIf="selectedVisitor.status === 'CHECKED_IN'">
              This walk-in visitor is already checked in at the gate — no approval needed.
            </p>
            <p class="status-hint" *ngIf="selectedVisitor.status === 'APPROVED'">
              Already approved — use Check In when the visitor arrives at the gate.
            </p>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Phone</span>
                <span class="detail-value">
                  <a [href]="'tel:' + selectedVisitor.phone">{{ selectedVisitor.phone }}</a>
                </span>
              </div>
              <div class="detail-item" *ngIf="selectedVisitor.email">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ selectedVisitor.email }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Visiting</span>
                <span class="detail-value">{{ selectedVisitor.visitingFlat }}{{ selectedVisitor.visitingUnit ? ' - ' + selectedVisitor.visitingUnit : '' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Host</span>
                <span class="detail-value">
                  {{ selectedVisitor.hostName }}
                  <a [href]="'tel:' + selectedVisitor.hostPhone" class="call-link">
                    <i class="material-icons">phone</i>
                  </a>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Purpose</span>
                <span class="detail-value">{{ selectedVisitor.purpose }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Visit Date & Time</span>
                <span class="detail-value">{{ formatVisitDateTime(selectedVisitor) }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedVisitor.expectedDuration">
                <span class="detail-label">Expected Duration</span>
                <span class="detail-value">{{ selectedVisitor.expectedDuration }} minutes</span>
              </div>
              <div class="detail-item" *ngIf="selectedVisitor.vehicleNumber">
                <span class="detail-label">Vehicle</span>
                <span class="detail-value">{{ selectedVisitor.vehicleNumber }} ({{ selectedVisitor.vehicleType || 'N/A' }})</span>
              </div>
              <div class="detail-item" *ngIf="selectedVisitor.idProofNumber">
                <span class="detail-label">ID Proof</span>
                <span class="detail-value">{{ selectedVisitor.idProof }}: {{ selectedVisitor.idProofNumber }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedVisitor.numberOfVisitors">
                <span class="detail-label">Number of Visitors</span>
                <span class="detail-value">{{ selectedVisitor.numberOfVisitors }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedVisitor.isRecurring">
                <span class="detail-label">Recurring Visitor</span>
                <span class="detail-value">Yes</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Invited By</span>
                <span class="detail-value">{{ getInvitedByLabel(selectedVisitor) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Requested At</span>
                <span class="detail-value">{{ formatDateTime(selectedVisitor.createdAt) }}</span>
              </div>
            </div>
            <div class="detail-actions">
              <button class="btn-secondary" (click)="callVisitor(selectedVisitor)">
                <i class="material-icons">phone</i>
                Call Visitor
              </button>
              <button class="btn-secondary" (click)="callHost(selectedVisitor)">
                <i class="material-icons">phone_in_talk</i>
                Call Host
              </button>
              <button class="btn-secondary" (click)="scanVisitorQR(selectedVisitor)">
                <i class="material-icons">qr_code_scanner</i>
                Scan QR
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer approval-footer" *ngIf="canApproveVisitor(selectedVisitor)">
          <button class="btn-reject" (click)="rejectVisitor(selectedVisitor!)">
            <i class="material-icons">cancel</i>
            Reject
          </button>
          <button class="btn-approve" (click)="approveVisitor(selectedVisitor!)">
            <i class="material-icons">check_circle</i>
            Approve
          </button>
        </div>
        <div class="modal-footer status-footer" *ngIf="selectedVisitor && !canApproveVisitor(selectedVisitor)">
          <button
            class="checkin-btn modal-checkin"
            *ngIf="selectedVisitor.status === 'APPROVED' && !selectedVisitor.checkInTime"
            (click)="quickCheckIn(selectedVisitor); closeDetails()">
            <i class="material-icons">login</i>
            Check In Visitor
          </button>
          <span class="status-pill" [ngClass]="getStatusClass(selectedVisitor.status)">
            <i class="material-icons">{{ getStatusIcon(selectedVisitor.status) }}</i>
            {{ getVisitorStatusLabel(selectedVisitor) }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .visitor-approval-container {
      min-height: 100vh;
      background: #f5f7fa;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
      -webkit-overflow-scrolling: touch;
    }

    .visitor-approval-container,
    .visitor-approval-container * {
      box-sizing: border-box;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn {
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

    .back-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .header-content {
      flex: 1;
    }

    .header-content h1 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content p {
      margin: 0;
      font-size: 13px;
      opacity: 0.9;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

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
      position: relative;
      transition: background 0.2s;
    }

    .icon-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .filter-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff4757;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }

    /* Quick Stats — compact row that fits narrow phone widths */
    .quick-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      padding: 12px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 10px 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      min-width: 0;
    }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon i {
      font-size: 20px;
    }

    .stat-card.pending .stat-icon {
      background: rgba(255, 159, 67, 0.1);
      color: #ff9f43;
    }

    .stat-card.today .stat-icon {
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
    }

    .stat-card.approved .stat-icon {
      background: rgba(46, 213, 115, 0.1);
      color: #2ed573;
    }

    .stat-content {
      flex: 1;
      min-width: 0;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 2px;
      line-height: 1.1;
    }

    .stat-label {
      font-size: 11px;
      color: #7f8c8d;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Search Section */
    .search-section {
      padding: 0 12px 12px;
    }

    .search-box {
      background: white;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .search-box i {
      color: #999;
    }

    .search-box input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 15px;
      color: #2c3e50;
    }

    .clear-search {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Filter Panel */
    .filter-panel {
      background: white;
      margin: 0 16px 16px;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .filter-group {
      margin-bottom: 16px;
    }

    .filter-group:last-child {
      margin-bottom: 0;
    }

    .filter-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filter-chip {
      padding: 8px 16px;
      border: 2px solid #e0e0e0;
      background: white;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      color: #666;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-chip.active {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }

    .filter-actions {
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }

    .btn-clear-filters {
      width: 100%;
      padding: 10px;
      background: #f5f5f5;
      border: none;
      border-radius: 8px;
      color: #667eea;
      font-weight: 500;
      cursor: pointer;
    }

    /* Visitors Section */
    .visitors-section {
      padding: 0 12px;
    }

    .list-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .list-summary {
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .count-badge {
      background: #ff4757;
      color: white;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }

    .count-badge.urgent {
      background: #ff6b35;
    }

    .list-subsection {
      margin-bottom: 20px;
    }

    .subsection-title {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: 600;
      color: #34495e;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      line-height: 1.3;
    }

    .name-row,
    .detail-name-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .detail-name-row h3 {
      margin: 0;
    }

    .visitor-status-chip {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    .visitor-status-chip.large {
      font-size: 12px;
      padding: 4px 10px;
    }

    .visitor-status-chip.status-pending {
      background: #fff3e0;
      color: #e65100;
    }

    .visitor-status-chip.status-approved {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .visitor-status-chip.status-checked-in {
      background: #e3f2fd;
      color: #1565c0;
    }

    .visitor-status-chip.status-rejected {
      background: #ffebee;
      color: #c62828;
    }

    .visitor-status-chip.status-checked-out {
      background: #f3e5f5;
      color: #6a1b9a;
    }

    .status-hint {
      margin: 0 0 12px 0;
      padding: 10px 12px;
      background: #f0f7ff;
      border-radius: 8px;
      font-size: 13px;
      color: #1565c0;
      line-height: 1.4;
    }

    .modal-footer.status-footer {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .status-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
    }

    .status-pill.status-pending { background: #fff3e0; color: #e65100; }
    .status-pill.status-approved { background: #e8f5e9; color: #2e7d32; }
    .status-pill.status-checked-in { background: #e3f2fd; color: #1565c0; }
    .status-pill.status-rejected { background: #ffebee; color: #c62828; }

    .modal-checkin {
      width: 100%;
    }

    .sort-options {
      display: flex;
      gap: 8px;
    }

    .sort-btn {
      background: white;
      border: 1px solid #e0e0e0;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: #666;
      min-height: 36px;
      white-space: nowrap;
    }

    .sort-btn.active {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.08);
      color: #667eea;
      font-weight: 600;
    }

    /* Visitor Cards */
    .visitor-cards {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .visitor-card {
      background: white;
      border-radius: 14px;
      padding: 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      position: relative;
      transition: transform 0.2s, box-shadow 0.2s;
      width: 100%;
    }

    .visitor-card:active {
      transform: scale(0.98);
    }

    .visitor-card.urgent {
      border-left: 4px solid #ff4757;
    }

    .visitor-card.selected {
      border: 2px solid #667eea;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }

    .selection-checkbox {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 5;
      color: #999;
    }

    .selection-checkbox i {
      font-size: 24px;
    }

    .visitor-card.selected .selection-checkbox {
      color: #667eea;
    }

    .card-header {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
      align-items: flex-start;
    }

    .visitor-photo-section {
      position: relative;
    }

    .photo-wrapper {
      position: relative;
    }

    .visitor-photo {
      width: 64px;
      height: 64px;
      border-radius: 10px;
      object-fit: cover;
      border: 2px solid #f0f0f0;
      display: block;
    }

    .scan-qr-btn {
      position: absolute;
      bottom: -8px;
      right: -8px;
      width: 32px;
      height: 32px;
      background: #667eea;
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }

    .scan-qr-btn i {
      font-size: 18px;
    }

    .urgency-badge {
      margin-top: 8px;
      background: #ff4757;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      width: fit-content;
    }

    .urgency-badge i {
      font-size: 14px;
    }

    .visitor-main-info {
      flex: 1;
      min-width: 0;
      padding-right: 36px;
    }

    .name-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }

    .visitor-name {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .visitor-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #666;
    }

    .meta-item i {
      font-size: 16px;
      color: #999;
    }

    .time-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #999;
    }

    .time-info i {
      font-size: 16px;
    }

    .time-ago {
      color: #bbb;
    }

    /* Card Body */
    .card-body {
      margin-bottom: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }

    .info-row {
      margin-bottom: 12px;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .info-item i {
      color: #667eea;
      font-size: 20px;
      margin-top: 2px;
    }

    .info-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-label {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      font-weight: 600;
    }

    .info-value {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .info-item.recurring {
      background: rgba(102, 126, 234, 0.05);
      padding: 8px;
      border-radius: 8px;
    }

    /* Card Actions — equal-width touch targets */
    .card-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 0;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }

    .action-btn {
      flex: 1;
      min-height: 48px;
      padding: 8px 4px;
      background: #f8f9fb;
      border: 1px solid #eef0f4;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #666;
      transition: all 0.2s;
    }

    .action-btn i {
      font-size: 20px;
    }

    .action-btn span {
      line-height: 1.1;
    }

    .action-btn.view-details {
      color: #667eea;
    }

    .action-btn.view-details:hover {
      background: rgba(102, 126, 234, 0.1);
    }

    .action-btn.call {
      color: #2ed573;
    }

    .action-btn.call:hover {
      background: rgba(46, 213, 115, 0.1);
    }

    .action-btn.call-host {
      color: #ff9f43;
    }

    .action-btn.call-host:hover {
      background: rgba(255, 159, 67, 0.1);
    }

    /* Approval Buttons */
    .approval-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 12px;
    }

    .approve-btn, .reject-btn {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .approve-btn {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
      color: white;
    }

    .approve-btn:active:not(:disabled) {
      transform: scale(0.95);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }

    .reject-btn {
      background: linear-gradient(135deg, #ff4757 0%, #ee3542 100%);
      color: white;
    }

    .reject-btn:active:not(:disabled) {
      transform: scale(0.95);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }

    .approve-btn:disabled, .reject-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Check-in Section */
    .checkin-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }

    .checkin-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .checkin-btn:active:not(:disabled) {
      transform: scale(0.95);
      box-shadow: 0 1px 4px rgba(102, 126, 234, 0.4);
    }

    .checkin-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Processing Overlay */
    .processing-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.95);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 10;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f0f0f0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .processing-overlay span {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-icon {
      width: 120px;
      height: 120px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .empty-icon i {
      font-size: 64px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      color: #999;
      font-size: 14px;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
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
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      background: white;
      z-index: 10;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .close-btn {
      background: #f5f5f5;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #666;
    }

    .modal-body {
      padding: 20px;
    }

    .detail-photo {
      text-align: center;
      margin-bottom: 24px;
    }

    .detail-photo img {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #f0f0f0;
    }

    .detail-section h3 {
      margin: 0 0 20px 0;
      font-size: 22px;
      text-align: center;
      color: #2c3e50;
    }

    .detail-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .detail-label {
      font-size: 13px;
      color: #999;
      font-weight: 500;
      text-transform: uppercase;
    }

    .detail-value {
      font-size: 15px;
      color: #2c3e50;
      font-weight: 500;
      text-align: right;
      flex: 1;
      margin-left: 16px;
    }

    .detail-value a {
      color: #667eea;
      text-decoration: none;
    }

    .call-link {
      margin-left: 8px;
      color: #2ed573 !important;
    }

    .detail-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #f0f0f0;
    }

    .btn-secondary {
      width: 100%;
      padding: 12px;
      background: #f5f5f5;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #666;
    }

    .modal-footer {
      padding: 20px;
      border-top: 1px solid #f0f0f0;
      display: flex;
      gap: 12px;
      position: sticky;
      bottom: 0;
      background: white;
    }

    .modal-footer .btn-approve,
    .modal-footer .btn-reject {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .modal-footer .btn-approve {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
      color: white;
    }

    .modal-footer .btn-reject {
      background: linear-gradient(135deg, #ff4757 0%, #ee3542 100%);
      color: white;
    }

    /* Message Toasts */
    .message-toast {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 2000;
      max-width: 90%;
      cursor: pointer;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    .message-toast.error {
      border-left: 4px solid #ff4757;
    }

    .message-toast.success {
      border-left: 4px solid #2ed573;
    }

    .message-toast i {
      font-size: 20px;
    }

    .message-toast.error i {
      color: #ff4757;
    }

    .message-toast.success i {
      color: #2ed573;
    }

    .message-toast span {
      flex: 1;
      font-size: 14px;
      color: #2c3e50;
    }

    .close-toast {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Loading Overlay */
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(255,255,255,0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 1500;
    }

    .loading-overlay .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #f0f0f0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-overlay span {
      font-size: 16px;
      color: #666;
      font-weight: 500;
    }

    /* Bulk Actions Bar */
    .bulk-actions-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      padding: 16px;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
    }

    .bulk-info {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .bulk-buttons {
      display: flex;
      gap: 8px;
    }

    .bulk-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .bulk-btn.approve {
      background: #2ed573;
      color: white;
    }

    .bulk-btn.reject {
      background: #ff4757;
      color: white;
    }

    .bulk-btn.clear {
      background: #f5f5f5;
      color: #666;
      padding: 10px;
    }

    .bulk-btn:active {
      transform: scale(0.95);
    }

    /* Compact page header on phones (layout already shows "Visitors" title) */
    @media (max-width: 480px) {
      .page-header {
        padding: 10px 12px;
        gap: 8px;
      }

      .header-content h1 {
        font-size: 15px;
        gap: 6px;
      }

      .header-content h1 i {
        font-size: 18px;
      }

      .header-content p {
        display: none;
      }

      .back-btn,
      .icon-btn {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
      }

      .filter-panel {
        margin: 0 12px 12px;
      }

      .modal-overlay {
        padding: 0;
        align-items: flex-end;
      }

      .modal-content {
        max-width: 100%;
        max-height: 92vh;
        border-radius: 16px 16px 0 0;
      }

      .detail-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .detail-value {
        text-align: left;
        margin-left: 0;
      }
    }
  `]
})
export class VisitorApprovalCardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Visitor data
  allVisitors: VisitorCard[] = [];
  filteredVisitors: VisitorCard[] = [];
  selectedVisitor: VisitorCard | null = null;

  // Search and filters
  searchTerm = '';
  showFilters = false;
  activeFilterCount = 0;
  sortBy: 'time' | 'name' = 'time';

  // Status tracking
  isProcessing: { [key: string]: boolean } = {};
  isLoading = false;
  /** True until the first API response — avoids overlay flash on 30s refresh. */
  isFirstLoad = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Bulk selection
  selectedVisitors: Set<string> = new Set();
  showBulkActions = false;

  // Statistics
  stats = {
    pending: 0,
    today: 0,
    onSite: 0
  };

  // Filter options
  currentView: string | null = null;

  statusFilters = [
    { key: 'PENDING', label: 'Pending', selected: false },
    { key: 'APPROVED', label: 'Approved', selected: false },
    { key: 'CHECKED_IN', label: 'Walk-in / In', selected: false },
    { key: 'CHECKED_OUT', label: 'Checked Out', selected: false },
    { key: 'REJECTED', label: 'Rejected', selected: false }
  ];

  purposeFilters = [
    { key: 'PERSONAL_VISIT', label: 'Personal', selected: false },
    { key: 'DELIVERY', label: 'Delivery', selected: false },
    { key: 'SERVICE', label: 'Service', selected: false },
    { key: 'MAINTENANCE', label: 'Maintenance', selected: false }
  ];

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private session: SessionContextService
  ) {}

  /** Current logged-in guard id from mobile session. */
  private getGuardId(): string {
    return this.session.getCurrentUserId();
  }

  ngOnInit(): void {
    this.loadPendingVisitors();
    this.startAutoRefresh();
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.applyViewFilter(params.get('view'));
    });
  }

  /**
   * Pre-filter list when opened from dashboard stat tiles (?view=pending|onSite).
   */
  private applyViewFilter(view: string | null): void {
    this.currentView = view;
    if (!view) {
      return;
    }

    this.statusFilters.forEach(f => (f.selected = false));

    if (view === 'onSite') {
      this.statusFilters.forEach(f => {
        f.selected =
          f.key === 'APPROVED' || f.key === 'CHECKED_IN' || f.key === 'CHECKED_OUT';
      });
    } else if (view === 'pending') {
      const pending = this.statusFilters.find(f => f.key === 'PENDING');
      if (pending) {
        pending.selected = true;
      }
    }

    if (this.allVisitors.length > 0) {
      this.filterVisitors();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load gate-pending visitors plus today's walk-ins / check-ins for the guard list.
   * @param silent When true (auto-refresh), keep existing list visible — no full-screen overlay.
   */
  loadPendingVisitors(silent = false): void {
    if (!silent) {
      this.isLoading = true;
    }
    this.errorMessage = null;

    const today = new Date();

    forkJoin({
      pending: this.visitorService.getVisitorsPendingGateApproval().pipe(
        catchError(() => of([] as Visitor[]))
      ),
      todayVisitors: this.visitorService.getVisitorsByFilter({ visitDate: today }).pipe(
        catchError(() => of([] as Visitor[]))
      ),
      approvedToday: this.visitorService.getApprovedTodayVisitors(today).pipe(
        catchError(() => of([] as Visitor[]))
      )
    })
      .pipe(
        takeUntil(this.destroy$),
        map(({ pending, todayVisitors, approvedToday }) => {
          const merged = new Map<string, Visitor>();
          pending.forEach(v => merged.set(v.id, v));
          todayVisitors.forEach(v => {
            if (
              v.status === VisitorStatus.CHECKED_IN ||
              v.status === VisitorStatus.APPROVED ||
              this.isWalkInPurpose(v.purpose)
            ) {
              merged.set(v.id, v);
            }
          });
          // Include every visitor approved / checked in today (matches dashboard tile count)
          approvedToday.forEach(v => merged.set(v.id, v));
          return [...merged.values()];
        }),
        catchError(error => {
          console.error('Error loading visitors:', error);
          this.errorMessage = 'Failed to load visitors. Pull to refresh or try again.';
          return of([] as Visitor[]);
        })
      )
      .subscribe(visitors => {
        this.allVisitors = (visitors ?? []).map(v => this.convertToVisitorCard(v));
        this.calculateStats();
        this.applyViewFilter(this.route.snapshot.queryParamMap.get('view'));
        this.filterVisitors();
        this.updateTimeAgo();
        this.isLoading = false;
        this.isFirstLoad = false;
        this.openVisitorFromQueryParam();
      });
  }

  private isWalkInPurpose(purpose?: string): boolean {
    const p = (purpose || '').toLowerCase();
    return (
      p.includes('walk-in') ||
      p.includes('walk in') ||
      p.includes('gate photo') ||
      p.includes('gate entry')
    );
  }

  /** Open visitor detail modal when navigated from QR scan (?visitorId=). */
  private openVisitorFromQueryParam(): void {
    const visitorId =
      this.route.snapshot.queryParamMap.get('visitorId') ||
      this.route.snapshot.queryParamMap.get('highlight');
    if (!visitorId) {
      return;
    }

    const inList = this.allVisitors.find(v => v.id === visitorId);
    if (inList) {
      this.viewVisitorDetails(inList);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { visitorId: null, highlight: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    this.visitorService.getVisitorById(visitorId).subscribe({
      next: visitor => {
        const card = this.convertToVisitorCard(visitor);
        if (!this.allVisitors.some(v => v.id === card.id)) {
          this.allVisitors = [card, ...this.allVisitors];
          this.filterVisitors();
        }
        this.viewVisitorDetails(card);
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { visitorId: null, highlight: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      },
      error: () => {
        this.errorMessage = 'Visitor not found. They may have been removed.';
      }
    });
  }

  /**
   * Convert Visitor model to VisitorCard interface
   */
  private convertToVisitorCard(visitor: Visitor): VisitorCard {
    return {
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      purpose: visitor.purpose,
      visitingFlat: visitor.visitingFlat,
      visitingUnit: visitor.visitingUnit,
      hostName: visitor.hostName,
      hostPhone: visitor.hostPhone,
      visitDate: visitor.visitDate,
      visitTime: visitor.visitTime,
      expectedDuration: visitor.expectedDuration,
      vehicleNumber: visitor.vehicleNumber,
      vehicleType: visitor.vehicleType || 'NONE',
      numberOfVisitors: visitor.numberOfVisitors,
      photo: visitor.photo,
      idProof: visitor.idProof,
      idProofNumber: visitor.idProofNumber,
      qrCode: visitor.qrCode,
      qrCodeData: visitor.qrCodeData,
      status: visitor.status as any,
      approvalStatus: visitor.approvalStatus as any,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime,
      gateApprovedAt: visitor.gateApprovedAt,
      towerApprovedAt: visitor.towerApprovedAt,
      guardNotes: visitor.guardNotes,
      rejectionReason: visitor.rejectionReason,
      invitedBy: visitor.invitedBy,
      invitedDate: visitor.invitedDate,
      expiryDate: visitor.expiryDate,
      isRecurring: visitor.isRecurring,
      createdAt: visitor.createdAt,
      updatedAt: visitor.updatedAt,
      timeSinceRequest: this.getTimeAgo(visitor.invitedDate)
    };
  }

  /**
   * Calculate statistics from visitor data
   */
  calculateStats(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.stats.pending = this.allVisitors.filter(v => v.status === 'PENDING').length;
    this.stats.today = this.allVisitors.filter(v => {
      const visitDate = new Date(v.visitDate);
      visitDate.setHours(0, 0, 0, 0);
      return visitDate.getTime() === today.getTime();
    }).length;
    // Processed visitors approved / checked in today (same rule as dashboard tile)
    this.stats.onSite = this.allVisitors.filter(v => this.matchesApprovedTodayView(v)).length;
  }

  /** Visitors still waiting for guard/resident approval. */
  get pendingVisitors(): VisitorCard[] {
    return this.filteredVisitors.filter(v => v.status === 'PENDING');
  }

  /** Walk-ins, approved, and other non-pending visitors shown for reference today. */
  get processedVisitors(): VisitorCard[] {
    return this.filteredVisitors.filter(v => v.status !== 'PENDING');
  }

  /** Only pending visitors need Approve/Reject actions. */
  canApproveVisitor(visitor: VisitorCard | null): boolean {
    return !!visitor && visitor.status === 'PENDING';
  }

  getVisitorStatusLabel(visitor: VisitorCard): string {
    switch (visitor.status) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'CHECKED_IN':
        return 'Checked In';
      case 'REJECTED':
        return 'Rejected';
      case 'CHECKED_OUT':
        return 'Checked Out';
      default:
        return visitor.status || 'Unknown';
    }
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'status-pending',
      APPROVED: 'status-approved',
      CHECKED_IN: 'status-checked-in',
      REJECTED: 'status-rejected',
      CHECKED_OUT: 'status-checked-out'
    };
    return classes[status] || 'status-default';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      PENDING: 'pending_actions',
      APPROVED: 'check_circle',
      CHECKED_IN: 'login',
      REJECTED: 'cancel',
      CHECKED_OUT: 'logout'
    };
    return icons[status] || 'info';
  }

  /**
   * Filter visitors based on search term and active filters
   */
  filterVisitors(): void {
    let filtered = [...this.allVisitors];

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(visitor =>
        visitor.name.toLowerCase().includes(searchLower) ||
        visitor.visitingFlat.toLowerCase().includes(searchLower) ||
        visitor.phone.includes(searchLower) ||
        visitor.hostName.toLowerCase().includes(searchLower) ||
        visitor.purpose.toLowerCase().includes(searchLower)
      );
    }

    // Status filter — onSite view uses the same "approved today" rule as the dashboard tile
    if (this.currentView === 'onSite') {
      filtered = filtered.filter(visitor => this.matchesApprovedTodayView(visitor));
    } else {
      const activeStatusFilters = this.statusFilters.filter(f => f.selected);
      if (activeStatusFilters.length > 0) {
        filtered = filtered.filter(visitor =>
          activeStatusFilters.some(filter => visitor.status === filter.key)
        );
      }
    }

    // Purpose filter
    const activePurposeFilters = this.purposeFilters.filter(f => f.selected);
    if (activePurposeFilters.length > 0) {
      filtered = filtered.filter(visitor =>
        activePurposeFilters.some(filter => visitor.purpose.toUpperCase().includes(filter.key))
      );
    }

    this.filteredVisitors = filtered;
    this.updateActiveFilterCount();
    this.sortVisitors();
  }

  /** Matches guard dashboard "Approved Today" tile semantics. */
  private matchesApprovedTodayView(visitor: VisitorCard): boolean {
    return this.visitorService.isVisitorApprovedToday({
      status: visitor.status as VisitorStatus,
      visitDate: visitor.visitDate,
      gateApprovedAt: visitor.gateApprovedAt,
      towerApprovedAt: visitor.towerApprovedAt,
      checkInTime: visitor.checkInTime
    } as Visitor);
  }

  /**
   * Update active filter count
   */
  updateActiveFilterCount(): void {
    this.activeFilterCount =
      this.statusFilters.filter(f => f.selected).length +
      this.purposeFilters.filter(f => f.selected).length;
  }

  /**
   * Toggle status filter
   */
  toggleStatusFilter(filter: any): void {
    filter.selected = !filter.selected;
    this.filterVisitors();
  }

  /**
   * Toggle purpose filter
   */
  togglePurposeFilter(filter: any): void {
    filter.selected = !filter.selected;
    this.filterVisitors();
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.statusFilters.forEach(f => f.selected = false);
    this.purposeFilters.forEach(f => f.selected = false);
    this.searchTerm = '';
    this.filterVisitors();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.filterVisitors();
  }

  /**
   * Toggle filter panel
   */
  toggleFilterPanel(): void {
    this.showFilters = !this.showFilters;
  }

  /**
   * Sort visitors
   */
  sortVisitors(): void {
    if (this.sortBy === 'time') {
      this.filteredVisitors.sort((a, b) => {
        const timeA = new Date(a.invitedDate).getTime();
        const timeB = new Date(b.invitedDate).getTime();
        return timeA - timeB; // Oldest first
      });
    } else if (this.sortBy === 'name') {
      this.filteredVisitors.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  /**
   * Check if visitor request is urgent (more than 20 minutes old)
   */
  isUrgent(visitor: VisitorCard): boolean {
    if (visitor.status !== 'PENDING') {
      return false;
    }
    const minutesSinceRequest = (new Date().getTime() - new Date(visitor.invitedDate).getTime()) / 60000;
    return minutesSinceRequest > 20;
  }

  /**
   * Update time ago for all visitors
   */
  updateTimeAgo(): void {
    this.filteredVisitors.forEach(visitor => {
      visitor.timeSinceRequest = this.getTimeAgo(visitor.invitedDate);
    });
  }

  /**
   * Get time ago string
   */
  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Format visit time
   */
  formatVisitTime(visitor: VisitorCard): string {
    return `${visitor.visitTime}`;
  }

  /**
   * Format visit date and time
   */
  formatVisitDateTime(visitor: VisitorCard): string {
    const date = new Date(visitor.visitDate);
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${visitor.visitTime}`;
  }

  /**
   * Format date time
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Show resident name — invitedBy stores the user id in the database. */
  getInvitedByLabel(visitor: VisitorCard): string {
    if (visitor.hostName?.trim()) {
      return visitor.hostName.trim();
    }
    const by = visitor.invitedBy?.trim() ?? '';
    // Hide raw UUIDs when host name is missing.
    if (by && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(by)) {
      return by;
    }
    return 'Resident';
  }

  /**
   * One-tap approve visitor
   * Integrates with VisitorManagementService for actual approval
   */
  approveVisitor(visitor: VisitorCard): void {
    if (this.isProcessing[visitor.id]) return;

    // Show confirmation for urgent requests
    if (this.isUrgent(visitor)) {
      if (!confirm(`Approve ${visitor.name} for ${visitor.visitingFlat}? This request is ${visitor.timeSinceRequest} old.`)) {
        return;
      }
    }

    this.isProcessing[visitor.id] = true;
    this.errorMessage = null;
    this.successMessage = null;

    const guardId = this.getGuardId();

    // Gate-level approval (guards must not complete tower step)
    this.visitorService.approveAtGateLevel({ visitorId: visitor.id, approvedBy: guardId })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error approving visitor:', error);
          this.errorMessage = `Failed to approve ${visitor.name}. Please try again.`;
          this.isProcessing[visitor.id] = false;
          return [];
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          // Update visitor status
          visitor.status = 'APPROVED';
          visitor.approvalStatus = 'APPROVED';
          visitor.updatedAt = new Date();

          // Remove from pending list
          this.allVisitors = this.allVisitors.filter(v => v.id !== visitor.id);
          this.calculateStats();
          this.filterVisitors();

          // Show success message
          this.successMessage = `✓ ${visitor.name} approved successfully! QR code has been sent.`;
          setTimeout(() => this.successMessage = null, 5000);

          // Close details modal if open
          if (this.selectedVisitor?.id === visitor.id) {
            this.closeDetails();
          }
        } else {
          this.errorMessage = response?.message || `Failed to approve ${visitor.name}`;
        }

        this.isProcessing[visitor.id] = false;
        delete this.isProcessing[visitor.id];
      });
  }

  /**
   * One-tap reject visitor
   * Integrates with VisitorManagementService for actual rejection
   */
  rejectVisitor(visitor: VisitorCard): void {
    if (this.isProcessing[visitor.id]) return;

    // Prompt for rejection reason
    const reason = prompt(`Why are you rejecting ${visitor.name}?\n\nEnter rejection reason:`);
    if (reason === null) return; // User cancelled

    if (!reason.trim()) {
      this.errorMessage = 'Please provide a rejection reason.';
      setTimeout(() => this.errorMessage = null, 3000);
      return;
    }

    this.isProcessing[visitor.id] = true;
    this.errorMessage = null;
    this.successMessage = null;

    const guardId = this.getGuardId();

    // Gate-level rejection with guard attribution
    this.visitorService.rejectAtGateLevel({
      visitorId: visitor.id,
      rejectedBy: guardId,
      reason: reason.trim()
    })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error rejecting visitor:', error);
          this.errorMessage = `Failed to reject ${visitor.name}. Please try again.`;
          this.isProcessing[visitor.id] = false;
          return [];
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          // Update visitor status
          visitor.status = 'REJECTED';
          visitor.approvalStatus = 'REJECTED';
          visitor.rejectionReason = reason.trim();
          visitor.updatedAt = new Date();

          // Remove from pending list
          this.allVisitors = this.allVisitors.filter(v => v.id !== visitor.id);
          this.calculateStats();
          this.filterVisitors();

          // Show success message
          this.successMessage = `✗ ${visitor.name} rejected. Reason: ${reason}`;
          setTimeout(() => this.successMessage = null, 5000);

          // Close details modal if open
          if (this.selectedVisitor?.id === visitor.id) {
            this.closeDetails();
          }
        } else {
          this.errorMessage = response?.message || `Failed to reject ${visitor.name}`;
        }

        this.isProcessing[visitor.id] = false;
        delete this.isProcessing[visitor.id];
      });
  }

  /** Display URL for visitor gate photo (data URL or initials placeholder). */
  getVisitorPhoto(visitor: VisitorCard): string {
    const photo = (visitor.photo ?? '').trim();
    if (photo.startsWith('data:image/')) {
      return photo;
    }
    const initial = visitor.name?.charAt(0)?.toUpperCase() || '?';
    return `https://via.placeholder.com/120?text=${encodeURIComponent(initial)}`;
  }

  /** Fallback when stored photo bytes fail to load. */
  onVisitorPhotoError(event: Event, visitor: VisitorCard): void {
    const img = event.target as HTMLImageElement;
    const initial = visitor.name?.charAt(0)?.toUpperCase() || '?';
    img.src = `https://via.placeholder.com/120?text=${encodeURIComponent(initial)}`;
  }

  /**
   * View visitor details
   */
  viewVisitorDetails(visitor: VisitorCard): void {
    this.selectedVisitor = visitor;
  }

  /**
   * Close details modal
   */
  closeDetails(): void {
    this.selectedVisitor = null;
  }

  /**
   * Call visitor
   */
  callVisitor(visitor: VisitorCard): void {
    window.location.href = `tel:${visitor.phone}`;
  }

  /**
   * Call host
   */
  callHost(visitor: VisitorCard): void {
    window.location.href = `tel:${visitor.hostPhone}`;
  }

  /**
   * Scan visitor QR code
   */
  scanVisitorQR(visitor: VisitorCard): void {
    // Navigate to QR scanner or open scanner modal
    alert(`Scanning QR code for ${visitor.name}...\n\nIn production, this would open the QR scanner.`);
    // In production: this.router.navigate(['/mobile/scan'], { queryParams: { visitorId: visitor.id } });
  }

  /**
   * Refresh visitors list (manual pull — show loader)
   */
  refreshVisitors(): void {
    this.isFirstLoad = true;
    this.loadPendingVisitors(false);
  }

  /**
   * Start auto-refresh every 30 seconds
   */
  startAutoRefresh(): void {
    // Update time ago every minute
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateTimeAgo();
      });

    // Silent background refresh — keeps list visible, no overlay blink
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadPendingVisitors(true);
      });
  }

  /**
   * Bulk approve selected visitors
   */
  bulkApprove(): void {
    if (this.selectedVisitors.size === 0) {
      this.errorMessage = 'Please select at least one visitor to approve.';
      setTimeout(() => this.errorMessage = null, 3000);
      return;
    }

    const selectedIds = Array.from(this.selectedVisitors);
    const guardId = this.getGuardId();

    if (!confirm(`Approve ${selectedIds.length} visitor(s)?`)) {
      return;
    }

    // Process each visitor
    selectedIds.forEach(visitorId => {
      const visitor = this.allVisitors.find(v => v.id === visitorId);
      if (visitor && !this.isProcessing[visitorId]) {
        this.approveVisitor(visitor);
      }
    });

    // Clear selection
    this.selectedVisitors.clear();
    this.showBulkActions = false;
  }

  /**
   * Bulk reject selected visitors
   */
  bulkReject(): void {
    if (this.selectedVisitors.size === 0) {
      this.errorMessage = 'Please select at least one visitor to reject.';
      setTimeout(() => this.errorMessage = null, 3000);
      return;
    }

    const reason = prompt(`Enter rejection reason for ${this.selectedVisitors.size} visitor(s):`);
    if (!reason || !reason.trim()) {
      this.errorMessage = 'Please provide a rejection reason.';
      setTimeout(() => this.errorMessage = null, 3000);
      return;
    }

    const selectedIds = Array.from(this.selectedVisitors);

    // Process each visitor
    selectedIds.forEach(visitorId => {
      const visitor = this.allVisitors.find(v => v.id === visitorId);
      if (visitor && !this.isProcessing[visitorId]) {
        // Set rejection reason and call reject
        visitor.rejectionReason = reason.trim();
        this.rejectVisitor(visitor);
      }
    });

    // Clear selection
    this.selectedVisitors.clear();
    this.showBulkActions = false;
  }

  /**
   * Toggle visitor selection for bulk actions
   */
  toggleSelection(visitorId: string): void {
    if (this.selectedVisitors.has(visitorId)) {
      this.selectedVisitors.delete(visitorId);
    } else {
      this.selectedVisitors.add(visitorId);
    }
    this.showBulkActions = this.selectedVisitors.size > 0;
  }

  /**
   * Check if visitor is selected
   */
  isSelected(visitorId: string): boolean {
    return this.selectedVisitors.has(visitorId);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedVisitors.clear();
    this.showBulkActions = false;
  }

  /**
   * Quick check-in for approved visitor
   */
  quickCheckIn(visitor: VisitorCard): void {
    if (this.isProcessing[visitor.id]) return;

    if (visitor.status !== 'APPROVED') {
      this.errorMessage = 'Visitor must be approved before check-in.';
      setTimeout(() => this.errorMessage = null, 3000);
      return;
    }

    this.isProcessing[visitor.id] = true;
    this.errorMessage = null;
    this.successMessage = null;

    const guardId = this.getGuardId();
    const notes = `Quick check-in via guard app`;

    this.visitorService.checkInVisitor(visitor.id, guardId, notes)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error checking in visitor:', error);
          this.errorMessage = `Failed to check in ${visitor.name}. Please try again.`;
          this.isProcessing[visitor.id] = false;
          return [];
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          // Update visitor status
          visitor.status = 'CHECKED_IN';
          visitor.checkInTime = new Date();
          visitor.updatedAt = new Date();

          // Show success message
          this.successMessage = `✓ ${visitor.name} checked in successfully!`;
          setTimeout(() => this.successMessage = null, 5000);

          // Refresh list
          this.calculateStats();
          this.filterVisitors();
        } else {
          this.errorMessage = response?.message || `Failed to check in ${visitor.name}`;
        }

        this.isProcessing[visitor.id] = false;
        delete this.isProcessing[visitor.id];
      });
  }

  /**
   * Go back
   */
  goBack(): void {
    window.history.back();
  }
}

