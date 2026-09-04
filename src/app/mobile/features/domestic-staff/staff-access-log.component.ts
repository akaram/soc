import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomesticStaffService } from './services/domestic-staff.service';
import { StaffAccessLog } from './models/domestic-staff.model';

@Component({
  selector: 'app-staff-access-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="access-log-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Access Log</h1>
        <div style="width: 40px;"></div>
      </div>

      <!-- Stats Summary -->
      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-value">{{ accessLogs.length }}</span>
          <span class="stat-label">Total Entries</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ getCurrentMonthCount() }}</span>
          <span class="stat-label">This Month</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ getTodayCount() }}</span>
          <span class="stat-label">Today</span>
        </div>
      </div>

      <!-- Access Log List -->
      <div class="log-list" *ngIf="!loading && accessLogs.length > 0">
        <div class="log-card" *ngFor="let log of accessLogs">
          <div class="log-header">
            <img [src]="log.photoCapture || 'assets/default-avatar.png'" [alt]="log.staffName" class="log-photo">
            <div class="log-info">
              <h3>{{ log.staffName }}</h3>
              <span class="flat-badge">{{ log.flatNumber }}</span>
            </div>
            <span class="status-badge" [class.checked-out]="log.checkOutTime">
              {{ log.checkOutTime ? 'Checked Out' : 'Checked In' }}
            </span>
          </div>

          <div class="log-details">
            <div class="detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              <div>
                <span class="detail-label">Check-in:</span>
                <span class="detail-value">{{ formatDateTime(log.checkInTime) }}</span>
              </div>
            </div>

            <div class="detail-row" *ngIf="log.checkOutTime">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <div>
                <span class="detail-label">Check-out:</span>
                <span class="detail-value">{{ formatDateTime(log.checkOutTime) }}</span>
              </div>
            </div>

            <div class="detail-row" *ngIf="log.checkOutTime">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <div>
                <span class="detail-label">Duration:</span>
                <span class="detail-value">{{ calculateDuration(log.checkInTime, log.checkOutTime) }}</span>
              </div>
            </div>

            <div class="detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              </svg>
              <div>
                <span class="detail-label">Entry Gate:</span>
                <span class="detail-value">{{ log.entryGate }}</span>
              </div>
            </div>

            <div class="detail-row" *ngIf="log.exitGate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              </svg>
              <div>
                <span class="detail-label">Exit Gate:</span>
                <span class="detail-value">{{ log.exitGate }}</span>
              </div>
            </div>

            <div class="detail-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <div>
                <span class="detail-label">Verified by:</span>
                <span class="detail-value">{{ log.verifiedBy }}</span>
              </div>
            </div>

            <div class="detail-row" *ngIf="log.notes">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <div>
                <span class="detail-label">Notes:</span>
                <span class="detail-value">{{ log.notes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!loading && accessLogs.length === 0">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <h3>No Access Records</h3>
        <p>No gate entry/exit records found for this staff member</p>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading access logs...</p>
      </div>
    </div>
  `,
  styles: [`
    .access-log-container {
      min-height: 100vh;
      background: #f5f5f5;
      padding-bottom: 2rem;
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

    .back-btn {
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

    .back-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .stats-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-bottom: 1px solid #e0e0e0;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      display: block;
      font-size: 0.85rem;
      color: #666;
    }

    .log-list {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .log-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .log-header {
      display: flex;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
      background: #f9fafb;
      border-bottom: 1px solid #e0e0e0;
    }

    .log-photo {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid white;
    }

    .log-info {
      flex: 1;
    }

    .log-info h3 {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      color: #333;
    }

    .flat-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #667eea;
      color: white;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge {
      padding: 0.35rem 0.75rem;
      background: #d1fae5;
      color: #065f46;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.checked-out {
      background: #fee2e2;
      color: #991b1b;
    }

    .log-details {
      padding: 1rem;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-row:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .detail-row svg {
      color: #999;
      margin-top: 0.2rem;
      flex-shrink: 0;
    }

    .detail-row > div {
      flex: 1;
    }

    .detail-label {
      display: block;
      font-size: 0.85rem;
      color: #999;
      margin-bottom: 0.25rem;
    }

    .detail-value {
      display: block;
      color: #333;
      font-weight: 500;
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
  `]
})
export class StaffAccessLogComponent implements OnInit {
  accessLogs: StaffAccessLog[] = [];
  loading = true;
  staffId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private domesticStaffService: DomesticStaffService
  ) {}

  ngOnInit() {
    this.staffId = this.route.snapshot.paramMap.get('id')!;
    this.loadAccessLogs();
  }

  loadAccessLogs() {
    this.domesticStaffService.getAccessLogs(this.staffId).subscribe({
      next: (logs) => {
        this.accessLogs = logs;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading access logs:', err);
        this.loading = false;
      }
    });
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    const timeStr = d.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dateStr} at ${timeStr}`;
  }

  calculateDuration(checkIn: Date, checkOut: Date): string {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getTodayCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.accessLogs.filter(log => {
      const logDate = new Date(log.checkInTime);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    }).length;
  }

  getCurrentMonthCount(): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return this.accessLogs.filter(log => {
      const logDate = new Date(log.checkInTime);
      return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    }).length;
  }

  goBack() {
    this.router.navigate(['/mobile/domestic-staff/detail', this.staffId]);
  }
}
