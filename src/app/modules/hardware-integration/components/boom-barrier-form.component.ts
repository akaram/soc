import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BoomBarrierService } from '../services/boom-barrier.service';
import {
  BoomBarrierType,
  BoomBarrierProtocol,
  BoomBarrierStatus,
  OperationMode,
  CreateBoomBarrierRequest,
  UpdateBoomBarrierRequest
} from '../models/boom-barrier.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-boom-barrier-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="boom-barrier-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit Boom Barrier' : 'Add Boom Barrier' }}
        </h1>
        <p>{{ isEditMode ? 'Update boom barrier configuration' : 'Add a new boom barrier or gate automation system' }}</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Barrier Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.name" 
                  name="name" 
                  required
                  placeholder="e.g., Boom Barrier - Main Gate Entry"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Barrier Type *</label>
                <select 
                  [(ngModel)]="formData.type" 
                  name="type" 
                  required
                  class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="BoomBarrierType.SINGLE_ARM">Single Arm</option>
                  <option [value]="BoomBarrierType.DOUBLE_ARM">Double Arm</option>
                  <option [value]="BoomBarrierType.SLIDING_GATE">Sliding Gate</option>
                  <option [value]="BoomBarrierType.SWING_GATE">Swing Gate</option>
                  <option [value]="BoomBarrierType.LIFT_GATE">Lift Gate</option>
                  <option [value]="BoomBarrierType.TURNSTILE">Turnstile</option>
                </select>
              </div>
              <div class="form-group">
                <label>Model</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.model" 
                  name="model"
                  placeholder="Barrier model"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Manufacturer</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.manufacturer" 
                  name="manufacturer"
                  placeholder="Manufacturer name"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Serial Number</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.serialNumber" 
                  name="serialNumber"
                  placeholder="Serial number"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Location Information -->
          <div class="form-section">
            <h3>Location</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Gate</label>
                <select [(ngModel)]="formData.gateId" name="gateId" class="form-control">
                  <option value="">Select Gate</option>
                  <option value="MAIN_GATE">Main Gate</option>
                  <option value="SIDE_GATE">Side Gate</option>
                  <option value="PARKING_GATE">Parking Gate</option>
                  <option value="EMERGENCY_GATE">Emergency Gate</option>
                </select>
              </div>
              <div class="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.location" 
                  name="location"
                  placeholder="e.g., Entry Lane"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Building Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.buildingName" 
                  name="buildingName"
                  placeholder="Building name"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Floor Number</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.floorNumber" 
                  name="floorNumber"
                  placeholder="Floor number"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Lane Number</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.laneNumber" 
                  name="laneNumber"
                  placeholder="Lane number"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Direction</label>
                <select [(ngModel)]="formData.direction" name="direction" class="form-control">
                  <option value="">Select Direction</option>
                  <option value="IN">In</option>
                  <option value="OUT">Out</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Connection Information -->
          <div class="form-section">
            <h3>Connection</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Connection Type *</label>
                <select 
                  [(ngModel)]="formData.connectionType" 
                  name="connectionType" 
                  required
                  class="form-control">
                  <option value="">Select Connection Type</option>
                  <option value="WIRED">Wired</option>
                  <option value="WIRELESS">Wireless</option>
                  <option value="ETHERNET">Ethernet</option>
                  <option value="WIFI">WiFi</option>
                  <option value="RS485">RS485</option>
                  <option value="MODBUS">Modbus</option>
                </select>
              </div>
              <div class="form-group">
                <label>IP Address</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.ipAddress" 
                  name="ipAddress"
                  placeholder="192.168.1.100"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Port</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.port" 
                  name="port"
                  placeholder="8080"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>MAC Address</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.macAddress" 
                  name="macAddress"
                  placeholder="00:1B:44:11:3A:B7"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Operation Configuration -->
          <div class="form-section">
            <h3>Operation Configuration</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Operation Mode *</label>
                <select 
                  [(ngModel)]="formData.operationMode" 
                  name="operationMode" 
                  required
                  class="form-control">
                  <option value="">Select Mode</option>
                  <option [value]="OperationMode.MANUAL">Manual</option>
                  <option [value]="OperationMode.AUTOMATIC">Automatic</option>
                  <option [value]="OperationMode.SEMI_AUTOMATIC">Semi-Automatic</option>
                  <option [value]="OperationMode.SCHEDULED">Scheduled</option>
                </select>
              </div>
              <div class="form-group">
                <label>Supported Protocols *</label>
                <div class="checkbox-group">
                  <label *ngFor="let protocol of availableProtocols">
                    <input 
                      type="checkbox" 
                      [value]="protocol"
                      [checked]="formData.supportedProtocols.includes(protocol)"
                      (change)="toggleProtocol(protocol)">
                    {{ getProtocolLabel(protocol) }}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Open Time (seconds)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.openTime" 
                  name="openTime"
                  placeholder="5"
                  min="1"
                  max="60"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Close Time (seconds)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.closeTime" 
                  name="closeTime"
                  placeholder="5"
                  min="1"
                  max="60"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Auto-Close Delay (seconds)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.autoCloseDelay" 
                  name="autoCloseDelay"
                  placeholder="10"
                  min="0"
                  max="300"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Safety Features -->
          <div class="form-section">
            <h3>Safety Features</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.safetyBeam" 
                    name="safetyBeam">
                  Safety Beam
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.loopDetector" 
                    name="loopDetector">
                  Loop Detector
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.photocell" 
                    name="photocell">
                  Photocell
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.emergencyStop" 
                    name="emergencyStop">
                  Emergency Stop
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.obstacleDetection" 
                    name="obstacleDetection">
                  Obstacle Detection
                </label>
              </div>
            </div>
          </div>

          <!-- Integration -->
          <div class="form-section">
            <h3>Integration</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.integratedWithRFID" 
                    name="integratedWithRFID">
                  Integrated with RFID
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.integratedWithANPR" 
                    name="integratedWithANPR">
                  Integrated with ANPR
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.integratedWithBiometric" 
                    name="integratedWithBiometric">
                  Integrated with Biometric
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.requiresApproval" 
                    name="requiresApproval">
                  Requires Approval
                </label>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-section">
            <h3>Additional Information</h3>
            <div class="form-group full-width">
              <label>Notes</label>
              <textarea 
                [(ngModel)]="formData.notes" 
                name="notes"
                rows="4"
                placeholder="Additional notes or comments"
                class="form-control"></textarea>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="cancel()">
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <i class="material-icons">{{ isEditMode ? 'save' : 'add' }}</i>
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Barrier' : 'Add Barrier') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .boom-barrier-form-container {
      padding: 24px;
      max-width: 1200px;
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

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section {
      margin-bottom: 32px;
    }

    .form-section h3 {
      font-size: 18px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .form-group label input[type="checkbox"] {
      margin-right: 8px;
    }

    .form-control {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      font-weight: normal;
      margin: 0;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .btn-primary,
    .btn-secondary {
      padding: 12px 24px;
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

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BoomBarrierFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  isSubmitting = false;
  barrierId: string | null = null;

  formData: CreateBoomBarrierRequest = {
    name: '',
    type: BoomBarrierType.SINGLE_ARM,
    connectionType: 'ETHERNET',
    supportedProtocols: [],
    operationMode: OperationMode.AUTOMATIC,
    requiresApproval: false,
    safetyBeam: false,
    loopDetector: false,
    photocell: false,
    emergencyStop: false,
    obstacleDetection: false,
    integratedWithRFID: false,
    integratedWithANPR: false,
    integratedWithBiometric: false
  };

  BoomBarrierType = BoomBarrierType;
  BoomBarrierProtocol = BoomBarrierProtocol;
  OperationMode = OperationMode;

  availableProtocols = [
    BoomBarrierProtocol.RS485,
    BoomBarrierProtocol.MODBUS,
    BoomBarrierProtocol.ETHERNET,
    BoomBarrierProtocol.WIFI,
    BoomBarrierProtocol.HTTP,
    BoomBarrierProtocol.HTTPS
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private boomBarrierService: BoomBarrierService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.barrierId = params['id'];
        this.isEditMode = true;
        if (this.barrierId) {
          this.loadBarrier(this.barrierId);
        }
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
          if (barrier) {
            this.formData = {
              name: barrier.name,
              type: barrier.type,
              model: barrier.model,
              manufacturer: barrier.manufacturer,
              serialNumber: barrier.serialNumber,
              gateId: barrier.gateId,
              location: barrier.location,
              buildingName: barrier.buildingName,
              floorNumber: barrier.floorNumber,
              laneNumber: barrier.laneNumber,
              direction: barrier.direction,
              connectionType: barrier.connectionType,
              ipAddress: barrier.ipAddress,
              macAddress: barrier.macAddress,
              port: barrier.port,
              supportedProtocols: barrier.supportedProtocols,
              operationMode: barrier.operationMode,
              openTime: barrier.openTime,
              closeTime: barrier.closeTime,
              autoCloseDelay: barrier.autoCloseDelay,
              requiresApproval: barrier.requiresApproval,
              safetyBeam: barrier.safetyBeam,
              loopDetector: barrier.loopDetector,
              photocell: barrier.photocell,
              emergencyStop: barrier.emergencyStop,
              obstacleDetection: barrier.obstacleDetection,
              integratedWithRFID: barrier.integratedWithRFID,
              integratedWithANPR: barrier.integratedWithANPR,
              integratedWithBiometric: barrier.integratedWithBiometric,
              settings: barrier.settings,
              notes: barrier.notes,
              tags: barrier.tags
            };
          }
        },
        error: (error) => {
          console.error('Error loading barrier:', error);
        }
      });
  }

  toggleProtocol(protocol: BoomBarrierProtocol): void {
    const index = this.formData.supportedProtocols.indexOf(protocol);
    if (index > -1) {
      this.formData.supportedProtocols.splice(index, 1);
    } else {
      this.formData.supportedProtocols.push(protocol);
    }
  }

  getProtocolLabel(protocol: BoomBarrierProtocol): string {
    return protocol;
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.isEditMode && this.barrierId) {
      const updateRequest: UpdateBoomBarrierRequest = {
        name: this.formData.name,
        location: this.formData.location,
        gateId: this.formData.gateId,
        ipAddress: this.formData.ipAddress,
        port: this.formData.port,
        operationMode: this.formData.operationMode,
        autoCloseDelay: this.formData.autoCloseDelay,
        requiresApproval: this.formData.requiresApproval,
        notes: this.formData.notes
      };

      this.boomBarrierService.updateBarrier(this.barrierId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/boom-barriers']);
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('Error updating barrier:', error);
            alert('Error updating barrier');
            this.isSubmitting = false;
          }
        });
    } else {
      this.boomBarrierService.createBarrier(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/boom-barriers']);
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('Error creating barrier:', error);
            alert('Error creating barrier');
            this.isSubmitting = false;
          }
        });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/hardware-integration/boom-barriers']);
  }
}


