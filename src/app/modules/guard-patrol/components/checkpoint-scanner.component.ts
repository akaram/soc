import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CheckpointScanService } from '../services/checkpoint-scan.service';
import { PatrollingRouteService } from '../services/patrolling-route.service';
import { RouteStatus } from '../models/patrolling-route.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  ScanType,
  ScanStatus,
  ScanCheckpointRequest,
  CheckpointScan,
  ActivePatrol
} from '../models/checkpoint-scan.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { formatScannedDataLabel, parseQrPayload } from '../../../shared/utils/qr-payload.parser';

@Component({
  selector: 'app-checkpoint-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="checkpoint-scanner-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">qr_code_scanner</i>
          Checkpoint Scanner
        </h1>
        <p>Scan QR codes or NFC tags at patrolling checkpoints</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Live scans via <strong>/checkpoint-scans</strong> — matched against <strong>/patrol-routes</strong> checkpoints.</span>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Active Patrols -->
      <div class="active-patrols-section" *ngIf="activePatrols.length > 0">
        <h2>
          <i class="material-icons">route</i>
          Active Patrols
        </h2>
        <div class="patrols-grid">
          <div *ngFor="let patrol of activePatrols" class="patrol-card">
            <div class="patrol-header">
              <h3>{{ patrol.routeName }}</h3>
              <span class="patrol-status active">In Progress</span>
            </div>
            <div class="patrol-progress">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="patrol.progress"></div>
              </div>
              <p>{{ patrol.completedCheckpoints }}/{{ patrol.totalCheckpoints }} checkpoints</p>
            </div>
            <div class="patrol-checkpoints">
              <div 
                *ngFor="let cp of patrol.checkpoints" 
                class="checkpoint-status-item"
                [ngClass]="'status-' + cp.status.toLowerCase()">
                <span class="checkpoint-order">{{ cp.order }}</span>
                <span class="checkpoint-name">{{ cp.checkpointName }}</span>
                <i class="material-icons status-icon">
                  {{ cp.status === 'COMPLETED' ? 'check_circle' : 
                     cp.status === 'LATE' ? 'schedule' : 
                     cp.status === 'MISSED' ? 'cancel' : 'radio_button_unchecked' }}
                </i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scanner Section -->
      <div class="scanner-section">
        <div class="scanner-card">
          <div class="scanner-header">
            <h2>
              <i class="material-icons">qr_code_scanner</i>
              Scan Checkpoint
            </h2>
            <div class="scan-type-selector">
              <button 
                class="scan-type-btn"
                [class.active]="selectedScanType === ScanType.QR_CODE"
                (click)="selectScanType(ScanType.QR_CODE)">
                <i class="material-icons">qr_code</i>
                QR Code
              </button>
              <button 
                class="scan-type-btn"
                [class.active]="selectedScanType === ScanType.NFC_TAG"
                (click)="selectScanType(ScanType.NFC_TAG)">
                <i class="material-icons">nfc</i>
                NFC Tag
              </button>
            </div>
          </div>

          <!-- Scanner Viewport -->
          <div class="scanner-viewport" [class.scanning]="isScanning">
            <div class="scanner-overlay">
              <div class="scanner-corners">
                <div class="corner top-left"></div>
                <div class="corner top-right"></div>
                <div class="corner bottom-left"></div>
                <div class="corner bottom-right"></div>
              </div>
              <div class="scanner-line" *ngIf="isScanning"></div>
            </div>
            <div class="scanner-placeholder" *ngIf="!isScanning">
              <i class="material-icons">qr_code_scanner</i>
              <p>{{ selectedScanType === ScanType.QR_CODE ? 'Point camera at QR code' : 'Tap NFC tag on device' }}</p>
            </div>
          </div>

          <!-- Manual Entry Option -->
          <div class="manual-entry-section">
            <button class="btn-manual-entry" (click)="showManualEntry = !showManualEntry">
              <i class="material-icons">keyboard</i>
              Manual Entry
            </button>
            <div class="manual-entry-form" *ngIf="showManualEntry">
              <input 
                type="text" 
                [(ngModel)]="manualScanData"
                placeholder="Enter checkpoint code"
                class="form-control">
              <button class="btn-submit-manual" (click)="submitManualScan()">
                Submit
              </button>
            </div>
          </div>

          <!-- Scan Actions -->
          <div class="scan-actions">
            <button 
              class="btn-scan"
              [class.scanning]="isScanning"
              (click)="toggleScanning()"
              [disabled]="!selectedScanType">
              <i class="material-icons">{{ isScanning ? 'stop' : 'qr_code_scanner' }}</i>
              <span>{{ isScanning ? 'Stop Scanning' : 'Start Scanning' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Scannable checkpoints from configured routes -->
      <div class="route-checkpoints-section" *ngIf="scannableCheckpoints.length > 0">
        <h2>
          <i class="material-icons">place</i>
          Checkpoints on Active Routes
        </h2>
        <p class="section-hint">Tap a code below to record a scan (POC — use camera/NFC in production).</p>
        <div class="checkpoint-codes-grid">
          <button
            type="button"
            class="checkpoint-code-btn"
            *ngFor="let item of scannableCheckpoints"
            (click)="scanCheckpointCode(item)">
            <span class="code">{{ item.code }}</span>
            <span class="name">{{ item.checkpointName }}</span>
            <span class="route">{{ item.routeName }}</span>
          </button>
        </div>
      </div>

      <!-- Recent Scans -->
      <div class="recent-scans-section">
        <div class="section-header">
          <h2>
            <i class="material-icons">history</i>
            Recent Scans
          </h2>
          <button class="btn-refresh" (click)="loadRecentScans()">
            <i class="material-icons">refresh</i>
            Refresh
          </button>
        </div>
        <div class="scans-list" *ngIf="recentScans.length > 0">
          <div *ngFor="let scan of recentScans" class="scan-item" [ngClass]="'status-' + scan.status.toLowerCase()">
            <div class="scan-icon" [ngClass]="scan.scanType.toLowerCase()">
              <i class="material-icons">
                {{ scan.scanType === ScanType.QR_CODE ? 'qr_code' : 'nfc' }}
              </i>
            </div>
            <div class="scan-details">
              <div class="scan-header">
                <h4>{{ scan.checkpointName }}</h4>
                <span class="scan-status-badge" [ngClass]="'status-' + scan.status.toLowerCase()">
                  {{ getStatusLabel(scan.status) }}
                </span>
              </div>
              <div class="scan-info">
                <span class="scan-route">{{ scan.routeName }}</span>
                <span class="scan-data">{{ formatScannedData(scan.scannedData) }}</span>
              </div>
              <div class="scan-meta">
                <span class="scan-time">
                  <i class="material-icons">schedule</i>
                  {{ formatDateTime(scan.scanTimestamp) }}
                </span>
                <span class="scan-guard" *ngIf="scan.guardName">
                  <i class="material-icons">person</i>
                  {{ scan.guardName }}
                </span>
              </div>
            </div>
            <div class="scan-actions-item">
              <button class="btn-view" (click)="viewScanDetails(scan)">
                <i class="material-icons">visibility</i>
              </button>
            </div>
          </div>
        </div>
        <div class="empty-scans" *ngIf="recentScans.length === 0">
          <i class="material-icons">qr_code_scanner</i>
          <p>No scans yet. Start scanning checkpoints to see them here.</p>
        </div>
      </div>

      <!-- Scan Result Modal -->
      <div class="scan-result-modal" *ngIf="scanResult" (click)="closeScanResult()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="result-header" [ngClass]="scanResult.isValid ? 'success' : 'error'">
            <i class="material-icons">
              {{ scanResult.isValid ? 'check_circle' : 'error' }}
            </i>
            <h3>{{ scanResult.isValid ? 'Scan Successful' : 'Scan Failed' }}</h3>
          </div>
          <div class="result-body">
            <div class="result-item">
              <span class="label">Checkpoint:</span>
              <span class="value">{{ scanResult.checkpointName }}</span>
            </div>
            <div class="result-item">
              <span class="label">Route:</span>
              <span class="value">{{ scanResult.routeName }}</span>
            </div>
            <div class="result-item">
              <span class="label">Scan Type:</span>
              <span class="value">{{ getScanTypeLabel(scanResult.scanType) }}</span>
            </div>
            <ng-container *ngIf="parsedScanResult as parsed">
              <div class="result-item" *ngFor="let field of parsed.fields">
                <span class="label">{{ field.label }}</span>
                <span class="value">{{ field.value }}</span>
              </div>
            </ng-container>
            <div class="result-item" *ngIf="!parsedScanResult">
              <span class="label">Scanned data</span>
              <span class="value">{{ formatScannedData(scanResult.scannedData) }}</span>
            </div>
            <div class="result-item">
              <span class="label">Time:</span>
              <span class="value">{{ formatDateTime(scanResult.scanTimestamp) }}</span>
            </div>
            <div class="result-item" *ngIf="scanResult.validationMessage">
              <span class="label">Message:</span>
              <span class="value">{{ scanResult.validationMessage }}</span>
            </div>
          </div>
          <div class="result-actions">
            <button class="btn-primary" (click)="closeScanResult()">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkpoint-scanner-container {
      padding: 24px;
      max-width: 1400px;
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
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(39, 174, 96, 0.1);
      border-radius: 8px;
      color: #27ae60;
      font-size: 13px;
    }

    .load-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .route-checkpoints-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .route-checkpoints-section h2 {
      font-size: 20px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-hint {
      margin: 0 0 16px 0;
      color: #7f8c8d;
      font-size: 13px;
    }

    .checkpoint-codes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }

    .checkpoint-code-btn {
      text-align: left;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: #f8f9fa;
      cursor: pointer;
      transition: all 0.2s;
    }

    .checkpoint-code-btn:hover {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.08);
    }

    .checkpoint-code-btn .code {
      display: block;
      font-weight: 700;
      color: #667eea;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .checkpoint-code-btn .name {
      display: block;
      font-size: 13px;
      color: #2c3e50;
    }

    .checkpoint-code-btn .route {
      display: block;
      font-size: 11px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .active-patrols-section {
      margin-bottom: 32px;
    }

    .active-patrols-section h2 {
      font-size: 20px;
      margin: 0 0 16px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .patrols-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .patrol-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .patrol-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .patrol-header h3 {
      margin: 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .patrol-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .patrol-status.active {
      background: #d4edda;
      color: #155724;
    }

    .patrol-progress {
      margin-bottom: 16px;
    }

    .progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s;
    }

    .patrol-progress p {
      margin: 0;
      font-size: 13px;
      color: #7f8c8d;
    }

    .patrol-checkpoints {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkpoint-status-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkpoint-order {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }

    .checkpoint-name {
      flex: 1;
      font-size: 14px;
      color: #2c3e50;
    }

    .status-icon {
      font-size: 20px;
      color: #7f8c8d;
    }

    .checkpoint-status-item.status-completed .status-icon {
      color: #28a745;
    }

    .checkpoint-status-item.status-late .status-icon {
      color: #ffc107;
    }

    .checkpoint-status-item.status-missed .status-icon {
      color: #dc3545;
    }

    .scanner-section {
      margin-bottom: 32px;
    }

    .scanner-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .scanner-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .scanner-header h2 {
      font-size: 20px;
      margin: 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .scan-type-selector {
      display: flex;
      gap: 12px;
    }

    .scan-type-btn {
      padding: 10px 20px;
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

    .scan-type-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .scanner-viewport {
      width: 100%;
      aspect-ratio: 1;
      max-width: 500px;
      margin: 0 auto 24px;
      background: #1a1a1a;
      border-radius: 16px;
      position: relative;
      overflow: hidden;
    }

    .scanner-viewport.scanning {
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.5);
      animation: pulse-border 2s infinite;
    }

    @keyframes pulse-border {
      0%, 100% { box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.5); }
      50% { box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.3); }
    }

    .scanner-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scanner-corners {
      width: 70%;
      aspect-ratio: 1;
      position: relative;
    }

    .corner {
      position: absolute;
      width: 40px;
      height: 40px;
      border: 4px solid #667eea;
    }

    .corner.top-left {
      top: 0;
      left: 0;
      border-right: none;
      border-bottom: none;
    }

    .corner.top-right {
      top: 0;
      right: 0;
      border-left: none;
      border-bottom: none;
    }

    .corner.bottom-left {
      bottom: 0;
      left: 0;
      border-right: none;
      border-top: none;
    }

    .corner.bottom-right {
      bottom: 0;
      right: 0;
      border-left: none;
      border-top: none;
    }

    .scanner-line {
      position: absolute;
      width: 70%;
      height: 3px;
      background: linear-gradient(90deg, transparent, #667eea, transparent);
      animation: scan-line 2s linear infinite;
    }

    @keyframes scan-line {
      0% { top: 15%; }
      50% { top: 85%; }
      100% { top: 15%; }
    }

    .scanner-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.6);
      text-align: center;
    }

    .scanner-placeholder .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.4;
    }

    .scanner-placeholder p {
      margin: 0;
      font-size: 16px;
    }

    .manual-entry-section {
      margin-bottom: 24px;
    }

    .btn-manual-entry {
      width: 100%;
      padding: 12px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .manual-entry-form {
      margin-top: 12px;
      display: flex;
      gap: 8px;
    }

    .form-control {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .btn-submit-manual {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .scan-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn-scan {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: all 0.2s;
    }

    .btn-scan:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-scan.scanning {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      animation: pulse-btn 1.5s infinite;
    }

    @keyframes pulse-btn {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    .btn-simulate {
      display: none;
    }

    .recent-scans-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 20px;
      margin: 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-refresh {
      padding: 8px 16px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .scans-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .scan-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 12px;
      border-left: 4px solid #e0e0e0;
    }

    .scan-item.status-valid {
      border-left-color: #28a745;
    }

    .scan-item.status-invalid {
      border-left-color: #dc3545;
    }

    .scan-item.status-late {
      border-left-color: #ffc107;
    }

    .scan-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }

    .scan-icon.qr_code {
      background: #667eea;
    }

    .scan-icon.nfc_tag {
      background: #10ac84;
    }

    .scan-details {
      flex: 1;
    }

    .scan-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .scan-header h4 {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .scan-status-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .scan-status-badge.status-valid {
      background: #d4edda;
      color: #155724;
    }

    .scan-status-badge.status-invalid {
      background: #f8d7da;
      color: #721c24;
    }

    .scan-status-badge.status-late {
      background: #fff3cd;
      color: #856404;
    }

    .scan-info {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .scan-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #999;
    }

    .scan-meta .material-icons {
      font-size: 16px;
    }

    .btn-view {
      background: none;
      border: none;
      color: #667eea;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .empty-scans {
      text-align: center;
      padding: 40px;
      color: #7f8c8d;
    }

    .empty-scans .material-icons {
      font-size: 48px;
      margin-bottom: 12px;
      color: #ddd;
    }

    .scan-result-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 20px;
      max-width: 500px;
      width: 100%;
      overflow: hidden;
      animation: modal-appear 0.3s ease;
    }

    @keyframes modal-appear {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .result-header {
      padding: 24px;
      color: white;
      text-align: center;
    }

    .result-header.success {
      background: #28a745;
    }

    .result-header.error {
      background: #dc3545;
    }

    .result-header .material-icons {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .result-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .result-body {
      padding: 24px;
    }

    .result-item {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .result-item .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
    }

    .result-item .value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
    }

    .result-actions {
      padding: 16px 24px 24px;
    }

    .btn-primary {
      width: 100%;
      padding: 14px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class CheckpointScannerComponent implements OnInit, OnDestroy {
  selectedScanType: ScanType | null = null;
  isScanning = false;
  showManualEntry = false;
  manualScanData = '';
  scanResult: CheckpointScan | null = null;
  recentScans: CheckpointScan[] = [];
  activePatrols: ActivePatrol[] = [];
  scannableCheckpoints: Array<{
    code: string;
    checkpointName: string;
    routeName: string;
    scanType: ScanType;
  }> = [];
  loadError = '';

  ScanType = ScanType;
  ScanStatus = ScanStatus;

  private destroy$ = new Subject<void>();

  constructor(
    private scanService: CheckpointScanService,
    private routeService: PatrollingRouteService,
    private session: SessionContextService
  ) {}

  ngOnInit(): void {
    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }
    this.loadRecentScans();
    this.loadActivePatrols();
    this.loadScannableCheckpoints();
    this.selectedScanType = ScanType.QR_CODE;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectScanType(type: ScanType): void {
    this.selectedScanType = type;
    this.isScanning = false;
  }

  toggleScanning(): void {
    if (!this.selectedScanType) return;

    this.isScanning = !this.isScanning;

    if (this.isScanning) {
      // In a real implementation, this would start the camera/NFC scanner
      console.log('Starting scanner for:', this.selectedScanType);
    } else {
      console.log('Stopping scanner');
    }
  }

  simulateScan(): void {
    // Removed demo codes — use scannable checkpoints from live routes instead.
    if (this.scannableCheckpoints.length === 0) {
      alert('No checkpoints on active routes. Create routes in Define Patrolling Routes first.');
      return;
    }
    const next = this.scannableCheckpoints[0];
    this.selectedScanType = next.scanType;
    this.processScan(next.code);
  }

  scanCheckpointCode(item: { code: string; scanType: ScanType }): void {
    this.selectedScanType = item.scanType;
    this.processScan(item.code);
  }

  loadScannableCheckpoints(): void {
    this.routeService.getAllRoutes({ status: RouteStatus.ACTIVE })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: routes => {
          const items: typeof this.scannableCheckpoints = [];
          for (const route of routes) {
            for (const cp of route.checkpoints) {
              const code = cp.qrCode || cp.nfcTagId || cp.checkpointCode || cp.id;
              if (!code) continue;
              const scanType = cp.nfcTagId && !cp.qrCode ? ScanType.NFC_TAG : ScanType.QR_CODE;
              items.push({
                code,
                checkpointName: cp.name,
                routeName: route.name,
                scanType
              });
            }
          }
          this.scannableCheckpoints = items;
        },
        error: err => {
          console.error('Error loading route checkpoints:', err);
          if (!this.loadError) {
            this.loadError = 'Failed to load patrol routes for checkpoint matching.';
          }
        }
      });
  }

  submitManualScan(): void {
    if (!this.manualScanData.trim()) return;
    this.processScan(this.manualScanData.trim());
    this.manualScanData = '';
    this.showManualEntry = false;
  }

  processScan(scannedData: string): void {
    if (!this.selectedScanType) return;

    this.isScanning = false;

    const request: ScanCheckpointRequest = {
      checkpointId: '',
      scanType: this.selectedScanType,
      scannedData: scannedData,
      guardId: this.session.getCurrentUserId()
    };

    this.scanService.scanCheckpoint(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.scan) {
            this.scanResult = response.scan;
            this.loadRecentScans();
            this.loadActivePatrols();
            this.loadScannableCheckpoints();
          } else {
            // Show error
            alert(response.message || 'Scan failed');
          }
        },
        error: (error) => {
          console.error('Error scanning checkpoint:', error);
          alert('Error scanning checkpoint');
        }
      });
  }

  closeScanResult(): void {
    this.scanResult = null;
  }

  loadRecentScans(): void {
    this.scanService.getAllScans({})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (scans) => {
          this.recentScans = scans.slice(0, 10);
          this.loadError = '';
        },
        error: (error) => {
          console.error('Error loading scans:', error);
          this.loadError = 'Failed to load scans from the API. Ensure the backend is running.';
        }
      });
  }

  loadActivePatrols(): void {
    this.scanService.getActivePatrols()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (patrols) => {
          this.activePatrols = patrols;
        },
        error: (error) => {
          console.error('Error loading active patrols:', error);
        }
      });
  }

  viewScanDetails(scan: CheckpointScan): void {
    this.scanResult = scan;
  }

  /** Parsed QR JSON for readable modal rows (visitor pass, etc.). */
  get parsedScanResult() {
    if (!this.scanResult?.scannedData) {
      return null;
    }
    const raw = this.scanResult.scannedData.trim();
    if (!raw.startsWith('{')) {
      return null;
    }
    return parseQrPayload(raw);
  }

  formatScannedData(raw: string): string {
    return formatScannedDataLabel(raw);
  }

  getScanTypeLabel(type: ScanType): string {
    return type === ScanType.QR_CODE ? 'QR Code' : 'NFC Tag';
  }

  getStatusLabel(status: ScanStatus): string {
    const labels: { [key: string]: string } = {
      'VALID': 'Valid',
      'INVALID': 'Invalid',
      'LATE': 'Late',
      'MISSED': 'Missed',
      'DUPLICATE': 'Duplicate',
      'PENDING': 'Pending'
    };
    return labels[status] || status;
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private resolveSocietyId(): string {
    return this.session.getSocietyId();
  }
}

