import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  CabTaxiEntry,
  VehicleType,
  EntryStatus,
  CabTaxiEntryStatistics,
  CabTaxiEntryFilter
} from '../models/cab-taxi-entry.model';

@Component({
  selector: 'app-cab-taxi-entry-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="cab-taxi-entry-container">
      <div class="page-header">
        <h1><i class="material-icons">local_taxi</i> Cab/Taxi Entry Management</h1>
        <p>Manage cab and taxi entries with OTP verification</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">directions_car</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalToday }}</div>
            <div class="stat-label">Total Today</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.pending }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card otp-sent">
          <div class="stat-icon">
            <i class="material-icons">sms</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.otpSent }}</div>
            <div class="stat-label">OTP Sent</div>
          </div>
        </div>
        <div class="stat-card verified">
          <div class="stat-icon">
            <i class="material-icons">verified</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.otpVerified }}</div>
            <div class="stat-label">OTP Verified</div>
          </div>
        </div>
        <div class="stat-card entered">
          <div class="stat-icon">
            <i class="material-icons">login</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.entered }}</div>
            <div class="stat-label">Entered</div>
          </div>
        </div>
        <div class="stat-card exited">
          <div class="stat-icon">
            <i class="material-icons">logout</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.exited }}</div>
            <div class="stat-label">Exited</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="openCreateForm()">
          <i class="material-icons">add</i>
          New Entry
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search by vehicle number, driver, passenger..." 
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
          <select [(ngModel)]="filter.entryType" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="VehicleType.CAB">Cab</option>
            <option [value]="VehicleType.TAXI">Taxi</option>
            <option [value]="VehicleType.AUTO_RICKSHAW">Auto Rickshaw</option>
            <option [value]="VehicleType.PRIVATE_CAR">Private Car</option>
            <option [value]="VehicleType.OTHER">Other</option>
          </select>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="EntryStatus.PENDING">Pending</option>
            <option [value]="EntryStatus.OTP_SENT">OTP Sent</option>
            <option [value]="EntryStatus.OTP_VERIFIED">OTP Verified</option>
            <option [value]="EntryStatus.ENTRY_APPROVED">Approved</option>
            <option [value]="EntryStatus.ENTERED">Entered</option>
            <option [value]="EntryStatus.EXITED">Exited</option>
          </select>
        </div>
      </div>

      <!-- Entries List -->
      <div class="entries-list" *ngIf="!isLoading && entries.length > 0">
        <div *ngFor="let entry of entries" class="entry-card" [ngClass]="getStatusClass(entry.status)">
          <div class="entry-card-header">
            <div class="vehicle-info">
              <div class="vehicle-type-badge" [ngClass]="getTypeClass(entry.entryType)">
                <i class="material-icons">{{ getTypeIcon(entry.entryType) }}</i>
                <span>{{ getTypeName(entry.entryType) }}</span>
              </div>
              <div class="vehicle-number">{{ entry.vehicleNumber }}</div>
            </div>
            <div class="status-badge" [ngClass]="getStatusClass(entry.status)">
              {{ getStatusName(entry.status) }}
            </div>
          </div>

          <div class="entry-card-body">
            <div class="info-row">
              <div class="info-item">
                <label>Driver</label>
                <span class="value">{{ entry.driverName }}</span>
                <span class="phone">{{ entry.driverPhone }}</span>
              </div>
              <div class="info-item">
                <label>Passenger</label>
                <span class="value">{{ entry.passengerName }}</span>
                <span class="phone">{{ entry.passengerPhone }}</span>
              </div>
            </div>

            <div class="info-row">
              <div class="info-item">
                <label>Visiting</label>
                <span class="value">{{ entry.visitingFlat }} <span *ngIf="entry.visitingUnit">- {{ entry.visitingUnit }}</span></span>
              </div>
              <div class="info-item">
                <label>Purpose</label>
                <span class="value">{{ entry.purpose }}</span>
              </div>
            </div>

            <div class="otp-info" *ngIf="entry.otpCode || entry.otpVerified">
              <div class="otp-status" *ngIf="entry.otpVerified">
                <i class="material-icons">check_circle</i>
                <span>OTP Verified</span>
                <span class="time" *ngIf="entry.otpVerifiedAt">{{ formatTime(entry.otpVerifiedAt) }}</span>
              </div>
              <div class="otp-status pending" *ngIf="!entry.otpVerified && entry.otpCode">
                <i class="material-icons">schedule</i>
                <span>OTP Sent - Waiting for verification</span>
                <span class="time" *ngIf="entry.otpExpiresAt">Expires: {{ formatTime(entry.otpExpiresAt) }}</span>
              </div>
            </div>

            <div class="entry-actions">
              <button 
                class="btn-action btn-otp" 
                *ngIf="entry.status === EntryStatus.PENDING"
                (click)="sendOtp(entry)">
                <i class="material-icons">sms</i>
                Send OTP
              </button>
              <button 
                class="btn-action btn-verify" 
                *ngIf="entry.status === EntryStatus.OTP_SENT"
                (click)="verifyOtp(entry)">
                <i class="material-icons">verified</i>
                Verify OTP
              </button>
              <button 
                class="btn-action btn-approve" 
                *ngIf="entry.status === EntryStatus.OTP_VERIFIED && entry.requiresApproval"
                (click)="approveEntry(entry)">
                <i class="material-icons">check_circle</i>
                Approve Entry
              </button>
              <button 
                class="btn-action btn-enter" 
                *ngIf="entry.status === EntryStatus.ENTRY_APPROVED"
                (click)="recordEntry(entry)">
                <i class="material-icons">login</i>
                Record Entry
              </button>
              <button 
                class="btn-action btn-exit" 
                *ngIf="entry.status === EntryStatus.ENTERED"
                (click)="recordExit(entry)">
                <i class="material-icons">logout</i>
                Record Exit
              </button>
              <button 
                class="btn-action btn-view" 
                (click)="viewDetails(entry)">
                <i class="material-icons">visibility</i>
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!isLoading && entries.length === 0">
        <i class="material-icons">directions_car</i>
        <h3>No Cab/Taxi Entries</h3>
        <p>No entries found matching your filters</p>
        <button class="btn-primary" (click)="openCreateForm()">
          <i class="material-icons">add</i>
          Create New Entry
        </button>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading entries...</p>
      </div>
    </div>
  `,
  styles: [`
    .cab-taxi-entry-container {
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

    .stat-card.pending .stat-icon {
      background: #ffc107;
    }

    .stat-card.otp-sent .stat-icon {
      background: #17a2b8;
    }

    .stat-card.verified .stat-icon {
      background: #28a745;
    }

    .stat-card.entered .stat-icon {
      background: #43e97b;
    }

    .stat-card.exited .stat-icon {
      background: #6c757d;
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

    .btn-primary {
      padding: 12px 24px;
      background: #667eea;
      color: white;
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

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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

    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .entry-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.2s;
    }

    .entry-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .entry-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .vehicle-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .vehicle-type-badge {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      color: white;
    }

    .vehicle-type-badge.cab {
      background: #667eea;
    }

    .vehicle-type-badge.taxi {
      background: #f5576c;
    }

    .vehicle-type-badge.auto-rickshaw {
      background: #43e97b;
    }

    .vehicle-type-badge.private-car {
      background: #764ba2;
    }

    .vehicle-type-badge.other {
      background: #7f8c8d;
    }

    .vehicle-number {
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.otp-sent {
      background: #cce5ff;
      color: #004085;
    }

    .status-badge.otp-verified {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.entry-approved {
      background: #d1ecf1;
      color: #0c5460;
    }

    .status-badge.entered {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.exited {
      background: #e2e3e5;
      color: #383d41;
    }

    .entry-card-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
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

    .info-item .phone {
      font-size: 13px;
      color: #667eea;
    }

    .otp-info {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .otp-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #28a745;
      font-weight: 500;
    }

    .otp-status.pending {
      color: #ffc107;
    }

    .otp-status .time {
      font-size: 12px;
      color: #7f8c8d;
      margin-left: auto;
    }

    .entry-actions {
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

    .btn-otp {
      background: #17a2b8;
      color: white;
    }

    .btn-verify {
      background: #28a745;
      color: white;
    }

    .btn-approve {
      background: #667eea;
      color: white;
    }

    .btn-enter {
      background: #43e97b;
      color: white;
    }

    .btn-exit {
      background: #6c757d;
      color: white;
    }

    .btn-view {
      background: #f5f5f5;
      color: #2c3e50;
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
      .cab-taxi-entry-container {
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
export class CabTaxiEntryListComponent implements OnInit {
  entries: CabTaxiEntry[] = [];
  statistics: CabTaxiEntryStatistics | null = null;
  isLoading = false;
  filter: CabTaxiEntryFilter = {};

  VehicleType = VehicleType;
  EntryStatus = EntryStatus;

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.visitorService.getAllCabTaxiEntries(this.filter).subscribe({
      next: (entries) => {
        this.entries = entries;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading entries:', error);
        this.isLoading = false;
      }
    });

    this.visitorService.getCabTaxiEntryStatistics().subscribe({
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

  openCreateForm(): void {
    this.router.navigate(['/admin/visitors/cab-taxi/add']);
  }

  sendOtp(entry: CabTaxiEntry): void {
    if (confirm(`Send OTP to ${entry.driverPhone}?`)) {
      this.visitorService.sendOtpForCabTaxiEntry({
        entryId: entry.id,
        phoneNumber: entry.driverPhone
      }).subscribe({
        next: (response) => {
          if (response.success) {
            alert(`OTP sent successfully! ${response.otpCode ? `OTP: ${response.otpCode}` : ''}`);
            this.loadData();
          } else {
            alert(response.message || 'Failed to send OTP');
          }
        },
        error: (error) => {
          console.error('Error sending OTP:', error);
          alert('An error occurred while sending OTP');
        }
      });
    }
  }

  verifyOtp(entry: CabTaxiEntry): void {
    const otpCode = prompt('Enter OTP code:');
    if (otpCode) {
      this.visitorService.verifyOtpForCabTaxiEntry({
        entryId: entry.id,
        otpCode: otpCode,
        phoneNumber: entry.driverPhone
      }).subscribe({
        next: (response) => {
          if (response.success) {
            alert('OTP verified successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to verify OTP');
          }
        },
        error: (error) => {
          console.error('Error verifying OTP:', error);
          alert('An error occurred while verifying OTP');
        }
      });
    }
  }

  approveEntry(entry: CabTaxiEntry): void {
    if (confirm('Approve this entry?')) {
      this.visitorService.approveCabTaxiEntry(entry.id, 'ADMIN-001').subscribe({
        next: (response) => {
          if (response.success) {
            alert('Entry approved successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to approve entry');
          }
        },
        error: (error) => {
          console.error('Error approving entry:', error);
          alert('An error occurred while approving entry');
        }
      });
    }
  }

  recordEntry(entry: CabTaxiEntry): void {
    if (confirm('Record vehicle entry?')) {
      this.visitorService.recordCabTaxiEntry(entry.id, 'Main Gate').subscribe({
        next: (response) => {
          if (response.success) {
            alert('Entry recorded successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to record entry');
          }
        },
        error: (error) => {
          console.error('Error recording entry:', error);
          alert('An error occurred while recording entry');
        }
      });
    }
  }

  recordExit(entry: CabTaxiEntry): void {
    if (confirm('Record vehicle exit?')) {
      this.visitorService.recordCabTaxiExit(entry.id, 'Main Gate').subscribe({
        next: (response) => {
          if (response.success) {
            alert('Exit recorded successfully!');
            this.loadData();
          } else {
            alert(response.message || 'Failed to record exit');
          }
        },
        error: (error) => {
          console.error('Error recording exit:', error);
          alert('An error occurred while recording exit');
        }
      });
    }
  }

  viewDetails(entry: CabTaxiEntry): void {
    this.router.navigate(['/admin/visitors/cab-taxi', entry.id]);
  }

  getTypeName(type: VehicleType): string {
    return type.replace('_', ' ');
  }

  getTypeIcon(type: VehicleType): string {
    switch (type) {
      case VehicleType.CAB:
      case VehicleType.TAXI:
        return 'local_taxi';
      case VehicleType.AUTO_RICKSHAW:
        return 'two_wheeler';
      case VehicleType.PRIVATE_CAR:
        return 'directions_car';
      default:
        return 'directions_car';
    }
  }

  getTypeClass(type: VehicleType): string {
    return type.toLowerCase().replace('_', '-');
  }

  getStatusName(status: EntryStatus): string {
    return status.replace(/_/g, ' ');
  }

  getStatusClass(status: EntryStatus): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  formatTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}
