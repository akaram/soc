import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import {
  GuardDashboardCheckpoint,
  GuardDashboardPendingVisitor,
  GuardActiveGatepass,
  GuardActiveRecurringVisitor,
  GuardDashboardService
} from '../services/guard-dashboard.service';
import { SosAlertRow } from '../../core/services/sos-api.service';
import { MobileAuthService, MobileUser } from '../services/mobile-auth.service';
import { ProfileAvatarComponent } from '../../core/components/profile-avatar.component';
import { ToastService } from '../../core/services/toast.service';

const SOS_POLL_INTERVAL_MS = 20000;

@Component({
  selector: 'app-guard-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ProfileAvatarComponent],
  template: `
    <div class="guard-dashboard">
      <div class="loading-banner" *ngIf="isLoading">Loading dashboard…</div>
      <div class="error-banner" *ngIf="errorMessage">{{ errorMessage }}</div>

      <!-- Guard ID photo (tap camera to capture) -->
      <div class="guard-profile-card" *ngIf="guardUser">
        <app-profile-avatar
          [photoUrl]="guardUser.profilePhoto"
          [name]="guardUser.name"
          role="GUARD"
          size="md"
          [editable]="true"
          [preferCamera]="true"
          fallbackGradient="linear-gradient(135deg, #475569 0%, #334155 100%)"
          (photoChange)="onGuardPhotoChange($event)"
          (uploadError)="onGuardPhotoError($event)"
        ></app-profile-avatar>
        <div class="guard-profile-text">
          <h3>{{ guardUser.name }}</h3>
          <p>Security Guard · {{ guardUser.employeeId || 'On duty' }}</p>
          <button type="button" class="profile-link" routerLink="/mobile/profile">View full profile</button>
        </div>
      </div>

      <!-- Active SOS Alerts -->
      <div class="sos-banner" *ngIf="activeSosAlerts.length > 0">
        <h3><i class="material-icons pulse">notifications_active</i> Active SOS ({{ activeSosAlerts.length }})</h3>
        <div class="sos-item" *ngFor="let a of activeSosAlerts">
          <div class="sos-item-info">
            <strong>{{ a.triggeredByName || 'Resident' }}</strong>
            <span *ngIf="a.flatNumber"> · Flat {{ a.flatNumber }}</span>
            <span class="sos-pill" [class]="a.status.toLowerCase()">{{ a.status }}</span>
            <p class="sos-message">{{ a.message || 'Emergency SOS — immediate assistance required' }}</p>
          </div>
          <button
            *ngIf="a.status === 'ACTIVE'"
            type="button"
            class="sos-ack-btn"
            (click)="acknowledgeSos(a)"
            [disabled]="ackBusy"
          >
            Acknowledge
          </button>
          <span class="sos-acked" *ngIf="a.status === 'ACKNOWLEDGED'">
            <i class="material-icons">check_circle</i> Acknowledged
          </span>
        </div>
      </div>

      <!-- Shift Info Banner -->
      <div class="shift-banner">
        <div class="shift-info">
          <h3>Current Shift</h3>
          <p class="shift-time">{{ shiftLabel }}</p>
          <p class="time-remaining">{{ timeRemaining }}</p>
        </div>
        <button class="attendance-btn" (click)="markAttendance()">
          <i class="material-icons">fingerprint</i>
          <span>Mark Attendance</span>
        </button>
      </div>

      <!-- Cooks / domestic staff (admin Domestic Staff) — gate approve with photo & ID -->
      <a class="staff-gate-cta" routerLink="/mobile/guard/domestic-staff">
        <div class="cta-icon"><i class="material-icons">restaurant</i></div>
        <div class="cta-text">
          <strong>Approve cook / staff</strong>
          <span>View photo, flat &amp; ID, then allow entry</span>
        </div>
        <i class="material-icons">chevron_right</i>
      </a>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <div class="stat-card clickable" (click)="openPendingApprovals()" role="button" tabindex="0" (keyup.enter)="openPendingApprovals()">
          <i class="material-icons">group_add</i>
          <div class="stat-content">
            <h4>{{ stats.pendingVisitors }}</h4>
            <p>Pending Approvals</p>
          </div>
        </div>
        <div class="stat-card clickable" (click)="openApprovedToday()" role="button" tabindex="0" (keyup.enter)="openApprovedToday()">
          <i class="material-icons">check_circle</i>
          <div class="stat-content">
            <h4>{{ stats.approvedToday }}</h4>
            <p>Approved Today</p>
          </div>
        </div>
        <div class="stat-card clickable" (click)="openGatepasses()" role="button" tabindex="0" (keyup.enter)="openGatepasses()">
          <i class="material-icons">badge</i>
          <div class="stat-content">
            <h4>{{ stats.activeGatepasses }}</h4>
            <p>Monthly Passes</p>
          </div>
        </div>
        <div class="stat-card clickable" (click)="openRecurringVisitors()" role="button" tabindex="0" (keyup.enter)="openRecurringVisitors()">
          <i class="material-icons">engineering</i>
          <div class="stat-content">
            <h4>{{ stats.activeRecurringVisitors }}</h4>
            <p>Daily Help</p>
          </div>
        </div>
        <div class="stat-card clickable" (click)="openPatrolSummary()" role="button" tabindex="0" (keyup.enter)="openPatrolSummary()">
          <i class="material-icons">route</i>
          <div class="stat-content">
            <h4>{{ stats.patrolsCompleted }}/{{ stats.totalPatrols }}</h4>
            <p>Patrols Done</p>
          </div>
        </div>
        <div class="stat-card alert clickable" (click)="openIncidents()" role="button" tabindex="0" (keyup.enter)="openIncidents()">
          <i class="material-icons">warning</i>
          <div class="stat-content">
            <h4>{{ stats.incidents }}</h4>
            <p>Incidents</p>
          </div>
        </div>
      </div>

      <!-- Active Monthly Gatepasses -->
      <div class="section" *ngIf="activeGatepasses.length > 0">
        <div class="section-header">
          <h3 class="section-title">
            Monthly Gatepasses
            <span class="badge">{{ activeGatepasses.length }}</span>
          </h3>
          <a routerLink="/mobile/guard/gatepasses" class="view-all">View All</a>
        </div>

        <div class="gatepass-preview-list">
          <div class="gatepass-preview-card" *ngFor="let gp of activeGatepasses | slice:0:3">
            <div class="gp-avatar">{{ gp.visitorName.charAt(0) }}</div>
            <div class="gp-info">
              <h4>{{ gp.visitorName }}</h4>
              <p>Flat {{ gp.flatNumber }} · {{ gp.purpose }}</p>
              <span class="gp-validity">{{ gp.validityDays }} days left</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Recurring Visitors (Daily Help) -->
      <div class="section" *ngIf="activeRecurringVisitors.length > 0">
        <div class="section-header">
          <h3 class="section-title">
            Daily Help
            <span class="badge">{{ activeRecurringVisitors.length }}</span>
          </h3>
          <a routerLink="/mobile/guard/recurring-visitors" class="view-all">View All</a>
        </div>

        <div class="gatepass-preview-list">
          <div class="gatepass-preview-card recurring" *ngFor="let rv of activeRecurringVisitors | slice:0:3">
            <div class="gp-avatar">{{ rv.name.charAt(0) }}</div>
            <div class="gp-info">
              <h4>{{ rv.name }}</h4>
              <p>Flat {{ rv.flatNumber }} · {{ rv.purpose }}</p>
              <span class="gp-schedule">{{ rv.visitTime }} · {{ rv.recurringPattern }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Visitor Approvals -->
      <div class="section" *ngIf="pendingVisitors.length > 0">
        <div class="section-header">
          <h3 class="section-title">
            Pending Approvals 
            <span class="badge">{{ pendingVisitors.length }}</span>
          </h3>
          <a routerLink="/mobile/guard/visitor-approvals" class="view-all">View All</a>
        </div>
        
        <div class="visitors-list">
          <div *ngFor="let visitor of pendingVisitors" class="visitor-approval-card">
            <div class="visitor-photo">
              <img [src]="visitor.photo || 'https://via.placeholder.com/60'" alt="{{ visitor.name }}">
              <button class="scan-btn" (click)="scanDocument(visitor)">
                <i class="material-icons">qr_code_scanner</i>
              </button>
            </div>
            
            <div class="visitor-info">
              <h4>{{ visitor.name }}</h4>
              <p class="flat-info">
                <i class="material-icons">home</i>
                {{ visitor.flatNumber }} - {{ visitor.ownerName }}
              </p>
              <p class="purpose">{{ visitor.purpose }}</p>
              <p class="vehicle" *ngIf="visitor.vehicleNumber">
                <i class="material-icons">directions_car</i>
                {{ visitor.vehicleNumber }}
              </p>
              <p class="time">
                <i class="material-icons">schedule</i>
                Expected: {{ visitor.arrivalTime }}
              </p>
            </div>
            
            <div class="approval-actions">
              <button class="approve-btn" (click)="approveVisitor(visitor)">
                <i class="material-icons">check</i>
              </button>
              <button class="reject-btn" (click)="rejectVisitor(visitor)">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Patrol Route -->
      <div class="section" id="today-patrol">
        <div class="section-header">
          <h3 class="section-title">Today's Patrol Route</h3>
          <button class="start-patrol-btn" (click)="startPatrol()">
            <i class="material-icons">route</i>
            Start Patrol
          </button>
        </div>
        
        <div class="patrol-timeline">
          <div *ngFor="let checkpoint of patrolCheckpoints; let i = index" 
               class="checkpoint-item"
               [ngClass]="'status-' + checkpoint.status">
            <div class="checkpoint-icon">
              <i class="material-icons">{{ checkpoint.icon }}</i>
              <span class="checkpoint-number">{{ i + 1 }}</span>
            </div>
            <div class="checkpoint-details">
              <h4>{{ checkpoint.location }}</h4>
              <p class="checkpoint-time" *ngIf="checkpoint.time">
                {{ checkpoint.time }}
              </p>
              <button *ngIf="checkpoint.status === 'pending'" 
                      class="scan-qr-btn"
                      (click)="scanCheckpoint(checkpoint)">
                <i class="material-icons">qr_code_scanner</i>
                Scan QR Code
              </button>
            </div>
            <div class="checkpoint-status">
              <i class="material-icons" *ngIf="checkpoint.status === 'completed'">check_circle</i>
              <i class="material-icons" *ngIf="checkpoint.status === 'missed'">cancel</i>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h3 class="section-title">Quick Actions</h3>
        <div class="action-buttons">
          <a routerLink="/mobile/guard/domestic-staff" class="action-btn">
            <i class="material-icons">restaurant</i>
            <span>Cooks &amp; Staff</span>
          </a>
          <a routerLink="/mobile/guard/domestic-staff/verify" class="action-btn">
            <i class="material-icons">vpn_key</i>
            <span>Staff Passcode</span>
          </a>
          <a routerLink="/mobile/guard/gatepasses" class="action-btn">
            <i class="material-icons">badge</i>
            <span>Monthly Gatepass</span>
            <span class="action-badge" *ngIf="stats.activeGatepasses > 0">{{ stats.activeGatepasses }}</span>
          </a>
          <a routerLink="/mobile/guard/recurring-visitors" class="action-btn">
            <i class="material-icons">engineering</i>
            <span>Daily Help</span>
            <span class="action-badge" *ngIf="stats.activeRecurringVisitors > 0">{{ stats.activeRecurringVisitors }}</span>
          </a>
          <a routerLink="/mobile/guard/visitor-approvals" class="action-btn" *ngIf="pendingVisitors.length > 0">
            <i class="material-icons">how_to_reg</i>
            <span>Visitor Approvals</span>
            <span class="action-badge" *ngIf="pendingVisitors.length > 0">{{ pendingVisitors.length }}</span>
          </a>
          <button class="action-btn" (click)="walkinEntry()">
            <i class="material-icons">person_add</i>
            <span>Walk-in Entry</span>
          </button>
          <button class="action-btn incident" (click)="reportIncident()">
            <i class="material-icons">report_problem</i>
            <span>Report Incident</span>
          </button>
          <button class="action-btn" (click)="packageReceived()">
            <i class="material-icons">inventory_2</i>
            <span>Package Received</span>
          </button>
          <button class="action-btn emergency" (click)="triggerEmergency()">
            <i class="material-icons">emergency</i>
            <span>Emergency Alert</span>
          </button>
        </div>
      </div>

      <!-- Recent Activities -->
      <div class="section">
        <h3 class="section-title">Recent Activities</h3>
        <div class="activities-list" *ngIf="recentActivities.length > 0">
          <div *ngFor="let activity of recentActivities" class="activity-item">
            <div class="activity-icon" [ngClass]="activity.type">
              <i class="material-icons">{{ activity.icon }}</i>
            </div>
            <div class="activity-details">
              <h4>{{ activity.title }}</h4>
              <p>{{ activity.description }}</p>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          </div>
        </div>
        <p class="empty-hint" *ngIf="!isLoading && recentActivities.length === 0">
          No recent patrol scans or visitor requests yet.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .guard-dashboard {
      padding: 16px;
      padding-bottom: 80px;
      background: #f5f5f5;
    }

    .loading-banner,
    .error-banner {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .loading-banner {
      background: #e8f4fd;
      color: #0c5460;
    }

    .error-banner {
      background: #f8d7da;
      color: #721c24;
    }

    /* SOS Banner */
    .sos-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #ef4444;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 20px;
    }

    .sos-banner h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px;
      font-size: 16px;
      color: #b91c1c;
    }

    .pulse {
      color: #ef4444;
      animation: pulse 1.2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .sos-item {
      background: white;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .sos-item:last-child {
      margin-bottom: 0;
    }

    .sos-item-info strong {
      font-size: 14px;
      color: #1e293b;
    }

    .sos-pill {
      margin-left: 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 999px;
      background: #fee2e2;
      color: #b91c1c;
    }

    .sos-pill.acknowledged {
      background: #fef3c7;
      color: #b45309;
    }

    .sos-message {
      margin: 4px 0 0;
      font-size: 13px;
      color: #475569;
    }

    .sos-ack-btn {
      background: #f59e0b;
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .sos-ack-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .sos-acked {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #059669;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .sos-acked .material-icons {
      font-size: 18px;
    }

    /* Shift Banner */
    .shift-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .shift-info h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      opacity: 0.9;
    }

    .shift-time {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }

    .time-remaining {
      margin: 4px 0 0 0;
      font-size: 13px;
      opacity: 0.8;
    }

    .attendance-btn {
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stat-card.alert {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
    }

    .stat-card i {
      font-size: 32px;
      color: #667eea;
    }

    .stat-card.alert i {
      color: #ffc107;
    }

    .stat-content h4 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 700;
      color: #333;
    }

    .stat-content p {
      margin: 0;
      font-size: 12px;
      color: #666;
    }

    /* Section */
    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title .badge {
      background: #ff4444;
      color: white;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .view-all {
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }

    .start-patrol-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
      cursor: pointer;
    }

    /* Visitor Approval Cards */
    .visitors-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .visitor-approval-card {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      gap: 12px;
    }

    .visitor-photo {
      position: relative;
    }

    .visitor-photo img {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      object-fit: cover;
    }

    .scan-btn {
      position: absolute;
      bottom: -8px;
      right: -8px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
    }

    .scan-btn i {
      font-size: 18px;
    }

    .visitor-info {
      flex: 1;
    }

    .visitor-info h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .visitor-info p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .visitor-info p i {
      font-size: 16px;
    }

    .approval-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      justify-content: center;
    }

    .approve-btn, .reject-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }

    .approve-btn {
      background: #28a745;
      color: white;
    }

    .reject-btn {
      background: #dc3545;
      color: white;
    }

    .approve-btn:active, .reject-btn:active {
      transform: scale(0.9);
    }

    /* Patrol Timeline */
    .patrol-timeline {
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .checkpoint-item {
      display: flex;
      gap: 12px;
      padding: 16px 0;
      border-left: 2px solid #ddd;
      margin-left: 20px;
      position: relative;
    }

    .checkpoint-item:last-child {
      border-left: none;
    }

    .checkpoint-item.status-completed {
      border-left-color: #28a745;
    }

    .checkpoint-item.status-missed {
      border-left-color: #dc3545;
    }

    .checkpoint-icon {
      position: relative;
      margin-left: -32px;
    }

    .checkpoint-icon i {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: white;
      border: 2px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #999;
    }

    .checkpoint-item.status-completed .checkpoint-icon i {
      border-color: #28a745;
      color: #28a745;
      background: #d4edda;
    }

    .checkpoint-item.status-missed .checkpoint-icon i {
      border-color: #dc3545;
      color: #dc3545;
      background: #f8d7da;
    }

    .checkpoint-number {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .checkpoint-details {
      flex: 1;
    }

    .checkpoint-details h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
    }

    .checkpoint-time {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #999;
    }

    .scan-qr-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    .checkpoint-status i {
      font-size: 24px;
    }

    .checkpoint-item.status-completed .checkpoint-status i {
      color: #28a745;
    }

    .checkpoint-item.status-missed .checkpoint-status i {
      color: #dc3545;
    }

    /* Action Buttons */
    .action-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .action-btn {
      background: white;
      padding: 16px;
      border-radius: 12px;
      border: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
      text-decoration: none;
      color: inherit;
      position: relative;
    }

    .action-btn:active {
      transform: scale(0.95);
    }

    .action-btn i {
      font-size: 32px;
      color: #667eea;
    }

    .action-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #ff4757;
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }

    .action-btn.incident i {
      color: #ffc107;
    }

    .action-btn.emergency {
      background: #dc3545;
      color: white;
    }

    .action-btn.emergency i {
      color: white;
    }

    .action-btn span {
      font-size: 13px;
      font-weight: 500;
      color: #333;
    }

    .action-btn.emergency span {
      color: white;
    }

    /* Activities */
    .activities-list {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .activity-item {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .activity-icon.approved {
      background: #d4edda;
      color: #28a745;
    }

    .activity-icon.rejected {
      background: #f8d7da;
      color: #dc3545;
    }

    .activity-icon.patrol {
      background: #d1ecf1;
      color: #0c5460;
    }

    .activity-details {
      flex: 1;
    }

    .activity-details h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
    }

    .activity-details p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #666;
    }

    .activity-time {
      font-size: 12px;
      color: #999;
    }

    .empty-hint {
      margin: 0;
      padding: 16px;
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
      background: #f8fafc;
      border-radius: 12px;
    }

    .stat-card.clickable {
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .stat-card.clickable:active {
      transform: scale(0.98);
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    }

    .guard-profile-card {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 12px 16px 0;
      padding: 16px;
      background: white;
      border-radius: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .guard-profile-text h3 {
      margin: 0 0 4px;
      font-size: 18px;
      color: #1e293b;
    }

    .guard-profile-text p {
      margin: 0 0 8px;
      font-size: 13px;
      color: #64748b;
    }

    .profile-link {
      background: none;
      border: none;
      padding: 0;
      color: #667eea;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }

    .staff-gate-cta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 16px;
      padding: 14px 16px;
      border-radius: 14px;
      text-decoration: none;
      color: #fff;
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      box-shadow: 0 4px 14px rgba(15, 118, 110, 0.35);
    }
    .staff-gate-cta .cta-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .staff-gate-cta .cta-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .staff-gate-cta .cta-text strong { font-size: 15px; }
    .staff-gate-cta .cta-text span { font-size: 12px; opacity: 0.9; }

    .gatepass-preview-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .gatepass-preview-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-left: 3px solid #667eea;
    }

    .gp-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }

    .gp-info h4 {
      margin: 0 0 4px;
      font-size: 15px;
      color: #1e293b;
    }

    .gp-info p {
      margin: 0 0 4px;
      font-size: 12px;
      color: #64748b;
    }

    .gp-validity {
      font-size: 11px;
      font-weight: 600;
      color: #166534;
      background: #dcfce7;
      padding: 2px 8px;
      border-radius: 999px;
    }

    .gatepass-preview-card.recurring {
      border-left-color: #0ea5e9;
    }

    .gp-schedule {
      font-size: 11px;
      font-weight: 600;
      color: #0369a1;
      background: #e0f2fe;
      padding: 2px 8px;
      border-radius: 999px;
    }
  `]
})
export class GuardDashboardComponent implements OnInit, OnDestroy {
  guardUser: MobileUser | null = null;
  isLoading = false;
  errorMessage = '';
  shiftLabel = 'Loading shift…';
  timeRemaining = '';
  activeSosAlerts: SosAlertRow[] = [];
  ackBusy = false;
  private sosPollSub?: Subscription;

