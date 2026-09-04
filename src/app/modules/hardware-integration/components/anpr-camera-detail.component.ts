import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ANPRCameraService } from '../services/anpr-camera.service';
import { ANPRCamera, ANPRCameraType, ANPRCameraStatus, RecognitionMode } from '../models/anpr-camera.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-anpr-camera-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="anpr-camera-detail-container" *ngIf="camera">
      <div class="page-header">
        <button type="button" class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <div>
          <h1>{{ camera.name }}</h1>
          <p>ANPR camera details and configuration</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-action" (click)="editCamera()">
            <i class="material-icons">edit</i>
            Edit
          </button>
          <button type="button" class="btn-action" (click)="testCamera()">
            <i class="material-icons">bug_report</i>
            Test
          </button>
        </div>
      </div>

      <div class="detail-grid">
        <!-- Basic Information -->
        <div class="detail-card">
          <h3><i class="material-icons">info</i> Basic Information</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Camera Type:</span>
              <span class="value">{{ getTypeLabel(camera.type) }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.model">
              <span class="label">Model:</span>
              <span class="value">{{ camera.model }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.manufacturer">
              <span class="label">Manufacturer:</span>
              <span class="value">{{ camera.manufacturer }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.serialNumber">
              <span class="label">Serial Number:</span>
              <span class="value">{{ camera.serialNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.firmwareVersion">
              <span class="label">Firmware Version:</span>
              <span class="value">{{ camera.firmwareVersion }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span class="value badge-status" [ngClass]="getStatusClass(camera.status)">
                {{ getStatusLabel(camera.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Recognition Configuration -->
        <div class="detail-card">
          <h3><i class="material-icons">settings</i> Recognition Configuration</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="camera.supportedProtocols && camera.supportedProtocols.length > 0">
              <span class="label">Supported Protocols:</span>
              <span class="value">{{ camera.supportedProtocols.join(', ') }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Recognition Mode:</span>
              <span class="value">{{ getRecognitionModeLabel(camera.recognitionMode) }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.captureResolution">
              <span class="label">Capture Resolution:</span>
              <span class="value">{{ camera.captureResolution }}{{ camera.fps ? ' @ ' + camera.fps + 'fps' : '' }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.confidenceThreshold">
              <span class="label">Confidence Threshold:</span>
              <span class="value">{{ camera.confidenceThreshold }}%</span>
            </div>
            <div class="detail-item" *ngIf="camera.supportedCountries && camera.supportedCountries.length > 0">
              <span class="label">Supported Countries:</span>
              <span class="value">{{ camera.supportedCountries.join(', ') }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.minPlateWidth || camera.maxPlateWidth">
              <span class="label">Plate Width Range:</span>
              <span class="value">{{ camera.minPlateWidth || 'N/A' }} - {{ camera.maxPlateWidth || 'N/A' }} pixels</span>
            </div>
          </div>
        </div>

        <!-- Features -->
        <div class="detail-card">
          <h3><i class="material-icons">featured</i> Features</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Night Vision:</span>
              <span class="value" [ngClass]="camera.nightVision ? 'success' : 'error'">
                {{ camera.nightVision ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Infrared:</span>
              <span class="value" [ngClass]="camera.infrared ? 'success' : 'error'">
                {{ camera.infrared ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Motion Detection:</span>
              <span class="value" [ngClass]="camera.motionDetection ? 'success' : 'error'">
                {{ camera.motionDetection ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Location Information -->
        <div class="detail-card">
          <h3><i class="material-icons">location_on</i> Location</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="camera.gateName">
              <span class="label">Gate:</span>
              <span class="value">{{ camera.gateName }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.location">
              <span class="label">Location:</span>
              <span class="value">{{ camera.location }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.buildingName">
              <span class="label">Building:</span>
              <span class="value">{{ camera.buildingName }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.floorNumber">
              <span class="label">Floor:</span>
              <span class="value">{{ camera.floorNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.laneNumber">
              <span class="label">Lane Number:</span>
              <span class="value">{{ camera.laneNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.direction">
              <span class="label">Direction:</span>
              <span class="value">{{ camera.direction }}</span>
            </div>
          </div>
        </div>

        <!-- Connection Information -->
        <div class="detail-card">
          <h3><i class="material-icons">settings_ethernet</i> Connection</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Connection Type:</span>
              <span class="value">{{ camera.connectionType }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.ipAddress">
              <span class="label">IP Address:</span>
              <span class="value">{{ camera.ipAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.port">
              <span class="label">Port:</span>
              <span class="value">{{ camera.port }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.macAddress">
              <span class="label">MAC Address:</span>
              <span class="value">{{ camera.macAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.streamUrl">
              <span class="label">Stream URL:</span>
              <span class="value">{{ camera.streamUrl }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.lastSeen">
              <span class="label">Last Seen:</span>
              <span class="value">{{ formatDateTime(camera.lastSeen) }}</span>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="detail-card">
          <h3><i class="material-icons">bar_chart</i> Statistics</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="camera.uptime">
              <span class="label">Uptime:</span>
              <span class="value">{{ formatUptime(camera.uptime) }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.totalDetections">
              <span class="label">Total Detections:</span>
              <span class="value">{{ camera.totalDetections | number }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.successfulRecognitions">
              <span class="label">Successful Recognitions:</span>
              <span class="value success">{{ camera.successfulRecognitions | number }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.failedRecognitions">
              <span class="label">Failed Recognitions:</span>
              <span class="value" [ngClass]="{'error': camera.failedRecognitions > 0}">
                {{ camera.failedRecognitions | number }}
              </span>
            </div>
            <div class="detail-item" *ngIf="camera.recognitionAccuracy">
              <span class="label">Recognition Accuracy:</span>
              <span class="value">{{ camera.recognitionAccuracy.toFixed(1) }}%</span>
            </div>
            <div class="detail-item" *ngIf="camera.averageRecognitionTime">
              <span class="label">Avg Recognition Time:</span>
              <span class="value">{{ camera.averageRecognitionTime }}ms</span>
            </div>
            <div class="detail-item" *ngIf="camera.errorCount !== undefined">
              <span class="label">Error Count:</span>
              <span class="value" [ngClass]="{'error': camera.errorCount > 0}">
                {{ camera.errorCount }}
              </span>
            </div>
            <div class="detail-item" *ngIf="camera.lastPlateDetected">
              <span class="label">Last Plate Detected:</span>
              <span class="value">{{ camera.lastPlateDetected }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.lastPlateDetectedAt">
              <span class="label">Last Detection Time:</span>
              <span class="value">{{ formatDateTime(camera.lastPlateDetectedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Integration -->
        <div class="detail-card">
          <h3><i class="material-icons">link</i> Integration</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Integrated:</span>
              <span class="value">{{ camera.isIntegrated ? 'Yes' : 'No' }}</span>
            </div>
            <div class="detail-item" *ngIf="camera.integrationStatus">
              <span class="label">Integration Status:</span>
              <span class="value badge-integration" [ngClass]="camera.integrationStatus.toLowerCase()">
                {{ camera.integrationStatus }}
              </span>
            </div>
            <div class="detail-item" *ngIf="camera.apiEndpoint">
              <span class="label">API Endpoint:</span>
              <span class="value">{{ camera.apiEndpoint }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="detail-card" *ngIf="camera.notes">
          <h3><i class="material-icons">notes</i> Notes</h3>
          <p class="notes-text">{{ camera.notes }}</p>
        </div>
      </div>
    </div>

    <div class="loading-state" *ngIf="!camera">
      <i class="material-icons">hourglass_empty</i>
      <p>Loading camera details...</p>
    </div>
  `,
  styles: [`
    .anpr-camera-detail-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .btn-back {
      padding: 10px 16px;
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

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 4px 0;
      color: #2c3e50;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .header-actions {
      margin-left: auto;
      display: flex;
      gap: 12px;
    }

    .btn-action {
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

    .btn-action:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
    }

    .detail-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .detail-card h3 {
      font-size: 18px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .detail-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .detail-item .label {
      font-weight: 600;
      color: #7f8c8d;
      font-size: 14px;
    }

    .detail-item .value {
      font-weight: 500;
      color: #2c3e50;
      font-size: 14px;
    }

    .badge-status,
    .badge-integration {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
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

    .badge-integration.active {
      background: #d4edda;
      color: #155724;
    }

    .badge-integration.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .value.success {
      color: #28a745;
    }

    .value.error {
      color: #dc3545;
    }

    .notes-text {
      color: #2c3e50;
      line-height: 1.6;
      margin: 0;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .loading-state .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      color: #ddd;
    }
  `]
})
export class ANPRCameraDetailComponent implements OnInit, OnDestroy {
  camera: ANPRCamera | null = null;

  ANPRCameraType = ANPRCameraType;
  ANPRCameraStatus = ANPRCameraStatus;
  RecognitionMode = RecognitionMode;

  private destroy$ = new Subject<void>();

  constructor(
    private anprCameraService: ANPRCameraService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadCamera(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCamera(id: string): void {
    this.anprCameraService.getCameraById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (camera) => {
          this.camera = camera;
        },
        error: (error) => {
          console.error('Error loading camera:', error);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/hardware-integration/anpr-cameras']);
  }

  editCamera(): void {
    if (this.camera) {
      this.router.navigate(['/admin/hardware-integration/anpr-cameras', this.camera.id, 'edit']);
    }
  }

  testCamera(): void {
    if (this.camera) {
      this.anprCameraService.testCamera({
        cameraId: this.camera.id,
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
      'ENTRANCE_ONLY': 'Entrance Only',
      'EXIT_ONLY': 'Exit Only',
      'BOTH': 'Both',
      'MONITORING': 'Monitoring'
    };
    return labels[mode] || mode;
  }

  formatUptime(hours: number): string {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
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

