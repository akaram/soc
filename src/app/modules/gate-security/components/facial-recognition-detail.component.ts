import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FacialRecognitionService } from '../services/facial-recognition.service';
import { FacialProfile, RecognitionStatus } from '../models/facial-recognition.model';

@Component({
  selector: 'app-facial-recognition-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="facial-detail-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <h1><i class="material-icons">face</i> Face Profile Details</h1>
      </div>

      <div class="detail-card" *ngIf="profile">
        <div class="detail-header">
          <div class="profile-avatar-large">
            <i class="material-icons">face</i>
          </div>
          <div class="profile-title">
            <div class="profile-name-large">{{ profile.personName }}</div>
            <div class="status-badge" [ngClass]="getStatusClass(profile.status)">
              {{ profile.status }}
            </div>
          </div>
        </div>

        <div class="detail-sections">
          <div class="detail-section">
            <h3>Person Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Phone</label>
                <span class="value">{{ profile.phone }}</span>
              </div>
              <div class="info-item" *ngIf="profile.email">
                <label>Email</label>
                <span class="value">{{ profile.email }}</span>
              </div>
              <div class="info-item">
                <label>Person Type</label>
                <span class="value">{{ profile.personType }}</span>
              </div>
              <div class="info-item" *ngIf="profile.flatNumber">
                <label>Flat Number</label>
                <span class="value">{{ profile.flatNumber }} <span *ngIf="profile.unitNumber">- {{ profile.unitNumber }}</span></span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Facial Recognition Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Face ID</label>
                <span class="value">{{ profile.faceId }}</span>
              </div>
              <div class="info-item">
                <label>Confidence Threshold</label>
                <span class="value">{{ profile.confidenceThreshold }}%</span>
              </div>
              <div class="info-item">
                <label>Access Level</label>
                <span class="value">{{ profile.accessLevel }}</span>
              </div>
              <div class="info-item">
                <label>Allowed Gates</label>
                <span class="value">{{ profile.allowedGates.join(', ') }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Entry Statistics</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>Total Entries</label>
                <span class="value">{{ profile.totalEntries }}</span>
              </div>
              <div class="info-item">
                <label>Failed Attempts</label>
                <span class="value">{{ profile.failedAttempts }}</span>
              </div>
              <div class="info-item" *ngIf="profile.lastEntryAt">
                <label>Last Entry</label>
                <span class="value">{{ formatDateTime(profile.lastEntryAt) }}</span>
              </div>
              <div class="info-item" *ngIf="profile.lastVerifiedAt">
                <label>Last Verified</label>
                <span class="value">{{ formatDateTime(profile.lastVerifiedAt) }}</span>
              </div>
              <div class="info-item">
                <label>Registered At</label>
                <span class="value">{{ formatDateTime(profile.registeredAt) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section" *ngIf="profile.notes">
            <h3>Notes</h3>
            <p class="notes-text">{{ profile.notes }}</p>
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn-secondary" (click)="goBack()">
            <i class="material-icons">arrow_back</i>
            Back to List
          </button>
        </div>
      </div>

      <div class="loading-state" *ngIf="!profile">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading profile details...</p>
      </div>
    </div>
  `,
  styles: [`
    .facial-detail-container {
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

    .profile-avatar-large {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }

    .profile-title {
      flex: 1;
    }

    .profile-name-large {
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
export class FacialRecognitionDetailComponent implements OnInit {
  profile: FacialProfile | null = null;

  RecognitionStatus = RecognitionStatus;

  constructor(
    private facialService: FacialRecognitionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProfile(id);
    }
  }

  loadProfile(id: string): void {
    this.facialService.getProfileById(id).subscribe({
      next: (profile) => {
        this.profile = profile;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        alert('Profile not found');
        this.goBack();
      }
    });
  }

  getStatusClass(status: RecognitionStatus): string {
    return status.toLowerCase();
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
    this.router.navigate(['/admin/gate-security/facial-recognition']);
  }
}

