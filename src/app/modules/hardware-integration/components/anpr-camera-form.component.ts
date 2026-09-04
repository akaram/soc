import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ANPRCameraService } from '../services/anpr-camera.service';
import {
  ANPRCameraType,
  ANPRProtocol,
  ANPRCameraStatus,
  RecognitionMode,
  CreateANPRCameraRequest,
  UpdateANPRCameraRequest
} from '../models/anpr-camera.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-anpr-camera-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="anpr-camera-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit ANPR Camera' : 'Add ANPR Camera' }}
        </h1>
        <p>{{ isEditMode ? 'Update ANPR camera configuration' : 'Add a new Automatic Number Plate Recognition camera' }}</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Camera Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.name" 
                  name="name" 
                  required
                  placeholder="e.g., ANPR Camera - Main Gate Entry"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Camera Type *</label>
                <select 
                  [(ngModel)]="formData.type" 
                  name="type" 
                  required
                  class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="ANPRCameraType.FIXED">Fixed</option>
                  <option [value]="ANPRCameraType.MOBILE">Mobile</option>
                  <option [value]="ANPRCameraType.TRAFFIC">Traffic</option>
                  <option [value]="ANPRCameraType.PARKING">Parking</option>
                  <option [value]="ANPRCameraType.ENTRANCE">Entrance</option>
                  <option [value]="ANPRCameraType.MULTI_LANE">Multi-Lane</option>
                </select>
              </div>
              <div class="form-group">
                <label>Model</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.model" 
                  name="model"
                  placeholder="Camera model"
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
                  <option value="POE">PoE (Power over Ethernet)</option>
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
              <div class="form-group full-width">
                <label>Stream URL</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.streamUrl" 
                  name="streamUrl"
                  placeholder="rtsp://192.168.1.100:554/stream1 or http://192.168.1.100:8080/stream"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Recognition Configuration -->
          <div class="form-section">
            <h3>Recognition Configuration</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Recognition Mode *</label>
                <select 
                  [(ngModel)]="formData.recognitionMode" 
                  name="recognitionMode" 
                  required
                  class="form-control">
                  <option value="">Select Mode</option>
                  <option [value]="RecognitionMode.ENTRANCE_ONLY">Entrance Only</option>
                  <option [value]="RecognitionMode.EXIT_ONLY">Exit Only</option>
                  <option [value]="RecognitionMode.BOTH">Both</option>
                  <option [value]="RecognitionMode.MONITORING">Monitoring</option>
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
                <label>Capture Resolution</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.captureResolution" 
                  name="captureResolution"
                  placeholder="1920x1080"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>FPS (Frames Per Second)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.fps" 
                  name="fps"
                  placeholder="30"
                  min="1"
                  max="60"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Confidence Threshold (%)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.confidenceThreshold" 
                  name="confidenceThreshold"
                  placeholder="85"
                  min="0"
                  max="100"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Features -->
          <div class="form-section">
            <h3>Features</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.nightVision" 
                    name="nightVision">
                  Night Vision
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.infrared" 
                    name="infrared">
                  Infrared
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.motionDetection" 
                    name="motionDetection">
                  Motion Detection
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
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Camera' : 'Add Camera') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .anpr-camera-form-container {
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
export class ANPRCameraFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  isSubmitting = false;
  cameraId: string | null = null;

  formData: CreateANPRCameraRequest = {
    name: '',
    type: ANPRCameraType.FIXED,
    connectionType: 'ETHERNET',
    supportedProtocols: [],
    recognitionMode: RecognitionMode.BOTH,
    nightVision: false,
    infrared: false,
    motionDetection: false
  };

  ANPRCameraType = ANPRCameraType;
  ANPRProtocol = ANPRProtocol;
  RecognitionMode = RecognitionMode;

  availableProtocols = [
    ANPRProtocol.HTTP,
    ANPRProtocol.HTTPS,
    ANPRProtocol.RTSP,
    ANPRProtocol.ONVIF
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private anprCameraService: ANPRCameraService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.cameraId = params['id'];
        this.isEditMode = true;
        if (this.cameraId) {
          this.loadCamera(this.cameraId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCamera(id: string): void {
    this.anprCameraService.getCameraById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (camera) => {
          if (camera) {
            this.formData = {
              name: camera.name,
              type: camera.type,
              model: camera.model,
              manufacturer: camera.manufacturer,
              serialNumber: camera.serialNumber,
              gateId: camera.gateId,
              location: camera.location,
              buildingName: camera.buildingName,
              floorNumber: camera.floorNumber,
              laneNumber: camera.laneNumber,
              direction: camera.direction,
              connectionType: camera.connectionType,
              ipAddress: camera.ipAddress,
              macAddress: camera.macAddress,
              port: camera.port,
              streamUrl: camera.streamUrl,
              supportedProtocols: camera.supportedProtocols,
              recognitionMode: camera.recognitionMode,
              captureResolution: camera.captureResolution,
              fps: camera.fps,
              detectionZone: camera.detectionZone,
              supportedCountries: camera.supportedCountries,
              minPlateWidth: camera.minPlateWidth,
              maxPlateWidth: camera.maxPlateWidth,
              confidenceThreshold: camera.confidenceThreshold,
              nightVision: camera.nightVision,
              infrared: camera.infrared,
              motionDetection: camera.motionDetection,
              settings: camera.settings,
              notes: camera.notes,
              tags: camera.tags
            };
          }
        },
        error: (error) => {
          console.error('Error loading camera:', error);
        }
      });
  }

  toggleProtocol(protocol: ANPRProtocol): void {
    const index = this.formData.supportedProtocols.indexOf(protocol);
    if (index > -1) {
      this.formData.supportedProtocols.splice(index, 1);
    } else {
      this.formData.supportedProtocols.push(protocol);
    }
  }

  getProtocolLabel(protocol: ANPRProtocol): string {
    return protocol;
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.isEditMode && this.cameraId) {
      const updateRequest: UpdateANPRCameraRequest = {
        name: this.formData.name,
        location: this.formData.location,
        gateId: this.formData.gateId,
        ipAddress: this.formData.ipAddress,
        port: this.formData.port,
        streamUrl: this.formData.streamUrl,
        recognitionMode: this.formData.recognitionMode,
        confidenceThreshold: this.formData.confidenceThreshold,
        nightVision: this.formData.nightVision,
        infrared: this.formData.infrared,
        motionDetection: this.formData.motionDetection,
        notes: this.formData.notes
      };

      this.anprCameraService.updateCamera(this.cameraId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/anpr-cameras']);
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('Error updating camera:', error);
            alert('Error updating camera');
            this.isSubmitting = false;
          }
        });
    } else {
      this.anprCameraService.createCamera(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/anpr-cameras']);
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('Error creating camera:', error);
            alert('Error creating camera');
            this.isSubmitting = false;
          }
        });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/hardware-integration/anpr-cameras']);
  }
}

