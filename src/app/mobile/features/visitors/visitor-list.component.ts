import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { VisitorApiService, VisitorUi } from './visitor-api.service';
import { VisitorManagementService } from '../../../modules/visitor-management/services/visitor-management.service';
import { Visitor as VisitorDetail } from '../../../modules/visitor-management/models/visitor.model';

type Visitor = VisitorUi;

@Component({
  selector: 'app-visitor-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="visitor-list-container">
      <!-- Search and Filter -->
      <div class="search-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search visitors..." 
            [(ngModel)]="searchTerm"
            (ngModelChange)="filterVisitors()">
        </div>
        
        <button class="filter-btn" (click)="showFilters = !showFilters">
          <i class="material-icons">filter_list</i>
          <span class="filter-badge" *ngIf="activeFilters > 0">{{ activeFilters }}</span>
        </button>
      </div>

      <!-- Filter Panel -->
      <div class="filter-panel" *ngIf="showFilters">
        <h4>Filter By</h4>
        <div class="filter-options">
          <label class="filter-option">
            <input type="checkbox" [(ngModel)]="filters.today" (change)="filterVisitors()">
            <span>Today's Visitors</span>
          </label>
          <label class="filter-option">
            <input type="checkbox" [(ngModel)]="filters.pending" (change)="filterVisitors()">
            <span>Pending Approval</span>
          </label>
          <label class="filter-option">
            <input type="checkbox" [(ngModel)]="filters.approved" (change)="filterVisitors()">
            <span>Approved</span>
          </label>
          <label class="filter-option">
            <input type="checkbox" [(ngModel)]="filters.checkedIn" (change)="filterVisitors()">
            <span>Checked In</span>
          </label>
        </div>
        <button class="clear-filters-btn" (click)="clearFilters()">Clear All Filters</button>
      </div>

      <!-- Quick Stats (live counts; tap a tile to filter the list below) -->
      <p class="stats-hint">Tap a tile to filter your visitor list</p>
      <div class="quick-stats">
        <button
          type="button"
          class="stat-box"
          [class.active]="filters.today"
          (click)="toggleStatFilter('today')"
        >
          <h4>{{ stats.today }}</h4>
          <p>Today</p>
        </button>
        <button
          type="button"
          class="stat-box"
          [class.active]="filters.pending"
          (click)="toggleStatFilter('pending')"
        >
          <h4>{{ stats.pending }}</h4>
          <p>Pending</p>
        </button>
        <button
          type="button"
          class="stat-box"
          [class.active]="filters.checkedIn"
          (click)="toggleStatFilter('checkedIn')"
        >
          <h4>{{ stats.checkedIn }}</h4>
          <p>Checked In</p>
        </button>
      </div>

      <!-- Visitor List -->
      <div class="visitors-section">
        <div class="section-header">
          <div>
            <h3>Visitors</h3>
            <p class="visitor-total" *ngIf="!loading">{{ allVisitors.length }} total</p>
          </div>
          <button class="add-btn" routerLink="/mobile/visitors/add">
            <i class="material-icons">add</i>
          </button>
        </div>

        <div class="visitor-list" *ngIf="filteredVisitors.length > 0">
          <div *ngFor="let visitor of filteredVisitors" class="visitor-card" (click)="openVisitorDetail(visitor)">
            <div class="visitor-header">
              <div class="visitor-photo">
                <img [src]="visitor.photo || 'https://via.placeholder.com/50'" [alt]="visitor.name">
                <span class="status-badge" [ngClass]="'status-' + visitor.status">
                  {{ getStatusLabel(visitor.status) }}
                </span>
              </div>
              
              <div class="visitor-info">
                <h4>{{ visitor.name }}</h4>
                <p class="flat-info">
                  <i class="material-icons">home</i>
                  {{ visitor.flatNumber }} - {{ visitor.ownerName }}
                </p>
                <p class="phone">
                  <i class="material-icons">phone</i>
                  {{ visitor.phone }}
                </p>
              </div>

              <div class="visitor-actions">
                <button class="action-icon" (click)="callVisitor(visitor); $event.stopPropagation()">
                  <i class="material-icons">call</i>
                </button>
                <button class="action-icon" (click)="showVisitorMenu(visitor); $event.stopPropagation()">
                  <i class="material-icons">more_vert</i>
                </button>
              </div>
            </div>

            <div class="visitor-details">
              <div class="detail-row">
                <span class="label">Purpose:</span>
                <span class="value">{{ visitor.purpose }}</span>
              </div>
              <div class="detail-row" *ngIf="visitor.vehicleNumber">
                <span class="label">Vehicle:</span>
                <span class="value">{{ visitor.vehicleNumber }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Visit Date:</span>
                <span class="value">{{ visitor.date }} at {{ visitor.time }}</span>
              </div>
              <div class="detail-row" *ngIf="visitor.checkInTime">
                <span class="label">Check-in:</span>
                <span class="value">{{ visitor.checkInTime }}</span>
              </div>
              <div class="detail-row" *ngIf="visitor.checkOutTime">
                <span class="label">Check-out:</span>
                <span class="value">{{ visitor.checkOutTime }}</span>
              </div>
            </div>

            <div class="visitor-footer" *ngIf="visitor.status === 'pending'">
              <button class="approve-action-btn" (click)="approveVisitor(visitor); $event.stopPropagation()">
                <i class="material-icons">check</i>
                Approve
              </button>
              <button class="reject-action-btn" (click)="rejectVisitor(visitor); $event.stopPropagation()">
                <i class="material-icons">close</i>
                Reject
              </button>
            </div>

            <div class="visitor-footer" *ngIf="visitor.status === 'approved'">
              <button class="secondary-btn" (click)="generateQR(visitor); $event.stopPropagation()">
                <i class="material-icons">qr_code</i>
                Show QR Code
              </button>
              <button class="secondary-btn" (click)="shareVisitorPass(visitor); $event.stopPropagation()">
                <i class="material-icons">share</i>
                Share Pass
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="filteredVisitors.length === 0 && !loading">
          <i class="material-icons">{{ allVisitors.length === 0 ? 'group_add' : 'filter_list' }}</i>
          <h3>{{ emptyStateTitle }}</h3>
          <p>{{ emptyStateMessage }}</p>
          <button
            class="primary-btn"
            *ngIf="allVisitors.length === 0"
            routerLink="/mobile/visitors/add"
          >
            <i class="material-icons">add</i>
            Add New Visitor
          </button>
          <button
            class="clear-filters-btn empty-clear-btn"
            type="button"
            *ngIf="allVisitors.length > 0 && hasActiveListFilters"
            (click)="clearAllListFilters()"
          >
            Clear filters & show all
          </button>
        </div>
      </div>

      <!-- Floating Action Button -->
      <button class="fab" routerLink="/mobile/visitors/pre-invite">
        <i class="material-icons">qr_code</i>
        <span>Pre-Invite</span>
      </button>

      <!-- Visitor QR code modal -->
      <div class="qr-overlay" *ngIf="qrModalOpen" (click)="closeQrModal()">
        <div class="qr-sheet" (click)="$event.stopPropagation()">
          <button class="qr-close" type="button" (click)="closeQrModal()">
            <i class="material-icons">close</i>
          </button>
          <h3>{{ qrVisitorName }}</h3>
          <p class="qr-sub" *ngIf="qrVisitorFlat">Flat {{ qrVisitorFlat }}</p>

          <div class="qr-loading" *ngIf="qrLoading">
            <i class="material-icons spin">hourglass_top</i>
            <p>Generating QR code…</p>
          </div>

          <p class="qr-error" *ngIf="qrError && !qrLoading">{{ qrError }}</p>

          <div class="qr-image-wrap" *ngIf="qrImageUrl && !qrLoading">
            <img [src]="qrImageUrl" alt="Visitor entry QR code" class="qr-image" />
            <p class="qr-hint">Show this at the gate for entry</p>
            <p class="share-fallback" *ngIf="shareFallbackMsg">{{ shareFallbackMsg }}</p>
          </div>

          <div class="qr-actions" *ngIf="qrImageUrl && !qrLoading">
            <button type="button" class="secondary-btn" (click)="shareQrPass()" *ngIf="canNativeShare()">
              <i class="material-icons">share</i>
              Share
            </button>
            <button type="button" class="secondary-btn" (click)="copyPassDetails()">
              <i class="material-icons">content_copy</i>
              Copy details
            </button>
            <button type="button" class="secondary-btn" (click)="downloadQrImage()">
              <i class="material-icons">download</i>
              Save QR
            </button>
          </div>
        </div>
      </div>

      <!-- Visitor options menu (3-dot) -->
      <div class="qr-overlay" *ngIf="optionsMenuVisitor" (click)="closeOptionsMenu()">
        <div class="options-sheet" (click)="$event.stopPropagation()">
          <h4>{{ optionsMenuVisitor.name }}</h4>
          <p class="qr-sub">{{ optionsMenuVisitor.flatNumber }} · {{ getStatusLabel(optionsMenuVisitor.status) }}</p>

          <button type="button" class="option-row" (click)="callVisitor(optionsMenuVisitor); closeOptionsMenu()">
            <i class="material-icons">call</i>
            <span>Call visitor</span>
          </button>
          <button type="button" class="option-row" (click)="copyPhone(optionsMenuVisitor)">
            <i class="material-icons">content_copy</i>
            <span>Copy phone number</span>
          </button>
          <button
            type="button"
            class="option-row"
            *ngIf="optionsMenuVisitor.status === 'approved' || optionsMenuVisitor.status === 'checked-in'"
            (click)="openQrFromMenu(optionsMenuVisitor)"
          >
            <i class="material-icons">qr_code</i>
            <span>Show QR code</span>
          </button>
          <button
            type="button"
            class="option-row"
            *ngIf="optionsMenuVisitor.status === 'approved' || optionsMenuVisitor.status === 'checked-in'"
            (click)="sharePassFromMenu(optionsMenuVisitor)"
          >
            <i class="material-icons">share</i>
            <span>Share pass</span>
          </button>
          <button
            type="button"
            class="option-row"
            *ngIf="optionsMenuVisitor.status === 'pending'"
            (click)="approveFromMenu(optionsMenuVisitor)"
          >
            <i class="material-icons">check_circle</i>
            <span>Approve visitor</span>
          </button>
          <button
            type="button"
            class="option-row danger"
            *ngIf="optionsMenuVisitor.status === 'pending'"
            (click)="rejectFromMenu(optionsMenuVisitor)"
          >
            <i class="material-icons">cancel</i>
            <span>Reject visitor</span>
          </button>

          <button type="button" class="option-cancel" (click)="closeOptionsMenu()">Cancel</button>
        </div>
      </div>

      <p class="share-toast" *ngIf="shareInProgress">Preparing visitor pass…</p>

      <!-- Full visitor detail sheet (from card tap or notification deep link) -->
      <div class="qr-overlay" *ngIf="detailVisitor" (click)="closeVisitorDetail()">
        <div class="detail-sheet" (click)="$event.stopPropagation()">
          <button class="qr-close" type="button" (click)="closeVisitorDetail()">
            <i class="material-icons">close</i>
          </button>
          <h3>{{ detailVisitor.name }}</h3>
          <p class="qr-sub">{{ getStatusLabel(detailVisitor.status) }} · Flat {{ detailVisitor.flatNumber }}</p>
          <div class="detail-grid">
            <div class="detail-line"><span>Phone</span><strong>{{ detailVisitor.phone }}</strong></div>
            <div class="detail-line"><span>Host</span><strong>{{ detailVisitor.ownerName }}</strong></div>
            <div class="detail-line"><span>Purpose</span><strong>{{ detailVisitor.purpose }}</strong></div>
            <div class="detail-line"><span>Visit</span><strong>{{ detailVisitor.date }} {{ detailVisitor.time }}</strong></div>
            <div class="detail-line" *ngIf="detailVisitor.checkInTime"><span>Check-in</span><strong>{{ detailVisitor.checkInTime }}</strong></div>
            <div class="detail-line" *ngIf="detailVisitor.vehicleNumber"><span>Vehicle</span><strong>{{ detailVisitor.vehicleNumber }}</strong></div>
          </div>
          <div class="detail-actions">
            <button type="button" class="secondary-btn" (click)="callVisitor(detailVisitor)">
              <i class="material-icons">call</i> Call
            </button>
            <button
              type="button"
              class="secondary-btn"
              *ngIf="detailVisitor.status === 'approved' || detailVisitor.status === 'checked-in'"
              (click)="generateQR(detailVisitor); closeVisitorDetail()">
              <i class="material-icons">qr_code</i> QR Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .visitor-list-container {
      padding: 16px;
      padding-bottom: 100px;
      background: #f5f5f5;
    }

    .visitor-card {
      cursor: pointer;
    }

    .detail-sheet {
      background: white;
      border-radius: 16px 16px 0 0;
      padding: 24px;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      position: relative;
    }

    .detail-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 16px 0;
    }

    .detail-line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 14px;
      color: #64748b;
    }

    .detail-line strong {
      color: #1e293b;
      text-align: right;
    }

    .detail-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* Search Section */
    .search-section {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      background: white;
      padding: 12px 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      gap: 12px;
    }

    .search-box i {
      color: #999;
    }

    .search-box input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 15px;
    }

    .filter-btn {
      width: 48px;
      height: 48px;
      background: white;
      border: none;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
    }

    .filter-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #667eea;
      color: white;
      font-size: 10px;
      padding: 2px 5px;
      border-radius: 10px;
      min-width: 16px;
    }

    /* Filter Panel */
    .filter-panel {
      background: white;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .filter-panel h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 12px;
    }

    .filter-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .filter-option input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .clear-filters-btn {
      width: 100%;
      padding: 10px;
      background: #f0f0f0;
      border: none;
      border-radius: 8px;
      color: #667eea;
      font-weight: 500;
      cursor: pointer;
    }

    /* Quick Stats */
    .stats-hint {
      margin: 0 0 8px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .stat-box {
      background: white;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 2px solid transparent;
      cursor: pointer;
      flex: 1;
    }

    .stat-box.active {
      border-color: #667eea;
      background: #f5f3ff;
    }

    .stat-box h4 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }

    .stat-box p {
      margin: 0;
      font-size: 12px;
      color: #666;
    }

    .visitor-total {
      margin: 2px 0 0;
      font-size: 12px;
      color: #94a3b8;
      font-weight: normal;
    }

    /* Visitors Section */
    .visitors-section {
      margin-bottom: 20px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .add-btn {
      width: 40px;
      height: 40px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }

    /* Visitor Cards */
    .visitor-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .visitor-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .visitor-header {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
    }

    .visitor-photo {
      position: relative;
    }

    .visitor-photo img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }

    .status-badge {
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .status-badge.status-approved { color: #28a745; }
    .status-badge.status-pending { color: #ffc107; }
    .status-badge.status-rejected { color: #dc3545; }
    .status-badge.status-checked-in { color: #17a2b8; }
    .status-badge.status-checked-out { color: #6c757d; }

    .visitor-info {
      flex: 1;
    }

    .visitor-info h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .visitor-info p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .visitor-info p i {
      font-size: 16px;
    }

    .visitor-actions {
      display: flex;
      gap: 4px;
    }

    .action-icon {
      width: 36px;
      height: 36px;
      background: #f5f5f5;
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #667eea;
    }

    /* Visitor Details */
    .visitor-details {
      padding: 12px 16px;
      background: #f9f9f9;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-row .label {
      color: #999;
      font-weight: 500;
    }

    .detail-row .value {
      color: #333;
      font-weight: 600;
    }

    /* Visitor Footer */
    .visitor-footer {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
    }

    .approve-action-btn, .reject-action-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .approve-action-btn {
      background: #28a745;
      color: white;
    }

    .reject-action-btn {
      background: #dc3545;
      color: white;
    }

    .secondary-btn {
      flex: 1;
      padding: 10px;
      background: #f5f5f5;
      border: none;
      border-radius: 8px;
      color: #667eea;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .empty-state i {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #333;
    }

    .empty-state p {
      margin: 0 0 20px 0;
      color: #999;
    }

    .primary-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .empty-clear-btn {
      width: auto;
      display: inline-block;
      margin-top: 0;
    }

    /* Floating Action Button */
    .fab {
      position: fixed;
      bottom: 90px;
      right: 20px;
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      font-weight: 600;
      z-index: 50;
    }

    .fab i {
      font-size: 24px;
    }

    .qr-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 200;
      padding: 16px;
    }
    .qr-sheet {
      background: white;
      border-radius: 20px 20px 12px 12px;
      padding: 20px;
      width: 100%;
      max-width: 400px;
      text-align: center;
      position: relative;
    }
    .qr-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: #f1f5f9;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-sheet h3 { margin: 0 0 4px; font-size: 20px; color: #1e293b; }
    .qr-sub { margin: 0 0 16px; color: #64748b; font-size: 14px; }
    .qr-loading { padding: 24px; color: #64748b; }
    .qr-loading .spin { animation: spin 1s linear infinite; font-size: 40px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .qr-error { color: #dc2626; font-size: 14px; }
    .qr-image-wrap { padding: 8px 0; }
    .qr-image {
      width: 260px;
      height: 260px;
      max-width: 100%;
      border: 8px solid #f1f5f9;
      border-radius: 12px;
    }
    .qr-hint { font-size: 13px; color: #64748b; margin-top: 12px; }
    .share-fallback {
      font-size: 13px;
      color: #b45309;
      background: #fffbeb;
      padding: 10px 12px;
      border-radius: 10px;
      margin-top: 12px;
      line-height: 1.4;
    }
    .qr-actions {
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
    }

    .options-sheet {
      background: white;
      border-radius: 20px 20px 12px 12px;
      padding: 16px 16px 12px;
      width: 100%;
      max-width: 400px;
    }
    .options-sheet h4 { margin: 0 0 4px; text-align: center; font-size: 18px; }
    .option-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 12px;
      border: none;
      background: #f8fafc;
      border-radius: 12px;
      margin-bottom: 8px;
      font-size: 15px;
      cursor: pointer;
      text-align: left;
      color: #1e293b;
    }
    .option-row .material-icons { color: #667eea; }
    .option-row.danger { color: #dc2626; }
    .option-row.danger .material-icons { color: #dc2626; }
    .option-cancel {
      width: 100%;
      padding: 12px;
      margin-top: 4px;
      border: none;
      background: transparent;
      color: #64748b;
      font-weight: 600;
      cursor: pointer;
    }
    .share-toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: white;
      padding: 10px 18px;
      border-radius: 24px;
      font-size: 14px;
      z-index: 210;
      margin: 0;
    }
  `]
})
export class VisitorListComponent implements OnInit {
  searchTerm = '';
  showFilters = false;
  activeFilters = 0;
  loading = false;
  errorMessage = '';
  
  filters = {
    today: false,
    pending: false,
    approved: false,
    checkedIn: false
  };

  stats = {
    today: 0,
    pending: 0,
    checkedIn: 0
  };

  allVisitors: Visitor[] = [];

  filteredVisitors: Visitor[] = [];

  qrModalOpen = false;
  qrLoading = false;
  qrError = '';
  qrImageUrl = '';
  qrVisitorName = '';
  qrVisitorFlat = '';
  shareFallbackMsg = '';
  private qrVisitorDetail: VisitorDetail | null = null;
  private shareAfterQrLoad = false;

  optionsMenuVisitor: Visitor | null = null;
  detailVisitor: Visitor | null = null;
  shareInProgress = false;

  constructor(
    private auth: MobileAuthService,
    private api: VisitorApiService,
    private visitorMgmt: VisitorManagementService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadVisitors();
    this.route.queryParamMap.subscribe(params => {
      const visitorId = params.get('visitorId') || params.get('highlight');
      if (visitorId && this.allVisitors.length) {
        this.openVisitorFromQueryParam(visitorId);
      }
    });
  }

  /** Load visitors scoped to the logged-in user (own flat for owners/tenants). */
  loadVisitors(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.societyId && !user?.id) {
      this.errorMessage = 'Missing session. Please log in again.';
      this.allVisitors = [];
      this.filteredVisitors = [];
      this.computeStats();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.api.listForPortalUser(user).subscribe({
      next: rows => {
        this.allVisitors = rows ?? [];
        this.filterVisitors();
        this.loading = false;
        const visitorId =
          this.route.snapshot.queryParamMap.get('visitorId') ||
          this.route.snapshot.queryParamMap.get('highlight');
        if (visitorId) {
          this.openVisitorFromQueryParam(visitorId);
        }
      },
      error: err => {
        console.error('Failed to load visitors', err);
        this.errorMessage = 'Could not load visitors from backend.';
        this.allVisitors = [];
        this.filteredVisitors = [];
        this.computeStats();
        this.loading = false;
      }
    });
  }

  filterVisitors() {
    this.filteredVisitors = this.allVisitors.filter(visitor => {
      // Search filter
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const matchesSearch = 
          visitor.name.toLowerCase().includes(searchLower) ||
          visitor.flatNumber.toLowerCase().includes(searchLower) ||
          visitor.phone.includes(searchLower) ||
          visitor.purpose.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Status filters
      if (this.filters.pending && visitor.status !== 'pending') return false;
      if (this.filters.approved && visitor.status !== 'approved') return false;
      if (this.filters.checkedIn && visitor.status !== 'checked-in') return false;
      if (this.filters.today && !this.isVisitToday(visitor)) return false;

      return true;
    });

    this.updateActiveFilters();
    this.computeStats();
  }

  updateActiveFilters() {
    this.activeFilters = Object.values(this.filters).filter(v => v).length;
  }

  clearFilters() {
    this.filters = {
      today: false,
      pending: false,
      approved: false,
      checkedIn: false
    };
    this.filterVisitors();
  }

  /** Clear search + stat filters when a filter shows an empty list. */
  clearAllListFilters(): void {
    this.searchTerm = '';
    this.clearFilters();
  }

  /** Whether search or stat tiles are hiding visitors from the list. */
  get hasActiveListFilters(): boolean {
    return this.activeFilters > 0 || !!this.searchTerm?.trim();
  }

  /** Context-aware empty list title (filter vs truly no visitors). */
  get emptyStateTitle(): string {
    if (this.allVisitors.length === 0) {
      return 'No Visitors Yet';
    }
    if (this.searchTerm?.trim()) {
      return 'No Matching Visitors';
    }
    if (this.filters.checkedIn) {
      return 'No Checked-in Visitors';
    }
    if (this.filters.pending) {
      return 'No Pending Visitors';
    }
    if (this.filters.today) {
      return 'No Visitors Today';
    }
    if (this.filters.approved) {
      return 'No Approved Visitors';
    }
    return 'No Visitors Found';
  }

  /** Context-aware empty list message. */
  get emptyStateMessage(): string {
    if (this.allVisitors.length === 0) {
      return 'Pre-invite guests or add a visitor for your flat.';
    }
    if (this.searchTerm?.trim()) {
      return 'Try a different search term.';
    }
    if (this.filters.checkedIn) {
      return 'None of your visitors are at the gate right now. Tap below to see all visitors.';
    }
    if (this.filters.pending) {
      return 'You have no visitors waiting for approval.';
    }
    if (this.filters.today) {
      return 'No visits scheduled for today under this filter.';
    }
    if (this.hasActiveListFilters) {
      return 'No visitors match the selected filter.';
    }
    return 'No visitors to show.';
  }

  /** Tap a stat card to toggle that list filter. */
  toggleStatFilter(key: 'today' | 'pending' | 'checkedIn'): void {
    if (key === 'today') {
      this.filters.today = !this.filters.today;
    } else if (key === 'pending') {
      this.filters.pending = !this.filters.pending;
    } else {
      this.filters.checkedIn = !this.filters.checkedIn;
    }
    this.filterVisitors();
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private isVisitToday(visitor: Visitor): boolean {
    if (visitor.visitDateIso) {
      return visitor.visitDateIso === this.todayIso();
    }
    return visitor.date === 'Today';
  }

  /** Live counts from allVisitors (not filtered list). */
  private computeStats(): void {
    const list = this.allVisitors;
    this.stats = {
      today: list.filter(v => this.isVisitToday(v)).length,
      pending: list.filter(v => v.status === 'pending').length,
      checkedIn: list.filter(v => v.status === 'checked-in').length
    };
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'approved': 'Approved',
      'pending': 'Pending',
      'rejected': 'Rejected',
      'checked-in': 'Inside',
      'checked-out': 'Left'
    };
    return labels[status] || status;
  }

  approveVisitor(visitor: Visitor) {
    if (confirm(`Approve ${visitor.name} for ${visitor.flatNumber}?`)) {
      const by = this.auth.getCurrentUser()?.id;
      this.api.approve(visitor.id, by).subscribe({
        next: updated => {
          this.replaceVisitor(updated);
          alert('Visitor approved!');
        },
        error: () => alert('Failed to approve visitor (backend).')
      });
    }
  }

  rejectVisitor(visitor: Visitor) {
    const reason = prompt(`Why are you rejecting ${visitor.name}?`);
    if (reason) {
      this.api.reject(visitor.id, reason).subscribe({
        next: updated => {
          this.replaceVisitor(updated);
          alert('Visitor rejected.');
        },
        error: () => alert('Failed to reject visitor (backend).')
      });
    }
  }

  callVisitor(visitor: Visitor) {
    window.location.href = `tel:${visitor.phone}`;
  }

  showVisitorMenu(visitor: Visitor) {
    this.optionsMenuVisitor = visitor;
  }

  openVisitorDetail(visitor: Visitor): void {
    this.detailVisitor = visitor;
  }

  closeVisitorDetail(): void {
    this.detailVisitor = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { visitorId: null, highlight: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  /** Open detail sheet when arriving from a notification (?visitorId=). */
  private openVisitorFromQueryParam(visitorId: string): void {
    const visitor = this.allVisitors.find(v => v.id === visitorId);
    if (visitor) {
      this.openVisitorDetail(visitor);
      return;
    }
    this.visitorMgmt.getVisitorById(visitorId).subscribe({
      next: full => {
        const mapped: Visitor = {
          id: full.id,
          name: full.name,
          phone: full.phone,
          flatNumber: full.visitingFlat,
          ownerName: full.hostName,
          hostId: full.hostId,
          purpose: full.purpose,
          date: full.visitDate ? new Date(full.visitDate).toLocaleDateString() : '',
          visitDateIso: full.visitDate
            ? new Date(full.visitDate).toISOString().slice(0, 10)
            : '',
          time: full.visitTime || '',
          status:
            full.status === 'CHECKED_IN'
              ? 'checked-in'
              : full.status === 'APPROVED'
                ? 'approved'
                : full.status === 'PENDING'
                  ? 'pending'
                  : 'rejected',
          photo: full.photo,
          vehicleNumber: full.vehicleNumber,
          checkInTime: full.checkInTime
            ? new Date(full.checkInTime).toLocaleString()
            : undefined
        };
        if (!this.allVisitors.some(v => v.id === mapped.id)) {
          this.allVisitors = [mapped, ...this.allVisitors];
          this.filterVisitors();
        }
        this.openVisitorDetail(mapped);
      }
    });
  }

  closeOptionsMenu(): void {
    this.optionsMenuVisitor = null;
  }

  openQrFromMenu(visitor: Visitor): void {
    this.closeOptionsMenu();
    this.generateQR(visitor);
  }

  sharePassFromMenu(visitor: Visitor): void {
    this.closeOptionsMenu();
    this.shareVisitorPass(visitor);
  }

  approveFromMenu(visitor: Visitor): void {
    this.closeOptionsMenu();
    this.approveVisitor(visitor);
  }

  rejectFromMenu(visitor: Visitor): void {
    this.closeOptionsMenu();
    this.rejectVisitor(visitor);
  }

  copyPhone(visitor: Visitor): void {
    const phone = visitor.phone?.trim();
    if (!phone) return;
    navigator.clipboard?.writeText(phone).then(
      () => alert('Phone number copied.'),
      () => alert(phone)
    );
    this.closeOptionsMenu();
  }

  generateQR(visitor: Visitor) {
    this.loadVisitorQr(visitor, { showModal: true, shareAfter: false });
  }

  /** Fetch visitor + generate QR; optionally open modal and/or trigger share. */
  private loadVisitorQr(
    visitor: Visitor,
    opts: { showModal: boolean; shareAfter: boolean }
  ): void {
    if (opts.showModal) {
      this.qrModalOpen = true;
    }
    this.qrLoading = opts.showModal;
    this.qrError = '';
    this.shareFallbackMsg = '';
    if (!opts.shareAfter || opts.showModal) {
      this.qrImageUrl = '';
    }
    this.qrVisitorName = visitor.name;
    this.qrVisitorFlat = visitor.flatNumber;
    this.shareAfterQrLoad = opts.shareAfter;

    if (opts.shareAfter && !opts.showModal) {
      this.shareInProgress = true;
    }

    this.visitorMgmt.getVisitorById(visitor.id).subscribe({
      next: detail => {
        this.qrVisitorDetail = detail;
        this.qrVisitorName = detail.name;
        this.qrVisitorFlat = detail.visitingFlat || visitor.flatNumber;
        this.qrImageUrl = detail.qrCode || '';
        this.qrLoading = false;
        this.shareInProgress = false;
        this.cdr.detectChanges();

        if (!this.qrImageUrl || !this.qrImageUrl.startsWith('data:image')) {
          if (opts.showModal) {
            this.qrError = 'Could not generate QR code. Try again or contact the gate.';
          } else {
            alert('Could not generate visitor pass. Try Show QR Code first.');
          }
          this.shareAfterQrLoad = false;
          return;
        }

        if (this.shareAfterQrLoad) {
          this.shareAfterQrLoad = false;
          // Let the modal paint the QR before opening share sheet or fallback UI.
          setTimeout(() => void this.shareQrPass(), 150);
        }
      },
      error: () => {
        this.qrLoading = false;
        this.shareInProgress = false;
        this.shareAfterQrLoad = false;
        if (opts.showModal) {
          this.qrError = 'Failed to load visitor. Is the backend running?';
        } else {
          alert('Failed to prepare pass. Is the backend running?');
        }
      }
    });
  }

  closeQrModal(): void {
    this.qrModalOpen = false;
    this.qrLoading = false;
    this.qrError = '';
    this.qrImageUrl = '';
    this.shareFallbackMsg = '';
    this.qrVisitorDetail = null;
  }

  /** Native share needs HTTPS (secure context); HTTP dev servers cannot use it. */
  canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share && window.isSecureContext;
  }

  private buildPassText(): string {
    const v = this.qrVisitorDetail;
    return v
      ? `Visitor pass for ${v.name}\nFlat: ${v.visitingFlat}\nPurpose: ${v.purpose}\nVisit: ${v.visitTime}\nShow this QR code at the society gate.`
      : `Visitor pass for ${this.qrVisitorName}`;
  }

  copyPassDetails(): void {
    const text = this.buildPassText();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => (this.shareFallbackMsg = 'Pass details copied to clipboard.'),
        () => (this.shareFallbackMsg = 'Could not copy — long-press the text above to copy manually.')
      );
      return;
    }
    this.shareFallbackMsg = text;
  }

  downloadQrImage(): void {
    if (!this.qrImageUrl?.startsWith('data:image')) {
      return;
    }
    const link = document.createElement('a');
    link.href = this.qrImageUrl;
    link.download = `visitor-pass-${this.qrVisitorDetail?.id || 'qr'}.png`;
    link.click();
    this.shareFallbackMsg = 'QR image saved. You can share the file from your gallery or files app.';
  }

  shareVisitorPass(visitor: Visitor) {
    if (this.qrImageUrl && this.qrVisitorDetail?.id === visitor.id) {
      void this.shareQrPass();
      return;
    }
    this.loadVisitorQr(visitor, { showModal: true, shareAfter: true });
  }

  /** Share visitor pass via native share when available; otherwise show copy/save options. */
  async shareQrPass(): Promise<void> {
    this.qrModalOpen = true;

    if (!this.canNativeShare()) {
      this.shareFallbackMsg =
        'Sharing is not available on this connection (use HTTPS). Copy the pass details or save the QR image below.';
      this.cdr.detectChanges();
      return;
    }

    const text = this.buildPassText();

    try {
      const sharePayload: ShareData = { title: 'Visitor pass', text };
      if (this.qrImageUrl?.startsWith('data:image')) {
        const res = await fetch(this.qrImageUrl);
        const blob = await res.blob();
        const file = new File([blob], `visitor-pass-${this.qrVisitorDetail?.id || 'qr'}.png`, {
          type: 'image/png'
        });
        if (navigator.canShare?.({ files: [file] })) {
          sharePayload.files = [file];
        }
      }
      await navigator.share(sharePayload);
    } catch (err: unknown) {
      const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
      if (name !== 'AbortError') {
        this.shareFallbackMsg = 'Share cancelled or failed. Use Copy details or Save QR below.';
        this.cdr.detectChanges();
      }
    }
  }

  /** Replace a visitor in arrays and re-apply filters/stats. */
  private replaceVisitor(updated: Visitor): void {
    const idx = this.allVisitors.findIndex(v => v.id === updated.id);
    if (idx >= 0) {
      this.allVisitors[idx] = updated;
    } else {
      this.allVisitors = [updated, ...this.allVisitors];
    }
    this.filterVisitors();
  }
}
