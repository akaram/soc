import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  Visitor,
  VisitorStatus
} from '../models/visitor.model';
import {
  ApprovalTier,
  ApprovalLevel,
  ApprovalWorkflow,
  TierApprovalRequest,
  TierRejectionRequest,
  TierApprovalResponse,
  ApprovalWorkflowStatistics
} from '../models/approval-tier.model';

@Component({
  selector: 'app-multi-tier-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="multi-tier-approval-container">
      <div class="page-header">
        <button class="btn-back" routerLink="/admin/visitors/list">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1><i class="material-icons">verified_user</i> Multi-Tier Approval</h1>
        <p>Gate and Tower level approval workflow for visitors</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card pending-gate">
          <div class="stat-icon">
            <i class="material-icons">security</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.pendingGate }}</div>
            <div class="stat-label">Pending Gate Approval</div>
          </div>
        </div>
        <div class="stat-card pending-tower">
          <div class="stat-icon">
            <i class="material-icons">apartment</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.pendingTower }}</div>
            <div class="stat-label">Pending Tower Approval</div>
          </div>
        </div>
        <div class="stat-card gate-approved">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.gateApproved }}</div>
            <div class="stat-label">Gate Approved (Awaiting Tower)</div>
          </div>
        </div>
        <div class="stat-card fully-approved">
          <div class="stat-icon">
            <i class="material-icons">verified</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.fullyApproved }}</div>
            <div class="stat-label">Fully Approved</div>
          </div>
        </div>
      </div>

      <!-- Approval Tabs -->
      <div class="approval-tabs">
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'gate'"
          (click)="switchTab('gate')">
          <i class="material-icons">security</i>
          Gate Approval
          <span class="badge" *ngIf="statistics">{{ statistics.pendingGate }}</span>
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'tower'"
          (click)="switchTab('tower')">
          <i class="material-icons">apartment</i>
          Tower Approval
          <span class="badge" *ngIf="statistics">{{ statistics.pendingTower }}</span>
        </button>
      </div>

      <!-- Gate Approval Section -->
      <div class="approval-section" *ngIf="activeTab === 'gate'">
        <div class="section-header">
          <h2><i class="material-icons">security</i> Gate Level Approval</h2>
          <p>Approve or reject visitors at the gate security level</p>
        </div>

        <div class="visitors-list" *ngIf="!isLoadingGate && gatePendingVisitors.length > 0">
          <div 
            *ngFor="let visitor of gatePendingVisitors" 
            class="visitor-card">
            <div class="visitor-header">
              <div class="visitor-avatar">
                {{ visitor.name.charAt(0).toUpperCase() }}
              </div>
              <div class="visitor-info">
                <h3>{{ visitor.name }}</h3>
                <p class="visitor-phone">
                  <i class="material-icons">phone</i>
                  {{ visitor.phone }}
                </p>
              </div>
              <div class="approval-badge gate-pending">
                <i class="material-icons">schedule</i>
                Gate Pending
              </div>
            </div>

            <div class="visitor-details">
              <div class="detail-row">
                <div class="detail-item">
                  <i class="material-icons">home</i>
                  <span><strong>Visiting:</strong> {{ visitor.visitingFlat }} <span *ngIf="visitor.visitingUnit">- {{ visitor.visitingUnit }}</span></span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">person</i>
                  <span><strong>Host:</strong> {{ visitor.hostName }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-item">
                  <i class="material-icons">description</i>
                  <span><strong>Purpose:</strong> {{ visitor.purpose }}</span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">event</i>
                  <span><strong>Date:</strong> {{ formatDate(visitor.visitDate) }} at {{ visitor.visitTime }}</span>
                </div>
              </div>
              <div class="detail-row" *ngIf="visitor.vehicleNumber">
                <div class="detail-item">
                  <i class="material-icons">directions_car</i>
                  <span><strong>Vehicle:</strong> {{ visitor.vehicleNumber }}</span>
                </div>
              </div>
            </div>

            <div class="approval-actions">
              <button 
                class="btn-approve" 
                (click)="approveAtGate(visitor.id)">
                <i class="material-icons">check_circle</i>
                Approve
              </button>
              <button 
                class="btn-reject" 
                (click)="openRejectModal(visitor, 'gate')">
                <i class="material-icons">cancel</i>
                Reject
              </button>
              <button 
                class="btn-view" 
                (click)="viewDetails(visitor.id)">
                <i class="material-icons">visibility</i>
                View Details
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!isLoadingGate && gatePendingVisitors.length === 0">
          <i class="material-icons">check_circle</i>
          <h3>All Clear!</h3>
          <p>No visitors pending gate approval</p>
        </div>

        <div class="loading-state" *ngIf="isLoadingGate">
          <i class="material-icons">hourglass_empty</i>
          <p>Loading visitors...</p>
        </div>
      </div>

      <!-- Tower Approval Section -->
      <div class="approval-section" *ngIf="activeTab === 'tower'">
        <div class="section-header">
          <h2><i class="material-icons">apartment</i> Tower Level Approval</h2>
          <p>Approve or reject visitors at the tower/resident level</p>
        </div>

        <div class="visitors-list" *ngIf="!isLoadingTower && towerPendingVisitors.length > 0">
          <div 
            *ngFor="let visitor of towerPendingVisitors" 
            class="visitor-card">
            <div class="visitor-header">
              <div class="visitor-avatar">
                {{ visitor.name.charAt(0).toUpperCase() }}
              </div>
              <div class="visitor-info">
                <h3>{{ visitor.name }}</h3>
                <p class="visitor-phone">
                  <i class="material-icons">phone</i>
                  {{ visitor.phone }}
                </p>
              </div>
              <div class="approval-badge gate-approved-badge" *ngIf="visitor.gateApproved">
                <i class="material-icons">check_circle</i>
                Gate Approved
              </div>
              <div class="approval-badge tower-pending">
                <i class="material-icons">schedule</i>
                Tower Pending
              </div>
            </div>

            <div class="visitor-details">
              <div class="detail-row">
                <div class="detail-item">
                  <i class="material-icons">home</i>
                  <span><strong>Visiting:</strong> {{ visitor.visitingFlat }} <span *ngIf="visitor.visitingUnit">- {{ visitor.visitingUnit }}</span></span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">person</i>
                  <span><strong>Host:</strong> {{ visitor.hostName }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-item">
                  <i class="material-icons">description</i>
                  <span><strong>Purpose:</strong> {{ visitor.purpose }}</span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">event</i>
                  <span><strong>Date:</strong> {{ formatDate(visitor.visitDate) }} at {{ visitor.visitTime }}</span>
                </div>
              </div>
              <div class="detail-row" *ngIf="visitor.gateApprovedBy">
                <div class="detail-item">
                  <i class="material-icons">security</i>
                  <span><strong>Gate Approved By:</strong> {{ visitor.gateApprovedBy }} on {{ formatDateTime(visitor.gateApprovedAt) }}</span>
                </div>
              </div>
            </div>

            <div class="approval-actions">
              <button 
                class="btn-approve" 
                (click)="approveAtTower(visitor.id)">
                <i class="material-icons">check_circle</i>
                Approve
              </button>
              <button 
                class="btn-reject" 
                (click)="openRejectModal(visitor, 'tower')">
                <i class="material-icons">cancel</i>
                Reject
              </button>
              <button 
                class="btn-view" 
                (click)="viewDetails(visitor.id)">
                <i class="material-icons">visibility</i>
                View Details
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!isLoadingTower && towerPendingVisitors.length === 0">
          <i class="material-icons">check_circle</i>
          <h3>All Clear!</h3>
          <p>No visitors pending tower approval</p>
        </div>

        <div class="loading-state" *ngIf="isLoadingTower">
          <i class="material-icons">hourglass_empty</i>
          <p>Loading visitors...</p>
        </div>
      </div>

      <!-- Rejection Modal -->
      <div class="modal-overlay" *ngIf="showRejectModal" (click)="closeRejectModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">cancel</i> Reject Visitor</h2>
            <button class="btn-close" (click)="closeRejectModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="visitor-info-modal" *ngIf="selectedVisitor">
              <p><strong>Visitor:</strong> {{ selectedVisitor.name }}</p>
              <p><strong>Visiting:</strong> {{ selectedVisitor.visitingFlat }} <span *ngIf="selectedVisitor.visitingUnit">- {{ selectedVisitor.visitingUnit }}</span></p>
            </div>
            <div class="form-group">
              <label for="rejectionReason">Rejection Reason <span class="required">*</span></label>
              <textarea 
                id="rejectionReason"
                [(ngModel)]="rejectionReason"
                rows="4"
                placeholder="Please provide a reason for rejection..."
                required></textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeRejectModal()">Cancel</button>
            <button 
              class="btn-danger" 
              (click)="confirmReject()"
              [disabled]="!rejectionReason || rejectionReason.trim().length === 0">
              <i class="material-icons">cancel</i>
              Reject Visitor
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .multi-tier-approval-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .btn-back {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      padding: 8px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .btn-back:hover {
      background: #f5f5f5;
      border-radius: 8px;
    }

    .page-header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    /* Statistics Grid */
    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .stat-card.pending-gate {
      border-left: 4px solid #ff9800;
    }

    .stat-card.pending-tower {
      border-left: 4px solid #2196f3;
    }

    .stat-card.gate-approved {
      border-left: 4px solid #4caf50;
    }

    .stat-card.fully-approved {
      border-left: 4px solid #9c27b0;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }

    .stat-card.pending-gate .stat-icon {
      background: rgba(255, 152, 0, 0.1);
      color: #ff9800;
    }

    .stat-card.pending-tower .stat-icon {
      background: rgba(33, 150, 243, 0.1);
      color: #2196f3;
    }

    .stat-card.gate-approved .stat-icon {
      background: rgba(76, 175, 80, 0.1);
      color: #4caf50;
    }

    .stat-card.fully-approved .stat-icon {
      background: rgba(156, 39, 176, 0.1);
      color: #9c27b0;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #7f8c8d;
    }

    /* Approval Tabs */
    .approval-tabs {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      background: white;
      padding: 8px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-button {
      flex: 1;
      padding: 16px 24px;
      background: transparent;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #7f8c8d;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      position: relative;
    }

    .tab-button:hover {
      background: #f5f5f5;
    }

    .tab-button.active {
      background: #667eea;
      color: white;
    }

    .tab-button .badge {
      background: rgba(255,255,255,0.2);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }

    .tab-button:not(.active) .badge {
      background: #667eea;
      color: white;
    }

    /* Approval Section */
    .approval-section {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .section-header h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    /* Visitor Cards */
    .visitors-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .visitor-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }

    .visitor-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
    }

    .visitor-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .visitor-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 20px;
    }

    .visitor-info {
      flex: 1;
    }

    .visitor-info h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .visitor-phone {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .approval-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .approval-badge.gate-pending {
      background: rgba(255, 152, 0, 0.1);
      color: #ff9800;
    }

    .approval-badge.gate-approved-badge {
      background: rgba(76, 175, 80, 0.1);
      color: #4caf50;
    }

    .approval-badge.tower-pending {
      background: rgba(33, 150, 243, 0.1);
      color: #2196f3;
    }

    .visitor-details {
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      gap: 24px;
      margin-bottom: 12px;
    }

    .detail-item {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #2c3e50;
    }

    .detail-item .material-icons {
      font-size: 18px;
      color: #667eea;
    }

    .approval-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }

    .btn-approve,
    .btn-reject,
    .btn-view {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-approve {
      background: #4caf50;
      color: white;
    }

    .btn-approve:hover {
      background: #45a049;
      transform: translateY(-2px);
    }

    .btn-reject {
      background: #f44336;
      color: white;
    }

    .btn-reject:hover {
      background: #da190b;
      transform: translateY(-2px);
    }

    .btn-view {
      background: #f5f5f5;
      color: #2c3e50;
    }

    .btn-view:hover {
      background: #e0e0e0;
    }

    /* Empty and Loading States */
    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0;
      color: #7f8c8d;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
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
      animation: modalAppear 0.3s ease;
    }

    @keyframes modalAppear {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-close {
      background: none;
      border: none;
      color: #7f8c8d;
      cursor: pointer;
      padding: 4px;
    }

    .btn-close:hover {
      color: #2c3e50;
    }

    .modal-body {
      padding: 24px;
    }

    .visitor-info-modal {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .visitor-info-modal p {
      margin: 8px 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-weight: 500;
      color: #2c3e50;
      font-size: 14px;
    }

    .required {
      color: #f44336;
    }

    .form-group textarea {
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
    }

    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .modal-actions {
      padding: 16px 24px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn-secondary,
    .btn-danger {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-danger {
      background: #f44336;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #da190b;
    }

    .btn-danger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .multi-tier-approval-container {
        padding: 16px;
      }

      .statistics-grid {
        grid-template-columns: 1fr;
      }

      .approval-tabs {
        flex-direction: column;
      }

      .detail-row {
        flex-direction: column;
        gap: 8px;
      }

      .approval-actions {
        flex-direction: column;
      }
    }
  `]
})
export class MultiTierApprovalComponent implements OnInit {
  activeTab: 'gate' | 'tower' = 'gate';
  gatePendingVisitors: Visitor[] = [];
  towerPendingVisitors: Visitor[] = [];
  statistics: ApprovalWorkflowStatistics | null = null;
  isLoadingGate = false;
  isLoadingTower = false;
  showRejectModal = false;
  selectedVisitor: Visitor | null = null;
  rejectionTier: 'gate' | 'tower' = 'gate';
  rejectionReason: string = '';

  // Mock user IDs - in real app, get from auth service
  currentUserId = 'GUARD-001'; // or 'TOWER-ADMIN-001'

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadGatePendingVisitors();
    this.loadTowerPendingVisitors();
  }

  switchTab(tab: 'gate' | 'tower'): void {
    this.activeTab = tab;
    if (tab === 'gate') {
      this.loadGatePendingVisitors();
    } else {
      this.loadTowerPendingVisitors();
    }
  }

  loadStatistics(): void {
    this.visitorService.getApprovalWorkflowStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  loadGatePendingVisitors(): void {
    this.isLoadingGate = true;
    this.visitorService.getVisitorsPendingGateApproval().subscribe({
      next: (visitors) => {
        this.gatePendingVisitors = visitors;
        this.isLoadingGate = false;
      },
      error: (error) => {
        console.error('Error loading gate pending visitors:', error);
        this.isLoadingGate = false;
      }
    });
  }

  loadTowerPendingVisitors(): void {
    this.isLoadingTower = true;
    this.visitorService.getVisitorsPendingTowerApproval().subscribe({
      next: (visitors) => {
        this.towerPendingVisitors = visitors;
        this.isLoadingTower = false;
      },
      error: (error) => {
        console.error('Error loading tower pending visitors:', error);
        this.isLoadingTower = false;
      }
    });
  }

  approveAtGate(visitorId: string): void {
    const request: TierApprovalRequest = {
      visitorId: visitorId,
      approvedBy: this.currentUserId
    };

    this.visitorService.approveAtGateLevel(request).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Visitor approved at gate level successfully!');
          this.loadGatePendingVisitors();
          this.loadTowerPendingVisitors();
          this.loadStatistics();
        } else {
          alert(response.message || 'Failed to approve visitor');
        }
      },
      error: (error) => {
        console.error('Error approving visitor:', error);
        alert('An error occurred while approving the visitor');
      }
    });
  }

  approveAtTower(visitorId: string): void {
    const request: TierApprovalRequest = {
      visitorId: visitorId,
      approvedBy: 'TOWER-ADMIN-001' // In real app, get from auth service
    };

    this.visitorService.approveAtTowerLevel(request).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Visitor approved at tower level! Fully approved!');
          this.loadTowerPendingVisitors();
          this.loadGatePendingVisitors();
          this.loadStatistics();
        } else {
          alert(response.message || 'Failed to approve visitor');
        }
      },
      error: (error) => {
        console.error('Error approving visitor:', error);
        alert('An error occurred while approving the visitor');
      }
    });
  }

  openRejectModal(visitor: Visitor, tier: 'gate' | 'tower'): void {
    this.selectedVisitor = visitor;
    this.rejectionTier = tier;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedVisitor = null;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.selectedVisitor || !this.rejectionReason.trim()) return;

    const request: TierRejectionRequest = {
      visitorId: this.selectedVisitor.id,
      rejectedBy: this.rejectionTier === 'gate' ? this.currentUserId : 'TOWER-ADMIN-001',
      reason: this.rejectionReason
    };

    const approvalObservable = this.rejectionTier === 'gate'
      ? this.visitorService.rejectAtGateLevel(request)
      : this.visitorService.rejectAtTowerLevel(request);

    approvalObservable.subscribe({
      next: (response) => {
        if (response.success) {
          alert(`Visitor rejected at ${this.rejectionTier} level`);
          this.closeRejectModal();
          this.loadGatePendingVisitors();
          this.loadTowerPendingVisitors();
          this.loadStatistics();
        } else {
          alert(response.message || 'Failed to reject visitor');
        }
      },
      error: (error) => {
        console.error('Error rejecting visitor:', error);
        alert('An error occurred while rejecting the visitor');
      }
    });
  }

  viewDetails(visitorId: string): void {
    this.router.navigate(['/admin/visitors', visitorId]);
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  formatDateTime(date?: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

