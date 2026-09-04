import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FingerprintAttendanceService } from '../services/fingerprint-attendance.service';
import {
  FingerprintAttendanceRecord,
  BiometricScannerDevice,
  FingerprintAttendanceStatistics,
  AttendanceDatePreset
} from '../models/fingerprint-attendance.model';
import { applyFingerprintFilter } from '../services/fingerprint-attendance-api.mapper';

@Component({
  selector: 'app-biometric-fingerprint-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="biometric-fingerprint-attendance-container">
      <div class="page-header">
        <button class="back-button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Dashboard
        </button>
        <div>
          <h1>
            <i class="material-icons">fingerprint</i>
            Biometric Integration (Fingerprint)
          </h1>
          <p>Fingerprint-based attendance tracking system</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/fingerprint-attendance</strong> API — devices from hardware registry.</span>
          </div>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="capture-panel" *ngIf="showCapturePanel">
        <h3><i class="material-icons">fingerprint</i> Capture Fingerprint Attendance</h3>
        <p class="capture-hint">Upload the fingerprint template file enrolled for the staff member (POC matcher).</p>
        <div class="capture-body">
          <div class="capture-controls">
            <input #scanInput type="file" accept="*/*" class="hidden-file" (change)="onScanSelected($event)">
            <button type="button" class="btn-secondary" (click)="scanInput.click()">
              <i class="material-icons">upload_file</i>
              {{ scanFileName || 'Choose Scan File' }}
            </button>
            <select [(ngModel)]="captureDeviceId" class="device-select">
              <option value="">Select Device</option>
              <option *ngFor="let device of biometricDevices" [value]="device.id">{{ device.name }}</option>
            </select>
            <select [(ngModel)]="captureLocation" class="location-select">
              <option value="Main Gate">Main Gate</option>
              <option value="Side Gate">Side Gate</option>
              <option value="Parking Gate">Parking Gate</option>
              <option value="Office Building">Office Building</option>
            </select>
            <button type="button" class="btn-primary" (click)="submitCapture()" [disabled]="!capturedScanData || isCapturing">
              <i class="material-icons">check</i>
              {{ isCapturing ? 'Processing...' : 'Submit Attendance' }}
            </button>
            <button type="button" class="btn-cancel" (click)="closeCapturePanel()">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <div class="search-filter">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by staff name or ID..."
              [(ngModel)]="searchTerm"
              (input)="filterRecords()">
          </div>
          <select [(ngModel)]="selectedStatus" (change)="filterRecords()" class="status-filter">
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="early-leave">Early Leave</option>
          </select>
          <select [(ngModel)]="selectedDevice" (change)="filterRecords()" class="device-filter">
            <option value="">All Devices</option>
            <option *ngFor="let device of biometricDevices" [value]="device.id">
              {{ device.name }}
            </option>
          </select>
          <select [(ngModel)]="selectedDate" (change)="filterRecords()" class="date-filter">
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <button class="btn-primary" (click)="captureFingerprint()">
          <i class="material-icons">fingerprint</i>
          Capture Fingerprint
        </button>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card present">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.present }}</div>
            <div class="stat-label">Present</div>
          </div>
        </div>
        <div class="stat-card absent">
          <div class="stat-icon">
            <i class="material-icons">cancel</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.absent }}</div>
            <div class="stat-label">Absent</div>
          </div>
        </div>
        <div class="stat-card late">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.late }}</div>
            <div class="stat-label">Late Arrivals</div>
          </div>
        </div>
        <div class="stat-card devices">
          <div class="stat-icon">
            <i class="material-icons">devices</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activeDevices }}</div>
            <div class="stat-label">Active Devices</div>
          </div>
        </div>
      </div>

      <!-- Biometric Devices Status -->
      <div class="devices-section">
        <div class="section-header">
          <h2>
            <i class="material-icons">devices</i>
            Biometric Devices
          </h2>
          <button class="btn-secondary" (click)="syncDevices()">
            <i class="material-icons">sync</i>
            Sync Devices
          </button>
        </div>
        <div class="devices-grid" *ngIf="biometricDevices.length > 0">
          <div *ngFor="let device of biometricDevices" class="device-card" [ngClass]="'device-' + device.status">
            <div class="device-header">
              <div class="device-icon" [ngClass]="'icon-' + device.status">
                <i class="material-icons">fingerprint</i>
              </div>
              <div class="device-status-badge" [ngClass]="'status-' + device.status">
                {{ device.status | titlecase }}
              </div>
            </div>
            <div class="device-content">
              <h3>{{ device.name }}</h3>
              <p class="device-location">
                <i class="material-icons">location_on</i>
                {{ device.location }}
              </p>
              <div class="device-stats">
                <div class="device-stat">
                  <span class="stat-label">Total Scans</span>
                  <span class="stat-value">{{ device.totalScans }}</span>
                </div>
                <div class="device-stat">
                  <span class="stat-label">Last Sync</span>
                  <span class="stat-value">{{ formatDateTime(device.lastSync) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="no-devices" *ngIf="!isLoadingDevices && biometricDevices.length === 0">
          <i class="material-icons">devices</i>
          <p>No fingerprint scanners registered. Add a <strong>Biometric Device</strong> under Hardware Integration.</p>
        </div>
      </div>

      <!-- Attendance Records Table -->
      <div class="records-section">
        <div class="section-header">
          <h2>
            <i class="material-icons">list</i>
            Attendance Records
          </h2>
          <div class="section-actions">
            <button class="btn-icon" (click)="refreshRecords()" title="Refresh">
              <i class="material-icons">refresh</i>
            </button>
            <button class="btn-icon" (click)="exportRecords()" title="Export">
              <i class="material-icons">download</i>
            </button>
          </div>
        </div>

        <div class="table-container">
          <div class="loading-state" *ngIf="isLoading">
            <i class="material-icons">hourglass_empty</i>
            <p>Loading attendance records...</p>
          </div>
          <table class="attendance-table" *ngIf="!isLoading">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Check-In Time</th>
                <th>Check-Out Time</th>
                <th>Status</th>
                <th>Match Score</th>
                <th>Device</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let record of filteredRecords">
                <td>{{ record.staffId }}</td>
                <td>{{ record.staffName }}</td>
                <td>{{ record.department }}</td>
                <td>{{ formatDateTime(record.checkInTime) }}</td>
                <td>{{ record.checkOutTime ? formatDateTime(record.checkOutTime) : '-' }}</td>
                <td>
                  <span class="status-badge" [ngClass]="'status-' + record.status">
                    {{ getStatusLabel(record.status) }}
                  </span>
                </td>
                <td>
                  <span class="match-score-badge" [ngClass]="getMatchScoreClass(record.fingerprintMatch)">
                    {{ record.fingerprintMatch }}%
                  </span>
                </td>
                <td>
                  <div class="device-info">
                    <i class="material-icons">fingerprint</i>
                    <span>{{ record.deviceName }}</span>
                  </div>
                </td>
                <td>{{ record.location || '-' }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon-small" (click)="viewDetails(record)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="btn-icon-small" (click)="viewFingerprintData(record)" title="View Fingerprint Data">
                      <i class="material-icons">info</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredRecords.length === 0">
                <td colspan="10" class="no-data">
                  <i class="material-icons">inbox</i>
                  <p *ngIf="!loadError">No attendance records found for the selected period.</p>
                  <p *ngIf="loadError">{{ loadError }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .biometric-fingerprint-attendance-container {
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

    .back-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #ecf0f1;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #2c3e50;
      font-size: 14px;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: #bdc3c7;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 28px;
      margin: 0 0 4px 0;
      color: #2c3e50;
    }

    .page-header h1 .material-icons {
      font-size: 32px;
      color: #27ae60;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .api-banner {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      color: #1b5e20;
      font-size: 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .api-banner .material-icons { font-size: 20px; color: #2e7d32; flex-shrink: 0; }

    .load-error {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #fdecea;
      border: 1px solid #f5c6cb;
      color: #721c24;
      font-size: 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .capture-panel {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
    }

    .capture-panel h3 {
      margin: 0 0 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #2c3e50;
    }

    .capture-hint { margin: 0 0 16px; color: #7f8c8d; font-size: 13px; }

    .capture-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .hidden-file { display: none; }

    .device-select, .location-select {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }

    .btn-cancel {
      padding: 10px 18px;
      border-radius: 8px;
      border: 1px solid #ddd;
      background: #f8f9fa;
      cursor: pointer;
    }

    .no-devices, .loading-state {
      text-align: center;
      padding: 32px;
      color: #7f8c8d;
    }

    .no-devices .material-icons, .loading-state .material-icons {
      font-size: 48px;
      color: #bdc3c7;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .search-filter {
      display: flex;
      gap: 12px;
      flex: 1;
      min-width: 300px;
    }

    .search-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-box .material-icons {
      position: absolute;
      left: 12px;
      color: #7f8c8d;
    }

    .search-box input {
      width: 100%;
      padding: 10px 12px 10px 40px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }

    .status-filter,
    .device-filter,
    .date-filter {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #27ae60;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #229954;
    }

    .btn-secondary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #ecf0f1;
      color: #2c3e50;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #bdc3c7;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-card.present .stat-icon {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .stat-card.absent .stat-icon {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .stat-card.late .stat-icon {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .stat-card.devices .stat-icon {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #2c3e50;
    }

    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .devices-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      margin: 0;
      color: #2c3e50;
    }

    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .device-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .device-card.device-online {
      border-color: rgba(39, 174, 96, 0.3);
    }

    .device-card.device-offline {
      border-color: rgba(231, 76, 60, 0.3);
    }

    .device-card.device-maintenance {
      border-color: rgba(230, 126, 34, 0.3);
    }

    .device-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .device-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-online {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .icon-offline {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .icon-maintenance {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .device-status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .status-online {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .status-offline {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .status-maintenance {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .device-content h3 {
      font-size: 16px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .device-location {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #7f8c8d;
      margin: 0 0 12px 0;
    }

    .device-location .material-icons {
      font-size: 16px;
    }

    .device-stats {
      display: flex;
      gap: 16px;
    }

    .device-stat {
      display: flex;
      flex-direction: column;
    }

    .device-stat .stat-label {
      font-size: 11px;
      color: #7f8c8d;
      margin-bottom: 4px;
    }

    .device-stat .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .records-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .section-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ecf0f1;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #bdc3c7;
    }

    .table-container {
      overflow-x: auto;
    }

    .attendance-table {
      width: 100%;
      border-collapse: collapse;
    }

    .attendance-table th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      font-size: 13px;
      border-bottom: 2px solid #e9ecef;
    }

    .attendance-table td {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
      color: #2c3e50;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-present {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .status-absent {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .status-late {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .status-early-leave {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .match-score-badge {
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
    }

    .match-high {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .match-medium {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .match-low {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .device-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .device-info .material-icons {
      font-size: 16px;
      color: #7f8c8d;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .btn-icon-small {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ecf0f1;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .btn-icon-small:hover {
      background: #bdc3c7;
    }

    .no-data {
      text-align: center;
      padding: 40px !important;
      color: #7f8c8d;
    }

    .no-data .material-icons {
      font-size: 48px;
      color: #bdc3c7;
      margin-bottom: 8px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .action-bar {
        flex-direction: column;
      }

      .search-filter {
        width: 100%;
      }

      .devices-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BiometricFingerprintAttendanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  attendanceRecords: FingerprintAttendanceRecord[] = [];
  filteredRecords: FingerprintAttendanceRecord[] = [];
  biometricDevices: BiometricScannerDevice[] = [];
  searchTerm = '';
  selectedStatus = '';
  selectedDevice = '';
  selectedDate: AttendanceDatePreset = 'today';
  loadError = '';
  isLoading = false;
  isLoadingDevices = false;
  isCapturing = false;
  showCapturePanel = false;
  capturedScanData = '';
  scanFileName = '';
  captureDeviceId = '';
  captureLocation = 'Main Gate';

  stats: FingerprintAttendanceStatistics = {
    present: 0,
    absent: 0,
    late: 0,
    earlyLeave: 0,
    total: 0,
    activeDevices: 0
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private attendanceService: FingerprintAttendanceService
  ) {}

  ngOnInit(): void {
    this.loadBiometricDevices();
    this.loadAttendanceRecords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBiometricDevices(): void {
    this.isLoadingDevices = true;
    if (!this.resolveSocietyId()) {
      this.biometricDevices = [];
      this.isLoadingDevices = false;
      return;
    }
    this.attendanceService
      .getDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: devices => {
          this.biometricDevices = devices;
          this.isLoadingDevices = false;
        },
        error: err => {
          console.error('Error loading devices:', err);
          this.isLoadingDevices = false;
        }
      });
  }

  loadAttendanceRecords(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.attendanceRecords = [];
      this.filteredRecords = [];
      this.stats = { present: 0, absent: 0, late: 0, earlyLeave: 0, total: 0, activeDevices: 0 };
      return;
    }

    this.attendanceService
      .getRecords({
        datePreset: this.selectedDate,
        status: this.selectedStatus ? (this.selectedStatus as FingerprintAttendanceRecord['status']) : undefined,
        deviceId: this.selectedDevice || undefined,
        searchTerm: this.searchTerm || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: records => {
          this.attendanceRecords = records;
          this.filteredRecords = applyFingerprintFilter(records, {
            searchTerm: this.searchTerm || undefined,
            status: this.selectedStatus ? (this.selectedStatus as FingerprintAttendanceRecord['status']) : undefined,
            deviceId: this.selectedDevice || undefined
          });
          this.isLoading = false;
        },
        error: err => {
          console.error('Error loading attendance records:', err);
          this.loadError = 'Failed to load attendance from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });

    this.attendanceService
      .getStatistics(this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
        },
        error: err => console.error('Error loading statistics:', err)
      });
  }

  filterRecords(): void {
    this.loadAttendanceRecords();
  }

  private resolveSocietyId(): string {
    const direct = localStorage.getItem('societyId');
    if (direct) return direct;
    try {
      const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
      return raw ? JSON.parse(raw).societyId ?? '' : '';
    } catch {
      return '';
    }
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'present': 'Present',
      'absent': 'Absent',
      'late': 'Late',
      'early-leave': 'Early Leave'
    };
    return labels[status] || status;
  }

  getMatchScoreClass(matchScore: number): string {
    if (matchScore >= 95) return 'match-high';
    if (matchScore >= 85) return 'match-medium';
    return 'match-low';
  }

  captureFingerprint(): void {
    this.showCapturePanel = true;
    this.capturedScanData = '';
    this.scanFileName = '';
  }

  closeCapturePanel(): void {
    this.showCapturePanel = false;
    this.capturedScanData = '';
    this.scanFileName = '';
  }

  onScanSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.scanFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.capturedScanData = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }

  submitCapture(): void {
    if (!this.capturedScanData) return;
    const device = this.biometricDevices.find(d => d.id === this.captureDeviceId);
    this.isCapturing = true;
    this.attendanceService
      .captureAttendance({
        fingerprintData: this.capturedScanData,
        deviceId: this.captureDeviceId || undefined,
        deviceName: device?.name,
        location: this.captureLocation
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.isCapturing = false;
          if (response.success) {
            this.closeCapturePanel();
            this.loadAttendanceRecords();
            this.loadBiometricDevices();
            window.alert(`Attendance recorded for ${response.record?.staffName ?? 'staff'}`);
          } else {
            window.alert(response.message || 'Failed to capture attendance');
          }
        },
        error: err => {
          this.isCapturing = false;
          console.error('Capture error:', err);
          window.alert('Failed to capture fingerprint attendance');
        }
      });
  }

  viewDetails(record: FingerprintAttendanceRecord): void {
    const lines = [
      `Staff: ${record.staffName} (${record.staffId})`,
      `Department: ${record.department}`,
      `Status: ${this.getStatusLabel(record.status)}`,
      `Match: ${record.fingerprintMatch}%`,
      `Device: ${record.deviceName}`,
      `Check-in: ${this.formatDateTime(record.checkInTime)}`,
      record.checkOutTime ? `Check-out: ${this.formatDateTime(record.checkOutTime)}` : 'Check-out: —',
      `Location: ${record.location || '—'}`
    ];
    window.alert(lines.join('\n'));
  }

  viewFingerprintData(record: FingerprintAttendanceRecord): void {
    window.alert(
      `Fingerprint match score: ${record.fingerprintMatch}% for ${record.staffName}\nDevice: ${record.deviceName}`
    );
  }

  syncDevices(): void {
    this.loadBiometricDevices();
  }

  refreshRecords(): void {
    this.loadAttendanceRecords();
  }

  exportRecords(): void {
    if (this.filteredRecords.length === 0) {
      window.alert('No records to export');
      return;
    }
    const header = 'Staff ID,Name,Department,Check-In,Check-Out,Status,Match,Device,Location';
    const rows = this.filteredRecords.map(r =>
      [
        r.staffId,
        r.staffName,
        r.department,
        this.formatDateTime(r.checkInTime),
        r.checkOutTime ? this.formatDateTime(r.checkOutTime) : '',
        this.getStatusLabel(r.status),
        `${r.fingerprintMatch}%`,
        r.deviceName,
        r.location || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fingerprint-attendance-${this.selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  goBack(): void {
    this.router.navigate(['/admin/guard-management']);
  }
}

