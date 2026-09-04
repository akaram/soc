import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HardwareService } from '../services/hardware.service';
import {
  HardwareType,
  DeviceStatus,
  DeviceConnectionType,
  CreateHardwareDeviceRequest,
  UpdateHardwareDeviceRequest
} from '../models/hardware.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-device-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="device-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit Hardware Device' : 'Add Hardware Device' }}
        </h1>
        <p>{{ isEditMode ? 'Update device configuration' : 'Add a new hardware device' }}</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Device Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.name" 
                  name="name" 
                  required
                  placeholder="e.g., RFID Reader - Main Gate"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Device Type *</label>
                <select 
                  [(ngModel)]="formData.type" 
                  name="type" 
                  required
                  class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="HardwareType.RFID_READER">RFID Reader</option>
                  <option [value]="HardwareType.SMART_CARD_READER">Smart Card Reader</option>
                  <option [value]="HardwareType.BIOMETRIC_DEVICE">Biometric Device</option>
                  <option [value]="HardwareType.ANPR_CAMERA">ANPR Camera</option>
                  <option [value]="HardwareType.SECURITY_CAMERA">Security Camera</option>
                  <option [value]="HardwareType.BOOM_BARRIER">Boom Barrier</option>
                  <option [value]="HardwareType.ACCESS_CONTROL">Access Control</option>
                  <option [value]="HardwareType.INTERCOM">Intercom</option>
                  <option [value]="HardwareType.ALARM_SYSTEM">Alarm System</option>
                  <option [value]="HardwareType.MOTION_SENSOR">Motion Sensor</option>
                  <option [value]="HardwareType.OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Model</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.model" 
                  name="model"
                  placeholder="Device model"
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
                  placeholder="e.g., Entry Lane, Lobby"
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
            </div>
          </div>

          <!-- Connection Settings -->
          <div class="form-section">
            <h3>Connection Settings</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Connection Type *</label>
                <select 
                  [(ngModel)]="formData.connectionType" 
                  name="connectionType" 
                  required
                  class="form-control">
                  <option value="">Select Connection</option>
                  <option [value]="DeviceConnectionType.WIRED">Wired</option>
                  <option [value]="DeviceConnectionType.WIRELESS">Wireless</option>
                  <option [value]="DeviceConnectionType.ETHERNET">Ethernet</option>
                  <option [value]="DeviceConnectionType.WIFI">WiFi</option>
                  <option [value]="DeviceConnectionType.USB">USB</option>
                  <option [value]="DeviceConnectionType.SERIAL">Serial</option>
                </select>
              </div>
              <div class="form-group" *ngIf="formData.connectionType === DeviceConnectionType.ETHERNET || formData.connectionType === DeviceConnectionType.WIFI">
                <label>IP Address</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.ipAddress" 
                  name="ipAddress"
                  placeholder="192.168.1.100"
                  class="form-control">
              </div>
              <div class="form-group" *ngIf="formData.connectionType === DeviceConnectionType.ETHERNET || formData.connectionType === DeviceConnectionType.WIFI">
                <label>Port</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.port" 
                  name="port"
                  placeholder="8080"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Additional Information -->
          <div class="form-section">
            <h3>Additional Information</h3>
            <div class="form-group">
              <label>Notes</label>
              <textarea 
                [(ngModel)]="formData.notes" 
                name="notes"
                rows="3"
                placeholder="Additional notes..."
                class="form-control"></textarea>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              <i class="material-icons">arrow_back</i>
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <i class="material-icons">save</i>
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Device' : 'Add Device') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .device-form-container {
      padding: 24px;
      max-width: 1000px;
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
      padding-bottom: 24px;
      border-bottom: 1px solid #f0f0f0;
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .form-section h3 {
      font-size: 18px;
      color: #2c3e50;
      margin: 0 0 20px 0;
      font-weight: 600;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .form-control {
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
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

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 12px 24px;
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

    .btn-secondary:hover {
      background: #e0e0e0;
    }
  `]
})
export class DeviceFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  deviceId: string | null = null;
  isSubmitting = false;
  formData: CreateHardwareDeviceRequest = {
    name: '',
    type: HardwareType.RFID_READER,
    connectionType: DeviceConnectionType.ETHERNET
  };

  HardwareType = HardwareType;
  DeviceConnectionType = DeviceConnectionType;

  private destroy$ = new Subject<void>();

  constructor(
    private hardwareService: HardwareService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.deviceId = params['id'];
        this.isEditMode = this.route.snapshot.url.some(segment => segment.path === 'edit');
        if (this.isEditMode) {
          this.loadDevice();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDevice(): void {
    if (!this.deviceId) return;

    this.hardwareService.getDeviceById(this.deviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (device) => {
          if (device) {
            this.formData = {
              name: device.name,
              type: device.type,
              model: device.model,
              manufacturer: device.manufacturer,
              serialNumber: device.serialNumber,
              gateId: device.gateId,
              location: device.location,
              buildingName: device.buildingName,
              floorNumber: device.floorNumber,
              connectionType: device.connectionType,
              ipAddress: device.ipAddress,
              macAddress: device.macAddress,
              port: device.port,
              configuration: device.configuration,
              settings: device.settings,
              notes: device.notes,
              tags: device.tags
            };
          }
        },
        error: (error) => {
          console.error('Error loading device:', error);
        }
      });
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.isEditMode && this.deviceId) {
      const updateRequest: UpdateHardwareDeviceRequest = {
        name: this.formData.name,
        location: this.formData.location,
        gateId: this.formData.gateId,
        ipAddress: this.formData.ipAddress,
        port: this.formData.port,
        notes: this.formData.notes
      };

      this.hardwareService.updateDevice(this.deviceId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration']);
            } else {
              alert(response.message || 'Failed to update device');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error updating device:', error);
            alert('An error occurred while updating the device');
          }
        });
    } else {
      this.hardwareService.createDevice(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration']);
            } else {
              alert(response.message || 'Failed to create device');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error creating device:', error);
            alert('An error occurred while creating the device');
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/hardware-integration']);
  }
}
















































