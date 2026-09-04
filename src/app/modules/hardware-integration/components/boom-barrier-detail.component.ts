import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BoomBarrierService } from '../services/boom-barrier.service';
import { BoomBarrier, BoomBarrierType, BoomBarrierStatus, OperationMode } from '../models/boom-barrier.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-boom-barrier-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="boom-barrier-detail-container" *ngIf="barrier">
      <div class="page-header">
        <button type="button" class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <div>
          <h1>{{ barrier.name }}</h1>
          <p>Boom barrier details and configuration</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-action" (click)="operateBarrier()" [disabled]="barrier.status !== BoomBarrierStatus.ONLINE">
            <i class="material-icons">{{ barrier.isOpen ? 'lock' : 'lock_open' }}</i>
            {{ barrier.isOpen ? 'Close' : 'Open' }}
          </button>
          <button type="button" class="btn-action" (click)="editBarrier()">
            <i class="material-icons">edit</i>
            Edit
          </button>
          <button type="button" class="btn-action" (click)="testBarrier()">
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
              <span class="label">Barrier Type:</span>
              <span class="value">{{ getTypeLabel(barrier.type) }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.model">
              <span class="label">Model:</span>
              <span class="value">{{ barrier.model }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.manufacturer">
              <span class="label">Manufacturer:</span>
              <span class="value">{{ barrier.manufacturer }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.serialNumber">
              <span class="label">Serial Number:</span>
              <span class="value">{{ barrier.serialNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.firmwareVersion">
              <span class="label">Firmware Version:</span>
              <span class="value">{{ barrier.firmwareVersion }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span class="value badge-status" [ngClass]="getStatusClass(barrier.status)">
                {{ getStatusLabel(barrier.status) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Current State:</span>
              <span class="value" [ngClass]="barrier.isOpen ? 'success' : 'error'">
                <i class="material-icons">{{ barrier.isOpen ? 'lock_open' : 'lock' }}</i>
                {{ barrier.isOpen ? 'Open' : 'Closed' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Operation Configuration -->
        <div class="detail-card">
          <h3><i class="material-icons">settings</i> Operation Configuration</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="barrier.supportedProtocols && barrier.supportedProtocols.length > 0">
              <span class="label">Supported Protocols:</span>
              <span class="value">{{ barrier.supportedProtocols.join(', ') }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Operation Mode:</span>
              <span class="value">{{ getOperationModeLabel(barrier.operationMode) }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.openTime">
              <span class="label">Open Time:</span>
              <span class="value">{{ barrier.openTime }} seconds</span>
            </div>
            <div class="detail-item" *ngIf="barrier.closeTime">
              <span class="label">Close Time:</span>
              <span class="value">{{ barrier.closeTime }} seconds</span>
            </div>
            <div class="detail-item" *ngIf="barrier.autoCloseDelay">
              <span class="label">Auto-Close Delay:</span>
              <span class="value">{{ barrier.autoCloseDelay }} seconds</span>
            </div>
            <div class="detail-item">
              <span class="label">Requires Approval:</span>
              <span class="value" [ngClass]="barrier.requiresApproval ? 'error' : 'success'">
                {{ barrier.requiresApproval ? 'Yes' : 'No' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Safety Features -->
        <div class="detail-card">
          <h3><i class="material-icons">security</i> Safety Features</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Safety Beam:</span>
              <span class="value" [ngClass]="barrier.safetyBeam ? 'success' : 'error'">
                {{ barrier.safetyBeam ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Loop Detector:</span>
              <span class="value" [ngClass]="barrier.loopDetector ? 'success' : 'error'">
                {{ barrier.loopDetector ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Photocell:</span>
              <span class="value" [ngClass]="barrier.photocell ? 'success' : 'error'">
                {{ barrier.photocell ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Emergency Stop:</span>
              <span class="value" [ngClass]="barrier.emergencyStop ? 'success' : 'error'">
                {{ barrier.emergencyStop ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Obstacle Detection:</span>
              <span class="value" [ngClass]="barrier.obstacleDetection ? 'success' : 'error'">
                {{ barrier.obstacleDetection ? 'Enabled' : 'Disabled' }}
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
              <span class="value" [ngClass]="barrier.integratedWithRFID ? 'success' : 'error'">
                {{ barrier.integratedWithRFID ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Integrated with ANPR:</span>
              <span class="value" [ngClass]="barrier.integratedWithANPR ? 'success' : 'error'">
                {{ barrier.integratedWithANPR ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Integrated with Biometric:</span>
              <span class="value" [ngClass]="barrier.integratedWithBiometric ? 'success' : 'error'">
                {{ barrier.integratedWithBiometric ? 'Yes' : 'No' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Integration Status:</span>
              <span class="value badge-integration" [ngClass]="barrier.integrationStatus?.toLowerCase()">
                {{ barrier.integrationStatus }}
              </span>
            </div>
            <div class="detail-item" *ngIf="barrier.apiEndpoint">
              <span class="label">API Endpoint:</span>
              <span class="value">{{ barrier.apiEndpoint }}</span>
            </div>
          </div>
        </div>

        <!-- Location Information -->
        <div class="detail-card">
          <h3><i class="material-icons">location_on</i> Location</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="barrier.gateName">
              <span class="label">Gate:</span>
              <span class="value">{{ barrier.gateName }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.location">
              <span class="label">Location:</span>
              <span class="value">{{ barrier.location }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.buildingName">
              <span class="label">Building:</span>
              <span class="value">{{ barrier.buildingName }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.floorNumber">
              <span class="label">Floor:</span>
              <span class="value">{{ barrier.floorNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.laneNumber">
              <span class="label">Lane Number:</span>
              <span class="value">{{ barrier.laneNumber }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.direction">
              <span class="label">Direction:</span>
              <span class="value">{{ barrier.direction }}</span>
            </div>
          </div>
        </div>

        <!-- Connection Information -->
        <div class="detail-card">
          <h3><i class="material-icons">settings_ethernet</i> Connection</h3>
          <div class="detail-list">
            <div class="detail-item">
              <span class="label">Connection Type:</span>
              <span class="value">{{ barrier.connectionType }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.ipAddress">
              <span class="label">IP Address:</span>
              <span class="value">{{ barrier.ipAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.port">
              <span class="label">Port:</span>
              <span class="value">{{ barrier.port }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.macAddress">
              <span class="label">MAC Address:</span>
              <span class="value">{{ barrier.macAddress }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.lastSeen">
              <span class="label">Last Seen:</span>
              <span class="value">{{ formatDateTime(barrier.lastSeen) }}</span>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="detail-card">
          <h3><i class="material-icons">bar_chart</i> Statistics</h3>
          <div class="detail-list">
            <div class="detail-item" *ngIf="barrier.uptime">
              <span class="label">Uptime:</span>
              <span class="value">{{ formatUptime(barrier.uptime) }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.totalOperations">
              <span class="label">Total Operations:</span>
              <span class="value">{{ barrier.totalOperations | number }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.successfulOperations">
              <span class="label">Successful Operations:</span>
              <span class="value success">{{ barrier.successfulOperations | number }}</span>
            </div>
            <div class="detail-item" *ngIf="barrier.failedOperations">
              <span class="label">Failed Operations:</span>
              <span class="value" [ngClass]="{'error': barrier.failedOperations > 0}">
                {{ barrier.failedOperations | number }}
              </span>
            </div>
            <div class="detail-item" *ngIf="barrier.averageOperationTime">
              <span class="label">Average Operation Time:</span>
              <span class="value">{{ barrier.averageOperationTime.toFixed(1) }}s</span>
            </div>
            <div class="detail-item" *ngIf="barrier.errorCount !== undefined">
              <span class="label">Error Count:</span>
              <span class="value" [ngClass]="{'error': barrier.errorCount > 0}">
                {{ barrier.errorCount }}
              </span>
            </div>
            <div class="detail-item" *ngIf="barrier.lastOperationAt">
              <span class="label">Last Operation:</span>
              <span class="value">{{ barrier.lastOperationType }} at {{ formatDateTime(barrier.lastOperationAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="detail-card" *ngIf="barrier.notes">
          <h3><i class="material-icons">notes</i> Notes</h3>
          <p class="notes-text">{{ barrier.notes }}</p>
        </div>
      </div>
    </div>

    <div class="loading-state" *ngIf="!barrier">
      <i class="material-icons">hourglass_empty</i>
      <p>Loading barrier details...</p>
    </div>
  `,
  styles: [`
    .boom-barrier-detail-container {
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
export class BoomBarrierDetailComponent implements OnInit, OnDestroy {
  barrier: BoomBarrier | null = null;

  BoomBarrierType = BoomBarrierType;
  BoomBarrierStatus = BoomBarrierStatus;
  OperationMode = OperationMode;

  private destroy$ = new Subject<void>();

  constructor(
    private boomBarrierService: BoomBarrierService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadBarrier(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBarrier(id: string): void {
    this.boomBarrierService.getBarrierById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (barrier) => {
          this.barrier = barrier;
        },
        error: (error) => {
          console.error('Error loading barrier:', error);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/hardware-integration/boom-barriers']);
  }

  editBarrier(): void {
    if (this.barrier) {
      this.router.navigate(['/admin/hardware-integration/boom-barriers', this.barrier.id, 'edit']);
    }
  }

  operateBarrier(): void {
    if (this.barrier) {
      const operation = this.barrier.isOpen ? 'CLOSE' : 'OPEN';
      this.boomBarrierService.operateBarrier({
        barrierId: this.barrier.id,
        operation: operation
      }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              alert(`Barrier ${operation.toLowerCase()} command sent successfully`);
              this.loadBarrier(this.barrier!.id);
            } else {
              alert('Error: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error operating barrier:', error);
            alert('Error operating barrier');
          }
        });
    }
  }

  testBarrier(): void {
    if (this.barrier) {
      this.boomBarrierService.testBarrier({
        barrierId: this.barrier.id,
        testType: 'FULL'
      }).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            const message = result.overallStatus === 'PASS' 
              ? 'Barrier test passed!' 
              : `Barrier test ${result.overallStatus}: ${Object.values(result.results).map(r => r.message).join(', ')}`;
            alert(message);
          },
          error: (error) => {
            console.error('Error testing barrier:', error);
            alert('Error testing barrier');
          }
        });
    }
  }

  getTypeLabel(type: BoomBarrierType): string {
    const labels: { [key: string]: string } = {
      'SINGLE_ARM': 'Single Arm',
      'DOUBLE_ARM': 'Double Arm',
      'SLIDING_GATE': 'Sliding Gate',
      'SWING_GATE': 'Swing Gate',
      'LIFT_GATE': 'Lift Gate',
      'TURNSTILE': 'Turnstile'
    };
    return labels[type] || type;
  }

  getStatusClass(status: BoomBarrierStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: BoomBarrierStatus): string {
    const labels: { [key: string]: string } = {
      'ONLINE': 'Online',
      'OFFLINE': 'Offline',
      'MAINTENANCE': 'Maintenance',
      'ERROR': 'Error',
      'CONFIGURING': 'Configuring',
      'OPENING': 'Opening',
      'CLOSING': 'Closing',
      'STUCK_OPEN': 'Stuck Open',
      'STUCK_CLOSED': 'Stuck Closed'
    };
    return labels[status] || status;
  }

  getOperationModeLabel(mode: OperationMode): string {
    const labels: { [key: string]: string } = {
      'MANUAL': 'Manual',
      'AUTOMATIC': 'Automatic',
      'SEMI_AUTOMATIC': 'Semi-Automatic',
      'SCHEDULED': 'Scheduled'
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


