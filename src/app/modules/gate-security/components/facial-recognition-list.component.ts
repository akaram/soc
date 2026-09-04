import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FacialRecognitionService } from '../services/facial-recognition.service';
import {
  FacialProfile,
  RecognitionStatus,
  EntryType,
  FacialRecognitionStatistics,
  FacialRecognitionFilter
} from '../models/facial-recognition.model';

@Component({
  selector: 'app-facial-recognition-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="facial-recognition-container">
      <div class="page-header">
        <h1><i class="material-icons">face</i> Facial Recognition for Touchless Entry</h1>
        <p>Manage facial recognition profiles for touchless gate access</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">people</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalProfiles }}</div>
            <div class="stat-label">Total Profiles</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeProfiles }}</div>
            <div class="stat-label">Active Profiles</div>
          </div>
        </div>
        <div class="stat-card entries">
          <div class="stat-icon">
            <i class="material-icons">login</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.entriesToday }}</div>
            <div class="stat-label">Entries Today</div>
          </div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">
            <i class="material-icons">verified</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.successfulEntries }}</div>
            <div class="stat-label">Successful</div>
          </div>
        </div>
        <div class="stat-card confidence">
          <div class="stat-icon">
            <i class="material-icons">trending_up</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.averageConfidence.toFixed(1) }}%</div>
            <div class="stat-label">Avg Confidence</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Register New Face
        </button>
        <button class="btn-secondary" (click)="openVerification()">
          <i class="material-icons">camera_alt</i>
          Test Face Recognition
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search by name, phone, flat..." 
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
          <select [(ngModel)]="filter.personType" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="EntryType.RESIDENT">Resident</option>
            <option [value]="EntryType.STAFF">Staff</option>
            <option [value]="EntryType.VISITOR">Visitor</option>
            <option [value]="EntryType.DOMESTIC_HELP">Domestic Help</option>
            <option [value]="EntryType.VENDOR">Vendor</option>
          </select>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="RecognitionStatus.ACTIVE">Active</option>
            <option [value]="RecognitionStatus.INACTIVE">Inactive</option>
            <option [value]="RecognitionStatus.SUSPENDED">Suspended</option>
            <option [value]="RecognitionStatus.EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      <!-- Profiles List -->
      <div class="profiles-list" *ngIf="!isLoading && profiles.length > 0">
        <div *ngFor="let profile of profiles" class="profile-card">
          <div class="profile-card-header">
            <div class="profile-avatar">
              <i class="material-icons">face</i>
            </div>
            <div class="profile-info">
              <div class="profile-name">{{ profile.personName }}</div>
              <div class="profile-meta">
                <span class="type-badge" [ngClass]="getTypeClass(profile.personType)">
                  {{ getTypeName(profile.personType) }}
                </span>
                <span *ngIf="profile.flatNumber" class="flat-info">
                  <i class="material-icons">home</i>
                  {{ profile.flatNumber }} <span *ngIf="profile.unitNumber">- {{ profile.unitNumber }}</span>
                </span>
              </div>
            </div>
            <div class="status-badge" [ngClass]="getStatusClass(profile.status)">
              {{ getStatusName(profile.status) }}
            </div>
          </div>

          <div class="profile-card-body">
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
              <div class="info-item">
                <label>Total Entries</label>
                <span class="value">{{ profile.totalEntries }}</span>
              </div>
              <div class="info-item" *ngIf="profile.lastEntryAt">
                <label>Last Entry</label>
                <span class="value">{{ formatDateTime(profile.lastEntryAt) }}</span>
              </div>
            </div>

            <div class="profile-actions">
              <button class="btn-action btn-view" (click)="viewDetails(profile)">
                <i class="material-icons">visibility</i>
                View Details
              </button>
              <button 
                class="btn-action btn-toggle" 
                *ngIf="profile.status === RecognitionStatus.ACTIVE"
                (click)="suspendProfile(profile)">
                <i class="material-icons">pause</i>
                Suspend
              </button>
              <button 
                class="btn-action btn-toggle" 
                *ngIf="profile.status === RecognitionStatus.INACTIVE || profile.status === RecognitionStatus.SUSPENDED"
                (click)="activateProfile(profile)">
                <i class="material-icons">play_arrow</i>
                Activate
              </button>
              <button class="btn-action btn-delete" (click)="deleteProfile(profile)">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!isLoading && profiles.length === 0">
        <i class="material-icons">face</i>
        <h3>No Facial Profiles Found</h3>
        <p>No profiles match your filters</p>
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Register New Face
        </button>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading profiles...</p>
      </div>
    </div>
  `,
  styles: [`
    .facial-recognition-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card.active .stat-icon {
      background: #28a745;
    }

    .stat-card.entries .stat-icon {
      background: #17a2b8;
    }

    .stat-card.success .stat-icon {
      background: #43e97b;
    }

    .stat-card.confidence .stat-icon {
      background: #ffc107;
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
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .actions-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      align-items: center;
    }

    .btn-primary,
    .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .search-filter {
      display: flex;
      gap: 12px;
      flex: 1;
      min-width: 300px;
    }

    .search-input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .filter-select {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .profiles-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .profile-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .profile-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .profile-card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .profile-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
    }

    .profile-info {
      flex: 1;
    }

    .profile-name {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .profile-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-badge.resident {
      background: #d4edda;
      color: #155724;
    }

    .type-badge.staff {
      background: #cce5ff;
      color: #004085;
    }

    .type-badge.visitor {
      background: #fff3cd;
      color: #856404;
    }

    .type-badge.domestic-help {
      background: #e2e3e5;
      color: #383d41;
    }

    .type-badge.vendor {
      background: #f8d7da;
      color: #721c24;
    }

    .flat-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .status-badge {
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

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item label {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .info-item .value {
      font-size: 15px;
      color: #2c3e50;
      font-weight: 500;
    }

    .profile-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-action {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-view {
      background: #667eea;
      color: white;
    }

    .btn-toggle {
      background: #ffc107;
      color: #2c3e50;
    }

    .btn-delete {
      background: #dc3545;
      color: white;
    }

    .btn-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
      margin: 0 0 24px 0;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .facial-recognition-container {
        padding: 16px;
      }

      .statistics-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .search-filter {
        flex-direction: column;
      }
    }
  `]
})
export class FacialRecognitionListComponent implements OnInit {
  profiles: FacialProfile[] = [];
  statistics: FacialRecognitionStatistics | null = null;
  isLoading = false;
  filter: FacialRecognitionFilter = {};

  RecognitionStatus = RecognitionStatus;
  EntryType = EntryType;

  constructor(
    private facialService: FacialRecognitionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.facialService.getAllProfiles(this.filter).subscribe({
      next: (profiles) => {
        this.profiles = profiles;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profiles:', error);
        this.isLoading = false;
      }
    });

    this.facialService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  applyFilters(): void {
    this.loadData();
  }

  openAddForm(): void {
    this.router.navigate(['/admin/gate-security/facial-recognition/add']);
  }

  openVerification(): void {
    this.router.navigate(['/admin/gate-security/facial-recognition/verify']);
  }

  viewDetails(profile: FacialProfile): void {
    this.router.navigate(['/admin/gate-security/facial-recognition', profile.id]);
  }

  activateProfile(profile: FacialProfile): void {
    if (confirm(`Activate facial recognition for ${profile.personName}?`)) {
      this.facialService.updateProfileStatus(profile.id, RecognitionStatus.ACTIVE).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Profile activated successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to activate profile');
          }
        },
        error: (error) => {
          console.error('Error activating profile:', error);
          alert('An error occurred while activating profile');
        }
      });
    }
  }

  suspendProfile(profile: FacialProfile): void {
    if (confirm(`Suspend facial recognition for ${profile.personName}?`)) {
      this.facialService.updateProfileStatus(profile.id, RecognitionStatus.SUSPENDED).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Profile suspended successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to suspend profile');
          }
        },
        error: (error) => {
          console.error('Error suspending profile:', error);
          alert('An error occurred while suspending profile');
        }
      });
    }
  }

  deleteProfile(profile: FacialProfile): void {
    if (confirm(`Delete facial recognition profile for ${profile.personName}? This action cannot be undone.`)) {
      this.facialService.deleteProfile(profile.id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Profile deleted successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to delete profile');
          }
        },
        error: (error) => {
          console.error('Error deleting profile:', error);
          alert('An error occurred while deleting profile');
        }
      });
    }
  }

  getTypeName(type: EntryType): string {
    return type.replace('_', ' ');
  }

  getTypeClass(type: EntryType): string {
    return type.toLowerCase().replace('_', '-');
  }

  getStatusName(status: RecognitionStatus): string {
    return status;
  }

  getStatusClass(status: RecognitionStatus): string {
    return status.toLowerCase();
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

