import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { RFIDReaderService } from '../services/rfid-reader.service';
import {
  RFIDReader,
  ReaderType,
  ReaderStatus,
  ReaderFilter,
  ReaderStatistics
} from '../models/rfid-reader.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-rfid-reader-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="rfid-reader-container">
      <div class="page-header">
        <h1><i class="material-icons">nfc</i> RFID/Smart Card Readers</h1>
        <p>Manage and monitor RFID and Smart Card reader devices</p>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">devices</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalReaders }}</div>
            <div class="stat-label">Total Readers</div>
          </div>
        </div>
        <div class="stat-card online">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.onlineReaders }}</div>
            <div class="stat-label">Online</div>
          </div>
        </div>
        <div class="stat-card reads">
          <div class="stat-icon">
            <i class="material-icons">sensors</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(statistics.totalReads) }}</div>
            <div class="stat-label">Total Reads</div>
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
        <div class="stat-card integrated">
          <div class="stat-icon">
            <i class="material-icons">link</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.integrationStatus.active }}</div>
            <div class="stat-label">Active Integration</div>
          </div>
        </div>
        <div class="stat-card uptime">
          <div class="stat-icon">
            <i class="material-icons">timer</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatUptime(statistics.averageUptime) }}</div>
            <div class="stat-label">Avg Uptime</div>
          </div>
        </div>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Add Reader
        </button>
        <div class="search-filter">
          <input 
            type="text" 
            placeholder="Search readers..."
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Reader Type</label>
          <select [(ngModel)]="filter.type" (change)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option [value]="ReaderType.RFID_READER">RFID Reader</option>
            <option [value]="ReaderType.SMART_CARD_READER">Smart Card Reader</option>
            <option [value]="ReaderType.NFC_READER">NFC Reader</option>
            <option [value]="ReaderType.FASTAG_READER">FASTag Reader</option>
            <option [value]="ReaderType.COMBO_READER">Combo Reader</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="ReaderStatus.ONLINE">Online</option>
            <option [value]="ReaderStatus.OFFLINE">Offline</option>
            <option [value]="ReaderStatus.MAINTENANCE">Maintenance</option>
            <option [value]="ReaderStatus.ERROR">Error</option>
            <option [value]="ReaderStatus.CONFIGURING">Configuring</option>
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

      <!-- Readers Grid -->
      <div class="readers-grid" *ngIf="!isLoading && readers.length > 0">
        <div 
          *ngFor="let reader of readers" 
          class="reader-card"
          [ngClass]="getStatusClass(reader.status)">
          <div class="reader-header">
            <div class="reader-icon" [ngClass]="getTypeClass(reader.type)">
              <i class="material-icons">{{ getTypeIcon(reader.type) }}</i>
            </div>
            <div class="reader-title-section">
              <h3>{{ reader.name }}</h3>
              <div class="reader-badges">
                <span class="badge-type">{{ getTypeLabel(reader.type) }}</span>
                <span class="badge-status" [ngClass]="getStatusClass(reader.status)">
                  {{ getStatusLabel(reader.status) }}
                </span>
                <span class="badge-integration" *ngIf="reader.isIntegrated" [ngClass]="reader.integrationStatus?.toLowerCase()">
                  {{ reader.integrationStatus }}
                </span>
                <span class="badge-auto" *ngIf="reader.autoOpenGate">
                  <i class="material-icons">lock_open</i>
                  Auto Open
                </span>
              </div>
            </div>
            <div class="reader-actions">
              <button class="btn-action" (click)="viewReader(reader)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button class="btn-action" (click)="editReader(reader)" title="Edit">
                <i class="material-icons">edit</i>
              </button>
              <button class="btn-action" (click)="testReader(reader)" title="Test Reader">
                <i class="material-icons">bug_report</i>
              </button>
            </div>
          </div>
          <div class="reader-body">
            <div class="reader-info">
              <div class="info-item" *ngIf="reader.model">
                <i class="material-icons">memory</i>
                <span>{{ reader.model }}</span>
              </div>
              <div class="info-item" *ngIf="reader.manufacturer">
                <i class="material-icons">business</i>
                <span>{{ reader.manufacturer }}</span>
              </div>
              <div class="info-item" *ngIf="reader.gateName">
                <i class="material-icons">location_on</i>
                <span>{{ reader.gateName }}</span>
              </div>
              <div class="info-item" *ngIf="reader.location">
                <i class="material-icons">place</i>
                <span>{{ reader.location }}</span>
              </div>
              <div class="info-item" *ngIf="reader.ipAddress">
                <i class="material-icons">dns</i>
                <span>{{ reader.ipAddress }}{{ reader.port ? ':' + reader.port : '' }}</span>
              </div>
              <div class="info-item" *ngIf="reader.readRange">
                <i class="material-icons">signal_cellular_alt</i>
                <span>Range: {{ reader.readRange }}m</span>
              </div>
            </div>
            <div class="reader-stats">
              <div class="stat-item">
                <span class="stat-label">Total Reads:</span>
                <span class="stat-value">{{ formatNumber(reader.totalReads || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Success:</span>
                <span class="stat-value success">{{ formatNumber(reader.successfulReads || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Failed:</span>
                <span class="stat-value" [ngClass]="{'error': (reader.failedReads || 0) > 0}">
                  {{ formatNumber(reader.failedReads || 0) }}
                </span>
              </div>
              <div class="stat-item" *ngIf="reader.errorCount !== undefined">
                <span class="stat-label">Errors:</span>
                <span class="stat-value" [ngClass]="{'error': reader.errorCount > 0}">
                  {{ reader.errorCount }}
                </span>
              </div>
            </div>
            <div class="reader-footer" *ngIf="reader.lastSeen">
              <span class="last-seen">
                <i class="material-icons">schedule</i>
                Last seen: {{ formatDateTime(reader.lastSeen) }}
              </span>
              <span class="last-tag" *ngIf="reader.lastTagRead">
                <i class="material-icons">credit_card</i>
                Last tag: {{ reader.lastTagRead }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && readers.length === 0">
        <i class="material-icons">nfc</i>
        <p>No readers found</p>
        <button class="btn-primary" (click)="openAddForm()">
          <i class="material-icons">add</i>
          Add First Reader
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading readers...</p>
      </div>
    </div>
  `,
  styles: [`
    .rfid-reader-container {
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

    .stat-card.reads .stat-icon {
      background: #17a2b8;
    }

    .stat-card.success .stat-icon {
      background: #28a745;
    }

    .stat-card.integrated .stat-icon {
      background: #6f42c1;
    }

    .stat-card.uptime .stat-icon {
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
      cursor: pointer;
      display: flex;
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

    .readers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .reader-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 4px solid #667eea;
      transition: all 0.2s;
    }

    .reader-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .reader-card.online {
      border-left-color: #28a745;
    }

    .reader-card.offline {
      border-left-color: #dc3545;
    }

    .reader-card.maintenance {
      border-left-color: #ffc107;
    }

    .reader-card.error {
      border-left-color: #dc3545;
    }

    .reader-card.configuring {
      border-left-color: #17a2b8;
    }

    .reader-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .reader-icon {
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

    .reader-title-section {
      flex: 1;
    }

    .reader-title-section h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .reader-badges {
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

    .badge-auto {
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

    .badge-auto .material-icons {
      font-size: 14px;
    }

    .reader-actions {
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

    .reader-body {
      margin-top: 16px;
    }

    .reader-info {
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

    .reader-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
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

    .stat-value.error {
      color: #dc3545;
    }

    .reader-footer {
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
    .last-tag {
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
      .readers-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RFIDReaderListComponent implements OnInit, OnDestroy {
  readers: RFIDReader[] = [];
  statistics: ReaderStatistics | null = null;
  isLoading = false;
  filter: ReaderFilter = {};

  ReaderType = ReaderType;
  ReaderStatus = ReaderStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private readerService: RFIDReaderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadReaders();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReaders(): void {
    this.isLoading = true;
    this.readerService.getAllReaders(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (readers) => {
          this.readers = readers;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading readers:', error);
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.readerService.getStatistics()
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
    this.loadReaders();
  }

  clearFilters(): void {
    this.filter = {};
    this.loadReaders();
  }

  openAddForm(): void {
    this.router.navigate(['/admin/hardware-integration/rfid-readers/add']);
  }

  viewReader(reader: RFIDReader): void {
    this.router.navigate(['/admin/hardware-integration/rfid-readers', reader.id]);
  }

  editReader(reader: RFIDReader): void {
    this.router.navigate(['/admin/hardware-integration/rfid-readers', reader.id, 'edit']);
  }

  testReader(reader: RFIDReader): void {
    this.readerService.testReader({
      readerId: reader.id,
      testType: 'FULL'
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const message = result.overallStatus === 'PASS' 
            ? 'Reader test passed!' 
            : `Reader test ${result.overallStatus}: ${Object.values(result.results).map(r => r.message).join(', ')}`;
          alert(message);
        },
        error: (error) => {
          console.error('Error testing reader:', error);
          alert('Error testing reader');
        }
      });
  }

  getTypeLabel(type: ReaderType): string {
    const labels: { [key: string]: string } = {
      'RFID_READER': 'RFID Reader',
      'SMART_CARD_READER': 'Smart Card',
      'NFC_READER': 'NFC Reader',
      'FASTAG_READER': 'FASTag Reader',
      'COMBO_READER': 'Combo Reader'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: ReaderType): string {
    const icons: { [key: string]: string } = {
      'RFID_READER': 'nfc',
      'SMART_CARD_READER': 'credit_card',
      'NFC_READER': 'nfc',
      'FASTAG_READER': 'local_shipping',
      'COMBO_READER': 'devices'
    };
    return icons[type] || 'nfc';
  }

  getTypeClass(type: ReaderType): string {
    return type.toLowerCase().replace(/_/g, '-');
  }

  getStatusClass(status: ReaderStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: ReaderStatus): string {
    const labels: { [key: string]: string } = {
      'ONLINE': 'Online',
      'OFFLINE': 'Offline',
      'MAINTENANCE': 'Maintenance',
      'ERROR': 'Error',
      'CONFIGURING': 'Configuring'
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
    if (!this.statistics || this.statistics.totalReads === 0) return 0;
    return Math.round((this.statistics.successfulReads / this.statistics.totalReads) * 100);
  }
}
















































