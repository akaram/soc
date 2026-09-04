import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LeaveManagementService } from '../services/leave-management.service';
import {
  LeaveRequest,
  LeaveBalance,
  LeaveStatistics,
  LeaveStaffMember,
  LeaveType,
  LeaveStatus
} from '../models/leave-management.model';
import {
  applyLeaveFilter,
  getMonthRange
} from '../services/leave-management-api.mapper';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="leave-management-container">
      <div class="page-header">
        <button class="back-button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Dashboard
        </button>
        <div>
          <h1>
            <i class="material-icons">event_available</i>
            Leave Management
          </h1>
          <p>Manage staff leave requests, approvals, and balances</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/leave-management</strong> API — no demo records.</span>
          </div>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="form-panel" *ngIf="showCreatePanel">
        <h3><i class="material-icons">add</i> Create Leave Request</h3>
        <div class="form-grid">
          <select [(ngModel)]="createForm.staffId">
            <option value="">Select staff</option>
            <option *ngFor="let staff of staffMembers" [value]="staff.id">
              {{ staff.name }} ({{ staff.department }})
            </option>
          </select>
          <select [(ngModel)]="createForm.leaveType">
            <option value="sick">Sick Leave</option>
            <option value="casual">Casual Leave</option>
            <option value="annual">Annual Leave</option>
            <option value="emergency">Emergency Leave</option>
            <option value="maternity">Maternity Leave</option>
            <option value="paternity">Paternity Leave</option>
            <option value="unpaid">Unpaid Leave</option>
          </select>
          <input type="date" [(ngModel)]="createForm.startDate">
          <input type="date" [(ngModel)]="createForm.endDate">
          <input type="text" placeholder="Reason" [(ngModel)]="createForm.reason" class="reason-input">
        </div>
        <div class="panel-actions">
          <button type="button" class="btn-primary" (click)="submitCreateLeave()" [disabled]="isSaving">
            {{ isSaving ? 'Saving...' : 'Submit Request' }}
          </button>
          <button type="button" class="btn-secondary" (click)="closeCreatePanel()">Cancel</button>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <div class="view-options">
          <button 
            class="view-btn" 
            [class.active]="viewMode === 'requests'"
            (click)="setViewMode('requests')">
            <i class="material-icons">list</i>
            Leave Requests
          </button>
          <button 
            class="view-btn" 
            [class.active]="viewMode === 'balances'"
            (click)="setViewMode('balances')">
            <i class="material-icons">account_balance</i>
            Leave Balances
          </button>
          <button 
            class="view-btn" 
            [class.active]="viewMode === 'calendar'"
            (click)="setViewMode('calendar')">
            <i class="material-icons">calendar_today</i>
            Calendar View
          </button>
        </div>
        <div class="action-buttons-group">
          <button class="btn-secondary" (click)="openBulkActionModal()">
            <i class="material-icons">settings</i>
            Bulk Actions
          </button>
          <button class="btn-primary" (click)="openCreateLeaveModal()">
            <i class="material-icons">add</i>
            Create Leave Request
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">event</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalRequests }}</div>
            <div class="stat-label">Total Requests</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="material-icons">pending</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div class="stat-card approved">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.approved }}</div>
            <div class="stat-label">Approved</div>
          </div>
        </div>
        <div class="stat-card this-month">
          <div class="stat-icon">
            <i class="material-icons">calendar_month</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.thisMonth }}</div>
            <div class="stat-label">This Month</div>
          </div>
        </div>
      </div>

      <!-- Leave Requests View -->
      <div class="requests-view" *ngIf="viewMode === 'requests'">
        <div class="section-header">
          <h2>
            <i class="material-icons">list</i>
            Leave Requests
          </h2>
          <div class="filters">
            <div class="search-box">
              <i class="material-icons">search</i>
              <input 
                type="text" 
                placeholder="Search by staff name or ID..."
                [(ngModel)]="searchTerm"
                (input)="filterRequests()">
            </div>
            <select [(ngModel)]="selectedStatus" (change)="filterRequests()" class="status-filter">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select [(ngModel)]="selectedLeaveType" (change)="filterRequests()" class="type-filter">
              <option value="">All Types</option>
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="annual">Annual Leave</option>
              <option value="emergency">Emergency Leave</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
            <input 
              type="date" 
              [(ngModel)]="selectedDate"
              (change)="filterRequests()"
              class="date-filter">
          </div>
        </div>

        <div class="requests-table-container">
          <table class="requests-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Applied Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let request of filteredRequests">
                <td>
                  <div class="staff-info">
                    <div class="staff-name">{{ request.staffName }}</div>
                    <div class="staff-details">{{ request.staffId }} • {{ request.department }}</div>
                  </div>
                </td>
                <td>
                  <span class="leave-type-badge" [ngClass]="'type-' + request.leaveType">
                    {{ getLeaveTypeLabel(request.leaveType) }}
                  </span>
                </td>
                <td>{{ formatDate(request.startDate) }}</td>
                <td>{{ formatDate(request.endDate) }}</td>
                <td>
                  <span class="days-badge">{{ request.totalDays }} {{ request.totalDays === 1 ? 'day' : 'days' }}</span>
                </td>
                <td class="reason-cell">
                  <span class="reason-text" [title]="request.reason">
                    {{ truncateText(request.reason, 50) }}
                  </span>
                </td>
                <td>{{ formatDate(request.appliedDate) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="'status-' + request.status">
                    {{ getStatusLabel(request.status) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button 
                      class="btn-icon-small approve" 
                      (click)="approveRequest(request)"
                      *ngIf="request.status === 'pending'"
                      title="Approve">
                      <i class="material-icons">check_circle</i>
                    </button>
                    <button 
                      class="btn-icon-small reject" 
                      (click)="rejectRequest(request)"
                      *ngIf="request.status === 'pending'"
                      title="Reject">
                      <i class="material-icons">cancel</i>
                    </button>
                    <button 
                      class="btn-icon-small view" 
                      (click)="viewRequest(request)"
                      title="View Details">
                      <i class="material-icons">visibility</i>
                    </button>
                    <button 
                      class="btn-icon-small edit" 
                      (click)="editRequest(request)"
                      *ngIf="request.status === 'pending'"
                      title="Edit">
                      <i class="material-icons">edit</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredRequests.length === 0">
                <td colspan="9" class="no-data">
                  <i class="material-icons">inbox</i>
                  <p *ngIf="!loadError">No leave requests found.</p>
                  <p *ngIf="loadError">{{ loadError }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Leave Balances View -->
      <div class="balances-view" *ngIf="viewMode === 'balances'">
        <div class="section-header">
          <h2>
            <i class="material-icons">account_balance</i>
            Leave Balances
          </h2>
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by staff name or ID..."
              [(ngModel)]="balanceSearchTerm"
              (input)="loadLeaveBalances()">
          </div>
        </div>

        <div class="balances-grid">
          <div *ngFor="let balance of filteredBalances" class="balance-card">
            <div class="balance-header">
              <h3>{{ balance.staffName }}</h3>
              <span class="staff-id">{{ balance.staffId }}</span>
            </div>
            <div class="balance-content">
              <div class="balance-item">
                <span class="balance-label">{{ getLeaveTypeLabel(balance.leaveType) }}</span>
                <div class="balance-values">
                  <div class="balance-bar">
                    <div class="balance-bar-fill" [style.width.%]="getBalancePercentage(balance)"></div>
                  </div>
                  <div class="balance-numbers">
                    <span class="remaining">{{ balance.remaining }}</span>
                    <span class="separator">/</span>
                    <span class="total">{{ balance.total }}</span>
                    <span class="used-info">({{ balance.used }} used, {{ balance.pending }} pending)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calendar View -->
      <div class="calendar-view" *ngIf="viewMode === 'calendar'">
        <div class="calendar-header">
          <button class="nav-btn" (click)="previousMonth()">
            <i class="material-icons">chevron_left</i>
          </button>
          <h2>{{ getCurrentMonthYear() }}</h2>
          <button class="nav-btn" (click)="nextMonth()">
            <i class="material-icons">chevron_right</i>
          </button>
          <button class="btn-today" (click)="goToToday()">Today</button>
        </div>
        <div class="calendar-grid">
          <div class="calendar-day-header" *ngFor="let day of weekDays">
            {{ day }}
          </div>
          <div 
            *ngFor="let day of calendarDays" 
            class="calendar-day"
            [ngClass]="{'today': isToday(day.dateObj), 'other-month': day.otherMonth}">
            <div class="day-number">{{ day.date }}</div>
            <div class="day-leaves">
              <div 
                *ngFor="let leave of getLeavesForDay(day.dateObj)"
                class="leave-indicator"
                [ngClass]="'type-' + leave.leaveType"
                [title]="leave.staffName + ' - ' + getLeaveTypeLabel(leave.leaveType)">
                {{ leave.staffName.substring(0, 1) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leave-management-container {
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
      color: #1abc9c;
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

    .form-panel {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
    }

    .form-panel h3 {
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #2c3e50;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .form-grid input,
    .form-grid select {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }

    .form-grid .reason-input {
      grid-column: 1 / -1;
    }

    .panel-actions {
      display: flex;
      gap: 12px;
    }

    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .view-options {
      display: flex;
      gap: 8px;
      background: #f8f9fa;
      padding: 4px;
      border-radius: 8px;
    }

    .view-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: #7f8c8d;
      font-size: 14px;
      transition: all 0.2s;
    }

    .view-btn.active {
      background: white;
      color: #1abc9c;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
      background: #1abc9c;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #16a085;
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
      background: rgba(26, 188, 156, 0.1);
      color: #1abc9c;
    }

    .stat-card.pending .stat-icon {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .stat-card.approved .stat-icon {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .stat-card.this-month .stat-icon {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
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

    .requests-view,
    .balances-view,
    .calendar-view {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      margin-bottom: 20px;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      min-width: 200px;
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

    .status-filter,
    .type-filter,
    .date-filter {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .requests-table-container {
      overflow-x: auto;
    }

    .requests-table {
      width: 100%;
      border-collapse: collapse;
    }

    .requests-table th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      font-size: 13px;
      border-bottom: 2px solid #e9ecef;
    }

    .requests-table td {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
      color: #2c3e50;
    }

    .staff-info {
      display: flex;
      flex-direction: column;
    }

    .staff-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .staff-details {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 2px;
    }

    .leave-type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .type-sick { background: rgba(231, 76, 60, 0.1); color: #e74c3c; }
    .type-casual { background: rgba(52, 152, 219, 0.1); color: #3498db; }
    .type-annual { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
    .type-emergency { background: rgba(230, 126, 34, 0.1); color: #e67e22; }
    .type-maternity { background: rgba(155, 89, 182, 0.1); color: #9b59b6; }
    .type-paternity { background: rgba(26, 188, 156, 0.1); color: #1abc9c; }
    .type-unpaid { background: rgba(149, 165, 166, 0.1); color: #95a5a6; }

    .days-badge {
      padding: 4px 8px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      color: #2c3e50;
    }

    .reason-cell {
      max-width: 200px;
    }

    .reason-text {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-pending { background: rgba(52, 152, 219, 0.1); color: #3498db; }
    .status-approved { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
    .status-rejected { background: rgba(231, 76, 60, 0.1); color: #e74c3c; }
    .status-cancelled { background: rgba(149, 165, 166, 0.1); color: #95a5a6; }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .btn-icon-small {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ecf0f1;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .btn-icon-small.approve:hover {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .btn-icon-small.reject:hover {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .btn-icon-small.view:hover {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .btn-icon-small.edit:hover {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .no-data {
      text-align: center;
      padding: 40px !important;
      color: #7f8c8d;
    }

    .no-data .material-icons {
      font-size: 48px;
      color: #bdc3c7;
      margin-bottom: 8px;
    }

    .balances-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .balance-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #1abc9c;
    }

    .balance-header {
      margin-bottom: 16px;
    }

    .balance-header h3 {
      font-size: 18px;
      margin: 0 0 4px 0;
      color: #2c3e50;
    }

    .staff-id {
      font-size: 12px;
      color: #7f8c8d;
    }

    .balance-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .balance-label {
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .balance-bar {
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }

    .balance-bar-fill {
      height: 100%;
      background: #1abc9c;
      transition: width 0.3s ease;
    }

    .balance-numbers {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
    }

    .remaining {
      font-weight: 600;
      color: #1abc9c;
    }

    .total {
      color: #2c3e50;
    }

    .used-info {
      font-size: 11px;
      color: #7f8c8d;
      margin-left: 8px;
    }

    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .calendar-header h2 {
      font-size: 20px;
      margin: 0;
      color: #2c3e50;
    }

    .nav-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ecf0f1;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      color: #2c3e50;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      background: #bdc3c7;
    }

    .btn-today {
      padding: 8px 16px;
      background: #1abc9c;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-today:hover {
      background: #16a085;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
    }

    .calendar-day-header {
      padding: 12px;
      text-align: center;
      font-weight: 600;
      color: #2c3e50;
      font-size: 13px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .calendar-day {
      min-height: 100px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid transparent;
    }

    .calendar-day.today {
      border-color: #1abc9c;
      background: rgba(26, 188, 156, 0.1);
    }

    .calendar-day.other-month {
      opacity: 0.4;
    }

    .day-number {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .day-leaves {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .leave-indicator {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: white;
      cursor: pointer;
    }

    .leave-indicator.type-sick { background: #e74c3c; }
    .leave-indicator.type-casual { background: #3498db; }
    .leave-indicator.type-annual { background: #27ae60; }
    .leave-indicator.type-emergency { background: #e67e22; }
    .leave-indicator.type-maternity { background: #9b59b6; }
    .leave-indicator.type-paternity { background: #1abc9c; }
    .leave-indicator.type-unpaid { background: #95a5a6; }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .action-bar {
        flex-direction: column;
      }

      .filters {
        flex-direction: column;
      }

      .calendar-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LeaveManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  viewMode: 'requests' | 'balances' | 'calendar' = 'requests';
  currentMonth: Date = new Date();

  leaveRequests: LeaveRequest[] = [];
  filteredRequests: LeaveRequest[] = [];
  calendarLeaves: LeaveRequest[] = [];
  leaveBalances: LeaveBalance[] = [];
  filteredBalances: LeaveBalance[] = [];
  staffMembers: LeaveStaffMember[] = [];

  searchTerm = '';
  balanceSearchTerm = '';
  selectedStatus = '';
  selectedLeaveType = '';
  selectedDate = '';

  loadError = '';
  isLoading = false;
  isSaving = false;
  showCreatePanel = false;

  createForm = {
    staffId: '',
    leaveType: 'annual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: ''
  };

  stats: LeaveStatistics = {
    totalRequests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    thisMonth: 0,
    thisYear: 0
  };

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: Array<{ date: number; dateObj: Date; otherMonth: boolean }> = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private leaveService: LeaveManagementService
  ) {}

  ngOnInit(): void {
    this.loadStaffMembers();
    this.loadAllData();
    this.updateCalendar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllData(): void {
    this.loadLeaveRequests();
    this.loadLeaveBalances();
    if (this.viewMode === 'calendar') {
      this.loadCalendarLeaves();
    }
  }

  loadStaffMembers(): void {
    if (!this.resolveSocietyId()) return;
    this.leaveService
      .getStaffMembers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: staff => {
          this.staffMembers = staff;
        },
        error: err => console.error('Error loading staff:', err)
      });
  }

  loadLeaveRequests(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.leaveRequests = [];
      this.filteredRequests = [];
      this.stats = { totalRequests: 0, pending: 0, approved: 0, rejected: 0, thisMonth: 0, thisYear: 0 };
      return;
    }

    const filter = {
      status: this.selectedStatus ? (this.selectedStatus as LeaveStatus) : undefined,
      leaveType: this.selectedLeaveType ? (this.selectedLeaveType as LeaveType) : undefined,
      searchTerm: this.searchTerm || undefined,
      date: this.selectedDate || undefined
    };

    this.leaveService
      .getRequests(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: requests => {
          this.leaveRequests = requests;
          this.filteredRequests = applyLeaveFilter(requests, filter);
          this.isLoading = false;
        },
        error: err => {
          console.error('Error loading leave requests:', err);
          this.loadError = 'Failed to load leave requests from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });

    this.leaveService
      .getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
        },
        error: err => console.error('Error loading statistics:', err)
      });
  }

  loadLeaveBalances(): void {
    if (!this.resolveSocietyId()) return;

    this.leaveService
      .getBalances(this.balanceSearchTerm || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: balances => {
          this.leaveBalances = balances;
          this.filterBalances();
        },
        error: err => console.error('Error loading balances:', err)
      });
  }

  loadCalendarLeaves(): void {
    if (!this.resolveSocietyId()) return;

    const range = getMonthRange(this.currentMonth);
    this.leaveService
      .getCalendarLeaves(range.from, range.to)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: leaves => {
          this.calendarLeaves = leaves;
        },
        error: err => console.error('Error loading calendar leaves:', err)
      });
  }

  setViewMode(mode: 'requests' | 'balances' | 'calendar'): void {
    this.viewMode = mode;
    if (mode === 'balances') {
      this.loadLeaveBalances();
    } else if (mode === 'calendar') {
      this.loadCalendarLeaves();
    } else {
      this.loadLeaveRequests();
    }
  }

  updateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      this.calendarDays.push({
        date: date.getDate(),
        dateObj: new Date(date),
        otherMonth: date.getMonth() !== month
      });
    }
  }

  filterRequests(): void {
    this.loadLeaveRequests();
  }

  filterBalances(): void {
    if (!this.balanceSearchTerm) {
      this.filteredBalances = [...this.leaveBalances];
      return;
    }
    const term = this.balanceSearchTerm.toLowerCase();
    this.filteredBalances = this.leaveBalances.filter(
      b =>
        b.staffName.toLowerCase().includes(term) ||
        b.staffId.toLowerCase().includes(term)
    );
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getLeaveTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'sick': 'Sick Leave',
      'casual': 'Casual Leave',
      'annual': 'Annual Leave',
      'emergency': 'Emergency Leave',
      'maternity': 'Maternity Leave',
      'paternity': 'Paternity Leave',
      'unpaid': 'Unpaid Leave'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  getBalancePercentage(balance: LeaveBalance): number {
    if (balance.total === 0) return 0;
    return (balance.remaining / balance.total) * 100;
  }

  getLeavesForDay(date: Date): LeaveRequest[] {
    return this.calendarLeaves.filter(request => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return day >= start && day <= end;
    });
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getCurrentMonthYear(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  previousMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.updateCalendar();
    this.loadCalendarLeaves();
  }

  nextMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.updateCalendar();
    this.loadCalendarLeaves();
  }

  goToToday(): void {
    this.currentMonth = new Date();
    this.updateCalendar();
    this.loadCalendarLeaves();
  }

  approveRequest(request: LeaveRequest): void {
    if (!window.confirm(`Approve leave request for ${request.staffName}?`)) return;

    this.leaveService
      .approveRequest(request.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.loadAllData();
        },
        error: err => {
          console.error('Approve failed:', err);
          window.alert('Failed to approve leave request.');
        }
      });
  }

  rejectRequest(request: LeaveRequest): void {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;

    this.leaveService
      .rejectRequest(request.id, reason || 'Rejected')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.loadAllData();
        },
        error: err => {
          console.error('Reject failed:', err);
          window.alert('Failed to reject leave request.');
        }
      });
  }

  viewRequest(request: LeaveRequest): void {
    const details = `
Staff: ${request.staffName} (${request.staffId})
Department: ${request.department}
Leave Type: ${this.getLeaveTypeLabel(request.leaveType)}
Start Date: ${this.formatDate(request.startDate)}
End Date: ${this.formatDate(request.endDate)}
Total Days: ${request.totalDays}
Reason: ${request.reason}
Status: ${this.getStatusLabel(request.status)}
Applied: ${this.formatDate(request.appliedDate)}
${request.approvedBy ? `Approved by: ${request.approvedBy}` : ''}
${request.rejectionReason ? `Rejection Reason: ${request.rejectionReason}` : ''}
    `;
    window.alert(details);
  }

  editRequest(request: LeaveRequest): void {
    window.alert(`Leave request for ${request.staffName} — edit form coming soon.`);
  }

  openCreateLeaveModal(): void {
    this.showCreatePanel = true;
    const today = new Date().toISOString().split('T')[0];
    this.createForm = {
      staffId: this.staffMembers[0]?.id ?? '',
      leaveType: 'annual',
      startDate: today,
      endDate: today,
      reason: ''
    };
  }

  closeCreatePanel(): void {
    this.showCreatePanel = false;
  }

  submitCreateLeave(): void {
    if (!this.createForm.staffId || !this.createForm.startDate || !this.createForm.endDate) {
      window.alert('Staff, start date, and end date are required.');
      return;
    }

    this.isSaving = true;
    this.leaveService
      .createRequest({
        staffId: this.createForm.staffId,
        leaveType: this.createForm.leaveType,
        startDate: this.createForm.startDate,
        endDate: this.createForm.endDate,
        reason: this.createForm.reason
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isSaving = false;
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.showCreatePanel = false;
          this.loadAllData();
        },
        error: err => {
          console.error('Create leave failed:', err);
          this.isSaving = false;
          window.alert('Failed to create leave request.');
        }
      });
  }

  openBulkActionModal(): void {
    const pending = this.filteredRequests.filter(r => r.status === 'pending');
    if (pending.length === 0) {
      window.alert('No pending leave requests to approve.');
      return;
    }
    if (!window.confirm(`Approve all ${pending.length} pending request(s)?`)) return;

    this.leaveService
      .bulkApprove(pending.map(r => r.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if (!result.success) {
            window.alert(result.message);
            return;
          }
          this.loadAllData();
        },
        error: err => {
          console.error('Bulk approve failed:', err);
          window.alert('Failed to bulk approve leave requests.');
        }
      });
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

