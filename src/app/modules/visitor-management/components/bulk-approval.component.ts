import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  Visitor,
  VisitorStatus
} from '../models/visitor.model';
import {
  BulkApprovalRequest,
  BulkApprovalResponse
} from '../models/bulk-approval.model';

@Component({
  selector: 'app-bulk-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bulk-approval-container">
      <div class="page-header">
        <button class="btn-back" routerLink="/admin/visitors/list">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1><i class="material-icons">event</i> Bulk Visitor Approval for Events</h1>
        <p>Approve multiple visitors at once for events and gatherings</p>
      </div>

      <!-- Event Filter Section -->
      <div class="filter-card">
        <h3><i class="material-icons">filter_list</i> Filter Visitors by Event</h3>
        
        <div class="filter-options">
          <div class="filter-tabs">
            <button 
              class="filter-tab" 
              [class.active]="filterMode === 'date'"
              (click)="filterMode = 'date'">
              <i class="material-icons">calendar_today</i>
              By Date
            </button>
            <button 
              class="filter-tab" 
              [class.active]="filterMode === 'name'"
              (click)="filterMode = 'name'">
              <i class="material-icons">event</i>
              By Event Name
            </button>
          </div>

          <div class="filter-inputs">
            <div class="filter-input-group" *ngIf="filterMode === 'date'">
              <label for="eventDate">Event Date</label>
              <input 
                type="date" 
                id="eventDate"
                [(ngModel)]="eventDateString"
                (change)="loadVisitorsByDate()"
                [max]="maxDate">
            </div>

            <div class="filter-input-group" *ngIf="filterMode === 'name'">
              <label for="eventName">Event Name</label>
              <input 
                type="text" 
                id="eventName"
                [(ngModel)]="eventName"
                (input)="loadVisitorsByName()"
                placeholder="e.g., Annual Party, Wedding, Meeting">
            </div>
          </div>
        </div>
      </div>

      <!-- Selection Summary -->
      <div class="selection-summary" *ngIf="availableVisitors.length > 0">
        <div class="summary-info">
          <span class="count-badge">{{ selectedVisitors.length }}</span>
          <span>of {{ availableVisitors.length }} visitors selected</span>
        </div>
        <div class="summary-actions">
          <button 
            class="btn-select-all" 
            (click)="selectAll()"
            *ngIf="selectedVisitors.length < availableVisitors.length">
            <i class="material-icons">select_all</i>
            Select All
          </button>
          <button 
            class="btn-deselect-all" 
            (click)="deselectAll()"
            *ngIf="selectedVisitors.length > 0">
            <i class="material-icons">deselect</i>
            Deselect All
          </button>
        </div>
      </div>

      <!-- Visitors List -->
      <div class="visitors-list-section" *ngIf="!isLoading && availableVisitors.length > 0">
        <div class="visitor-cards">
          <div 
            *ngFor="let visitor of availableVisitors" 
            class="visitor-card"
            [class.selected]="isSelected(visitor.id)"
            (click)="toggleSelection(visitor.id)">
            <div class="card-checkbox">
              <input 
                type="checkbox" 
                [checked]="isSelected(visitor.id)"
                (change)="toggleSelection(visitor.id)"
                (click)="$event.stopPropagation()">
            </div>
            
            <div class="card-content">
              <div class="visitor-header">
                <div class="visitor-avatar">
                  {{ visitor.name.charAt(0).toUpperCase() }}
                </div>
                <div class="visitor-info">
                  <h4>{{ visitor.name }}</h4>
                  <p class="visitor-phone">
                    <i class="material-icons">phone</i>
                    {{ visitor.phone }}
                  </p>
                </div>
              </div>

              <div class="visitor-details">
                <div class="detail-item">
                  <i class="material-icons">home</i>
                  <span>{{ visitor.visitingFlat }} <span *ngIf="visitor.visitingUnit">- {{ visitor.visitingUnit }}</span></span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">description</i>
                  <span>{{ visitor.purpose }}</span>
                </div>
                <div class="detail-item">
                  <i class="material-icons">event</i>
                  <span>{{ formatDate(visitor.visitDate) }} at {{ visitor.visitTime }}</span>
                </div>
                <div class="detail-item" *ngIf="visitor.numberOfVisitors && visitor.numberOfVisitors > 1">
                  <i class="material-icons">group</i>
                  <span>{{ visitor.numberOfVisitors }} visitors</span>
                </div>
                <div class="detail-item" *ngIf="visitor.vehicleNumber">
                  <i class="material-icons">directions_car</i>
                  <span>{{ visitor.vehicleNumber }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && availableVisitors.length === 0">
        <i class="material-icons">event_busy</i>
        <h3>No Visitors Found</h3>
        <p>{{ filterMode === 'date' && !eventDateString ? 'Select an event date to view visitors' : 'No pending visitors found for this event' }}</p>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading visitors...</p>
      </div>

      <!-- Approval Actions -->
      <div class="approval-actions" *ngIf="selectedVisitors.length > 0 && !isApproving">
        <div class="action-options">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              [(ngModel)]="autoGenerateQR"
              [checked]="autoGenerateQR">
            <span>Auto-generate QR codes for approved visitors</span>
          </label>
        </div>
        
        <div class="action-inputs">
          <div class="form-group">
            <label for="eventNotes">Event Notes (Optional)</label>
            <input 
              type="text" 
              id="eventNotes"
              [(ngModel)]="eventNotes"
              placeholder="e.g., Annual Society Party 2024">
          </div>
        </div>

        <div class="action-buttons">
          <button 
            class="btn-secondary" 
            (click)="deselectAll()">
            <i class="material-icons">clear</i>
            Clear Selection
          </button>
          <button 
            class="btn-primary" 
            (click)="approveSelected()"
            [disabled]="selectedVisitors.length === 0">
            <i class="material-icons">check_circle</i>
            Approve {{ selectedVisitors.length }} Visitor(s)
          </button>
        </div>
      </div>

      <!-- Approval Progress -->
      <div class="approval-progress" *ngIf="isApproving">
        <div class="progress-content">
          <i class="material-icons">sync</i>
          <h3>Approving Visitors...</h3>
          <p>Please wait while we process your request</p>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
      </div>

      <!-- Approval Results Modal -->
      <div class="modal-overlay" *ngIf="approvalResult" (click)="closeResultModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header" [ngClass]="approvalResult.success ? 'success' : 'warning'">
            <i class="material-icons">{{ approvalResult.success ? 'check_circle' : 'warning' }}</i>
            <h2>{{ approvalResult.success ? 'Approval Complete!' : 'Partial Approval' }}</h2>
          </div>
          <div class="modal-body">
            <div class="result-summary">
              <div class="result-stat">
                <div class="stat-value success">{{ approvalResult.approved }}</div>
                <div class="stat-label">Approved</div>
              </div>
              <div class="result-stat" *ngIf="approvalResult.failed > 0">
                <div class="stat-value failed">{{ approvalResult.failed }}</div>
                <div class="stat-label">Failed</div>
              </div>
              <div class="result-stat">
                <div class="stat-value total">{{ approvalResult.totalRequested }}</div>
                <div class="stat-label">Total</div>
              </div>
            </div>

            <p class="result-message">{{ approvalResult.message }}</p>

            <div class="failed-list" *ngIf="approvalResult.failedVisitors && approvalResult.failedVisitors.length > 0">
              <h4>Failed Approvals:</h4>
              <ul>
                <li *ngFor="let failure of approvalResult.failedVisitors">
                  <strong>{{ failure.visitorName }}</strong>: {{ failure.reason }}
                </li>
              </ul>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeResultModal()">Close</button>
            <button class="btn-primary" (click)="viewApprovedVisitors()" *ngIf="approvalResult.approved > 0">
              <i class="material-icons">list</i>
              View Approved Visitors
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bulk-approval-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .btn-back {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      padding: 8px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .btn-back:hover {
      background: #f5f5f5;
      border-radius: 8px;
    }

    .page-header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    /* Filter Card */
    .filter-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .filter-card h3 {
      margin: 0 0 20px 0;
      font-size: 20px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-card h3 .material-icons {
      color: #667eea;
    }

    .filter-tabs {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .filter-tab {
      flex: 1;
      padding: 12px 20px;
      background: #f5f5f5;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .filter-tab:hover {
      background: #e8e8e8;
    }

    .filter-tab.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .filter-inputs {
      display: flex;
      gap: 20px;
    }

    .filter-input-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-input-group label {
      font-weight: 500;
      color: #2c3e50;
      font-size: 14px;
    }

    .filter-input-group input {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.2s;
    }

    .filter-input-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    /* Selection Summary */
    .selection-summary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .summary-info {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
    }

    .count-badge {
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 18px;
    }

    .summary-actions {
      display: flex;
      gap: 12px;
    }

    .btn-select-all,
    .btn-deselect-all {
      background: rgba(255,255,255,0.2);
      border: 2px solid rgba(255,255,255,0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-select-all:hover,
    .btn-deselect-all:hover {
      background: rgba(255,255,255,0.3);
    }

    /* Visitors List */
    .visitors-list-section {
      margin-bottom: 24px;
    }

    .visitor-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
    }

    .visitor-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      gap: 12px;
      border: 2px solid transparent;
    }

    .visitor-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .visitor-card.selected {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }

    .card-checkbox {
      display: flex;
      align-items: flex-start;
      padding-top: 4px;
    }

    .card-checkbox input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .card-content {
      flex: 1;
    }

    .visitor-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .visitor-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 18px;
    }

    .visitor-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .visitor-phone {
      margin: 0;
      font-size: 13px;
      color: #7f8c8d;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .visitor-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #2c3e50;
    }

    .detail-item .material-icons {
      font-size: 16px;
      color: #667eea;
    }

    /* Approval Actions */
    .approval-actions {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      position: sticky;
      bottom: 24px;
      z-index: 10;
    }

    .action-options {
      margin-bottom: 20px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .action-inputs {
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-weight: 500;
      color: #2c3e50;
      font-size: 14px;
    }

    .form-group input {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn-primary,
    .btn-secondary {
      padding: 14px 28px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
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
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    /* Approval Progress */
    .approval-progress {
      background: white;
      border-radius: 16px;
      padding: 60px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }

    .progress-content .material-icons {
      font-size: 64px;
      color: #667eea;
      margin-bottom: 16px;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .progress-content h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .progress-content p {
      margin: 0 0 24px 0;
      color: #7f8c8d;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      animation: progress 2s ease-in-out infinite;
    }

    @keyframes progress {
      0% { width: 0%; }
      50% { width: 70%; }
      100% { width: 100%; }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: modalAppear 0.3s ease;
    }

    @keyframes modalAppear {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header.success {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white;
      border-bottom: none;
      border-radius: 16px 16px 0 0;
    }

    .modal-header.warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      border-bottom: none;
      border-radius: 16px 16px 0 0;
    }

    .modal-header .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 24px;
    }

    .modal-body {
      padding: 24px;
    }

    .result-summary {
      display: flex;
      justify-content: space-around;
      margin-bottom: 24px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .result-stat {
      text-align: center;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .stat-value.success {
      color: #28a745;
    }

    .stat-value.failed {
      color: #dc3545;
    }

    .stat-value.total {
      color: #667eea;
    }

    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .result-message {
      text-align: center;
      font-size: 16px;
      color: #2c3e50;
      margin-bottom: 20px;
    }

    .failed-list {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 16px;
      margin-top: 20px;
    }

    .failed-list h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #856404;
    }

    .failed-list ul {
      margin: 0;
      padding-left: 20px;
    }

    .failed-list li {
      margin-bottom: 8px;
      font-size: 13px;
      color: #856404;
    }

    .modal-actions {
      padding: 16px 24px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    /* Empty and Loading States */
    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0;
      color: #7f8c8d;
    }

    @media (max-width: 768px) {
      .bulk-approval-container {
        padding: 16px;
      }

      .visitor-cards {
        grid-template-columns: 1fr;
      }

      .filter-tabs {
        flex-direction: column;
      }

      .selection-summary {
        flex-direction: column;
        gap: 16px;
      }

      .action-buttons {
        flex-direction: column;
      }

      .btn-primary,
      .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class BulkApprovalComponent implements OnInit {
  availableVisitors: Visitor[] = [];
  selectedVisitors: string[] = [];
  isLoading = false;
  isApproving = false;
  approvalResult: BulkApprovalResponse | null = null;

  filterMode: 'date' | 'name' = 'date';
  eventDateString: string = '';
  eventName: string = '';
  eventNotes: string = '';
  autoGenerateQR: boolean = true;

  maxDate: string = '';

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set max date to today
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0];
    this.eventDateString = this.maxDate;
    
    // Load visitors for today by default
    this.loadVisitorsByDate();
  }

  loadVisitorsByDate(): void {
    if (!this.eventDateString) return;

    this.isLoading = true;
    this.selectedVisitors = [];
    const eventDate = new Date(this.eventDateString);

    this.visitorService.getVisitorsByEventDate(eventDate).subscribe({
      next: (visitors) => {
        this.availableVisitors = visitors;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading visitors:', error);
        this.isLoading = false;
      }
    });
  }

  loadVisitorsByName(): void {
    if (!this.eventName || this.eventName.trim().length < 2) {
      this.availableVisitors = [];
      return;
    }

    this.isLoading = true;
    this.selectedVisitors = [];

    this.visitorService.getVisitorsByEventName(this.eventName).subscribe({
      next: (visitors) => {
        this.availableVisitors = visitors;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading visitors:', error);
        this.isLoading = false;
      }
    });
  }

  toggleSelection(visitorId: string): void {
    const index = this.selectedVisitors.indexOf(visitorId);
    if (index > -1) {
      this.selectedVisitors.splice(index, 1);
    } else {
      this.selectedVisitors.push(visitorId);
    }
  }

  isSelected(visitorId: string): boolean {
    return this.selectedVisitors.includes(visitorId);
  }

  selectAll(): void {
    this.selectedVisitors = this.availableVisitors.map(v => v.id);
  }

  deselectAll(): void {
    this.selectedVisitors = [];
  }

  approveSelected(): void {
    if (this.selectedVisitors.length === 0) return;

    const eventDate = this.filterMode === 'date' && this.eventDateString 
      ? new Date(this.eventDateString) 
      : undefined;

    const request: BulkApprovalRequest = {
      visitorIds: this.selectedVisitors,
      eventName: this.eventName || this.eventNotes || undefined,
      eventDate: eventDate,
      notes: this.eventNotes,
      autoGenerateQR: this.autoGenerateQR
    };

    this.isApproving = true;
    this.approvalResult = null;

    this.visitorService.bulkApproveVisitors(request).subscribe({
      next: (response) => {
        this.isApproving = false;
        this.approvalResult = response;
        
        // Reload visitors to reflect changes
        if (this.filterMode === 'date') {
          this.loadVisitorsByDate();
        } else {
          this.loadVisitorsByName();
        }
      },
      error: (error) => {
        console.error('Error approving visitors:', error);
        this.isApproving = false;
        alert('An error occurred while approving visitors. Please try again.');
      }
    });
  }

  closeResultModal(): void {
    this.approvalResult = null;
    this.selectedVisitors = [];
  }

  viewApprovedVisitors(): void {
    this.closeResultModal();
    this.router.navigate(['/admin/visitors/list'], { 
      queryParams: { status: 'approved' } 
    });
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}

