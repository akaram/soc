import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

/**
 * Document Scanning Component
 * Allows guards to scan and verify ID cards and licenses
 */
@Component({
  selector: 'app-document-scanning',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="document-scanning-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">scanner</i>
            Document Scanning
          </h1>
          <p>Scan and verify ID cards and licenses</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="content">
        <!-- Document Type Selection -->
        <div class="document-type-section">
          <h2>Select Document Type</h2>
          <div class="document-type-cards">
            <div 
              class="doc-type-card" 
              [class.active]="selectedDocType === 'id'"
              (click)="selectDocumentType('id')">
              <div class="doc-icon">
                <i class="material-icons">badge</i>
              </div>
              <h3>ID Card</h3>
              <p>National ID, Passport, etc.</p>
            </div>
            <div 
              class="doc-type-card" 
              [class.active]="selectedDocType === 'license'"
              (click)="selectDocumentType('license')">
              <div class="doc-icon">
                <i class="material-icons">credit_card</i>
              </div>
              <h3>License</h3>
              <p>Driving License, etc.</p>
            </div>
          </div>
        </div>

        <!-- Scanner Section -->
        <div class="scanner-section" *ngIf="selectedDocType">
          <div class="scanner-card">
            <div class="scanner-header">
              <h3>
                <i class="material-icons">camera_alt</i>
                {{ selectedDocType === 'id' ? 'ID Card' : 'License' }} Scanner
              </h3>
            </div>

            <!-- Camera Preview Area -->
            <div class="camera-preview" *ngIf="!isScanning && !scannedDocument">
              <div class="preview-placeholder">
                <i class="material-icons">photo_camera</i>
                <p>Camera preview will appear here</p>
              </div>
            </div>

            <!-- Scanning Indicator -->
            <div class="scanning-indicator" *ngIf="isScanning">
              <div class="scanning-animation">
                <div class="scan-line"></div>
              </div>
              <p>Scanning document...</p>
            </div>

            <!-- Scanned Document Display -->
            <div class="scanned-document" *ngIf="scannedDocument && !isScanning">
              <div class="document-image">
                <img [src]="scannedDocument.image" alt="Scanned Document" />
              </div>
              <div class="document-details">
                <h4>Document Information</h4>
                <div class="detail-row" *ngIf="scannedDocument.name">
                  <span class="label">Name:</span>
                  <span class="value">{{ scannedDocument.name }}</span>
                </div>
                <div class="detail-row" *ngIf="scannedDocument.documentNumber">
                  <span class="label">Document Number:</span>
                  <span class="value">{{ scannedDocument.documentNumber }}</span>
                </div>
                <div class="detail-row" *ngIf="scannedDocument.dateOfBirth">
                  <span class="label">Date of Birth:</span>
                  <span class="value">{{ scannedDocument.dateOfBirth }}</span>
                </div>
                <div class="detail-row" *ngIf="scannedDocument.expiryDate">
                  <span class="label">Expiry Date:</span>
                  <span class="value">{{ scannedDocument.expiryDate }}</span>
                </div>
                <div class="detail-row" *ngIf="scannedDocument.issueDate">
                  <span class="label">Issue Date:</span>
                  <span class="value">{{ scannedDocument.issueDate }}</span>
                </div>
                <div class="verification-status" [class.verified]="scannedDocument.verified" [class.invalid]="!scannedDocument.verified">
                  <i class="material-icons">{{ scannedDocument.verified ? 'check_circle' : 'error' }}</i>
                  <span>{{ scannedDocument.verified ? 'Verified' : 'Invalid Document' }}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <button 
                class="btn btn-primary" 
                (click)="startScanning()"
                [disabled]="isScanning">
                <i class="material-icons">camera_alt</i>
                {{ scannedDocument ? 'Scan Again' : 'Start Scanning' }}
              </button>
              <button 
                class="btn btn-secondary" 
                (click)="uploadDocument()"
                [disabled]="isScanning">
                <i class="material-icons">upload</i>
                Upload Image
              </button>
              <button 
                class="btn btn-success" 
                (click)="saveDocument()"
                [disabled]="!scannedDocument || isScanning">
                <i class="material-icons">save</i>
                Save Document
              </button>
            </div>
          </div>
        </div>

        <!-- Recent Scans -->
        <div class="recent-scans-section" *ngIf="recentScans.length > 0">
          <h2>Recent Scans</h2>
          <div class="recent-scans-list">
            <div class="recent-scan-item" *ngFor="let scan of recentScans" (click)="viewScanDetails(scan)">
              <div class="scan-icon">
                <i class="material-icons">{{ scan.type === 'id' ? 'badge' : 'credit_card' }}</i>
              </div>
              <div class="scan-info">
                <h4>{{ scan.type === 'id' ? 'ID Card' : 'License' }}</h4>
                <p>{{ scan.name || 'Unknown' }} - {{ scan.scanDate | date:'short' }}</p>
              </div>
              <div class="scan-status" [class.verified]="scan.verified">
                <i class="material-icons">{{ scan.verified ? 'check_circle' : 'error' }}</i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .document-scanning-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }

    .back-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .header-content h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content p {
      margin: 4px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }

    /* Content */
    .content {
      padding: 24px;
    }

    /* Document Type Section */
    .document-type-section {
      margin-bottom: 24px;
    }

    .document-type-section h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .document-type-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .doc-type-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .doc-type-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .doc-type-card.active {
      border-color: #9b59b6;
      background: #f8f4ff;
    }

    .doc-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
      color: white;
    }

    .doc-icon .material-icons {
      font-size: 32px;
    }

    .doc-type-card h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .doc-type-card p {
      margin: 0;
      font-size: 12px;
      color: #7f8c8d;
    }

    /* Scanner Section */
    .scanner-section {
      margin-bottom: 24px;
    }

    .scanner-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .scanner-header h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Camera Preview */
    .camera-preview {
      width: 100%;
      height: 300px;
      background: #f5f7fa;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px dashed #bdc3c7;
    }

    .preview-placeholder {
      text-align: center;
      color: #95a5a6;
    }

    .preview-placeholder .material-icons {
      font-size: 64px;
      margin-bottom: 12px;
    }

    .preview-placeholder p {
      margin: 0;
      font-size: 14px;
    }

    /* Scanning Indicator */
    .scanning-indicator {
      width: 100%;
      height: 300px;
      background: #f5f7fa;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .scanning-animation {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .scan-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, transparent, #9b59b6, transparent);
      animation: scan 2s linear infinite;
    }

    @keyframes scan {
      0% { top: 0; }
      100% { top: 100%; }
    }

    .scanning-indicator p {
      margin-top: 20px;
      color: #9b59b6;
      font-weight: 500;
    }

    /* Scanned Document */
    .scanned-document {
      margin-bottom: 20px;
    }

    .document-image {
      width: 100%;
      max-height: 300px;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
      background: #f5f7fa;
    }

    .document-image img {
      width: 100%;
      height: auto;
      display: block;
    }

    .document-details {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
    }

    .document-details h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row .label {
      font-weight: 500;
      color: #7f8c8d;
      font-size: 14px;
    }

    .detail-row .value {
      color: #2c3e50;
      font-size: 14px;
      font-weight: 600;
    }

    .verification-status {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .verification-status.verified {
      background: #d4edda;
      color: #155724;
    }

    .verification-status.invalid {
      background: #f8d7da;
      color: #721c24;
    }

    /* Action Buttons */
    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      flex: 1;
      min-width: 120px;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #9b59b6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #8e44ad;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #7f8c8d;
    }

    .btn-success {
      background: #2ed573;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #1e9e5a;
    }

    /* Recent Scans */
    .recent-scans-section {
      margin-top: 32px;
    }

    .recent-scans-section h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .recent-scans-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .recent-scan-item {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .recent-scan-item:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .scan-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .scan-info {
      flex: 1;
    }

    .scan-info h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .scan-info p {
      margin: 0;
      font-size: 12px;
      color: #7f8c8d;
    }

    .scan-status {
      color: #95a5a6;
    }

    .scan-status.verified {
      color: #2ed573;
    }

    @media (max-width: 768px) {
      .content {
        padding: 16px;
      }

      .document-type-cards {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class DocumentScanningComponent implements OnInit {
  selectedDocType: 'id' | 'license' | null = null;
  isScanning: boolean = false;
  scannedDocument: any = null;
  recentScans: any[] = [];

  constructor() {}

  ngOnInit(): void {
    // Load recent scans from storage or service
    this.loadRecentScans();
  }

  /**
   * Select document type (ID or License)
   */
  selectDocumentType(type: 'id' | 'license'): void {
    this.selectedDocType = type;
    this.scannedDocument = null;
  }

  /**
   * Start scanning document
   */
  startScanning(): void {
    this.isScanning = true;
    this.scannedDocument = null;

    // Simulate scanning process
    setTimeout(() => {
      this.isScanning = false;
      // Simulate scanned document data
      this.scannedDocument = {
        type: this.selectedDocType,
        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y1ZjdmYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5NTk1OTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TY2FubmVkIERvY3VtZW50PC90ZXh0Pjwvc3ZnPg==',
        name: 'John Doe',
        documentNumber: this.selectedDocType === 'id' ? 'ID-123456789' : 'DL-987654321',
        dateOfBirth: '1990-01-15',
        expiryDate: '2030-01-15',
        issueDate: '2020-01-15',
        verified: Math.random() > 0.3 // 70% chance of being verified
      };
    }, 2000);
  }

  /**
   * Upload document image
   */
  uploadDocument(): void {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.isScanning = true;
          setTimeout(() => {
            this.isScanning = false;
            this.scannedDocument = {
              type: this.selectedDocType,
              image: e.target.result,
              name: 'Jane Smith',
              documentNumber: this.selectedDocType === 'id' ? 'ID-987654321' : 'DL-123456789',
              dateOfBirth: '1985-05-20',
              expiryDate: '2025-05-20',
              issueDate: '2015-05-20',
              verified: Math.random() > 0.3
            };
          }, 1500);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  /**
   * Save scanned document
   */
  saveDocument(): void {
    if (this.scannedDocument) {
      const scanRecord = {
        ...this.scannedDocument,
        scanDate: new Date()
      };
      this.recentScans.unshift(scanRecord);
      // Limit to 10 recent scans
      if (this.recentScans.length > 10) {
        this.recentScans = this.recentScans.slice(0, 10);
      }
      // Save to storage or service
      this.saveRecentScans();
      
      // Reset for next scan
      this.scannedDocument = null;
      alert('Document saved successfully!');
    }
  }

  /**
   * View scan details
   */
  viewScanDetails(scan: any): void {
    this.scannedDocument = scan;
    this.selectedDocType = scan.type;
  }

  /**
   * Load recent scans from storage
   */
  loadRecentScans(): void {
    // In a real app, this would load from a service or local storage
    const saved = localStorage.getItem('recentDocumentScans');
    if (saved) {
      try {
        this.recentScans = JSON.parse(saved);
      } catch (e) {
        this.recentScans = [];
      }
    }
  }

  /**
   * Save recent scans to storage
   */
  saveRecentScans(): void {
    // In a real app, this would save to a service or local storage
    localStorage.setItem('recentDocumentScans', JSON.stringify(this.recentScans));
  }

  /**
   * Navigate back
   */
  goBack(): void {
    window.history.back();
  }
}

