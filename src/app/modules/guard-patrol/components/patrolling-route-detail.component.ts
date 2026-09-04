import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { PatrollingRouteService } from '../services/patrolling-route.service';
import {
  PatrollingRoute,
  Checkpoint,
  CheckpointType,
  RouteStatus
} from '../models/patrolling-route.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { createPatrolQrDataUrl, downloadQrPng } from '../utils/patrol-qr.util';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-patrolling-route-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="patrolling-route-detail-container" *ngIf="route">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Routes
        </button>
        <div class="header-actions">
          <button class="btn-secondary" (click)="editRoute()">
            <i class="material-icons">edit</i>
            Edit Route
          </button>
          <button class="btn-danger" (click)="deleteRoute()">
            <i class="material-icons">delete</i>
            Delete
          </button>
        </div>
      </div>

      <div class="detail-card">
        <!-- Route Header -->
        <div class="route-header-section">
          <div class="route-icon-large">
            <i class="material-icons">route</i>
          </div>
          <div class="route-header-info">
            <h1>{{ route.name }}</h1>
            <div class="route-badges">
              <span class="badge-status" [ngClass]="getStatusClass(route.status)">
                {{ getStatusLabel(route.status) }}
              </span>
              <span class="badge-schedule">{{ route.scheduleType }}</span>
              <span class="badge-checkpoints">
                <i class="material-icons">place</i>
                {{ route.checkpoints.length }} Checkpoints
              </span>
            </div>
            <p *ngIf="route.description" class="route-description">{{ route.description }}</p>
            <div class="route-code" *ngIf="route.code">
              <i class="material-icons">tag</i>
              <span>Code: {{ route.code }}</span>
            </div>
          </div>
        </div>

        <!-- Route Information Grid -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">schedule</i>
            </div>
            <div class="info-content">
              <div class="info-label">Schedule</div>
              <div class="info-value">
                <div *ngIf="route.scheduleType === 'DAILY' && route.scheduleTime">
                  Daily at {{ route.scheduleTime }}
                </div>
                <div *ngIf="route.scheduleType === 'WEEKLY' && route.scheduleDays && route.scheduleDays.length > 0">
                  {{ route.scheduleDays.join(', ') }}
                </div>
                <div *ngIf="route.scheduleType === 'CUSTOM'">
                  Custom Schedule
                </div>
                <div *ngIf="route.scheduleType === 'ON_DEMAND'">
                  On Demand
                </div>
                <div *ngIf="route.startTime && route.endTime" class="time-range">
                  {{ route.startTime }} - {{ route.endTime }}
                </div>
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">timer</i>
            </div>
            <div class="info-content">
              <div class="info-label">Duration</div>
              <div class="info-value">
                {{ route.estimatedDuration || 'N/A' }} minutes
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">check_circle</i>
            </div>
            <div class="info-content">
              <div class="info-label">Requirements</div>
              <div class="info-value">
                <div *ngIf="route.requiresAllCheckpoints">All checkpoints required</div>
                <div *ngIf="!route.requiresAllCheckpoints">Some checkpoints optional</div>
                <div *ngIf="route.allowSkipping" class="text-muted">Skipping allowed</div>
                <div *ngIf="route.maxLateMinutes" class="text-muted">
                  Max late: {{ route.maxLateMinutes }} minutes
                </div>
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-icon">
              <i class="material-icons">trending_up</i>
            </div>
            <div class="info-content">
              <div class="info-label">Statistics</div>
              <div class="info-value">
                <div>Total Patrols: {{ route.totalPatrols || 0 }}</div>
                <div>Completed: {{ route.completedPatrols || 0 }}</div>
                <div *ngIf="route.averageCompletionTime">
                  Avg Time: {{ route.averageCompletionTime }}m
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Checkpoints Section -->
        <div class="checkpoints-section">
          <div class="section-header">
            <h2>
              <i class="material-icons">place</i>
              Checkpoints ({{ route.checkpoints.length }})
            </h2>
          </div>

          <div class="checkpoints-timeline">
            <div 
              *ngFor="let checkpoint of route.checkpoints; let i = index; let isLast = last" 
              class="checkpoint-timeline-item">
              <div class="checkpoint-connector" *ngIf="!isLast"></div>
              <div class="checkpoint-card">
                <div class="checkpoint-header">
                  <div class="checkpoint-number-large">{{ i + 1 }}</div>
                  <div class="checkpoint-title-section">
                    <h3>{{ checkpoint.name }}</h3>
                    <span class="checkpoint-type-badge">
                      {{ getCheckpointTypeLabel(checkpoint.type) }}
                    </span>
                    <span class="checkpoint-required-badge" *ngIf="checkpoint.isRequired">
                      Required
                    </span>
                  </div>
                </div>
                <div class="checkpoint-body">
                  <div class="checkpoint-details-grid">
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.description">
                      <i class="material-icons">description</i>
                      <span>{{ checkpoint.description }}</span>
                    </div>
                    <div class="checkpoint-detail-item">
                      <i class="material-icons">location_on</i>
                      <span>{{ checkpoint.location }}</span>
                    </div>
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.buildingName">
                      <i class="material-icons">business</i>
                      <span>{{ checkpoint.buildingName }}</span>
                    </div>
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.floorNumber !== undefined">
                      <i class="material-icons">layers</i>
                      <span>Floor {{ checkpoint.floorNumber }}</span>
                    </div>
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.area">
                      <i class="material-icons">map</i>
                      <span>{{ checkpoint.area }}</span>
                    </div>
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.qrCode">
                      <i class="material-icons">qr_code</i>
                      <span>QR: {{ checkpoint.qrCode }}</span>
                    </div>
                    <div class="checkpoint-qr-panel" *ngIf="checkpoint.type === CheckpointType.QR_CODE">
                      <div class="checkpoint-qr-preview" *ngIf="getQrPreview(checkpoint.id)">
                        <img [src]="getQrPreview(checkpoint.id)" [alt]="'QR for ' + checkpoint.name">
                      </div>
                      <button
                        type="button"
                        class="btn-download-qr"
                        (click)="downloadCheckpointQr(checkpoint)"
                        [disabled]="qrDownloadingId === checkpoint.id">
                        <i class="material-icons">download</i>
                        {{ qrDownloadingId === checkpoint.id ? 'Generating…' : 'Download QR sticker' }}
                      </button>
                    </div>
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.nfcTagId">
                      <i class="material-icons">nfc</i>
                      <span>NFC: {{ checkpoint.nfcTagId }}</span>
                    </div>
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.latitude && checkpoint.longitude">
                      <i class="material-icons">gps_fixed</i>
                      <span>{{ checkpoint.latitude }}, {{ checkpoint.longitude }}</span>
                    </div>
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.expectedDuration">
                      <i class="material-icons">timer</i>
                      <span>Expected: {{ checkpoint.expectedDuration }} minutes</span>
                    </div>
                    <div class="checkpoint-detail-item" *ngIf="checkpoint.scanWindow">
                      <i class="material-icons">schedule</i>
                      <span>Scan Window: ±{{ checkpoint.scanWindow }} minutes</span>
                    </div>
                  </div>
                  <div class="checkpoint-requirements">
                    <span class="requirement-badge" *ngIf="checkpoint.requiresPhoto">
                      <i class="material-icons">camera_alt</i>
                      Photo Required
                    </span>
                    <span class="requirement-badge" *ngIf="checkpoint.requiresNotes">
                      <i class="material-icons">note</i>
                      Notes Required
                    </span>
                  </div>
                  <div class="checkpoint-notes" *ngIf="checkpoint.notes">
                    <i class="material-icons">note</i>
                    <span>{{ checkpoint.notes }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="additional-info-section" *ngIf="route.notes || route.tags">
          <h2>
            <i class="material-icons">info</i>
            Additional Information
          </h2>
          <div class="notes-section" *ngIf="route.notes">
            <h3>Notes</h3>
            <p>{{ route.notes }}</p>
          </div>
          <div class="tags-section" *ngIf="route.tags && route.tags.length > 0">
            <h3>Tags</h3>
            <div class="tags-list">
              <span *ngFor="let tag of route.tags" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Last Patrol Info -->
        <div class="last-patrol-section" *ngIf="route.lastPatrolAt">
          <div class="last-patrol-card">
            <i class="material-icons">history</i>
            <div class="last-patrol-info">
              <div class="last-patrol-label">Last Patrol</div>
              <div class="last-patrol-value">
                {{ formatDateTime(route.lastPatrolAt) }}
                <span *ngIf="route.lastPatrolBy"> by {{ route.lastPatrolBy }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div class="loading-state" *ngIf="isLoading">
      <i class="material-icons">hourglass_empty</i>
      <p>Loading route details...</p>
    </div>

    <!-- Error State -->
    <div class="error-state" *ngIf="!isLoading && !route">
      <i class="material-icons">error_outline</i>
      <p>Route not found</p>
      <button class="btn-primary" (click)="goBack()">Back to Routes</button>
    </div>
  `,
  styles: [`
    .patrolling-route-detail-container {
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

    .btn-secondary,
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

    .btn-secondary {
      background: #667eea;
      color: white;
    }

    .btn-secondary:hover {
      background: #5568d3;
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

    .route-header-section {
      display: flex;
      gap: 24px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f0f0f0;
    }

    .route-icon-large {
      width: 80px;
      height: 80px;
      border-radius: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 40px;
      flex-shrink: 0;
    }

    .route-header-info {
      flex: 1;
    }

    .route-header-info h1 {
      margin: 0 0 12px 0;
      font-size: 32px;
      color: #2c3e50;
    }

    .route-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .badge-status,
    .badge-schedule,
    .badge-checkpoints {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .badge-status.active {
      background: #d4edda;
      color: #155724;
    }

    .badge-status.inactive {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-status.draft {
      background: #fff3cd;
      color: #856404;
    }

    .badge-status.archived {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-schedule {
      background: #e7f3ff;
      color: #004085;
    }

    .badge-checkpoints {
      background: #d1ecf1;
      color: #0c5460;
    }

    .route-description {
      margin: 12px 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .route-code {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #7f8c8d;
      font-size: 14px;
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

    .time-range {
      font-size: 14px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .text-muted {
      font-size: 13px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .checkpoints-section {
      margin-bottom: 32px;
    }

    .section-header {
      margin-bottom: 24px;
    }

    .section-header h2 {
      font-size: 24px;
      margin: 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .checkpoints-timeline {
      position: relative;
    }

    .checkpoint-timeline-item {
      position: relative;
      margin-bottom: 24px;
    }

    .checkpoint-connector {
      position: absolute;
      left: 40px;
      top: 80px;
      width: 2px;
      height: calc(100% + 24px);
      background: #e0e0e0;
      z-index: 0;
    }

    .checkpoint-card {
      position: relative;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 24px;
      z-index: 1;
    }

    .checkpoint-header {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .checkpoint-number-large {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .checkpoint-title-section {
      flex: 1;
    }

    .checkpoint-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .checkpoint-type-badge,
    .checkpoint-required-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 8px;
    }

    .checkpoint-type-badge {
      background: #e7f3ff;
      color: #004085;
    }

    .checkpoint-required-badge {
      background: #fff3cd;
      color: #856404;
    }

    .checkpoint-body {
      margin-left: 64px;
    }

    .checkpoint-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .checkpoint-detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .checkpoint-detail-item .material-icons {
      font-size: 18px;
      color: #667eea;
    }

    .checkpoint-qr-panel {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      margin-top: 8px;
      padding: 12px;
      background: #f0f4ff;
      border-radius: 10px;
      border: 1px dashed #667eea;
    }

    .checkpoint-qr-preview img {
      width: 120px;
      height: 120px;
      background: white;
      padding: 8px;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .btn-download-qr {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      border-radius: 8px;
      padding: 10px 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-download-qr:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn-download-qr .material-icons {
      font-size: 18px;
    }

    .checkpoint-requirements {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .requirement-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      font-size: 12px;
      color: #2c3e50;
    }

    .requirement-badge .material-icons {
      font-size: 16px;
    }

    .checkpoint-notes {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .additional-info-section {
      margin-bottom: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .additional-info-section h2 {
      font-size: 20px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .notes-section,
    .tags-section {
      margin-bottom: 20px;
    }

    .notes-section h3,
    .tags-section h3 {
      font-size: 16px;
      margin: 0 0 12px 0;
      color: #2c3e50;
    }

    .notes-section p {
      margin: 0;
      color: #7f8c8d;
      line-height: 1.6;
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

    .last-patrol-section {
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .last-patrol-card {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .last-patrol-card .material-icons {
      font-size: 32px;
      color: #667eea;
    }

    .last-patrol-info {
      flex: 1;
    }

    .last-patrol-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .last-patrol-value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 600;
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
      .route-header-section {
        flex-direction: column;
      }

      .checkpoint-body {
        margin-left: 0;
      }

      .checkpoint-details-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PatrollingRouteDetailComponent implements OnInit, OnDestroy {
  route: PatrollingRoute | null = null;
  isLoading = false;
  qrDownloadingId: string | null = null;
  private checkpointQrPreviews: Record<string, string> = {};

  CheckpointType = CheckpointType;
  RouteStatus = RouteStatus;

  private destroy$ = new Subject<void>();
  private routeId: string | null = null;

  constructor(
    private routeService: PatrollingRouteService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      if (params['id']) {
        this.routeId = params['id'];
        if (this.routeId) {
          this.loadRoute(this.routeId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoute(id: string): void {
    this.isLoading = true;
    this.routeService.getRouteById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (route) => {
          this.route = route;
          this.isLoading = false;
          void this.refreshAllQrPreviews();
        },
        error: (error) => {
          console.error('Error loading route:', error);
          this.isLoading = false;
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/guard-patrol/routes']);
  }

  editRoute(): void {
    if (this.routeId) {
      this.router.navigate(['/admin/guard-patrol/routes', this.routeId, 'edit']);
    }
  }

  deleteRoute(): void {
    if (!this.route) return;
    this.routeService.deleteRoute(this.route.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response.success) {
            this.toast.warning(`Route "${this.route!.name}" deleted.`);
            this.goBack();
          } else {
            this.toast.error(response.errors?.join(', ') || response.message || 'Could not delete route.');
          }
        },
        error: error => {
          console.error('Error deleting route:', error);
          this.toast.error('Error deleting route.');
        }
      });
  }

  getStatusClass(status: RouteStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: RouteStatus): string {
    const labels: { [key: string]: string } = {
      'ACTIVE': 'Active',
      'INACTIVE': 'Inactive',
      'DRAFT': 'Draft',
      'ARCHIVED': 'Archived'
    };
    return labels[status] || status;
  }

  getCheckpointTypeLabel(type: CheckpointType): string {
    const labels: { [key: string]: string } = {
      'QR_CODE': 'QR Code',
      'NFC_TAG': 'NFC Tag',
      'GPS_LOCATION': 'GPS Location',
      'MANUAL': 'Manual'
    };
    return labels[type] || type;
  }

  /** Inline QR preview for a saved checkpoint. */
  getQrPreview(checkpointId: string): string | undefined {
    return this.checkpointQrPreviews[checkpointId];
  }

  /** Download printable QR PNG for a saved checkpoint. */
  async downloadCheckpointQr(checkpoint: Checkpoint): Promise<void> {
    const payload = (checkpoint.qrCode || checkpoint.checkpointCode || '').trim();
    if (!payload) {
      alert('This checkpoint has no QR code text. Edit the route and generate a code first.');
      return;
    }

    this.qrDownloadingId = checkpoint.id;
    try {
      const dataUrl = await createPatrolQrDataUrl(payload);
      this.checkpointQrPreviews[checkpoint.id] = dataUrl;
      downloadQrPng(dataUrl, `patrol-qr-${payload}.png`);
    } catch (error) {
      console.error('Patrol QR download failed:', error);
      alert('Could not generate QR code for this checkpoint.');
    } finally {
      this.qrDownloadingId = null;
    }
  }

  /** Load QR previews for all QR checkpoints on the route. */
  private async refreshAllQrPreviews(): Promise<void> {
    this.checkpointQrPreviews = {};
    if (!this.route) {
      return;
    }
    await Promise.all(
      this.route.checkpoints
        .filter(cp => cp.type === CheckpointType.QR_CODE)
        .map(async cp => {
          const payload = (cp.qrCode || cp.checkpointCode || '').trim();
          if (!payload) {
            return;
          }
          try {
            this.checkpointQrPreviews[cp.id] = await createPatrolQrDataUrl(payload, 280);
          } catch {
            /* skip invalid preview */
          }
        })
    );
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

