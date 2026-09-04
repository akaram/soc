import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { MobileAuthService, UserRole } from '../../services/mobile-auth.service';
import { CheckpointScanService } from '../../../modules/guard-patrol/services/checkpoint-scan.service';
import { ScanType } from '../../../modules/guard-patrol/models/checkpoint-scan.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import { GuardPackageService } from '../../services/guard-package.service';
import { VisitorManagementService } from '../../../modules/visitor-management/services/visitor-management.service';
import {
  parseQrPayload,
  qrScanSummary,
  ParsedQrPayload
} from '../../../shared/utils/qr-payload.parser';
import { normalizePatrolScanToken } from '../../../modules/guard-patrol/utils/patrol-qr.util';

interface ScanResult {
  data: string;
  type: 'visitor' | 'patrol' | 'asset' | 'package' | 'unknown';
  timestamp: Date;
  /** Human-readable breakdown of JSON / structured QR payloads */
  parsed: ParsedQrPayload;
}

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="qr-scanner-page">
      <!-- Header -->
      <div class="scanner-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>QR Code Scanner</h2>
        <div class="header-actions">
          <button class="btn-flash" type="button" (click)="switchCamera()" [disabled]="!isScanning" title="Switch camera">
            <i class="material-icons">cameraswitch</i>
          </button>
          <button class="btn-flash" type="button" (click)="toggleFlash()" [class.active]="flashOn">
            <i class="material-icons">{{ flashOn ? 'flash_on' : 'flash_off' }}</i>
          </button>
        </div>
      </div>

      <!-- Scanner View -->
      <div class="scanner-container">
        <!-- Camera viewport (would use actual camera library) -->
        <div class="camera-viewport" [class.scanning]="isScanning">
          <!-- Always in DOM so html5-qrcode can attach video reliably -->
          <div id="qr-reader" class="qr-reader" [class.active]="isScanning"></div>
          <div class="scanner-overlay" *ngIf="isScanning">
            <div class="scanner-corners">
              <div class="corner top-left"></div>
              <div class="corner top-right"></div>
              <div class="corner bottom-left"></div>
              <div class="corner bottom-right"></div>
            </div>
            <div class="scanner-line"></div>
          </div>
          
          <div class="demo-message" *ngIf="!isScanning && !cameraActive">
            <i class="material-icons">qr_code_scanner</i>
            <p>Point camera at QR code</p>
            <small>Select type below, then tap Start Scanning</small>
          </div>
        </div>

        <!-- Instructions -->
        <div class="scanner-instructions">
          <p>{{ getScanInstruction() }}</p>
          <p class="patrol-expected" *ngIf="selectedType === 'patrol' && patrolExpectedCode">
            Expected code: <strong>{{ patrolExpectedCode }}</strong>
          </p>
          <p class="scan-hint" *ngIf="isScanning">Point the <strong>rear camera</strong> at the printed QR (6–12 inches away).</p>
          <p class="scan-error" *ngIf="scanError">{{ scanError }}</p>
          <button
            class="btn-record-checkpoint-inline"
            type="button"
            *ngIf="selectedType === 'patrol' && route.snapshot.queryParamMap.get('checkpointId')"
            (click)="recordCheckpointFromContext()"
            [disabled]="lookupBusy">
            <i class="material-icons">check_circle</i>
            Record checkpoint without scanning
          </button>
        </div>
      </div>

      <!-- Quick Scan Options -->
      <div class="scan-options">
        <h3>What would you like to scan?</h3>
        <div class="options-grid">
          <button *ngFor="let option of scanOptions" 
                  class="option-btn"
                  [class.active]="selectedType === option.type"
                  (click)="selectScanType(option.type)"
                  [disabled]="!option.available">
            <i class="material-icons">{{ option.icon }}</i>
            <span>{{ option.label }}</span>
          </button>
        </div>
      </div>

      <!-- Action Button -->
      <div class="scanner-actions">
        <button class="btn-scan" 
                [class.scanning]="isScanning"
                (click)="toggleScanning()"
                [disabled]="!selectedType">
          <i class="material-icons">{{ isScanning ? 'stop' : 'qr_code_scanner' }}</i>
          <span>{{ isScanning ? 'Stop Camera' : 'Start Camera' }}</span>
        </button>

        <button
          class="btn-record-checkpoint"
          type="button"
          *ngIf="selectedType === 'patrol' && route.snapshot.queryParamMap.get('checkpointId')"
          (click)="recordCheckpointFromContext()"
          [disabled]="lookupBusy">
          <i class="material-icons">check_circle</i>
          <span>Record this checkpoint (no QR needed)</span>
        </button>
        
        <div class="manual-paste" *ngIf="selectedType && !isScanning">
          <button type="button" class="btn-paste-toggle" (click)="showManualPaste = !showManualPaste">
            <i class="material-icons">content_paste</i>
            Paste scanned QR text
          </button>
          <button type="button" class="btn-paste-toggle" (click)="fileInput.click()">
            <i class="material-icons">photo_library</i>
            Upload QR image
          </button>
          <input
            #fileInput
            type="file"
            accept="image/*"
            capture="environment"
            class="file-input-hidden"
            (change)="onQrImageSelected($event)" />
          <div class="paste-form" *ngIf="showManualPaste">
            <textarea
              [(ngModel)]="manualPasteData"
              rows="3"
              placeholder="Paste QR JSON or code here"></textarea>
            <button type="button" class="btn-paste-submit" (click)="submitManualPaste()">View details</button>
          </div>
        </div>
      </div>

      <!-- Recent Scans -->
      <div class="recent-scans" *ngIf="recentScans.length > 0">
        <h3>Recent Scans</h3>
        <div class="scans-list">
          <div *ngFor="let scan of recentScans" class="scan-item">
            <div class="scan-icon" [style.background]="getScanColor(scan.type)">
              <i class="material-icons">{{ getScanIcon(scan.type) }}</i>
            </div>
            <div class="scan-details">
              <span class="scan-type">{{ scan.parsed?.title || (scan.type | titlecase) }}</span>
              <span class="scan-data">{{ scanSummary(scan) }}</span>
              <span class="scan-time">{{ formatTime(scan.timestamp) }}</span>
            </div>
            <button class="btn-view" (click)="viewScanDetails(scan)">
              <i class="material-icons">arrow_forward</i>
            </button>
          </div>
        </div>
      </div>

      <!-- Result Modal -->
      <div class="scan-result-modal" *ngIf="scanResult" (click)="closeScanResult()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="result-header" [style.background]="getScanColor(scanResult.type)">
            <i class="material-icons">{{ getScanIcon(scanResult.type) }}</i>
            <h3>{{ scanResult.parsed.title }}</h3>
            <p class="result-subtitle" *ngIf="scanResult.parsed.subtitle">{{ scanResult.parsed.subtitle }}</p>
          </div>
          <div class="result-body">
            <span class="status-chip" *ngIf="scanResult.parsed.status">{{ scanResult.parsed.status }}</span>
            <div class="result-grid">
              <div class="result-row" *ngFor="let field of scanResult.parsed.fields">
                <span class="label">{{ field.label }}</span>
                <span class="value">{{ field.value }}</span>
              </div>
            </div>
            <div class="result-timestamp">
              <span class="label">Scanned at</span>
              <span class="value">{{ formatFullTime(scanResult.timestamp) }}</span>
            </div>
            <p class="lookup-msg" [class.error]="lookupMessageError" *ngIf="lookupMessage">{{ lookupMessage }}</p>
          </div>
          <div class="result-actions">
            <button class="btn-primary" (click)="processScan(scanResult)" [disabled]="lookupBusy">
              {{ processButtonLabel(scanResult) }}
            </button>
            <button class="btn-secondary" (click)="closeScanResult()">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .qr-scanner-page {
      min-height: 100vh;
      background: #000;
      padding-bottom: 80px;
    }

    .scanner-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: rgba(0,0,0,0.8);
      color: white;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .scanner-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      flex: 1;
      text-align: center;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .btn-back, .btn-flash {
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .btn-flash.active {
      background: rgba(255,215,0,0.3);
      color: #ffd700;
    }

    .scanner-container {
      position: relative;
      padding: 16px;
    }

    .camera-viewport {
      width: 100%;
      aspect-ratio: 1;
      background: #1a1a1a;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .camera-viewport.scanning {
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.5);
      animation: pulse-border 2s infinite;
    }

    .qr-reader {
      width: 100%;
      height: 100%;
      min-height: 280px;
      position: absolute;
      inset: 0;
    }

    .qr-reader:not(.active) {
      visibility: hidden;
      pointer-events: none;
    }

    /* html5-qrcode injects video/canvas — ensure they fill the viewport */
    .qr-reader ::ng-deep video {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover;
      border-radius: 16px;
    }

    .qr-reader ::ng-deep #qr-shaded-region {
      border-color: rgba(102, 126, 234, 0.9) !important;
    }

    .scan-hint {
      color: rgba(255, 255, 255, 0.75);
      font-size: 13px;
      margin-top: 6px;
    }

    .patrol-expected {
      color: #a5f3fc;
      font-size: 13px;
      margin-top: 6px;
    }

    .patrol-expected strong {
      font-family: monospace;
      letter-spacing: 0.3px;
    }

    .btn-record-checkpoint-inline {
      margin-top: 12px;
      width: 100%;
      padding: 12px 14px;
      border: none;
      border-radius: 10px;
      background: #10b981;
      color: white;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }

    .btn-record-checkpoint-inline:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .file-input-hidden {
      display: none;
    }

    .scan-error {
      color: #f87171;
      font-size: 13px;
      margin-top: 8px;
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
      pointer-events: none;
      z-index: 2;
    }

    .demo-message {
      position: relative;
      z-index: 3;
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

    .demo-message {
      text-align: center;
      color: rgba(255,255,255,0.6);
    }

    .demo-message .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.4;
    }

    .demo-message p {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .demo-message small {
      font-size: 13px;
      opacity: 0.7;
    }

    .scanner-instructions {
      margin-top: 20px;
      text-align: center;
    }

    .scanner-instructions p {
      color: white;
      font-size: 14px;
      margin: 0;
      opacity: 0.9;
    }

    .scan-options {
      padding: 24px 16px;
      background: white;
      border-radius: 24px 24px 0 0;
      margin-top: 24px;
    }

    .scan-options h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .option-btn {
      background: white;
      border: 2px solid #e0e0e0;
      padding: 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .option-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .option-btn.active {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.1);
    }

    .option-btn .material-icons {
      font-size: 32px;
      color: #667eea;
    }

    .option-btn span {
      font-size: 13px;
      font-weight: 500;
      color: #2c3e50;
    }

    .scanner-actions {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: white;
    }

    .btn-scan {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
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

    .btn-record-checkpoint {
      width: 100%;
      margin-top: 10px;
      padding: 12px 16px;
      border: none;
      border-radius: 12px;
      background: #10b981;
      color: white;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }
    .btn-record-checkpoint:disabled { opacity: 0.6; cursor: not-allowed; }

    @keyframes pulse-btn {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    .btn-scan .material-icons {
      font-size: 24px;
    }

    .btn-simulate {
      width: 100%;
      padding: 14px;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .manual-paste {
      margin-top: 4px;
    }

    .btn-paste-toggle {
      width: 100%;
      padding: 12px;
      background: #f8fafc;
      color: #475569;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .paste-form {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .paste-form textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
    }

    .btn-paste-submit {
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .recent-scans {
      padding: 16px;
      background: white;
    }

    .recent-scans h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .scans-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .scan-item {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .scan-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .scan-icon .material-icons {
      font-size: 24px;
    }

    .scan-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .scan-type {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .scan-data {
      font-size: 13px;
      color: #666;
    }

    .scan-time {
      font-size: 11px;
      color: #999;
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
      max-width: 400px;
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

    .result-header .material-icons {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .result-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .result-subtitle {
      margin: 6px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .result-body {
      padding: 24px;
    }

    .status-chip {
      display: inline-block;
      margin-bottom: 16px;
      padding: 4px 12px;
      border-radius: 20px;
      background: #eef2ff;
      color: #4338ca;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .result-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .result-row, .result-timestamp {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .result-body .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .result-body .value {
      font-size: 16px;
      color: #2c3e50;
      font-weight: 500;
      word-break: break-word;
    }

    .lookup-msg {
      margin: 12px 0 0;
      font-size: 13px;
      color: #64748b;
    }

    .lookup-msg.error {
      color: #dc2626;
      font-weight: 500;
    }

    .result-actions {
      padding: 16px 24px 24px;
      display: flex;
      gap: 12px;
    }

    .btn-primary {
      flex: 1;
      padding: 14px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-secondary {
      flex: 1;
      padding: 14px;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class QrScannerComponent implements OnInit, AfterViewInit, OnDestroy {
  isScanning = false;
  flashOn = false;
  cameraActive = false;
  selectedType: string | null = null;
  scanResult: ScanResult | null = null;
  recentScans: ScanResult[] = [];
  lookupMessage = '';
  lookupMessageError = false;
  lookupBusy = false;
  showManualPaste = false;
  manualPasteData = '';
  scanError = '';
  /** Prevent duplicate decode callbacks while stopping the camera */
  private decodeInProgress = false;

  /** When true, camera opens automatically (from guard dashboard / patrol screen). */
  private autoStart = false;
  /** When true, patrol scans are submitted immediately after decode. */
  private autoRecordPatrol = false;
  /** html5-qrcode instance for live camera decoding */
  private html5QrCode: Html5Qrcode | null = null;
  private readonly readerId = 'qr-reader';
  /** Cached device list for manual camera switching */
  private availableCameraIds: string[] = [];
  private activeCameraIndex = 0;
  /** Checkpoint code hint when opened from patrol screen */
  patrolExpectedCode = '';
  
  scanOptions = [
    { type: 'visitor', label: 'Visitor', icon: 'person', available: true },
    { type: 'patrol', label: 'Patrol', icon: 'route', available: true },
    { type: 'asset', label: 'Asset', icon: 'inventory_2', available: true },
    { type: 'package', label: 'Package', icon: 'local_shipping', available: true }
  ];

  constructor(
    private authService: MobileAuthService,
    private router: Router,
    readonly route: ActivatedRoute,
    private checkpointScanService: CheckpointScanService,
    private session: SessionContextService,
    private packageService: GuardPackageService,
    private visitorService: VisitorManagementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Filter scan options based on user role
    const user = this.authService.getCurrentUser();
    if (user) {
      this.filterScanOptions(user.role);
    }

    // Pre-select scan type when opened from guard dashboard (e.g. patrol checkpoint).
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type && this.scanOptions.some(o => o.type === type)) {
      this.selectedType = type;
    }
    const checkpointCode = this.route.snapshot.queryParamMap.get('checkpointCode');
    if (checkpointCode) {
      this.manualPasteData = checkpointCode;
      this.patrolExpectedCode = checkpointCode;
    }
    this.autoStart = this.route.snapshot.queryParamMap.get('autoStart') === 'true';
    this.autoRecordPatrol =
      this.selectedType === 'patrol' &&
      (!!this.route.snapshot.queryParamMap.get('checkpointId') || this.autoStart);
    
    // Load recent scans from storage
    const stored = localStorage.getItem('recentScans');
    if (stored) {
      this.recentScans = JSON.parse(stored).map((s: ScanResult & { timestamp: string }) =>
        this.buildScanResult(s.data, s.type, new Date(s.timestamp))
      );
    }
  }

  ngAfterViewInit(): void {
    if (this.autoStart && this.selectedType) {
      setTimeout(() => void this.startScanning(), 350);
    }
  }

  ngOnDestroy() {
    void this.stopScanning();
  }

  selectScanType(type: string) {
    this.selectedType = type;
    this.scanError = '';
  }

  async toggleScanning() {
    if (this.isScanning) {
      await this.stopScanning();
    } else {
      await this.startScanning();
    }
  }

  /** Start rear-camera QR decoding via html5-qrcode. */
  async startScanning(): Promise<void> {
    if (!this.selectedType) {
      return;
    }
    this.scanError = '';
    this.decodeInProgress = false;
    this.isScanning = true;
    this.cameraActive = true;
    this.cdr.detectChanges();

    try {
      await this.waitForQrReaderElement();
      await this.stopScanning();
      this.isScanning = true;
      this.cameraActive = true;

      await this.primeRearCameraPermission();
      const attempts = await this.buildCameraAttempts();

      const onDecode = (decodedText: string) => {
        if (this.decodeInProgress || !decodedText?.trim()) {
          return;
        }
        this.decodeInProgress = true;
        void this.stopScanning().then(() => {
          this.handleRawScan(decodedText.trim());
          this.decodeInProgress = false;
        });
      };
      const onMiss = () => { /* normal when no QR in frame */ };

      let lastError: unknown = null;
      for (const attempt of attempts) {
        try {
          this.html5QrCode = new Html5Qrcode(this.readerId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            useBarCodeDetectorIfSupported: attempt.useNativeDetector,
            verbose: false
          });

          await this.html5QrCode.start(
            attempt.camera,
            {
              fps: 15,
              // Scan most of the frame — small qrbox often fails on mobile.
              qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const w = Math.max(Math.floor(viewfinderWidth * 0.92), 180);
                const h = Math.max(Math.floor(viewfinderHeight * 0.92), 180);
                return { width: w, height: h };
              },
              disableFlip: false,
              aspectRatio: 1,
              videoConstraints: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            },
            onDecode,
            onMiss
          );
          return;
        } catch (err) {
          lastError = err;
          try {
            this.html5QrCode?.clear();
          } catch {
            /* ignore */
          }
          this.html5QrCode = null;
        }
      }

      throw lastError ?? new Error('All camera scan strategies failed');
    } catch (err) {
      console.error('QR camera start failed', err);
      this.scanError =
        'Could not open rear camera. Tap the switch-camera icon, use Upload QR image, or Record checkpoint below.';
      await this.stopScanning();
    }
  }

  /** Switch between available cameras (rear vs front). */
  async switchCamera(): Promise<void> {
    if (!this.isScanning) {
      return;
    }
    try {
      if (!this.availableCameraIds.length) {
        const cameras = await Html5Qrcode.getCameras();
        this.availableCameraIds = cameras.map(c => c.id);
      }
      if (this.availableCameraIds.length < 2) {
        this.scanError = 'Only one camera is available on this device.';
        return;
      }
      this.activeCameraIndex = (this.activeCameraIndex + 1) % this.availableCameraIds.length;
      const cameraId = this.availableCameraIds[this.activeCameraIndex];
      await this.restartScanningWithCamera(cameraId);
    } catch (err) {
      console.error('Camera switch failed', err);
      this.scanError = 'Could not switch camera.';
    }
  }

  /** Restart scanner on a specific device id (used after switch). */
  private async restartScanningWithCamera(cameraId: string): Promise<void> {
    const onDecode = (decodedText: string) => {
      if (this.decodeInProgress || !decodedText?.trim()) {
        return;
      }
      this.decodeInProgress = true;
      void this.stopScanning().then(() => {
        this.handleRawScan(decodedText.trim());
        this.decodeInProgress = false;
      });
    };
    const onMiss = () => { /* no QR in frame */ };

    await this.stopScanning();
    this.isScanning = true;
    this.cameraActive = true;
    this.cdr.detectChanges();
    await this.waitForQrReaderElement();

    this.html5QrCode = new Html5Qrcode(this.readerId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    });
    await this.html5QrCode.start(
      cameraId,
      {
        fps: 15,
        qrbox: (w: number, h: number) => ({
          width: Math.max(Math.floor(w * 0.92), 180),
          height: Math.max(Math.floor(h * 0.92), 180)
        }),
        disableFlip: false
      },
      onDecode,
      onMiss
    );
  }

  /** Ask for camera access so device labels populate and rear lens is preferred. */
  private async primeRearCameraPermission(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      /* Continue — scanner will try other strategies */
    }
  }

  /** Build ordered camera strategies — rear/environment first, never default to selfie. */
  private async buildCameraAttempts(): Promise<
    Array<{ useNativeDetector: boolean; camera: string | MediaTrackConstraints }>
  > {
    const attempts: Array<{ useNativeDetector: boolean; camera: string | MediaTrackConstraints }> = [
      { useNativeDetector: false, camera: { facingMode: { ideal: 'environment' } } },
      { useNativeDetector: false, camera: { facingMode: { exact: 'environment' } } }
    ];

    try {
      const cameras = await Html5Qrcode.getCameras();
      this.availableCameraIds = cameras.map(c => c.id);
      if (cameras.length) {
        const rear = cameras.find(c => /back|rear|environment|trás|traseira|wide/i.test(c.label));
        if (rear?.id) {
          this.activeCameraIndex = cameras.findIndex(c => c.id === rear.id);
          attempts.push({ useNativeDetector: false, camera: rear.id });
        } else if (cameras.length > 1) {
          // Many phones list front camera first — prefer the last entry as rear.
          this.activeCameraIndex = cameras.length - 1;
          attempts.push({ useNativeDetector: false, camera: cameras[cameras.length - 1].id });
        } else {
          this.activeCameraIndex = 0;
          attempts.push({ useNativeDetector: false, camera: cameras[0].id });
        }
      }
    } catch {
      /* environment constraints above are enough */
    }

    return attempts;
  }

  /** Wait until #qr-reader exists and has layout dimensions. */
  private waitForQrReaderElement(maxMs = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        const el = document.getElementById(this.readerId);
        if (el && el.clientWidth > 0 && el.clientHeight > 0) {
          resolve();
          return;
        }
        if (Date.now() - started > maxMs) {
          reject(new Error('QR reader element not ready'));
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /** Decode QR from a photo when live camera scan is unreliable. */
  async onQrImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.selectedType) {
      return;
    }

    this.scanError = '';
    let scanner: Html5Qrcode | null = null;
    try {
      await this.stopScanning();
      scanner = new Html5Qrcode(this.readerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      const decodedText = await scanner.scanFile(file, false);
      if (decodedText?.trim()) {
        this.handleRawScan(decodedText.trim());
      } else {
        this.scanError = 'No QR code found in that image.';
      }
    } catch (err) {
      console.error('QR image scan failed', err);
      this.scanError = 'Could not read QR from image. Try a clearer photo with the code centered.';
    } finally {
      try {
        scanner?.clear();
      } catch {
        /* ignore */
      }
    }
  }

  async stopScanning(): Promise<void> {
    if (this.html5QrCode?.isScanning) {
      try {
        await this.html5QrCode.stop();
      } catch {
        /* ignore stop races */
      }
    }
    try {
      this.html5QrCode?.clear();
    } catch {
      /* ignore clear races */
    }
    this.html5QrCode = null;
    this.isScanning = false;
    this.cameraActive = false;
  }

  filterScanOptions(role: UserRole) {
    if (role === UserRole.GUARD || role === UserRole.SECURITY_STAFF) {
      return;
    } else if (
      role === UserRole.FACILITY_MANAGER ||
      role === UserRole.DOMESTIC_STAFF
    ) {
      // Staff field ops: asset tags (and packages if handed off on site).
      this.scanOptions = this.scanOptions.filter(o =>
        ['asset', 'package'].includes(o.type)
      );
    } else {
      this.scanOptions = this.scanOptions.filter(o => o.type === 'visitor');
    }
  }

  getScanInstruction(): string {
    if (!this.selectedType) {
      return 'Select what you want to scan';
    }

    const instructions: Record<string, string> = {
      visitor: 'Align QR code from visitor invitation',
      patrol: 'Scan checkpoint QR code',
      asset: 'Scan asset tag',
      package: 'Scan package delivery code'
    };

    return instructions[this.selectedType] || 'Align QR code within frame';
  }

  toggleFlash() {
    this.flashOn = !this.flashOn;
  }

  /** Parse raw QR text into a structured scan result for display. */
  private buildScanResult(
    raw: string,
    typeHint: string,
    timestamp = new Date()
  ): ScanResult {
    const parsed = parseQrPayload(raw, typeHint);
    const type = this.mapParsedKindToScanType(parsed.kind, typeHint);
    return { data: raw, type, timestamp, parsed };
  }

  private mapParsedKindToScanType(
    kind: ParsedQrPayload['kind'],
    fallback: string
  ): ScanResult['type'] {
    if (kind === 'visitor' || kind === 'recurring' || kind === 'gatepass') {
      return 'visitor';
    }
    if (kind === 'patrol') {
      return 'patrol';
    }
    if (kind === 'asset') {
      return 'asset';
    }
    if (kind === 'package') {
      return 'package';
    }
    const allowed = ['visitor', 'patrol', 'asset', 'package'] as const;
    return (allowed as readonly string[]).includes(fallback) ? (fallback as ScanResult['type']) : 'unknown';
  }

  /** Called when camera or manual entry returns QR text. */
  handleRawScan(raw: string): void {
    if (!raw?.trim() || !this.selectedType) {
      return;
    }
    let text = raw.trim();
    if (this.selectedType === 'patrol') {
      text = normalizePatrolScanToken(text);
    }
    this.onScanSuccess(this.buildScanResult(text, this.selectedType));
  }

  submitManualPaste(): void {
    const text = this.manualPasteData.trim();
    if (!text) {
      return;
    }
    this.handleRawScan(text);
    this.manualPasteData = '';
    this.showManualPaste = false;
  }

  onScanSuccess(result: ScanResult) {
    this.scanResult = result;
    this.lookupMessage = '';
    this.lookupMessageError = false;
    this.addToRecentScans(result);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }

    if (this.autoRecordPatrol && result.type === 'patrol') {
      this.processScan(result);
    }
  }

  /** Record checkpoint using id from query params (when QR is missing or camera blocked). */
  recordCheckpointFromContext(): void {
    const checkpointId = this.route.snapshot.queryParamMap.get('checkpointId') ?? '';
    const checkpointCode =
      this.route.snapshot.queryParamMap.get('checkpointCode') ??
      this.manualPasteData.trim() ??
      checkpointId;
    if (!checkpointId && !checkpointCode) {
      this.lookupMessage = 'No checkpoint selected.';
      return;
    }
    this.submitPatrolScan(checkpointId, checkpointCode);
  }

  private submitPatrolScan(checkpointId: string, scannedData: string): void {
    this.lookupBusy = true;
    this.lookupMessage = 'Recording checkpoint…';
    this.lookupMessageError = false;
    this.checkpointScanService
      .scanCheckpoint({
        checkpointId,
        scannedData: scannedData || this.patrolExpectedCode || checkpointId,
        scanType: ScanType.QR_CODE,
        guardId: this.session.getCurrentUserId()
      })
      .subscribe({
        next: res => {
          this.lookupBusy = false;
          if (res.success) {
            this.lookupMessageError = false;
            this.closeScanResult();
            void this.router.navigate(['/mobile/guard/patrol'], {
              queryParams: { scanSuccess: '1' }
            });
          } else {
            this.lookupMessage = res.message || 'Checkpoint scan failed.';
            this.lookupMessageError = true;
          }
        },
        error: () => {
          this.lookupBusy = false;
          this.lookupMessage = 'Checkpoint scan API failed.';
          this.lookupMessageError = true;
        }
      });
  }

  addToRecentScans(scan: ScanResult) {
    this.recentScans.unshift(scan);
    if (this.recentScans.length > 10) {
      this.recentScans = this.recentScans.slice(0, 10);
    }
    
    // Save to localStorage
    localStorage.setItem('recentScans', JSON.stringify(this.recentScans));
  }

  getScanIcon(type: string): string {
    const icons: Record<string, string> = {
      visitor: 'person',
      patrol: 'route',
      asset: 'inventory_2',
      package: 'local_shipping',
      unknown: 'qr_code'
    };
    return icons[type] || 'qr_code';
  }

  getScanColor(type: string): string {
    const colors: Record<string, string> = {
      visitor: '#667eea',
      patrol: '#10ac84',
      asset: '#ff9f43',
      package: '#764ba2',
      unknown: '#95a5a6'
    };
    return colors[type] || '#95a5a6';
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  formatFullTime(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  scanSummary(scan: ScanResult): string {
    return qrScanSummary(scan.data);
  }

  viewScanDetails(scan: ScanResult) {
    this.scanResult = scan;
    this.lookupMessage = '';
    this.lookupMessageError = false;
  }

  closeScanResult() {
    this.scanResult = null;
    this.lookupMessage = '';
    this.lookupMessageError = false;
  }

  processButtonLabel(result: ScanResult): string {
    switch (result.type) {
      case 'visitor':
        return 'Open visitor';
      case 'patrol':
        if (this.lookupBusy) {
          return 'Recording…';
        }
        if (this.lookupMessageError) {
          return this.route.snapshot.queryParamMap.get('checkpointId')
            ? 'Record selected checkpoint'
            : 'Try again';
        }
        return 'Record checkpoint';
      case 'asset':
        return 'Open asset';
      case 'package':
        return 'Open package';
      default:
        return 'Continue';
    }
  }

  processScan(result: ScanResult) {
    const parsed = result.parsed;

    switch (result.type) {
      case 'visitor': {
        const token =
          parsed.visitorId ||
          parsed.fields.find(f => f.label === 'Code')?.value ||
          result.data;

        if (!token?.trim() || token.startsWith('demo-')) {
          this.lookupMessage = 'Invalid visitor code. Use the QR from a visitor invitation.';
          this.lookupMessageError = true;
          return;
        }

        this.lookupBusy = true;
        this.lookupMessage = 'Looking up visitor…';
        this.lookupMessageError = false;

        this.visitorService.findVisitorByScanToken(token.trim()).subscribe({
          next: visitor => {
            this.lookupBusy = false;
            if (visitor) {
              this.router.navigate(['/mobile/guard/visitor-approvals'], {
                queryParams: { visitorId: visitor.id }
              });
              this.closeScanResult();
            } else {
              this.lookupMessage = `No visitor found for "${token}". Check Pending Approvals or verify the QR code.`;
              this.lookupMessageError = true;
            }
          },
          error: () => {
            this.lookupBusy = false;
            this.lookupMessage = 'Could not look up visitor. Try again.';
            this.lookupMessageError = true;
          }
        });
        return;
      }
      case 'patrol': {
        const checkpointId = this.route.snapshot.queryParamMap.get('checkpointId') ?? '';
        const code =
          normalizePatrolScanToken(
            parsed.checkpointCode ||
              parsed.fields.find(f => f.label === 'Code')?.value ||
              result.data
          ) || this.patrolExpectedCode;

        // When opened from a patrol checkpoint row, prefer context id even if QR text differs.
        if (this.lookupMessageError && checkpointId) {
          this.recordCheckpointFromContext();
          return;
        }
        this.submitPatrolScan(checkpointId, code);
        return;
      }
      case 'asset': {
        const assetId = parsed.assetId || result.data;
        this.router.navigate(['/admin/assets'], { queryParams: { assetId } });
        this.closeScanResult();
        return;
      }
      case 'package': {
        const token =
          parsed.fields.find(f => f.label === 'Tracking')?.value ||
          result.data;
        this.lookupBusy = true;
        this.lookupMessage = 'Looking up package…';
        this.lookupMessageError = false;
        this.packageService.findByTrackingOrId(token).subscribe({
          next: pkg => {
            this.lookupBusy = false;
            if (pkg) {
              this.router.navigate(['/mobile/guard/packages'], {
                queryParams: { highlight: pkg.id }
              });
              this.closeScanResult();
            } else {
              this.lookupMessage = 'Package not found. Register it under Package Received.';
              this.lookupMessageError = true;
            }
          },
          error: () => {
            this.lookupBusy = false;
            this.lookupMessage = 'Could not look up package.';
            this.lookupMessageError = true;
          }
        });
        return;
      }
      default:
        this.lookupMessage = 'This QR type is not linked to an action yet.';
        this.lookupMessageError = true;
    }
  }

  goBack() {
    const user = this.authService.getCurrentUser();
    const role = user?.role;
    if (
      role === UserRole.FACILITY_MANAGER ||
      role === UserRole.DOMESTIC_STAFF ||
      role === UserRole.ACCOUNTANT
    ) {
      this.router.navigate(['/mobile/staff/dashboard']);
      return;
    }
    this.router.navigate(['/mobile/guard/dashboard']);
  }
}
