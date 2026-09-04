import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProxyAttendanceDetectionService } from '../services/proxy-attendance-detection.service';
import {
  ProxyAttendanceAlert,
  ProxyAttendanceStatistics,
  AlertStatus,
  AttendanceMethod
} from '../models/proxy-attendance-detection.model';
import {
  applyAlertFilter,
  alertsToCsv
} from '../services/proxy-attendance-detection-api.mapper';

@Component({
  selector: 'app-proxy-attendance-detection',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="proxy-attendance-detection-container">
      <div class="page-header">
        <button class="back-button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Dashboard
        </button>
        <div>
          <h1>
            <i class="material-icons">security</i>
            Proxy Attendance Detection
          </h1>
          <p>Detect and prevent proxy attendance fraud</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/proxy-attendance-detection</strong> API — scans facial &amp; fingerprint attendance.</span>
          </div>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <div class="search-filter">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by staff name or ID..."
              [(ngModel)]="searchTerm"
              (input)="filterAlerts()">
          </div>
          <select [(ngModel)]="selectedRiskLevel" (change)="filterAlerts()" class="risk-filter">
            <option value="">All Risk Levels</option>
            <option value="high">High Risk (80-100)</option>
            <option value="medium">Medium Risk (50-79)</option>
            <option value="low">Low Risk (0-49)</option>
          </select>
          <select [(ngModel)]="selectedStatus" (change)="filterAlerts()" class="status-filter">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="fraud">Fraud</option>
            <option value="false-positive">False Positive</option>
          </select>
          <select [(ngModel)]="selectedMethod" (change)="filterAlerts()" class="method-filter">
            <option value="">All Methods</option>
            <option value="facial-recognition">Facial Recognition</option>
            <option value="biometric">Biometric</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div class="action-buttons-group">
          <button class="btn-secondary" (click)="runDetection()" [disabled]="isDetecting">
            <i class="material-icons">refresh</i>
            {{ isDetecting ? 'Detecting...' : 'Run Detection' }}
          </button>
          <button class="btn-secondary" (click)="bulkVerify()" [disabled]="selectedAlerts.length === 0">
            <i class="material-icons">verified</i>
            Bulk Verify ({{ selectedAlerts.length }})
          </button>
          <button class="btn-primary" (click)="exportReport()">
            <i class="material-icons">download</i>
            Export Report
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">security</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalAlerts }}</div>
            <div class="stat-label">Total Alerts</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">Pending Review</div>
          </div>
        </div>
        <div class="stat-card fraud">
          <div class="stat-icon">
            <i class="material-icons">error</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.fraud }}</div>
            <div class="stat-label">Confirmed Fraud</div>
          </div>
        </div>
        <div class="stat-card high-risk">
          <div class="stat-icon">
            <i class="material-icons">warning</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.highRisk }}</div>
            <div class="stat-label">High Risk</div>
          </div>
        </div>
      </div>

      <!-- Alerts List -->
      <div class="alerts-section">
        <div class="section-header">
          <h2>
            <i class="material-icons">list</i>
            Suspicious Attendance Alerts
            <span class="badge-count" *ngIf="filteredAlerts.length > 0">
              {{ filteredAlerts.length }}
            </span>
          </h2>
          <div class="section-actions">
            <label class="select-all-checkbox">
              <input 
                type="checkbox" 
                [checked]="isAllSelected()"
                (change)="toggleSelectAll()">
              Select All
            </label>
          </div>
        </div>

        <div class="alerts-list">
          <div 
            *ngFor="let alert of filteredAlerts" 
            class="alert-card"
            [ngClass]="{
              'alert-pending': alert.status === 'pending',
              'alert-verified': alert.status === 'verified',
              'alert-fraud': alert.status === 'fraud',
              'alert-false-positive': alert.status === 'false-positive',
              'risk-high': alert.riskScore >= 80,
              'risk-medium': alert.riskScore >= 50 && alert.riskScore < 80,
              'risk-low': alert.riskScore < 50
            }">
            <div class="alert-header">
              <div class="alert-checkbox">
                <input 
                  type="checkbox" 
                  [checked]="isSelected(alert.id)"
                  (change)="toggleSelection(alert.id)">
              </div>
              <div class="alert-staff-info">
                <h3>{{ alert.staffName }}</h3>
                <p class="staff-details">
                  <span class="staff-id">ID: {{ alert.staffId }}</span>
                  <span class="staff-dept">{{ alert.department }}</span>
                </p>
              </div>
              <div class="alert-badges">
                <span class="risk-score-badge" [ngClass]="getRiskScoreClass(alert.riskScore)">
                  Risk: {{ alert.riskScore }}%
                </span>
                <span class="status-badge" [ngClass]="'status-' + alert.status">
                  {{ getStatusLabel(alert.status) }}
                </span>
                <span class="method-badge" [ngClass]="'method-' + alert.attendanceMethod">
                  {{ getMethodLabel(alert.attendanceMethod) }}
                </span>
              </div>
            </div>

            <div class="alert-content">
              <div class="attendance-info">
                <div class="info-item">
                  <i class="material-icons">event</i>
                  <span class="label">Date:</span>
                  <span class="value">{{ formatDate(alert.attendanceDate) }}</span>
                </div>
                <div class="info-item">
                  <i class="material-icons">schedule</i>
                  <span class="label">Time:</span>
                  <span class="value">{{ alert.attendanceTime }}</span>
                </div>
                <div class="info-item">
                  <i class="material-icons">fingerprint</i>
                  <span class="label">Method:</span>
                  <span class="value">{{ getMethodLabel(alert.attendanceMethod) }}</span>
                </div>
              </div>

              <div class="suspicious-factors">
                <h4>
                  <i class="material-icons">warning</i>
                  Suspicious Factors ({{ alert.suspiciousFactors.length }})
                </h4>
                <div class="factors-list">
                  <div 
                    *ngFor="let factor of alert.suspiciousFactors" 
                    class="factor-item"
                    [ngClass]="'severity-' + factor.severity">
                    <div class="factor-header">
                      <span class="factor-type">{{ getFactorTypeLabel(factor.type) }}</span>
                      <span class="factor-severity" [ngClass]="'severity-' + factor.severity">
                        {{ factor.severity | titlecase }}
                      </span>
                    </div>
                    <p class="factor-description">{{ factor.description }}</p>
                    <div class="factor-confidence">
                      <span>Confidence: {{ factor.confidence }}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="evidence-section" *ngIf="alert.evidence && alert.evidence.length > 0">
                <h4>
                  <i class="material-icons">folder</i>
                  Evidence ({{ alert.evidence.length }})
                </h4>
                <div class="evidence-list">
                  <div *ngFor="let item of alert.evidence" class="evidence-item">
                    <i class="material-icons">{{ getEvidenceIcon(item.type) }}</i>
                    <span>{{ item.description }}</span>
                    <span class="evidence-time">{{ formatDateTime(item.timestamp) }}</span>
                  </div>
                </div>
              </div>

              <div class="verification-info" *ngIf="alert.verifiedAt">
                <div class="verified-by">
                  <i class="material-icons">verified_user</i>
                  <span>Verified by {{ alert.verifiedBy }} on {{ formatDateTime(alert.verifiedAt) }}</span>
                </div>
                <p class="verification-note" *ngIf="alert.notes">{{ alert.notes }}</p>
              </div>
            </div>

            <div class="alert-footer">
              <div class="alert-meta">
                <span class="detected-at">
                  <i class="material-icons">access_time</i>
                  Detected: {{ formatDateTime(alert.attendanceDate) }}
                </span>
              </div>
              <div class="alert-actions">
                <button 
                  class="btn-action verify" 
                  (click)="verifyAlert(alert)"
                  *ngIf="alert.status === 'pending'">
                  <i class="material-icons">verified</i>
                  Verify
                </button>
                <button 
                  class="btn-action mark-fraud" 
                  (click)="markAsFraud(alert)"
                  *ngIf="alert.status === 'pending'">
                  <i class="material-icons">error</i>
                  Mark as Fraud
                </button>
                <button 
                  class="btn-action false-positive" 
                  (click)="markAsFalsePositive(alert)"
                  *ngIf="alert.status === 'pending'">
                  <i class="material-icons">cancel</i>
                  False Positive
                </button>
                <button 
                  class="btn-action view" 
                  (click)="viewDetails(alert)">
                  <i class="material-icons">visibility</i>
                  View Details
                </button>
                <button 
                  class="btn-action investigate" 
                  (click)="investigate(alert)">
                  <i class="material-icons">search</i>
                  Investigate
                </button>
              </div>
            </div>
          </div>

          <div class="no-alerts" *ngIf="filteredAlerts.length === 0">
            <i class="material-icons">check_circle</i>
            <h3>No Suspicious Activity Detected</h3>
            <p *ngIf="loadError">{{ loadError }}</p>
            <p *ngIf="!loadError">Run detection to scan facial and fingerprint attendance records.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .proxy-attendance-detection-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .back-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #ecf0f1;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #2c3e50;
      font-size: 14px;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: #bdc3c7;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 28px;
      margin: 0 0 4px 0;
      color: #2c3e50;
    }

    .page-header h1 .material-icons {
      font-size: 32px;
      color: #e74c3c;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .api-banner {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      color: #1b5e20;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .api-banner .material-icons { font-size: 20px; color: #2e7d32; flex-shrink: 0; }

    .load-error {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #fdecea;
      border: 1px solid #f5c6cb;
      color: #721c24;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .search-filter {
      display: flex;
      gap: 12px;
      flex: 1;
      min-width: 300px;
    }

    .search-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-box .material-icons {
      position: absolute;
      left: 12px;
      color: #7f8c8d;
    }

    .search-box input {
      width: 100%;
      padding: 10px 12px 10px 40px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }

    .risk-filter,
    .status-filter,
    .method-filter {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .action-buttons-group {
      display: flex;
      gap: 12px;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #c0392b;
    }

    .btn-secondary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #ecf0f1;
      color: #2c3e50;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #bdc3c7;
    }

    .btn-secondary:disabled {
      background: #ecf0f1;
      color: #95a5a6;
      cursor: not-allowed;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-card.total .stat-icon {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .stat-card.pending .stat-icon {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .stat-card.fraud .stat-icon {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .stat-card.high-risk .stat-icon {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #2c3e50;
    }

    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .alerts-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      margin: 0;
      color: #2c3e50;
    }

    .badge-count {
      background: #e74c3c;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .select-all-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      color: #2c3e50;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .alert-card {
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s ease;
    }

    .alert-card.risk-high {
      border-left: 4px solid #e74c3c;
    }

    .alert-card.risk-medium {
      border-left: 4px solid #e67e22;
    }

    .alert-card.risk-low {
      border-left: 4px solid #f39c12;
    }

    .alert-card.alert-verified {
      background: #f8f9fa;
      opacity: 0.8;
    }

    .alert-card.alert-fraud {
      background: rgba(231, 76, 60, 0.05);
    }

    .alert-card.alert-false-positive {
      background: #f8f9fa;
      opacity: 0.6;
    }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .alert-checkbox {
      display: flex;
      align-items: center;
    }

    .alert-staff-info {
      flex: 1;
    }

    .alert-staff-info h3 {
      font-size: 18px;
      margin: 0 0 4px 0;
      color: #2c3e50;
    }

    .staff-details {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #7f8c8d;
      margin: 0;
    }

    .alert-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .risk-score-badge,
    .status-badge,
    .method-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .risk-score-badge.risk-high {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .risk-score-badge.risk-medium {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .risk-score-badge.risk-low {
      background: rgba(243, 156, 18, 0.1);
      color: #f39c12;
    }

    .status-pending {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .status-verified {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .status-fraud {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .status-false-positive {
      background: rgba(149, 165, 166, 0.1);
      color: #95a5a6;
    }

    .method-facial-recognition,
    .method-biometric,
    .method-manual {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .alert-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .attendance-info {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .info-item .material-icons {
      font-size: 18px;
      color: #7f8c8d;
    }

    .info-item .label {
      color: #7f8c8d;
    }

    .info-item .value {
      font-weight: 500;
      color: #2c3e50;
    }

    .suspicious-factors h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      margin: 0 0 12px 0;
      color: #2c3e50;
    }

    .factors-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .factor-item {
      background: white;
      border-radius: 8px;
      padding: 12px;
      border-left: 3px solid;
    }

    .factor-item.severity-high {
      border-left-color: #e74c3c;
    }

    .factor-item.severity-medium {
      border-left-color: #e67e22;
    }

    .factor-item.severity-low {
      border-left-color: #f39c12;
    }

    .factor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .factor-type {
      font-weight: 600;
      color: #2c3e50;
      font-size: 14px;
    }

    .factor-severity {
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 500;
    }

    .factor-severity.severity-high {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .factor-severity.severity-medium {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .factor-severity.severity-low {
      background: rgba(243, 156, 18, 0.1);
      color: #f39c12;
    }

    .factor-description {
      font-size: 13px;
      color: #7f8c8d;
      margin: 0 0 8px 0;
    }

    .factor-confidence {
      font-size: 12px;
      color: #7f8c8d;
    }

    .evidence-section h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      margin: 0 0 12px 0;
      color: #2c3e50;
    }

    .evidence-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .evidence-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: white;
      border-radius: 6px;
      font-size: 13px;
      color: #2c3e50;
    }

    .evidence-time {
      margin-left: auto;
      font-size: 11px;
      color: #7f8c8d;
    }

    .verification-info {
      padding: 12px;
      background: rgba(39, 174, 96, 0.1);
      border-radius: 8px;
      border-left: 3px solid #27ae60;
    }

    .verified-by {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #27ae60;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .verification-note {
      font-size: 12px;
      color: #7f8c8d;
      margin: 0;
    }

    .alert-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid #e9ecef;
    }

    .alert-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .alert-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .alert-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-action.verify {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .btn-action.verify:hover {
      background: rgba(39, 174, 96, 0.2);
    }

    .btn-action.mark-fraud {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .btn-action.mark-fraud:hover {
      background: rgba(231, 76, 60, 0.2);
    }

    .btn-action.false-positive {
      background: rgba(149, 165, 166, 0.1);
      color: #95a5a6;
    }

    .btn-action.false-positive:hover {
      background: rgba(149, 165, 166, 0.2);
    }

    .btn-action.view {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .btn-action.view:hover {
      background: rgba(52, 152, 219, 0.2);
    }

    .btn-action.investigate {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .btn-action.investigate:hover {
      background: rgba(155, 89, 182, 0.2);
    }

    .no-alerts {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .no-alerts .material-icons {
      font-size: 64px;
      color: #27ae60;
      margin-bottom: 16px;
    }

    .no-alerts h3 {
      font-size: 20px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .no-alerts p {
      margin: 0;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .action-bar {
        flex-direction: column;
      }

      .search-filter {
        width: 100%;
      }

      .attendance-info {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class ProxyAttendanceDetectionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  alerts: ProxyAttendanceAlert[] = [];
  filteredAlerts: ProxyAttendanceAlert[] = [];
  selectedAlerts: string[] = [];

  searchTerm = '';
  selectedRiskLevel = '';
  selectedStatus = '';
  selectedMethod = '';

  loadError = '';
  isLoading = false;
  isDetecting = false;

  stats: ProxyAttendanceStatistics = {
    totalAlerts: 0,
    pending: 0,
    verified: 0,
    fraud: 0,
    falsePositive: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private detectionService: ProxyAttendanceDetectionService
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAlerts(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.alerts = [];
      this.filteredAlerts = [];
      this.stats = {
        totalAlerts: 0,
        pending: 0,
        verified: 0,
        fraud: 0,
        falsePositive: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0
      };
      return;
    }

    const filter = this.buildFilter();

    this.detectionService
      .getAlerts(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: alerts => {
          this.alerts = alerts;
          this.filteredAlerts = applyAlertFilter(alerts, {
            riskLevel: this.selectedRiskLevel ? (this.selectedRiskLevel as 'high' | 'medium' | 'low') : undefined,
            status: this.selectedStatus ? (this.selectedStatus as AlertStatus) : undefined,
            attendanceMethod: this.selectedMethod ? (this.selectedMethod as AttendanceMethod) : undefined,
            searchTerm: this.searchTerm || undefined
          });
          this.isLoading = false;
        },
        error: err => {
          console.error('Error loading alerts:', err);
          this.loadError = 'Failed to load alerts from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });

    this.detectionService
      .getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
        },
        error: err => console.error('Error loading statistics:', err)
      });
  }

  filterAlerts(): void {
    this.loadAlerts();
  }

  private buildFilter() {
    return {
      riskLevel: this.selectedRiskLevel ? (this.selectedRiskLevel as 'high' | 'medium' | 'low') : undefined,
      status: this.selectedStatus ? (this.selectedStatus as AlertStatus) : undefined,
      attendanceMethod: this.selectedMethod ? (this.selectedMethod as AttendanceMethod) : undefined,
      searchTerm: this.searchTerm || undefined
    };
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'verified': 'Verified',
      'fraud': 'Fraud',
      'false-positive': 'False Positive'
    };
    return labels[status] || status;
  }

  getMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'facial-recognition': 'Facial Recognition',
      'biometric': 'Biometric',
      'manual': 'Manual'
    };
    return labels[method] || method;
  }

  getFactorTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'location-mismatch': 'Location Mismatch',
      'time-anomaly': 'Time Anomaly',
      'biometric-mismatch': 'Biometric Mismatch',
      'pattern-anomaly': 'Pattern Anomaly',
      'device-anomaly': 'Device Anomaly',
      'multiple-attempts': 'Multiple Attempts'
    };
    return labels[type] || type;
  }

  getEvidenceIcon(type: string): string {
    const icons: Record<string, string> = {
      'image': 'image',
      'video': 'videocam',
      'log': 'description',
      'location-data': 'location_on',
      'device-info': 'devices'
    };
    return icons[type] || 'folder';
  }

  getRiskScoreClass(score: number): string {
    if (score >= 80) return 'risk-high';
    if (score >= 50) return 'risk-medium';
    return 'risk-low';
  }

  isSelected(alertId: string): boolean {
    return this.selectedAlerts.includes(alertId);
  }

  toggleSelection(alertId: string): void {
    const index = this.selectedAlerts.indexOf(alertId);
    if (index > -1) {
      this.selectedAlerts.splice(index, 1);
    } else {
      this.selectedAlerts.push(alertId);
    }
  }

  isAllSelected(): boolean {
    return this.filteredAlerts.length > 0 && 
           this.selectedAlerts.length === this.filteredAlerts.length;
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedAlerts = [];
    } else {
      this.selectedAlerts = this.filteredAlerts.map(a => a.id);
    }
  }

  runDetection(): void {
    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      return;
    }

    this.isDetecting = true;
    this.detectionService
      .runDetection()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isDetecting = false;
          if (!result.success) {
            window.alert(result.message);
            return;
          }
          window.alert(
            result.newAlerts && result.newAlerts > 0
              ? `Detection complete. ${result.newAlerts} new alert(s) found.`
              : 'Detection complete. No new suspicious attendance found.'
          );
          this.loadAlerts();
        },
        error: err => {
          console.error('Detection failed:', err);
          this.isDetecting = false;
          window.alert('Failed to run detection. Ensure the backend is running.');
        }
      });
  }

  verifyAlert(alert: ProxyAttendanceAlert): void {
    const note = window.prompt('Enter verification note (optional):');
    if (note === null) return;

    this.detectionService
      .verifyAlert(alert.id, note || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.selectedAlerts = this.selectedAlerts.filter(id => id !== alert.id);
          this.loadAlerts();
        },
        error: err => {
          console.error('Verify failed:', err);
          window.alert('Failed to verify alert.');
        }
      });
  }

  markAsFraud(alert: ProxyAttendanceAlert): void {
    if (!window.confirm(`Mark attendance as fraud for ${alert.staffName}?`)) return;

    this.detectionService
      .markAsFraud(alert.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.selectedAlerts = this.selectedAlerts.filter(id => id !== alert.id);
          this.loadAlerts();
        },
        error: err => {
          console.error('Mark fraud failed:', err);
          window.alert('Failed to mark as fraud.');
        }
      });
  }

  markAsFalsePositive(alert: ProxyAttendanceAlert): void {
    if (!window.confirm(`Mark as false positive for ${alert.staffName}?`)) return;

    this.detectionService
      .markAsFalsePositive(alert.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.selectedAlerts = this.selectedAlerts.filter(id => id !== alert.id);
          this.loadAlerts();
        },
        error: err => {
          console.error('Mark false positive failed:', err);
          window.alert('Failed to mark as false positive.');
        }
      });
  }

  bulkVerify(): void {
    if (this.selectedAlerts.length === 0) return;

    if (!window.confirm(`Verify ${this.selectedAlerts.length} selected alert(s)?`)) return;

    this.detectionService
      .bulkVerify(this.selectedAlerts)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if (!result.success) {
            window.alert(result.message);
            return;
          }
          this.selectedAlerts = [];
          this.loadAlerts();
        },
        error: err => {
          console.error('Bulk verify failed:', err);
          window.alert('Failed to bulk verify alerts.');
        }
      });
  }

  viewDetails(alert: ProxyAttendanceAlert): void {
    const details = `
Staff: ${alert.staffName} (${alert.staffId})
Department: ${alert.department}
Date: ${this.formatDate(alert.attendanceDate)}
Time: ${alert.attendanceTime}
Method: ${this.getMethodLabel(alert.attendanceMethod)}
Risk Score: ${alert.riskScore}%
Status: ${this.getStatusLabel(alert.status)}
Suspicious Factors: ${alert.suspiciousFactors.length}
    `;
    window.alert(details);
  }

  investigate(alert: ProxyAttendanceAlert): void {
    this.viewDetails(alert);
  }

  exportReport(): void {
    if (this.filteredAlerts.length === 0) {
      window.alert('No alerts to export.');
      return;
    }

    const csv = alertsToCsv(this.filteredAlerts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proxy-attendance-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private resolveSocietyId(): string {
    const direct = localStorage.getItem('societyId');
    if (direct) return direct;
    try {
      const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
      return raw ? JSON.parse(raw).societyId ?? '' : '';
    } catch {
      return '';
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/guard-management']);
  }
}

