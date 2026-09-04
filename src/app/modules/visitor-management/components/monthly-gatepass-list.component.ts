import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  MonthlyGatepass,
  GatepassStatus,
  GatepassStatistics
} from '../models/monthly-gatepass.model';

@Component({
  selector: 'app-monthly-gatepass-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="gatepass-container">
      <div class="page-header">
        <div class="page-header-text">
          <h1><i class="material-icons">card_membership</i> Monthly Gatepass</h1>
          <p>Manage monthly gatepasses for frequent visitors</p>
        </div>
        <div class="header-actions">
          <a class="btn-primary" routerLink="/admin/visitors/gatepass/add">
            <i class="material-icons">add</i>
            <span>Create Gatepass</span>
          </a>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid" *ngIf="statistics">
        <div class="stat-card">
          <div class="stat-icon active">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.totalActive }}</h3>
            <p>Active</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon expired">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.totalExpired }}</h3>
            <p>Expired</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.totalPending }}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon visits">
            <i class="material-icons">event</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.totalVisitsThisMonth }}</h3>
            <p>Visits This Month</p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by name, phone, flat number..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()">
        </div>
        
        <div class="filter-buttons">
          <select [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option [value]="null">All Status</option>
            <option [value]="gatepassStatuses.ACTIVE">Active</option>
            <option [value]="gatepassStatuses.PENDING">Pending</option>
            <option [value]="gatepassStatuses.EXPIRED">Expired</option>
            <option [value]="gatepassStatuses.SUSPENDED">Suspended</option>
          </select>

          <button class="btn-clear" (click)="clearFilters()">
            <i class="material-icons">clear</i>
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading gatepasses...</p>
      </div>

      <!-- Gatepass Table -->
      <div class="gatepass-table-container" *ngIf="!isLoading">
        <table class="gatepass-table">
          <thead>
            <tr>
              <th>Visitor</th>
              <th>Contact</th>
              <th>Visiting</th>
              <th>Purpose</th>
              <th>Validity</th>
              <th>Visits</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let gatepass of filteredGatepasses" class="gatepass-row">
              <td>
                <div class="visitor-info-cell">
                  <div class="visitor-avatar">
                    {{ gatepass.visitorName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <strong>{{ gatepass.visitorName }}</strong>
                  </div>
                </div>
              </td>
              <td>
                <div class="contact-info">
                  <div><i class="material-icons">phone</i> {{ gatepass.phone }}</div>
                  <div *ngIf="gatepass.email">
                    <i class="material-icons">email</i> {{ gatepass.email }}
                  </div>
                </div>
              </td>
              <td>
                <div>
                  <strong>{{ gatepass.visitingFlat }}</strong>
                  <div class="host-name">{{ gatepass.hostName }}</div>
                </div>
              </td>
              <td>{{ gatepass.purpose }}</td>
              <td>
                <div>
                  <div>{{ formatDate(gatepass.startDate) }}</div>
                  <div class="date-text">to {{ formatDate(gatepass.endDate) }}</div>
                  <div class="validity-badge" [ngClass]="getValidityClass(gatepass.validityDays)">
                    {{ gatepass.validityDays }} days left
                  </div>
                </div>
              </td>
              <td>
                <div>
                  <div><strong>{{ gatepass.currentMonthVisits }}</strong> / {{ gatepass.maxVisitsPerMonth || '∞' }} this month</div>
                  <div class="visit-text">Total: {{ gatepass.totalVisits }}</div>
                </div>
              </td>
              <td>
                <span class="status-badge" [ngClass]="'status-' + gatepass.status.toLowerCase()">
                  {{ getStatusLabel(gatepass.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    class="btn-icon" 
                    title="View QR Code"
                    (click)="viewQRCode(gatepass)"
                    *ngIf="gatepass.qrCode">
                    <i class="material-icons">qr_code</i>
                  </button>
                  <button 
                    class="btn-icon" 
                    title="View Details"
                    (click)="viewDetails(gatepass)">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button 
                    class="btn-icon" 
                    title="More Options"
                    (click)="showMoreOptions(gatepass)">
                    <i class="material-icons">more_vert</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredGatepasses.length === 0">
          <i class="material-icons empty-hero-icon">card_membership</i>
          <h3>No Gatepasses Found</h3>
          <p>{{ searchTerm || statusFilter ? 'Try adjusting your filters' : 'Start by creating a monthly gatepass' }}</p>
          <div class="empty-state-actions">
            <a class="btn-primary" routerLink="/admin/visitors/gatepass/add">
              <i class="material-icons">add</i>
              <span>Create Gatepass</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gatepass-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .page-header-text {
      flex: 1;
      min-width: 0;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 10px;
      line-height: 1.25;
    }

    .page-header h1 .material-icons {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
      line-height: 1.4;
    }

    .header-actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-decoration: none;
      white-space: nowrap;
      width: fit-content;
      max-width: 100%;
      box-sizing: border-box;
      transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
    }

    .btn-primary .material-icons {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
      color: white;
      text-decoration: none;
    }

    /* Statistics Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .stat-icon.active { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .stat-icon.expired { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    .stat-icon.pending { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .stat-icon.visits { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

    .stat-icon .material-icons {
      font-size: 28px;
    }

    .stat-content h3 {
      margin: 0 0 4px 0;
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-content p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    /* Filters Section */
    .filters-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f5f5f5;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .search-box .material-icons {
      color: #999;
    }

    .search-box input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 15px;
    }

    .filter-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-buttons select {
      padding: 10px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }

    .filter-buttons select:focus {
      border-color: #667eea;
    }

    .btn-clear {
      background: #f5f5f5;
      border: 2px solid #e0e0e0;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-clear:hover {
      background: #e0e0e0;
    }

    /* Table Styles */
    .gatepass-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .gatepass-table {
      width: 100%;
      border-collapse: collapse;
    }

    .gatepass-table thead {
      background: #f8f9fa;
    }

    .gatepass-table th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .gatepass-table td {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .gatepass-row:hover {
      background: #f8f9fa;
    }

    .visitor-info-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .visitor-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
    }

    .contact-info {
      font-size: 14px;
      color: #2c3e50;
    }

    .contact-info div {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .contact-info .material-icons {
      font-size: 16px;
      color: #7f8c8d;
    }

    .host-name {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .date-text {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .validity-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 4px;
    }

    .validity-badge.high {
      background: #d4edda;
      color: #155724;
    }

    .validity-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .validity-badge.low {
      background: #f8d7da;
      color: #721c24;
    }

    .visit-text {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.status-active {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.status-expired {
      background: #e2e3e5;
      color: #383d41;
    }

    .status-badge.status-suspended {
      background: #f8d7da;
      color: #721c24;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      background: #f5f5f5;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #667eea;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #667eea;
      color: white;
    }

    .loading-state,
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
    }

    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    /* Hero icon only — do not target all .material-icons (would blow up button icons). */
    .empty-state .empty-hero-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0 0 20px 0;
      color: #7f8c8d;
    }

    .empty-state-actions {
      display: flex;
      justify-content: center;
    }

    .empty-state-actions .btn-primary {
      min-height: 42px;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        width: 100%;
      }

      .header-actions .btn-primary {
        width: 100%;
      }

      .gatepass-table {
        font-size: 12px;
      }

      .gatepass-table th,
      .gatepass-table td {
        padding: 8px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .empty-state-actions .btn-primary {
        width: 100%;
        max-width: 320px;
      }
    }
  `]
})
export class MonthlyGatepassListComponent implements OnInit {
  gatepasses: MonthlyGatepass[] = [];
  filteredGatepasses: MonthlyGatepass[] = [];
  statistics: GatepassStatistics | null = null;
  isLoading = false;

  searchTerm = '';
  statusFilter: GatepassStatus | null = null;

  gatepassStatuses = GatepassStatus;

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGatepasses();
    this.loadStatistics();
  }

  loadGatepasses(): void {
    this.isLoading = true;
    this.visitorService.getAllMonthlyGatepasses().subscribe({
      next: (gatepasses) => {
        this.gatepasses = gatepasses;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading gatepasses:', error);
        this.isLoading = false;
      }
    });
  }

  loadStatistics(): void {
    this.visitorService.getMonthlyGatepassStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.gatepasses];

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(gp =>
        gp.visitorName.toLowerCase().includes(searchLower) ||
        gp.phone.includes(searchLower) ||
        gp.visitingFlat.toLowerCase().includes(searchLower) ||
        gp.purpose.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (this.statusFilter) {
      filtered = filtered.filter(gp => gp.status === this.statusFilter);
    }

    this.filteredGatepasses = filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = null;
    this.applyFilters();
  }

  getStatusLabel(status: GatepassStatus): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'ACTIVE': 'Active',
      'EXPIRED': 'Expired',
      'SUSPENDED': 'Suspended',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  getValidityClass(days: number): string {
    if (days > 15) return 'high';
    if (days > 7) return 'medium';
    return 'low';
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  viewQRCode(gatepass: MonthlyGatepass): void {
    if (gatepass.qrCode) {
      this.router.navigate(['/admin/visitors/gatepass', gatepass.id, 'qr']);
    }
  }

  viewDetails(gatepass: MonthlyGatepass): void {
    this.router.navigate(['/admin/visitors/gatepass', gatepass.id]);
  }

  showMoreOptions(gatepass: MonthlyGatepass): void {
    alert(`More options for ${gatepass.visitorName}`);
  }
}

