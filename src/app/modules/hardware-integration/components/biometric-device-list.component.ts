import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BiometricDeviceService } from '../services/biometric-device.service';
import {
  BiometricDevice,
  BiometricType,
  BiometricStatus,
  BiometricFilter,
  BiometricStatistics
} from '../models/biometric-device.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-biometric-device-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="biometric-device-container">
      <div class="page-header">
        <h1><i class="material-icons">fingerprint</i> Biometric Devices</h1>
        <p>Manage and monitor fingerprint, face recognition, and other biometric devices</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">devices</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalDevices }}</div>
            <div class="stat-label">Total Devices</div>
          </div>
        </div>
        <div class="stat-card online">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.onlineDevices }}</div>
            <div class="stat-label">Online</div>
          </div>
        </div>
        <div class="stat-card scans">
          <div class="stat-icon">
            <i class="material-icons">scanner</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(statistics.totalScans) }}</div>
            <div class="stat-label">Total Scans</div>
          </div>
        </div>
        <div class="stat-card enrollments">
          <div class="stat-icon">
            <i class="material-icons">person_add</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(statistics.totalEnrollments) }}</div>
            <div class="stat-label">Enrollments</div>
          </div>
        </div>
        <div class="stat-card verifications">
          <div class="stat-icon">
            <i class="material-icons">verified</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(statistics.totalVerifications) }}</div>
            <div class="stat-label">Verifications</div>
          </div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">
            <i class="material-icons">check</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ getSuccessRate() }}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <a [routerLink]="['/admin/hardware-integration/biometric-devices/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Add Biometric Device
        </a>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search devices..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Biometric Type</label>
          <select [(ngModel)]="filter.type" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="BiometricType.FINGERPRINT">Fingerprint</option>
            <option [value]="BiometricType.FACE_RECOGNITION">Face Recognition</option>
            <option [value]="BiometricType.IRIS">Iris</option>
            <option [value]="BiometricType.VOICE">Voice</option>
            <option [value]="BiometricType.PALM">Palm</option>
            <option [value]="BiometricType.MULTI_MODAL">Multi-Modal</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="BiometricStatus.ONLINE">Online</option>
            <option [value]="BiometricStatus.OFFLINE">Offline</option>
            <option [value]="BiometricStatus.MAINTENANCE">Maintenance</option>
            <option [value]="BiometricStatus.ERROR">Error</option>
            <option [value]="BiometricStatus.CONFIGURING">Configuring</option>
            <option [value]="BiometricStatus.CALIBRATING">Calibrating</option>
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
        <button type="button" class="btn-clear" (click)="clearFilters()">
          <i class="material-icons">clear</i>
          Clear
        </button>
      </div>

      <!-- Devices Grid -->
      <div class="devices-grid" *ngIf="!isLoading && devices.length > 0">
        <div 
          *ngFor="let device of devices" 
          class="device-card"
          [ngClass]="getStatusClass(device.status)">
          <div class="device-header">
            <div class="device-icon" [ngClass]="getTypeClass(device.type)">
              <i class="material-icons">{{ getTypeIcon(device.type) }}</i>
            </div>
            <div class="device-title-section">
              <h3>{{ device.name }}</h3>
              <div class="device-badges">
                <span class="badge-type">{{ getTypeLabel(device.type) }}</span>
                <span class="badge-status" [ngClass]="getStatusClass(device.status)">
                  {{ getStatusLabel(device.status) }}
                </span>
                <span class="badge-integration" *ngIf="device.isIntegrated" [ngClass]="device.integrationStatus?.toLowerCase()">
                  {{ device.integrationStatus }}
                </span>
                <span class="badge-liveness" *ngIf="device.livenessDetection">
                  <i class="material-icons">security</i>
                  Liveness
                </span>
                <span class="badge-antispoof" *ngIf="device.antiSpoofing">
                  <i class="material-icons">shield</i>
                  Anti-Spoof
                </span>
              </div>
            </div>
            <div class="device-actions">
              <a [routerLink]="['/admin/hardware-integration/biometric-devices', device.id]" class="btn-action" title="View Details">
                <i class="material-icons">visibility</i>
              </a>
              <a [routerLink]="['/admin/hardware-integration/biometric-devices', device.id, 'edit']" class="btn-action" title="Edit">
                <i class="material-icons">edit</i>
              </a>
              <button type="button" class="btn-action" (click)="testDevice(device, $event)" title="Test Device" style="cursor: pointer !important; pointer-events: auto !important;">
                <i class="material-icons">bug_report</i>
              </button>
            </div>
          </div>
          <div class="device-body">
            <div class="device-info">
              <div class="info-item" *ngIf="device.model">
                <i class="material-icons">memory</i>
                <span>{{ device.model }}</span>
              </div>
              <div class="info-item" *ngIf="device.manufacturer">
                <i class="material-icons">business</i>
                <span>{{ device.manufacturer }}</span>
              </div>
              <div class="info-item" *ngIf="device.gateName">
                <i class="material-icons">location_on</i>
                <span>{{ device.gateName }}</span>
              </div>
              <div class="info-item" *ngIf="device.location">
                <i class="material-icons">place</i>
                <span>{{ device.location }}</span>
              </div>
              <div class="info-item" *ngIf="device.ipAddress">
                <i class="material-icons">dns</i>
                <span>{{ device.ipAddress }}{{ device.port ? ':' + device.port : '' }}</span>
              </div>
              <div class="info-item" *ngIf="device.enrollmentCapacity">
                <i class="material-icons">people</i>
                <span>{{ device.currentEnrollments || 0 }} / {{ device.enrollmentCapacity }} enrollments</span>
              </div>
            </div>
            <div class="device-stats">
              <div class="stat-item">
                <span class="stat-label">Total Scans:</span>
                <span class="stat-value">{{ formatNumber(device.totalScans || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Success:</span>
                <span class="stat-value success">{{ formatNumber(device.successfulScans || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Enrollments:</span>
                <span class="stat-value">{{ formatNumber(device.enrollments || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Verifications:</span>
                <span class="stat-value">{{ formatNumber(device.verifications || 0) }}</span>
              </div>
              <div class="stat-item" *ngIf="device.falseAcceptRate !== undefined">
                <span class="stat-label">FAR:</span>
                <span class="stat-value">{{ (device.falseAcceptRate * 100).toFixed(4) }}%</span>
              </div>
              <div class="stat-item" *ngIf="device.falseRejectRate !== undefined">
                <span class="stat-label">FRR:</span>
                <span class="stat-value">{{ (device.falseRejectRate * 100).toFixed(2) }}%</span>
              </div>
            </div>
            <div class="device-footer" *ngIf="device.lastSeen">
              <span class="last-seen">
                <i class="material-icons">schedule</i>
                Last seen: {{ formatDateTime(device.lastSeen) }}
              </span>
              <span class="last-scan" *ngIf="device.lastScanAt">
                <i class="material-icons">scanner</i>
                Last scan: {{ formatDateTime(device.lastScanAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && devices.length === 0">
        <i class="material-icons">fingerprint</i>
        <p>No biometric devices found</p>
        <a [routerLink]="['/admin/hardware-integration/biometric-devices/add']" class="btn-primary" style="text-decoration: none; display: inline-flex;">
          <i class="material-icons">add</i>
          Add First Device
        </a>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading devices...</p>
      </div>
    </div>
  `,
  styles: [`
    .biometric-device-container {
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

    .stat-card.scans .stat-icon {
      background: #17a2b8;
    }

    .stat-card.enrollments .stat-icon {
      background: #6f42c1;
    }

    .stat-card.verifications .stat-icon {
      background: #28a745;
    }

    .stat-card.success .stat-icon {
      background: #fd7e14;
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
      cursor: pointer !important;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      pointer-events: auto !important;
      position: relative;
      z-index: 9999 !important;
      user-select: none;
      -webkit-user-select: none;
      text-decoration: none;
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

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .device-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
      transition: all 0.2s;
      position: relative;
      z-index: 1;
    }

    .device-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .device-card.online {
      border-left-color: #28a745;
    }

    .device-card.offline {
      border-left-color: #dc3545;
    }

    .device-card.maintenance {
      border-left-color: #ffc107;
    }

    .device-card.error {
      border-left-color: #dc3545;
    }

    .device-card.configuring {
      border-left-color: #17a2b8;
    }

    .device-card.calibrating {
      border-left-color: #6f42c1;
    }

    .device-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .device-icon {
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

    .device-title-section {
      flex: 1;
    }

    .device-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .device-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-type,
    .badge-status {
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

    .badge-integration {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-integration.active {
      background: #d4edda;
      color: #155724;
    }

    .badge-integration.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-integration.pending {
      background: #fff3cd;
      color: #856404;
    }

    .badge-liveness,
    .badge-antispoof {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      background: #d1ecf1;
      color: #0c5460;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .badge-liveness .material-icons,
    .badge-antispoof .material-icons {
      font-size: 14px;
    }

    .device-actions {
      display: flex;
      gap: 8px;
      position: relative;
      z-index: 10;
    }

    .btn-action {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 1px solid #e0e0e0;
      cursor: pointer !important;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      pointer-events: auto !important;
      position: relative;
      z-index: 9999 !important;
      user-select: none;
      -webkit-user-select: none;
      text-decoration: none;
    }

    .btn-action:hover {
      background: #e0e0e0;
      transform: scale(1.1);
    }

    .device-body {
      margin-top: 16px;
    }

    .device-info {
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

    .device-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
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

    .device-footer {
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #7f8c8d;
      gap: 16px;
    }

    .last-seen,
    .last-scan {
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
      .devices-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BiometricDeviceListComponent implements OnInit, OnDestroy {
  devices: BiometricDevice[] = [];
  statistics: BiometricStatistics | null = null;
  isLoading = false;
  filter: BiometricFilter = {};

  BiometricType = BiometricType;
  BiometricStatus = BiometricStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private biometricService: BiometricDeviceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDevices();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDevices(): void {
    this.isLoading = true;
    this.biometricService.getAllDevices(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (devices) => {
          this.devices = devices;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading devices:', error);
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.biometricService.getStatistics()
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
    this.loadDevices();
  }

  clearFilters(): void {
    this.filter = {};
    this.loadDevices();
  }

  testDevice(device: BiometricDevice, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    console.log('testDevice called for:', device.id);
    this.biometricService.testDevice({
      deviceId: device.id,
      testType: 'FULL',
      testBiometricType: device.type
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

  getTypeIcon(type: BiometricType): string {
    const icons: { [key: string]: string } = {
      'FINGERPRINT': 'fingerprint',
      'FACE_RECOGNITION': 'face',
      'IRIS': 'visibility',
      'VOICE': 'mic',
      'PALM': 'palm',
      'MULTI_MODAL': 'devices'
    };
    return icons[type] || 'fingerprint';
  }

  getTypeClass(type: BiometricType): string {
    return type.toLowerCase().replace(/_/g, '-');
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

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  getSuccessRate(): number {
    if (!this.statistics || this.statistics.totalScans === 0) return 0;
    return Math.round((this.statistics.successfulScans / this.statistics.totalScans) * 100);
  }
}
















































