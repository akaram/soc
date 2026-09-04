import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatrolMonitoringService } from '../services/patrol-monitoring.service';
import {
  ActivePatrolMonitoring,
  Guard,
  GuardStatus,
  PatrolStatus,
  PatrolMonitoringStatistics,
  PatrolMonitoringFilter,
  PatrolAlert
} from '../models/patrol-monitoring.model';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-patrol-monitoring-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="patrol-monitoring-dashboard">
      <div class="page-header">
        <div class="header-content">
          <h1>
            <i class="material-icons">dashboard</i>
            Real-Time Patrol Monitoring
          </h1>
          <p>Monitor active patrols, guards, and checkpoints in real-time</p>
        </div>
        <div class="header-actions">
          <div class="refresh-indicator" [class.active]="isRefreshing">
            <i class="material-icons">refresh</i>
            <span>Auto-refresh: {{ refreshInterval }}s</span>
          </div>
          <button class="btn-refresh" (click)="refreshData()" [disabled]="isRefreshing">
            <i class="material-icons">refresh</i>
            Refresh Now
          </button>
        </div>
      </div>

      <!-- Statistics Grid -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card active-patrols">
          <div class="stat-icon">
            <i class="material-icons">route</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activePatrols }}</div>
            <div class="stat-label">Active Patrols</div>
            <div class="stat-subtext">{{ statistics.completedPatrolsToday }} completed today</div>
          </div>
        </div>

        <div class="stat-card guards-on-duty">
          <div class="stat-icon">
            <i class="material-icons">person</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.guardsOnDuty }}</div>
            <div class="stat-label">Guards On Duty</div>
            <div class="stat-subtext">{{ statistics.guardsOnPatrol }} on patrol</div>
          </div>
        </div>

        <div class="stat-card checkpoints">
          <div class="stat-icon">
            <i class="material-icons">place</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.checkpointsScannedToday }}</div>
            <div class="stat-label">Checkpoints Scanned</div>
            <div class="stat-subtext">{{ statistics.missedCheckpoints }} missed</div>
          </div>
        </div>

        <div class="stat-card alerts">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeAlerts }}</div>
            <div class="stat-label">Active Alerts</div>
            <div class="stat-subtext critical" *ngIf="statistics.criticalAlerts > 0">
              {{ statistics.criticalAlerts }} critical
            </div>
            <div class="stat-subtext" *ngIf="statistics.criticalAlerts === 0">All clear</div>
          </div>
        </div>

        <div class="stat-card performance">
          <div class="stat-icon">
            <i class="material-icons">trending_up</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.onTimePercentage }}%</div>
            <div class="stat-label">On-Time Rate</div>
            <div class="stat-subtext">Avg duration: {{ statistics.averagePatrolDuration }}m</div>
          </div>
        </div>

        <div class="stat-card completion">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.averageCompletionRate }}%</div>
            <div class="stat-label">Completion Rate</div>
            <div class="stat-subtext">{{ statistics.totalPatrolsToday }} total today</div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- Active Patrols -->
        <div class="dashboard-section active-patrols-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">route</i>
              Active Patrols
            </h2>
            <div class="section-filters">
              <select [(ngModel)]="filter.showOnlyDelayed" (change)="applyFilters()" class="filter-select">
                <option [value]="false">All Patrols</option>
                <option [value]="true">Delayed Only</option>
              </select>
              <select [(ngModel)]="filter.showOnlyWithAlerts" (change)="applyFilters()" class="filter-select">
                <option [value]="false">All</option>
                <option [value]="true">With Alerts</option>
              </select>
            </div>
          </div>

          <div class="patrols-list" *ngIf="activePatrols.length > 0">
            <div *ngFor="let patrol of activePatrols" class="patrol-card" [ngClass]="{'delayed': patrol.isDelayed, 'has-alerts': patrol.alerts.length > 0}">
              <div class="patrol-header">
                <div class="patrol-info">
                  <h3>{{ patrol.routeName }}</h3>
                  <div class="patrol-meta">
                    <span class="guard-badge">
                      <i class="material-icons">person</i>
                      {{ patrol.guardName }}
                      <span *ngIf="patrol.guardBadgeNumber">({{ patrol.guardBadgeNumber }})</span>
                    </span>
                    <span class="patrol-time">
                      <i class="material-icons">schedule</i>
                      Started: {{ formatTime(patrol.startTime) }}
                    </span>
                  </div>
                </div>
                <div class="patrol-status-badge" [ngClass]="'status-' + patrol.status.toLowerCase()">
                  {{ getStatusLabel(patrol.status) }}
                </div>
              </div>

              <div class="patrol-progress-section">
                <div class="progress-header">
                  <span>Progress: {{ patrol.completedCheckpoints }}/{{ patrol.totalCheckpoints }} checkpoints</span>
                  <span class="progress-percentage">{{ patrol.progress }}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="patrol.progress"></div>
                </div>
                <div class="progress-details">
                  <span *ngIf="patrol.expectedEndTime">
                    Expected: {{ formatTime(patrol.expectedEndTime) }}
                  </span>
                  <span *ngIf="patrol.isDelayed" class="delay-warning">
                    <i class="material-icons">schedule</i>
                    {{ patrol.delayMinutes }}m behind
                  </span>
                </div>
              </div>

              <div class="patrol-checkpoints">
                <div class="checkpoints-header">
                  <span>Checkpoints</span>
                  <span class="checkpoints-count">{{ patrol.completedCheckpoints }}/{{ patrol.totalCheckpoints }}</span>
                </div>
                <div class="checkpoints-timeline">
                  <div 
                    *ngFor="let checkpoint of patrol.checkpoints" 
                    class="checkpoint-item"
                    [ngClass]="'status-' + checkpoint.status.toLowerCase()">
                    <div class="checkpoint-number">{{ checkpoint.order }}</div>
                    <div class="checkpoint-details">
                      <span class="checkpoint-name">{{ checkpoint.checkpointName }}</span>
                      <span class="checkpoint-time" *ngIf="checkpoint.scannedAt">
                        Scanned: {{ formatTime(checkpoint.scannedAt) }}
                      </span>
                      <span class="checkpoint-time" *ngIf="!checkpoint.scannedAt && checkpoint.expectedTime">
                        Expected: {{ formatTime(checkpoint.expectedTime) }}
                      </span>
                    </div>
                    <div class="checkpoint-status-icon">
                      <i class="material-icons">
                        {{ checkpoint.status === 'COMPLETED' ? 'check_circle' : 
                           checkpoint.status === 'LATE' ? 'schedule' : 
                           checkpoint.status === 'MISSED' ? 'cancel' : 
                           checkpoint.status === 'IN_PROGRESS' ? 'radio_button_checked' : 'radio_button_unchecked' }}
                      </i>
                    </div>
                  </div>
                </div>
              </div>

              <div class="patrol-alerts" *ngIf="patrol.alerts.length > 0">
                <div class="alerts-header">
                  <i class="material-icons">warning</i>
                  <span>{{ patrol.alerts.length }} Alert(s)</span>
                </div>
                <div class="alerts-list">
                  <div *ngFor="let alert of patrol.alerts" class="alert-item" [ngClass]="'severity-' + alert.severity.toLowerCase()">
                    <span class="alert-message">{{ alert.message }}</span>
                    <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
                  </div>
                </div>
              </div>

              <div class="patrol-footer">
                <span class="last-scan" *ngIf="patrol.lastScanTime">
                  <i class="material-icons">history</i>
                  Last scan: {{ formatTime(patrol.lastScanTime) }}
                </span>
                <button class="btn-view-details" (click)="viewPatrolDetails(patrol)">
                  View Details
                </button>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="activePatrols.length === 0">
            <i class="material-icons">route</i>
            <p>No active patrols</p>
          </div>
        </div>

        <!-- Guards On Duty -->
        <div class="dashboard-section guards-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">person</i>
              Guards On Duty
            </h2>
            <span class="guards-count">{{ guardsOnDuty.length }}</span>
          </div>

          <div class="guards-list" *ngIf="guardsOnDuty.length > 0">
            <div *ngFor="let guard of guardsOnDuty" class="guard-card" [ngClass]="'status-' + guard.status.toLowerCase()">
              <div class="guard-avatar">
                <i class="material-icons">person</i>
              </div>
              <div class="guard-info">
                <h4>{{ guard.name }}</h4>
                <div class="guard-details">
                  <span class="badge-number" *ngIf="guard.badgeNumber">{{ guard.badgeNumber }}</span>
                  <span class="guard-status-badge" [ngClass]="'status-' + guard.status.toLowerCase()">
                    {{ getGuardStatusLabel(guard.status) }}
                  </span>
                </div>
                <div class="guard-patrol-info" *ngIf="guard.currentRouteName">
                  <i class="material-icons">route</i>
                  <span>{{ guard.currentRouteName }}</span>
                </div>
                <div class="guard-stats">
                  <span *ngIf="guard.totalPatrolsToday">
                    <i class="material-icons">route</i>
                    {{ guard.completedPatrolsToday }}/{{ guard.totalPatrolsToday }} patrols
                  </span>
                  <span *ngIf="guard.onTimePercentage !== undefined">
                    <i class="material-icons">trending_up</i>
                    {{ guard.onTimePercentage }}% on-time
                  </span>
                </div>
                <div class="guard-last-scan" *ngIf="guard.lastCheckpointScan">
                  <i class="material-icons">schedule</i>
                  Last scan: {{ formatTime(guard.lastCheckpointScan) }}
                </div>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="guardsOnDuty.length === 0">
            <i class="material-icons">person_off</i>
            <p>No guards on duty</p>
          </div>
        </div>

        <!-- Active Alerts -->
        <div class="dashboard-section alerts-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">warning</i>
              Active Alerts
            </h2>
            <span class="alerts-count" [ngClass]="{'critical': (statistics?.criticalAlerts ?? 0) > 0}">
              {{ activeAlerts.length }}
            </span>
          </div>

          <div class="alerts-list" *ngIf="activeAlerts.length > 0">
            <div *ngFor="let alert of activeAlerts" class="alert-card" [ngClass]="'severity-' + alert.severity.toLowerCase()">
              <div class="alert-icon">
                <i class="material-icons">
                  {{ alert.severity === 'CRITICAL' ? 'error' : 
                     alert.severity === 'HIGH' ? 'warning' : 
                     'info' }}
                </i>
              </div>
              <div class="alert-content">
                <div class="alert-header">
                  <span class="alert-type">{{ getAlertTypeLabel(alert.type) }}</span>
                  <span class="alert-severity" [ngClass]="'severity-' + alert.severity.toLowerCase()">
                    {{ alert.severity }}
                  </span>
                </div>
                <p class="alert-message">{{ alert.message }}</p>
                <div class="alert-meta">
                  <span>
                    <i class="material-icons">person</i>
                    Guard: {{ getGuardName(alert.guardId) }}
                  </span>
                  <span>
                    <i class="material-icons">schedule</i>
                    {{ formatTime(alert.timestamp) }}
                  </span>
                </div>
              </div>
              <div class="alert-actions">
                <button class="btn-acknowledge" (click)="acknowledgeAlert(alert)" title="Acknowledge">
                  <i class="material-icons">check</i>
                </button>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="activeAlerts.length === 0">
            <i class="material-icons">check_circle</i>
            <p>No active alerts</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .patrol-monitoring-dashboard {
      padding: 24px;
      max-width: 1800px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-content h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-content p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .refresh-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .refresh-indicator.active .material-icons {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .btn-refresh {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 20px;
      border-left: 4px solid;
    }

    .stat-card.active-patrols { border-left-color: #667eea; }
    .stat-card.guards-on-duty { border-left-color: #28a745; }
    .stat-card.checkpoints { border-left-color: #17a2b8; }
    .stat-card.alerts { border-left-color: #ffc107; }
    .stat-card.performance { border-left-color: #10ac84; }
    .stat-card.completion { border-left-color: #764ba2; }

    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }

    .stat-card.active-patrols .stat-icon { background: #667eea; }
    .stat-card.guards-on-duty .stat-icon { background: #28a745; }
    .stat-card.checkpoints .stat-icon { background: #17a2b8; }
    .stat-card.alerts .stat-icon { background: #ffc107; }
    .stat-card.performance .stat-icon { background: #10ac84; }
    .stat-card.completion .stat-icon { background: #764ba2; }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .stat-subtext {
      font-size: 12px;
      color: #999;
    }

    .stat-subtext.critical {
      color: #dc3545;
      font-weight: 600;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    .dashboard-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .section-header h2 {
      font-size: 20px;
      margin: 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-filters {
      display: flex;
      gap: 8px;
    }

    .filter-select {
      padding: 8px 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 13px;
      background: white;
      cursor: pointer;
    }

    .guards-count,
    .alerts-count {
      padding: 4px 12px;
      background: #f5f5f5;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
    }

    .alerts-count.critical {
      background: #f8d7da;
      color: #721c24;
    }

    .patrols-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .patrol-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }

    .patrol-card.delayed {
      border-color: #ffc107;
      background: #fffbf0;
    }

    .patrol-card.has-alerts {
      border-color: #dc3545;
      background: #fff5f5;
    }

    .patrol-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .patrol-info h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .patrol-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 13px;
      color: #7f8c8d;
    }

    .patrol-meta .material-icons {
      font-size: 16px;
    }

    .patrol-status-badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .patrol-status-badge.status-in_progress {
      background: #d4edda;
      color: #155724;
    }

    .patrol-progress-section {
      margin-bottom: 16px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .progress-percentage {
      font-weight: 600;
      color: #2c3e50;
    }

    .progress-bar {
      height: 10px;
      background: #e0e0e0;
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s;
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #999;
    }

    .delay-warning {
      color: #ffc107;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .patrol-checkpoints {
      margin-bottom: 16px;
    }

    .checkpoints-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
    }

    .checkpoints-timeline {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkpoint-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkpoint-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .checkpoint-item.status-completed .checkpoint-number {
      background: #28a745;
    }

    .checkpoint-item.status-late .checkpoint-number {
      background: #ffc107;
    }

    .checkpoint-item.status-missed .checkpoint-number {
      background: #dc3545;
    }

    .checkpoint-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .checkpoint-name {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .checkpoint-time {
      font-size: 12px;
      color: #7f8c8d;
    }

    .checkpoint-status-icon {
      color: #999;
    }

    .checkpoint-item.status-completed .checkpoint-status-icon {
      color: #28a745;
    }

    .checkpoint-item.status-late .checkpoint-status-icon {
      color: #ffc107;
    }

    .checkpoint-item.status-missed .checkpoint-status-icon {
      color: #dc3545;
    }

    .patrol-alerts {
      margin-bottom: 16px;
      padding: 12px;
      background: #fff3cd;
      border-radius: 8px;
      border-left: 4px solid #ffc107;
    }

    .alerts-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #856404;
      margin-bottom: 8px;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .alert-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 6px;
      background: white;
      border-radius: 4px;
    }

    .alert-message {
      flex: 1;
      color: #856404;
    }

    .alert-time {
      color: #999;
    }

    .patrol-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }

    .last-scan {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .btn-view-details {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .guards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .guard-card {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 12px;
      border-left: 4px solid #e0e0e0;
    }

    .guard-card.status-on_patrol {
      border-left-color: #28a745;
    }

    .guard-card.status-on_duty {
      border-left-color: #17a2b8;
    }

    .guard-card.status-break {
      border-left-color: #ffc107;
    }

    .guard-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      flex-shrink: 0;
    }

    .guard-info {
      flex: 1;
    }

    .guard-info h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .guard-details {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .badge-number {
      padding: 2px 8px;
      background: #e7f3ff;
      color: #004085;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .guard-status-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .guard-status-badge.status-on_patrol {
      background: #d4edda;
      color: #155724;
    }

    .guard-status-badge.status-on_duty {
      background: #d1ecf1;
      color: #0c5460;
    }

    .guard-status-badge.status-break {
      background: #fff3cd;
      color: #856404;
    }

    .guard-patrol-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 8px;
    }

    .guard-stats {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 8px;
    }

    .guard-last-scan {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #999;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .alert-card {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      border-left: 4px solid;
    }

    .alert-card.severity-critical {
      border-left-color: #dc3545;
      background: #fff5f5;
    }

    .alert-card.severity-high {
      border-left-color: #ffc107;
      background: #fffbf0;
    }

    .alert-card.severity-medium {
      border-left-color: #17a2b8;
      background: #f0f9fa;
    }

    .alert-card.severity-low {
      border-left-color: #6c757d;
      background: #f8f9fa;
    }

    .alert-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .alert-card.severity-critical .alert-icon {
      background: #dc3545;
    }

    .alert-card.severity-high .alert-icon {
      background: #ffc107;
    }

    .alert-card.severity-medium .alert-icon {
      background: #17a2b8;
    }

    .alert-card.severity-low .alert-icon {
      background: #6c757d;
    }

    .alert-content {
      flex: 1;
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .alert-type {
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
    }

    .alert-severity {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .alert-severity.severity-critical {
      background: #f8d7da;
      color: #721c24;
    }

    .alert-severity.severity-high {
      background: #fff3cd;
      color: #856404;
    }

    .alert-message {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .alert-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .alert-actions {
      display: flex;
      align-items: center;
    }

    .btn-acknowledge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #28a745;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #7f8c8d;
    }

    .empty-state .material-icons {
      font-size: 48px;
      margin-bottom: 12px;
      color: #ddd;
    }

    @media (max-width: 1400px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PatrolMonitoringDashboardComponent implements OnInit, OnDestroy {
  activePatrols: ActivePatrolMonitoring[] = [];
  guardsOnDuty: Guard[] = [];
  activeAlerts: PatrolAlert[] = [];
  statistics: PatrolMonitoringStatistics | null = null;
  isRefreshing = false;
  refreshInterval = 10; // seconds

  filter: PatrolMonitoringFilter = {
    showOnlyActive: true,
    showOnlyDelayed: false,
    showOnlyWithAlerts: false
  };

  private destroy$ = new Subject<void>();
  private refreshTimer$ = interval(this.refreshInterval * 1000);

  constructor(private monitoringService: PatrolMonitoringService) {}

  ngOnInit(): void {
    this.loadData();
    // Auto-refresh every 10 seconds
    this.refreshTimer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isRefreshing = true;
    
    // Load all data in parallel
    this.monitoringService.getActivePatrols(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patrols) => {
          this.activePatrols = patrols;
          this.isRefreshing = false;
        },
        error: (error) => {
          console.error('Error loading patrols:', error);
          this.isRefreshing = false;
        }
      });

    this.monitoringService.getGuards()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (guards) => {
          this.guardsOnDuty = guards;
        },
        error: (error) => {
          console.error('Error loading guards:', error);
        }
      });

    this.monitoringService.getActiveAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.activeAlerts = alerts;
        },
        error: (error) => {
          console.error('Error loading alerts:', error);
        }
      });

    this.monitoringService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
        }
      });
  }

  refreshData(): void {
    this.loadData();
  }

  applyFilters(): void {
    this.loadData();
  }

  acknowledgeAlert(alert: PatrolAlert): void {
    if (confirm('Acknowledge this alert?')) {
      this.monitoringService.acknowledgeAlert(alert.id, 'Current User')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              this.loadData();
            }
          },
          error: (error) => {
            console.error('Error acknowledging alert:', error);
          }
        });
    }
  }

  viewPatrolDetails(patrol: ActivePatrolMonitoring): void {
    // Navigate to patrol details
    console.log('View patrol details:', patrol.id);
  }

  getStatusLabel(status: PatrolStatus): string {
    const labels: { [key: string]: string } = {
      'IN_PROGRESS': 'In Progress',
      'COMPLETED': 'Completed',
      'ABANDONED': 'Abandoned',
      'DELAYED': 'Delayed',
      'NOT_STARTED': 'Not Started'
    };
    return labels[status] || status;
  }

  getGuardStatusLabel(status: GuardStatus): string {
    const labels: { [key: string]: string } = {
      'ON_DUTY': 'On Duty',
      'ON_PATROL': 'On Patrol',
      'OFF_DUTY': 'Off Duty',
      'BREAK': 'On Break',
      'EMERGENCY': 'Emergency'
    };
    return labels[status] || status;
  }

  getAlertTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'DELAY': 'Delay',
      'MISSED_CHECKPOINT': 'Missed Checkpoint',
      'EMERGENCY': 'Emergency',
      'LATE_SCAN': 'Late Scan',
      'ROUTE_DEVIATION': 'Route Deviation'
    };
    return labels[type] || type;
  }

  getGuardName(guardId: string): string {
    const guard = this.guardsOnDuty.find(g => g.id === guardId);
    return guard?.name || guardId;
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

