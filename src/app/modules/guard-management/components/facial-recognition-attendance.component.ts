import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FacialAttendanceService } from '../services/facial-attendance.service';
import {
  AttendanceRecord,
  AttendanceStatistics,
  AttendanceDatePreset
} from '../models/facial-attendance.model';
import { applyAttendanceFilter, computeStatistics } from '../services/facial-attendance-api.mapper';

@Component({
  selector: 'app-facial-recognition-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="facial-recognition-attendance-container">
      <div class="page-header">
        <button class="back-button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Dashboard
        </button>
        <div>
          <h1>
            <i class="material-icons">face</i>
            Facial Recognition Attendance
          </h1>
          <p>Selfie-based attendance tracking system</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/facial-attendance</strong> API — face match uses enrolled profiles.</span>
          </div>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Capture panel -->
      <div class="capture-panel" *ngIf="showCapturePanel">
        <h3><i class="material-icons">camera_alt</i> Capture Selfie Attendance</h3>
        <p class="capture-hint">Upload the same face image used at registration (POC matcher).</p>
        <div class="capture-body">
          <div class="capture-preview" *ngIf="capturedImage">
            <img [src]="capturedImage" alt="Captured selfie">
            <button type="button" class="btn-clear-image" (click)="clearCapturedImage()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="capture-controls">
            <input #selfieInput type="file" accept="image/*" class="hidden-file" (change)="onSelfieSelected($event)">
            <button type="button" class="btn-secondary" (click)="selfieInput.click()">
              <i class="material-icons">photo_camera</i>
              Choose Selfie
            </button>
            <select [(ngModel)]="captureLocation" class="location-select">
              <option value="Main Gate">Main Gate</option>
              <option value="Side Gate">Side Gate</option>
              <option value="Parking Gate">Parking Gate</option>
              <option value="Emergency Gate">Emergency Gate</option>
            </select>
            <button type="button" class="btn-primary" (click)="submitCapture()" [disabled]="!capturedImage || isCapturing">
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
          <select [(ngModel)]="selectedDate" (change)="filterRecords()" class="date-filter">
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <button class="btn-primary" (click)="captureAttendance()">
          <i class="material-icons">camera_alt</i>
          Capture Attendance
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
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">people</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">Total Staff</div>
          </div>
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
                <th>Confidence</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let record of filteredRecords">
                <td>{{ record.staffId }}</td>
                <td>
                  <div class="staff-info">
                    <div class="staff-avatar" *ngIf="record.selfieUrl">
                      <img [src]="record.selfieUrl" [alt]="record.staffName">
                    </div>
                    <span>{{ record.staffName }}</span>
                  </div>
                </td>
                <td>{{ record.department }}</td>
                <td>{{ formatDateTime(record.checkInTime) }}</td>
                <td>{{ record.checkOutTime ? formatDateTime(record.checkOutTime) : '-' }}</td>
                <td>
                  <span class="status-badge" [ngClass]="'status-' + record.status">
                    {{ getStatusLabel(record.status) }}
                  </span>
                </td>
                <td>
                  <span class="confidence-badge" [ngClass]="getConfidenceClass(record.confidence)">
                    {{ record.confidence }}%
                  </span>
                </td>
                <td>{{ record.location || '-' }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon-small" (click)="viewDetails(record)" title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button class="btn-icon-small" (click)="viewSelfie(record)" title="View Selfie" *ngIf="record.selfieUrl">
                      <i class="material-icons">photo</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredRecords.length === 0">
                <td colspan="9" class="no-data">
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
    .facial-recognition-attendance-container {
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
      color: #3498db;
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

    .api-banner .material-icons {
      font-size: 20px;
      color: #2e7d32;
      flex-shrink: 0;
    }

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

    .capture-hint {
      margin: 0 0 16px;
      color: #7f8c8d;
      font-size: 13px;
    }

    .capture-body {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .capture-preview {
      position: relative;
      width: 160px;
      height: 160px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid #e0e0e0;
    }

    .capture-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .btn-clear-image {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border: none;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .capture-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .hidden-file {
      display: none;
    }

    .btn-secondary,
    .btn-cancel {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      border: 1px solid #ddd;
      background: #f8f9fa;
      color: #2c3e50;
    }

    .location-select {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }

    .loading-state {
      text-align: center;
      padding: 40px;
      color: #7f8c8d;
    }

    .loading-state .material-icons {
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
      background: #3498db;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #2980b9;
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

    .stat-card.total .stat-icon {
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

    .records-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

    .staff-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .staff-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
    }

    .staff-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
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

    .confidence-badge {
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
    }

    .confidence-high {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .confidence-medium {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .confidence-low {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
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
    }
  `]
})
export class FacialRecognitionAttendanceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  attendanceRecords: AttendanceRecord[] = [];
  filteredRecords: AttendanceRecord[] = [];
  searchTerm = '';
  selectedStatus = '';
  selectedDate: AttendanceDatePreset = 'today';
  loadError = '';
  isLoading = false;
  isCapturing = false;
  showCapturePanel = false;
  capturedImage = '';
  captureLocation = 'Main Gate';

  stats: AttendanceStatistics = {
    present: 0,
    absent: 0,
    late: 0,
    earlyLeave: 0,
    total: 0
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private attendanceService: FacialAttendanceService
  ) {}

  ngOnInit(): void {
    this.loadAttendanceRecords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAttendanceRecords(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.attendanceRecords = [];
      this.filteredRecords = [];
      this.stats = { present: 0, absent: 0, late: 0, earlyLeave: 0, total: 0 };
      return;
    }

    this.attendanceService
      .getRecords({
        datePreset: this.selectedDate,
        status: this.selectedStatus ? (this.selectedStatus as AttendanceRecord['status']) : undefined,
        searchTerm: this.searchTerm || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: records => {
          this.attendanceRecords = records;
          this.applyLocalFilters();
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
        error: err => {
          console.error('Error loading attendance statistics:', err);
        }
      });
  }

  filterRecords(): void {
    this.loadAttendanceRecords();
  }

  /** Client-side search refinement on already-loaded records */
  private applyLocalFilters(): void {
    this.filteredRecords = applyAttendanceFilter(this.attendanceRecords, {
      searchTerm: this.searchTerm || undefined,
      status: this.selectedStatus ? (this.selectedStatus as AttendanceRecord['status']) : undefined
    });
    if (!this.searchTerm && !this.selectedStatus) {
      this.stats = computeStatistics(this.filteredRecords);
    }
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

  getConfidenceClass(confidence: number): string {
    if (confidence >= 90) return 'confidence-high';
    if (confidence >= 70) return 'confidence-medium';
    return 'confidence-low';
  }

  captureAttendance(): void {
    this.showCapturePanel = true;
    this.capturedImage = '';
  }

  closeCapturePanel(): void {
    this.showCapturePanel = false;
    this.capturedImage = '';
  }

  onSelfieSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.capturedImage = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }

  clearCapturedImage(): void {
    this.capturedImage = '';
  }

  submitCapture(): void {
    if (!this.capturedImage) return;
    this.isCapturing = true;
    this.attendanceService
      .captureAttendance({ faceImage: this.capturedImage, location: this.captureLocation })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          this.isCapturing = false;
          if (response.success) {
            this.closeCapturePanel();
            this.loadAttendanceRecords();
            window.alert(`Attendance recorded for ${response.record?.staffName ?? 'staff'}`);
          } else {
            window.alert(response.message || 'Failed to capture attendance');
          }
        },
        error: err => {
          this.isCapturing = false;
          console.error('Capture attendance error:', err);
          window.alert('Failed to capture attendance');
        }
      });
  }

  viewDetails(record: AttendanceRecord): void {
    const lines = [
      `Staff: ${record.staffName} (${record.staffId})`,
      `Department: ${record.department}`,
      `Status: ${this.getStatusLabel(record.status)}`,
      `Check-in: ${this.formatDateTime(record.checkInTime)}`,
      record.checkOutTime ? `Check-out: ${this.formatDateTime(record.checkOutTime)}` : 'Check-out: —',
      `Confidence: ${record.confidence}%`,
      `Location: ${record.location || '—'}`
    ];
    window.alert(lines.join('\n'));
  }

  viewSelfie(record: AttendanceRecord): void {
    if (record.selfieUrl) {
      window.open(record.selfieUrl, '_blank');
    }
  }

  refreshRecords(): void {
    this.loadAttendanceRecords();
  }

  exportRecords(): void {
    if (this.filteredRecords.length === 0) {
      window.alert('No records to export');
      return;
    }
    const header = 'Staff ID,Name,Department,Check-In,Check-Out,Status,Confidence,Location';
    const rows = this.filteredRecords.map(r =>
      [
        r.staffId,
        r.staffName,
        r.department,
        this.formatDateTime(r.checkInTime),
        r.checkOutTime ? this.formatDateTime(r.checkOutTime) : '',
        this.getStatusLabel(r.status),
        `${r.confidence}%`,
        r.location || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facial-attendance-${this.selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  goBack(): void {
    this.router.navigate(['/admin/guard-management']);
  }
}

