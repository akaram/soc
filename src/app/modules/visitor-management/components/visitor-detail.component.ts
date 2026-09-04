import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import { Visitor, VisitorStatus } from '../models/visitor.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-visitor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="visitor-detail-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1>Visitor Details</h1>
      </div>

      <div class="detail-content" *ngIf="visitor && !isLoading">
        <!-- Visitor Info Card -->
        <div class="info-card">
          <div class="card-header">
            <div class="visitor-avatar-large">
              {{ visitor.name.charAt(0).toUpperCase() }}
            </div>
            <div class="visitor-title">
              <h2>{{ visitor.name }}</h2>
              <span class="status-badge" [ngClass]="'status-' + visitor.status.toLowerCase()">
                {{ getStatusLabel(visitor.status) }}
              </span>
            </div>
          </div>

          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <label><i class="material-icons">phone</i> Phone</label>
                <span>{{ visitor.phone }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.email">
                <label><i class="material-icons">email</i> Email</label>
                <span>{{ visitor.email }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">home</i> Visiting</label>
                <span>{{ visitor.visitingFlat }} <span *ngIf="visitor.visitingUnit">- {{ visitor.visitingUnit }}</span></span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">person</i> Host</label>
                <span>{{ visitor.hostName }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">description</i> Purpose</label>
                <span>{{ visitor.purpose }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">event</i> Visit Date</label>
                <span>{{ formatDate(visitor.visitDate) }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">schedule</i> Visit Time</label>
                <span>{{ visitor.visitTime }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.expectedDuration">
                <label><i class="material-icons">timer</i> Expected Duration</label>
                <span>{{ visitor.expectedDuration }} minutes</span>
              </div>
              <div class="info-item" *ngIf="visitor.numberOfVisitors">
                <label><i class="material-icons">group</i> Number of Visitors</label>
                <span>{{ visitor.numberOfVisitors }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.vehicleNumber">
                <label><i class="material-icons">directions_car</i> Vehicle</label>
                <span>{{ visitor.vehicleNumber }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.checkInTime">
                <label><i class="material-icons">login</i> Check-in Time</label>
                <span>{{ formatDateTime(visitor.checkInTime) }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.checkOutTime">
                <label><i class="material-icons">logout</i> Check-out Time</label>
                <span>{{ formatDateTime(visitor.checkOutTime) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- QR Code Section -->
        <div class="info-card" *ngIf="visitor.qrCode">
          <div class="card-header">
            <h3><i class="material-icons">qr_code</i> QR Code</h3>
          </div>
          <div class="card-body">
            <div class="qr-preview">
              <img [src]="visitor.qrCode" alt="QR Code">
            </div>
            <div class="qr-actions">
              <button class="btn-secondary" (click)="viewQRCode()">
                <i class="material-icons">qr_code</i>
                View Full QR Code
              </button>
              <button class="btn-secondary" (click)="shareQRCode()">
                <i class="material-icons">share</i>
                Share QR Code
              </button>
            </div>
          </div>
        </div>

        <!-- Actions Card -->
        <div class="info-card">
          <div class="card-header">
            <h3><i class="material-icons">settings</i> Actions</h3>
          </div>
          <div class="card-body">
            <div class="action-buttons-grid">
              <button 
                class="btn-action approve" 
                *ngIf="visitor.status === VisitorStatus.PENDING"
                (click)="approveVisitor()">
                <i class="material-icons">check_circle</i>
                Approve Visitor
              </button>
              <button 
                class="btn-action reject" 
                *ngIf="visitor.status === VisitorStatus.PENDING"
                (click)="rejectVisitor()">
                <i class="material-icons">cancel</i>
                Reject Visitor
              </button>
              <button 
                class="btn-action checkin" 
                *ngIf="visitor.status === VisitorStatus.APPROVED"
                (click)="checkInVisitor()">
                <i class="material-icons">login</i>
                Check In
              </button>
              <button 
                class="btn-action checkout" 
                *ngIf="visitor.status === VisitorStatus.CHECKED_IN"
                (click)="checkOutVisitor()">
                <i class="material-icons">logout</i>
                Check Out
              </button>
              <button 
                class="btn-action delete" 
                (click)="deleteVisitor()">
                <i class="material-icons">delete</i>
                Delete Visitor
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading visitor details...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="!isLoading && !visitor">
        <i class="material-icons">error_outline</i>
        <h3>Visitor Not Found</h3>
        <p>The visitor you're looking for doesn't exist or has been removed.</p>
        <button class="btn-primary" (click)="goBack()">
          Go Back
        </button>
      </div>
    </div>
  `,
  styles: [`
    .visitor-detail-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }

    .btn-back {
      background: #f5f5f5;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #667eea;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    .page-header h1 {
      margin: 0;
      font-size: 32px;
      color: #2c3e50;
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .info-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .card-header {
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .card-header h3 {
      margin: 0;
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .visitor-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 32px;
    }

    .visitor-title {
      flex: 1;
    }

    .visitor-title h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
    }

    .card-body {
      padding: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-item label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-item label .material-icons {
      font-size: 18px;
    }

    .info-item span {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.status-pending {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .status-badge.status-approved {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .status-badge.status-checked_in {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .qr-preview {
      text-align: center;
      margin-bottom: 20px;
    }

    .qr-preview img {
      width: 200px;
      height: 200px;
      border: 4px solid #e0e0e0;
      border-radius: 8px;
    }

    .qr-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .action-buttons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .btn-action {
      padding: 14px 20px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-action.approve {
      background: #28a745;
      color: white;
    }

    .btn-action.approve:hover {
      background: #218838;
    }

    .btn-action.reject {
      background: #dc3545;
      color: white;
    }

    .btn-action.reject:hover {
      background: #c82333;
    }

    .btn-action.checkin {
      background: #17a2b8;
      color: white;
    }

    .btn-action.checkin:hover {
      background: #138496;
    }

    .btn-action.checkout {
      background: #6c757d;
      color: white;
    }

    .btn-action.checkout:hover {
      background: #5a6268;
    }

    .btn-action.delete {
      background: #dc3545;
      color: white;
    }

    .btn-action.delete:hover {
      background: #c82333;
    }

    .btn-secondary {
      padding: 12px 20px;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #f8f9fa;
    }

    .btn-primary {
      padding: 14px 28px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .loading-state .material-icons,
    .error-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .error-state .material-icons {
      color: #e74c3c;
    }

    .error-state h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .error-state p {
      margin: 0 0 24px 0;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .visitor-detail-container {
        padding: 16px;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .action-buttons-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class VisitorDetailComponent implements OnInit {
  visitor: Visitor | null = null;
  isLoading = true;
  visitorId: string = '';
  VisitorStatus = VisitorStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private visitorService: VisitorManagementService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.visitorId = params['id'];
      if (this.visitorId) {
        this.loadVisitor();
      }
    });
  }

  loadVisitor(): void {
    this.isLoading = true;
    this.visitorService.getVisitorById(this.visitorId).subscribe({
      next: (visitor) => {
        this.visitor = visitor || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading visitor:', error);
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/visitors']);
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'CHECKED_IN': 'Checked In',
      'CHECKED_OUT': 'Checked Out',
      'EXPIRED': 'Expired',
      'CANCELLED': 'Cancelled'
    };
    if (
      this.visitor?.approvalStatus === 'UNDER_REVIEW' &&
      status === VisitorStatus.PENDING
    ) {
      return 'Pending tower approval';
    }
    return labels[status] || status;
  }

  viewQRCode(): void {
    if (this.visitor) {
      this.router.navigate(['/admin/visitors', this.visitor.id, 'qr']);
    }
  }

  shareQRCode(): void {
    if (this.visitor) {
      this.router.navigate(['/admin/visitors', this.visitor.id, 'qr']);
    }
  }

  approveVisitor(): void {
    if (!this.visitor) return;

    this.visitorService.approveVisitor(this.visitor.id).subscribe({
      next: response => {
        if (response.success && response.visitor) {
          this.visitor = response.visitor;
          this.toast.success('Visitor approved successfully.');
        } else {
          this.toast.warning(response.message || 'Approval incomplete — check multi-tier approval.');
          if (response.visitor) {
            this.visitor = response.visitor;
          }
        }
      },
      error: error => {
        console.error('Error approving visitor:', error);
        this.toast.error('Failed to approve visitor.');
      }
    });
  }

  rejectVisitor(): void {
    if (!this.visitor) return;

    const reason = prompt(`Why are you rejecting ${this.visitor.name}?`);
    if (!reason?.trim()) {
      if (reason !== null) {
        this.toast.warning('Rejection reason is required.');
      }
      return;
    }
    this.visitorService.rejectVisitor(this.visitor.id, reason.trim()).subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('Visitor rejected.');
          this.loadVisitor();
        }
      },
      error: error => {
        console.error('Error rejecting visitor:', error);
        this.toast.error('Failed to reject visitor.');
      }
    });
  }

  checkInVisitor(): void {
    if (!this.visitor) return;

    this.visitorService.checkInVisitor(this.visitor.id, 'current_guard').subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('Visitor checked in successfully.');
          this.loadVisitor();
        }
      },
      error: error => {
        console.error('Error checking in visitor:', error);
        this.toast.error('Failed to check in visitor.');
      }
    });
  }

  checkOutVisitor(): void {
    if (!this.visitor) return;

    this.visitorService.checkOutVisitor(this.visitor.id, 'current_guard').subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('Visitor checked out successfully.');
          this.loadVisitor();
        }
      },
      error: error => {
        console.error('Error checking out visitor:', error);
        this.toast.error('Failed to check out visitor.');
      }
    });
  }

  deleteVisitor(): void {
    if (!this.visitor) return;

    this.visitorService.deleteVisitor(this.visitor.id).subscribe({
      next: response => {
        if (response.success) {
          this.toast.warning('Visitor deleted.');
          this.goBack();
        }
      },
      error: error => {
        console.error('Error deleting visitor:', error);
        this.toast.error('Failed to delete visitor.');
      }
    });
  }
}

