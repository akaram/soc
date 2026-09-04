import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { IVRService } from '../services/ivr.service';
import {
  IVRCall,
  ApprovalRequest,
  IVRFlow,
  IVRCallStatus,
  IVRCallType,
  IVRAction,
  ApprovalStatus,
  IVRStatistics,
  IVRFilter
} from '../models/ivr.model';

@Component({
  selector: 'app-ivr-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="ivr-container">
      <div class="page-header">
        <h1><i class="material-icons">phone_in_talk</i> IVR - Interactive Voice Response</h1>
        <p>Manage voice-based approvals and gate access via phone</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Live data from <strong>/ivr</strong> and <strong>/visitors</strong> APIs — no demo records.</span>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">phone</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics ? statistics.totalCalls : 0 }}</div>
            <div class="stat-label">Total Calls</div>
          </div>
        </div>
        <div class="stat-card today">
          <div class="stat-icon">
            <i class="material-icons">today</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics ? statistics.callsToday : 0 }}</div>
            <div class="stat-label">Calls Today</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <i class="material-icons">call</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics ? statistics.activeCalls : 0 }}</div>
            <div class="stat-label">Active Calls</div>
          </div>
        </div>
        <div class="stat-card approvals">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics ? statistics.approvedViaIVR : 0 }}</div>
            <div class="stat-label">Approved via IVR</div>
          </div>
        </div>
        <div class="stat-card duration">
          <div class="stat-icon">
            <i class="material-icons">timer</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatDuration(statistics ? statistics.averageCallDuration : 0) }}</div>
            <div class="stat-label">Avg Duration</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs">
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'calls'"
            (click)="activeTab = 'calls'">
            <i class="material-icons">phone</i>
            Call History
          </button>
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'approvals'"
            (click)="activeTab = 'approvals'">
            <i class="material-icons">pending_actions</i>
            Pending Approvals
          </button>
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'flows'"
            (click)="activeTab = 'flows'">
            <i class="material-icons">settings_voice</i>
            IVR Flows
          </button>
        </div>
      </div>

      <!-- Call History Tab -->
      <div class="tab-content" *ngIf="activeTab === 'calls'">
        <div class="filters-bar">
          <select [(ngModel)]="filter.callType" (change)="applyFilters()" class="filter-select">
            <option value="">All Call Types</option>
            <option [value]="IVRCallType.APPROVAL_REQUEST">Approval Request</option>
            <option [value]="IVRCallType.VISITOR_ENTRY">Visitor Entry</option>
            <option [value]="IVRCallType.DELIVERY_ENTRY">Delivery Entry</option>
            <option [value]="IVRCallType.EMERGENCY">Emergency</option>
            <option [value]="IVRCallType.INFORMATION">Information</option>
          </select>
          <select [(ngModel)]="filter.status" (change)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option [value]="IVRCallStatus.COMPLETED">Completed</option>
            <option [value]="IVRCallStatus.FAILED">Failed</option>
            <option [value]="IVRCallStatus.TIMEOUT">Timeout</option>
          </select>
          <input 
            type="text" 
            placeholder="Search by phone, name..." 
            [(ngModel)]="filter.searchTerm"
            (input)="applyFilters()"
            class="search-input">
        </div>

        <div class="calls-list" *ngIf="!isLoading && calls.length > 0">
          <div *ngFor="let call of calls" class="call-card">
            <div class="call-header">
              <div class="call-info">
                <div class="call-phone">{{ call.callerPhone }}</div>
                <div class="call-meta">
                  <span class="call-type">{{ call.callType }}</span>
                  <span class="call-time">{{ formatDateTime(call.startTime) }}</span>
                </div>
              </div>
              <div class="status-badge" [ngClass]="getStatusClass(call.status)">
                {{ call.status }}
              </div>
            </div>

            <div class="call-details" *ngIf="call.approvalRequest">
              <div class="detail-row">
                <label>Request:</label>
                  <span>{{ call.approvalRequest.requestType }} - {{ getApprovalName(call.approvalRequest) }}</span>
              </div>
              <div class="detail-row" *ngIf="call.approvalRequest.flatNumber">
                <label>Flat:</label>
                <span>{{ call.approvalRequest.flatNumber }}</span>
              </div>
              <div class="detail-row" *ngIf="call.approvalAction">
                <label>Action:</label>
                <span class="action-badge" [ngClass]="getActionClass(call.approvalAction!)">
                  {{ call.approvalAction }}
                </span>
              </div>
            </div>

            <div class="call-footer">
              <div class="call-stats">
                <span *ngIf="call.duration">Duration: {{ formatDuration(call.duration) }}</span>
                <span *ngIf="call.selectedOptions.length">Options: {{ call.selectedOptions.join(', ') }}</span>
              </div>
              <button class="btn-view" (click)="viewCallDetails(call)">
                <i class="material-icons">visibility</i>
                View Details
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!isLoading && calls.length === 0">
          <i class="material-icons">phone</i>
          <p>No calls found</p>
        </div>
      </div>

      <!-- Pending Approvals Tab -->
      <div class="tab-content" *ngIf="activeTab === 'approvals'">
        <div class="approvals-list" *ngIf="pendingApprovals.length > 0">
          <div *ngFor="let approval of pendingApprovals" class="approval-card">
            <div class="approval-header">
              <div class="approval-info">
                <div class="approval-title">{{ approval.requestType }} Request</div>
                <div class="approval-meta">
                  <span>{{ approval.requesterName }}</span>
                  <span>{{ approval.requesterPhone }}</span>
                  <span *ngIf="approval.flatNumber">{{ approval.flatNumber }}</span>
                </div>
              </div>
              <div class="approval-actions">
                <button class="btn-call" (click)="initiateIVRCall(approval)">
                  <i class="material-icons">phone</i>
                  Call for Approval
                </button>
              </div>
            </div>

            <div class="approval-details">
              <div class="detail-grid">
                <div class="detail-item" *ngIf="approval.visitorName">
                  <label>Visitor Name</label>
                  <span>{{ approval.visitorName }}</span>
                </div>
                <div class="detail-item" *ngIf="approval.visitorPhone">
                  <label>Visitor Phone</label>
                  <span>{{ approval.visitorPhone }}</span>
                </div>
                <div class="detail-item" *ngIf="approval.vehicleNumber">
                  <label>Vehicle Number</label>
                  <span>{{ approval.vehicleNumber }}</span>
                </div>
                <div class="detail-item" *ngIf="approval.purpose">
                  <label>Purpose</label>
                  <span>{{ approval.purpose }}</span>
                </div>
                <div class="detail-item">
                  <label>Requested At</label>
                  <span>{{ formatDateTime(approval.requestedAt) }}</span>
                </div>
                <div class="detail-item">
                  <label>Gate</label>
                  <span>{{ approval.gateName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="pendingApprovals.length === 0">
          <i class="material-icons">check_circle</i>
          <p>No pending approvals</p>
        </div>
      </div>

      <!-- IVR Flows Tab -->
      <div class="tab-content" *ngIf="activeTab === 'flows'">
        <div class="flows-list" *ngIf="flows.length > 0">
          <div *ngFor="let flow of flows" class="flow-card">
            <div class="flow-header">
              <div class="flow-info">
                <div class="flow-name">{{ flow.name }}</div>
                <div class="flow-description">{{ flow.description }}</div>
              </div>
              <div class="flow-status" [ngClass]="flow.isActive ? 'active' : 'inactive'">
                {{ flow.isActive ? 'Active' : 'Inactive' }}
              </div>
            </div>

            <div class="flow-menus">
              <h4>Menus</h4>
              <div *ngFor="let menu of flow.menus" class="menu-item">
                <div class="menu-name">{{ menu.name }}</div>
                <div class="menu-prompt">{{ menu.prompt }}</div>
                <div class="menu-options">
                  <div *ngFor="let option of menu.options" class="option-item">
                    <span class="option-key">{{ option.key }}</span>
                    <span class="option-label">{{ option.label }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flow-actions">
              <button class="btn-edit" (click)="editFlow(flow)">
                <i class="material-icons">edit</i>
                Edit Flow
              </button>
              <button class="btn-test" (click)="testFlow(flow)">
                <i class="material-icons">play_arrow</i>
                Test Flow
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading...</p>
      </div>
    </div>
  `,
  styles: [`
    .ivr-container {
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
      margin-top: 12px;
      padding: 10px 14px;
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #2e7d32;
    }

    .api-banner .material-icons {
      font-size: 18px;
    }

    .load-error {
      margin-bottom: 16px;
      padding: 12px 16px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #856404;
      font-size: 14px;
    }

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card.today .stat-icon {
      background: #17a2b8;
    }

    .stat-card.active .stat-icon {
      background: #28a745;
    }

    .stat-card.approvals .stat-icon {
      background: #ffc107;
    }

    .stat-card.duration .stat-icon {
      background: #f5576c;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .tabs-container {
      margin-bottom: 24px;
    }

    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e0e0e0;
    }

    .tab-button {
      padding: 12px 24px;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      font-size: 15px;
      font-weight: 600;
      color: #7f8c8d;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .tab-button:hover {
      color: #2c3e50;
    }

    .tab-button.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .tab-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .filters-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .filter-select,
    .search-input {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
    }

    .calls-list,
    .approvals-list,
    .flows-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .call-card,
    .approval-card,
    .flow-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid #e0e0e0;
    }

    .call-header,
    .approval-header,
    .flow-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e0e0e0;
    }

    .call-phone {
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .call-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .call-type {
      text-transform: uppercase;
      font-weight: 600;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.completed {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.failed {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.timeout {
      background: #fff3cd;
      color: #856404;
    }

    .call-details {
      margin-bottom: 16px;
      padding: 16px;
      background: white;
      border-radius: 8px;
    }

    .detail-row {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .detail-row label {
      font-weight: 600;
      color: #7f8c8d;
      min-width: 80px;
    }

    .action-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .action-badge.approve {
      background: #d4edda;
      color: #155724;
    }

    .action-badge.reject {
      background: #f8d7da;
      color: #721c24;
    }

    .call-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .call-stats {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .btn-view {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .approval-title {
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .approval-meta {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .approval-actions {
      display: flex;
      gap: 12px;
    }

    .btn-call {
      padding: 12px 24px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-call:hover {
      background: #218838;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .approval-details {
      margin-top: 16px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item label {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .detail-item span {
      font-size: 15px;
      color: #2c3e50;
      font-weight: 500;
    }

    .flow-name {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .flow-description {
      font-size: 14px;
      color: #7f8c8d;
    }

    .flow-status {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .flow-status.active {
      background: #d4edda;
      color: #155724;
    }

    .flow-status.inactive {
      background: #e2e3e5;
      color: #383d41;
    }

    .flow-menus {
      margin: 16px 0;
    }

    .flow-menus h4 {
      font-size: 16px;
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .menu-item {
      background: white;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .menu-name {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .menu-prompt {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 12px;
      font-style: italic;
    }

    .menu-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .option-key {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }

    .option-label {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .flow-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #e0e0e0;
    }

    .btn-edit,
    .btn-test {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-edit {
      background: #667eea;
      color: white;
    }

    .btn-edit:hover {
      background: #5568d3;
    }

    .btn-test {
      background: #ffc107;
      color: #2c3e50;
    }

    .btn-test:hover {
      background: #e0a800;
    }

    .empty-state,
    .loading-state {
      text-align: center;
      padding: 60px 20px;
      color: #7f8c8d;
    }

    .empty-state .material-icons,
    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state p,
    .loading-state p {
      margin: 0;
      font-size: 16px;
    }
  `]
})
export class IVRManagementComponent implements OnInit {
  calls: IVRCall[] = [];
  pendingApprovals: ApprovalRequest[] = [];
  flows: IVRFlow[] = [];
  statistics: IVRStatistics | null = null;
  isLoading = false;
  loadError = '';
  activeTab: 'calls' | 'approvals' | 'flows' = 'calls';
  filter: IVRFilter = {};

  IVRCallStatus = IVRCallStatus;
  IVRCallType = IVRCallType;
  ApprovalStatus = ApprovalStatus;

  constructor(
    private ivrService: IVRService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadPendingApprovals();
    this.loadFlows();
  }

  loadData(): void {
    this.isLoading = true;
    this.loadError = '';

    const societyId = localStorage.getItem('societyId') ||
      (() => {
        try {
          const raw = sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');
          return raw ? JSON.parse(raw).societyId : '';
        } catch { return ''; }
      })();

    if (!societyId) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.calls = [];
      this.statistics = null;
      return;
    }

    this.ivrService.getAllCalls(this.filter).subscribe({
      next: (calls) => {
        this.calls = calls;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading calls:', error);
        this.loadError = 'Failed to load IVR calls from the API. Ensure the backend is running.';
        this.isLoading = false;
      }
    });

    this.ivrService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  loadPendingApprovals(): void {
    this.ivrService.getAllApprovalRequests().subscribe({
      next: (approvals) => {
        this.pendingApprovals = approvals.filter(a => a.status === ApprovalStatus.PENDING);
      },
      error: (error) => {
        console.error('Error loading approvals:', error);
      }
    });
  }

  loadFlows(): void {
    this.ivrService.getFlows().subscribe({
      next: (flows) => {
        this.flows = flows;
      },
      error: (error) => {
        console.error('Error loading flows:', error);
      }
    });
  }

  applyFilters(): void {
    this.loadData();
  }

  initiateIVRCall(approval: ApprovalRequest): void {
    if (confirm(`Initiate IVR call to ${approval.requesterPhone} for approval?`)) {
      this.ivrService.initiateCall({
        callerPhone: approval.requesterPhone,
        callerName: approval.requesterName,
        callType: IVRCallType.APPROVAL_REQUEST,
        approvalRequestId: approval.id,
        gateId: approval.gateId
      }).subscribe({
        next: (response) => {
          if (response.success) {
            alert('IVR call initiated! The caller will receive voice prompts for approval.');
            this.loadData();
            this.loadPendingApprovals();
          } else {
            alert(response.message || 'Failed to initiate call');
          }
        },
        error: (error) => {
          console.error('Error initiating call:', error);
          alert('An error occurred while initiating the call');
        }
      });
    }
  }

  viewCallDetails(call: IVRCall): void {
    this.router.navigate(['/admin/gate-security/ivr', call.id]);
  }

  editFlow(flow: IVRFlow): void {
    alert(`Edit flow: ${flow.name}`);
  }

  testFlow(flow: IVRFlow): void {
    alert(`Test flow: ${flow.name}`);
  }

  getStatusClass(status: IVRCallStatus): string {
    return status.toLowerCase().replace('_', '-');
  }

  getActionClass(action: IVRAction | string | undefined): string {
    if (!action) return '';
    return String(action).toLowerCase();
  }

  getApprovalDisplayName(approval: ApprovalRequest): string {
    if (!approval) return 'N/A';
    const visitorName = approval.visitorName || '';
    const requesterName = approval.requesterName || '';
    const name = visitorName || requesterName || 'N/A';
    return `${approval.requestType} - ${name}`;
  }

  getApprovalName(approval: ApprovalRequest): string {
    return approval.visitorName || approval.requesterName || 'N/A';
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

