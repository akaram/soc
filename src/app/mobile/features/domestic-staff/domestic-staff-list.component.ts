import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomesticStaffService } from './services/domestic-staff.service';
import { DomesticStaff, StaffRole, StaffStatus } from './models/domestic-staff.model';

@Component({
  selector: 'app-domestic-staff-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="domestic-staff-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Domestic Staff</h1>
        <button class="add-btn" (click)="addStaff()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <!-- Search and Filter -->
      <div class="search-filter-section">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            placeholder="Search by name or role..." 
            [(ngModel)]="searchTerm"
            (ngModelChange)="filterStaff()"
          >
        </div>

        <div class="filter-chips">
          <button 
            class="chip" 
            [class.active]="selectedRole === null"
            (click)="filterByRole(null)"
          >
            All ({{ getTotalCount() }})
          </button>
          <button 
            *ngFor="let role of staffRoles" 
            class="chip"
            [class.active]="selectedRole === role"
            (click)="filterByRole(role)"
          >
            {{ role }} ({{ getCountByRole(role) }})
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-cards">
        <div class="stat-card active">
          <div class="stat-value">{{ getActiveCount() }}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card inactive">
          <div class="stat-value">{{ getInactiveCount() }}</div>
          <div class="stat-label">Inactive</div>
        </div>
        <div class="stat-card total">
          <div class="stat-value">{{ getTotalCount() }}</div>
          <div class="stat-label">Total Staff</div>
        </div>
      </div>

      <!-- Staff List -->
      <div class="staff-list" *ngIf="!loading && filteredStaff.length > 0">
        <div 
          class="staff-card" 
          *ngFor="let staff of filteredStaff"
          (click)="viewStaffDetails(staff.id)"
        >
          <div class="staff-card-header">
            <img [src]="staff.photoUrl || 'assets/default-avatar.png'" [alt]="staff.name" class="staff-photo">
            <div class="staff-info">
              <h3>{{ staff.name }}</h3>
              <div class="role-badge" [ngClass]="getRoleClass(staff.role)">
                {{ staff.role }}
              </div>
            </div>
            <span class="status-badge" [ngClass]="getStatusClass(staff.status)">
              {{ staff.status }}
            </span>
          </div>

          <div class="staff-card-body">
            <div class="info-row" *ngIf="staff.documentType || staff.documentUrl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>{{ staff.documentType || 'ID proof' }}{{ staff.documentUrl ? ' · scan attached' : '' }}</span>
            </div>

            <div class="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              </svg>
              <span>{{ staff.flatNumber }}</span>
            </div>

            <div class="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>{{ staff.phoneNumber }}</span>
            </div>

            <div class="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Last seen: {{ formatDate(staff.lastAccessDate) }}</span>
            </div>

            <div class="passcode-section">
              <div class="passcode-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>6-Digit Passcode:</span>
              </div>
              <div class="passcode-display">
                <span class="passcode">{{ staff.passcode }}</span>
                <button class="regenerate-btn" (click)="regeneratePasscode(staff.id, $event)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="staff-card-footer">
            <button
              type="button"
              class="action-btn"
              [disabled]="!staff.documentUrl && !staff.documentType"
              (click)="viewIdProof(staff, $event)"
              title="View attached ID proof"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View ID
            </button>
            <button class="action-btn" (click)="viewAccessLog(staff.id, $event)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Access Log
            </button>
            <button class="action-btn" (click)="viewAttendance(staff.id, $event)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
              </svg>
              Attendance
            </button>
            <button 
              class="action-btn danger" 
              *ngIf="staff.status === 'Active'"
              (click)="blockStaff(staff.id, $event)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
              Block
            </button>
          </div>
        </div>
      </div>

      <!-- ID Proof viewer modal -->
      <div class="id-modal-backdrop" *ngIf="idProofStaff" (click)="closeIdProof()">
        <div class="id-modal" (click)="$event.stopPropagation()">
          <div class="id-modal-header">
            <h3>ID Proof — {{ idProofStaff.name }}</h3>
            <button type="button" class="id-modal-close" (click)="closeIdProof()" aria-label="Close">×</button>
          </div>
          <div class="id-modal-meta">
            <p><strong>Type:</strong> {{ idProofStaff.documentType || '—' }}</p>
            <p *ngIf="idProofStaff.documentNumber"><strong>Number:</strong> {{ idProofStaff.documentNumber }}</p>
          </div>
          <div class="id-modal-body" *ngIf="idProofStaff.documentUrl; else noScan">
            <img
              *ngIf="!isPdf(idProofStaff.documentUrl)"
              [src]="idProofStaff.documentUrl"
              [alt]="(idProofStaff.documentType || 'ID') + ' scan'"
            />
            <a
              *ngIf="isPdf(idProofStaff.documentUrl)"
              class="pdf-link"
              [href]="idProofStaff.documentUrl"
              target="_blank"
              rel="noopener"
            >
              Open PDF document
            </a>
          </div>
          <ng-template #noScan>
            <p class="id-modal-empty">No scan was attached for this staff member.</p>
          </ng-template>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!loading && filteredStaff.length === 0">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <h3>No Staff Found</h3>
        <p *ngIf="!societyId">Select a society in Society Setup, then add domestic staff.</p>
        <p *ngIf="societyId && searchTerm">Try different search terms</p>
        <p *ngIf="societyId && !searchTerm">No domestic staff registered yet for this society.</p>
        <button class="primary-btn" (click)="addStaff()" *ngIf="societyId">Add Staff Member</button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading staff...</p>
      </div>
    </div>
  `,
  styles: [`
    .domestic-staff-container {
      min-height: 100vh;
      background: #f5f5f5;
      padding-bottom: 80px;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .back-btn, .add-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .back-btn:hover, .add-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .search-filter-section {
      padding: 1rem;
      background: white;
      border-bottom: 1px solid #e0e0e0;
    }

    .search-box {
      display: flex;
      align-items: center;
      background: #f5f5f5;
      border-radius: 12px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
    }

    .search-box svg {
      margin-right: 0.5rem;
      color: #666;
    }

    .search-box input {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      font-size: 0.95rem;
    }

    .filter-chips {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .filter-chips::-webkit-scrollbar {
      display: none;
    }

    .chip {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      border: 1px solid #e0e0e0;
      background: white;
      font-size: 0.85rem;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.3s;
    }

    .chip.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      padding: 1rem;
    }

    .stat-card {
      background: white;
      padding: 1rem;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .stat-card.active .stat-value { color: #10b981; }
    .stat-card.inactive .stat-value { color: #ef4444; }
    .stat-card.total .stat-value { color: #667eea; }

    .stat-label {
      font-size: 0.85rem;
      color: #666;
    }

    .staff-list {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .staff-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: all 0.3s;
      cursor: pointer;
    }

    .staff-card:active {
      transform: scale(0.98);
    }

    .staff-card-header {
      display: flex;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .staff-photo {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #f0f0f0;
    }

    .staff-info {
      flex: 1;
    }

    .staff-info h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      color: #333;
    }

    .role-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-badge.maid { background: #fef3c7; color: #92400e; }
    .role-badge.cook { background: #fce7f3; color: #831843; }
    .role-badge.driver { background: #dbeafe; color: #1e40af; }
    .role-badge.nanny { background: #e0e7ff; color: #3730a3; }
    .role-badge.gardener { background: #d1fae5; color: #065f46; }
    .role-badge.caretaker { background: #e5e7eb; color: #1f2937; }
    .role-badge.tutor { background: #fef3c7; color: #92400e; }
    .role-badge.other { background: #f3f4f6; color: #6b7280; }

    .status-badge {
      padding: 0.35rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.active { background: #d1fae5; color: #065f46; }
    .status-badge.inactive { background: #fee2e2; color: #991b1b; }
    .status-badge.blocked { background: #fef2f2; color: #7f1d1d; }
    .status-badge.pending-approval { background: #fef3c7; color: #92400e; }

    .staff-card-body {
      padding: 1rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      color: #666;
      font-size: 0.9rem;
    }

    .info-row svg {
      color: #999;
    }

    .passcode-section {
      background: #f9fafb;
      padding: 0.75rem;
      border-radius: 8px;
      margin-top: 0.5rem;
    }

    .passcode-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #666;
      margin-bottom: 0.5rem;
    }

    .passcode-display {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .passcode {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: #667eea;
      font-family: 'Courier New', monospace;
    }

    .regenerate-btn {
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .regenerate-btn:hover {
      background: #5568d3;
      transform: rotate(180deg);
    }

    .staff-card-footer {
      display: flex;
      border-top: 1px solid #f0f0f0;
    }

    .action-btn {
      flex: 1;
      padding: 0.75rem;
      border: none;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #667eea;
      cursor: pointer;
      transition: all 0.3s;
    }

    .action-btn:not(:last-child) {
      border-right: 1px solid #f0f0f0;
    }

    .action-btn:hover {
      background: #f9fafb;
    }

    .action-btn.danger {
      color: #ef4444;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .empty-state svg {
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 1rem 0 0.5rem 0;
      color: #333;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .primary-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
    }

    .primary-btn:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .loading-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f4f6;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .id-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .id-modal {
      background: white;
      border-radius: 16px;
      width: min(520px, 100%);
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
    }

    .id-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid #eee;
    }

    .id-modal-header h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #1e293b;
    }

    .id-modal-close {
      border: none;
      background: #f1f5f9;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      color: #475569;
    }

    .id-modal-meta {
      padding: 12px 18px 0;
      color: #334155;
      font-size: 0.95rem;
    }

    .id-modal-meta p {
      margin: 0 0 8px;
    }

    .id-modal-body {
      padding: 12px 18px 18px;
    }

    .id-modal-body img {
      width: 100%;
      max-height: 60vh;
      object-fit: contain;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }

    .pdf-link {
      display: block;
      text-align: center;
      padding: 16px;
      color: #667eea;
      font-weight: 600;
    }

    .id-modal-empty {
      padding: 24px 18px;
      text-align: center;
      color: #94a3b8;
    }
  `]
})
export class DomesticStaffListComponent implements OnInit {
  domesticStaff: DomesticStaff[] = [];
  filteredStaff: DomesticStaff[] = [];
  loading = true;
  searchTerm = '';
  selectedRole: StaffRole | null = null;
  staffRoles = Object.values(StaffRole);
  societyId = '';
  /** Open ID-proof modal for this staff row. */
  idProofStaff: DomesticStaff | null = null;

  constructor(
    private domesticStaffService: DomesticStaffService,
    private router: Router
  ) {}

  ngOnInit() {
    this.societyId = this.domesticStaffService.getSocietyId();
    this.loadStaff();
  }

  loadStaff() {
    this.loading = true;
    this.domesticStaffService.getDomesticStaffBySociety().subscribe({
      next: (staff) => {
        this.domesticStaff = staff;
        this.filteredStaff = staff;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading staff:', err);
        this.domesticStaff = [];
        this.filteredStaff = [];
        this.loading = false;
      }
    });
  }

  filterStaff() {
    let filtered = this.domesticStaff;

    // Filter by role
    if (this.selectedRole) {
      filtered = filtered.filter(s => s.role === this.selectedRole);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(term) ||
        s.role.toLowerCase().includes(term) ||
        s.phoneNumber.includes(term)
      );
    }

    this.filteredStaff = filtered;
  }

  filterByRole(role: StaffRole | null) {
    this.selectedRole = role;
    this.filterStaff();
  }

  getRoleClass(role: StaffRole): string {
    return role.toLowerCase().replace(/\s+/g, '-');
  }

  getStatusClass(status: StaffStatus): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  }

  getTotalCount(): number {
    return this.domesticStaff.length;
  }

  getActiveCount(): number {
    return this.domesticStaff.filter(s => s.status === StaffStatus.ACTIVE).length;
  }

  getInactiveCount(): number {
    return this.domesticStaff.filter(s => s.status !== StaffStatus.ACTIVE).length;
  }

  getCountByRole(role: StaffRole): number {
    return this.domesticStaff.filter(s => s.role === role).length;
  }

  regeneratePasscode(staffId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Generate a new 6-digit passcode for this staff member?')) {
      this.domesticStaffService.regeneratePasscode(staffId).subscribe({
        next: (newPasscode) => {
          const staff = this.domesticStaff.find(s => s.id === staffId);
          if (staff) {
            staff.passcode = newPasscode;
            alert(`New passcode generated: ${newPasscode}`);
          }
        },
        error: (err) => console.error('Error regenerating passcode:', err)
      });
    }
  }

  viewStaffDetails(staffId: string) {
    this.router.navigate(['/admin/domestic-staff/detail', staffId]);
  }

  /** Open modal with the Aadhaar / PAN / other ID scan submitted for this staff. */
  viewIdProof(staff: DomesticStaff, event: Event): void {
    event.stopPropagation();
    this.idProofStaff = staff;
  }

  closeIdProof(): void {
    this.idProofStaff = null;
  }

  isPdf(url: string | undefined): boolean {
    return !!url && url.startsWith('data:application/pdf');
  }

  viewAccessLog(staffId: string, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/admin/domestic-staff/access-log', staffId]);
  }

  viewAttendance(staffId: string, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/admin/domestic-staff/attendance', staffId]);
  }

  blockStaff(staffId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to block this staff member?')) {
      this.domesticStaffService.blockStaff(staffId).subscribe({
        next: () => {
          this.loadStaff();
          alert('Staff member blocked successfully');
        },
        error: (err) => console.error('Error blocking staff:', err)
      });
    }
  }

  addStaff() {
    this.router.navigate(['/admin/domestic-staff/add']);
  }

  goBack() {
    this.router.navigate(['/admin/users']);
  }
}
