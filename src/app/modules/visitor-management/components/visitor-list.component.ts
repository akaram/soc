import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  Visitor,
  VisitorStatus,
  ApprovalStatus,
  VisitorStatistics
} from '../models/visitor.model';

@Component({
  selector: 'app-visitor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="visitor-list-container">
      <div class="page-header">
        <div>
          <h1><i class="material-icons">group_add</i> Visitor Management</h1>
          <p>Manage and track all visitor entries</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" routerLink="/admin/visitors/recurring">
            <i class="material-icons">repeat</i>
            Daily Help
          </button>
          <button class="btn-secondary" routerLink="/admin/visitors/gatepass">
            <i class="material-icons">card_membership</i>
            Monthly Gatepass
          </button>
          <button class="btn-secondary" routerLink="/admin/visitors/bulk-approval">
            <i class="material-icons">event</i>
            Bulk Approval
          </button>
          <button class="btn-primary" routerLink="/admin/visitors/pre-invite">
            <i class="material-icons">add</i>
            Pre-Invite Visitor
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid" *ngIf="statistics">
        <div class="stat-card">
          <div class="stat-icon today">
            <i class="material-icons">today</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.totalToday }}</h3>
            <p>Today's Visitors</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.pending }}</h3>
            <p>Pending Approval</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon approved">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.approved }}</h3>
            <p>Approved</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon checked-in">
            <i class="material-icons">login</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.checkedIn }}</h3>
            <p>Checked In</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon checked-out">
            <i class="material-icons">logout</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.checkedOut }}</h3>
            <p>Checked Out</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon month">
            <i class="material-icons">calendar_month</i>
          </div>
          <div class="stat-content">
            <h3>{{ statistics.thisMonth }}</h3>
            <p>This Month</p>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
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
            <option [value]="visitorStatuses.PENDING">Pending</option>
            <option [value]="visitorStatuses.APPROVED">Approved</option>
            <option [value]="visitorStatuses.CHECKED_IN">Checked In</option>
            <option [value]="visitorStatuses.CHECKED_OUT">Checked Out</option>
            <option [value]="visitorStatuses.REJECTED">Rejected</option>
          </select>

          <input 
            type="date" 
            [(ngModel)]="dateFilter"
            (change)="applyFilters()"
            placeholder="Filter by date">

          <button class="btn-clear" (click)="clearFilters()">
            <i class="material-icons">clear</i>
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading visitors...</p>
      </div>

      <!-- Visitor Table -->
      <div class="visitor-table-container" *ngIf="!isLoading">
        <table class="visitor-table">
          <thead>
            <tr>
              <th>Visitor</th>
              <th>Contact</th>
              <th>Visiting</th>
              <th>Purpose</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let visitor of filteredVisitors" class="visitor-row">
              <td>
                <div class="visitor-info-cell">
                  <div class="visitor-avatar">
                    {{ visitor.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <strong>{{ visitor.name }}</strong>
                    <span class="visitor-count" *ngIf="visitor.numberOfVisitors && visitor.numberOfVisitors > 1">
                      +{{ visitor.numberOfVisitors - 1 }} more
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <div class="contact-info">
                  <div><i class="material-icons">phone</i> {{ visitor.phone }}</div>
                  <div *ngIf="visitor.email">
                    <i class="material-icons">email</i> {{ visitor.email }}
                  </div>
                </div>
              </td>
              <td>
                <div>
                  <strong>{{ visitor.visitingFlat }}</strong>
                  <div class="host-name">{{ visitor.hostName }}</div>
                </div>
              </td>
              <td>{{ visitor.purpose }}</td>
              <td>
                <div>
                  <div>{{ formatDate(visitor.visitDate) }}</div>
                  <div class="time-text">{{ visitor.visitTime }}</div>
                </div>
              </td>
              <td>
                <span class="status-badge" [ngClass]="'status-' + visitor.status.toLowerCase()">
                  {{ getStatusLabel(visitor.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    class="btn-icon" 
                    [title]="visitor.qrCode ? 'View QR Code' : 'Generate QR Code'"
                    (click)="viewQRCode(visitor)">
                    <i class="material-icons">qr_code</i>
                  </button>
                  <button 
                    class="btn-icon" 
                    title="View Details"
                    (click)="viewDetails(visitor)">
                    <i class="material-icons">visibility</i>
                  </button>
                  <button 
                    class="btn-icon" 
                    title="More Options"
                    (click)="showMoreOptions(visitor)">
                    <i class="material-icons">more_vert</i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredVisitors.length === 0">
          <i class="material-icons">group_off</i>
          <h3>No Visitors Found</h3>
          <p>{{ searchTerm || dateFilter || statusFilter ? 'Try adjusting your filters' : 'Start by pre-inviting a visitor' }}</p>
          <button class="btn-primary" routerLink="/admin/visitors/pre-invite">
            <i class="material-icons">add</i>
            Pre-Invite Visitor
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .visitor-list-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
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

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #f8f9fa;
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

    .stat-icon.today { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .stat-icon.pending { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .stat-icon.approved { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .stat-icon.checked-in { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .stat-icon.checked-out { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    .stat-icon.month { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); }

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

    .filter-buttons select,
    .filter-buttons input[type="date"] {
      padding: 10px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }

    .filter-buttons select:focus,
    .filter-buttons input[type="date"]:focus {
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
    .visitor-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .visitor-table {
      width: 100%;
      border-collapse: collapse;
    }

    .visitor-table thead {
      background: #f8f9fa;
    }

    .visitor-table th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .visitor-table td {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .visitor-row:hover {
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

    .visitor-count {
      display: block;
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
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

    .time-text {
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

    .status-badge.status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.status-approved {
      background: #d1ecf1;
      color: #0c5460;
    }

    .status-badge.status-checked_in {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.status-checked_out {
      background: #e2e3e5;
      color: #383d41;
    }

    .status-badge.status-rejected {
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

    .loading-state .material-icons,
    .empty-state .material-icons {
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
      margin: 0 0 20px 0;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .visitor-table {
        font-size: 12px;
      }

      .visitor-table th,
      .visitor-table td {
        padding: 8px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class VisitorListComponent implements OnInit {
  visitors: Visitor[] = [];
  filteredVisitors: Visitor[] = [];
  statistics: VisitorStatistics | null = null;
  isLoading = false;

  searchTerm = '';
  statusFilter: VisitorStatus | null = null;
  dateFilter: string = '';

  visitorStatuses = VisitorStatus;

  constructor(private visitorService: VisitorManagementService) {}

  ngOnInit(): void {
    this.loadVisitors();
    this.loadStatistics();
  }

  loadVisitors(): void {
    this.isLoading = true;
    this.visitorService.getAllVisitors().subscribe({
      next: (visitors) => {
        this.visitors = visitors;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading visitors:', error);
        this.isLoading = false;
      }
    });
  }

  loadStatistics(): void {
    this.visitorService.getVisitorStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.visitors];

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(searchLower) ||
        v.phone.includes(searchLower) ||
        v.visitingFlat.toLowerCase().includes(searchLower) ||
        v.purpose.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (this.statusFilter) {
      filtered = filtered.filter(v => v.status === this.statusFilter);
    }

    // Date filter
    if (this.dateFilter) {
      const filterDate = new Date(this.dateFilter);
      filtered = filtered.filter(v => {
        const visitDate = new Date(v.visitDate);
        return visitDate.toDateString() === filterDate.toDateString();
      });
    }

    this.filteredVisitors = filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = null;
    this.dateFilter = '';
    this.applyFilters();
  }

  getStatusLabel(status: VisitorStatus): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'CHECKED_IN': 'Checked In',
      'CHECKED_OUT': 'Checked Out',
      'EXPIRED': 'Expired',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  viewQRCode(visitor: Visitor): void {
    if (!visitor?.id) {
      alert('Visitor ID is missing');
      return;
    }
    void this.visitorService.ensureVisitorQrCode(visitor).then(enriched => {
      window.location.href = `/admin/visitors/${enriched.id}/qr`;
    });
  }

  viewDetails(visitor: Visitor): void {
    window.location.href = `/admin/visitors/${visitor.id}`;
  }

  showMoreOptions(visitor: Visitor): void {
    // Implement dropdown menu with options like approve, reject, check-in, check-out, delete
    alert(`More options for ${visitor.name}`);
  }
}