  stats = {
    pendingVisitors: 0,
    approvedToday: 0,
    activeGatepasses: 0,
    activeRecurringVisitors: 0,
    patrolsCompleted: 0,
    totalPatrols: 0,
    incidents: 0
  };

  pendingVisitors: GuardDashboardPendingVisitor[] = [];
  activeGatepasses: GuardActiveGatepass[] = [];
  activeRecurringVisitors: GuardActiveRecurringVisitor[] = [];
  patrolCheckpoints: GuardDashboardCheckpoint[] = [];
  recentActivities: { icon: string; type: string; title: string; description: string; time: string }[] = [];

  constructor(
    private guardDashboard: GuardDashboardService,
    private router: Router,
    private authService: MobileAuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => (this.guardUser = user));
    this.refreshDashboard();
    // Poll independently of the full dashboard refresh — SOS visibility is time-critical.
    this.sosPollSub = interval(SOS_POLL_INTERVAL_MS).subscribe(() => this.pollSosAlerts());
  }

  ngOnDestroy(): void {
    this.sosPollSub?.unsubscribe();
  }

  private pollSosAlerts(): void {
    this.guardDashboard.loadActiveSosAlerts().subscribe(alerts => (this.activeSosAlerts = alerts));
  }

  acknowledgeSos(alert: SosAlertRow): void {
    this.ackBusy = true;
    this.guardDashboard.acknowledgeSos(alert.id).subscribe({
      next: () => {
        this.ackBusy = false;
        this.pollSosAlerts();
      },
      error: () => {
        this.ackBusy = false;
        this.errorMessage = 'Could not acknowledge SOS alert.';
      }
    });
  }

  /** Load dashboard data from backend APIs. */
  refreshDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.guardDashboard.loadDashboard().subscribe({
      next: data => {
        this.shiftLabel = data.shift.shiftLabel;
        this.timeRemaining = data.shift.timeRemaining;
        this.stats = data.stats;
        this.pendingVisitors = data.pendingVisitors;
        this.activeGatepasses = data.activeGatepasses;
        this.activeRecurringVisitors = data.activeRecurringVisitors;
        this.patrolCheckpoints = data.patrolCheckpoints;
        this.recentActivities = data.recentActivities;
        this.activeSosAlerts = data.activeSosAlerts;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load dashboard. Pull to refresh or check your connection.';
        this.isLoading = false;
      }
    });
  }

  openGatepasses(): void {
    this.router.navigate(['/mobile/guard/gatepasses']);
  }

  openRecurringVisitors(): void {
    this.router.navigate(['/mobile/guard/recurring-visitors']);
  }

  openPendingApprovals(): void {
    this.router.navigate(['/mobile/guard/visitor-approvals'], {
      queryParams: { view: 'pending' }
    });
  }

  onGuardPhotoChange(dataUrl: string): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return;
    }
    this.authService.persistProfilePhoto(user.id, dataUrl, {
      onSuccess: () => this.toast.success('Guard photo saved.'),
      onError: () => this.toast.warning('Photo saved on device. Server sync failed.')
    });
  }

  onGuardPhotoError(message: string): void {
    this.toast.warning(message);
  }

  /** Open today's approved / checked-in visitors. */
  openApprovedToday(): void {
    this.router.navigate(['/mobile/guard/visitor-approvals'], {
      queryParams: { view: 'onSite' }
    });
  }

  /** Jump to today's patrol checkpoint details. */
  openPatrolSummary(): void {
    this.router.navigate(['/mobile/guard/patrol'], {
      queryParams: { view: 'today' }
    });
  }

  /** Open reported incidents list. */
  openIncidents(): void {
    this.router.navigate(['/mobile/guard/incidents']);
  }

  markAttendance(): void {
    this.router.navigate(['/mobile/guard/attendance']);
  }

  approveVisitor(visitor: GuardDashboardPendingVisitor): void {
    if (!confirm(`Approve ${visitor.name} for ${visitor.flatNumber}?`)) {
      return;
    }
    this.guardDashboard.approveVisitor(visitor.id).subscribe({
      next: () => {
        this.refreshDashboard();
      },
      error: () => {
        this.errorMessage = `Failed to approve ${visitor.name}.`;
      }
    });
  }

  rejectVisitor(visitor: GuardDashboardPendingVisitor): void {
    const reason = prompt(`Why are you rejecting ${visitor.name}?`);
    if (!reason?.trim()) {
      return;
    }
    this.guardDashboard.rejectVisitor(visitor.id, reason.trim()).subscribe({
      next: () => {
        this.refreshDashboard();
      },
      error: () => {
        this.errorMessage = `Failed to reject ${visitor.name}.`;
      }
    });
  }

  scanDocument(visitor: GuardDashboardPendingVisitor): void {
    this.router.navigate(['/mobile/guard/visitor-approvals'], {
      queryParams: { visitorId: visitor.id }
    });
  }

  startPatrol(): void {
    this.router.navigate(['/mobile/guard/patrol']);
  }

  /** Open QR scanner for patrol checkpoint — camera starts automatically. */
  scanCheckpoint(checkpoint: GuardDashboardCheckpoint): void {
    this.router.navigate(['/mobile/guard/scan'], {
      queryParams: {
        type: 'patrol',
        checkpointId: checkpoint.id,
        checkpointCode: checkpoint.checkpointCode,
        autoStart: 'true'
      }
    });
  }

  walkinEntry(): void {
    this.router.navigate(['/mobile/guard/walk-in'], {
      queryParams: { returnUrl: '/mobile/guard/dashboard' }
    });
  }

  reportIncident(): void {
    this.router.navigate(['/mobile/guard/incidents/report']);
  }

  packageReceived(): void {
    this.router.navigate(['/mobile/guard/packages']);
  }

  triggerEmergency(): void {
    if (
      confirm(
        'Trigger an emergency alert? This will open the incident report form with urgent priority.'
      )
    ) {
      this.router.navigate(['/mobile/guard/incidents/report'], { queryParams: { priority: 'urgent' } });
    }
  }
}
