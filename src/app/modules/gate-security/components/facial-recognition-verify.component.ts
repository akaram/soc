import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FacialRecognitionService } from '../services/facial-recognition.service';
import { VerifyFaceRequest } from '../models/facial-recognition.model';

@Component({
  selector: 'app-facial-recognition-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="facial-verify-container">
      <div class="page-header">
        <h1><i class="material-icons">camera_alt</i> Test Face Recognition</h1>
        <p>Test the facial recognition system for touchless entry</p>
      </div>

      <div class="poc-notice">
        <i class="material-icons">info</i>
        <span>
          <strong>POC mode:</strong> verification matches the <em>exact same image file</em> used at registration
          (not live face AI). Text, blur, or random photos should fail. Re-register faces after backend update.
        </span>
      </div>

      <div class="verify-card">
        <div class="camera-preview">
          <div class="camera-placeholder">
            <i class="material-icons">face</i>
            <p>Camera Preview</p>
            <p class="hint">In production, this would show live camera feed</p>
            <div class="image-upload-section" *ngIf="!capturedImage">
              <input type="file" accept="image/*" (change)="onImageSelected($event)" class="file-input">
              <button class="btn-upload" (click)="triggerFileInput()">
                <i class="material-icons">photo_camera</i>
                Upload Face Image
              </button>
            </div>
            <div class="captured-image" *ngIf="capturedImage">
              <img [src]="capturedImage" alt="Captured face">
              <button class="btn-remove" (click)="removeImage()">
                <i class="material-icons">close</i>
              </button>
            </div>
          </div>
        </div>

        <div class="verification-controls">
          <div class="form-group">
            <label>Select Gate</label>
            <select [(ngModel)]="verifyRequest.gateId" class="form-control">
              <option value="MAIN_GATE">Main Gate</option>
              <option value="SIDE_GATE">Side Gate</option>
              <option value="PARKING_GATE">Parking Gate</option>
              <option value="EMERGENCY_GATE">Emergency Gate</option>
            </select>
          </div>
          <div class="form-group">
            <label>Temperature (Optional)</label>
            <input type="number" [(ngModel)]="verifyRequest.temperature" 
                   placeholder="36.5" step="0.1" class="form-control">
          </div>
          <button class="btn-primary" (click)="startVerification()" [disabled]="isVerifying || !capturedImage">
            <i class="material-icons">face</i>
            {{ isVerifying ? 'Verifying...' : 'Verify Face' }}
          </button>
        </div>

        <div class="verification-result" *ngIf="verificationResult">
          <h3>Verification Result</h3>
          <div class="result-card" [ngClass]="verificationResult.success ? 'success' : 'failed'">
            <div class="result-header">
              <i class="material-icons">{{ verificationResult.success ? 'check_circle' : 'error' }}</i>
              <span class="result-status">{{ verificationResult.success ? 'Face Recognized' : 'Recognition Failed' }}</span>
            </div>
            <div class="result-details" *ngIf="verificationResult.success">
              <div class="detail-item">
                <label>Person Name:</label>
                <span class="value">{{ verificationResult.profile?.personName }}</span>
              </div>
              <div class="detail-item">
                <label>Confidence:</label>
                <span class="value">{{ verificationResult.confidence?.toFixed(1) }}%</span>
              </div>
              <div class="detail-item" *ngIf="verificationResult.profile">
                <label>Face ID:</label>
                <span class="value">{{ verificationResult.profile.faceId }}</span>
              </div>
              <div class="detail-item" *ngIf="verificationResult.profile">
                <label>Access Level:</label>
                <span class="value">{{ verificationResult.profile.accessLevel }}</span>
              </div>
              <div class="detail-item" *ngIf="verificationResult.entry">
                <label>Status:</label>
                <span class="value badge-success">Entry Allowed</span>
              </div>
            </div>
            <div class="result-details" *ngIf="!verificationResult.success">
              <p class="error-message">{{ verificationResult.message }}</p>
              <div class="detail-item" *ngIf="verificationResult.confidence">
                <label>Confidence:</label>
                <span class="value">{{ verificationResult.confidence.toFixed(1) }}%</span>
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
    .facial-verify-container {
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

    .poc-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      color: #9a3412;
      font-size: 13px;
      line-height: 1.5;
    }

    .poc-notice .material-icons {
      font-size: 20px;
      flex-shrink: 0;
    }

    .verify-card {
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
      position: relative;
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

    .image-upload-section {
      margin-top: 20px;
    }

    .file-input {
      display: none;
    }

    .btn-upload {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
    }

    .btn-upload:hover {
      background: #5568d3;
    }

    .captured-image {
      position: relative;
      display: inline-block;
      margin-top: 20px;
    }

    .captured-image img {
      max-width: 300px;
      max-height: 300px;
      border-radius: 8px;
      border: 2px solid #667eea;
    }

    .btn-remove {
      position: absolute;
      top: -10px;
      right: -10px;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .verification-controls {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .form-group {
      flex: 1;
      min-width: 200px;
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

    .verification-result {
      margin-bottom: 24px;
    }

    .verification-result h3 {
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
export class FacialRecognitionVerifyComponent {
  verifyRequest: VerifyFaceRequest = {
    faceImage: '',
    gateId: 'MAIN_GATE'
  };
  capturedImage: string | null = null;
  isVerifying = false;
  verificationResult: any = null;

  constructor(
    private facialService: FacialRecognitionService,
    private router: Router
  ) {}

  triggerFileInput(): void {
    const fileInput = document.querySelector('.file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    void this.facialService.fileToDataUrl(file).then(dataUrl => {
      this.capturedImage = dataUrl;
      this.verifyRequest.faceImage = dataUrl;
    }).catch(err => {
      console.error(err);
      alert('Could not read image file');
    });
  }

  removeImage(): void {
    this.capturedImage = null;
    this.verifyRequest.faceImage = '';
    this.verificationResult = null;
  }

  startVerification(): void {
    if (!this.verifyRequest.faceImage) {
      alert('Please capture or upload a face image first');
      return;
    }

    this.isVerifying = true;
    this.verificationResult = null;

    this.facialService.verifyFace(this.verifyRequest).subscribe({
      next: (response) => {
        this.verificationResult = response;
        this.isVerifying = false;
      },
      error: (error) => {
        console.error('Error verifying face:', error);
        this.verificationResult = {
          success: false,
          message: 'An error occurred during verification'
        };
        this.isVerifying = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/facial-recognition']);
  }
}

