import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ANPRService } from '../services/anpr.service';
import { ANPRDetectionRequest } from '../models/anpr.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-anpr-detect',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="anpr-detect-container">
      <div class="page-header">
        <h1><i class="material-icons">camera_alt</i> Test ANPR Detection</h1>
        <p>Look up a registered vehicle plate against your society database (GET /vehicles API)</p>
      </div>

      <div class="detect-card">
        <div class="detection-controls detection-controls-top">
          <div class="form-group">
            <label>Vehicle Plate Number *</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="detectionRequest.plateNumber"
              placeholder="e.g., MH-12-AB-1234"
              name="plateNumber" />
          </div>
          <div class="form-group">
            <label>Gate</label>
            <select [(ngModel)]="detectionRequest.gateId" class="form-control" name="gateId">
              <option value="MAIN_GATE">Main Gate</option>
              <option value="SIDE_GATE">Side Gate</option>
              <option value="PARKING_GATE">Parking Gate</option>
              <option value="EMERGENCY_GATE">Emergency Gate</option>
            </select>
          </div>
        </div>

        <div class="camera-preview">
          <div class="camera-placeholder">
            <i class="material-icons">camera_alt</i>
            <p>Camera OCR integration</p>
            <p class="hint">Live plate recognition will use gate camera APIs. For now, enter the plate number above.</p>
          </div>
        </div>

        <div class="detection-controls">
          <button class="btn-primary" (click)="startDetection()" [disabled]="isDetecting || !detectionRequest.plateNumber?.trim()">
            <i class="material-icons">camera_alt</i>
            {{ isDetecting ? 'Detecting...' : 'Start Detection' }}
          </button>
        </div>

        <div class="detection-result" *ngIf="detectionResult">
          <h3>Detection Result</h3>
          <div class="result-card" [ngClass]="detectionResult.success ? 'success' : 'failed'">
            <div class="result-header">
              <i class="material-icons">{{ detectionResult.success ? 'check_circle' : 'error' }}</i>
              <span class="result-status">{{ detectionResult.success ? 'Vehicle Recognized' : 'Recognition Failed' }}</span>
            </div>
            <div class="result-details" *ngIf="detectionResult.success">
              <div class="detail-item">
                <label>Vehicle Number:</label>
                <span class="value">{{ detectionResult.detectedNumber }}</span>
              </div>
              <div class="detail-item">
                <label>Confidence:</label>
                <span class="value">{{ detectionResult.confidence?.toFixed(1) }}%</span>
              </div>
              <div class="detail-item" *ngIf="detectionResult.registration">
                <label>Owner:</label>
                <span class="value">{{ detectionResult.registration.ownerName }}</span>
              </div>
              <div class="detail-item" *ngIf="detectionResult.registration">
                <label>Status:</label>
                <span class="value badge-success">Entry Allowed</span>
              </div>
            </div>
            <div class="result-details" *ngIf="!detectionResult.success">
              <p class="error-message">{{ detectionResult.message }}</p>
              <div class="detail-item" *ngIf="detectionResult.detectedNumber">
                <label>Detected Number:</label>
                <span class="value">{{ detectionResult.detectedNumber }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn-secondary" (click)="goBack()">
            <i class="material-icons">arrow_back</i>
            Back to List
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .anpr-detect-container {
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

    .detect-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .camera-preview {
      margin-bottom: 24px;
    }

    .camera-placeholder {
      background: #f5f5f5;
      border: 2px dashed #ddd;
      border-radius: 12px;
      padding: 60px;
      text-align: center;
    }

    .camera-placeholder .material-icons {
      font-size: 64px;
      color: #999;
      margin-bottom: 16px;
    }

    .camera-placeholder p {
      margin: 8px 0;
      color: #7f8c8d;
    }

    .camera-placeholder .hint {
      font-size: 13px;
      color: #999;
    }

    .detection-controls {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .detection-controls-top {
      margin-bottom: 16px;
    }

    .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
    }

    .form-control {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
    }

    .btn-primary {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #667eea;
      color: white;
      transition: all 0.2s;
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

    .detection-result {
      margin-bottom: 24px;
    }

    .detection-result h3 {
      font-size: 18px;
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .result-card {
      border-radius: 12px;
      padding: 20px;
      border: 2px solid;
    }

    .result-card.success {
      background: #d4edda;
      border-color: #28a745;
    }

    .result-card.failed {
      background: #f8d7da;
      border-color: #dc3545;
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 18px;
      font-weight: 600;
    }

    .result-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-item label {
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-item .value {
      font-weight: 500;
    }

    .badge-success {
      background: #28a745;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .error-message {
      color: #721c24;
      font-weight: 600;
      margin: 0;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
    }

    .btn-secondary {
      padding: 12px 24px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f5f5f5;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }
  `]
})
export class ANPRDetectComponent {
  detectionRequest: ANPRDetectionRequest = {
    plateNumber: '',
    numberPlateImage: '',
    gateId: 'MAIN_GATE'
  };
  isDetecting = false;
  detectionResult: any = null;

  constructor(
    private anprService: ANPRService,
    private router: Router,
    private toast: ToastService
  ) {}

  startDetection(): void {
    const plate = this.detectionRequest.plateNumber?.trim();
    if (!plate) {
      this.toast.warning('Enter a vehicle plate number to verify.');
      return;
    }

    this.isDetecting = true;
    this.detectionResult = null;

    // Verify plate against society vehicles via /vehicles API
    this.anprService.detectVehicle(this.detectionRequest).subscribe({
      next: (response) => {
        this.detectionResult = response;
        this.isDetecting = false;
        if (response.success) {
          this.toast.success(response.message || 'Vehicle recognized — entry allowed.');
        } else {
          this.toast.error(response.message || 'Vehicle not recognized.');
        }
      },
      error: (error) => {
        console.error('Error detecting vehicle:', error);
        this.detectionResult = {
          success: false,
          message: 'An error occurred during detection'
        };
        this.isDetecting = false;
        this.toast.error('An error occurred during ANPR detection');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/anpr']);
  }
}

