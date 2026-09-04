import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserManagementService } from '../../../modules/user-management/services/user-management.service';

/** One actionable setup notice shown on the admin home dashboard. */
interface FlatSetupAlert {
  type: 'warn' | 'info';
  message: string;
  link?: string;
  linkLabel?: string;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <!-- Page Header -->
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Welcome to Society Management Admin Panel</p>
      </div>

      <!-- Society / flat linking setup notices -->
      <div class="setup-alerts" *ngIf="flatSetupAlerts.length">
        <div
          class="setup-alert"
          *ngFor="let alert of flatSetupAlerts"
          [class.warn]="alert.type === 'warn'"
          [class.info]="alert.type === 'info'">
          <i class="material-icons">{{ alert.type === 'warn' ? 'warning' : 'info' }}</i>
          <div class="alert-body">
            <p>{{ alert.message }}</p>
            <a *ngIf="alert.link" [routerLink]="alert.link" [queryParams]="alert.queryParams || null">{{ alert.linkLabel || 'Open' }}</a>
          </div>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #667eea;">
            <i class="material-icons">people</i>
          </div>
          <div class="stat-content">
            <p class="stat-label">Total Residents</p>
            <h3 class="stat-value">1,248</h3>
            <span class="stat-change positive">+12% from last month</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: #10ac84;">
            <i class="material-icons">account_balance_wallet</i>
          </div>
          <div class="stat-content">
            <p class="stat-label">Revenue This Month</p>
            <h3 class="stat-value">SAR 125,430</h3>
            <span class="stat-change positive">+8% from last month</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: #ff9f43;">
            <i class="material-icons">report_problem</i>
          </div>
          <div class="stat-content">
            <p class="stat-label">Pending Complaints</p>
            <h3 class="stat-value">23</h3>
            <span class="stat-change negative">+5% from last month</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: #3498db;">
            <i class="material-icons">event_available</i>
          </div>
          <div class="stat-content">
            <p class="stat-label">Today's Bookings</p>
            <h3 class="stat-value">18</h3>
            <span class="stat-change positive">-3% from yesterday</span>
          </div>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="section">
        <h2>Quick Actions</h2>
        <div class="quick-actions">
          <button class="action-btn" [routerLink]="['/admin/billing']">
            <i class="material-icons">receipt_long</i>
            <span>Generate Bills</span>
          </button>
          <button class="action-btn" [routerLink]="['/admin/users']">
            <i class="material-icons">person_add</i>
            <span>Add Resident</span>
          </button>
          <button class="action-btn" [routerLink]="['/admin/visitors']">
            <i class="material-icons">group_add</i>
            <span>Visitor Log</span>
          </button>
          <button class="action-btn" [routerLink]="['/admin/announcements']">
            <i class="material-icons">campaign</i>
            <span>Send Announcement</span>
          </button>
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="content-grid">
        <div class="content-card">
          <div class="card-header">
            <h3>Recent Visitors</h3>
            <a [routerLink]="['/admin/visitors']">View All</a>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Visitor Name</th>
                  <th>Flat</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ahmed Al-Rashid</td>
                  <td>A-501</td>
                  <td>10:30 AM</td>
                  <td><span class="badge success">Checked In</span></td>
                </tr>
                <tr>
                  <td>Sarah Mohammed</td>
                  <td>B-302</td>
                  <td>09:45 AM</td>
                  <td><span class="badge warning">Pending</span></td>
                </tr>
                <tr>
                  <td>Delivery - Amazon</td>
                  <td>C-105</td>
                  <td>08:20 AM</td>
                  <td><span class="badge success">Checked Out</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="content-card">
          <div class="card-header">
            <h3>Recent Complaints</h3>
            <a [routerLink]="['/admin/complaints']">View All</a>
          </div>
          <div class="complaints-list">
            <div class="complaint-item">
              <div class="complaint-icon high">
                <i class="material-icons">priority_high</i>
              </div>
              <div class="complaint-info">
                <h4>Elevator Not Working</h4>
                <p>Tower A - Flat 501 • 2 hours ago</p>
              </div>
              <span class="badge danger">High</span>
            </div>
            <div class="complaint-item">
              <div class="complaint-icon medium">
                <i class="material-icons">warning</i>
              </div>
              <div class="complaint-info">
                <h4>Water Leakage</h4>
                <p>Tower B - Flat 302 • 5 hours ago</p>
              </div>
              <span class="badge warning">Medium</span>
            </div>
            <div class="complaint-item">
              <div class="complaint-icon low">
                <i class="material-icons">info</i>
              </div>
              <div class="complaint-info">
                <h4>Parking Issue</h4>
                <p>Basement - 1 day ago</p>
              </div>
              <span class="badge info">Low</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Switch to Mobile -->
      <div class="switch-interface">
        <div class="switch-card">
          <i class="material-icons">phone_android</i>
          <div>
            <h4>Mobile Version Available</h4>
            <p>Access the mobile-optimized interface for on-the-go management</p>
          </div>
          <button [routerLink]="['/mobile/login']">Switch to Mobile</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 32px;
    }
    
    .page-header h1 {
      margin: 0 0 8px 0;
      font-size: 32px;
      color: #2c3e50;
    }
    
    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    .setup-alerts {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .setup-alert {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      font-size: 14px;
      line-height: 1.5;
    }

    .setup-alert .material-icons {
      font-size: 22px;
      margin-top: 2px;
    }

    .setup-alert.warn {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      color: #92400e;
    }

    .setup-alert.info {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      color: #1e40af;
    }

    .alert-body p {
      margin: 0 0 6px;
    }

    .alert-body a {
      color: inherit;
      font-weight: 600;
      text-decoration: underline;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex;
      gap: 20px;
    }
    
    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .stat-icon .material-icons {
      font-size: 32px;
      color: white;
    }
    
    .stat-content {
      flex: 1;
    }
    
    .stat-label {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #7f8c8d;
      font-weight: 500;
    }
    
    .stat-value {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
    }
    
    .stat-change {
      font-size: 12px;
      font-weight: 600;
    }
    
    .stat-change.positive {
      color: #10ac84;
    }
    
    .stat-change.negative {
      color: #e74c3c;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section h2 {
      margin: 0 0 20px 0;
      font-size: 24px;
      color: #2c3e50;
    }
    
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    
    .action-btn {
      background: white;
      border: 2px solid #ecf0f1;
      padding: 20px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .action-btn:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }
    
    .action-btn .material-icons {
      font-size: 32px;
      color: #667eea;
    }
    
    .action-btn span {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }
    
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .content-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #ecf0f1;
    }
    
    .card-header h3 {
      margin: 0;
      font-size: 18px;
      color: #2c3e50;
    }
    
    .card-header a {
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
    }
    
    .table-container {
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th {
      text-align: left;
      padding: 16px 24px;
      background: #f8f9fa;
      color: #7f8c8d;
      font-size: 13px;
      font-weight: 600;
    }
    
    td {
      padding: 16px 24px;
      border-bottom: 1px solid #ecf0f1;
      color: #2c3e50;
      font-size: 14px;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .badge.success {
      background: #d4edda;
      color: #155724;
    }
    
    .badge.warning {
      background: #fff3cd;
      color: #856404;
    }
    
    .badge.danger {
      background: #f8d7da;
      color: #721c24;
    }
    
    .badge.info {
      background: #d1ecf1;
      color: #0c5460;
    }
    
    .complaints-list {
      padding: 16px;
    }
    
    .complaint-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      transition: background 0.2s;
    }
    
    .complaint-item:hover {
      background: #f8f9fa;
    }
    
    .complaint-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .complaint-icon.high {
      background: #fee;
      color: #e74c3c;
    }
    
    .complaint-icon.medium {
      background: #fff3cd;
      color: #ff9f43;
    }
    
    .complaint-icon.low {
      background: #d1ecf1;
      color: #3498db;
    }
    
    .complaint-info {
      flex: 1;
    }
    
    .complaint-info h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #2c3e50;
    }
    
    .complaint-info p {
      margin: 0;
      font-size: 12px;
      color: #7f8c8d;
    }
    
    .switch-interface {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 24px;
      color: white;
    }
    
    .switch-card {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .switch-card .material-icons {
      font-size: 48px;
    }
    
    .switch-card div {
      flex: 1;
    }
    
    .switch-card h4 {
      margin: 0 0 8px 0;
      font-size: 18px;
    }
    
    .switch-card p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
    
    .switch-card button {
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .switch-card button:hover {
      transform: scale(1.05);
    }
    
    @media (max-width: 768px) {
      .stats-grid,
      .content-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  flatSetupAlerts: FlatSetupAlert[] = [];

  constructor(private userService: UserManagementService) {}

  ngOnInit(): void {
    this.loadFlatSetupAlerts();
  }

  /** Surface flat inventory and user linking gaps on the main admin dashboard. */
  private loadFlatSetupAlerts(): void {
    const societyId = this.userService.getActiveSocietyId();
    if (!societyId) {
      this.flatSetupAlerts = [{
        type: 'warn',
        message: 'No active society selected. Open Society Setup and select a society before linking users or using complaints.',
        link: '/admin/societies',
        linkLabel: 'Society Setup'
      }];
      return;
    }

    this.userService.listFlatsBySociety(societyId).subscribe({
      next: flats => {
        this.flatSetupAlerts = [];
        if (!flats.length) {
          this.flatSetupAlerts.push({
            type: 'warn',
            message: 'No flats in this society. In Society Setup, create a society with “Generate flats” > 0.',
            link: '/admin/societies',
            linkLabel: 'Society Setup'
          });
          return;
        }

        this.userService.getAllUsers().subscribe({
          next: users => {
            const unlinked = users.filter(u => !u.flatId).length;
            if (unlinked > 0) {
              this.flatSetupAlerts.push({
                type: 'info',
                message: `${unlinked} user(s) need a flat linked in the database (not just a flat number on the profile) for mobile complaints.`,
                link: '/admin/users-list',
                linkLabel: 'All Users — link to flat',
                queryParams: { flatLink: 'unlinked' }
              });
            }
          }
        });
      },
      error: () => {
        this.flatSetupAlerts = [{
          type: 'warn',
          message: 'Could not load flats for the active society. Check Society Setup and the API.',
          link: '/admin/societies',
          linkLabel: 'Society Setup'
        }];
      }
    });
  }
}
