import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AccessControlService } from '../services/access-control.service';
import { AccessControl, AccessControlType, AccessControlStatus, AccessMode, AuthenticationMethod } from '../models/access-control.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-access-control-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="access-control-detail-container" *ngIf="accessControl">
      <div class="page-header">
        <button type="button" class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <div>
          <h1>{{ accessControl.name }}</h1>
          <p>Access control system details and configuration</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-action" (click)="operateAccessControl()" [disabled]="accessControl.status !== AccessControlStatus.ONLINE">
            <i class="material-icons">{{ accessControl.isLocked ? 'lock_open' : 'lock' }}</i>
            {{ accessControl.isLocked ? 'Unlock' : 'Lock' }}
          </button>
          <button type="button" class="btn-action" (click)="editAccessControl()">
            <i class="material-icons">edit</i>
            Edit
          </button>
          <button type="button" class="btn-action" (click)="testAccessControl()">
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
              <span class="label">System Type:</span>
              <span class="value">{{ getTypeLabel(accessControl.type) }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.model">
              <span class="label">Model:</span>
              <span class="value">{{ accessControl.model }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.manufacturer">
              <span class="label">Manufacturer:</span>
              <span class="value">{{ accessControl.manufacturer }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.serialNumber">
              <span class="label">Serial Number:</span>
              <span class="value">{{ accessControl.serialNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.firmwareVersion">
              <span class="label">Firmware Version:</span>
              <span class="value">{{ accessControl.firmwareVersion }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span class="value badge-status" [ngClass]="getStatusClass(accessControl.status)">
                {{ getStatusLabel(accessControl.status) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Current State:</span>
              <span class="value" [ngClass]="accessControl.isLocked ? 'error' : 'success'">
                <i class="material-icons">{{ accessControl.isLocked ? 'lock' : 'lock_open' }}</i>
                {{ accessControl.isLocked ? 'Locked' : 'Unlocked' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Access Configuration -->
        <div class="detail-card">
          <h3><i class="material-icons">settings</i> Access Configuration</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="accessControl.supportedProtocols && accessControl.supportedProtocols.length > 0">
              <span class="label">Supported Protocols:</span>
              <span class="value">{{ accessControl.supportedProtocols.join(', ') }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Access Mode:</span>
              <span class="value">{{ getAccessModeLabel(accessControl.accessMode) }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.authenticationMethods && accessControl.authenticationMethods.length > 0">
              <span class="label">Authentication Methods:</span>
              <span class="value">{{ getAuthenticationMethodsLabel(accessControl.authenticationMethods) }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.unlockDuration">
              <span class="label">Unlock Duration:</span>
              <span class="value">{{ accessControl.unlockDuration }} seconds</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.maxUnlockTime">
              <span class="label">Max Unlock Time:</span>
              <span class="value">{{ accessControl.maxUnlockTime }} seconds</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.maxUsers">
              <span class="label">User Capacity:</span>
              <span class="value">{{ accessControl.currentUsers || 0 }} / {{ accessControl.maxUsers }}</span>
            </div>
          </div>
        </div>

        <!-- Security Features -->
        <div class="detail-card">
          <h3><i class="material-icons">security</i> Security Features</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Anti-Tamper:</span>
              <span class="value" [ngClass]="accessControl.antiTamper ? 'success' : 'error'">
                {{ accessControl.antiTamper ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Battery Backup:</span>
              <span class="value" [ngClass]="accessControl.batteryBackup ? 'success' : 'error'">
                {{ accessControl.batteryBackup ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Low Battery Alert:</span>
              <span class="value" [ngClass]="accessControl.lowBatteryAlert ? 'success' : 'error'">
                {{ accessControl.lowBatteryAlert ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Forced Entry Alert:</span>
              <span class="value" [ngClass]="accessControl.forcedEntryAlert ? 'success' : 'error'">
                {{ accessControl.forcedEntryAlert ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Door Sensor:</span>
              <span class="value" [ngClass]="accessControl.doorSensor ? 'success' : 'error'">
                {{ accessControl.doorSensor ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item" *ngIf="accessControl.settings?.batteryLevel !== undefined">
              <span class="label">Battery Level:</span>
              <span class="value" [ngClass]="{'error': (accessControl.settings?.batteryLevel ?? 0) < 20}">
                {{ accessControl.settings?.batteryLevel }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Integration -->
        <div class="detail-card">
          <h3><i class="material-icons">link</i> Integration</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Integrated with RFID:</span>
              <span class="value" [ngClass]="accessControl.integratedWithRFID ? 'success' : 'error'">
                {{ accessControl.integratedWithRFID ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Integrated with Biometric:</span>
              <span class="value" [ngClass]="accessControl.integratedWithBiometric ? 'success' : 'error'">
                {{ accessControl.integratedWithBiometric ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Integrated with ANPR:</span>
              <span class="value" [ngClass]="accessControl.integratedWithANPR ? 'success' : 'error'">
                {{ accessControl.integratedWithANPR ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Integrated with Intercom:</span>
              <span class="value" [ngClass]="accessControl.integratedWithIntercom ? 'success' : 'error'">
                {{ accessControl.integratedWithIntercom ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Integration Status:</span>
              <span class="value badge-integration" [ngClass]="accessControl.integrationStatus?.toLowerCase()">
                {{ accessControl.integrationStatus }}
              </span>
            </div>
            <div class="detail-item" *ngIf="accessControl.apiEndpoint">
              <span class="label">API Endpoint:</span>
              <span class="value">{{ accessControl.apiEndpoint }}</span>
            </div>
          </div>
        </div>

        <!-- Access Management -->
        <div class="detail-card">
          <h3><i class="material-icons">people</i> Access Management</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Supports Schedules:</span>
              <span class="value" [ngClass]="accessControl.supportsSchedules ? 'success' : 'error'">
                {{ accessControl.supportsSchedules ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Supports Groups:</span>
              <span class="value" [ngClass]="accessControl.supportsGroups ? 'success' : 'error'">
                {{ accessControl.supportsGroups ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Supports Temporary Access:</span>
              <span class="value" [ngClass]="accessControl.supportsTemporaryAccess ? 'success' : 'error'">
                {{ accessControl.supportsTemporaryAccess ? 'Yes' : 'No' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Location Information -->
        <div class="detail-card">
          <h3><i class="material-icons">location_on</i> Location</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="accessControl.gateName">
              <span class="label">Gate:</span>
              <span class="value">{{ accessControl.gateName }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.location">
              <span class="label">Location:</span>
              <span class="value">{{ accessControl.location }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.buildingName">
              <span class="label">Building:</span>
              <span class="value">{{ accessControl.buildingName }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.floorNumber">
              <span class="label">Floor:</span>
              <span class="value">{{ accessControl.floorNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.doorNumber">
              <span class="label">Door Number:</span>
              <span class="value">{{ accessControl.doorNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.roomNumber">
              <span class="label">Room Number:</span>
              <span class="value">{{ accessControl.roomNumber }}</span>
            </div>
          </div>
        </div>

        <!-- Connection Information -->
        <div class="detail-card">
          <h3><i class="material-icons">settings_ethernet</i> Connection</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Connection Type:</span>
              <span class="value">{{ accessControl.connectionType }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.ipAddress">
              <span class="label">IP Address:</span>
              <span class="value">{{ accessControl.ipAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.port">
              <span class="label">Port:</span>
              <span class="value">{{ accessControl.port }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.macAddress">
              <span class="label">MAC Address:</span>
              <span class="value">{{ accessControl.macAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.lastSeen">
              <span class="label">Last Seen:</span>
              <span class="value">{{ formatDateTime(accessControl.lastSeen) }}</span>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="detail-card">
          <h3><i class="material-icons">bar_chart</i> Statistics</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="accessControl.uptime">
              <span class="label">Uptime:</span>
              <span class="value">{{ formatUptime(accessControl.uptime) }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.totalAccessAttempts">
              <span class="label">Total Access Attempts:</span>
              <span class="value">{{ accessControl.totalAccessAttempts | number }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.successfulAccess">
              <span class="label">Successful Access:</span>
              <span class="value success">{{ accessControl.successfulAccess | number }}</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.failedAccess">
              <span class="label">Failed Access:</span>
              <span class="value" [ngClass]="{'error': accessControl.failedAccess > 0}">
                {{ accessControl.failedAccess | number }}
              </span>
            </div>
            <div class="detail-item" *ngIf="accessControl.deniedAccess">
              <span class="label">Denied Access:</span>
              <span class="value" [ngClass]="{'error': accessControl.deniedAccess > 0}">
                {{ accessControl.deniedAccess | number }}
              </span>
            </div>
            <div class="detail-item" *ngIf="accessControl.averageResponseTime">
              <span class="label">Avg Response Time:</span>
              <span class="value">{{ accessControl.averageResponseTime }}ms</span>
            </div>
            <div class="detail-item" *ngIf="accessControl.errorCount !== undefined">
              <span class="label">Error Count:</span>
              <span class="value" [ngClass]="{'error': accessControl.errorCount > 0}">
                {{ accessControl.errorCount }}
              </span>
            </div>
            <div class="detail-item" *ngIf="accessControl.lastAccessAt">
              <span class="label">Last Access:</span>
              <span class="value">{{ formatDateTime(accessControl.lastAccessAt) }}{{ accessControl.lastAccessBy ? ' by ' + accessControl.lastAccessBy : '' }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="detail-card" *ngIf="accessControl.notes">
          <h3><i class="material-icons">notes</i> Notes</h3>
          <p class="notes-text">{{ accessControl.notes }}</p>
        </div>
      </div>
    </div>

    <div class="loading-state" *ngIf="!accessControl">
      <i class="material-icons">hourglass_empty</i>
      <p>Loading access control system details...</p>
    </div>
  `,
  styles: [`
    .access-control-detail-container {
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

    .btn-action:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .btn-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
      display: flex;
      align-items: center;
      gap: 4px;
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

    .badge-status.locked {
      background: #d6d8db;
      color: #383d41;
    }

    .badge-status.unlocked {
      background: #d1ecf1;
      color: #0c5460;
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
export class AccessControlDetailComponent implements OnInit, OnDestroy {
  accessControl: AccessControl | null = null;

  AccessControlType = AccessControlType;
  AccessControlStatus = AccessControlStatus;
  AccessMode = AccessMode;
  AuthenticationMethod = AuthenticationMethod;

  private destroy$ = new Subject<void>();

  constructor(
    private accessControlService: AccessControlService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadAccessControl(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAccessControl(id: string): void {
    this.accessControlService.getAccessControlById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (accessControl) => {
          this.accessControl = accessControl;
        },
        error: (error) => {
          console.error('Error loading access control:', error);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/hardware-integration/access-control']);
  }

  editAccessControl(): void {
    if (this.accessControl) {
      this.router.navigate(['/admin/hardware-integration/access-control', this.accessControl.id, 'edit']);
    }
  }

  operateAccessControl(): void {
    if (this.accessControl) {
      const operation = this.accessControl.isLocked ? 'UNLOCK' : 'LOCK';
      this.accessControlService.operateAccessControl({
        accessControlId: this.accessControl.id,
        operation: operation
      }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              alert(`Access control ${operation.toLowerCase()} command sent successfully`);
              this.loadAccessControl(this.accessControl!.id);
            } else {
              alert('Error: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error operating access control:', error);
            alert('Error operating access control');
          }
        });
    }
  }

  testAccessControl(): void {
    if (this.accessControl) {
      this.accessControlService.testAccessControl({
        accessControlId: this.accessControl.id,
        testType: 'FULL'
      }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const message = result.overallStatus === 'PASS' 
              ? 'Access control test passed!' 
              : `Access control test ${result.overallStatus}: ${Object.values(result.results).map(r => r.message).join(', ')}`;
            alert(message);
          },
          error: (error) => {
            console.error('Error testing access control:', error);
            alert('Error testing access control');
          }
        });
    }
  }

  getTypeLabel(type: AccessControlType): string {
    const labels: { [key: string]: string } = {
      'ELECTRONIC_LOCK': 'Electronic Lock',
      'SMART_LOCK': 'Smart Lock',
      'KEYPAD': 'Keypad',
      'CARD_READER': 'Card Reader',
      'BIOMETRIC_ACCESS': 'Biometric Access',
      'INTERCOM': 'Intercom',
      'TURNSTILE': 'Turnstile',
      'REVOLVING_DOOR': 'Revolving Door',
      'MULTI_FACTOR': 'Multi-Factor'
    };
    return labels[type] || type;
  }

  getStatusClass(status: AccessControlStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: AccessControlStatus): string {
    const labels: { [key: string]: string } = {
      'ONLINE': 'Online',
      'OFFLINE': 'Offline',
      'MAINTENANCE': 'Maintenance',
      'ERROR': 'Error',
      'CONFIGURING': 'Configuring',
      'LOCKED': 'Locked',
      'UNLOCKED': 'Unlocked',
      'JAMMED': 'Jammed'
    };
    return labels[status] || status;
  }

  getAccessModeLabel(mode: AccessMode): string {
    const labels: { [key: string]: string } = {
      'ALWAYS_LOCKED': 'Always Locked',
      'ALWAYS_UNLOCKED': 'Always Unlocked',
      'SCHEDULED': 'Scheduled',
      'AUTO_LOCK': 'Auto-Lock',
      'REMOTE_CONTROL': 'Remote Control'
    };
    return labels[mode] || mode;
  }

  getAuthenticationMethodsLabel(methods: string[]): string {
    const labels: { [key: string]: string } = {
      'PIN': 'PIN',
      'CARD': 'Card',
      'BIOMETRIC': 'Biometric',
      'MOBILE_APP': 'Mobile App',
      'KEY_FOB': 'Key Fob',
      'MULTI_FACTOR': 'Multi-Factor'
    };
    return methods.map(m => labels[m] || m).join(', ');
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

