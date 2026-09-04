import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ANPRService } from '../services/anpr.service';
import { VehicleRegistration, ANPRStatus } from '../models/anpr.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-anpr-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="anpr-detail-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <h1><i class="material-icons">directions_car</i> Vehicle Registration Details</h1>
      </div>

      <div class="detail-card" *ngIf="registration">
        <div class="detail-header">
          <div class="vehicle-icon-large">
            <i class="material-icons">{{ getVehicleIcon(registration.vehicleType) }}</i>
          </div>
          <div class="vehicle-title">
            <div class="vehicle-number-large">{{ registration.vehicleNumber }}</div>
            <div class="status-badge" [ngClass]="getStatusClass(registration.status)">
              {{ registration.status }}
            </div>
          </div>
        </div>

        <div class="detail-sections">
          <div class="detail-section">
            <h3>Vehicle Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Vehicle Type</label>
                <span class="value">{{ registration.vehicleType }}</span>
              </div>
              <div class="info-item" *ngIf="registration.vehicleMake">
                <label>Make</label>
                <span class="value">{{ registration.vehicleMake }}</span>
              </div>
              <div class="info-item" *ngIf="registration.vehicleModel">
                <label>Model</label>
                <span class="value">{{ registration.vehicleModel }}</span>
              </div>
              <div class="info-item" *ngIf="registration.vehicleColor">
                <label>Color</label>
                <span class="value">{{ registration.vehicleColor }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Owner Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Owner Name</label>
                <span class="value">{{ registration.ownerName }}</span>
              </div>
              <div class="info-item">
                <label>Phone</label>
                <span class="value">{{ registration.ownerPhone }}</span>
              </div>
              <div class="info-item" *ngIf="registration.ownerEmail">
                <label>Email</label>
                <span class="value">{{ registration.ownerEmail }}</span>
              </div>
              <div class="info-item">
                <label>Owner Type</label>
                <span class="value">{{ registration.ownerType }}</span>
              </div>
              <div class="info-item" *ngIf="registration.flatNumber">
                <label>Flat Number</label>
                <span class="value">{{ registration.flatNumber }} <span *ngIf="registration.unitNumber">- {{ registration.unitNumber }}</span></span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>ANPR Configuration</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Confidence Threshold</label>
                <span class="value">{{ registration.confidenceThreshold }}%</span>
              </div>
              <div class="info-item">
                <label>Allowed Gates</label>
                <span class="value">{{ registration.allowedGates.join(', ') }}</span>
              </div>
              <div class="info-item">
                <label>Total Entries</label>
                <span class="value">{{ registration.totalEntries }}</span>
              </div>
              <div class="info-item">
                <label>Failed Attempts</label>
                <span class="value">{{ registration.failedAttempts }}</span>
              </div>
              <div class="info-item" *ngIf="registration.lastEntryAt">
                <label>Last Entry</label>
                <span class="value">{{ formatDateTime(registration.lastEntryAt) }}</span>
              </div>
              <div class="info-item" *ngIf="registration.lastDetectedAt">
                <label>Last Detected</label>
                <span class="value">{{ formatDateTime(registration.lastDetectedAt) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section" *ngIf="registration.notes">
            <h3>Notes</h3>
            <p class="notes-text">{{ registration.notes }}</p>
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn-secondary" (click)="goBack()">
            <i class="material-icons">arrow_back</i>
            Back to List
          </button>
        </div>
      </div>

      <div class="loading-state" *ngIf="!registration">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading registration details...</p>
      </div>
    </div>
  `,
  styles: [`
    .anpr-detail-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-back {
      padding: 8px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: #f5f5f5;
      color: #2c3e50;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .detail-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f0f0f0;
    }

    .vehicle-icon-large {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }

    .vehicle-title {
      flex: 1;
    }

    .vehicle-number-large {
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 12px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.inactive {
      background: #e2e3e5;
      color: #383d41;
    }

    .status-badge.suspended {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.blacklisted {
      background: #721c24;
      color: white;
    }

    .detail-sections {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .detail-section h3 {
      font-size: 18px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
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
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .info-item .value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
    }

    .notes-text {
      color: #2c3e50;
      line-height: 1.6;
      margin: 0;
    }

    .detail-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .btn-secondary {
      padding: 12px 24px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f5f5f5;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .loading-state p {
      margin: 0;
      color: #7f8c8d;
    }
  `]
})
export class ANPRDetailComponent implements OnInit {
  registration: VehicleRegistration | null = null;

  ANPRStatus = ANPRStatus;

  constructor(
    private anprService: ANPRService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRegistration(id);
    }
  }

  loadRegistration(id: string): void {
    this.anprService.getRegistrationById(id).subscribe({
      next: (registration) => {
        this.registration = registration;
        if (!registration) {
          this.toast.error('Registration not found');
          this.goBack();
        }
      },
      error: (error) => {
        console.error('Error loading registration:', error);
        this.toast.error('Registration not found');
        this.goBack();
      }
    });
  }

  getStatusClass(status: ANPRStatus): string {
    return status.toLowerCase();
  }

  getVehicleIcon(vehicleType: string): string {
    const type = vehicleType.toUpperCase();
    if (type.includes('BIKE') || type.includes('MOTORCYCLE')) {
      return 'two_wheeler';
    } else if (type.includes('TRUCK') || type.includes('BUS')) {
      return 'local_shipping';
    } else if (type.includes('AUTO')) {
      return 'scooter';
    } else {
      return 'directions_car';
    }
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/anpr']);
  }
}

