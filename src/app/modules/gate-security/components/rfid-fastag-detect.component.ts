import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RFIDFastagService } from '../services/rfid-fastag.service';
import {
  RFIDDetectionRequest,
  RFIDResponse
} from '../models/rfid-fastag.model';

@Component({
  selector: 'app-rfid-fastag-detect',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="rfid-detect-container">
      <div class="page-header">
        <h1><i class="material-icons">sensors</i> Test Tag Detection</h1>
        <p>Test RFID/FASTag detection and automatic gate opening via the live gate-hardware API</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Detection uses <strong>POST /gate-hardware/events</strong> and <strong>GET /vehicles/.../rfid/scan</strong> — no demo fallback.</span>
        </div>
      </div>

      <div class="detect-card">
        <div class="detector-preview">
          <div class="detector-placeholder">
            <i class="material-icons">nfc</i>
            <p>RFID/FASTag Reader</p>
            <p class="hint">Connect a USB reader or paste a tag; approved active vehicles resolve via the server.</p>
          </div>
        </div>

        <div class="detection-controls">
          <div class="form-group">
            <label>Tag ID</label>
            <input type="text" [(ngModel)]="detectionRequest.tagId" 
                   placeholder="Enter or scan tag ID" class="form-control">
          </div>
          <div class="form-group">
            <label>Select Gate</label>
            <select [(ngModel)]="detectionRequest.gateId" class="form-control">
              <option value="MAIN_GATE">Main Gate</option>
              <option value="SIDE_GATE">Side Gate</option>
              <option value="PARKING_GATE">Parking Gate</option>
              <option value="EMERGENCY_GATE">Emergency Gate</option>
            </select>
          </div>
          <div class="form-group">
            <label>Signal Strength (%)</label>
            <input type="number" [(ngModel)]="detectionRequest.signalStrength" 
                   placeholder="85" min="0" max="100" class="form-control">
          </div>
          <div class="form-group">
            <label>Read Distance (meters)</label>
            <input type="number" [(ngModel)]="detectionRequest.readDistance" 
                   placeholder="2.5" step="0.1" class="form-control">
          </div>
          <button class="btn-primary" (click)="startDetection()" [disabled]="isDetecting">
            <i class="material-icons">sensors</i>
            {{ isDetecting ? 'Detecting...' : 'Start Detection' }}
          </button>
        </div>

        <div class="detection-result" *ngIf="detectionResult">
          <h3>Detection Result</h3>
          <div class="result-card" [ngClass]="detectionResult.success ? 'success' : 'failed'">
            <div class="result-header">
              <i class="material-icons">{{ detectionResult.success ? 'check_circle' : 'error' }}</i>
              <span class="result-status">{{ detectionResult.success ? 'Tag Recognized' : 'Detection Failed' }}</span>
            </div>
            <div class="result-details" *ngIf="detectionResult.success">
              <div class="detail-item">
                <label>Tag ID:</label>
                <span class="value">{{ detectionResult.registration?.tagId }}</span>
              </div>
              <div class="detail-item">
                <label>Tag Type:</label>
                <span class="value">{{ detectionResult.registration?.tagType }}</span>
              </div>
              <div class="detail-item" *ngIf="detectionResult.registration">
                <label>Vehicle Number:</label>
                <span class="value">{{ detectionResult.registration.vehicleNumber }}</span>
              </div>
              <div class="detail-item" *ngIf="detectionResult.registration">
                <label>Owner:</label>
                <span class="value">{{ detectionResult.registration.ownerName }}</span>
              </div>
              <div class="detail-item" *ngIf="detectionResult.entry">
                <label>Signal Strength:</label>
                <span class="value">{{ detectionResult.entry.signalStrength?.toFixed(1) }}%</span>
              </div>
              <div class="detail-item" *ngIf="detectionResult.entry">
                <label>Read Distance:</label>
                <span class="value">{{ detectionResult.entry.readDistance?.toFixed(2) }}m</span>
              </div>
              <div class="detail-item" *ngIf="detectionResult.gateOpened">
                <label>Gate Status:</label>
                <span class="value badge-success">
                  <i class="material-icons">lock_open</i>
                  Gate Opened Automatically
                </span>
              </div>
              <div class="detail-item" *ngIf="detectionResult.entry">
                <label>Status:</label>
                <span class="value badge-success">Entry Allowed</span>
              </div>
            </div>
            <div class="result-details" *ngIf="!detectionResult.success">
              <p class="error-message">{{ detectionResult.message }}</p>
              <div class="detail-item" *ngIf="detectionResult.entry">
                <label>Detected Tag ID:</label>
                <span class="value">{{ detectionResult.entry.tagId }}</span>
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
    .rfid-detect-container {
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

    .api-banner {
      margin-top: 12px;
      padding: 10px 14px;
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 8px;
      color: #2e7d32;
      font-size: 13px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .api-banner .material-icons {
      font-size: 18px;
      flex-shrink: 0;
    }

    .detect-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .detector-preview {
      margin-bottom: 24px;
    }

    .detector-placeholder {
      background: #f5f5f5;
      border: 2px dashed #ddd;
      border-radius: 12px;
      padding: 60px;
      text-align: center;
    }

    .detector-placeholder .material-icons {
      font-size: 64px;
      color: #999;
      margin-bottom: 16px;
    }

    .detector-placeholder p {
      margin: 8px 0;
      color: #7f8c8d;
    }

    .detector-placeholder .hint {
      font-size: 13px;
      color: #999;
    }

    .detection-controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
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
      grid-column: 1 / -1;
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
      display: inline-flex;
      align-items: center;
      gap: 4px;
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
export class RFIDFastagDetectComponent {
  detectionRequest: RFIDDetectionRequest = {
    tagId: '',
    gateId: 'MAIN_GATE',
    signalStrength: 85,
    readDistance: 2.5
  };
  isDetecting = false;
  detectionResult: RFIDResponse | null = null;

  constructor(
    private rfidService: RFIDFastagService,
    private router: Router
  ) {}

  startDetection(): void {
    if (!this.detectionRequest.tagId) {
      alert('Please enter a tag ID');
      return;
    }

    this.isDetecting = true;
    this.detectionResult = null;

    this.rfidService
      .detectTag(this.detectionRequest)
      .pipe(finalize(() => {
        this.isDetecting = false;
      }))
      .subscribe({
        next: (response: RFIDResponse) => {
          this.detectionResult = response;
        },
        error: (error: unknown) => {
          console.error('Error detecting tag:', error);
          this.detectionResult = {
            success: false,
            message: 'An error occurred during detection',
            matchFound: false
          };
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/rfid-fastag']);
  }
}
