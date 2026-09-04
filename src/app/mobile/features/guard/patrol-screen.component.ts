import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PatrollingRouteService } from '../../../modules/guard-patrol/services/patrolling-route.service';
import { CheckpointScanService } from '../../../modules/guard-patrol/services/checkpoint-scan.service';
import { PatrollingRoute, Checkpoint } from '../../../modules/guard-patrol/models/patrolling-route.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  GuardDashboardCheckpoint,
  GuardDashboardService
} from '../../services/guard-dashboard.service';

/**
 * Mobile patrol screen — today's progress summary and route checkpoint list.
 */
@Component({
  selector: 'app-patrol-screen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="patrol-screen-container">
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1><i class="material-icons">route</i> Patrol</h1>
        </div>
      </div>

      <div class="content">
        <p class="hint" *ngIf="isLoading">Loading patrol routes…</p>
        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
        <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

        <!-- Today's patrol progress (opened from dashboard "Patrols Done" tile) -->
        <div class="today-summary" *ngIf="!isLoadingProgress">
          <div class="summary-header">
            <h2>Today's Patrol Progress</h2>
            <span class="summary-count">{{ todayCompleted }}/{{ todayTotal }}</span>
          </div>
          <p class="summary-hint" *ngIf="todayTotal === 0">No checkpoints configured for today.</p>
          <div class="checkpoint-timeline" *ngIf="todayCheckpoints.length > 0">
            <div
              *ngFor="let checkpoint of todayCheckpoints; let i = index"
              class="checkpoint-row"
              [class.completed]="checkpoint.status === 'completed'"
              [class.missed]="checkpoint.status === 'missed'"
              [class.pending]="checkpoint.status === 'pending'">
              <div class="checkpoint-index">{{ i + 1 }}</div>
              <div class="checkpoint-info">
                <h4>{{ checkpoint.location }}</h4>
                <p *ngIf="checkpoint.time">Scanned at {{ checkpoint.time }}</p>
                <p *ngIf="checkpoint.status === 'pending'">Not scanned yet</p>
                <p *ngIf="checkpoint.status === 'missed'" class="missed-text">Invalid scan</p>
              </div>
              <div class="checkpoint-status-icon">
                <i class="material-icons" *ngIf="checkpoint.status === 'completed'">check_circle</i>
                <i class="material-icons" *ngIf="checkpoint.status === 'missed'">cancel</i>
                <button
                  *ngIf="checkpoint.status === 'pending'"
                  class="btn-scan-small"
                  (click)="scanCheckpoint(checkpoint)">
                  Scan
                </button>
              </div>
            </div>
          </div>
          <div class="patrol-complete-banner" *ngIf="isPatrolCompleteToday">
            <i class="material-icons">verified</i>
            <div>
              <strong>Patrol complete for today</strong>
              <p>All {{ todayTotal }} checkpoint(s) scanned. You can return to the dashboard or continue other duties.</p>
            </div>
          </div>
        </div>

        <h3 class="section-label">Patrol Routes</h3>

        <div class="route-card" *ngFor="let route of routes">
          <h3>{{ route.name }}</h3>
          <p class="meta">{{ route.checkpoints.length }} checkpoints</p>
          <button class="btn-start" *ngIf="!isPatrolCompleteToday" (click)="startPatrol(route)">
            <i class="material-icons">play_arrow</i> Start Patrol
          </button>
          <p class="route-done" *ngIf="isPatrolCompleteToday">
            <i class="material-icons">check_circle</i> Completed today
          </p>
          <ul class="checkpoint-list">
            <li *ngFor="let cp of route.checkpoints">
              <span>{{ cp.order }}. {{ cp.name || cp.location }}</span>
              <button
                class="btn-scan"
                *ngIf="!isCheckpointDoneToday(cp.id)"
                (click)="openQrScanner(route, cp)">
                Scan
              </button>
              <span class="scan-done" *ngIf="isCheckpointDoneToday(cp.id)">
                <i class="material-icons">check_circle</i> Done
              </span>
            </li>
          </ul>
        </div>

        <div class="empty" *ngIf="!isLoading && routes.length === 0">
          <p>No patrol routes configured. Ask admin to set up routes in Guard Patrol.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .patrol-screen-container { min-height: 100vh; background: #f5f7fa; padding-bottom: 88px; }
    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 16px; display: flex; align-items: center; gap: 12px;
    }
    .back-btn {
      background: rgba(255,255,255,0.2); border: none; color: white;
      width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
    }
    .header-content h1 { margin: 0; font-size: 20px; display: flex; align-items: center; gap: 8px; }
    .content { padding: 16px; }
    .hint, .error, .success { font-size: 14px; margin-bottom: 12px; }
    .error { color: #c92a2a; }
    .success { color: #2b8a3e; }

    .today-summary {
      background: white;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }

    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .summary-header h2 {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .summary-count {
      background: #667eea;
      color: white;
      font-weight: 700;
      font-size: 14px;
      padding: 6px 12px;
      border-radius: 20px;
    }

    .summary-hint {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
    }

    .checkpoint-timeline {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .checkpoint-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #eef2f7;
    }

    .checkpoint-row.completed {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .checkpoint-row.missed {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .checkpoint-index {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .checkpoint-row.completed .checkpoint-index {
      background: #22c55e;
      color: white;
    }

    .checkpoint-info {
      flex: 1;
      min-width: 0;
    }

    .checkpoint-info h4 {
      margin: 0 0 4px;
      font-size: 14px;
      color: #1e293b;
    }

    .checkpoint-info p {
      margin: 0;
      font-size: 12px;
      color: #64748b;
    }

    .missed-text { color: #dc2626 !important; }

    .checkpoint-status-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .checkpoint-status-icon .material-icons {
      font-size: 22px;
    }

    .checkpoint-row.completed .material-icons { color: #22c55e; }
    .checkpoint-row.missed .material-icons { color: #ef4444; }

    .btn-scan-small {
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .section-label {
      margin: 0 0 12px;
      font-size: 15px;
      font-weight: 600;
      color: #475569;
    }

    .route-card {
      background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .route-card h3 { margin: 0 0 4px; }
    .meta { margin: 0 0 12px; color: #666; font-size: 13px; }
    .btn-start {
      display: inline-flex; align-items: center; gap: 6px;
      background: #28a745; color: white; border: none; border-radius: 8px;
      padding: 10px 16px; margin-bottom: 12px; cursor: pointer;
    }
    .checkpoint-list { list-style: none; margin: 0; padding: 0; }
    .checkpoint-list li {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-top: 1px solid #eee; font-size: 14px;
    }
    .btn-scan {
      background: #667eea; color: white; border: none; border-radius: 6px;
      padding: 6px 12px; font-size: 12px; cursor: pointer;
    }

    .patrol-complete-banner {
      margin-top: 14px;
      padding: 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 1px solid #6ee7b7;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .patrol-complete-banner .material-icons {
      color: #059669;
      font-size: 28px;
    }

    .patrol-complete-banner strong {
      display: block;
      color: #065f46;
      font-size: 15px;
      margin-bottom: 4px;
    }

    .patrol-complete-banner p {
      margin: 0;
      font-size: 13px;
      color: #047857;
      line-height: 1.4;
    }

    .route-done {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 12px;
      color: #059669;
      font-size: 14px;
      font-weight: 600;
    }

    .route-done .material-icons { font-size: 18px; }

    .scan-done {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #059669;
      font-size: 12px;
      font-weight: 600;
    }

    .scan-done .material-icons { font-size: 16px; }

    .empty { text-align: center; color: #666; padding: 24px; }
  `]
})
export class PatrolScreenComponent implements OnInit {
  routes: PatrollingRoute[] = [];
  isLoading = false;
  isLoadingProgress = true;
  errorMessage = '';
  successMessage = '';
  todayCompleted = 0;
  todayTotal = 0;
  todayCheckpoints: GuardDashboardCheckpoint[] = [];
  focusToday = false;

  /** True when every checkpoint on today's active route has been scanned. */
  get isPatrolCompleteToday(): boolean {
    return this.todayTotal > 0 && this.todayCompleted >= this.todayTotal;
  }

  /** Whether a route checkpoint already has a valid scan today. */
  isCheckpointDoneToday(checkpointId: string): boolean {
    const row = this.todayCheckpoints.find(c => c.id === checkpointId);
    return row?.status === 'completed';
  }

  constructor(
    private routeService: PatrollingRouteService,
    private scanService: CheckpointScanService,
    private guardDashboard: GuardDashboardService,
    private session: SessionContextService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.focusToday = params.get('view') === 'today';
      if (params.get('scanSuccess') === '1') {
        this.successMessage = 'Checkpoint recorded successfully.';
        this.loadTodayProgress();
        setTimeout(() => (this.successMessage = ''), 4000);
      }
    });
    this.loadRoutes();
    this.loadTodayProgress();
  }

  /** Load society patrol routes from API. */
  loadRoutes(): void {
    this.isLoading = true;
    this.routeService.getAllRoutes().subscribe({
      next: routes => {
        this.routes = routes;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load patrol routes.';
        this.isLoading = false;
      }
    });
  }

  /** Load today's checkpoint scan status for the progress summary. */
  loadTodayProgress(): void {
    this.isLoadingProgress = true;
    this.guardDashboard.loadTodayPatrolProgress().subscribe({
      next: progress => {
        this.todayCompleted = progress.completed;
        this.todayTotal = progress.total;
        this.todayCheckpoints = progress.checkpoints;
        this.isLoadingProgress = false;
        if (this.focusToday) {
          setTimeout(() => {
            document.querySelector('.today-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      },
      error: () => {
        this.isLoadingProgress = false;
      }
    });
  }

  /** Begin an active patrol record for the selected route. */
  startPatrol(route: PatrollingRoute): void {
    this.scanService.startPatrol(route.id, this.session.getCurrentUserId()).subscribe({
      next: () => {
        this.successMessage = `Patrol started: ${route.name}`;
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: () => {
        this.errorMessage = 'Could not start patrol.';
      }
    });
  }

  /** Open camera QR scanner for a route checkpoint. */
  openQrScanner(route: PatrollingRoute, cp: Checkpoint): void {
    this.router.navigate(['/mobile/guard/scan'], {
      queryParams: {
        type: 'patrol',
        routeId: route.id,
        checkpointId: cp.id,
        checkpointCode: cp.checkpointCode || cp.qrCode || cp.id,
        autoStart: 'true'
      }
    });
  }

  /** Scan a pending checkpoint from today's progress list. */
  scanCheckpoint(checkpoint: GuardDashboardCheckpoint): void {
    this.router.navigate(['/mobile/guard/scan'], {
      queryParams: {
        type: 'patrol',
        routeId: checkpoint.routeId,
        checkpointId: checkpoint.id,
        checkpointCode: checkpoint.checkpointCode,
        autoStart: 'true'
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/mobile/guard/dashboard']);
  }
}
