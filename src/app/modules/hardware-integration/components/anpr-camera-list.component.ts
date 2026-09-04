import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ANPRCameraService } from '../services/anpr-camera.service';
import {
  ANPRCamera,
  ANPRCameraType,
  ANPRCameraStatus,
  RecognitionMode,
  ANPRCameraFilter,
  ANPRCameraStatistics
} from '../models/anpr-camera.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-anpr-camera-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="anpr-camera-container">
      <div class="page-header">
        <h1><i class="material-icons">videocam</i> ANPR Cameras</h1>
        <p>Manage and monitor Automatic Number Plate Recognition cameras</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">devices</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalCameras }}</div>
            <div class="stat-label">Total Cameras</div>
          </div>
        </div>
        <div class="stat-card online">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.onlineCameras }}</div>
            <div class="stat-label">Online</div>
          </div>
        </div>
        <div class="stat-card detections">
          <div class="stat-icon">
            <i class="material-icons">camera_alt</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(statistics.totalDetections) }}</div>
            <div class="stat-label">Total Detections</div>
          </div>
        </div>
        <div class="stat-card recognitions">
          <div class="stat-icon">
            <i class="material-icons">text_fields</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(statistics.successfulRecognitions) }}</div>
            <div class="stat-label">Recognitions</div>
          </div>
        </div>
        <div class="stat-card accuracy">
          <div class="stat-icon">
            <i class="material-icons">trending_up</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.averageRecognitionAccuracy.toFixed(1) }}%</div>
            <div class="stat-label">Avg Accuracy</div>
          </div>
        </div>
        <div class="stat-card integrated">
          <div class="stat-icon">
            <i class="material-icons">link</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.integrationStatus.active }}</div>
            <div class="stat-label">Active Integration</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <a [routerLink]="['/admin/hardware-integration/anpr-cameras/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Add ANPR Camera
        </a>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search cameras..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Camera Type</label>
          <select [(ngModel)]="filter.type" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="ANPRCameraType.FIXED">Fixed</option>
            <option [value]="ANPRCameraType.MOBILE">Mobile</option>
            <option [value]="ANPRCameraType.TRAFFIC">Traffic</option>
            <option [value]="ANPRCameraType.PARKING">Parking</option>
            <option [value]="ANPRCameraType.ENTRANCE">Entrance</option>
            <option [value]="ANPRCameraType.MULTI_LANE">Multi-Lane</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="ANPRCameraStatus.ONLINE">Online</option>
            <option [value]="ANPRCameraStatus.OFFLINE">Offline</option>
            <option [value]="ANPRCameraStatus.MAINTENANCE">Maintenance</option>
            <option [value]="ANPRCameraStatus.ERROR">Error</option>
            <option [value]="ANPRCameraStatus.CONFIGURING">Configuring</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Recognition Mode</label>
          <select [(ngModel)]="filter.recognitionMode" (change)="applyFilters()" class="filter-select">
            <option value="">All Modes</option>
            <option [value]="RecognitionMode.ENTRANCE_ONLY">Entrance Only</option>
            <option [value]="RecognitionMode.EXIT_ONLY">Exit Only</option>
            <option [value]="RecognitionMode.BOTH">Both</option>
            <option [value]="RecognitionMode.MONITORING">Monitoring</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Gate</label>
          <select [(ngModel)]="filter.gateId" (change)="applyFilters()" class="filter-select">
            <option value="">All Gates</option>
            <option value="MAIN_GATE">Main Gate</option>
            <option value="SIDE_GATE">Side Gate</option>
            <option value="PARKING_GATE">Parking Gate</option>
            <option value="EMERGENCY_GATE">Emergency Gate</option>
          </select>
        </div>
        <div class="filter-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="filter.isIntegrated"
              (change)="applyFilters()">
            Integrated Only
          </label>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Cameras Grid -->
      <div class="cameras-grid" *ngIf="!isLoading && cameras.length > 0">
        <div 
          *ngFor="let camera of cameras" 
          class="camera-card"
          [ngClass]="getStatusClass(camera.status)">
          <div class="camera-header">
            <div class="camera-icon" [ngClass]="getTypeClass(camera.type)">
              <i class="material-icons">{{ getTypeIcon(camera.type) }}</i>
            </div>
            <div class="camera-title-section">
              <h3>{{ camera.name }}</h3>
              <div class="camera-badges">
                <span class="badge-type">{{ getTypeLabel(camera.type) }}</span>
                <span class="badge-status" [ngClass]="getStatusClass(camera.status)">
                  {{ getStatusLabel(camera.status) }}
                </span>
                <span class="badge-integration" *ngIf="camera.isIntegrated" [ngClass]="camera.integrationStatus?.toLowerCase()">
                  {{ camera.integrationStatus }}
                </span>
                <span class="badge-mode" *ngIf="camera.recognitionMode">
                  {{ getRecognitionModeLabel(camera.recognitionMode) }}
                </span>
              </div>
            </div>
            <div class="camera-actions">
              <button class="btn-action" (click)="viewCamera(camera)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button class="btn-action" (click)="editCamera(camera)" title="Edit">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn-action" (click)="testCamera(camera)" title="Test Camera">
                <i class="material-icons">bug_report</i>
              </button>
            </div>
          </div>
          <div class="camera-body">
            <div class="camera-info">
              <div class="info-item" *ngIf="camera.model">
                <i class="material-icons">memory</i>
                <span>{{ camera.model }}</span>
              </div>
              <div class="info-item" *ngIf="camera.manufacturer">
                <i class="material-icons">business</i>
                <span>{{ camera.manufacturer }}</span>
              </div>
              <div class="info-item" *ngIf="camera.gateName">
                <i class="material-icons">location_on</i>
                <span>{{ camera.gateName }}</span>
              </div>
              <div class="info-item" *ngIf="camera.location">
                <i class="material-icons">place</i>
                <span>{{ camera.location }}</span>
              </div>
              <div class="info-item" *ngIf="camera.ipAddress">
                <i class="material-icons">dns</i>
                <span>{{ camera.ipAddress }}{{ camera.port ? ':' + camera.port : '' }}</span>
              </div>
              <div class="info-item" *ngIf="camera.captureResolution">
                <i class="material-icons">hd</i>
                <span>{{ camera.captureResolution }}{{ camera.fps ? ' @ ' + camera.fps + 'fps' : '' }}</span>
              </div>
            </div>
            <div class="camera-stats">
              <div class="stat-item">
                <span class="stat-label">Detections:</span>
                <span class="stat-value">{{ formatNumber(camera.totalDetections || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Recognitions:</span>
                <span class="stat-value success">{{ formatNumber(camera.successfulRecognitions || 0) }}</span>
              </div>
              <div class="stat-item" *ngIf="camera.recognitionAccuracy">
                <span class="stat-label">Accuracy:</span>
                <span class="stat-value">{{ camera.recognitionAccuracy.toFixed(1) }}%</span>
              </div>
              <div class="stat-item" *ngIf="camera.errorCount !== undefined">
                <span class="stat-label">Errors:</span>
                <span class="stat-value" [ngClass]="{'error': camera.errorCount > 0}">
                  {{ camera.errorCount }}
                </span>
              </div>
            </div>
            <div class="camera-footer" *ngIf="camera.lastSeen || camera.lastPlateDetected">
              <span class="last-seen" *ngIf="camera.lastSeen">
                <i class="material-icons">schedule</i>
                Last seen: {{ formatDateTime(camera.lastSeen) }}
              </span>
              <span class="last-plate" *ngIf="camera.lastPlateDetected">
                <i class="material-icons">directions_car</i>
                Last plate: {{ camera.lastPlateDetected }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && cameras.length === 0">
        <i class="material-icons">videocam</i>
        <p>No cameras found</p>
        <a [routerLink]="['/admin/hardware-integration/anpr-cameras/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Add First Camera
        </a>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading cameras...</p>
      </div>
    </div>
  `,
  styles: [`
    .anpr-camera-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card.online .stat-icon {
      background: #28a745;
    }

    .stat-card.detections .stat-icon {
      background: #17a2b8;
    }

    .stat-card.recognitions .stat-icon {
      background: #6f42c1;
    }

    .stat-card.accuracy .stat-icon {
      background: #fd7e14;
    }

    .stat-card.integrated .stat-icon {
      background: #20c997;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
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
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .search-filter {
      flex: 1;
      max-width: 400px;
    }

    .search-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .filters-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: flex-end;
    }

    .filter-group {
      flex: 1;
      min-width: 180px;
    }

    .filter-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
    }

    .filter-group label input[type="checkbox"] {
      margin-right: 8px;
    }

    .filter-select {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .btn-clear {
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
    }

    .btn-clear:hover {
      background: #e0e0e0;
    }

    .cameras-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .camera-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
      transition: all 0.2s;
    }

    .camera-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .camera-card.online {
      border-left-color: #28a745;
    }

    .camera-card.offline {
      border-left-color: #dc3545;
    }

    .camera-card.maintenance {
      border-left-color: #ffc107;
    }

    .camera-card.error {
      border-left-color: #dc3545;
    }

    .camera-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .camera-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      flex-shrink: 0;
    }

    .camera-title-section {
      flex: 1;
    }

    .camera-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .camera-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-type,
    .badge-status,
    .badge-integration,
    .badge-mode {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-type {
      background: #e7f3ff;
      color: #004085;
    }

    .badge-status.online {
      background: #d4edda;
      color: #155724;
    }

    .badge-status.offline {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-status.maintenance {
      background: #fff3cd;
      color: #856404;
    }

    .badge-status.error {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-integration.active {
      background: #d4edda;
      color: #155724;
    }

    .badge-integration.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-mode {
      background: #e2e3e5;
      color: #383d41;
    }

    .camera-actions {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #e0e0e0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-action:hover {
      background: #e0e0e0;
      transform: scale(1.1);
    }

    .camera-body {
      margin-top: 16px;
    }

    .camera-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .info-item .material-icons {
      font-size: 18px;
    }

    .camera-stats {
      display: flex;
      gap: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-value.success {
      color: #28a745;
    }

    .stat-value.error {
      color: #dc3545;
    }

    .camera-footer {
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      font-size: 12px;
      color: #7f8c8d;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .last-seen,
    .last-plate {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      color: #ddd;
    }

    @media (max-width: 1024px) {
      .cameras-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ANPRCameraListComponent implements OnInit, OnDestroy {
  cameras: ANPRCamera[] = [];
  statistics: ANPRCameraStatistics | null = null;
  isLoading = false;
  filter: ANPRCameraFilter = {};

  ANPRCameraType = ANPRCameraType;
  ANPRCameraStatus = ANPRCameraStatus;
  RecognitionMode = RecognitionMode;

  private destroy$ = new Subject<void>();

  constructor(
    private anprCameraService: ANPRCameraService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadCameras();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCameras(): void {
    this.isLoading = true;
    this.anprCameraService.getAllCameras(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cameras) => {
          this.cameras = cameras;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading cameras:', error);
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.anprCameraService.getStatistics()
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

  applyFilters(): void {
    this.loadCameras();
  }

  clearFilters(): void {
    this.filter = {};
    this.applyFilters();
  }

  viewCamera(camera: ANPRCamera): void {
    this.router.navigate(['/admin/hardware-integration/anpr-cameras', camera.id]);
  }

  editCamera(camera: ANPRCamera): void {
    this.router.navigate(['/admin/hardware-integration/anpr-cameras', camera.id, 'edit']);
  }

  testCamera(camera: ANPRCamera): void {
    this.anprCameraService.testCamera({
      cameraId: camera.id,
      testType: 'FULL'
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const message = result.overallStatus === 'PASS' 
            ? 'Camera test passed!' 
            : `Camera test ${result.overallStatus}: ${Object.values(result.results).map(r => r.message).join(', ')}`;
          alert(message);
        },
        error: (error) => {
          console.error('Error testing camera:', error);
          alert('Error testing camera');
        }
      });
  }

  getTypeLabel(type: ANPRCameraType): string {
    const labels: { [key: string]: string } = {
      'FIXED': 'Fixed',
      'MOBILE': 'Mobile',
      'TRAFFIC': 'Traffic',
      'PARKING': 'Parking',
      'ENTRANCE': 'Entrance',
      'MULTI_LANE': 'Multi-Lane'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: ANPRCameraType): string {
    const icons: { [key: string]: string } = {
      'FIXED': 'videocam',
      'MOBILE': 'camera_alt',
      'TRAFFIC': 'traffic',
      'PARKING': 'local_parking',
      'ENTRANCE': 'meeting_room',
      'MULTI_LANE': 'view_quilt'
    };
    return icons[type] || 'videocam';
  }

  getTypeClass(type: ANPRCameraType): string {
    return type.toLowerCase().replace('_', '-');
  }

  getStatusClass(status: ANPRCameraStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: ANPRCameraStatus): string {
    const labels: { [key: string]: string } = {
      'ONLINE': 'Online',
      'OFFLINE': 'Offline',
      'MAINTENANCE': 'Maintenance',
      'ERROR': 'Error',
      'CONFIGURING': 'Configuring',
      'CALIBRATING': 'Calibrating'
    };
    return labels[status] || status;
  }

  getRecognitionModeLabel(mode: RecognitionMode): string {
    const labels: { [key: string]: string } = {
      'ENTRANCE_ONLY': 'Entrance',
      'EXIT_ONLY': 'Exit',
      'BOTH': 'Both',
      'MONITORING': 'Monitoring'
    };
    return labels[mode] || mode;
  }

  formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
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

