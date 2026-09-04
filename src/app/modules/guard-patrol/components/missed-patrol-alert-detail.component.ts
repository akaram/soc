import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MissedPatrolAlertService } from '../services/missed-patrol-alert.service';
import {
  MissedPatrolAlert,
  AlertSeverity,
  AlertStatus,
  MissedPatrolReason,
  PatrolNotification
} from '../models/missed-patrol-alert.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-missed-patrol-alert-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="missed-patrol-alert-detail-container" *ngIf="alert">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Alerts
        </button>
        <div class="header-actions">
          <button 
            class="btn-acknowledge" 
            (click)="acknowledgeAlert()"
            *ngIf="alert.status === AlertStatus.PENDING">
            <i class="material-icons">check</i>
            Acknowledge
          </button>
          <button 
            class="btn-resolve" 
            (click)="resolveAlert()"
            *ngIf="alert.status === AlertStatus.ACKNOWLEDGED || alert.status === AlertStatus.PENDING">
            <i class="material-icons">done_all</i>
            Resolve
          </button>
          <button class="btn-danger" (click)="deleteAlert()">
            <i class="material-icons">delete</i>
            Delete
          </button>
        </div>
      </div>

      <div class="detail-card">
        <!-- Alert Header -->
        <div class="alert-header-section">
          <div class="alert-icon-large" [ngClass]="'severity-' + alert.severity.toLowerCase()">
            <i class="material-icons">
              {{ alert.severity === AlertSeverity.CRITICAL ? 'error' : 
                 alert.severity === AlertSeverity.HIGH ? 'warning' : 
                 alert.severity === AlertSeverity.MEDIUM ? 'info' : 'notifications' }}
            </i>
          </div>
          <div class="alert-header-info">
            <h1>{{ alert.routeName }}</h1>
            <div class="alert-badges">
              <span class="badge-severity" [ngClass]="'severity-' + alert.severity.toLowerCase()">
                {{ alert.severity }}
              </span>
              <span class="badge-status" [ngClass]="'status-' + alert.status.toLowerCase()">
                {{ getStatusLabel(alert.status) }}
              </span>
              <span class="badge-reason">
                {{ getReasonLabel(alert.reason) }}
              </span>
              <span class="badge-priority" *ngIf="alert.priority >= 8">
                Priority: {{ alert.priority }}/10
              </span>
            </div>
            <p class="alert-description">{{ alert.description }}</p>
          </div>
        </div>

        <!-- Information Grid -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">person</i>
            </div>
            <div class="info-content">
              <div class="info-label">Guard Information</div>
              <div class="info-value">
                <div>{{ alert.guardName }}</div>
                <div *ngIf="alert.guardBadgeNumber" class="info-subtext">
                  Badge: {{ alert.guardBadgeNumber }}
                </div>
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">route</i>
            </div>
            <div class="info-content">
              <div class="info-label">Route</div>
              <div class="info-value">{{ alert.routeName }}</div>
              <div class="info-subtext">Route ID: {{ alert.routeId }}</div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">schedule</i>
            </div>
            <div class="info-content">
              <div class="info-label">Expected Time</div>
              <div class="info-value">
                {{ formatDateTime(alert.expectedStartTime) }}
              </div>
              <div class="info-subtext" *ngIf="alert.expectedEndTime">
                End: {{ formatDateTime(alert.expectedEndTime) }}
              </div>
            </div>
          </div>

          <div class="info-card" *ngIf="alert.actualStartTime">
            <div class="info-icon">
              <i class="material-icons">play_arrow</i>
            </div>
            <div class="info-content">
              <div class="info-label">Actual Start</div>
              <div class="info-value">
                {{ formatDateTime(alert.actualStartTime) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Missed Checkpoints -->
        <div class="missed-checkpoints-section" *ngIf="alert.missedCheckpointNames && alert.missedCheckpointNames.length > 0">
          <h2>
            <i class="material-icons">place</i>
            Missed Checkpoints ({{ alert.missedCheckpointNames.length }})
          </h2>
          <div class="checkpoints-list">
            <div *ngFor="let checkpoint of alert.missedCheckpointNames" class="checkpoint-item">
              <i class="material-icons">cancel</i>
              <span>{{ checkpoint }}</span>
            </div>
          </div>
        </div>

        <!-- Alert Timeline -->
        <div class="timeline-section">
          <h2>
            <i class="material-icons">timeline</i>
            Alert Timeline
          </h2>
          <div class="timeline">
            <div class="timeline-item">
              <div class="timeline-icon detected">
                <i class="material-icons">warning</i>
              </div>
              <div class="timeline-content">
                <h4>Alert Detected</h4>
                <p>{{ formatDateTime(alert.detectedAt) }}</p>
                <p class="timeline-by" *ngIf="alert.detectedBy">by {{ alert.detectedBy }}</p>
              </div>
            </div>
            <div class="timeline-item" *ngIf="alert.acknowledgedAt">
              <div class="timeline-icon acknowledged">
                <i class="material-icons">check_circle</i>
              </div>
              <div class="timeline-content">
                <h4>Acknowledged</h4>
                <p>{{ formatDateTime(alert.acknowledgedAt) }}</p>
                <p class="timeline-by" *ngIf="alert.acknowledgedBy">by {{ alert.acknowledgedBy }}</p>
              </div>
            </div>
            <div class="timeline-item" *ngIf="alert.resolvedAt">
              <div class="timeline-icon resolved">
                <i class="material-icons">done_all</i>
              </div>
              <div class="timeline-content">
                <h4>Resolved</h4>
                <p>{{ formatDateTime(alert.resolvedAt) }}</p>
                <p class="timeline-by" *ngIf="alert.resolvedBy">by {{ alert.resolvedBy }}</p>
                <p class="resolution-notes" *ngIf="alert.resolutionNotes">
                  {{ alert.resolutionNotes }}
                </p>
              </div>
            </div>
            <div class="timeline-item" *ngIf="alert.escalatedAt">
              <div class="timeline-icon escalated">
                <i class="material-icons">trending_up</i>
              </div>
              <div class="timeline-content">
                <h4>Escalated</h4>
                <p>{{ formatDateTime(alert.escalatedAt) }}</p>
                <p class="timeline-by" *ngIf="alert.escalatedTo">to {{ alert.escalatedTo }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="notifications-section" *ngIf="notifications.length > 0">
          <h2>
            <i class="material-icons">notifications</i>
            Notifications Sent ({{ notifications.length }})
          </h2>
          <div class="notifications-list">
            <div *ngFor="let notification of notifications" class="notification-item">
              <div class="notification-icon" [ngClass]="'type-' + notification.type.toLowerCase()">
                <i class="material-icons">
                  {{ notification.type === 'EMAIL' ? 'email' : 
                     notification.type === 'SMS' ? 'sms' : 
                     notification.type === 'PUSH' ? 'notifications' : 
                     notification.type === 'IN_APP' ? 'notifications_active' : 'settings' }}
                </i>
              </div>
              <div class="notification-content">
                <div class="notification-header">
                  <span class="notification-type">{{ notification.type }}</span>
                  <span class="notification-status" [ngClass]="'status-' + notification.status.toLowerCase()">
                    {{ notification.status }}
                  </span>
                </div>
                <p class="notification-message">{{ notification.message }}</p>
                <div class="notification-meta">
                  <span>To: {{ notification.recipientName }}</span>
                  <span>Sent: {{ formatDateTime(notification.sentAt) }}</span>
                  <span *ngIf="notification.deliveredAt">Delivered: {{ formatDateTime(notification.deliveredAt) }}</span>
                  <span *ngIf="notification.readAt">Read: {{ formatDateTime(notification.readAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="tags-section" *ngIf="alert.tags && alert.tags.length > 0">
          <h2>
            <i class="material-icons">label</i>
            Tags
          </h2>
          <div class="tags-list">
            <span *ngFor="let tag of alert.tags" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div class="loading-state" *ngIf="isLoading">
      <i class="material-icons">hourglass_empty</i>
      <p>Loading alert details...</p>
    </div>

    <!-- Error State -->
    <div class="error-state" *ngIf="!isLoading && !alert">
      <i class="material-icons">error_outline</i>
      <p>Alert not found</p>
      <button class="btn-primary" (click)="goBack()">Back to Alerts</button>
    </div>
  `,
  styles: [`
    .missed-patrol-alert-detail-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .btn-back {
      padding: 10px 20px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn-acknowledge,
    .btn-resolve,
    .btn-danger {
      padding: 10px 20px;
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

    .btn-acknowledge {
      background: #17a2b8;
      color: white;
    }

    .btn-acknowledge:hover {
      background: #138496;
    }

    .btn-resolve {
      background: #28a745;
      color: white;
    }

    .btn-resolve:hover {
      background: #218838;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .detail-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .alert-header-section {
      display: flex;
      gap: 24px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f0f0f0;
    }

    .alert-icon-large {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 40px;
      flex-shrink: 0;
    }

    .alert-icon-large.severity-critical {
      background: #dc3545;
    }

    .alert-icon-large.severity-high {
      background: #ffc107;
    }

    .alert-icon-large.severity-medium {
      background: #17a2b8;
    }

    .alert-icon-large.severity-low {
      background: #6c757d;
    }

    .alert-header-info {
      flex: 1;
    }

    .alert-header-info h1 {
      margin: 0 0 12px 0;
      font-size: 32px;
      color: #2c3e50;
    }

    .alert-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .badge-severity,
    .badge-status,
    .badge-reason,
    .badge-priority {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-severity.severity-critical {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-severity.severity-high {
      background: #fff3cd;
      color: #856404;
    }

    .badge-severity.severity-medium {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-severity.severity-low {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-status.status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .badge-status.status-acknowledged {
      background: #d1ecf1;
      color: #0c5460;
    }

    .badge-status.status-resolved {
      background: #d4edda;
      color: #155724;
    }

    .badge-reason {
      background: #e7f3ff;
      color: #004085;
    }

    .badge-priority {
      background: #f8d7da;
      color: #721c24;
    }

    .alert-description {
      margin: 12px 0 0 0;
      color: #7f8c8d;
      font-size: 15px;
      line-height: 1.6;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .info-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 16px;
    }

    .info-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .info-content {
      flex: 1;
    }

    .info-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .info-value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 600;
    }

    .info-subtext {
      font-size: 13px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .missed-checkpoints-section,
    .timeline-section,
    .notifications-section,
    .tags-section {
      margin-bottom: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .missed-checkpoints-section h2,
    .timeline-section h2,
    .notifications-section h2,
    .tags-section h2 {
      font-size: 20px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .checkpoints-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .checkpoint-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #fff5f5;
      border-radius: 8px;
      border-left: 4px solid #dc3545;
      color: #721c24;
    }

    .checkpoint-item .material-icons {
      color: #dc3545;
    }

    .timeline {
      position: relative;
      padding-left: 40px;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 24px;
      padding-left: 40px;
    }

    .timeline-item::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 40px;
      bottom: -24px;
      width: 2px;
      background: #e0e0e0;
    }

    .timeline-item:last-child::before {
      display: none;
    }

    .timeline-icon {
      position: absolute;
      left: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }

    .timeline-icon.detected {
      background: #ffc107;
    }

    .timeline-icon.acknowledged {
      background: #17a2b8;
    }

    .timeline-icon.resolved {
      background: #28a745;
    }

    .timeline-icon.escalated {
      background: #dc3545;
    }

    .timeline-content h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .timeline-content p {
      margin: 4px 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .timeline-by {
      font-size: 12px;
      color: #999;
    }

    .resolution-notes {
      margin-top: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-style: italic;
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .notification-item {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .notification-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .notification-icon.type-email {
      background: #667eea;
    }

    .notification-icon.type-sms {
      background: #10ac84;
    }

    .notification-icon.type-push {
      background: #ffc107;
    }

    .notification-icon.type-in_app {
      background: #17a2b8;
    }

    .notification-content {
      flex: 1;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .notification-type {
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
    }

    .notification-status {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .notification-status.status-sent,
    .notification-status.status-delivered {
      background: #d4edda;
      color: #155724;
    }

    .notification-status.status-read {
      background: #d1ecf1;
      color: #0c5460;
    }

    .notification-status.status-failed {
      background: #f8d7da;
      color: #721c24;
    }

    .notification-message {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #2c3e50;
    }

    .notification-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #7f8c8d;
      flex-wrap: wrap;
    }

    .tags-list {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tag {
      padding: 6px 12px;
      background: #e7f3ff;
      color: #004085;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .loading-state,
    .error-state {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .loading-state .material-icons,
    .error-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      color: #ddd;
    }

    .btn-primary {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    @media (max-width: 768px) {
      .alert-header-section {
        flex-direction: column;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MissedPatrolAlertDetailComponent implements OnInit, OnDestroy {
  alert: MissedPatrolAlert | null = null;
  notifications: PatrolNotification[] = [];
  isLoading = false;

  AlertSeverity = AlertSeverity;
  AlertStatus = AlertStatus;
  MissedPatrolReason = MissedPatrolReason;

  private destroy$ = new Subject<void>();
  private alertId: string | null = null;

  constructor(
    private alertService: MissedPatrolAlertService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      if (params['id']) {
        this.alertId = params['id'];
        if (this.alertId) {
          this.loadAlert(this.alertId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAlert(id: string): void {
    this.isLoading = true;
    
    this.alertService.getAlertById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alert) => {
          this.alert = alert;
          this.isLoading = false;
          if (alert) {
            this.loadNotifications(alert.id);
          }
        },
        error: (error) => {
          console.error('Error loading alert:', error);
          this.isLoading = false;
        }
      });
  }

  loadNotifications(alertId: string): void {
    this.alertService.getNotificationsForAlert(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/guard-patrol/missed-alerts']);
  }

  acknowledgeAlert(): void {
    if (this.alert && window.confirm(`Acknowledge this alert for ${this.alert.routeName}?`)) {
      this.alertService.updateAlert(this.alert.id, {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'Current User'
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && this.alertId) {
              this.loadAlert(this.alertId);
            } else {
              window.alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error acknowledging alert:', error);
            window.alert('Error acknowledging alert');
          }
        });
    }
  }

  resolveAlert(): void {
    if (this.alert) {
      const notes = window.prompt('Enter resolution notes (optional):');
      if (notes !== null) {
        this.alertService.updateAlert(this.alert.id, {
          status: AlertStatus.RESOLVED,
          resolvedBy: 'Current User',
          resolutionNotes: notes || undefined
        })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success && this.alertId) {
                this.loadAlert(this.alertId);
            } else {
              window.alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error resolving alert:', error);
            window.alert('Error resolving alert');
            }
          });
      }
    }
  }

  deleteAlert(): void {
    if (this.alert && window.confirm(`Are you sure you want to delete this alert for ${this.alert.routeName}?`)) {
      this.alertService.deleteAlert(this.alert.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.goBack();
            } else {
              window.alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error deleting alert:', error);
            window.alert('Error deleting alert');
          }
        });
    }
  }

  getStatusLabel(status: AlertStatus): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Pending',
      'ACKNOWLEDGED': 'Acknowledged',
      'RESOLVED': 'Resolved',
      'ESCALATED': 'Escalated',
      'DISMISSED': 'Dismissed'
    };
    return labels[status] || status;
  }

  getReasonLabel(reason: MissedPatrolReason): string {
    const labels: { [key: string]: string } = {
      'MISSED_CHECKPOINT': 'Missed Checkpoint',
      'DELAYED_START': 'Delayed Start',
      'INCOMPLETE_ROUTE': 'Incomplete Route',
      'ABANDONED': 'Abandoned',
      'TECHNICAL_ISSUE': 'Technical Issue',
      'GUARD_ABSENT': 'Guard Absent',
      'EMERGENCY': 'Emergency',
      'OTHER': 'Other'
    };
    return labels[reason] || reason;
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

