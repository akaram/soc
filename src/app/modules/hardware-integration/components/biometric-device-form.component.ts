import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BiometricDeviceService } from '../services/biometric-device.service';
import {
  BiometricType,
  BiometricProtocol,
  BiometricStatus,
  CreateBiometricDeviceRequest,
  UpdateBiometricDeviceRequest
} from '../models/biometric-device.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-biometric-device-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="biometric-device-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit Biometric Device' : 'Add Biometric Device' }}
        </h1>
        <p>{{ isEditMode ? 'Update biometric device configuration' : 'Add a new fingerprint, face recognition, or other biometric device' }}</p>
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
                  placeholder="e.g., Fingerprint Scanner - Main Gate"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Biometric Type *</label>
                <select 
                  [(ngModel)]="formData.type" 
                  name="type" 
                  required
                  (change)="onTypeChange()"
                  class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="BiometricType.FINGERPRINT">Fingerprint</option>
                  <option [value]="BiometricType.FACE_RECOGNITION">Face Recognition</option>
                  <option [value]="BiometricType.IRIS">Iris</option>
                  <option [value]="BiometricType.VOICE">Voice</option>
                  <option [value]="BiometricType.PALM">Palm</option>
                  <option [value]="BiometricType.MULTI_MODAL">Multi-Modal</option>
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
              <div class="form-group">
                <label>Floor Number</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.floorNumber" 
                  name="floorNumber"
                  placeholder="Floor number"
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
                  <option value="WIRED">Wired</option>
                  <option value="WIRELESS">Wireless</option>
                  <option value="ETHERNET">Ethernet</option>
                  <option value="WIFI">WiFi</option>
                  <option value="USB">USB</option>
                  <option value="BLUETOOTH">Bluetooth</option>
                </select>
              </div>
              <div class="form-group" *ngIf="formData.connectionType === 'ETHERNET' || formData.connectionType === 'WIFI'">
                <label>IP Address</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.ipAddress" 
                  name="ipAddress"
                  placeholder="192.168.1.100"
                  class="form-control">
              </div>
              <div class="form-group" *ngIf="formData.connectionType === 'ETHERNET' || formData.connectionType === 'WIFI'">
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

          <!-- Protocol & Biometric Settings -->
          <div class="form-section">
            <h3>Protocol & Biometric Settings</h3>
            <div class="form-group">
              <label>Supported Protocols *</label>
              <div class="checkbox-group">
                <label *ngFor="let protocol of availableProtocols" class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [value]="protocol"
                    [checked]="formData.supportedProtocols.includes(protocol)"
                    (change)="toggleProtocol(protocol)">
                  {{ getProtocolLabel(protocol) }}
                </label>
              </div>
            </div>
            <div class="form-group" *ngIf="formData.type === BiometricType.MULTI_MODAL">
              <label>Supported Biometric Types</label>
              <div class="checkbox-group">
                <label *ngFor="let type of availableTypes" class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [value]="type"
                    [checked]="formData.supportedTypes?.includes(type)"
                    (change)="toggleSupportedType(type)">
                  {{ getTypeLabel(type) }}
                </label>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>Enrollment Capacity</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.enrollmentCapacity" 
                  name="enrollmentCapacity"
                  placeholder="10000"
                  class="form-control">
              </div>
            </div>
            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  [(ngModel)]="formData.livenessDetection" 
                  name="livenessDetection">
                Enable Liveness Detection
              </label>
            </div>
            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  [(ngModel)]="formData.antiSpoofing" 
                  name="antiSpoofing">
                Enable Anti-Spoofing
              </label>
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
    .biometric-device-form-container {
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

    .form-group label input[type="checkbox"] {
      margin-right: 8px;
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

    .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: normal;
      cursor: pointer;
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
export class BiometricDeviceFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  deviceId: string | null = null;
  isSubmitting = false;
  formData: CreateBiometricDeviceRequest = {
    name: '',
    type: BiometricType.FINGERPRINT,
    connectionType: 'USB',
    supportedProtocols: [BiometricProtocol.ISO19794_2],
    livenessDetection: true,
    antiSpoofing: true
  };

  BiometricType = BiometricType;
  BiometricProtocol = BiometricProtocol;
  availableProtocols = Object.values(BiometricProtocol);
  availableTypes = Object.values(BiometricType);

  private destroy$ = new Subject<void>();

  constructor(
    private biometricService: BiometricDeviceService,
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

    this.biometricService.getDeviceById(this.deviceId)
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
              supportedProtocols: device.supportedProtocols,
              supportedTypes: device.supportedTypes,
              enrollmentCapacity: device.enrollmentCapacity,
              livenessDetection: device.livenessDetection,
              antiSpoofing: device.antiSpoofing,
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

  onTypeChange(): void {
    // Update default protocols based on type
    if (this.formData.type === BiometricType.FINGERPRINT) {
      this.formData.supportedProtocols = [BiometricProtocol.ISO19794_2, BiometricProtocol.ANSI378];
    } else if (this.formData.type === BiometricType.FACE_RECOGNITION) {
      this.formData.supportedProtocols = [BiometricProtocol.ISO19794_5];
    } else if (this.formData.type === BiometricType.MULTI_MODAL) {
      this.formData.supportedProtocols = [BiometricProtocol.ISO19794_2, BiometricProtocol.ISO19794_5];
      if (!this.formData.supportedTypes) {
        this.formData.supportedTypes = [BiometricType.FINGERPRINT, BiometricType.FACE_RECOGNITION];
      }
    }
  }

  toggleProtocol(protocol: BiometricProtocol): void {
    const index = this.formData.supportedProtocols.indexOf(protocol);
    if (index > -1) {
      this.formData.supportedProtocols.splice(index, 1);
    } else {
      this.formData.supportedProtocols.push(protocol);
    }
  }

  toggleSupportedType(type: BiometricType): void {
    if (!this.formData.supportedTypes) {
      this.formData.supportedTypes = [];
    }
    const index = this.formData.supportedTypes.indexOf(type);
    if (index > -1) {
      this.formData.supportedTypes.splice(index, 1);
    } else {
      this.formData.supportedTypes.push(type);
    }
  }

  getProtocolLabel(protocol: BiometricProtocol): string {
    return protocol.replace(/_/g, ' ');
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

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.isEditMode && this.deviceId) {
      const updateRequest: UpdateBiometricDeviceRequest = {
        name: this.formData.name,
        location: this.formData.location,
        gateId: this.formData.gateId,
        ipAddress: this.formData.ipAddress,
        port: this.formData.port,
        livenessDetection: this.formData.livenessDetection,
        antiSpoofing: this.formData.antiSpoofing,
        notes: this.formData.notes
      };

      this.biometricService.updateDevice(this.deviceId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/biometric-devices']);
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
      this.biometricService.createDevice(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/biometric-devices']);
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
    this.router.navigate(['/admin/hardware-integration/biometric-devices']);
  }
}
















































