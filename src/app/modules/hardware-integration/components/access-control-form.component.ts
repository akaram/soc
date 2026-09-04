import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AccessControlService } from '../services/access-control.service';
import {
  AccessControlType,
  AccessControlProtocol,
  AccessControlStatus,
  AccessMode,
  AuthenticationMethod,
  CreateAccessControlRequest,
  UpdateAccessControlRequest
} from '../models/access-control.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-access-control-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="access-control-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit Access Control System' : 'Add Access Control System' }}
        </h1>
        <p>{{ isEditMode ? 'Update access control system configuration' : 'Add a new access control or door lock automation system' }}</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>System Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.name" 
                  name="name" 
                  required
                  placeholder="e.g., Smart Lock - Main Gate Entry"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>System Type *</label>
                <select 
                  [(ngModel)]="formData.type" 
                  name="type" 
                  required
                  class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="AccessControlType.ELECTRONIC_LOCK">Electronic Lock</option>
                  <option [value]="AccessControlType.SMART_LOCK">Smart Lock</option>
                  <option [value]="AccessControlType.KEYPAD">Keypad</option>
                  <option [value]="AccessControlType.CARD_READER">Card Reader</option>
                  <option [value]="AccessControlType.BIOMETRIC_ACCESS">Biometric Access</option>
                  <option [value]="AccessControlType.INTERCOM">Intercom</option>
                  <option [value]="AccessControlType.TURNSTILE">Turnstile</option>
                  <option [value]="AccessControlType.REVOLVING_DOOR">Revolving Door</option>
                  <option [value]="AccessControlType.MULTI_FACTOR">Multi-Factor</option>
                </select>
              </div>
              <div class="form-group">
                <label>Model</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.model" 
                  name="model"
                  placeholder="System model"
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
                  placeholder="e.g., Entry Door"
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
                <label>Door Number</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.doorNumber" 
                  name="doorNumber"
                  placeholder="Door identifier"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Room Number</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.roomNumber" 
                  name="roomNumber"
                  placeholder="Room identifier"
                  class="form-control">
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
                  <option value="BLUETOOTH">Bluetooth</option>
                  <option value="ZIGBEE">Zigbee</option>
                  <option value="Z_WAVE">Z-Wave</option>
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

          <!-- Access Configuration -->
          <div class="form-section">
            <h3>Access Configuration</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Access Mode *</label>
                <select 
                  [(ngModel)]="formData.accessMode" 
                  name="accessMode" 
                  required
                  class="form-control">
                  <option value="">Select Mode</option>
                  <option [value]="AccessMode.ALWAYS_LOCKED">Always Locked</option>
                  <option [value]="AccessMode.ALWAYS_UNLOCKED">Always Unlocked</option>
                  <option [value]="AccessMode.SCHEDULED">Scheduled</option>
                  <option [value]="AccessMode.AUTO_LOCK">Auto-Lock</option>
                  <option [value]="AccessMode.REMOTE_CONTROL">Remote Control</option>
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
                <label>Authentication Methods *</label>
                <div class="checkbox-group">
                  <label *ngFor="let method of availableAuthMethods">
                    <input 
                      type="checkbox" 
                      [value]="method"
                      [checked]="formData.authenticationMethods.includes(method)"
                      (change)="toggleAuthMethod(method)">
                    {{ getAuthMethodLabel(method) }}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Unlock Duration (seconds)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.unlockDuration" 
                  name="unlockDuration"
                  placeholder="30"
                  min="0"
                  max="600"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Max Unlock Time (seconds)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.maxUnlockTime" 
                  name="maxUnlockTime"
                  placeholder="300"
                  min="0"
                  max="3600"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Max Users</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.maxUsers" 
                  name="maxUsers"
                  placeholder="1000"
                  min="1"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Security Features -->
          <div class="form-section">
            <h3>Security Features</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.antiTamper" 
                    name="antiTamper">
                  Anti-Tamper
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.batteryBackup" 
                    name="batteryBackup">
                  Battery Backup
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.lowBatteryAlert" 
                    name="lowBatteryAlert">
                  Low Battery Alert
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.forcedEntryAlert" 
                    name="forcedEntryAlert">
                  Forced Entry Alert
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.doorSensor" 
                    name="doorSensor">
                  Door Sensor
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
                    [(ngModel)]="formData.integratedWithBiometric" 
                    name="integratedWithBiometric">
                  Integrated with Biometric
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
                    [(ngModel)]="formData.integratedWithIntercom" 
                    name="integratedWithIntercom">
                  Integrated with Intercom
                </label>
              </div>
            </div>
          </div>

          <!-- Access Management -->
          <div class="form-section">
            <h3>Access Management</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.supportsSchedules" 
                    name="supportsSchedules">
                  Supports Schedules
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.supportsGroups" 
                    name="supportsGroups">
                  Supports Groups
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.supportsTemporaryAccess" 
                    name="supportsTemporaryAccess">
                  Supports Temporary Access
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
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update System' : 'Add System') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .access-control-form-container {
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
export class AccessControlFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  isSubmitting = false;
  accessControlId: string | null = null;

  formData: CreateAccessControlRequest = {
    name: '',
    type: AccessControlType.SMART_LOCK,
    connectionType: 'WIFI',
    supportedProtocols: [],
    accessMode: AccessMode.AUTO_LOCK,
    authenticationMethods: [],
    antiTamper: false,
    batteryBackup: false,
    lowBatteryAlert: false,
    forcedEntryAlert: false,
    doorSensor: false,
    integratedWithRFID: false,
    integratedWithBiometric: false,
    integratedWithANPR: false,
    integratedWithIntercom: false,
    supportsSchedules: false,
    supportsGroups: false,
    supportsTemporaryAccess: false
  };

  AccessControlType = AccessControlType;
  AccessControlProtocol = AccessControlProtocol;
  AccessMode = AccessMode;
  AuthenticationMethod = AuthenticationMethod;

  availableProtocols = [
    AccessControlProtocol.WIFI,
    AccessControlProtocol.ZIGBEE,
    AccessControlProtocol.Z_WAVE,
    AccessControlProtocol.BLUETOOTH,
    AccessControlProtocol.ETHERNET,
    AccessControlProtocol.MODBUS,
    AccessControlProtocol.RS485,
    AccessControlProtocol.HTTP,
    AccessControlProtocol.HTTPS
  ];

  availableAuthMethods = [
    AuthenticationMethod.PIN,
    AuthenticationMethod.CARD,
    AuthenticationMethod.BIOMETRIC,
    AuthenticationMethod.MOBILE_APP,
    AuthenticationMethod.KEY_FOB,
    AuthenticationMethod.MULTI_FACTOR
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private accessControlService: AccessControlService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.accessControlId = params['id'];
        this.isEditMode = true;
        if (this.accessControlId) {
          this.loadAccessControl(this.accessControlId);
        }
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
          if (accessControl) {
            this.formData = {
              name: accessControl.name,
              type: accessControl.type,
              model: accessControl.model,
              manufacturer: accessControl.manufacturer,
              serialNumber: accessControl.serialNumber,
              gateId: accessControl.gateId,
              location: accessControl.location,
              buildingName: accessControl.buildingName,
              floorNumber: accessControl.floorNumber,
              doorNumber: accessControl.doorNumber,
              roomNumber: accessControl.roomNumber,
              connectionType: accessControl.connectionType,
              ipAddress: accessControl.ipAddress,
              macAddress: accessControl.macAddress,
              port: accessControl.port,
              supportedProtocols: accessControl.supportedProtocols,
              accessMode: accessControl.accessMode,
              authenticationMethods: accessControl.authenticationMethods,
              unlockDuration: accessControl.unlockDuration,
              maxUnlockTime: accessControl.maxUnlockTime,
              antiTamper: accessControl.antiTamper,
              batteryBackup: accessControl.batteryBackup,
              lowBatteryAlert: accessControl.lowBatteryAlert,
              forcedEntryAlert: accessControl.forcedEntryAlert,
              doorSensor: accessControl.doorSensor,
              integratedWithRFID: accessControl.integratedWithRFID,
              integratedWithBiometric: accessControl.integratedWithBiometric,
              integratedWithANPR: accessControl.integratedWithANPR,
              integratedWithIntercom: accessControl.integratedWithIntercom,
              supportsSchedules: accessControl.supportsSchedules,
              supportsGroups: accessControl.supportsGroups,
              supportsTemporaryAccess: accessControl.supportsTemporaryAccess,
              maxUsers: accessControl.maxUsers,
              settings: accessControl.settings,
              notes: accessControl.notes,
              tags: accessControl.tags
            };
          }
        },
        error: (error) => {
          console.error('Error loading access control:', error);
        }
      });
  }

  toggleProtocol(protocol: AccessControlProtocol): void {
    const index = this.formData.supportedProtocols.indexOf(protocol);
    if (index > -1) {
      this.formData.supportedProtocols.splice(index, 1);
    } else {
      this.formData.supportedProtocols.push(protocol);
    }
  }

  toggleAuthMethod(method: AuthenticationMethod): void {
    const index = this.formData.authenticationMethods.indexOf(method);
    if (index > -1) {
      this.formData.authenticationMethods.splice(index, 1);
    } else {
      this.formData.authenticationMethods.push(method);
    }
  }

  getProtocolLabel(protocol: AccessControlProtocol): string {
    return protocol;
  }

  getAuthMethodLabel(method: AuthenticationMethod): string {
    const labels: { [key: string]: string } = {
      'PIN': 'PIN',
      'CARD': 'Card',
      'BIOMETRIC': 'Biometric',
      'MOBILE_APP': 'Mobile App',
      'KEY_FOB': 'Key Fob',
      'MULTI_FACTOR': 'Multi-Factor'
    };
    return labels[method] || method;
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.isEditMode && this.accessControlId) {
      const updateRequest: UpdateAccessControlRequest = {
        name: this.formData.name,
        location: this.formData.location,
        gateId: this.formData.gateId,
        ipAddress: this.formData.ipAddress,
        port: this.formData.port,
        accessMode: this.formData.accessMode,
        unlockDuration: this.formData.unlockDuration,
        maxUnlockTime: this.formData.maxUnlockTime,
        notes: this.formData.notes
      };

      this.accessControlService.updateAccessControl(this.accessControlId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/access-control']);
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('Error updating access control:', error);
            alert('Error updating access control');
            this.isSubmitting = false;
          }
        });
    } else {
      this.accessControlService.createAccessControl(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/access-control']);
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('Error creating access control:', error);
            alert('Error creating access control');
            this.isSubmitting = false;
          }
        });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/hardware-integration/access-control']);
  }
}

