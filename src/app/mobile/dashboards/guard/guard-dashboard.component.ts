import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MobileAuthService, MobileUser } from '../../services/mobile-auth.service';
import { QuickAction, DashboardStats, Visitor, PatrolRoute } from '../../models/mobile.models';

@Component({
  selector: 'app-guard-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="guard-dashboard">
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div class="welcome-content">
          <h2>Welcome, {{ user?.name }}!</h2>
          <p>{{ currentShift }} • {{ getCurrentTime() }}</p>
        </div>
        <div class="shift-status {{ shiftStatus }}">
          <i class="material-icons">schedule</i>
          <span>{{ shiftStatus === 'on-duty' ? 'On Duty' : 'Off Duty' }}</span>
        </div>
      </div>

      <!-- Gate CTA: cook / domestic staff approve -->
      <a class="staff-gate-cta" routerLink="/mobile/guard/domestic-staff">
        <div class="cta-icon"><i class="material-icons">restaurant</i></div>
        <div class="cta-text">
          <strong>Approve cook / staff</strong>
          <span>View photo, flat &amp; ID, then allow entry</span>
        </div>
        <i class="material-icons">chevron_right</i>
      </a>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div *ngFor="let stat of stats" class="stat-card" [style.border-left-color]="stat.color">
          <div class="stat-header">
            <i class="material-icons" [style.color]="stat.color">{{ stat.icon }}</i>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-trend" *ngIf="stat.trend">
            <i class="material-icons">{{ stat.trend === 'up' ? 'trending_up' : 'trending_down' }}</i>
            <span>{{ stat.trendValue }}</span>
          </div>
        </div>
      </div>

      <!-- Menu Items -->
      <div class="section">
        <h3 class="section-title">Menu</h3>
        <div class="menu-grid">
          <a *ngFor="let item of menuItems" 
             [routerLink]="item.route" 
             class="menu-card"
             [style.background]="item.color">
            <i class="material-icons">{{ item.icon }}</i>
            <span>{{ item.label }}</span>
            <div class="menu-badge" *ngIf="item.badge">{{ item.badge }}</div>
          </a>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h3 class="section-title">Quick Actions</h3>
        <div class="quick-actions">
          <a *ngFor="let action of quickActions" 
             [routerLink]="action.route" 
             class="action-card"
             [style.background]="action.color">
            <i class="material-icons">{{ action.icon }}</i>
            <span>{{ action.label }}</span>
            <div class="action-badge" *ngIf="action.badge">{{ action.badge }}</div>
          </a>
        </div>
      </div>

      <!-- Pending Visitors -->
      <div class="section" *ngIf="pendingVisitors.length > 0">
        <div class="section-header">
          <h3 class="section-title">Pending Approvals</h3>
          <span class="badge-count">{{ pendingVisitors.length }}</span>
        </div>
        <div class="visitor-list">
          <div *ngFor="let visitor of pendingVisitors" class="visitor-card">
            <div class="visitor-avatar">
              <i class="material-icons">person</i>
            </div>
            <div class="visitor-info">
              <h4>{{ visitor.name }}</h4>
              <p>{{ visitor.purpose }} • {{ visitor.visitingFlat }}</p>
              <span class="time-stamp">{{ getTimeAgo(visitor.entryTime) }}</span>
            </div>
            <div class="visitor-actions">
              <button class="btn-approve" (click)="approveVisitor(visitor.id)">
                <i class="material-icons">check_circle</i>
              </button>
              <button class="btn-reject" (click)="rejectVisitor(visitor.id)">
                <i class="material-icons">cancel</i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Patrol Route -->
      <div class="section" *ngIf="activePatrol">
        <h3 class="section-title">Active Patrol</h3>
        <div class="patrol-card">
          <div class="patrol-header">
            <h4>{{ activePatrol.name }}</h4>
            <span class="patrol-status active">In Progress</span>
          </div>
          <div class="patrol-progress">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="patrolProgress"></div>
            </div>
            <p>{{ completedCheckpoints }}/{{ activePatrol.checkpoints.length }} checkpoints</p>
          </div>
          <button class="btn-primary" [routerLink]="['/mobile/patrol']">
            <i class="material-icons">route</i>
            Continue Patrol
          </button>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="section">
        <h3 class="section-title">Recent Activity</h3>
        <div class="activity-list">
          <div *ngFor="let activity of recentActivity" class="activity-item">
            <div class="activity-icon" [style.background]="activity.color">
              <i class="material-icons">{{ activity.icon }}</i>
            </div>
            <div class="activity-content">
              <p class="activity-text">{{ activity.text }}</p>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Emergency Contacts -->
      <div class="section">
        <h3 class="section-title">Emergency Contacts</h3>
        <div class="contact-grid">
          <a *ngFor="let contact of emergencyContacts" 
             href="tel:{{ contact.phone }}" 
             class="contact-card">
            <i class="material-icons">{{ contact.icon }}</i>
            <span>{{ contact.label }}</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .staff-gate-cta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 16px 16px;
      padding: 14px 16px;
      border-radius: 14px;
      text-decoration: none;
      color: #fff;
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      box-shadow: 0 4px 14px rgba(15, 118, 110, 0.35);
    }
    .staff-gate-cta .cta-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
    }
    .staff-gate-cta .cta-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .staff-gate-cta .cta-text strong { font-size: 15px; }
    .staff-gate-cta .cta-text span { font-size: 12px; opacity: 0.9; }
    .guard-dashboard {
      padding: 16px;
      padding-bottom: 80px;
    }

    .welcome-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .welcome-content h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .welcome-content p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .shift-status {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
    }

    .shift-status.on-duty {
      background: rgba(46, 213, 115, 0.3);
    }

    .shift-status .material-icons {
      font-size: 18px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-left: 4px solid;
    }

    .stat-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .stat-header .material-icons {
      font-size: 20px;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #10ac84;
    }

    .stat-trend .material-icons {
      font-size: 16px;
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

    .badge-count {
      background: #ff4757;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .menu-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .menu-card {
      background: white;
      padding: 20px 12px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
      transition: transform 0.2s;
      min-height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .menu-card:active {
      transform: scale(0.95);
    }

    .menu-card .material-icons {
      font-size: 32px;
      margin-bottom: 4px;
    }

    .menu-card span {
      font-size: 12px;
      font-weight: 500;
      display: block;
    }

    .menu-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.9);
      color: #ff4444;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      font-weight: 600;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .action-card {
      background: white;
      padding: 20px 12px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
      transition: transform 0.2s;
    }

    .action-card:active {
      transform: scale(0.95);
    }

    .action-card .material-icons {
      font-size: 32px;
      margin-bottom: 8px;
      display: block;
    }

    .action-card span {
      font-size: 12px;
      font-weight: 500;
      display: block;
    }

    .action-badge {
      position: absolute;
      top: 8px;
      right: 8px;
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
    }

    .visitor-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .visitor-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .visitor-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .visitor-info {
      flex: 1;
    }

    .visitor-info h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      color: #2c3e50;
    }

    .visitor-info p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #666;
    }

    .time-stamp {
      font-size: 11px;
      color: #999;
    }

    .visitor-actions {
      display: flex;
      gap: 8px;
    }

    .btn-approve, .btn-reject {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .btn-approve {
      background: #10ac84;
      color: white;
    }

    .btn-reject {
      background: #ff4757;
      color: white;
    }

    .btn-approve:active, .btn-reject:active {
      transform: scale(0.9);
    }

    .patrol-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .patrol-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .patrol-header h4 {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .patrol-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .patrol-status.active {
      background: #10ac84;
      color: white;
    }

    .patrol-progress {
      margin-bottom: 16px;
    }

    .progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s;
    }

    .patrol-progress p {
      margin: 0;
      font-size: 13px;
      color: #666;
    }

    .btn-primary {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .activity-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: white;
      border-radius: 8px;
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .activity-content {
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

    .contact-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .contact-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: #2c3e50;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s;
    }

    .contact-card:active {
      transform: scale(0.95);
    }

    .contact-card .material-icons {
      font-size: 32px;
      color: #ff4757;
      margin-bottom: 8px;
    }

    .contact-card span {
      font-size: 13px;
      font-weight: 500;
      display: block;
    }
  `]
})
export class GuardDashboardComponent implements OnInit {
  user: MobileUser | null = null;
  currentShift = 'Morning Shift';
  shiftStatus = 'on-duty';
  
  stats: DashboardStats[] = [
    { label: 'Today\'s Visitors', value: '24', icon: 'group', color: '#667eea', trend: 'up', trendValue: '+12%' },
    { label: 'Pending', value: '3', icon: 'pending', color: '#ff9f43', trend: 'down', trendValue: '-5%' },
    { label: 'Packages', value: '8', icon: 'local_shipping', color: '#10ac84' },
    { label: 'Patrol Done', value: '2/4', icon: 'route', color: '#ee5a6f' }
  ];

  menuItems: QuickAction[] = [
    { icon: 'security', label: 'Patrol', route: '/mobile/guard/patrol', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { icon: 'check_circle', label: 'Attendance', route: '/mobile/guard/attendance', color: 'linear-gradient(135deg, #10ac84 0%, #1dd1a1 100%)' },
    { icon: 'group_add', label: 'Visitor Approvals', route: '/mobile/guard/visitor-approvals', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { icon: 'restaurant', label: 'Cooks & Staff', route: '/mobile/guard/domestic-staff', color: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' },
    { icon: 'vpn_key', label: 'Staff Passcode', route: '/mobile/guard/domestic-staff/verify', color: 'linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)' },
    { icon: 'report', label: 'Incidents', route: '/mobile/guard/incidents', color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' },
    { icon: 'package', label: 'Package Holding', route: '/mobile/guard/packages', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { icon: 'settings', label: 'Settings', route: '/mobile/settings', color: 'linear-gradient(135deg, #95afc0 0%, #c9ced6 100%)' }
  ];

  quickActions: QuickAction[] = [
    { icon: 'qr_code_scanner', label: 'Scan QR', route: '/mobile/guard/scan', color: '#667eea' },
    { icon: 'vpn_key', label: 'Staff Code', route: '/mobile/guard/domestic-staff/verify', color: '#0f766e' },
    { icon: 'restaurant', label: 'Approve Cook', route: '/mobile/guard/domestic-staff', color: '#0369a1' },
    { icon: 'route', label: 'Start Patrol', route: '/mobile/guard/patrol', color: '#ff9f43' }
  ];

  pendingVisitors: Visitor[] = [
    {
      id: '1',
      name: 'Ahmed Al-Rashid',
      phone: '+966 50 123 4567',
      purpose: 'Personal Visit',
      visitingFlat: 'A-501',
      status: 'pending',
      entryTime: new Date(Date.now() - 300000) // 5 minutes ago
    },
    {
      id: '2',
      name: 'Sarah Mohammed',
      phone: '+966 55 987 6543',
      purpose: 'Delivery',
      visitingFlat: 'B-302',
      status: 'pending',
      vehicleNumber: 'ABC 1234',
      entryTime: new Date(Date.now() - 120000) // 2 minutes ago
    },
    {
      id: '3',
      name: 'Contractor - Plumbing',
      phone: '+966 50 555 1234',
      purpose: 'Maintenance',
      visitingFlat: 'C-105',
      status: 'pending',
      entryTime: new Date(Date.now() - 60000) // 1 minute ago
    }
  ];

  activePatrol: PatrolRoute | null = {
    id: 'patrol-1',
    name: 'North Wing Patrol',
    checkpoints: [
      { id: 'cp1', name: 'North Gate', location: 'Main Entrance', qrCode: 'QR001', sequence: 1 },
      { id: 'cp2', name: 'Parking Area', location: 'Basement', qrCode: 'QR002', sequence: 2 },
      { id: 'cp3', name: 'Pool Area', location: 'Ground Floor', qrCode: 'QR003', sequence: 3 },
      { id: 'cp4', name: 'Gym', location: 'First Floor', qrCode: 'QR004', sequence: 4 }
    ],
    frequency: 'every-2-hours',
    assignedTo: 'guard-001',
    status: 'active'
  };

  completedCheckpoints = 2;
  patrolProgress = 50;

  recentActivity = [
    { icon: 'check_circle', text: 'Visitor approved for Flat A-501', time: '5 mins ago', color: '#10ac84' },
    { icon: 'local_shipping', text: 'Package received for Flat B-203', time: '15 mins ago', color: '#667eea' },
    { icon: 'qr_code', text: 'Checkpoint scanned - Pool Area', time: '30 mins ago', color: '#ff9f43' },
    { icon: 'report_problem', text: 'Incident reported - Parking', time: '1 hour ago', color: '#ff4757' }
  ];

  emergencyContacts = [
    { icon: 'local_hospital', label: 'Ambulance', phone: '997' },
    { icon: 'local_fire_department', label: 'Fire', phone: '998' },
    { icon: 'local_police', label: 'Police', phone: '999' },
    { icon: 'support_agent', label: 'Admin', phone: '+966501234567' }
  ];

  constructor(private authService: MobileAuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  getTimeAgo(date?: Date): string {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  approveVisitor(id: string) {
    console.log('Approving visitor:', id);
    this.pendingVisitors = this.pendingVisitors.filter(v => v.id !== id);
    // Add API call here
  }

  rejectVisitor(id: string) {
    console.log('Rejecting visitor:', id);
    this.pendingVisitors = this.pendingVisitors.filter(v => v.id !== id);
    // Add API call here
  }
}
