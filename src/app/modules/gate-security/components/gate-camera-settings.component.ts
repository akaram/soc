import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { GateCameraService } from '../services/gate-camera.service';
import { GateCamera, CameraStatus } from '../models/gate-camera.model';

@Component({
  selector: 'app-gate-camera-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="settings-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <h1><i class="material-icons">settings</i> Camera Settings</h1>
      </div>

      <div class="settings-card" *ngIf="camera">
        <div class="settings-header">
          <div class="camera-info">
            <h2>{{ camera.cameraName }}</h2>
            <p>{{ camera.gateName }} • {{ camera.cameraType }}</p>
          </div>
          <div class="status-badge" [ngClass]="getStatusClass(camera.status)">
            {{ camera.status }}
          </div>
        </div>

        <form (ngSubmit)="onSubmit()">
          <div class="settings-section">
            <h3>Basic Settings</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Camera Name</label>
                <input type="text" [(ngModel)]="camera.cameraName" name="cameraName" class="form-control">
              </div>
              <div class="form-group">
                <label>Resolution</label>
                <select [(ngModel)]="camera.resolution" name="resolution" class="form-control">
                  <option value="1280x720">1280x720 (HD)</option>
                  <option value="1920x1080">1920x1080 (Full HD)</option>
                  <option value="2560x1440">2560x1440 (2K)</option>
                  <option value="3840x2160">3840x2160 (4K)</option>
                </select>
              </div>
              <div class="form-group">
                <label>FPS (Frames Per Second)</label>
                <input type="number" [(ngModel)]="camera.fps" name="fps" min="15" max="60" class="form-control">
              </div>
              <div class="form-group">
                <label>Location</label>
                <input type="text" [(ngModel)]="camera.location" name="location" class="form-control">
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>Network Settings</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>IP Address</label>
                <input type="text" [(ngModel)]="camera.ipAddress" name="ipAddress" class="form-control">
              </div>
              <div class="form-group">
                <label>Port</label>
                <input type="number" [(ngModel)]="camera.port" name="port" class="form-control">
              </div>
              <div class="form-group">
                <label>Stream URL</label>
                <input type="text" [(ngModel)]="camera.streamUrl" name="streamUrl" class="form-control">
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>Features</h3>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="camera.recordingEnabled" name="recordingEnabled">
                <span>Enable Recording</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="camera.motionDetectionEnabled" name="motionDetectionEnabled">
                <span>Enable Motion Detection</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="camera.nightVisionEnabled" name="nightVisionEnabled">
                <span>Enable Night Vision</span>
              </label>
            </div>
          </div>

          <div class="settings-section">
            <h3>Storage Settings</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Storage Limit (GB)</label>
                <input type="number" [(ngModel)]="camera.storageLimit" name="storageLimit" min="10" max="1000" class="form-control">
              </div>
              <div class="form-group">
                <label>Current Storage Used</label>
                <div class="storage-info">
                  <span class="storage-value">{{ camera.storageUsed.toFixed(2) }} GB</span>
                  <span class="storage-percent">({{ (camera.storageUsed / camera.storageLimit * 100).toFixed(1) }}%)</span>
                </div>
                <div class="storage-bar">
                  <div class="storage-fill" [style.width.%]="(camera.storageUsed / camera.storageLimit * 100)"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancel
            </button>
            <button type="button" class="btn-warning" (click)="restartCamera()">
              <i class="material-icons">refresh</i>
              Restart Camera
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSaving">
              <i class="material-icons">save</i>
              {{ isSaving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </form>
      </div>

      <div class="loading-state" *ngIf="!camera">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading camera settings...</p>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-back {
      padding: 8px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: #f5f5f5;
      color: #2c3e50;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .settings-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f0f0f0;
    }

    .camera-info h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .camera-info p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .status-badge {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.online {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.offline {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.recording {
      background: #fff3cd;
      color: #856404;
    }

    .settings-section {
      margin-bottom: 32px;
    }

    .settings-section h3 {
      font-size: 18px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
    }

    .form-control {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 500;
    }

    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .storage-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .storage-value {
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
    }

    .storage-percent {
      font-size: 14px;
      color: #7f8c8d;
    }

    .storage-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .storage-fill {
      height: 100%;
      background: linear-gradient(90deg, #28a745, #20c997);
      transition: width 0.3s;
    }

    .settings-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .btn-primary,
    .btn-secondary,
    .btn-warning {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
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
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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

    .btn-warning {
      background: #ffc107;
      color: #2c3e50;
    }

    .btn-warning:hover {
      background: #e0a800;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .loading-state p {
      margin: 0;
      color: #7f8c8d;
    }
  `]
})
export class GateCameraSettingsComponent implements OnInit {
  camera: GateCamera | null = null;
  isSaving = false;

  CameraStatus = CameraStatus;

  constructor(
    private cameraService: GateCameraService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const cameraId = this.route.snapshot.paramMap.get('id');
    if (cameraId) {
      this.loadCamera(cameraId);
    }
  }

  loadCamera(cameraId: string): void {
    this.cameraService.getCameraById(cameraId).subscribe({
      next: (camera) => {
        this.camera = camera ? { ...camera } : null;
      },
      error: (error) => {
        console.error('Error loading camera:', error);
        alert('Camera not found');
        this.goBack();
      }
    });
  }

  getStatusClass(status: CameraStatus): string {
    return status.toLowerCase();
  }

  onSubmit(): void {
    if (!this.camera) return;

    this.isSaving = true;
    // In production, this would save to backend
    setTimeout(() => {
      alert('Camera settings saved successfully!');
      this.isSaving = false;
      this.goBack();
    }, 1000);
  }

  restartCamera(): void {
    if (this.camera && confirm(`Restart camera ${this.camera.cameraName}?`)) {
      this.cameraService.updateCameraStatus(this.camera.id, CameraStatus.OFFLINE).subscribe({
        next: () => {
          setTimeout(() => {
            this.cameraService.updateCameraStatus(this.camera!.id, CameraStatus.ONLINE).subscribe({
              next: () => {
                alert('Camera restarted successfully!');
                if (this.camera) {
                  this.camera.status = CameraStatus.ONLINE;
                }
              }
            });
          }, 2000);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/camera-feed']);
  }
}

