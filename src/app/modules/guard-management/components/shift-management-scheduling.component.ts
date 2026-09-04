import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ShiftManagementService } from '../services/shift-management.service';
import {
  ShiftDefinition,
  ShiftSchedule,
  ShiftStaffMember,
  ShiftManagementStatistics,
  ShiftAssignmentStatus
} from '../models/shift-management.model';
import {
  applyShiftFilter,
  getWeekRange,
  toApiDateString
} from '../services/shift-management-api.mapper';

@Component({
  selector: 'app-shift-management-scheduling',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="shift-management-container">
      <div class="page-header">
        <button class="back-button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back to Dashboard
        </button>
        <div>
          <h1>
            <i class="material-icons">schedule</i>
            Shift Management & Scheduling
          </h1>
          <p>Manage staff shifts, schedules, and assignments</p>
          <div class="api-banner">
            <i class="material-icons">cloud_done</i>
            <span>Live data from <strong>/shift-management</strong> API — no demo records.</span>
          </div>
        </div>
      </div>

      <div class="load-error" *ngIf="loadError">
        <i class="material-icons">error_outline</i>
        <span>{{ loadError }}</span>
      </div>

      <div class="form-panel" *ngIf="showCreateShiftPanel">
        <h3><i class="material-icons">add</i> Create Shift Definition</h3>
        <div class="form-grid">
          <input type="text" placeholder="Shift name" [(ngModel)]="newShift.name">
          <input type="time" [(ngModel)]="newShift.startTime">
          <input type="time" [(ngModel)]="newShift.endTime">
          <input type="color" [(ngModel)]="newShift.color" title="Shift color">
          <input type="text" placeholder="Description (optional)" [(ngModel)]="newShift.description">
        </div>
        <div class="panel-actions">
          <button type="button" class="btn-primary" (click)="submitCreateShift()" [disabled]="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Shift' }}
          </button>
          <button type="button" class="btn-secondary" (click)="closeCreateShiftPanel()">Cancel</button>
        </div>
      </div>

      <div class="form-panel" *ngIf="showAssignPanel">
        <h3><i class="material-icons">person_add</i> Assign Shift</h3>
        <div class="form-grid">
          <input type="date" [(ngModel)]="assignForm.date">
          <select [(ngModel)]="assignForm.shiftId">
            <option value="">Select shift</option>
            <option *ngFor="let shift of shifts" [value]="shift.id">{{ shift.name }}</option>
          </select>
          <select [(ngModel)]="assignForm.staffId">
            <option value="">Select staff</option>
            <option *ngFor="let staff of staffMembers" [value]="staff.id">
              {{ staff.name }} ({{ staff.department }})
            </option>
          </select>
          <select [(ngModel)]="assignForm.status">
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
          </select>
          <input type="text" placeholder="Location" [(ngModel)]="assignForm.location">
        </div>
        <div class="panel-actions">
          <button type="button" class="btn-primary" (click)="submitAssignShift()" [disabled]="isSaving">
            {{ isSaving ? 'Saving...' : 'Assign' }}
          </button>
          <button type="button" class="btn-secondary" (click)="closeAssignPanel()">Cancel</button>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <div class="view-options">
          <button 
            class="view-btn" 
            [class.active]="viewMode === 'calendar'"
            (click)="setViewMode('calendar')">
            <i class="material-icons">calendar_today</i>
            Calendar View
          </button>
          <button 
            class="view-btn" 
            [class.active]="viewMode === 'list'"
            (click)="setViewMode('list')">
            <i class="material-icons">list</i>
            List View
          </button>
        </div>
        <div class="action-buttons-group">
          <button class="btn-secondary" (click)="openShiftTemplateModal()">
            <i class="material-icons">content_copy</i>
            Shift Templates
          </button>
          <button class="btn-secondary" (click)="openBulkAssignModal()">
            <i class="material-icons">group_add</i>
            Bulk Assign
          </button>
          <button class="btn-primary" (click)="openCreateShiftModal()">
            <i class="material-icons">add</i>
            Create Shift
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card scheduled">
          <div class="stat-icon">
            <i class="material-icons">event</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.scheduled }}</div>
            <div class="stat-label">Scheduled</div>
          </div>
        </div>
        <div class="stat-card confirmed">
          <div class="stat-icon">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.confirmed }}</div>
            <div class="stat-label">Confirmed</div>
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
        <div class="stat-card active-shifts">
          <div class="stat-icon">
            <i class="material-icons">schedule</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activeShifts }}</div>
            <div class="stat-label">Active Shifts</div>
          </div>
        </div>
      </div>

      <!-- Calendar View -->
      <div class="calendar-view" *ngIf="viewMode === 'calendar'">
        <div class="calendar-header">
          <button class="nav-btn" (click)="previousWeek()">
            <i class="material-icons">chevron_left</i>
          </button>
          <h2>{{ getWeekRange() }}</h2>
          <button class="nav-btn" (click)="nextWeek()">
            <i class="material-icons">chevron_right</i>
          </button>
          <button class="btn-today" (click)="goToToday()">Today</button>
        </div>
        <div class="calendar-grid">
          <div class="calendar-day" *ngFor="let day of weekDays">
            <div class="day-header">
              <div class="day-name">{{ day.name }}</div>
              <div class="day-date">{{ day.date }}</div>
            </div>
            <div class="day-shifts">
              <div 
                *ngFor="let schedule of getSchedulesForDay(day.dateObj)"
                class="shift-item"
                [ngClass]="'shift-' + schedule.status"
                (click)="viewScheduleDetails(schedule)">
                <div class="shift-time">{{ getShiftTime(schedule.shiftId) }}</div>
                <div class="shift-staff">{{ schedule.staffName }}</div>
                <div class="shift-status" [ngClass]="'status-' + schedule.status">
                  {{ getStatusLabel(schedule.status) }}
                </div>
              </div>
              <div class="add-shift-btn" (click)="openAssignShiftModal(day.dateObj)">
                <i class="material-icons">add</i>
                Assign Shift
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div class="list-view" *ngIf="viewMode === 'list'">
        <div class="list-filters">
          <div class="search-box">
            <i class="material-icons">search</i>
            <input 
              type="text" 
              placeholder="Search by staff name or shift..."
              [(ngModel)]="searchTerm"
              (input)="filterSchedules()">
          </div>
          <select [(ngModel)]="selectedStatus" (change)="filterSchedules()" class="status-filter">
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="absent">Absent</option>
          </select>
          <select [(ngModel)]="selectedShift" (change)="filterSchedules()" class="shift-filter">
            <option value="">All Shifts</option>
            <option *ngFor="let shift of shifts" [value]="shift.id">
              {{ shift.name }}
            </option>
          </select>
          <input 
            type="date" 
            [(ngModel)]="selectedDate"
            (change)="filterSchedules()"
            class="date-filter">
        </div>

        <div class="schedules-table-container">
          <table class="schedules-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Time</th>
                <th>Staff</th>
                <th>Department</th>
                <th>Status</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let schedule of filteredSchedules">
                <td>{{ formatDate(schedule.date) }}</td>
                <td>
                  <span class="shift-badge" [style.background-color]="getShiftColor(schedule.shiftId)">
                    {{ schedule.shiftName }}
                  </span>
                </td>
                <td>{{ getShiftTime(schedule.shiftId) }}</td>
                <td>{{ schedule.staffName }}</td>
                <td>{{ getStaffDepartment(schedule.staffId) }}</td>
                <td>
                  <span class="status-badge" [ngClass]="'status-' + schedule.status">
                    {{ getStatusLabel(schedule.status) }}
                  </span>
                </td>
                <td>{{ schedule.location || '-' }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-icon-small" (click)="editSchedule(schedule)" title="Edit">
                      <i class="material-icons">edit</i>
                    </button>
                    <button class="btn-icon-small" (click)="deleteSchedule(schedule)" title="Delete">
                      <i class="material-icons">delete</i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredSchedules.length === 0">
                <td colspan="8" class="no-data">
                  <i class="material-icons">inbox</i>
                  <p *ngIf="!loadError">No schedules found for the selected filters.</p>
                  <p *ngIf="loadError">{{ loadError }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Shifts Management Section -->
      <div class="shifts-section">
        <div class="section-header">
          <h2>
            <i class="material-icons">access_time</i>
            Shift Definitions
          </h2>
          <button class="btn-secondary" (click)="openCreateShiftModal()">
            <i class="material-icons">add</i>
            Add Shift
          </button>
        </div>
        <div class="shifts-grid">
          <div *ngFor="let shift of shifts" class="shift-card" [style.border-left-color]="shift.color">
            <div class="shift-card-header">
              <h3>{{ shift.name }}</h3>
              <div class="shift-actions">
                <button class="btn-icon-small" (click)="editShift(shift)" title="Edit">
                  <i class="material-icons">edit</i>
                </button>
                <button class="btn-icon-small" (click)="deleteShift(shift)" title="Delete">
                  <i class="material-icons">delete</i>
                </button>
              </div>
            </div>
            <div class="shift-card-content">
              <div class="shift-time-info">
                <i class="material-icons">schedule</i>
                <span>{{ shift.startTime }} - {{ shift.endTime }}</span>
              </div>
              <div class="shift-duration">
                <i class="material-icons">hourglass_empty</i>
                <span>{{ shift.duration }} hours</span>
              </div>
              <p *ngIf="shift.description" class="shift-description">{{ shift.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shift-management-container {
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
      color: #9b59b6;
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
      color: #9b59b6;
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
      background: #9b59b6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #8e44ad;
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

    .stat-card.scheduled .stat-icon {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .stat-card.confirmed .stat-icon {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .stat-card.pending .stat-icon {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

    .stat-card.active-shifts .stat-icon {
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

    .calendar-view {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
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
      background: #9b59b6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-today:hover {
      background: #8e44ad;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 12px;
    }

    .calendar-day {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 12px;
      min-height: 200px;
    }

    .day-header {
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    .day-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 14px;
    }

    .day-date {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .day-shifts {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .shift-item {
      background: white;
      border-radius: 6px;
      padding: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid;
    }

    .shift-item:hover {
      transform: translateX(2px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .shift-time {
      font-size: 11px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .shift-staff {
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 4px;
    }

    .shift-status {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    .add-shift-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px;
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
      border: 1px dashed #9b59b6;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .add-shift-btn:hover {
      background: rgba(155, 89, 182, 0.2);
    }

    .list-view {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
    }

    .list-filters {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
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
    .shift-filter,
    .date-filter {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .schedules-table-container {
      overflow-x: auto;
    }

    .schedules-table {
      width: 100%;
      border-collapse: collapse;
    }

    .schedules-table th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #2c3e50;
      font-size: 13px;
      border-bottom: 2px solid #e9ecef;
    }

    .schedules-table td {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
      font-size: 14px;
      color: #2c3e50;
    }

    .shift-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      color: white;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-scheduled {
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
    }

    .status-confirmed {
      background: rgba(39, 174, 96, 0.1);
      color: #27ae60;
    }

    .status-completed {
      background: rgba(155, 89, 182, 0.1);
      color: #9b59b6;
    }

    .status-cancelled {
      background: rgba(231, 76, 60, 0.1);
      color: #e74c3c;
    }

    .status-absent {
      background: rgba(230, 126, 34, 0.1);
      color: #e67e22;
    }

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

    .btn-icon-small:hover {
      background: #bdc3c7;
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

    .shifts-section {
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

    .shifts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .shift-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid;
      transition: all 0.3s ease;
    }

    .shift-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .shift-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .shift-card-header h3 {
      font-size: 18px;
      margin: 0;
      color: #2c3e50;
    }

    .shift-card-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .shift-time-info,
    .shift-duration {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .shift-description {
      font-size: 13px;
      color: #7f8c8d;
      margin-top: 8px;
      margin-bottom: 0;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .calendar-grid {
        grid-template-columns: 1fr;
      }

      .action-bar {
        flex-direction: column;
      }

      .list-filters {
        flex-direction: column;
      }
    }
  `]
})
export class ShiftManagementSchedulingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  viewMode: 'calendar' | 'list' = 'calendar';
  currentWeekStart: Date = new Date();

  shifts: ShiftDefinition[] = [];
  schedules: ShiftSchedule[] = [];
  filteredSchedules: ShiftSchedule[] = [];
  staffMembers: ShiftStaffMember[] = [];

  searchTerm = '';
  selectedStatus = '';
  selectedShift = '';
  selectedDate = '';

  loadError = '';
  isLoading = false;
  isSaving = false;
  showCreateShiftPanel = false;
  showAssignPanel = false;

  newShift = {
    name: '',
    startTime: '06:00',
    endTime: '14:00',
    color: '#9b59b6',
    description: ''
  };

  assignForm = {
    date: '',
    shiftId: '',
    staffId: '',
    status: 'scheduled' as ShiftAssignmentStatus,
    location: 'Main Gate'
  };

  stats: ShiftManagementStatistics = {
    scheduled: 0,
    confirmed: 0,
    pending: 0,
    completed: 0,
    activeShifts: 0
  };

  weekDays: Array<{ name: string; date: string; dateObj: Date }> = [];
  private weekFrom = '';
  private weekTo = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private shiftService: ShiftManagementService
  ) {}

  ngOnInit(): void {
    this.refreshWeekDays();
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load shifts, staff, assignments, and statistics from API. */
  loadAllData(): void {
    this.isLoading = true;
    this.loadError = '';

    if (!this.resolveSocietyId()) {
      this.loadError = 'No society selected. Log in as admin and select a society in Society Setup.';
      this.isLoading = false;
      this.shifts = [];
      this.schedules = [];
      this.filteredSchedules = [];
      this.staffMembers = [];
      this.stats = { scheduled: 0, confirmed: 0, pending: 0, completed: 0, activeShifts: 0 };
      return;
    }

    this.shiftService
      .getShifts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: shifts => {
          this.shifts = shifts;
        },
        error: err => console.error('Error loading shifts:', err)
      });

    this.shiftService
      .getStaffMembers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: staff => {
          this.staffMembers = staff;
        },
        error: err => console.error('Error loading staff:', err)
      });

    this.loadAssignments();
    this.loadStatistics();
  }

  loadAssignments(): void {
    if (!this.resolveSocietyId()) return;

    const filter: { from?: string; to?: string; searchTerm?: string } = {};
    if (this.viewMode === 'calendar') {
      filter.from = this.weekFrom;
      filter.to = this.weekTo;
    }
    if (this.searchTerm.trim()) {
      filter.searchTerm = this.searchTerm.trim();
    }

    this.shiftService
      .getAssignments(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: schedules => {
          this.schedules = schedules;
          this.applyLocalFilters();
          this.isLoading = false;
        },
        error: err => {
          console.error('Error loading assignments:', err);
          this.loadError = 'Failed to load schedules from the API. Ensure the backend is running.';
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    if (!this.resolveSocietyId()) return;

    this.shiftService
      .getStatistics(this.weekFrom, this.weekTo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
        },
        error: err => console.error('Error loading statistics:', err)
      });
  }

  refreshWeekDays(): void {
    const range = getWeekRange(this.currentWeekStart);
    this.weekFrom = range.from;
    this.weekTo = range.to;

    this.weekDays = range.days.map(date => ({
      name: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate().toString(),
      dateObj: new Date(date)
    }));
  }

  getSchedulesForDay(date: Date): ShiftSchedule[] {
    return this.schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate.toDateString() === date.toDateString();
    });
  }

  getShiftTime(shiftId: string): string {
    const shift = this.shifts.find(s => s.id === shiftId);
    return shift ? `${shift.startTime} - ${shift.endTime}` : '-';
  }

  getShiftColor(shiftId: string): string {
    const shift = this.shifts.find(s => s.id === shiftId);
    return shift ? shift.color : '#7f8c8d';
  }

  getStaffDepartment(staffId: string): string {
    const staff = this.staffMembers.find(s => s.id === staffId);
    const schedule = this.schedules.find(s => s.staffId === staffId);
    return staff?.department || schedule?.staffDepartment || '-';
  }

  getWeekRange(): string {
    if (!this.weekDays.length) return '';
    const start = this.weekDays[0].dateObj;
    const end = this.weekDays[6].dateObj;
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.refreshWeekDays();
    this.loadAssignments();
    this.loadStatistics();
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.refreshWeekDays();
    this.loadAssignments();
    this.loadStatistics();
  }

  goToToday(): void {
    this.currentWeekStart = new Date();
    this.refreshWeekDays();
    this.loadAssignments();
    this.loadStatistics();
  }

  filterSchedules(): void {
    if (this.viewMode === 'list' && this.searchTerm.trim()) {
      this.loadAssignments();
      return;
    }
    this.applyLocalFilters();
  }

  setViewMode(mode: 'calendar' | 'list'): void {
    this.viewMode = mode;
    this.loadAssignments();
    if (mode === 'calendar') {
      this.loadStatistics();
    }
  }

  private applyLocalFilters(): void {
    this.filteredSchedules = applyShiftFilter(this.schedules, {
      searchTerm: this.searchTerm || undefined,
      status: this.selectedStatus ? (this.selectedStatus as ShiftAssignmentStatus) : undefined,
      shiftId: this.selectedShift || undefined,
      from: this.selectedDate || undefined,
      to: this.selectedDate || undefined
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      absent: 'Absent'
    };
    return labels[status] || status;
  }

  openCreateShiftModal(): void {
    this.showAssignPanel = false;
    this.showCreateShiftPanel = true;
    this.newShift = {
      name: '',
      startTime: '06:00',
      endTime: '14:00',
      color: '#9b59b6',
      description: ''
    };
  }

  closeCreateShiftPanel(): void {
    this.showCreateShiftPanel = false;
  }

  submitCreateShift(): void {
    if (!this.newShift.name.trim()) {
      window.alert('Shift name is required.');
      return;
    }

    this.isSaving = true;
    this.shiftService
      .createShift({
        name: this.newShift.name.trim(),
        startTime: this.newShift.startTime,
        endTime: this.newShift.endTime,
        color: this.newShift.color,
        description: this.newShift.description || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isSaving = false;
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.showCreateShiftPanel = false;
          this.loadAllData();
        },
        error: err => {
          console.error('Create shift failed:', err);
          this.isSaving = false;
          window.alert('Failed to create shift.');
        }
      });
  }

  openAssignShiftModal(date: Date): void {
    this.showCreateShiftPanel = false;
    this.showAssignPanel = true;
    this.assignForm = {
      date: toApiDateString(date),
      shiftId: this.shifts[0]?.id ?? '',
      staffId: this.staffMembers[0]?.id ?? '',
      status: 'scheduled',
      location: 'Main Gate'
    };
  }

  closeAssignPanel(): void {
    this.showAssignPanel = false;
  }

  submitAssignShift(): void {
    if (!this.assignForm.shiftId || !this.assignForm.staffId || !this.assignForm.date) {
      window.alert('Shift, staff, and date are required.');
      return;
    }

    this.isSaving = true;
    this.shiftService
      .createAssignment({
        shiftId: this.assignForm.shiftId,
        staffId: this.assignForm.staffId,
        assignmentDate: this.assignForm.date,
        status: this.assignForm.status,
        location: this.assignForm.location
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.isSaving = false;
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.showAssignPanel = false;
          this.loadAssignments();
          this.loadStatistics();
        },
        error: err => {
          console.error('Assign shift failed:', err);
          this.isSaving = false;
          window.alert('Failed to assign shift.');
        }
      });
  }

  openShiftTemplateModal(): void {
    window.alert('Shift templates are not yet available via API. Use Create Shift and Assign Shift for now.');
  }

  openBulkAssignModal(): void {
    window.alert('Bulk assign is not yet available via API. Assign shifts per day from the calendar.');
  }

  viewScheduleDetails(schedule: ShiftSchedule): void {
    const details = [
      `Staff: ${schedule.staffName}`,
      `Shift: ${schedule.shiftName}`,
      `Date: ${this.formatDate(schedule.date)}`,
      `Status: ${this.getStatusLabel(schedule.status)}`,
      `Location: ${schedule.location || '-'}`,
      schedule.notes ? `Notes: ${schedule.notes}` : ''
    ].filter(Boolean).join('\n');
    window.alert(details);
  }

  editSchedule(schedule: ShiftSchedule): void {
    const nextStatus = schedule.status === 'scheduled' ? 'confirmed' : 'completed';
    if (!window.confirm(`Mark ${schedule.staffName}'s shift as ${this.getStatusLabel(nextStatus)}?`)) {
      return;
    }

    this.shiftService
      .updateAssignmentStatus(schedule.id, nextStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if ('success' in result && result.success === false) {
            window.alert(result.message);
            return;
          }
          this.loadAssignments();
          this.loadStatistics();
        },
        error: err => {
          console.error('Update assignment failed:', err);
          window.alert('Failed to update assignment.');
        }
      });
  }

  deleteSchedule(schedule: ShiftSchedule): void {
    if (!window.confirm(`Delete schedule for ${schedule.staffName}?`)) {
      return;
    }

    this.shiftService
      .deleteAssignment(schedule.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if (!result.success) {
            window.alert(result.message);
            return;
          }
          this.loadAssignments();
          this.loadStatistics();
        },
        error: err => {
          console.error('Delete assignment failed:', err);
          window.alert('Failed to delete assignment.');
        }
      });
  }

  editShift(shift: ShiftDefinition): void {
    window.alert(`Shift: ${shift.name} (${shift.startTime} - ${shift.endTime}). Full edit form coming soon.`);
  }

  deleteShift(shift: ShiftDefinition): void {
    if (!window.confirm(`Deactivate shift: ${shift.name}?`)) {
      return;
    }

    this.shiftService
      .deleteShift(shift.id)
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
          console.error('Delete shift failed:', err);
          window.alert('Failed to deactivate shift.');
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

