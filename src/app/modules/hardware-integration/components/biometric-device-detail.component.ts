import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BiometricDeviceService } from '../services/biometric-device.service';
import { BiometricDevice, BiometricType, BiometricStatus } from '../models/biometric-device.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-biometric-device-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="biometric-device-detail-container" *ngIf="device">
      <div class="page-header">
        <button type="button" class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <div>
          <h1>{{ device.name }}</h1>
          <p>Biometric device details and configuration</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-action" (click)="editDevice()">
            <i class="material-icons">edit</i>
            Edit
          </button>
          <button type="button" class="btn-action" (click)="testDevice()">
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
              <span class="label">Biometric Type:</span>
              <span class="value">{{ getTypeLabel(device.type) }}</span>
            </div>
            <div class="detail-item" *ngIf="device.model">
              <span class="label">Model:</span>
              <span class="value">{{ device.model }}</span>
            </div>
            <div class="detail-item" *ngIf="device.manufacturer">
              <span class="label">Manufacturer:</span>
              <span class="value">{{ device.manufacturer }}</span>
            </div>
            <div class="detail-item" *ngIf="device.serialNumber">
              <span class="label">Serial Number:</span>
              <span class="value">{{ device.serialNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="device.firmwareVersion">
              <span class="label">Firmware Version:</span>
              <span class="value">{{ device.firmwareVersion }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span class="value badge-status" [ngClass]="getStatusClass(device.status)">
                {{ getStatusLabel(device.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Biometric Configuration -->
        <div class="detail-card">
          <h3><i class="material-icons">settings</i> Biometric Configuration</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="device.supportedProtocols && device.supportedProtocols.length > 0">
              <span class="label">Supported Protocols:</span>
              <span class="value">{{ device.supportedProtocols.join(', ') }}</span>
            </div>
            <div class="detail-item" *ngIf="device.supportedTypes && device.supportedTypes.length > 0">
              <span class="label">Supported Types:</span>
              <span class="value">{{ getSupportedTypesLabel(device.supportedTypes) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Liveness Detection:</span>
              <span class="value" [ngClass]="device.livenessDetection ? 'success' : 'error'">
                {{ device.livenessDetection ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Anti-Spoofing:</span>
              <span class="value" [ngClass]="device.antiSpoofing ? 'success' : 'error'">
                {{ device.antiSpoofing ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item" *ngIf="device.enrollmentCapacity">
              <span class="label">Enrollment Capacity:</span>
              <span class="value">{{ device.currentEnrollments || 0 }} / {{ device.enrollmentCapacity }}</span>
            </div>
            <div class="detail-item" *ngIf="device.scanSpeed">
              <span class="label">Scan Speed:</span>
              <span class="value">{{ device.scanSpeed }} scans/sec</span>
            </div>
            <div class="detail-item" *ngIf="device.falseAcceptRate !== undefined">
              <span class="label">False Accept Rate (FAR):</span>
              <span class="value">{{ (device.falseAcceptRate * 100).toFixed(4) }}%</span>
            </div>
            <div class="detail-item" *ngIf="device.falseRejectRate !== undefined">
              <span class="label">False Reject Rate (FRR):</span>
              <span class="value">{{ (device.falseRejectRate * 100).toFixed(2) }}%</span>
            </div>
          </div>
        </div>

        <!-- Location Information -->
        <div class="detail-card">
          <h3><i class="material-icons">location_on</i> Location</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="device.gateName">
              <span class="label">Gate:</span>
              <span class="value">{{ device.gateName }}</span>
            </div>
            <div class="detail-item" *ngIf="device.location">
              <span class="label">Location:</span>
              <span class="value">{{ device.location }}</span>
            </div>
            <div class="detail-item" *ngIf="device.buildingName">
              <span class="label">Building:</span>
              <span class="value">{{ device.buildingName }}</span>
            </div>
            <div class="detail-item" *ngIf="device.floorNumber">
              <span class="label">Floor:</span>
              <span class="value">{{ device.floorNumber }}</span>
            </div>
          </div>
        </div>

        <!-- Connection Information -->
        <div class="detail-card">
          <h3><i class="material-icons">settings_ethernet</i> Connection</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Connection Type:</span>
              <span class="value">{{ device.connectionType }}</span>
            </div>
            <div class="detail-item" *ngIf="device.ipAddress">
              <span class="label">IP Address:</span>
              <span class="value">{{ device.ipAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="device.port">
              <span class="label">Port:</span>
              <span class="value">{{ device.port }}</span>
            </div>
            <div class="detail-item" *ngIf="device.macAddress">
              <span class="label">MAC Address:</span>
              <span class="value">{{ device.macAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="device.lastSeen">
              <span class="label">Last Seen:</span>
              <span class="value">{{ formatDateTime(device.lastSeen) }}</span>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="detail-card">
          <h3><i class="material-icons">bar_chart</i> Statistics</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="device.uptime">
              <span class="label">Uptime:</span>
              <span class="value">{{ formatUptime(device.uptime) }}</span>
            </div>
            <div class="detail-item" *ngIf="device.totalScans">
              <span class="label">Total Scans:</span>
              <span class="value">{{ device.totalScans | number }}</span>
            </div>
            <div class="detail-item" *ngIf="device.successfulScans">
              <span class="label">Successful Scans:</span>
              <span class="value success">{{ device.successfulScans | number }}</span>
            </div>
            <div class="detail-item" *ngIf="device.failedScans">
              <span class="label">Failed Scans:</span>
              <span class="value" [ngClass]="{'error': device.failedScans > 0}">{{ device.failedScans | number }}</span>
            </div>
            <div class="detail-item" *ngIf="device.enrollments">
              <span class="label">Enrollments:</span>
              <span class="value">{{ device.enrollments | number }}</span>
            </div>
            <div class="detail-item" *ngIf="device.verifications">
              <span class="label">Verifications:</span>
              <span class="value">{{ device.verifications | number }}</span>
            </div>
            <div class="detail-item" *ngIf="device.errorCount !== undefined">
              <span class="label">Error Count:</span>
              <span class="value" [ngClass]="{'error': device.errorCount > 0}">{{ device.errorCount }}</span>
            </div>
            <div class="detail-item" *ngIf="device.lastScanAt">
              <span class="label">Last Scan:</span>
              <span class="value">{{ formatDateTime(device.lastScanAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Integration -->
        <div class="detail-card">
          <h3><i class="material-icons">link</i> Integration</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Integrated:</span>
              <span class="value">{{ device.isIntegrated ? 'Yes' : 'No' }}</span>
            </div>
            <div class="detail-item" *ngIf="device.integrationStatus">
              <span class="label">Integration Status:</span>
              <span class="value badge-integration" [ngClass]="device.integrationStatus.toLowerCase()">
                {{ device.integrationStatus }}
              </span>
            </div>
            <div class="detail-item" *ngIf="device.apiEndpoint">
              <span class="label">API Endpoint:</span>
              <span class="value">{{ device.apiEndpoint }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="detail-card" *ngIf="device.notes">
          <h3><i class="material-icons">notes</i> Notes</h3>
          <p class="notes-text">{{ device.notes }}</p>
        </div>
      </div>
    </div>

    <div class="loading-state" *ngIf="!device">
      <i class="material-icons">hourglass_empty</i>
      <p>Loading device details...</p>
    </div>
  `,
  styles: [`
    .biometric-device-detail-container {
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
export class BiometricDeviceDetailComponent implements OnInit, OnDestroy {
  device: BiometricDevice | null = null;

  BiometricType = BiometricType;
  BiometricStatus = BiometricStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private biometricService: BiometricDeviceService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadDevice(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDevice(id: string): void {
    this.biometricService.getDeviceById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (device) => {
          this.device = device;
        },
        error: (error) => {
          console.error('Error loading device:', error);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/hardware-integration/biometric-devices']);
  }

  editDevice(): void {
    if (this.device) {
      this.router.navigate(['/admin/hardware-integration/biometric-devices', this.device.id, 'edit']);
    }
  }

  testDevice(): void {
    if (this.device) {
      this.biometricService.testDevice({
        deviceId: this.device.id,
        testType: 'FULL',
        testBiometricType: this.device.type
      }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const message = result.overallStatus === 'PASS' 
              ? 'Device test passed!' 
              : `Device test ${result.overallStatus}: ${Object.values(result.results).map(r => r.message).join(', ')}`;
            alert(message);
          },
          error: (error) => {
            console.error('Error testing device:', error);
            alert('Error testing device');
          }
        });
    }
  }

  getTypeLabel(type: BiometricType): string {
    const labels: { [key: string]: string } = {
      'FINGERPRINT': 'Fingerprint',
      'FACE_RECOGNITION': 'Face Recognition',
      'IRIS': 'Iris',
      'VOICE': 'Voice',
      'PALM': 'Palm',
      'MULTI_MODAL': 'Multi-Modal'
    };
    return labels[type] || type;
  }

  /**
   * Format supported types array into a comma-separated string
   * Angular templates don't support arrow functions, so we use a method instead
   */
  getSupportedTypesLabel(types: BiometricType[]): string {
    return types.map(t => this.getTypeLabel(t)).join(', ');
  }

  getStatusClass(status: BiometricStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: BiometricStatus): string {
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



