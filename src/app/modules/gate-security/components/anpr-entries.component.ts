import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ANPRService } from '../services/anpr.service';
import { ANPREntry, EntryStatus, VehicleCategory } from '../models/anpr.model';

@Component({
  selector: 'app-anpr-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="anpr-entries-container">
      <div class="page-header">
        <h1><i class="material-icons">history</i> ANPR Entry History</h1>
        <p>View all vehicle entry and exit records from ANPR system</p>
      </div>

      <div class="filters-bar">
        <select [(ngModel)]="selectedGate" (change)="applyFilters()" class="filter-select">
          <option value="">All Gates</option>
          <option value="MAIN_GATE">Main Gate</option>
          <option value="SIDE_GATE">Side Gate</option>
          <option value="PARKING_GATE">Parking Gate</option>
          <option value="EMERGENCY_GATE">Emergency Gate</option>
        </select>
        <select [(ngModel)]="selectedStatus" (change)="applyFilters()" class="filter-select">
          <option value="">All Status</option>
          <option [value]="EntryStatus.ALLOWED">Allowed</option>
          <option [value]="EntryStatus.DENIED">Denied</option>
          <option [value]="EntryStatus.PENDING_APPROVAL">Pending Approval</option>
        </select>
        <button class="btn-secondary" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to List
        </button>
      </div>

      <div class="entries-list" *ngIf="!isLoading && entries.length > 0">
        <div *ngFor="let entry of entries" class="entry-card" [ngClass]="getStatusClass(entry.status)">
          <div class="entry-header">
            <div class="entry-info">
              <div class="vehicle-number">{{ entry.vehicleNumber }}</div>
              <div class="entry-meta">
                <span class="entry-type">{{ entry.entryType }}</span>
                <span class="entry-time">{{ formatDateTime(entry.timestamp) }}</span>
              </div>
            </div>
            <div class="status-badge" [ngClass]="getStatusClass(entry.status)">
              {{ entry.status }}
            </div>
          </div>

          <div class="entry-details">
            <div class="detail-grid">
              <div class="detail-item">
                <label>Gate</label>
                <span class="value">{{ entry.gateName }}</span>
              </div>
              <div class="detail-item">
                <label>Confidence</label>
                <span class="value">{{ entry.confidence.toFixed(1) }}%</span>
              </div>
              <div class="detail-item" *ngIf="entry.vehicleRegistration">
                <label>Owner</label>
                <span class="value">{{ entry.vehicleRegistration.ownerName }}</span>
              </div>
              <div class="detail-item">
                <label>Category</label>
                <span class="value">{{ getCategoryName(entry.vehicleCategory) }}</span>
              </div>
              <div class="detail-item">
                <label>Method</label>
                <span class="value">{{ entry.recognitionMethod }}</span>
              </div>
              <div class="detail-item" *ngIf="entry.rejectionReason">
                <label>Reason</label>
                <span class="value error">{{ entry.rejectionReason }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!isLoading && entries.length === 0">
        <i class="material-icons">history</i>
        <h3>No Entry Records Found</h3>
        <p>No entries match your filters</p>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading entries...</p>
      </div>
    </div>
  `,
  styles: [`
    .anpr-entries-container {
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

    .filters-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      align-items: center;
    }

    .filter-select {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
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
      margin-left: auto;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
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
      border-left: 4px solid;
    }

    .entry-card.allowed {
      border-left-color: #28a745;
    }

    .entry-card.denied {
      border-left-color: #dc3545;
    }

    .entry-card.pending-approval {
      border-left-color: #ffc107;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .vehicle-number {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .entry-meta {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .entry-type {
      text-transform: uppercase;
      font-weight: 600;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.allowed {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.denied {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.pending-approval {
      background: #fff3cd;
      color: #856404;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item label {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .detail-item .value {
      font-size: 15px;
      color: #2c3e50;
      font-weight: 500;
    }

    .detail-item .value.error {
      color: #dc3545;
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
      margin: 0;
      color: #7f8c8d;
    }
  `]
})
export class ANPREntriesComponent implements OnInit {
  entries: ANPREntry[] = [];
  isLoading = false;
  selectedGate = '';
  selectedStatus = '';

  EntryStatus = EntryStatus;
  VehicleCategory = VehicleCategory;

  constructor(
    private anprService: ANPRService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries(): void {
    this.isLoading = true;
    const filter: any = {};
    if (this.selectedGate) filter.gateId = this.selectedGate;
    if (this.selectedStatus) filter.status = this.selectedStatus;

    this.anprService.getAllEntries(filter).subscribe({
      next: (entries) => {
        this.entries = entries;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading entries:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadEntries();
  }

  getStatusClass(status: EntryStatus): string {
    return status.toLowerCase().replace('_', '-');
  }

  getCategoryName(category: VehicleCategory): string {
    return category.replace('_', ' ');
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

