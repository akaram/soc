import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import { MonthlyGatepass, GatepassStatus } from '../models/monthly-gatepass.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-monthly-gatepass-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="gatepass-detail-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1>Monthly Gatepass Details</h1>
      </div>

      <div class="detail-content" *ngIf="gatepass && !isLoading">
        <!-- Gatepass Info Card -->
        <div class="info-card">
          <div class="card-header">
            <div class="visitor-avatar-large">
              {{ gatepass.visitorName.charAt(0).toUpperCase() }}
            </div>
            <div class="visitor-title">
              <h2>{{ gatepass.visitorName }}</h2>
              <span class="status-badge" [ngClass]="'status-' + gatepass.status.toLowerCase()">
                {{ getStatusLabel(gatepass.status) }}
              </span>
            </div>
          </div>

          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <label><i class="material-icons">phone</i> Phone</label>
                <span>{{ gatepass.phone }}</span>
              </div>
              <div class="info-item" *ngIf="gatepass.email">
                <label><i class="material-icons">email</i> Email</label>
                <span>{{ gatepass.email }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">home</i> Visiting</label>
                <span>{{ gatepass.visitingFlat }} <span *ngIf="gatepass.visitingUnit">- {{ gatepass.visitingUnit }}</span></span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">person</i> Host</label>
                <span>{{ gatepass.hostName }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">description</i> Purpose</label>
                <span>{{ gatepass.purpose }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">calendar_today</i> Start Date</label>
                <span>{{ formatDate(gatepass.startDate) }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">event</i> End Date</label>
                <span>{{ formatDate(gatepass.endDate) }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">schedule</i> Validity</label>
                <span class="validity-badge" [ngClass]="getValidityClass(gatepass.validityDays)">
                  {{ gatepass.validityDays }} days remaining
                </span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">event</i> Visits This Month</label>
                <span>{{ gatepass.currentMonthVisits }} / {{ gatepass.maxVisitsPerMonth || 'Unlimited' }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">trending_up</i> Total Visits</label>
                <span>{{ gatepass.totalVisits }}</span>
              </div>
              <div class="info-item" *ngIf="gatepass.vehicleNumber">
                <label><i class="material-icons">directions_car</i> Vehicle</label>
                <span>{{ gatepass.vehicleNumber }} <span *ngIf="gatepass.vehicleType">({{ gatepass.vehicleType }})</span></span>
              </div>
              <div class="info-item" *ngIf="gatepass.idProofNumber">
                <label><i class="material-icons">badge</i> ID Proof</label>
                <span>{{ gatepass.idProofNumber }}</span>
              </div>
              <div class="info-item" *ngIf="gatepass.notes">
                <label><i class="material-icons">notes</i> Notes</label>
                <span>{{ gatepass.notes }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- QR Code Section -->
        <div class="info-card" *ngIf="gatepass.qrCode">
          <div class="card-header">
            <h3><i class="material-icons">qr_code</i> QR Code</h3>
          </div>
          <div class="card-body">
            <div class="qr-preview">
              <img [src]="gatepass.qrCode" alt="QR Code">
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
                *ngIf="gatepass.status === GatepassStatus.PENDING"
                (click)="approveGatepass()">
                <i class="material-icons">check_circle</i>
                Approve Gatepass
              </button>
              <button 
                class="btn-action suspend" 
                *ngIf="gatepass.status === GatepassStatus.ACTIVE"
                (click)="suspendGatepass()">
                <i class="material-icons">pause</i>
                Suspend Gatepass
              </button>
              <button 
                class="btn-action cancel" 
                *ngIf="gatepass.status !== GatepassStatus.CANCELLED && gatepass.status !== GatepassStatus.EXPIRED"
                (click)="cancelGatepass()">
                <i class="material-icons">cancel</i>
                Cancel Gatepass
              </button>
              <button 
                class="btn-action edit" 
                (click)="editGatepass()">
                <i class="material-icons">edit</i>
                Edit Gatepass
              </button>
              <button 
                class="btn-action delete" 
                (click)="deleteGatepass()">
                <i class="material-icons">delete</i>
                Delete Gatepass
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading gatepass details...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="!isLoading && !gatepass">
        <i class="material-icons">error_outline</i>
        <h3>Gatepass Not Found</h3>
        <p>The gatepass you're looking for doesn't exist or has been removed.</p>
        <button class="btn-primary" (click)="goBack()">
          Go Back
        </button>
      </div>
    </div>
  `,
  styles: [`
    .gatepass-detail-container {
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

    .status-badge.status-active {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .status-badge.status-expired {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .validity-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    .validity-badge.high {
      background: #d4edda;
      color: #155724;
    }

    .validity-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .validity-badge.low {
      background: #f8d7da;
      color: #721c24;
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

    .btn-action.suspend {
      background: #ffc107;
      color: #2c3e50;
    }

    .btn-action.suspend:hover {
      background: #e0a800;
    }

    .btn-action.cancel {
      background: #dc3545;
      color: white;
    }

    .btn-action.cancel:hover {
      background: #c82333;
    }

    .btn-action.edit {
      background: #17a2b8;
      color: white;
    }

    .btn-action.edit:hover {
      background: #138496;
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
      .gatepass-detail-container {
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
export class MonthlyGatepassDetailComponent implements OnInit {
  gatepass: MonthlyGatepass | null = null;
  isLoading = true;
  gatepassId: string = '';
  GatepassStatus = GatepassStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private visitorService: VisitorManagementService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.gatepassId = params['id'];
      if (this.gatepassId) {
        this.loadGatepass();
      }
    });
  }

  loadGatepass(): void {
    this.isLoading = true;
    this.visitorService.getMonthlyGatepassById(this.gatepassId).subscribe({
      next: (gatepass) => {
        this.gatepass = gatepass || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading gatepass:', error);
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/visitors/gatepass']);
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

  getStatusLabel(status: GatepassStatus): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'ACTIVE': 'Active',
      'EXPIRED': 'Expired',
      'SUSPENDED': 'Suspended',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  getValidityClass(days: number): string {
    if (days > 15) return 'high';
    if (days > 7) return 'medium';
    return 'low';
  }

  viewQRCode(): void {
    if (this.gatepass) {
      this.router.navigate(['/admin/visitors/gatepass', this.gatepass.id, 'qr']);
    }
  }

  shareQRCode(): void {
    if (this.gatepass) {
      this.router.navigate(['/admin/visitors/gatepass', this.gatepass.id, 'qr']);
    }
  }

  approveGatepass(): void {
    if (!this.gatepass) return;

    this.visitorService.approveMonthlyGatepass(this.gatepass.id, 'current_admin').subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('Gatepass approved successfully.');
          this.loadGatepass();
        }
      },
      error: error => {
        console.error('Error approving gatepass:', error);
        this.toast.error('Failed to approve gatepass.');
      }
    });
  }

  suspendGatepass(): void {
    if (!this.gatepass) return;

    const reason = prompt(`Why are you suspending ${this.gatepass.visitorName}'s gatepass?`);
    if (!reason?.trim()) {
      if (reason !== null) {
        this.toast.warning('Suspension reason is required.');
      }
      return;
    }
    this.visitorService.suspendMonthlyGatepass(this.gatepass.id, reason.trim()).subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('Gatepass suspended.');
          this.loadGatepass();
        }
      },
      error: error => {
        console.error('Error suspending gatepass:', error);
        this.toast.error('Failed to suspend gatepass.');
      }
    });
  }

  cancelGatepass(): void {
    if (!this.gatepass) return;

    const reason = prompt(`Why are you cancelling ${this.gatepass.visitorName}'s gatepass?`);
    if (!reason?.trim()) {
      if (reason !== null) {
        this.toast.warning('Cancellation reason is required.');
      }
      return;
    }
    this.visitorService.cancelMonthlyGatepass(this.gatepass.id, reason.trim()).subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('Gatepass cancelled.');
          this.loadGatepass();
        }
      },
      error: error => {
        console.error('Error cancelling gatepass:', error);
        this.toast.error('Failed to cancel gatepass.');
      }
    });
  }

  editGatepass(): void {
    if (this.gatepass) {
      this.router.navigate(['/admin/visitors/gatepass', this.gatepass.id, 'edit']);
    }
  }

  deleteGatepass(): void {
    if (!this.gatepass) return;

    this.visitorService.deleteMonthlyGatepass(this.gatepass.id).subscribe({
      next: response => {
        if (response.success) {
          this.toast.warning('Gatepass deleted.');
          this.goBack();
        }
      },
      error: error => {
        console.error('Error deleting gatepass:', error);
        this.toast.error('Failed to delete gatepass.');
      }
    });
  }
}

