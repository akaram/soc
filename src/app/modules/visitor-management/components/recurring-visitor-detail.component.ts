import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import { RecurringVisitor } from '../models/recurring-visitor.model';
import { RecurringPattern } from '../models/visitor.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-recurring-visitor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="recurring-detail-container">
      <div class="page-header">
        <button type="button" class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1>Recurring Visitor Details</h1>
      </div>

      <div class="detail-content" *ngIf="visitor && !isLoading">
        <div class="info-card">
          <div class="card-header">
            <div class="visitor-avatar-large">
              {{ visitor.name.charAt(0).toUpperCase() }}
            </div>
            <div class="visitor-title">
              <h2>{{ visitor.name }}</h2>
              <span class="status-badge" [ngClass]="visitor.isActive ? 'active' : 'inactive'">
                {{ visitor.isActive ? 'Active' : 'Inactive' }}
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
                <span>{{ visitor.visitingFlat }}<span *ngIf="visitor.visitingUnit"> - {{ visitor.visitingUnit }}</span></span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">work</i> Purpose</label>
                <span>{{ visitor.purpose }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">schedule</i> Visit Time</label>
                <span>{{ visitor.visitTime }} ({{ visitor.expectedDuration }} min)</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">repeat</i> Pattern</label>
                <span>
                  {{ getPatternLabel(visitor.recurringPattern) }}
                  <span *ngIf="visitor.daysOfWeek?.length" class="days-inline">
                    — {{ getDaysLabel(visitor.daysOfWeek) }}
                  </span>
                </span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">event</i> Start Date</label>
                <span>{{ formatDate(visitor.startDate) }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.endDate">
                <label><i class="material-icons">event_busy</i> End Date</label>
                <span>{{ formatDate(visitor.endDate) }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">verified</i> Auto Approve</label>
                <span>{{ visitor.autoApprove ? 'Yes' : 'No' }}</span>
              </div>
              <div class="info-item">
                <label><i class="material-icons">trending_up</i> Total Visits</label>
                <span>{{ visitor.totalVisits }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.lastVisitDate">
                <label><i class="material-icons">history</i> Last Visit</label>
                <span>{{ formatDate(visitor.lastVisitDate) }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.idProofNumber">
                <label><i class="material-icons">badge</i> ID Proof</label>
                <span>{{ visitor.idProofNumber }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.notes">
                <label><i class="material-icons">notes</i> Notes</label>
                <span>{{ visitor.notes }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card" *ngIf="visitor.qrCode">
          <div class="card-header simple">
            <h3><i class="material-icons">qr_code</i> Entry QR Code</h3>
          </div>
          <div class="card-body qr-section">
            <img [src]="visitor.qrCode" alt="Recurring visitor QR code" class="qr-preview" />
            <button type="button" class="btn-secondary" (click)="viewFullQr()">
              <i class="material-icons">qr_code</i>
              View Full QR Code
            </button>
          </div>
        </div>

        <div class="info-card">
          <div class="card-header simple">
            <h3><i class="material-icons">settings</i> Actions</h3>
          </div>
          <div class="card-body">
            <div class="action-buttons-grid">
              <button type="button" class="btn-action edit" (click)="editVisitor()">
                <i class="material-icons">edit</i>
                Edit
              </button>
              <button type="button" class="btn-action qr" (click)="viewFullQr()">
                <i class="material-icons">qr_code</i>
                QR Code
              </button>
              <button
                type="button"
                class="btn-action toggle"
                [ngClass]="visitor.isActive ? 'deactivate' : 'activate'"
                (click)="toggleVisitor()">
                <i class="material-icons">{{ visitor.isActive ? 'pause' : 'play_arrow' }}</i>
                {{ visitor.isActive ? 'Deactivate' : 'Activate' }}
              </button>
              <button type="button" class="btn-action delete" (click)="deleteVisitor()">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading recurring visitor...</p>
      </div>

      <div class="error-state" *ngIf="!isLoading && !visitor">
        <i class="material-icons">error_outline</i>
        <h3>Recurring Visitor Not Found</h3>
        <p>This entry may have been removed or the link is invalid.</p>
        <button type="button" class="btn-primary" (click)="goBack()">Back to List</button>
      </div>
    </div>
  `,
  styles: [`
    .recurring-detail-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 0;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
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
    }

    .page-header h1 {
      margin: 0;
      font-size: 28px;
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

    .card-header.simple {
      background: #f8f9fa;
      color: #2c3e50;
    }

    .card-header.simple h3 {
      margin: 0;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .visitor-avatar-large {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 600;
    }

    .visitor-title h2 {
      margin: 0 0 8px;
      font-size: 26px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(255,255,255,0.25);
    }

    .card-body {
      padding: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .info-item label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .info-item span {
      font-size: 15px;
      color: #2c3e50;
      font-weight: 500;
    }

    .days-inline {
      color: #667eea;
      font-weight: 600;
    }

    .qr-section {
      text-align: center;
    }

    .qr-preview {
      width: 200px;
      height: 200px;
      border: 4px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .action-buttons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    .btn-action,
    .btn-secondary,
    .btn-primary {
      border: none;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: white;
    }

    .btn-action.edit { background: #17a2b8; }
    .btn-action.qr { background: #667eea; }
    .btn-action.activate { background: #28a745; }
    .btn-action.deactivate { background: #ffc107; color: #2c3e50; }
    .btn-action.delete { background: #dc3545; }

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }

    .btn-primary {
      background: #667eea;
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 48px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    @media (max-width: 768px) {
      .action-buttons-grid,
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RecurringVisitorDetailComponent implements OnInit {
  visitor: RecurringVisitor | null = null;
  isLoading = true;
  visitorId = '';

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
      } else {
        this.isLoading = false;
      }
    });
  }

  /** Load recurring visitor and ensure a client-side QR image when missing. */
  loadVisitor(): void {
    this.isLoading = true;
    this.visitorService.getRecurringVisitorById(this.visitorId).subscribe({
      next: visitor => {
        if (!visitor) {
          this.visitor = null;
          this.isLoading = false;
          return;
        }
        void this.visitorService.ensureRecurringVisitorQrCode(visitor).then(enriched => {
          this.visitor = enriched;
          this.isLoading = false;
        });
      },
      error: () => {
        this.visitor = null;
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/visitors/recurring']);
  }

  editVisitor(): void {
    if (this.visitor) {
      this.router.navigate(['/admin/visitors/recurring', this.visitor.id, 'edit']);
    }
  }

  viewFullQr(): void {
    if (this.visitor) {
      this.router.navigate(['/admin/visitors/recurring', this.visitor.id, 'qr']);
    }
  }

  toggleVisitor(): void {
    if (!this.visitor) return;
    const action = this.visitor.isActive ? 'deactivated' : 'activated';
    this.visitorService.toggleRecurringVisitor(this.visitor.id).subscribe({
      next: response => {
        if (response.success) {
          this.toast.success(`Recurring visitor ${action}.`);
          this.loadVisitor();
        } else {
          this.toast.error(response.message || 'Failed to update status.');
        }
      },
      error: () => this.toast.error('Failed to update visitor status.')
    });
  }

  deleteVisitor(): void {
    if (!this.visitor) return;
    this.visitorService.deleteRecurringVisitor(this.visitor.id).subscribe({
      next: response => {
        if (response.success) {
          this.toast.warning('Recurring visitor deleted.');
          this.goBack();
        } else {
          this.toast.error(response.message || 'Delete failed.');
        }
      },
      error: () => this.toast.error('Failed to delete recurring visitor.')
    });
  }

  getPatternLabel(pattern: RecurringPattern): string {
    const labels: Record<string, string> = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      CUSTOM: 'Custom'
    };
    return labels[pattern] || pattern;
  }

  getDaysLabel(days: number[] | undefined): string {
    if (!days?.length) {
      return '';
    }
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 7) return 'All days';
    return days.map(d => dayNames[d]).join(', ');
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
