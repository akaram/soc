import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MobileAuthService, MobileUser } from '../../services/mobile-auth.service';
import { QuickAction, DashboardStats } from '../../models/mobile.models';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed';
  location?: string;
}

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="staff-dashboard">
      <!-- Header Card -->
      <div class="header-card">
        <div class="staff-info">
          <h2>Hello, {{ user?.name }}!</h2>
          <p class="role-tag">{{ getRoleLabel() }}</p>
          <div class="attendance-status">
            <div class="status-dot" [class.active]="isCheckedIn"></div>
            <span>{{ isCheckedIn ? 'Checked In' : 'Not Checked In' }}</span>
            <span class="time" *ngIf="checkInTime">{{ checkInTime }}</span>
          </div>
        </div>
        <button class="btn-attendance" 
                [class.checked-in]="isCheckedIn"
                (click)="toggleAttendance()">
          <i class="material-icons">{{ isCheckedIn ? 'check_circle' : 'fingerprint' }}</i>
          <span>{{ isCheckedIn ? 'Check Out' : 'Check In' }}</span>
        </button>
      </div>

      <!-- Stats Row -->
      <div class="stats-grid">
        <div *ngFor="let stat of stats" class="stat-card" [style.border-left-color]="stat.color">
          <div class="stat-icon" [style.background]="stat.color">
            <i class="material-icons">{{ stat.icon }}</i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Field ops only — no Users / Billing / Amenities admin -->
      <div class="section">
        <h3 class="section-title">Field Ops</h3>
        <div class="actions-grid">
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

      <!-- Today's Tasks -->
      <div class="section" *ngIf="showFieldOps">
        <div class="section-header">
          <h3 class="section-title">Today's Tasks</h3>
          <span class="task-count">{{ pendingTasks.length }} pending</span>
        </div>
        
        <div class="tasks-list">
          <div *ngFor="let task of todayTasks" 
               class="task-card"
               [class.urgent]="task.priority === 'urgent'">
            <div class="task-priority" [class]="task.priority"></div>
            <div class="task-main">
              <div class="task-header">
                <h4>{{ task.title }}</h4>
                <span class="task-badge" [class]="task.status">
                  {{ task.status === 'in-progress' ? 'In Progress' : 
                     task.status === 'completed' ? 'Done' : 'Pending' }}
                </span>
              </div>
              <div class="task-meta">
                <span class="task-category">
                  <i class="material-icons">{{ getCategoryIcon(task.category) }}</i>
                  {{ task.category }}
                </span>
                <span class="task-location" *ngIf="task.location">
                  <i class="material-icons">location_on</i>
                  {{ task.location }}
                </span>
              </div>
              <div class="task-time">
                <i class="material-icons">schedule</i>
                Due: {{ formatTime(task.dueDate) }}
              </div>
            </div>
            <div class="task-actions">
              <button class="btn-task-action" 
                      [class.completed]="task.status === 'completed'"
                      (click)="updateTaskStatus(task.id)">
                <i class="material-icons">
                  {{ task.status === 'completed' ? 'check_circle' : 'radio_button_unchecked' }}
                </i>
              </button>
            </div>
          </div>
        </div>

        <button class="btn-view-all" [routerLink]="['/mobile/staff/tasks']">
          <span>View All Tasks</span>
          <i class="material-icons">arrow_forward</i>
        </button>
      </div>

      <!-- Recent Activity -->
      <div class="section">
        <h3 class="section-title">Recent Activity</h3>
        <div class="activity-timeline">
          <div *ngFor="let activity of recentActivity" class="activity-item">
            <div class="activity-time">{{ activity.time }}</div>
            <div class="activity-line">
              <div class="activity-dot" [style.background]="activity.color"></div>
            </div>
            <div class="activity-content">
              <div class="activity-icon" [style.background]="activity.color">
                <i class="material-icons">{{ activity.icon }}</i>
              </div>
              <div class="activity-text">
                <p>{{ activity.text }}</p>
                <span class="activity-location" *ngIf="activity.location">{{ activity.location }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Asset Quick Scan -->
      <div class="section" *ngIf="showAssetSection">
        <h3 class="section-title">Asset Management</h3>
        <div class="asset-scan-card">
          <div class="scan-icon">
            <i class="material-icons">qr_code_scanner</i>
          </div>
          <div class="scan-content">
            <h4>Scan Asset QR Code</h4>
            <p>Quickly update asset status or log maintenance</p>
          </div>
          <button class="btn-scan" [routerLink]="['/mobile/staff/scan']">
            Scan
          </button>
        </div>
      </div>

      <!-- Attendance Summary -->
      <div class="section">
        <h3 class="section-title">This Month</h3>
        <div class="attendance-summary">
          <div class="summary-item">
            <div class="summary-icon present">
              <i class="material-icons">check_circle</i>
            </div>
            <div class="summary-details">
              <span class="summary-value">22</span>
              <span class="summary-label">Present</span>
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-icon absent">
              <i class="material-icons">cancel</i>
            </div>
            <div class="summary-details">
              <span class="summary-value">1</span>
              <span class="summary-label">Absent</span>
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-icon leave">
              <i class="material-icons">event_busy</i>
            </div>
            <div class="summary-details">
              <span class="summary-value">2</span>
              <span class="summary-label">Leave</span>
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-icon overtime">
              <i class="material-icons">access_time</i>
            </div>
            <div class="summary-details">
              <span class="summary-value">5h</span>
              <span class="summary-label">Overtime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .staff-dashboard {
      padding: 16px;
      padding-bottom: 80px;
      background: #f5f7fa;
    }

    .header-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      border-radius: 20px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
    }

    .staff-info h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 600;
    }

    .role-tag {
      display: inline-block;
      background: rgba(255,255,255,0.25);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      margin-bottom: 12px;
    }

    .attendance-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255,255,255,0.4);
    }

    .status-dot.active {
      background: #10ac84;
      box-shadow: 0 0 0 3px rgba(16, 172, 132, 0.3);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .attendance-status .time {
      margin-left: auto;
      font-size: 12px;
      opacity: 0.9;
    }

    .btn-attendance {
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 20px;
      border-radius: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 90px;
      transition: all 0.2s;
    }

    .btn-attendance.checked-in {
      background: #ff6b6b;
      color: white;
    }

    .btn-attendance .material-icons {
      font-size: 28px;
    }

    .btn-attendance span {
      font-size: 11px;
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
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-left: 4px solid;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .stat-icon .material-icons {
      font-size: 24px;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
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

    .task-count {
      background: #ff9f43;
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

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .action-card {
      padding: 20px 12px;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
      font-size: 11px;
      font-weight: 600;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .task-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      display: flex;
      position: relative;
      overflow: hidden;
    }

    .task-card.urgent {
      border: 2px solid #ff4757;
    }

    .task-priority {
      width: 4px;
      background: #10ac84;
    }

    .task-priority.medium {
      background: #ff9f43;
    }

    .task-priority.high {
      background: #ff6b6b;
    }

    .task-priority.urgent {
      background: #ff4757;
      animation: pulse-priority 1.5s infinite;
    }

    @keyframes pulse-priority {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .task-main {
      flex: 1;
      padding: 16px;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .task-header h4 {
      margin: 0;
      font-size: 15px;
      color: #2c3e50;
      flex: 1;
    }

    .task-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      margin-left: 8px;
    }

    .task-badge.pending {
      background: #fff3cd;
      color: #856404;
    }

    .task-badge.in-progress {
      background: #cfe2ff;
      color: #084298;
    }

    .task-badge.completed {
      background: #d4edda;
      color: #155724;
    }

    .task-meta {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #666;
    }

    .task-category, .task-location {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .task-category .material-icons,
    .task-location .material-icons {
      font-size: 16px;
    }

    .task-time {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #999;
    }

    .task-time .material-icons {
      font-size: 14px;
    }

    .task-actions {
      display: flex;
      align-items: center;
      padding: 16px;
    }

    .btn-task-action {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
    }

    .btn-task-action .material-icons {
      font-size: 28px;
      color: #ccc;
      transition: all 0.2s;
    }

    .btn-task-action.completed .material-icons {
      color: #10ac84;
    }

    .btn-view-all {
      width: 100%;
      padding: 14px;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .activity-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .activity-item {
      display: grid;
      grid-template-columns: 60px 20px 1fr;
      gap: 12px;
    }

    .activity-time {
      font-size: 12px;
      color: #999;
      text-align: right;
      padding-top: 4px;
    }

    .activity-line {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .activity-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 0 2px currentColor;
    }

    .activity-content {
      display: flex;
      gap: 12px;
      background: white;
      padding: 12px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .activity-icon .material-icons {
      font-size: 20px;
    }

    .activity-text {
      flex: 1;
    }

    .activity-text p {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .activity-location {
      font-size: 12px;
      color: #999;
    }

    .asset-scan-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .scan-icon {
      width: 60px;
      height: 60px;
      background: rgba(255,255,255,0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scan-icon .material-icons {
      font-size: 36px;
    }

    .scan-content {
      flex: 1;
    }

    .scan-content h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
    }

    .scan-content p {
      margin: 0;
      font-size: 13px;
      opacity: 0.9;
    }

    .btn-scan {
      background: white;
      color: #667eea;
      border: none;
      padding: 10px 24px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .attendance-summary {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .summary-item {
      background: white;
      padding: 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .summary-icon.present {
      background: #10ac84;
    }

    .summary-icon.absent {
      background: #ff6b6b;
    }

    .summary-icon.leave {
      background: #ff9f43;
    }

    .summary-icon.overtime {
      background: #667eea;
    }

    .summary-icon .material-icons {
      font-size: 24px;
    }

    .summary-details {
      display: flex;
      flex-direction: column;
    }

    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    .summary-label {
      font-size: 12px;
      color: #666;
    }
  `]
})
export class StaffDashboardComponent implements OnInit {
  user: MobileUser | null = null;
  isCheckedIn = false;
  checkInTime = '';
  showAssetSection = true;
  /** Field ops sections (tasks / scan) — not for desk accountant role. */
  showFieldOps = true;

  stats: DashboardStats[] = [
    { label: 'Pending Tasks', value: '5', icon: 'assignment', color: '#ff9f43' },
    { label: 'Completed', value: '12', icon: 'check_circle', color: '#10ac84' },
    { label: 'Assets Scanned', value: '8', icon: 'qr_code_2', color: '#667eea' },
    { label: 'This Week', value: '5d 2h', icon: 'schedule', color: '#764ba2' }
  ];

  /** Ops shortcuts only — matches Facility Manager / staff field responsibilities. */
  quickActions: QuickAction[] = [
    { icon: 'assignment', label: 'My Tasks', route: '/mobile/staff/tasks', color: '#0f766e', badge: 5 },
    { icon: 'qr_code_scanner', label: 'Scan Asset', route: '/mobile/staff/scan', color: '#0369a1' },
    { icon: 'support_agent', label: 'Complaints', route: '/mobile/complaints', color: '#b45309' }
  ];

  todayTasks: Task[] = [
    {
      id: '1',
      title: 'Fix AC in Flat A-501',
      priority: 'urgent',
      category: 'HVAC',
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: 'in-progress',
      location: 'Tower A, 5th Floor'
    },
    {
      id: '2',
      title: 'Pool cleaning and chemical check',
      priority: 'high',
      category: 'Maintenance',
      dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
      status: 'pending',
      location: 'Swimming Pool Area'
    },
    {
      id: '3',
      title: 'Generator monthly inspection',
      priority: 'medium',
      category: 'Equipment',
      dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
      status: 'pending',
      location: 'Basement'
    },
    {
      id: '4',
      title: 'Garden maintenance - Tree pruning',
      priority: 'low',
      category: 'Landscaping',
      dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
      status: 'pending',
      location: 'Garden Area'
    }
  ];

  recentActivity = [
    {
      icon: 'check_circle',
      text: 'Completed: Lift maintenance - Tower B',
      location: 'Tower B',
      time: '30m ago',
      color: '#10ac84'
    },
    {
      icon: 'qr_code',
      text: 'Scanned: Fire Extinguisher - FE-045',
      location: '3rd Floor',
      time: '1h ago',
      color: '#667eea'
    },
    {
      icon: 'build',
      text: 'Started: Water pump repair',
      location: 'Basement',
      time: '2h ago',
      color: '#ff9f43'
    }
  ];

  get pendingTasks(): Task[] {
    return this.todayTasks.filter(t => t.status !== 'completed');
  }

  constructor(private authService: MobileAuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      const isFacilityOrDomestic =
        user?.role === 'FACILITY_MANAGER' || user?.role === 'DOMESTIC_STAFF';
      this.showFieldOps = isFacilityOrDomestic;
      this.showAssetSection = isFacilityOrDomestic;
      // Accountant: complaints + home only (desk role; billing stays on admin portal).
      if (user?.role === 'ACCOUNTANT') {
        this.quickActions = [
          { icon: 'support_agent', label: 'Complaints', route: '/mobile/complaints', color: '#b45309' },
          { icon: 'person', label: 'Profile', route: '/mobile/profile', color: '#475569' }
        ];
        this.stats = [
          { label: 'Open Tickets', value: '3', icon: 'support_agent', color: '#b45309' },
          { label: 'Resolved', value: '18', icon: 'check_circle', color: '#10ac84' },
          { label: 'This Week', value: '5d', icon: 'schedule', color: '#0369a1' }
        ];
      } else {
        this.quickActions = [
          { icon: 'assignment', label: 'My Tasks', route: '/mobile/staff/tasks', color: '#0f766e', badge: this.pendingTasks.length },
          { icon: 'qr_code_scanner', label: 'Scan Asset', route: '/mobile/staff/scan', color: '#0369a1' },
          { icon: 'support_agent', label: 'Complaints', route: '/mobile/complaints', color: '#b45309' }
        ];
      }
    });
  }

  getRoleLabel(): string {
    const labels: Record<string, string> = {
      'FACILITY_MANAGER': 'Facility Manager',
      'ACCOUNTANT': 'Accountant',
      'DOMESTIC_STAFF': 'Staff Member'
    };
    return this.user?.role ? labels[this.user.role] || 'Staff' : 'Staff';
  }

  toggleAttendance() {
    this.isCheckedIn = !this.isCheckedIn;
    if (this.isCheckedIn) {
      this.checkInTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      this.checkInTime = '';
    }
    // Add API call to mark attendance
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'HVAC': 'ac_unit',
      'Maintenance': 'build',
      'Equipment': 'settings',
      'Landscaping': 'park',
      'Plumbing': 'plumbing',
      'Electrical': 'bolt',
      'Cleaning': 'cleaning_services'
    };
    return icons[category] || 'assignment';
  }

  updateTaskStatus(taskId: string) {
    const task = this.todayTasks.find(t => t.id === taskId);
    if (task) {
      task.status = task.status === 'completed' ? 'pending' : 'completed';
      // Add API call here
    }
  }
}
