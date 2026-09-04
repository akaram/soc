import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { RFIDFastagService } from '../services/rfid-fastag.service';
import {
  RFIDRegistration,
  RFIDStatus,
  TagType,
  VehicleCategory,
  RFIDStatistics,
  RFIDFilter
} from '../models/rfid-fastag.model';

@Component({
  selector: 'app-rfid-fastag-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="rfid-container">
      <div class="page-header">
        <h1><i class="material-icons">nfc</i> RFID/FASTag - Automatic Gate Opening</h1>
        <p>Manage RFID and FASTag registrations for automatic gate access</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Live data from <strong>/vehicles</strong> (RFID/FASTag tags) and <strong>/gate-hardware/events</strong> APIs — no demo records.</span>
        </div>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">nfc</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalRegistrations }}</div>
            <div class="stat-label">Total Tags</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeRegistrations }}</div>
            <div class="stat-label">Active</div>
          </div>
        </div>
        <div class="stat-card detections">
          <div class="stat-icon">
            <i class="material-icons">sensors</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.detectionsToday }}</div>
            <div class="stat-label">Detections Today</div>
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
        <div class="stat-card auto-open">
          <div class="stat-icon">
            <i class="material-icons">lock_open</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.autoOpenedGates }}</div>
            <div class="stat-label">Auto Opened</div>
          </div>
        </div>
        <div class="stat-card signal">
          <div class="stat-icon">
            <i class="material-icons">signal_cellular_alt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.averageSignalStrength.toFixed(0) }}%</div>
            <div class="stat-label">Avg Signal</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Register Tag
        </button>
        <button class="btn-secondary" (click)="openDetection()">
          <i class="material-icons">sensors</i>
          Test Tag Detection
        </button>
        <button class="btn-secondary" (click)="viewEntries()">
          <i class="material-icons">history</i>
          View Entry History
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search by tag ID, vehicle, owner..." 
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
          <select [(ngModel)]="filter.tagType" (change)="applyFilters()" class="filter-select">
            <option value="">All Tag Types</option>
            <option [value]="TagType.RFID">RFID</option>
            <option [value]="TagType.FASTAG">FASTag</option>
            <option [value]="TagType.NFC">NFC</option>
            <option [value]="TagType.BLUETOOTH">Bluetooth</option>
          </select>
          <select [(ngModel)]="filter.vehicleCategory" (change)="applyFilters()" class="filter-select">
            <option value="">All Categories</option>
            <option [value]="VehicleCategory.RESIDENT">Resident</option>
            <option [value]="VehicleCategory.STAFF">Staff</option>
            <option [value]="VehicleCategory.VISITOR">Visitor</option>
            <option [value]="VehicleCategory.VENDOR">Vendor</option>
            <option [value]="VehicleCategory.DELIVERY">Delivery</option>
            <option [value]="VehicleCategory.EMERGENCY">Emergency</option>
          </select>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="RFIDStatus.ACTIVE">Active</option>
            <option [value]="RFIDStatus.INACTIVE">Inactive</option>
            <option [value]="RFIDStatus.SUSPENDED">Suspended</option>
            <option [value]="RFIDStatus.EXPIRED">Expired</option>
            <option [value]="RFIDStatus.BLACKLISTED">Blacklisted</option>
          </select>
        </div>
      </div>

      <!-- Registrations List -->
      <div class="registrations-list" *ngIf="!isLoading && registrations.length > 0">
        <div *ngFor="let registration of registrations" class="registration-card">
          <div class="registration-card-header">
            <div class="tag-info">
              <div class="tag-icon" [ngClass]="getTagTypeClass(registration.tagType)">
                <i class="material-icons">{{ getTagTypeIcon(registration.tagType) }}</i>
              </div>
              <div class="tag-details">
                <div class="tag-id">{{ registration.tagId }}</div>
                <div class="tag-meta">
                  <span class="type-badge" [ngClass]="getCategoryClass(registration.ownerType)">
                    {{ getCategoryName(registration.ownerType) }}
                  </span>
                  <span class="tag-type-badge">{{ registration.tagType }}</span>
                  <span *ngIf="registration.autoOpen" class="auto-open-badge">
                    <i class="material-icons">lock_open</i>
                    Auto Open
                  </span>
                </div>
              </div>
            </div>
            <div class="status-badge" [ngClass]="getStatusClass(registration.status)">
              {{ getStatusName(registration.status) }}
            </div>
          </div>

          <div class="registration-card-body">
            <div class="info-grid">
              <div class="info-item">
                <label>Vehicle Number</label>
                <span class="value">{{ registration.vehicleNumber }}</span>
              </div>
              <div class="info-item">
                <label>Owner</label>
                <span class="value">{{ registration.ownerName }}</span>
              </div>
              <div class="info-item">
                <label>Phone</label>
                <span class="value">{{ registration.ownerPhone }}</span>
              </div>
              <div class="info-item" *ngIf="registration.flatNumber">
                <label>Flat</label>
                <span class="value">{{ registration.flatNumber }} <span *ngIf="registration.unitNumber">- {{ registration.unitNumber }}</span></span>
              </div>
              <div class="info-item">
                <label>Vehicle Type</label>
                <span class="value">{{ registration.vehicleType }}</span>
              </div>
              <div class="info-item" *ngIf="registration.vehicleColor">
                <label>Color</label>
                <span class="value">{{ registration.vehicleColor }}</span>
              </div>
              <div class="info-item">
                <label>Allowed Gates</label>
                <span class="value">{{ registration.allowedGates.join(', ') }}</span>
              </div>
              <div class="info-item">
                <label>Total Entries</label>
                <span class="value">{{ registration.totalEntries }}</span>
              </div>
              <div class="info-item" *ngIf="registration.lastEntryAt">
                <label>Last Entry</label>
                <span class="value">{{ formatDateTime(registration.lastEntryAt) }}</span>
              </div>
            </div>

            <div class="registration-actions">
              <button class="btn-action btn-view" (click)="viewDetails(registration)">
                <i class="material-icons">visibility</i>
                View Details
              </button>
              <button 
                class="btn-action btn-toggle" 
                *ngIf="registration.status === RFIDStatus.ACTIVE"
                (click)="suspendRegistration(registration)">
                <i class="material-icons">pause</i>
                Suspend
              </button>
              <button 
                class="btn-action btn-toggle" 
                *ngIf="registration.status === RFIDStatus.INACTIVE || registration.status === RFIDStatus.SUSPENDED"
                (click)="activateRegistration(registration)">
                <i class="material-icons">play_arrow</i>
                Activate
              </button>
              <button class="btn-action btn-delete" (click)="deleteRegistration(registration)">
                <i class="material-icons">delete</i>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!isLoading && registrations.length === 0">
        <i class="material-icons">nfc</i>
        <h3>No RFID/FASTag Registrations Found</h3>
        <p *ngIf="!loadError">No vehicles with RFID or FASTag tags are registered for this society yet. Register a tag or issue tags via User Management → Vehicle Registration.</p>
        <p class="error-text" *ngIf="loadError">{{ loadError }}</p>
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Register Tag
        </button>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading registrations...</p>
      </div>
    </div>
  `,
  styles: [`
    .rfid-container {
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

    .api-banner {
      margin-top: 12px;
      padding: 10px 14px;
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 8px;
      color: #2e7d32;
      font-size: 13px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .api-banner .material-icons {
      font-size: 18px;
      flex-shrink: 0;
    }

    .error-text {
      color: #c0392b;
      font-weight: 500;
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

    .stat-card.detections .stat-icon {
      background: #17a2b8;
    }

    .stat-card.success .stat-icon {
      background: #43e97b;
    }

    .stat-card.auto-open .stat-icon {
      background: #ffc107;
    }

    .stat-card.signal .stat-icon {
      background: #f5576c;
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

    .registrations-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .registration-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .registration-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .registration-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .tag-info {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .tag-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }

    .tag-icon.rfid {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .tag-icon.fastag {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .tag-icon.nfc {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .tag-icon.bluetooth {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }

    .tag-details {
      flex: 1;
    }

    .tag-id {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .tag-meta {
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

    .type-badge.vendor {
      background: #f8d7da;
      color: #721c24;
    }

    .type-badge.delivery {
      background: #e2e3e5;
      color: #383d41;
    }

    .type-badge.emergency {
      background: #f5c6cb;
      color: #721c24;
    }

    .tag-type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #e9ecef;
      color: #495057;
    }

    .auto-open-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #d4edda;
      color: #155724;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .auto-open-badge .material-icons {
      font-size: 16px;
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

    .status-badge.blacklisted {
      background: #721c24;
      color: white;
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

    .registration-actions {
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
      .rfid-container {
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
export class RFIDFastagListComponent implements OnInit {
  registrations: RFIDRegistration[] = [];
  statistics: RFIDStatistics | null = null;
  isLoading = false;
  loadError = '';
  filter: RFIDFilter = {};

  RFIDStatus = RFIDStatus;
  TagType = TagType;
  VehicleCategory = VehicleCategory;

  constructor(
    private rfidService: RFIDFastagService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.loadError = '';

    const societyId = localStorage.getItem('societyId') ||
      (() => {
        try {
          const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
          return raw ? JSON.parse(raw).societyId : '';
        } catch { return ''; }
      })();

    if (!societyId) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.registrations = [];
      this.statistics = null;
      return;
    }

    this.rfidService.getAllRegistrations(this.filter).subscribe({
      next: (registrations) => {
        this.registrations = registrations;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading registrations:', error);
        this.loadError = 'Failed to load tags from the API. Ensure the backend is running.';
        this.isLoading = false;
      }
    });

    this.rfidService.getStatistics().subscribe({
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
    this.router.navigate(['/admin/gate-security/rfid-fastag/add']);
  }

  openDetection(): void {
    this.router.navigate(['/admin/gate-security/rfid-fastag/detect']);
  }

  viewEntries(): void {
    this.router.navigate(['/admin/gate-security/rfid-fastag/entries']);
  }

  viewDetails(registration: RFIDRegistration): void {
    this.router.navigate(['/admin/gate-security/rfid-fastag', registration.id]);
  }

  activateRegistration(registration: RFIDRegistration): void {
    if (confirm(`Activate RFID/FASTag for ${registration.tagId}?`)) {
      this.rfidService.updateRegistrationStatus(registration.id, RFIDStatus.ACTIVE).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Registration activated successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to activate registration');
          }
        },
        error: (error) => {
          console.error('Error activating registration:', error);
          alert('An error occurred while activating registration');
        }
      });
    }
  }

  suspendRegistration(registration: RFIDRegistration): void {
    if (confirm(`Suspend RFID/FASTag for ${registration.tagId}?`)) {
      this.rfidService.updateRegistrationStatus(registration.id, RFIDStatus.SUSPENDED).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Registration suspended successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to suspend registration');
          }
        },
        error: (error) => {
          console.error('Error suspending registration:', error);
          alert('An error occurred while suspending registration');
        }
      });
    }
  }

  deleteRegistration(registration: RFIDRegistration): void {
    if (confirm(`Delete RFID/FASTag registration for ${registration.tagId}? This action cannot be undone.`)) {
      this.rfidService.deleteRegistration(registration.id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Registration deleted successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to delete registration');
          }
        },
        error: (error) => {
          console.error('Error deleting registration:', error);
          alert('An error occurred while deleting registration');
        }
      });
    }
  }

  getCategoryName(category: VehicleCategory): string {
    return category.replace('_', ' ');
  }

  getCategoryClass(category: VehicleCategory): string {
    return category.toLowerCase().replace('_', '-');
  }

  getStatusName(status: RFIDStatus): string {
    return status;
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
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

