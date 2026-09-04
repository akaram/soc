import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MobileAuthService, MobileUser } from '../../services/mobile-auth.service';
import { QuickAction, DashboardStats } from '../../models/mobile.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <!-- Welcome Header -->
      <div class="admin-header">
        <div class="admin-info">
          <h2>{{ user?.societyName }}</h2>
          <p>{{ user?.name }} • {{ getRoleLabel() }}</p>
        </div>
        <button class="btn-notifications" [routerLink]="['/mobile/notifications']">
          <i class="material-icons">notifications</i>
          <span class="notif-badge">12</span>
        </button>
      </div>

      <!-- Key Metrics -->
      <div class="metrics-grid">
        <div *ngFor="let metric of keyMetrics" class="metric-card">
          <div class="metric-header">
            <span class="metric-label">{{ metric.label }}</span>
            <i class="material-icons" [style.color]="metric.color">{{ metric.icon }}</i>
          </div>
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-footer">
            <span class="metric-change" [class.positive]="metric.trend === 'up'" [class.negative]="metric.trend === 'down'">
              <i class="material-icons">{{ metric.trend === 'up' ? 'trending_up' : 'trending_down' }}</i>
              {{ metric.change }}
            </span>
            <span class="metric-period">{{ metric.period }}</span>
          </div>
        </div>
      </div>

      <!-- Financial Overview -->
      <div class="section">
        <h3 class="section-title">Financial Overview</h3>
        <div class="financial-card">
          <div class="financial-row">
            <div class="financial-item">
              <span class="financial-label">Total Revenue</span>
              <span class="financial-value positive">245,000 SAR</span>
            </div>
            <div class="financial-item">
              <span class="financial-label">Total Expenses</span>
              <span class="financial-value negative">187,500 SAR</span>
            </div>
          </div>
          <div class="financial-divider"></div>
          <div class="financial-summary">
            <span class="financial-label">Net Income</span>
            <span class="financial-value highlight">57,500 SAR</span>
          </div>
          <div class="financial-chart">
            <div class="chart-bar" [style.width.%]="62" style="background: #10ac84"></div>
            <span class="chart-label">Collection Rate: 62%</span>
          </div>
        </div>
      </div>

      <!-- Menu Items -->
      <div class="section">
        <h3 class="section-title">Menu</h3>
        <div class="menu-grid">
          <a *ngFor="let item of menuItems"
             [routerLink]="item.route"
             class="menu-card">
            <div class="menu-icon" [style.background]="item.color">
              <i class="material-icons">{{ item.icon }}</i>
              <span class="menu-badge" *ngIf="item.badge">{{ item.badge }}</span>
            </div>
            <span class="menu-label">{{ item.label }}</span>
          </a>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h3 class="section-title">Quick Actions</h3>
        <div class="admin-actions">
          <a *ngFor="let action of adminActions"
             [routerLink]="action.route"
             class="admin-action-card">
            <div class="action-icon" [style.background]="action.color">
              <i class="material-icons">{{ action.icon }}</i>
              <span class="action-badge" *ngIf="action.badge">{{ action.badge }}</span>
            </div>
            <span class="action-label">{{ action.label }}</span>
          </a>
        </div>
      </div>

      <!-- Pending Approvals -->
      <div class="section" *ngIf="pendingApprovals.length > 0">
        <div class="section-header">
          <h3 class="section-title">Pending Approvals</h3>
          <span class="count-badge">{{ pendingApprovals.length }}</span>
        </div>
        <div class="approval-list">
          <div *ngFor="let approval of pendingApprovals" class="approval-card">
            <div class="approval-icon" [style.background]="getApprovalColor(approval.type)">
              <i class="material-icons">{{ getApprovalIcon(approval.type) }}</i>
            </div>
            <div class="approval-content">
              <h4>{{ approval.title }}</h4>
              <p>{{ approval.requester }} • {{ approval.flat }}</p>
              <span class="approval-time">{{ approval.time }}</span>
            </div>
            <div class="approval-actions">
              <button class="btn-approve" (click)="approveRequest(approval.id)">
                <i class="material-icons">check</i>
              </button>
              <button class="btn-reject" (click)="rejectRequest(approval.id)">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Occupancy Status -->
      <div class="section">
        <h3 class="section-title">Occupancy Status</h3>
        <div class="occupancy-card">
          <div class="occupancy-stats">
            <div class="occupancy-item">
              <div class="occupancy-circle occupied">
                <span>{{ occupancyData.occupied }}</span>
              </div>
              <span class="occupancy-label">Occupied</span>
            </div>
            <div class="occupancy-item">
              <div class="occupancy-circle vacant">
                <span>{{ occupancyData.vacant }}</span>
              </div>
              <span class="occupancy-label">Vacant</span>
            </div>
            <div class="occupancy-item">
              <div class="occupancy-circle rented">
                <span>{{ occupancyData.rented }}</span>
              </div>
              <span class="occupancy-label">Rented</span>
            </div>
          </div>
          <div class="occupancy-bar">
            <div class="bar-segment occupied" [style.width.%]="(occupancyData.occupied / occupancyData.total) * 100"></div>
            <div class="bar-segment rented" [style.width.%]="(occupancyData.rented / occupancyData.total) * 100"></div>
            <div class="bar-segment vacant" [style.width.%]="(occupancyData.vacant / occupancyData.total) * 100"></div>
          </div>
          <p class="occupancy-total">Total Units: {{ occupancyData.total }}</p>
        </div>
      </div>

      <!-- Active Complaints -->
      <div class="section">
        <div class="section-header">
          <h3 class="section-title">Active Complaints</h3>
          <a [routerLink]="['/mobile/complaints']" class="see-all">View All</a>
        </div>
        <div class="complaints-summary">
          <div class="complaint-stat urgent">
            <span class="stat-number">{{ complaintStats.urgent }}</span>
            <span class="stat-label">Urgent</span>
          </div>
          <div class="complaint-stat high">
            <span class="stat-number">{{ complaintStats.high }}</span>
            <span class="stat-label">High</span>
          </div>
          <div class="complaint-stat medium">
            <span class="stat-number">{{ complaintStats.medium }}</span>
            <span class="stat-label">Medium</span>
          </div>
          <div class="complaint-stat low">
            <span class="stat-number">{{ complaintStats.low }}</span>
            <span class="stat-label">Low</span>
          </div>
        </div>
      </div>

      <!-- Recent Activities -->
      <div class="section">
        <h3 class="section-title">Recent Activities</h3>
        <div class="activity-feed">
          <div *ngFor="let activity of recentActivities" class="activity-item">
            <div class="activity-avatar" [style.background]="activity.color">
              <i class="material-icons">{{ activity.icon }}</i>
            </div>
            <div class="activity-details">
              <p class="activity-text">{{ activity.text }}</p>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="section">
        <h3 class="section-title">This Month</h3>
        <div class="stats-row">
          <div class="stat-box">
            <i class="material-icons">people</i>
            <span class="stat-value">{{ monthlyStats.newResidents }}</span>
            <span class="stat-label">New Residents</span>
          </div>
          <div class="stat-box">
            <i class="material-icons">celebration</i>
            <span class="stat-value">{{ monthlyStats.events }}</span>
            <span class="stat-label">Events Held</span>
          </div>
          <div class="stat-box">
            <i class="material-icons">build</i>
            <span class="stat-value">{{ monthlyStats.maintenanceWorks }}</span>
            <span class="stat-label">Maintenance</span>
          </div>
          <div class="stat-box">
            <i class="material-icons">group</i>
            <span class="stat-value">{{ monthlyStats.visitors }}</span>
            <span class="stat-label">Visitors</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 16px;
      padding-bottom: 80px;
      background: #f5f7fa;
    }

    .admin-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
    }

    .admin-info h2 {
      margin: 0 0 6px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .admin-info p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .btn-notifications {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
    }

    .notif-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      background: #ff4757;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 600;
      min-width: 18px;
      text-align: center;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .metric-label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .metric-header .material-icons {
      font-size: 20px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .metric-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .metric-change {
      display: flex;
      align-items: center;
      gap: 2px;
      font-weight: 600;
    }

    .metric-change.positive {
      color: #10ac84;
    }

    .metric-change.negative {
      color: #ff6b6b;
    }

    .metric-change .material-icons {
      font-size: 14px;
    }

    .metric-period {
      color: #999;
    }

    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 16px 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .count-badge {
      background: #ff4757;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .see-all {
      color: #667eea;
      font-size: 14px;
      text-decoration: none;
      font-weight: 500;
    }

    .financial-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .financial-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }

    .financial-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .financial-label {
      font-size: 13px;
      color: #666;
    }

    .financial-value {
      font-size: 18px;
      font-weight: 700;
    }

    .financial-value.positive {
      color: #10ac84;
    }

    .financial-value.negative {
      color: #ff6b6b;
    }

    .financial-value.highlight {
      color: #667eea;
      font-size: 22px;
    }

    .financial-divider {
      height: 1px;
      background: #e0e0e0;
      margin: 16px 0;
    }

    .financial-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .financial-chart {
      position: relative;
    }

    .chart-bar {
      height: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .chart-label {
      font-size: 12px;
      color: #666;
    }

    .menu-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .menu-card {
      background: white;
      padding: 16px 12px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: #2c3e50;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s;
    }

    .menu-card:active {
      transform: scale(0.95);
    }

    .menu-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .menu-icon .material-icons {
      font-size: 28px;
      color: white;
    }

    .menu-label {
      font-size: 12px;
      font-weight: 500;
      display: block;
    }

    .menu-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff4757;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      font-weight: 600;
    }

    .admin-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .admin-action-card {
      background: white;
      padding: 16px 12px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: #2c3e50;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s;
    }

    .admin-action-card:active {
      transform: scale(0.95);
    }

    .action-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      position: relative;
    }

    .action-icon .material-icons {
      font-size: 28px;
    }

    .action-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff4757;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      border: 2px solid white;
    }

    .action-label {
      font-size: 12px;
      font-weight: 500;
      display: block;
    }

    .approval-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .approval-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      display: flex;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .approval-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .approval-icon .material-icons {
      font-size: 24px;
    }

    .approval-content {
      flex: 1;
    }

    .approval-content h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      color: #2c3e50;
    }

    .approval-content p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #666;
    }

    .approval-time {
      font-size: 11px;
      color: #999;
    }

    .approval-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-approve, .btn-reject {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .btn-approve {
      background: #10ac84;
      color: white;
    }

    .btn-reject {
      background: #ff6b6b;
      color: white;
    }

    .occupancy-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .occupancy-stats {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;
    }

    .occupancy-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .occupancy-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      font-weight: 700;
    }

    .occupancy-circle.occupied {
      background: #10ac84;
    }

    .occupancy-circle.vacant {
      background: #ff9f43;
    }

    .occupancy-circle.rented {
      background: #667eea;
    }

    .occupancy-label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .occupancy-bar {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .bar-segment.occupied {
      background: #10ac84;
    }

    .bar-segment.rented {
      background: #667eea;
    }

    .bar-segment.vacant {
      background: #ff9f43;
    }

    .occupancy-total {
      text-align: center;
      font-size: 13px;
      color: #666;
      margin: 0;
    }

    .complaints-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .complaint-stat {
      background: white;
      padding: 16px 12px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-top: 3px solid;
    }

    .complaint-stat.urgent {
      border-top-color: #ff4757;
    }

    .complaint-stat.high {
      border-top-color: #ff6b6b;
    }

    .complaint-stat.medium {
      border-top-color: #ff9f43;
    }

    .complaint-stat.low {
      border-top-color: #10ac84;
    }

    .stat-number {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      display: block;
      font-size: 11px;
      color: #666;
      font-weight: 500;
    }

    .activity-feed {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .activity-item {
      background: white;
      padding: 12px;
      border-radius: 12px;
      display: flex;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .activity-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .activity-avatar .material-icons {
      font-size: 20px;
    }

    .activity-details {
      flex: 1;
    }

    .activity-text {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .activity-time {
      font-size: 12px;
      color: #999;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .stat-box {
      background: white;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .stat-box .material-icons {
      font-size: 32px;
      color: #667eea;
      margin-bottom: 8px;
    }

    .stat-box .stat-value {
      display: block;
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-box .stat-label {
      display: block;
      font-size: 12px;
      color: #666;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  user: MobileUser | null = null;

  keyMetrics: DashboardStats[] = [
    { label: 'Total Revenue', value: '245K SAR', icon: 'payments', color: '#10ac84', trend: 'up', change: '+12%', period: 'vs last month' },
    { label: 'Collection Rate', value: '62%', icon: 'pie_chart', color: '#667eea', trend: 'down', change: '-5%', period: 'vs last month' },
    { label: 'Active Residents', value: '156', icon: 'group', color: '#ff9f43', trend: 'up', change: '+3', period: 'this month' },
    { label: 'Open Complaints', value: '24', icon: 'report_problem', color: '#ff6b6b', trend: 'down', change: '-8', period: 'vs last week' }
  ];

  menuItems: QuickAction[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/mobile/admin/dashboard', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { icon: 'group', label: 'User Management', route: '/mobile/user-management', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { icon: 'upload', label: 'Bulk Import', route: '/mobile/bulk-import', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { icon: 'receipt', label: 'Billing', route: '/mobile/payments', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { icon: 'support_agent', label: 'Complaints', route: '/mobile/complaints', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { icon: 'event_available', label: 'Amenities', route: '/mobile/amenities', color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
    { icon: 'settings', label: 'Settings', route: '/mobile/settings', color: 'linear-gradient(135deg, #95afc0 0%, #c9ced6 100%)' }
  ];

  adminActions: QuickAction[] = [
    { icon: 'campaign', label: 'Announce', route: '/mobile/announcements/add', color: '#667eea' },
    { icon: 'people_alt', label: 'Users', route: '/mobile/user-management', color: '#10ac84', badge: 3 },
    { icon: 'receipt_long', label: 'Billing', route: '/mobile/payments', color: '#ff9f43' },
    { icon: 'event', label: 'Events', route: '/mobile/events', color: '#764ba2' }
  ];

  pendingApprovals = [
    {
      id: '1',
      type: 'moveout',
      title: 'Move-out Request',
      requester: 'Ahmed Khan',
      flat: 'A-501',
      time: '2h ago'
    },
    {
      id: '2',
      type: 'renovation',
      title: 'Renovation Permission',
      requester: 'Sarah Ali',
      flat: 'B-302',
      time: '5h ago'
    },
    {
      id: '3',
      type: 'pet',
      title: 'Pet Registration',
      requester: 'Mohammed Rashid',
      flat: 'C-105',
      time: '1d ago'
    }
  ];

  occupancyData = {
    total: 200,
    occupied: 120,
    rented: 36,
    vacant: 44
  };

  complaintStats = {
    urgent: 3,
    high: 8,
    medium: 10,
    low: 3
  };

  recentActivities = [
    {
      icon: 'person_add',
      text: 'New resident registered - Flat D-401',
      time: '15m ago',
      color: '#10ac84'
    },
    {
      icon: 'payment',
      text: 'Payment received - 15,000 SAR from Flat A-501',
      time: '1h ago',
      color: '#667eea'
    },
    {
      icon: 'check_circle',
      text: 'Complaint resolved - Pool maintenance',
      time: '2h ago',
      color: '#10ac84'
    },
    {
      icon: 'event',
      text: 'Event created - Annual Sports Day',
      time: '3h ago',
      color: '#ff9f43'
    }
  ];

  monthlyStats = {
    newResidents: 5,
    events: 3,
    maintenanceWorks: 24,
    visitors: 342
  };

  constructor(private authService: MobileAuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  getRoleLabel(): string {
    const labels: Record<string, string> = {
      'SUPER_ADMIN': 'Super Administrator',
      'SOCIETY_ADMIN': 'Society Admin',
      'COMMITTEE_MEMBER': 'Committee Member'
    };
    return this.user?.role ? labels[this.user.role] || 'Admin' : 'Admin';
  }

  getApprovalIcon(type: string): string {
    const icons: Record<string, string> = {
      'moveout': 'moving',
      'renovation': 'construction',
      'pet': 'pets',
      'parking': 'local_parking',
      'amenity': 'event_available'
    };
    return icons[type] || 'approval';
  }

  getApprovalColor(type: string): string {
    const colors: Record<string, string> = {
      'moveout': '#ff6b6b',
      'renovation': '#ff9f43',
      'pet': '#10ac84',
      'parking': '#667eea',
      'amenity': '#764ba2'
    };
    return colors[type] || '#667eea';
  }

  approveRequest(id: string) {
    console.log('Approving request:', id);
    this.pendingApprovals = this.pendingApprovals.filter(a => a.id !== id);
    // Add API call here
  }

  rejectRequest(id: string) {
    console.log('Rejecting request:', id);
    this.pendingApprovals = this.pendingApprovals.filter(a => a.id !== id);
    // Add API call here
  }
}
