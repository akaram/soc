import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import {
  AdminDashboardService,
  AdminDashboardStat,
  AdminDashboardTask,
  AdminDashboardVisitorRow
} from '../../admin/services/admin-dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>{{ societySubtitle }}</p>
      </div>

      <div class="loading-bar" *ngIf="loading">Loading live stats…</div>
      
      <div class="stats-grid">
        <div
          class="stat-card"
          *ngFor="let stat of stats"
          [routerLink]="stat.route || null"
          [class.clickable]="!!stat.route">
          <div class="stat-icon" [style.background]="stat.color">
            <i class="material-icons">{{ stat.icon }}</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div
              class="stat-change"
              *ngIf="stat.change !== undefined && stat.change !== null"
              [class.positive]="stat.change > 0"
              [class.negative]="stat.change < 0">
              <i class="material-icons">{{ stat.change > 0 ? 'trending_up' : 'trending_down' }}</i>
              {{ Math.abs(stat.change) }}%
            </div>
          </div>
        </div>
      </div>
      
      <div class="dashboard-grid">
        <div class="dashboard-card quick-actions">
          <div class="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div class="actions-grid">
            <button class="action-btn" *ngFor="let action of quickActions" [routerLink]="action.route">
              <i class="material-icons">{{ action.icon }}</i>
              <span>{{ action.label }}</span>
            </button>
          </div>
        </div>
        
        <div class="dashboard-card recent-visitors">
          <div class="card-header">
            <h3>Recent Visitors</h3>
            <div class="header-actions">
              <button type="button" class="refresh-btn" (click)="refreshDashboard()" [disabled]="loading" title="Refresh">
                <i class="material-icons">refresh</i>
              </button>
              <a routerLink="/admin/visitors/list" class="view-all">View All</a>
            </div>
          </div>
          <div class="visitor-list">
            <div class="empty-hint" *ngIf="!loading && !recentVisitors.length">
              No visitors in the database for this society yet.
              <a routerLink="/admin/visitors/pre-invite">Add a visitor</a>
            </div>
            <div
              class="visitor-item"
              *ngFor="let visitor of recentVisitors"
              [routerLink]="['/admin/visitors/list']">
              <div class="visitor-avatar">
                <i class="material-icons">person</i>
              </div>
              <div class="visitor-info">
                <div class="visitor-name">{{ visitor.name }}</div>
                <div class="visitor-details">
                  {{ visitor.purpose }} • Flat {{ visitor.flatNumber }} • {{ visitor.time }}
                </div>
              </div>
              <div class="visitor-status" [class]="visitor.status">{{ visitor.status }}</div>
            </div>
          </div>
        </div>
        
        <div class="dashboard-card pending-tasks">
          <div class="card-header">
            <h3>Pending Tasks</h3>
            <div class="header-actions">
              <span class="task-count" *ngIf="actionableTaskCount > 0">{{ actionableTaskCount }}</span>
              <button type="button" class="refresh-btn" (click)="refreshDashboard()" [disabled]="loading" title="Refresh">
                <i class="material-icons">refresh</i>
              </button>
            </div>
          </div>
          <div class="task-list">
            <div
              class="task-item"
              *ngFor="let task of pendingTasks"
              [routerLink]="task.route || null"
              [class.clickable]="!!task.route && !task.placeholder"
              [class.placeholder]="task.placeholder">
              <div class="task-icon" [style.background]="task.color">
                <i class="material-icons">{{ task.icon }}</i>
              </div>
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-time">{{ task.time }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dashboard-card payment-summary">
          <div class="card-header">
            <h3>Payment Summary</h3>
            <div class="header-actions">
              <span class="live-badge">Live from bills API</span>
              <button type="button" class="refresh-btn" (click)="refreshDashboard()" [disabled]="loading" title="Refresh">
                <i class="material-icons">refresh</i>
              </button>
            </div>
          </div>
          <div class="payment-stats" *ngIf="!loadFailed">
            <div class="payment-stat">
              <div class="payment-label">Total Collected</div>
              <div class="payment-value success">{{ formatCurrency(payments.collected) }}</div>
            </div>
            <div class="payment-stat">
              <div class="payment-label">Pending</div>
              <div class="payment-value warning">{{ formatCurrency(payments.pending) }}</div>
            </div>
            <div class="payment-stat">
              <div class="payment-label">Overdue</div>
              <div class="payment-value danger">{{ formatCurrency(payments.overdue) }}</div>
            </div>
          </div>
          <div class="empty-hint" *ngIf="loadFailed">
            Could not load bills. Check active society and bills API.
          </div>
        </div>
      </div>
      
      <div class="module-cards">
        <h2>All Modules</h2>
        <div class="modules-grid">
          <div class="module-card" *ngFor="let module of modules" [routerLink]="module.route">
            <div class="module-icon" [style.background]="module.color">
              <i class="material-icons">{{ module.icon }}</i>
            </div>
            <h4>{{ module.title }}</h4>
            <p>{{ module.description }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .page-header h1 {
      font-size: 28px;
      margin: 0 0 5px 0;
      color: #2c3e50;
    }
    
    .page-header p {
      margin: 0;
      color: #7f8c8d;
    }

    .loading-bar {
      margin: 16px 0 0;
      padding: 10px 14px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      color: #1e40af;
      font-size: 14px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: transform 0.2s;
    }
    
    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    .stat-card.clickable {
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }
    
    .empty-hint {
      padding: 16px;
      text-align: center;
      color: #7f8c8d;
      font-size: 14px;
    }

    .task-item.clickable {
      cursor: pointer;
      border-radius: 8px;
      padding: 4px;
    }

    .task-item.clickable:hover {
      background: #f8f9fa;
    }
    
    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .stat-icon .material-icons {
      font-size: 32px;
    }
    
    .stat-content {
      flex: 1;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 8px;
    }
    
    .stat-change {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .stat-change.positive {
      background: #d4edda;
      color: #155724;
    }
    
    .stat-change.negative {
      background: #f8d7da;
      color: #721c24;
    }
    
    .stat-change .material-icons {
      font-size: 16px;
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .dashboard-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .card-header h3 {
      margin: 0;
      font-size: 18px;
      color: #2c3e50;
    }
    
    .view-all {
      color: #3498db;
      text-decoration: none;
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      color: #64748b;
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .refresh-btn .material-icons {
      font-size: 18px;
    }

    .task-count {
      background: #e74c3c;
      color: white;
      font-size: 12px;
      font-weight: 700;
      min-width: 22px;
      height: 22px;
      border-radius: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }

    .live-badge {
      font-size: 11px;
      font-weight: 600;
      color: #059669;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 4px 8px;
      border-radius: 999px;
    }

    .task-item.placeholder {
      opacity: 0.85;
    }
    
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .action-btn:hover {
      background: #e9ecef;
      border-color: #3498db;
    }
    
    .action-btn .material-icons {
      font-size: 32px;
      color: #3498db;
    }
    
    .visitor-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .visitor-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .visitor-item:hover {
      background: #eef2f7;
    }
    
    .empty-hint a {
      display: inline-block;
      margin-top: 8px;
      color: #3498db;
      font-weight: 600;
    }
    
    .visitor-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3498db;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .visitor-info {
      flex: 1;
    }
    
    .visitor-name {
      font-weight: 500;
      color: #2c3e50;
    }
    
    .visitor-details {
      font-size: 12px;
      color: #7f8c8d;
    }
    
    .visitor-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .visitor-status.approved {
      background: #d4edda;
      color: #155724;
    }
    
    .visitor-status.pending {
      background: #fff3cd;
      color: #856404;
    }

    .visitor-status.checked-in {
      background: #cfe2ff;
      color: #084298;
    }

    .visitor-status.checked-out {
      background: #e2e3e5;
      color: #41464b;
    }

    .visitor-status.rejected {
      background: #f8d7da;
      color: #721c24;
    }
    
    .task-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .task-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .task-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .task-icon .material-icons {
      font-size: 20px;
    }
    
    .task-title {
      font-weight: 500;
      color: #2c3e50;
    }
    
    .task-time {
      font-size: 12px;
      color: #7f8c8d;
    }
    
    .payment-stats {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .payment-stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .payment-value {
      font-size: 20px;
      font-weight: 600;
    }
    
    .payment-value.success { color: #28a745; }
    .payment-value.warning { color: #ffc107; }
    .payment-value.danger { color: #dc3545; }
    
    .module-cards h2 {
      font-size: 24px;
      margin: 40px 0 20px 0;
      color: #2c3e50;
    }
    
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .module-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    
    .module-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .module-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: white;
    }
    
    .module-icon .material-icons {
      font-size: 32px;
    }
    
    .module-card h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #2c3e50;
    }
    
    .module-card p {
      margin: 0;
      font-size: 13px;
      color: #7f8c8d;
    }
    
    @media (max-width: 768px) {
      .stats-grid,
      .dashboard-grid,
      .modules-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  Math = Math;
  loading = true;
  loadFailed = false;
  societySubtitle = 'Loading society overview…';
  stats: AdminDashboardStat[] = [];
  recentVisitors: AdminDashboardVisitorRow[] = [];
  pendingTasks: AdminDashboardTask[] = [];
  payments = { collected: 0, pending: 0, overdue: 0 };
  private navSub?: Subscription;

  /** Actionable tasks only (excludes “all caught up” placeholder). */
  get actionableTaskCount(): number {
    return this.pendingTasks.filter(t => !t.placeholder).length;
  }
  
  quickActions = [
    { label: 'Add Visitor', icon: 'person_add', route: '/admin/visitors/pre-invite' },
    { label: 'Generate Bill', icon: 'receipt', route: '/admin/billing' },
    { label: 'Book Amenity', icon: 'event_available', route: '/admin/amenities' },
    { label: 'Create Complaint', icon: 'report_problem', route: '/admin/complaints' },
    { label: 'AI Assistant', icon: 'smart_toy', route: '/admin/ai-assistant' },
    { label: 'Emergency', icon: 'emergency', route: '/admin/emergency' }
  ];
  
  modules = [
    { title: 'User Management', icon: 'people', route: '/admin/users', color: '#667eea', description: 'Manage residents & tenants' },
    { title: 'Visitor Management', icon: 'group_add', route: '/admin/visitors', color: '#f093fb', description: 'Track all visitors' },
    { title: 'Guard Patrol', icon: 'route', route: '/admin/guard-patrol', color: '#4facfe', description: 'QR/NFC patrol system' },
    { title: 'Billing & Payments', icon: 'payment', route: '/admin/billing', color: '#43e97b', description: 'Generate & collect bills' },
    { title: 'Asset Management', icon: 'inventory_2', route: '/admin/assets', color: '#fa709a', description: 'Track society assets' },
    { title: 'Vendor Management', icon: 'business', route: '/admin/vendors', color: '#feca57', description: 'Manage vendors & POs' },
    { title: 'Amenity Booking', icon: 'event_available', route: '/admin/amenities', color: '#48dbfb', description: 'Book facilities' },
    { title: 'Helpdesk', icon: 'support_agent', route: '/admin/helpdesk', color: '#ff6348', description: 'Support tickets' },
    { title: 'Community', icon: 'forum', route: '/admin/community', color: '#1dd1a1', description: 'Social features' },
    { title: 'Smart Parking', icon: 'local_parking', route: '/admin/parking', color: '#5f27cd', description: 'IoT parking slots' },
    { title: 'AI Assistant', icon: 'smart_toy', route: '/admin/ai-assistant', color: '#00d2d3', description: 'Claude AI support' },
    { title: 'Emergency SOS', icon: 'emergency', route: '/admin/emergency', color: '#ee5a6f', description: 'Panic button & alerts' }
  ];

  constructor(
    private dashboardApi: AdminDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshDashboard();
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url.includes('/admin/dashboard') || this.router.url === '/admin') {
          this.refreshDashboard();
        }
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  refreshDashboard(): void {
    this.loading = true;
    this.loadFailed = false;
    this.dashboardApi.load().subscribe({
      next: data => {
        this.societySubtitle = `${data.societyName} — live overview from your database`;
        this.stats = data.stats;
        this.recentVisitors = data.recentVisitors;
        this.pendingTasks = data.pendingTasks;
        this.payments = data.payments;
        this.loading = false;
        this.loadFailed = false;
      },
      error: () => {
        this.societySubtitle = 'Could not load dashboard — check API and active society';
        this.stats = [];
        this.recentVisitors = [];
        this.pendingTasks = [{
          title: 'Dashboard API unavailable',
          time: 'Select society in Society Setup and verify backend',
          icon: 'error',
          color: '#e74c3c',
          route: '/admin/societies'
        }];
        this.payments = { collected: 0, pending: 0, overdue: 0 };
        this.loading = false;
        this.loadFailed = true;
      }
    });
  }

  formatCurrency(amount: number): string {
    if (amount >= 100000) {
      return `₹ ${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹ ${(amount / 1000).toFixed(1)}K`;
    }
    return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
  }
}
