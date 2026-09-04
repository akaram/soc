import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GuardPackage, GuardPackageService } from '../../services/guard-package.service';

/**
 * Package holding for guards — backed by POST/GET /deliveries APIs.
 */
interface PackageHoldingInstruction {
  id: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  building?: string;
  instructionType: 'hold' | 'forward' | 'reject' | 'deliver_to_flat';
  instructions: string;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  priority: 'normal' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

type Package = GuardPackage;

@Component({
  selector: 'app-package-holding',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="package-holding-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">inventory_2</i>
            Package Holding
          </h1>
          <p>Manage packages and resident instructions</p>
        </div>
        <button class="icon-btn" (click)="showAddPackage = true" title="Add Package">
          <i class="material-icons">add</i>
        </button>
      </div>

      <p class="banner error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="banner loading" *ngIf="isLoading">Loading packages…</p>

      <!-- Tabs -->
      <div class="tabs-section">
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'packages'"
          (click)="setTab('packages')">
          <i class="material-icons">inventory</i>
          Packages ({{ pendingPackages.length }})
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'instructions'"
          (click)="setTab('instructions')">
          <i class="material-icons">description</i>
          Instructions ({{ activeInstructions.length }})
        </button>
      </div>

      <!-- Packages Tab -->
      <div class="content-section" *ngIf="activeTab === 'packages'">
        <!-- Search and Filter -->
        <div class="filter-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by name, flat, tracking number..." 
              [(ngModel)]="packageSearchQuery"
              (input)="filterPackages()"
            />
          </div>
          <select [(ngModel)]="packageStatusFilter" (change)="filterPackages()" class="status-filter">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="held">Held</option>
            <option value="delivered">Delivered</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <!-- Packages List -->
        <div class="packages-list">
          <div 
            class="package-item" 
            *ngFor="let pkg of filteredPackages"
            (click)="viewPackageDetails(pkg)">
            <div class="package-icon" [ngClass]="pkg.status">
              <i class="material-icons">{{ getStatusIcon(pkg.status) }}</i>
            </div>
            <div class="package-info">
              <div class="package-header">
                <h3>{{ pkg.recipientName }}</h3>
                <span class="status-badge" [ngClass]="pkg.status">
                  {{ getStatusLabel(pkg.status) }}
                </span>
              </div>
              <p class="package-details">
                <i class="material-icons">home</i>
                {{ pkg.recipientFlat }}<span *ngIf="pkg.recipientBuilding">, {{ pkg.recipientBuilding }}</span>
              </p>
              <p class="package-details">
                <i class="material-icons">local_shipping</i>
                {{ pkg.courierName }}
                <span *ngIf="pkg.trackingNumber"> - {{ pkg.trackingNumber }}</span>
              </p>
              <p class="package-time">
                <i class="material-icons">schedule</i>
                Received: {{ formatDateTime(pkg.receivedAt) }}
              </p>
            </div>
            <div class="package-actions">
              <button 
                class="action-btn" 
                (click)="handlePackage(pkg); $event.stopPropagation()"
                [title]="getActionButtonTitle(pkg)">
                <i class="material-icons">{{ getActionIcon(pkg.status) }}</i>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredPackages.length === 0">
            <i class="material-icons">inventory_2</i>
            <p>No packages found</p>
            <span *ngIf="packageSearchQuery">Try adjusting your search</span>
          </div>
        </div>
      </div>

      <!-- Instructions Tab -->
      <div class="content-section" *ngIf="activeTab === 'instructions'">
        <!-- Search -->
        <div class="filter-section">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by resident name or flat..." 
              [(ngModel)]="instructionSearchQuery"
              (input)="filterInstructions()"
            />
          </div>
        </div>

        <!-- Instructions List -->
        <div class="instructions-list">
          <div 
            class="instruction-item" 
            *ngFor="let instruction of filteredInstructions"
            [class.expired]="!instruction.isActive"
            (click)="viewInstructionDetails(instruction)">
            <div class="instruction-icon" [ngClass]="instruction.instructionType">
              <i class="material-icons">{{ getInstructionIcon(instruction.instructionType) }}</i>
            </div>
            <div class="instruction-info">
              <div class="instruction-header">
                <h3>{{ instruction.residentName }}</h3>
                <span class="priority-badge" *ngIf="instruction.priority === 'high'">
                  High Priority
                </span>
                <span class="expired-badge" *ngIf="!instruction.isActive">
                  Expired
                </span>
              </div>
              <p class="instruction-details">
                <i class="material-icons">home</i>
                {{ instruction.flatNumber }}<span *ngIf="instruction.building">, {{ instruction.building }}</span>
              </p>
              <p class="instruction-type">
                <i class="material-icons">info</i>
                {{ getInstructionTypeLabel(instruction.instructionType) }}
              </p>
              <p class="instruction-text">{{ instruction.instructions }}</p>
              <div class="instruction-meta">
                <span class="validity">
                  <i class="material-icons">calendar_today</i>
                  Valid until: {{ formatDate(instruction.validUntil) }}
                </span>
              </div>
            </div>
            <div class="instruction-actions">
              <button 
                class="action-btn" 
                (click)="viewInstructionDetails(instruction); $event.stopPropagation()"
                title="View Details">
                <i class="material-icons">visibility</i>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredInstructions.length === 0">
            <i class="material-icons">description</i>
            <p>No instructions found</p>
            <span *ngIf="instructionSearchQuery">Try adjusting your search</span>
          </div>
        </div>
      </div>

      <!-- Package Details Modal -->
      <div class="modal-overlay" *ngIf="selectedPackage" (click)="closePackageDetails()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Package Details</h2>
            <button class="close-btn" (click)="closePackageDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedPackage">
            <div class="detail-section">
              <h3>{{ selectedPackage.recipientName }}</h3>
              <div class="detail-info">
                <div class="detail-row">
                  <span class="label">Flat:</span>
                  <span class="value">{{ selectedPackage.recipientFlat }}<span *ngIf="selectedPackage.recipientBuilding">, {{ selectedPackage.recipientBuilding }}</span></span>
                </div>
                <div class="detail-row">
                  <span class="label">Courier:</span>
                  <span class="value">{{ selectedPackage.courierName }}</span>
                </div>
                <div class="detail-row" *ngIf="selectedPackage.trackingNumber">
                  <span class="label">Tracking:</span>
                  <span class="value">{{ selectedPackage.trackingNumber }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Status:</span>
                  <span class="value status-badge" [ngClass]="selectedPackage.status">
                    {{ getStatusLabel(selectedPackage.status) }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="label">Received:</span>
                  <span class="value">{{ formatDateTime(selectedPackage.receivedAt) }}</span>
                </div>
                <div class="detail-row" *ngIf="selectedPackage.notes">
                  <span class="label">Notes:</span>
                  <span class="value">{{ selectedPackage.notes }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closePackageDetails()">Close</button>
            <button 
              class="btn btn-primary" 
              (click)="handlePackage(selectedPackage!)"
              *ngIf="selectedPackage?.status === 'pending'">
              <i class="material-icons">{{ getActionIcon(selectedPackage!.status) }}</i>
              {{ getActionButtonTitle(selectedPackage!) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Instruction Details Modal -->
      <div class="modal-overlay" *ngIf="selectedInstruction" (click)="closeInstructionDetails()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Holding Instructions</h2>
            <button class="close-btn" (click)="closeInstructionDetails()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedInstruction">
            <div class="detail-section">
              <h3>{{ selectedInstruction.residentName }}</h3>
              <div class="detail-info">
                <div class="detail-row">
                  <span class="label">Flat:</span>
                  <span class="value">{{ selectedInstruction.flatNumber }}<span *ngIf="selectedInstruction.building">, {{ selectedInstruction.building }}</span></span>
                </div>
                <div class="detail-row">
                  <span class="label">Type:</span>
                  <span class="value">{{ getInstructionTypeLabel(selectedInstruction.instructionType) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Priority:</span>
                  <span class="value">{{ selectedInstruction.priority === 'high' ? 'High' : 'Normal' }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Valid From:</span>
                  <span class="value">{{ formatDateTime(selectedInstruction.validFrom) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Valid Until:</span>
                  <span class="value">{{ formatDateTime(selectedInstruction.validUntil) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Status:</span>
                  <span class="value" [ngClass]="selectedInstruction.isActive ? 'active' : 'expired'">
                    {{ selectedInstruction.isActive ? 'Active' : 'Expired' }}
                  </span>
                </div>
              </div>
              <div class="instruction-box">
                <h4>Instructions</h4>
                <p>{{ selectedInstruction.instructions }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeInstructionDetails()">Close</button>
          </div>
        </div>
      </div>

      <!-- Add Package Modal -->
      <div class="modal-overlay" *ngIf="showAddPackage" (click)="showAddPackage = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add Package</h2>
            <button class="close-btn" (click)="showAddPackage = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Recipient Name <span class="required">*</span></label>
              <input type="text" [(ngModel)]="newPackage.recipientName" placeholder="Recipient name" />
            </div>
            <div class="form-group">
              <label>Flat Number <span class="required">*</span></label>
              <input type="text" [(ngModel)]="newPackage.recipientFlat" placeholder="e.g., A-101" />
            </div>
            <div class="form-group">
              <label>Building</label>
              <input type="text" [(ngModel)]="newPackage.recipientBuilding" placeholder="Building name" />
            </div>
            <div class="form-group">
              <label>Courier Name <span class="required">*</span></label>
              <input type="text" [(ngModel)]="newPackage.courierName" placeholder="Courier company" />
            </div>
            <div class="form-group">
              <label>Tracking Number</label>
              <input type="text" [(ngModel)]="newPackage.trackingNumber" placeholder="Tracking number" />
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="newPackage.notes" placeholder="Additional notes" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showAddPackage = false">Cancel</button>
            <button class="btn btn-primary" (click)="addPackage()" [disabled]="!newPackage.recipientName || !newPackage.recipientFlat || !newPackage.courierName">
              Add Package
            </button>
          </div>
        </div>
      </div>

      <!-- Handle Package Modal -->
      <div class="modal-overlay" *ngIf="packageToHandle" (click)="cancelHandlePackage()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Handle Package</h2>
            <button class="close-btn" (click)="cancelHandlePackage()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="packageToHandle">
            <p>Package for: <strong>{{ packageToHandle.recipientName }}</strong></p>
            <p>Flat: <strong>{{ packageToHandle.recipientFlat }}</strong></p>
            
            <div class="form-group">
              <label>Action <span class="required">*</span></label>
              <select [(ngModel)]="packageAction">
                <option value="delivered">Mark as Delivered</option>
                <option value="held">Hold Package</option>
                <option value="rejected">Reject Package</option>
                <option value="forwarded">Forward Package</option>
              </select>
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="packageActionNotes" placeholder="Add notes about this action" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="cancelHandlePackage()">Cancel</button>
            <button class="btn btn-primary" (click)="confirmHandlePackage()">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .package-holding-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    .banner {
      margin: 12px 16px 0;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 14px;
    }
    .banner.error { background: #fef2f2; color: #b91c1c; }
    .banner.loading { background: #eff6ff; color: #1d4ed8; }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      color: white;
      padding: 16px;
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
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }

    /* Tabs */
    .tabs-section {
      display: flex;
      background: white;
      border-bottom: 1px solid #e9ecef;
    }

    .tab-btn {
      flex: 1;
      padding: 16px;
      border: none;
      background: white;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }

    .tab-btn.active {
      color: #f39c12;
      border-bottom-color: #f39c12;
      background: #fffbf0;
    }

    /* Content Section */
    .content-section {
      padding: 16px;
    }

    /* Filter Section */
    .filter-section {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .search-box {
      flex: 1;
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

    .status-filter {
      padding: 8px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      outline: none;
    }

    /* Packages List */
    .packages-list,
    .instructions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .package-item,
    .instruction-item {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: all 0.2s;
      cursor: pointer;
    }

    .package-item:hover,
    .instruction-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .package-item.urgent {
      border-left: 4px solid #e74c3c;
    }

    .instruction-item.expired {
      opacity: 0.6;
    }

    .package-icon,
    .instruction-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .package-icon.pending { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .package-icon.held { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .package-icon.delivered { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }
    .package-icon.rejected { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .package-icon.forwarded { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }

    .instruction-icon.hold { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); }
    .instruction-icon.forward { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .instruction-icon.reject { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .instruction-icon.deliver_to_flat { background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%); }

    .package-info,
    .instruction-info {
      flex: 1;
      min-width: 0;
    }

    .package-header,
    .instruction-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .package-info h3,
    .instruction-info h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #2c3e50;
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.pending { background: #e7f3ff; color: #2980b9; }
    .status-badge.held { background: #fff4e6; color: #e67e22; }
    .status-badge.delivered { background: #e8f8f0; color: #1e9e5a; }
    .status-badge.rejected { background: #ffeaea; color: #c0392b; }
    .status-badge.forwarded { background: #f4e7ff; color: #8e44ad; }

    .package-details,
    .instruction-details {
      margin: 4px 0;
      font-size: 12px;
      color: #7f8c8d;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .package-time {
      margin: 4px 0;
      font-size: 11px;
      color: #95a5a6;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .instruction-type,
    .instruction-text {
      margin: 4px 0;
      font-size: 12px;
      color: #7f8c8d;
    }

    .instruction-text {
      margin-top: 8px;
      font-style: italic;
    }

    .instruction-meta {
      margin-top: 8px;
      font-size: 11px;
      color: #95a5a6;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .instruction-badge {
      margin-top: 8px;
      padding: 4px 8px;
      background: #fff4e6;
      border-radius: 4px;
      font-size: 11px;
      color: #e67e22;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .priority-badge {
      padding: 2px 8px;
      background: #ffeaea;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      color: #e74c3c;
    }

    .expired-badge {
      padding: 2px 8px;
      background: #f5f7fa;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      color: #95a5a6;
    }

    .package-actions,
    .instruction-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      background: #f39c12;
      color: white;
    }

    .action-btn:hover {
      background: #e67e22;
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
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
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

    .detail-section h3 {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f5f7fa;
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

    .value.active {
      color: #2ed573;
    }

    .value.expired {
      color: #e74c3c;
    }

    .instruction-box {
      margin-top: 20px;
      padding: 16px;
      background: #fffbf0;
      border-radius: 8px;
      border-left: 4px solid #f39c12;
    }

    .instruction-box h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .instruction-box p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
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
      padding: 40px 20px;
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
      .filter-section {
        flex-direction: column;
      }
    }
  `]
})
export class PackageHoldingComponent implements OnInit, OnDestroy {
  packages: Package[] = [];
  filteredPackages: Package[] = [];
  instructions: PackageHoldingInstruction[] = [];
  filteredInstructions: PackageHoldingInstruction[] = [];
  selectedPackage: Package | null = null;
  selectedInstruction: PackageHoldingInstruction | null = null;
  packageToHandle: Package | null = null;
  packageAction: string = 'delivered';
  packageActionNotes: string = '';
  activeTab: 'packages' | 'instructions' = 'packages';
  packageSearchQuery: string = '';
  packageStatusFilter: string = 'all';
  instructionSearchQuery: string = '';
  showAddPackage: boolean = false;
  isLoading = false;
  errorMessage = '';

  newPackage: Partial<Package> = {
    courierName: '',
    recipientName: '',
    recipientFlat: '',
    status: 'pending',
    deliveryAttempts: 0
  };

  private destroy$ = new Subject<void>();

  constructor(
    private packageService: GuardPackageService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadPackages();
    this.loadInstructions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load packages from GET /deliveries/society/{id}
   */
  loadPackages(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.packageService
      .listPackages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rows => {
          this.packages = rows;
          this.filterPackages();
          this.isLoading = false;
          const highlight = this.route.snapshot.queryParamMap.get('highlight');
          if (highlight) {
            const pkg = rows.find(p => p.id === highlight);
            if (pkg) {
              this.viewPackageDetails(pkg);
            }
          }
        },
        error: () => {
          this.errorMessage = 'Could not load packages. Check backend is running.';
          this.isLoading = false;
        }
      });
  }

  /**
   * Resident holding instructions — no backend API yet; show empty list.
   */
  loadInstructions(): void {
    this.instructions = [];
    this.filterInstructions();
  }

  /**
   * Set active tab
   */
  setTab(tab: 'packages' | 'instructions'): void {
    this.activeTab = tab;
  }

  /**
   * Filter packages
   */
  filterPackages(): void {
    let filtered = [...this.packages];

    // Apply status filter
    if (this.packageStatusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.packageStatusFilter);
    }

    // Apply search filter
    if (this.packageSearchQuery.trim()) {
      const query = this.packageSearchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.recipientName.toLowerCase().includes(query) ||
        p.recipientFlat.toLowerCase().includes(query) ||
        (p.trackingNumber && p.trackingNumber.toLowerCase().includes(query)) ||
        p.courierName.toLowerCase().includes(query)
      );
    }

    // Sort by received date (newest first)
    filtered.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    this.filteredPackages = filtered;
  }

  /**
   * Filter instructions
   */
  filterInstructions(): void {
    let filtered = [...this.instructions];

    // Apply search filter
    if (this.instructionSearchQuery.trim()) {
      const query = this.instructionSearchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.residentName.toLowerCase().includes(query) ||
        i.flatNumber.toLowerCase().includes(query) ||
        i.instructions.toLowerCase().includes(query)
      );
    }

    // Sort: active first, then by priority
    filtered.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1;
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    this.filteredInstructions = filtered;
  }

  /**
   * Get pending packages count
   */
  get pendingPackages(): Package[] {
    return this.packages.filter(p => p.status === 'pending');
  }

  /**
   * Get active instructions count
   */
  get activeInstructions(): PackageHoldingInstruction[] {
    return this.instructions.filter(i => i.isActive);
  }

  /**
   * View package details
   */
  viewPackageDetails(pkg: Package): void {
    this.selectedPackage = pkg;
  }

  /**
   * Close package details
   */
  closePackageDetails(): void {
    this.selectedPackage = null;
  }

  /**
   * View instruction details
   */
  viewInstructionDetails(instruction: PackageHoldingInstruction): void {
    this.selectedInstruction = instruction;
  }

  /**
   * Close instruction details
   */
  closeInstructionDetails(): void {
    this.selectedInstruction = null;
  }

  /**
   * Handle package
   */
  handlePackage(pkg: Package): void {
    this.packageToHandle = pkg;
    this.packageAction = pkg.status === 'pending' ? 'delivered' : pkg.status;
    this.packageActionNotes = '';
  }

  /**
   * Cancel handle package
   */
  cancelHandlePackage(): void {
    this.packageToHandle = null;
    this.packageAction = 'delivered';
    this.packageActionNotes = '';
  }

  /**
   * Confirm handle package
   */
  confirmHandlePackage(): void {
    if (!this.packageToHandle) {
      return;
    }
    const pkg = this.packageToHandle;
    const status = this.packageAction as Package['status'];
    this.packageService
      .updatePackage(pkg.id, status, this.packageActionNotes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => {
          const idx = this.packages.findIndex(p => p.id === updated.id);
          if (idx >= 0) {
            this.packages[idx] = updated;
          }
          this.filterPackages();
          this.cancelHandlePackage();
          if (this.selectedPackage) {
            this.closePackageDetails();
          }
        },
        error: () => {
          this.errorMessage = 'Failed to update package status.';
        }
      });
  }

  /**
   * Register package received at gate via POST /deliveries
   */
  addPackage(): void {
    if (!this.newPackage.recipientName || !this.newPackage.recipientFlat || !this.newPackage.courierName) {
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.packageService
      .receivePackage({
        courierName: this.newPackage.courierName!,
        recipientName: this.newPackage.recipientName!,
        recipientFlat: this.newPackage.recipientFlat!,
        trackingNumber: this.newPackage.trackingNumber,
        notes: this.newPackage.notes
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: pkg => {
          this.packages.unshift(pkg);
          this.filterPackages();
          this.showAddPackage = false;
          this.newPackage = {
            courierName: '',
            recipientName: '',
            recipientFlat: '',
            status: 'pending',
            deliveryAttempts: 0
          };
          this.isLoading = false;
        },
        error: err => {
          this.errorMessage = err?.message || 'Failed to save package.';
          this.isLoading = false;
        }
      });
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      pending: 'schedule',
      held: 'inventory_2',
      delivered: 'check_circle',
      rejected: 'cancel',
      forwarded: 'forward'
    };
    return icons[status] || 'help';
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Get instruction icon
   */
  getInstructionIcon(type: string): string {
    const icons: { [key: string]: string } = {
      hold: 'inventory_2',
      forward: 'forward',
      reject: 'cancel',
      deliver_to_flat: 'home'
    };
    return icons[type] || 'info';
  }

  /**
   * Get instruction type label
   */
  getInstructionTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      hold: 'Hold Package',
      forward: 'Forward Package',
      reject: 'Reject Package',
      deliver_to_flat: 'Deliver to Flat'
    };
    return labels[type] || type;
  }

  /**
   * Get action icon
   */
  getActionIcon(status: string): string {
    if (status === 'pending') return 'check_circle';
    if (status === 'held') return 'inventory_2';
    return 'edit';
  }

  /**
   * Get action button title
   */
  getActionButtonTitle(pkg: Package): string {
    if (pkg.status === 'pending') return 'Handle Package';
    return 'Update Status';
  }

  /**
   * Format date time
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
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
    this.router.navigate(['/mobile/guard/dashboard']);
  }
}

