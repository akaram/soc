import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  selector: 'app-guard-patrol-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="guard-patrol-dashboard-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">dashboard</i>
          Guard & Patrolling System
        </h1>
        <p>Manage patrols, routes, checkpoints, and incidents</p>
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
            <div class="quick-stat-icon routes">
              <i class="material-icons">route</i>
            </div>
            <div class="quick-stat-content">
              <div class="quick-stat-value">--</div>
              <div class="quick-stat-label">Active Routes</div>
            </div>
          </div>
          <div class="quick-stat-card">
            <div class="quick-stat-icon patrols">
              <i class="material-icons">directions_walk</i>
            </div>
            <div class="quick-stat-content">
              <div class="quick-stat-value">--</div>
              <div class="quick-stat-label">Active Patrols</div>
            </div>
          </div>
          <div class="quick-stat-card">
            <div class="quick-stat-icon alerts">
              <i class="material-icons">warning</i>
            </div>
            <div class="quick-stat-content">
              <div class="quick-stat-value">--</div>
              <div class="quick-stat-label">Pending Alerts</div>
            </div>
          </div>
          <div class="quick-stat-card">
            <div class="quick-stat-icon incidents">
              <i class="material-icons">report_problem</i>
            </div>
            <div class="quick-stat-content">
              <div class="quick-stat-value">--</div>
              <div class="quick-stat-label">Open Incidents</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .guard-patrol-dashboard-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
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

    .dashboard-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }

    .dashboard-card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      border-left: 6px solid;
    }

    .dashboard-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transform: translateX(-100%);
      transition: transform 0.6s;
    }

    .dashboard-card:hover::before {
      transform: translateX(100%);
    }

    .dashboard-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .dashboard-card.card-blue {
      border-left-color: #667eea;
    }

    .dashboard-card.card-green {
      border-left-color: #10ac84;
    }

    .dashboard-card.card-orange {
      border-left-color: #ffc107;
    }

    .dashboard-card.card-red {
      border-left-color: #dc3545;
    }

    .dashboard-card.card-purple {
      border-left-color: #764ba2;
    }

    .dashboard-card.card-teal {
      border-left-color: #17a2b8;
    }

    .card-icon {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      color: white;
      margin-bottom: 20px;
      transition: all 0.3s ease;
    }

    .dashboard-card:hover .card-icon {
      transform: scale(1.1) rotate(5deg);
    }

    .card-icon.icon-blue {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .card-icon.icon-green {
      background: linear-gradient(135deg, #10ac84 0%, #1dd1a1 100%);
    }

    .card-icon.icon-orange {
      background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
    }

    .card-icon.icon-red {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    }

    .card-icon.icon-purple {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    }

    .card-icon.icon-teal {
      background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
    }

    .card-content {
      flex: 1;
    }

    .card-content h3 {
      font-size: 22px;
      margin: 0 0 12px 0;
      color: #2c3e50;
      font-weight: 700;
    }

    .card-content p {
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }

    .card-stats {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .card-action {
      position: absolute;
      top: 24px;
      right: 24px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(102, 126, 234, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #667eea;
      transition: all 0.3s ease;
    }

    .dashboard-card:hover .card-action {
      background: #667eea;
      color: white;
      transform: translateX(-4px);
    }

    .quick-stats-section {
      margin-top: 48px;
    }

    .quick-stats-section h2 {
      font-size: 24px;
      margin: 0 0 24px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .quick-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .quick-stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.2s;
    }

    .quick-stat-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .quick-stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
      flex-shrink: 0;
    }

    .quick-stat-icon.routes {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .quick-stat-icon.patrols {
      background: linear-gradient(135deg, #10ac84 0%, #1dd1a1 100%);
    }

    .quick-stat-icon.alerts {
      background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
    }

    .quick-stat-icon.incidents {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    }

    .quick-stat-content {
      flex: 1;
    }

    .quick-stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .quick-stat-label {
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    @media (max-width: 1024px) {
      .dashboard-cards-grid {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }
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
export class GuardPatrolDashboardComponent implements OnInit, OnDestroy {
  dashboardCards: DashboardCard[] = [
    {
      id: 'routes',
      title: 'Define Patrolling Routes',
      description: 'Create and manage patrolling routes with checkpoints. Define schedules, assign guards, and configure route requirements.',
      icon: 'route',
      route: '/admin/guard-patrol/routes',
      color: 'blue'
    },
    {
      id: 'scanner',
      title: 'Checkpoint Scanner',
      description: 'QR code and NFC tag scanning at checkpoints. Scan checkpoints during patrols and track completion status.',
      icon: 'qr_code_scanner',
      route: '/admin/guard-patrol/scanner',
      color: 'green'
    },
    {
      id: 'monitoring',
      title: 'Real-Time Patrol Monitoring',
      description: 'Monitor active patrols in real-time. Track guard locations, checkpoint status, and patrol progress.',
      icon: 'dashboard',
      route: '/admin/guard-patrol/monitoring',
      color: 'orange'
    },
    {
      id: 'alerts',
      title: 'Missed Patrol Alerts',
      description: 'View and manage missed patrol alerts and notifications. Track missed checkpoints and incomplete routes.',
      icon: 'notifications_active',
      route: '/admin/guard-patrol/missed-alerts',
      color: 'red'
    },
    {
      id: 'reports',
      title: 'Patrol Completion Reports',
      description: 'Generate and view patrol completion reports. Analyze patrol performance, completion rates, and statistics.',
      icon: 'assessment',
      route: '/admin/guard-patrol/completion-reports',
      color: 'purple'
    },
    {
      id: 'incidents',
      title: 'Incident Reporting',
      description: 'Report and manage incidents during patrols. Track incidents, investigations, and resolutions.',
      icon: 'report_problem',
      route: '/admin/guard-patrol/incidents',
      color: 'teal'
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateToCard(card: DashboardCard): void {
    this.router.navigate([card.route]);
  }
}

