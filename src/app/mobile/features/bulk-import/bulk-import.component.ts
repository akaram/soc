import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BulkImportService } from './services/bulk-import.service';
import {
  BulkImportSession,
  ImportStatus,
  ImportValidationResult,
  ImportProgress,
  ImportSummary,
  ResidentImportData
} from './models/bulk-import.model';

@Component({
  selector: 'app-bulk-import',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bulk-import-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Bulk Import Residents</h1>
        <div style="width: 40px;"></div>
      </div>

      <!-- Step Indicator -->
      <div class="step-indicator" *ngIf="!showHistory">
        <div class="step" [class.active]="currentStep >= 1" [class.completed]="currentStep > 1">
          <div class="step-number">{{ currentStep > 1 ? '✓' : '1' }}</div>
          <div class="step-label">Upload</div>
        </div>
        <div class="step-line" [class.active]="currentStep >= 2"></div>
        <div class="step" [class.active]="currentStep >= 2" [class.completed]="currentStep > 2">
          <div class="step-number">{{ currentStep > 2 ? '✓' : '2' }}</div>
          <div class="step-label">Validate</div>
        </div>
        <div class="step-line" [class.active]="currentStep >= 3"></div>
        <div class="step" [class.active]="currentStep >= 3" [class.completed]="currentStep > 3">
          <div class="step-number">{{ currentStep > 3 ? '✓' : '3' }}</div>
          <div class="step-label">Import</div>
        </div>
        <div class="step-line" [class.active]="currentStep >= 4"></div>
        <div class="step" [class.active]="currentStep >= 4">
          <div class="step-number">4</div>
          <div class="step-label">Complete</div>
        </div>
      </div>

      <div class="content">
        <!-- History View -->
        <div *ngIf="showHistory">
          <div class="section-header">
            <h2>Import History</h2>
            <button class="btn btn-primary" (click)="showHistory = false; currentStep = 1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Import
            </button>
          </div>

          <div class="history-list">
            <div class="history-card" *ngFor="let session of importSessions" (click)="viewSessionDetails(session)">
              <div class="history-header">
                <div class="file-info">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <div>
                    <h3>{{ session.fileName }}</h3>
                    <span class="file-meta">{{ formatFileSize(session.fileSize) }} • {{ formatDate(session.uploadedAt) }}</span>
                  </div>
                </div>
                <span class="status-badge" [ngClass]="getStatusClass(session.status)">
                  {{ session.status }}
                </span>
              </div>
              <div class="history-stats">
                <div class="stat">
                  <span class="stat-label">Total</span>
                  <span class="stat-value">{{ session.totalRecords }}</span>
                </div>
                <div class="stat success">
                  <span class="stat-label">Success</span>
                  <span class="stat-value">{{ session.successfulImports }}</span>
                </div>
                <div class="stat error" *ngIf="session.failedImports > 0">
                  <span class="stat-label">Failed</span>
                  <span class="stat-value">{{ session.failedImports }}</span>
                </div>
              </div>
            </div>

            <div class="empty-state" *ngIf="importSessions.length === 0">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <h3>No Import History</h3>
              <p>Start your first bulk import</p>
            </div>
          </div>
        </div>

        <!-- Step 1: Upload File -->
        <div *ngIf="currentStep === 1 && !showHistory">
          <div class="upload-section">
            <div class="info-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div>
                <h3>Before you start</h3>
                <ul>
                  <li>Download the template file to see the required format</li>
                  <li>Ensure all required fields are filled</li>
                  <li>Use proper date format: DD/MM/YYYY</li>
                  <li>Phone numbers must include country code (+91)</li>
                  <li>Maximum file size: 10 MB</li>
                </ul>
              </div>
            </div>

            <div class="template-section">
              <h3>Download Template</h3>
              <div class="template-buttons">
                <button class="btn btn-outline" (click)="downloadTemplate()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download Empty Template
                </button>
                <button class="btn btn-outline" (click)="downloadSampleData()">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download Sample Data
                </button>
              </div>
            </div>

            <div class="upload-box" 
                 [class.dragging]="isDragging"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)"
                 (click)="fileInput.click()">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <h3>{{ selectedFile ? selectedFile.name : 'Drag & Drop your file here' }}</h3>
              <p>{{ selectedFile ? formatFileSize(selectedFile.size) : 'or click to browse' }}</p>
              <span class="supported-formats">Supported: Excel (.xlsx, .xls) and CSV (.csv)</span>
              <input #fileInput type="file" accept=".xlsx,.xls,.csv" style="display: none" (change)="onFileSelected($event)">
            </div>

            <button 
              class="btn btn-primary btn-large"
              [disabled]="!selectedFile || uploading"
              (click)="uploadFile()">
              <span *ngIf="!uploading">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload & Validate
              </span>
              <span *ngIf="uploading">
                <div class="spinner-small"></div>
                Uploading...
              </span>
            </button>

            <button class="btn btn-text" (click)="showHistory = true">
              View Import History
            </button>
          </div>
        </div>

        <!-- Step 2: Validation Results -->
        <div *ngIf="currentStep === 2 && !showHistory && validationResult">
          <div class="validation-section">
            <div class="validation-summary">
              <div class="summary-card" [class.success]="validationResult.isValid" [class.error]="!validationResult.isValid">
                <svg *ngIf="validationResult.isValid" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <svg *ngIf="!validationResult.isValid" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <h2>{{ validationResult.isValid ? 'Validation Successful' : 'Validation Failed' }}</h2>
                <p>{{ validationResult.isValid ? 'All records are valid and ready to import' : 'Some records have errors that need to be fixed' }}</p>
              </div>

              <div class="stats-grid">
                <div class="stat-box total">
                  <div class="stat-icon">📋</div>
                  <div class="stat-info">
                    <span class="stat-number">{{ validationResult.totalRecords }}</span>
                    <span class="stat-label">Total Records</span>
                  </div>
                </div>
                <div class="stat-box success">
                  <div class="stat-icon">✓</div>
                  <div class="stat-info">
                    <span class="stat-number">{{ validationResult.validRecords }}</span>
                    <span class="stat-label">Valid Records</span>
                  </div>
                </div>
                <div class="stat-box error">
                  <div class="stat-icon">✗</div>
                  <div class="stat-info">
                    <span class="stat-number">{{ validationResult.invalidRecords }}</span>
                    <span class="stat-label">Invalid Records</span>
                  </div>
                </div>
                <div class="stat-box warning">
                  <div class="stat-icon">⚠</div>
                  <div class="stat-info">
                    <span class="stat-number">{{ validationResult.warnings.length }}</span>
                    <span class="stat-label">Warnings</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Errors List -->
            <div class="errors-section" *ngIf="validationResult.errors.length > 0">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Validation Errors ({{ validationResult.errors.length }})
              </h3>
              <div class="error-list">
                <div class="error-item" *ngFor="let error of validationResult.errors.slice(0, 10)">
                  <span class="row-number">Row {{ error.rowNumber }}</span>
                  <span class="error-message">{{ error.message }}</span>
                </div>
                <div class="show-more" *ngIf="validationResult.errors.length > 10">
                  + {{ validationResult.errors.length - 10 }} more errors
                </div>
              </div>
            </div>

            <!-- Warnings List -->
            <div class="warnings-section" *ngIf="validationResult.warnings.length > 0">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Warnings ({{ validationResult.warnings.length }})
              </h3>
              <div class="warning-list">
                <div class="warning-item" *ngFor="let warning of validationResult.warnings.slice(0, 5)">
                  <span class="row-number">Row {{ warning.rowNumber }}</span>
                  <span class="warning-message">{{ warning.message }}</span>
                </div>
              </div>
            </div>

            <div class="action-buttons">
              <button class="btn btn-secondary" (click)="currentStep = 1; validationResult = null">
                Cancel
              </button>
              <button 
                class="btn btn-primary"
                [disabled]="validationResult.validRecords === 0"
                (click)="proceedToImport()">
                Import {{ validationResult.validRecords }} Valid Records
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Import Progress -->
        <div *ngIf="currentStep === 3 && !showHistory && importProgress">
          <div class="import-progress-section">
            <div class="progress-card">
              <h2>Importing Residents...</h2>
              <p>Please wait while we import the data. This may take a few minutes.</p>

              <div class="progress-bar-container">
                <div class="progress-bar" [style.width.%]="importProgress.percentage"></div>
              </div>
              <div class="progress-stats">
                <span>{{ importProgress.processed }} / {{ importProgress.total }} records</span>
                <span>{{ importProgress.percentage }}%</span>
              </div>

              <div class="import-stats-grid">
                <div class="import-stat">
                  <div class="stat-icon">✓</div>
                  <div>
                    <div class="stat-value">{{ importProgress.successful }}</div>
                    <div class="stat-label">Successful</div>
                  </div>
                </div>
                <div class="import-stat">
                  <div class="stat-icon">✗</div>
                  <div>
                    <div class="stat-value">{{ importProgress.failed }}</div>
                    <div class="stat-label">Failed</div>
                  </div>
                </div>
                <div class="import-stat">
                  <div class="stat-icon">⏱</div>
                  <div>
                    <div class="stat-value">{{ importProgress.estimatedTimeRemaining }}</div>
                    <div class="stat-label">ETA</div>
                  </div>
                </div>
              </div>

              <div class="current-record" *ngIf="importProgress.currentRecord">
                <span>Processing record {{ importProgress.currentRecord }} of {{ importProgress.total }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Import Complete -->
        <div *ngIf="currentStep === 4 && !showHistory && importSummary">
          <div class="complete-section">
            <div class="success-card">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h2>Import Completed!</h2>
              <p>Your bulk import has been processed successfully</p>
            </div>

            <div class="summary-stats">
              <div class="summary-stat total">
                <span class="summary-number">{{ importSummary.totalRecords }}</span>
                <span class="summary-label">Total Records</span>
              </div>
              <div class="summary-stat success">
                <span class="summary-number">{{ importSummary.successfulImports }}</span>
                <span class="summary-label">Successfully Imported</span>
              </div>
              <div class="summary-stat error" *ngIf="importSummary.failedImports > 0">
                <span class="summary-number">{{ importSummary.failedImports }}</span>
                <span class="summary-label">Failed</span>
              </div>
            </div>

            <div class="summary-details">
              <div class="detail-item">
                <span class="detail-label">File Name:</span>
                <span class="detail-value">{{ importSummary.fileName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">{{ importSummary.duration }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Completed At:</span>
                <span class="detail-value">{{ formatDateTime(importSummary.completedAt) }}</span>
              </div>
            </div>

            <div class="action-buttons">
              <button class="btn btn-secondary" (click)="viewResidents()">
                View Imported Residents
              </button>
              <button class="btn btn-primary" (click)="startNewImport()">
                Start New Import
              </button>
            </div>

            <button class="btn btn-text" (click)="downloadReport()">
              Download Import Report
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bulk-import-container {
      min-height: 100vh;
      background: #f5f5f5;
      padding-bottom: 2rem;
    }

    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .back-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .back-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .step-indicator {
      background: white;
      padding: 1.5rem 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid #e0e0e0;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 2px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #9ca3af;
      background: white;
      transition: all 0.3s;
    }

    .step.active .step-number {
      border-color: #3b82f6;
      color: #3b82f6;
    }

    .step.completed .step-number {
      border-color: #10b981;
      background: #10b981;
      color: white;
    }

    .step-label {
      font-size: 0.85rem;
      color: #666;
    }

    .step.active .step-label {
      color: #3b82f6;
      font-weight: 600;
    }

    .step-line {
      width: 60px;
      height: 2px;
      background: #d1d5db;
      transition: all 0.3s;
    }

    .step-line.active {
      background: #3b82f6;
    }

    .content {
      padding: 1rem;
    }

    .upload-section {
      max-width: 600px;
      margin: 0 auto;
    }

    .info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .info-box svg {
      color: #3b82f6;
      flex-shrink: 0;
    }

    .info-box h3 {
      margin: 0 0 0.5rem 0;
      color: #1e40af;
    }

    .info-box ul {
      margin: 0;
      padding-left: 1.25rem;
      color: #1e3a8a;
    }

    .info-box li {
      margin-bottom: 0.25rem;
    }

    .template-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .template-section h3 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .template-buttons {
      display: grid;
      gap: 0.75rem;
    }

    .upload-box {
      background: white;
      border: 2px dashed #d1d5db;
      border-radius: 12px;
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 1.5rem;
    }

    .upload-box:hover {
      border-color: #3b82f6;
      background: #f9fafb;
    }

    .upload-box.dragging {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .upload-box svg {
      color: #9ca3af;
      margin-bottom: 1rem;
    }

    .upload-box h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .upload-box p {
      margin: 0 0 0.5rem 0;
      color: #666;
    }

    .supported-formats {
      display: block;
      font-size: 0.85rem;
      color: #999;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #d1d5db;
    }

    .btn-outline {
      background: white;
      border: 2px solid #e5e7eb;
      color: #374151;
    }

    .btn-outline:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }

    .btn-text {
      background: none;
      color: #3b82f6;
    }

    .btn-large {
      width: 100%;
      padding: 1rem;
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }

    .spinner-small {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f4f6;
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Validation Section */
    .validation-section {
      max-width: 800px;
      margin: 0 auto;
    }

    .validation-summary {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .summary-card {
      text-align: center;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .summary-card.success {
      background: #d1fae5;
      color: #065f46;
    }

    .summary-card.error {
      background: #fee2e2;
      color: #991b1b;
    }

    .summary-card h2 {
      margin: 1rem 0 0.5rem 0;
    }

    .summary-card p {
      margin: 0;
      opacity: 0.9;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .stat-box {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat-icon {
      font-size: 2rem;
    }

    .stat-number {
      display: block;
      font-size: 2rem;
      font-weight: 700;
    }

    .stat-label {
      display: block;
      font-size: 0.85rem;
      color: #666;
    }

    .stat-box.total .stat-number { color: #3b82f6; }
    .stat-box.success .stat-number { color: #10b981; }
    .stat-box.error .stat-number { color: #ef4444; }
    .stat-box.warning .stat-number { color: #f59e0b; }

    .errors-section, .warnings-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .errors-section h3, .warnings-section h3 {
      margin: 0 0 1rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .errors-section h3 {
      color: #ef4444;
    }

    .warnings-section h3 {
      color: #f59e0b;
    }

    .error-list, .warning-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .error-item, .warning-item {
      display: flex;
      gap: 1rem;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 8px;
    }

    .row-number {
      background: #e5e7eb;
      color: #374151;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .error-message, .warning-message {
      flex: 1;
      color: #666;
    }

    .show-more {
      text-align: center;
      color: #666;
      font-size: 0.9rem;
      padding: 0.5rem;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .action-buttons .btn {
      flex: 1;
    }

    /* Import Progress */
    .import-progress-section {
      max-width: 600px;
      margin: 0 auto;
    }

    .progress-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      text-align: center;
    }

    .progress-card h2 {
      margin: 0 0 0.5rem 0;
    }

    .progress-card > p {
      color: #666;
      margin-bottom: 2rem;
    }

    .progress-bar-container {
      width: 100%;
      height: 12px;
      background: #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
      transition: width 0.3s;
    }

    .progress-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 2rem;
    }

    .import-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .import-stat {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .import-stat .stat-icon {
      font-size: 1.5rem;
    }

    .import-stat .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #333;
    }

    .import-stat .stat-label {
      font-size: 0.85rem;
      color: #666;
    }

    .current-record {
      color: #666;
      font-size: 0.9rem;
    }

    /* Complete Section */
    .complete-section {
      max-width: 600px;
      margin: 0 auto;
    }

    .success-card {
      background: white;
      border-radius: 12px;
      padding: 3rem 2rem;
      text-align: center;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .success-card svg {
      color: #10b981;
      margin-bottom: 1rem;
    }

    .success-card h2 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .success-card p {
      margin: 0;
      color: #666;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-stat {
      background: white;
      border-radius: 12px;
      padding: 1.5rem 1rem;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .summary-number {
      display: block;
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .summary-label {
      display: block;
      font-size: 0.85rem;
      color: #666;
    }

    .summary-stat.total .summary-number { color: #3b82f6; }
    .summary-stat.success .summary-number { color: #10b981; }
    .summary-stat.error .summary-number { color: #ef4444; }

    .summary-details {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-label {
      color: #666;
      font-weight: 500;
    }

    .detail-value {
      color: #333;
      font-weight: 600;
    }

    /* History Section */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .section-header h2 {
      margin: 0;
      color: #333;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .history-card {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      cursor: pointer;
      transition: all 0.3s;
    }

    .history-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .file-info svg {
      color: #3b82f6;
    }

    .file-info h3 {
      margin: 0 0 0.25rem 0;
      color: #333;
    }

    .file-meta {
      font-size: 0.85rem;
      color: #666;
    }

    .status-badge {
      padding: 0.35rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.completed { background: #d1fae5; color: #065f46; }
    .status-badge.failed { background: #fee2e2; color: #991b1b; }
    .status-badge.ready-to-import { background: #dbeafe; color: #1e40af; }
    .status-badge.importing { background: #fef3c7; color: #92400e; }

    .history-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .history-stats .stat {
      text-align: center;
    }

    .history-stats .stat-label {
      display: block;
      font-size: 0.85rem;
      color: #666;
      margin-bottom: 0.25rem;
    }

    .history-stats .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #333;
    }

    .history-stats .stat.success .stat-value {
      color: #10b981;
    }

    .history-stats .stat.error .stat-value {
      color: #ef4444;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .empty-state svg {
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 1rem 0 0.5rem 0;
      color: #333;
    }

    .empty-state p {
      color: #666;
    }
  `]
})
export class BulkImportComponent implements OnInit {
  currentStep = 1;
  showHistory = false;
  selectedFile: File | null = null;
  isDragging = false;
  uploading = false;
  validationResult: ImportValidationResult | null = null;
  importProgress: ImportProgress | null = null;
  importSummary: ImportSummary | null = null;
  importSessions: BulkImportSession[] = [];
  currentSessionId: string | null = null;

  constructor(
    private bulkImportService: BulkImportService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadImportSessions();
  }

  loadImportSessions() {
    this.bulkImportService.getAllSessions('SOC001').subscribe({
      next: (sessions) => {
        this.importSessions = sessions;
      }
    });
  }

  // File Selection
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  // Drag and Drop
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  // Upload File
  uploadFile() {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.bulkImportService.uploadFile(this.selectedFile, 'SOC001').subscribe({
      next: (response) => {
        this.currentSessionId = response.sessionId;
        this.uploading = false;
        this.validateData();
      },
      error: (err) => {
        console.error('Upload error:', err);
        this.uploading = false;
        alert('Error uploading file. Please try again.');
      }
    });
  }

  // Validate Data
  validateData() {
    if (!this.currentSessionId) return;

    this.bulkImportService.validateImportData(this.currentSessionId).subscribe({
      next: (result) => {
        this.validationResult = result;
        this.currentStep = 2;
      },
      error: (err) => {
        console.error('Validation error:', err);
        alert('Error validating data. Please try again.');
      }
    });
  }

  // Proceed to Import
  proceedToImport() {
    if (!this.currentSessionId) return;

    this.currentStep = 3;
    this.bulkImportService.startImport(this.currentSessionId).subscribe({
      next: (progress) => {
        this.importProgress = progress;
        
        if (progress.percentage === 100) {
          // Import complete, load summary
          setTimeout(() => {
            this.loadImportSummary();
          }, 1000);
        }
      },
      error: (err) => {
        console.error('Import error:', err);
        alert('Error during import. Please try again.');
      }
    });
  }

  // Load Import Summary
  loadImportSummary() {
    if (!this.currentSessionId) return;

    this.bulkImportService.getImportSummary(this.currentSessionId).subscribe({
      next: (summary) => {
        this.importSummary = summary;
        this.currentStep = 4;
      }
    });
  }

  // Download Template
  downloadTemplate() {
    this.bulkImportService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'resident_import_template.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  // Download Sample Data
  downloadSampleData() {
    this.bulkImportService.downloadSampleData().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'resident_import_sample.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  // Download Report
  downloadReport() {
    if (!this.importSummary) return;
    
    // Generate CSV report
    const csvContent = this.generateImportReport();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import_report_${this.importSummary.sessionId}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateImportReport(): string {
    if (!this.importSummary) return '';
    
    let csv = 'Summary Report\n\n';
    csv += `File Name,${this.importSummary.fileName}\n`;
    csv += `Total Records,${this.importSummary.totalRecords}\n`;
    csv += `Successful Imports,${this.importSummary.successfulImports}\n`;
    csv += `Failed Imports,${this.importSummary.failedImports}\n`;
    csv += `Duration,${this.importSummary.duration}\n\n`;
    
    if (this.importSummary.failedRecords.length > 0) {
      csv += '\nFailed Records\n';
      csv += 'Row,Flat Number,Owner Name,Email,Error\n';
      this.importSummary.failedRecords.forEach((record: ResidentImportData) => {
        csv += `${record.rowNumber},${record.flatNumber},${record.ownerName},${record.email},"${record.errorMessage}"\n`;
      });
    }
    
    return csv;
  }

  // View Session Details
  viewSessionDetails(session: BulkImportSession) {
    console.log('View session:', session);
    // Navigate to session details or show modal
  }

  // Navigation
  startNewImport() {
    this.currentStep = 1;
    this.selectedFile = null;
    this.validationResult = null;
    this.importProgress = null;
    this.importSummary = null;
    this.currentSessionId = null;
  }

  viewResidents() {
    const inAdmin = this.router.url.startsWith('/admin');
    this.router.navigate([inAdmin ? '/admin/users-list' : '/mobile/dashboard']);
  }

  goBack() {
    if (this.showHistory) {
      this.showHistory = false;
    } else if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      const inAdmin = this.router.url.startsWith('/admin');
      this.router.navigate([inAdmin ? '/admin/users' : '/mobile/dashboard']);
    }
  }

  // Helper Methods
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: ImportStatus): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }
}
