import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { RFIDFastagService } from '../services/rfid-fastag.service';
import { RFIDRegistration, RFIDStatus, TagType } from '../models/rfid-fastag.model';

@Component({
  selector: 'app-rfid-fastag-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="rfid-detail-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <h1><i class="material-icons">nfc</i> Tag Registration Details</h1>
      </div>

      <div class="detail-card" *ngIf="registration">
        <div class="detail-header">
          <div class="tag-icon-large" [ngClass]="getTagTypeClass(registration.tagType)">
            <i class="material-icons">{{ getTagTypeIcon(registration.tagType) }}</i>
          </div>
          <div class="tag-title">
            <div class="tag-id-large">{{ registration.tagId }}</div>
            <div class="status-badge" [ngClass]="getStatusClass(registration.status)">
              {{ registration.status }}
            </div>
          </div>
        </div>

        <div class="detail-sections">
          <div class="detail-section">
            <h3>Tag Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Tag ID</label>
                <span class="value">{{ registration.tagId }}</span>
              </div>
              <div class="info-item">
                <label>Tag Type</label>
                <span class="value">{{ registration.tagType }}</span>
              </div>
              <div class="info-item">
                <label>Auto Open</label>
                <span class="value" [ngClass]="registration.autoOpen ? 'badge-success' : 'badge-info'">
                  {{ registration.autoOpen ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div class="info-item">
                <label>Requires Approval</label>
                <span class="value" [ngClass]="registration.requiresApproval ? 'badge-warning' : 'badge-success'">
                  {{ registration.requiresApproval ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Vehicle Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Vehicle Number</label>
                <span class="value">{{ registration.vehicleNumber }}</span>
              </div>
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
            <h3>Access Configuration</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Allowed Gates</label>
                <span class="value">{{ registration.allowedGates.join(', ') }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Entry Statistics</h3>
            <div class="info-grid">
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
              <div class="info-item">
                <label>Registered At</label>
                <span class="value">{{ formatDateTime(registration.registeredAt) }}</span>
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
    .rfid-detail-container {
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

    .tag-icon-large {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      color: white;
    }

    .tag-icon-large.rfid {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .tag-icon-large.fastag {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .tag-icon-large.nfc {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .tag-icon-large.bluetooth {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }

    .tag-title {
      flex: 1;
    }

    .tag-id-large {
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

    .status-badge.expired {
      background: #fff3cd;
      color: #856404;
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

    .badge-success {
      background: #d4edda;
      color: #155724;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      display: inline-block;
    }

    .badge-info {
      background: #e2e3e5;
      color: #383d41;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      display: inline-block;
    }

    .badge-warning {
      background: #fff3cd;
      color: #856404;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      display: inline-block;
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
export class RFIDFastagDetailComponent implements OnInit {
  registration: RFIDRegistration | null = null;

  RFIDStatus = RFIDStatus;
  TagType = TagType;

  constructor(
    private rfidService: RFIDFastagService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRegistration(id);
    }
  }

  loadRegistration(id: string): void {
    this.rfidService.getRegistrationById(id).subscribe({
      next: (registration) => {
        this.registration = registration;
      },
      error: (error) => {
        console.error('Error loading registration:', error);
        alert('Registration not found');
        this.goBack();
      }
    });
  }

  getStatusClass(status: RFIDStatus): string {
    return status.toLowerCase();
  }

  getTagTypeIcon(tagType: TagType): string {
    switch (tagType) {
      case TagType.RFID:
        return 'nfc';
      case TagType.FASTAG:
        return 'local_shipping';
      case TagType.NFC:
        return 'contactless';
      case TagType.BLUETOOTH:
        return 'bluetooth';
      default:
        return 'nfc';
    }
  }

  getTagTypeClass(tagType: TagType): string {
    return tagType.toLowerCase();
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
    this.router.navigate(['/admin/gate-security/rfid-fastag']);
  }
}

