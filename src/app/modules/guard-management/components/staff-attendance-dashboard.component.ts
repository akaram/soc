import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  stats?: {
    label: string;
    value: string | number;
  }[];
}

@Component({
  selector: 'app-staff-attendance-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="staff-attendance-dashboard-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">badge</i>
          Staff Attendance
        </h1>
        <p>Manage staff attendance and tracking systems</p>
      </div>

      <!-- Dashboard Cards Grid -->
      <div class="dashboard-cards-grid">
        <div 
          *ngFor="let card of dashboardCards" 
          class="dashboard-card"
          [ngClass]="'card-' + card.color"
          (click)="navigateToCard(card)">
          <div class="card-icon" [ngClass]="'icon-' + card.color">
            <i class="material-icons">{{ card.icon }}</i>
          </div>
          <div class="card-content">
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
            <div class="card-stats" *ngIf="card.stats && card.stats.length > 0">
              <div *ngFor="let stat of card.stats" class="stat-item">
                <span class="stat-value">{{ stat.value }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
            </div>
          </div>
          <div class="card-action">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>
      </div>

      <!-- Quick Stats Summary -->
      <div class="quick-stats-section">
        <h2>
          <i class="material-icons">insights</i>
          Quick Overview
        </h2>
        <div class="quick-stats-grid">
          <div class="quick-stat-card">
            <div class="quick-stat-icon attendance">
              <i class="material-icons">face</i>
            </div>
            <div class="quick-stat-content">
              <div class="quick-stat-value">--</div>
              <div class="quick-stat-label">Today's Attendance</div>
            </div>
          </div>
          <div class="quick-stat-card">
            <div class="quick-stat-icon present">
              <i class="material-icons">check_circle</i>
            </div>
            <div class="quick-stat-content">
              <div class="quick-stat-value">--</div>
              <div class="quick-stat-label">Present Today</div>
            </div>
          </div>
          <div class="quick-stat-card">
            <div class="quick-stat-icon absent">
              <i class="material-icons">cancel</i>
            </div>
            <div class="quick-stat-content">
              <div class="quick-stat-value">--</div>
              <div class="quick-stat-label">Absent Today</div>
            </div>
          </div>
          <div class="quick-stat-card">
            <div class="quick-stat-icon late">
              <i class="material-icons">schedule</i>
            </div>
            <div class="quick-stat-content">
              <div class="quick-stat-value">--</div>
              <div class="quick-stat-label">Late Arrivals</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .staff-attendance-dashboard-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .page-header h1 .material-icons {
      font-size: 40px;
      color: #3498db;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    .dashboard-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
    }

    .dashboard-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .dashboard-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .dashboard-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--card-color, #3498db);
    }

    .card-blue::before { background: #3498db; }
    .card-green::before { background: #27ae60; }
    .card-purple::before { background: #9b59b6; }
    .card-orange::before { background: #e67e22; }
    .card-red::before { background: #e74c3c; }
    .card-teal::before { background: #1abc9c; }

    .card-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      background: rgba(52, 152, 219, 0.1);
    }

    .icon-blue { background: rgba(52, 152, 219, 0.1); color: #3498db; }
    .icon-green { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
    .icon-purple { background: rgba(155, 89, 182, 0.1); color: #9b59b6; }
    .icon-orange { background: rgba(230, 126, 34, 0.1); color: #e67e22; }
    .icon-red { background: rgba(231, 76, 60, 0.1); color: #e74c3c; }
    .icon-teal { background: rgba(26, 188, 156, 0.1); color: #1abc9c; }

    .card-icon .material-icons {
      font-size: 32px;
    }

    .card-content {
      flex: 1;
    }

    .card-content h3 {
      font-size: 20px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .card-content p {
      font-size: 14px;
      color: #7f8c8d;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    .card-stats {
      display: flex;
      gap: 16px;
      margin-top: 16px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
    }

    .card-action {
      position: absolute;
      top: 24px;
      right: 24px;
      color: #bdc3c7;
      transition: all 0.3s ease;
    }

    .dashboard-card:hover .card-action {
      color: #3498db;
      transform: translateX(4px);
    }

    .quick-stats-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .quick-stats-section h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      margin: 0 0 20px 0;
      color: #2c3e50;
    }

    .quick-stats-section h2 .material-icons {
      font-size: 24px;
      color: #3498db;
    }

    .quick-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .quick-stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .quick-stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .quick-stat-icon.attendance {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .quick-stat-icon.present {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .quick-stat-icon.absent {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .quick-stat-icon.late {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .quick-stat-content {
      flex: 1;
    }

    .quick-stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;
    }

    .quick-stat-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    @media (max-width: 768px) {
      .dashboard-cards-grid {
        grid-template-columns: 1fr;
      }

      .quick-stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class StaffAttendanceDashboardComponent implements OnInit {
  dashboardCards: DashboardCard[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.initializeCards();
  }

  initializeCards(): void {
    this.dashboardCards = [
      {
        id: 'facial-recognition',
        title: 'Facial Recognition Attendance',
        description: 'Selfie-based attendance tracking using facial recognition technology',
        icon: 'face',
        route: '/admin/guard-management/facial-recognition',
        color: 'blue',
        stats: [
          { label: 'Today', value: '--' },
          { label: 'Accuracy', value: '--%' }
        ]
      },
      {
        id: 'biometric-fingerprint',
        title: 'Biometric Integration',
        description: 'Fingerprint-based attendance tracking using biometric technology',
        icon: 'fingerprint',
        route: '/admin/guard-management/biometric-fingerprint',
        color: 'green',
        stats: [
          { label: 'Today', value: '--' },
          { label: 'Success Rate', value: '--%' }
        ]
      },
      {
        id: 'shift-management',
        title: 'Shift Management & Scheduling',
        description: 'Manage staff shifts, schedules, and assignments',
        icon: 'schedule',
        route: '/admin/guard-management/shift-management',
        color: 'purple',
        stats: [
          { label: 'Active Shifts', value: '--' },
          { label: 'This Week', value: '--' }
        ]
      },
      {
        id: 'double-shift-detection',
        title: 'Double Shift Detection',
        description: 'Detect and manage overlapping shift assignments',
        icon: 'warning',
        route: '/admin/guard-management/double-shift-detection',
        color: 'orange',
        stats: [
          { label: 'Detected', value: '--' },
          { label: 'Resolved', value: '--' }
        ]
      },
      {
        id: 'proxy-attendance-detection',
        title: 'Proxy Attendance Detection',
        description: 'Detect and prevent proxy attendance fraud',
        icon: 'security',
        route: '/admin/guard-management/proxy-attendance-detection',
        color: 'red',
        stats: [
          { label: 'Suspicious', value: '--' },
          { label: 'Verified', value: '--' }
        ]
      },
      {
        id: 'leave-management',
        title: 'Leave Management',
        description: 'Manage staff leave requests, approvals, and balances',
        icon: 'event_available',
        route: '/admin/guard-management/leave-management',
        color: 'teal',
        stats: [
          { label: 'Pending', value: '--' },
          { label: 'This Month', value: '--' }
        ]
      },
      {
        id: 'overtime-tracking',
        title: 'Overtime Tracking',
        description: 'Track and manage staff overtime hours and approvals',
        icon: 'access_time',
        route: '/admin/guard-management/overtime-tracking',
        color: 'indigo',
        stats: [
          { label: 'This Month', value: '--' },
          { label: 'Pending', value: '--' }
        ]
      },
      {
        id: 'attendance-reports-payroll',
        title: 'Attendance Reports & Payroll',
        description: 'Generate reports and integrate with payroll systems',
        icon: 'assessment',
        route: '/admin/guard-management/attendance-reports-payroll',
        color: 'cyan',
        stats: [
          { label: 'Reports', value: '--' },
          { label: 'Synced', value: '--' }
        ]
      }
    ];
  }

  navigateToCard(card: DashboardCard): void {
    this.router.navigate([card.route]);
  }
}

