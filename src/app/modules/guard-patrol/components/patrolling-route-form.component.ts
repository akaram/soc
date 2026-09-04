import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { PatrollingRouteService } from '../services/patrolling-route.service';
import {
  CheckpointType,
  RouteStatus,
  CreatePatrollingRouteRequest,
  UpdatePatrollingRouteRequest,
  CreateCheckpointRequest
} from '../models/patrolling-route.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  buildPatrolCheckpointCode,
  createPatrolQrDataUrl,
  downloadQrPng
} from '../utils/patrol-qr.util';

@Component({
  selector: 'app-patrolling-route-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="patrolling-route-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit Patrolling Route' : 'Create Patrolling Route' }}
        </h1>
        <p>{{ isEditMode ? 'Update patrolling route configuration' : 'Define a new patrolling route with checkpoints' }}</p>
        <div class="api-banner">
          <i class="material-icons">cloud_done</i>
          <span>Saved via <strong>/patrol-routes</strong> API for the selected society.</span>
        </div>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Route Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.name" 
                  name="name" 
                  required
                  placeholder="e.g., Main Building Perimeter Route"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Route Code</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.code" 
                  name="code"
                  placeholder="e.g., MB-PERIMETER-01"
                  class="form-control">
              </div>
              <div class="form-group full-width">
                <label>Description</label>
                <textarea 
                  [(ngModel)]="formData.description" 
                  name="description"
                  rows="3"
                  placeholder="Route description"
                  class="form-control"></textarea>
              </div>
            </div>
          </div>

          <!-- Schedule Configuration -->
          <div class="form-section">
            <h3>Schedule Configuration</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Schedule Type *</label>
                <select 
                  [(ngModel)]="formData.scheduleType" 
                  name="scheduleType" 
                  required
                  (change)="onScheduleTypeChange()"
                  class="form-control">
                  <option value="">Select Type</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="CUSTOM">Custom</option>
                  <option value="ON_DEMAND">On Demand</option>
                </select>
              </div>
              <div class="form-group" *ngIf="formData.scheduleType === 'DAILY'">
                <label>Schedule Time</label>
                <input 
                  type="time" 
                  [(ngModel)]="formData.scheduleTime" 
                  name="scheduleTime"
                  class="form-control">
              </div>
              <div class="form-group" *ngIf="formData.scheduleType === 'WEEKLY'">
                <label>Schedule Days</label>
                <div class="checkbox-group">
                  <label *ngFor="let day of weekDays">
                    <input 
                      type="checkbox" 
                      [value]="day"
                      [checked]="formData.scheduleDays?.includes(day)"
                      (change)="toggleScheduleDay(day)">
                    {{ day }}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Start Time</label>
                <input 
                  type="time" 
                  [(ngModel)]="formData.startTime" 
                  name="startTime"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>End Time</label>
                <input 
                  type="time" 
                  [(ngModel)]="formData.endTime" 
                  name="endTime"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Estimated Duration (minutes)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.estimatedDuration" 
                  name="estimatedDuration"
                  min="0"
                  placeholder="20"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Route Settings -->
          <div class="form-section">
            <h3>Route Settings</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Status *</label>
                <select 
                  [(ngModel)]="formData.status" 
                  name="status" 
                  required
                  class="form-control">
                  <option [value]="RouteStatus.DRAFT">Draft</option>
                  <option [value]="RouteStatus.ACTIVE">Active</option>
                  <option [value]="RouteStatus.INACTIVE">Inactive</option>
                  <option [value]="RouteStatus.ARCHIVED">Archived</option>
                </select>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.requiresAllCheckpoints" 
                    name="requiresAllCheckpoints">
                  Require All Checkpoints
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.allowSkipping" 
                    name="allowSkipping">
                  Allow Skipping Checkpoints
                </label>
              </div>
              <div class="form-group">
                <label>Max Late Minutes</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.maxLateMinutes" 
                  name="maxLateMinutes"
                  min="0"
                  placeholder="10"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Checkpoints Management -->
          <div class="form-section">
            <div class="section-header">
              <h3>Checkpoints</h3>
              <button type="button" class="btn-add-checkpoint" (click)="addCheckpoint()">
                <i class="material-icons">add</i>
                Add Checkpoint
              </button>
            </div>
            
            <div class="checkpoints-list" *ngIf="checkpoints.length > 0">
              <div 
                *ngFor="let checkpoint of checkpoints; let i = index" 
                class="checkpoint-item">
                <div class="checkpoint-header">
                  <div class="checkpoint-number">{{ i + 1 }}</div>
                  <h4>{{ checkpoint.name || 'New Checkpoint' }}</h4>
                  <div class="checkpoint-actions">
                    <button type="button" class="btn-move" (click)="moveCheckpointUp(i)" [disabled]="i === 0" title="Move Up">
                      <i class="material-icons">arrow_upward</i>
                    </button>
                    <button type="button" class="btn-move" (click)="moveCheckpointDown(i)" [disabled]="i === checkpoints.length - 1" title="Move Down">
                      <i class="material-icons">arrow_downward</i>
                    </button>
                    <button type="button" class="btn-remove" (click)="removeCheckpoint(i)" title="Remove">
                      <i class="material-icons">delete</i>
                    </button>
                  </div>
                </div>
                <div class="checkpoint-form">
                  <div class="form-grid">
                    <div class="form-group">
                      <label>Checkpoint Name *</label>
                      <input 
                        type="text" 
                        [(ngModel)]="checkpoint.name" 
                        [name]="'checkpoint-name-' + i"
                        required
                        placeholder="e.g., Main Entrance"
                        class="form-control">
                    </div>
                    <div class="form-group">
                      <label>Checkpoint Type *</label>
                      <select 
                        [(ngModel)]="checkpoint.type" 
                        [name]="'checkpoint-type-' + i"
                        required
                        (change)="onCheckpointTypeChange(checkpoint)"
                        class="form-control">
                        <option value="">Select Type</option>
                        <option [value]="CheckpointType.QR_CODE">QR Code</option>
                        <option [value]="CheckpointType.NFC_TAG">NFC Tag</option>
                        <option [value]="CheckpointType.GPS_LOCATION">GPS Location</option>
                        <option [value]="CheckpointType.MANUAL">Manual</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Location *</label>
                      <input 
                        type="text" 
                        [(ngModel)]="checkpoint.location" 
                        [name]="'checkpoint-location-' + i"
                        required
                        placeholder="e.g., Main Gate"
                        class="form-control">
                    </div>
                    <div class="form-group full-width qr-checkpoint-block" *ngIf="checkpoint.type === CheckpointType.QR_CODE">
                      <label>Checkpoint QR Code *</label>
                      <div class="qr-code-row">
                        <input
                          type="text"
                          [(ngModel)]="checkpoint.qrCode"
                          [name]="'checkpoint-qr-' + i"
                          required
                          placeholder="e.g., CHK-MAIN-GATE-01"
                          class="form-control"
                          (ngModelChange)="onCheckpointQrChange(i)">
                        <button
                          type="button"
                          class="btn-generate-code"
                          (click)="generateCheckpointCode(i)">
                          Generate code
                        </button>
                      </div>
                      <p class="qr-help">
                        This exact text is encoded in the printable QR sticker. Guards scan it during patrol.
                      </p>
                      <div class="qr-actions">
                        <button
                          type="button"
                          class="btn-qr-download"
                          (click)="generateAndDownloadQr(i)"
                          [disabled]="qrGeneratingIndex === i">
                          <i class="material-icons">qr_code_2</i>
                          {{ qrGeneratingIndex === i ? 'Generating…' : 'Generate & Download QR' }}
                        </button>
                      </div>
                      <div class="qr-preview" *ngIf="checkpointQrPreviews[i]">
                        <img [src]="checkpointQrPreviews[i]" [alt]="'QR for ' + (checkpoint.name || checkpoint.location)">
                        <span class="qr-preview-code">{{ checkpoint.qrCode }}</span>
                      </div>
                    </div>
                    <div class="form-group" *ngIf="checkpoint.type === CheckpointType.NFC_TAG">
                      <label>NFC Tag ID</label>
                      <input 
                        type="text" 
                        [(ngModel)]="checkpoint.nfcTagId" 
                        [name]="'checkpoint-nfc-' + i"
                        placeholder="NFC tag ID"
                        class="form-control">
                    </div>
                    <div class="form-group" *ngIf="checkpoint.type === CheckpointType.GPS_LOCATION">
                      <label>Latitude</label>
                      <input 
                        type="number" 
                        [(ngModel)]="checkpoint.latitude" 
                        [name]="'checkpoint-lat-' + i"
                        step="0.000001"
                        placeholder="24.7136"
                        class="form-control">
                    </div>
                    <div class="form-group" *ngIf="checkpoint.type === CheckpointType.GPS_LOCATION">
                      <label>Longitude</label>
                      <input 
                        type="number" 
                        [(ngModel)]="checkpoint.longitude" 
                        [name]="'checkpoint-lng-' + i"
                        step="0.000001"
                        placeholder="46.6753"
                        class="form-control">
                    </div>
                    <div class="form-group">
                      <label>Building Name</label>
                      <input 
                        type="text" 
                        [(ngModel)]="checkpoint.buildingName" 
                        [name]="'checkpoint-building-' + i"
                        placeholder="Building name"
                        class="form-control">
                    </div>
                    <div class="form-group">
                      <label>Floor Number</label>
                      <input 
                        type="number" 
                        [(ngModel)]="checkpoint.floorNumber" 
                        [name]="'checkpoint-floor-' + i"
                        placeholder="0"
                        class="form-control">
                    </div>
                    <div class="form-group">
                      <label>Area</label>
                      <input 
                        type="text" 
                        [(ngModel)]="checkpoint.area" 
                        [name]="'checkpoint-area-' + i"
                        placeholder="Area/zone"
                        class="form-control">
                    </div>
                    <div class="form-group">
                      <label>Expected Duration (minutes)</label>
                      <input 
                        type="number" 
                        [(ngModel)]="checkpoint.expectedDuration" 
                        [name]="'checkpoint-duration-' + i"
                        min="0"
                        placeholder="5"
                        class="form-control">
                    </div>
                    <div class="form-group">
                      <label>Scan Window (minutes)</label>
                      <input 
                        type="number" 
                        [(ngModel)]="checkpoint.scanWindow" 
                        [name]="'checkpoint-window-' + i"
                        min="0"
                        placeholder="5"
                        class="form-control">
                    </div>
                    <div class="form-group">
                      <label>
                        <input 
                          type="checkbox" 
                          [(ngModel)]="checkpoint.isRequired" 
                          [name]="'checkpoint-required-' + i">
                        Required
                      </label>
                    </div>
                    <div class="form-group">
                      <label>
                        <input 
                          type="checkbox" 
                          [(ngModel)]="checkpoint.requiresPhoto" 
                          [name]="'checkpoint-photo-' + i">
                        Require Photo
                      </label>
                    </div>
                    <div class="form-group">
                      <label>
                        <input 
                          type="checkbox" 
                          [(ngModel)]="checkpoint.requiresNotes" 
                          [name]="'checkpoint-notes-' + i">
                        Require Notes
                      </label>
                    </div>
                    <div class="form-group full-width">
                      <label>Description</label>
                      <textarea 
                        [(ngModel)]="checkpoint.description" 
                        [name]="'checkpoint-desc-' + i"
                        rows="2"
                        placeholder="Checkpoint description"
                        class="form-control"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="no-checkpoints" *ngIf="checkpoints.length === 0">
              <i class="material-icons">place</i>
              <p>No checkpoints added yet. Click "Add Checkpoint" to create one.</p>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-section">
            <h3>Additional Information</h3>
            <div class="form-group full-width">
              <label>Notes</label>
              <textarea 
                [(ngModel)]="formData.notes" 
                name="notes"
                rows="4"
                placeholder="Additional notes or comments"
                class="form-control"></textarea>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="cancel()">
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting || checkpoints.length === 0">
              <i class="material-icons">{{ isEditMode ? 'save' : 'add' }}</i>
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Route' : 'Create Route') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .patrolling-route-form-container {
      padding: 24px;
      max-width: 1200px;
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

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section {
      margin-bottom: 32px;
    }

    .form-section h3 {
      font-size: 18px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .form-group label input[type="checkbox"] {
      margin-right: 8px;
    }

    .form-control {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      font-weight: normal;
      margin: 0;
    }

    .btn-add-checkpoint {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-add-checkpoint:hover {
      background: #5568d3;
    }

    .checkpoints-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .checkpoint-item {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      background: #f8f9fa;
    }

    .checkpoint-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .checkpoint-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;
    }

    .checkpoint-header h4 {
      flex: 1;
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .checkpoint-actions {
      display: flex;
      gap: 8px;
    }

    .btn-move,
    .btn-remove {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: white;
      color: #2c3e50;
      border: 1px solid #e0e0e0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-move:hover:not(:disabled) {
      background: #e0e0e0;
    }

    .btn-move:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-remove:hover {
      background: #f8d7da;
      color: #dc3545;
    }

    .qr-checkpoint-block {
      grid-column: 1 / -1;
      padding: 16px;
      background: #f0f4ff;
      border-radius: 10px;
      border: 1px dashed #667eea;
    }

    .qr-code-row {
      display: flex;
      gap: 10px;
      align-items: stretch;
    }

    .qr-code-row .form-control {
      flex: 1;
    }

    .btn-generate-code,
    .btn-qr-download {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      border-radius: 8px;
      padding: 10px 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-generate-code {
      background: #e8ecff;
      color: #4c5fd5;
    }

    .btn-generate-code:hover {
      background: #d8e0ff;
    }

    .btn-qr-download {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-qr-download:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn-qr-download .material-icons {
      font-size: 20px;
    }

    .qr-help {
      margin: 8px 0 12px;
      font-size: 12px;
      color: #64748b;
    }

    .qr-actions {
      margin-bottom: 12px;
    }

    .qr-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding-top: 8px;
    }

    .qr-preview img {
      width: 180px;
      height: 180px;
      border-radius: 8px;
      background: white;
      padding: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .qr-preview-code {
      font-family: monospace;
      font-size: 13px;
      color: #334155;
      word-break: break-all;
      text-align: center;
    }

    .checkpoint-form {
      background: white;
      padding: 16px;
      border-radius: 8px;
    }

    .no-checkpoints {
      text-align: center;
      padding: 40px;
      color: #7f8c8d;
    }

    .no-checkpoints .material-icons {
      font-size: 48px;
      margin-bottom: 12px;
      color: #ddd;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .btn-primary,
    .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
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
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .qr-code-row {
        flex-direction: column;
      }
    }
  `]
})
export class PatrollingRouteFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  isSubmitting = false;
  routeId: string | null = null;

  formData: CreatePatrollingRouteRequest = {
    name: '',
    status: RouteStatus.DRAFT,
    scheduleType: 'DAILY',
    requiresAllCheckpoints: true,
    allowSkipping: false,
    checkpoints: []
  };

  checkpoints: CreateCheckpointRequest[] = [];

  /** Live QR preview images keyed by checkpoint index in the form. */
  checkpointQrPreviews: Record<number, string> = {};
  qrGeneratingIndex: number | null = null;

  CheckpointType = CheckpointType;
  RouteStatus = RouteStatus;

  weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  private destroy$ = new Subject<void>();

  constructor(
    private routeService: PatrollingRouteService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.routeId = params['id'];
        this.isEditMode = true;
        if (this.routeId) {
          this.loadRoute(this.routeId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoute(id: string): void {
    this.routeService.getRouteById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (route) => {
          if (route) {
            this.formData = {
              name: route.name,
              description: route.description,
              code: route.code,
              status: route.status,
              scheduleType: route.scheduleType,
              scheduleDays: route.scheduleDays,
              scheduleTime: route.scheduleTime,
              startTime: route.startTime,
              endTime: route.endTime,
              estimatedDuration: route.estimatedDuration,
              assignedGuards: route.assignedGuards,
              assignedShifts: route.assignedShifts,
              requiresAllCheckpoints: route.requiresAllCheckpoints,
              allowSkipping: route.allowSkipping,
              maxLateMinutes: route.maxLateMinutes,
              notes: route.notes,
              tags: route.tags,
              checkpoints: [] // Will be populated from route.checkpoints below
            };
            this.checkpoints = route.checkpoints.map(cp => ({
              name: cp.name,
              description: cp.description,
              type: cp.type,
              location: cp.location,
              buildingName: cp.buildingName,
              floorNumber: cp.floorNumber,
              area: cp.area,
              latitude: cp.latitude,
              longitude: cp.longitude,
              qrCode: cp.qrCode,
              nfcTagId: cp.nfcTagId,
              checkpointCode: cp.checkpointCode,
              expectedDuration: cp.expectedDuration,
              scanWindow: cp.scanWindow,
              order: cp.order,
              isRequired: cp.isRequired,
              requiresPhoto: cp.requiresPhoto,
              requiresNotes: cp.requiresNotes,
              notes: cp.notes
            }));
            void this.refreshAllQrPreviews();
          }
        },
        error: (error) => {
          console.error('Error loading route:', error);
        }
      });
  }

  onScheduleTypeChange(): void {
    if (this.formData.scheduleType !== 'WEEKLY') {
      this.formData.scheduleDays = [];
    }
  }

  toggleScheduleDay(day: string): void {
    if (!this.formData.scheduleDays) {
      this.formData.scheduleDays = [];
    }
    const index = this.formData.scheduleDays.indexOf(day);
    if (index > -1) {
      this.formData.scheduleDays.splice(index, 1);
    } else {
      this.formData.scheduleDays.push(day);
    }
  }

  addCheckpoint(): void {
    const newCheckpoint: CreateCheckpointRequest = {
      name: '',
      type: CheckpointType.QR_CODE,
      location: '',
      order: this.checkpoints.length + 1,
      isRequired: true,
      requiresPhoto: false,
      requiresNotes: false
    };
    this.checkpoints.push(newCheckpoint);
  }

  removeCheckpoint(index: number): void {
    if (confirm('Are you sure you want to remove this checkpoint?')) {
      this.checkpoints.splice(index, 1);
      this.updateCheckpointOrders();
      this.checkpointQrPreviews = {};
      void this.refreshAllQrPreviews();
    }
  }

  moveCheckpointUp(index: number): void {
    if (index > 0) {
      [this.checkpoints[index], this.checkpoints[index - 1]] = [this.checkpoints[index - 1], this.checkpoints[index]];
      this.updateCheckpointOrders();
    }
  }

  moveCheckpointDown(index: number): void {
    if (index < this.checkpoints.length - 1) {
      [this.checkpoints[index], this.checkpoints[index + 1]] = [this.checkpoints[index + 1], this.checkpoints[index]];
      this.updateCheckpointOrders();
    }
  }

  updateCheckpointOrders(): void {
    this.checkpoints.forEach((cp, index) => {
      cp.order = index + 1;
    });
  }

  onCheckpointTypeChange(checkpoint: CreateCheckpointRequest): void {
    // Clear type-specific fields when type changes
    if (checkpoint.type !== CheckpointType.QR_CODE) {
      checkpoint.qrCode = undefined;
      checkpoint.checkpointCode = undefined;
    }
    if (checkpoint.type !== CheckpointType.NFC_TAG) {
      checkpoint.nfcTagId = undefined;
    }
    if (checkpoint.type !== CheckpointType.GPS_LOCATION) {
      checkpoint.latitude = undefined;
      checkpoint.longitude = undefined;
    }
  }

  /** Keep checkpointCode in sync with editable QR text. */
  onCheckpointQrChange(index: number): void {
    const cp = this.checkpoints[index];
    const value = cp.qrCode?.trim();
    if (value) {
      cp.checkpointCode = value;
    }
    delete this.checkpointQrPreviews[index];
  }

  /** Auto-fill a unique patrol checkpoint code from route + checkpoint names. */
  generateCheckpointCode(index: number): void {
    const cp = this.checkpoints[index];
    const routeLabel = this.formData.code || this.formData.name || 'ROUTE';
    const code = buildPatrolCheckpointCode(routeLabel, cp);
    cp.qrCode = code;
    cp.checkpointCode = code;
    void this.refreshQrPreview(index);
  }

  /** Build QR preview and download PNG for printing at the checkpoint location. */
  async generateAndDownloadQr(index: number): Promise<void> {
    const cp = this.checkpoints[index];
    if (!cp.qrCode?.trim()) {
      this.generateCheckpointCode(index);
    }
    const payload = cp.qrCode?.trim();
    if (!payload) {
      return;
    }

    this.qrGeneratingIndex = index;
    try {
      const dataUrl = await createPatrolQrDataUrl(payload);
      this.checkpointQrPreviews[index] = dataUrl;
      downloadQrPng(dataUrl, `patrol-qr-${payload}.png`);
    } catch (error) {
      console.error('Patrol QR generation failed:', error);
      alert('Could not generate QR code. Check the checkpoint code and try again.');
    } finally {
      this.qrGeneratingIndex = null;
    }
  }

  /** Refresh inline QR preview for one checkpoint row. */
  private async refreshQrPreview(index: number): Promise<void> {
    const cp = this.checkpoints[index];
    if (cp.type !== CheckpointType.QR_CODE || !cp.qrCode?.trim()) {
      delete this.checkpointQrPreviews[index];
      return;
    }
    try {
      this.checkpointQrPreviews[index] = await createPatrolQrDataUrl(cp.qrCode.trim(), 280);
    } catch {
      delete this.checkpointQrPreviews[index];
    }
  }

  /** Refresh previews for all QR checkpoints (e.g. after loading an existing route). */
  private async refreshAllQrPreviews(): Promise<void> {
    this.checkpointQrPreviews = {};
    await Promise.all(
      this.checkpoints.map((_cp, index) => this.refreshQrPreview(index))
    );
  }

  /** Ensure checkpointCode is saved alongside qrCode before API submit. */
  private syncCheckpointCodes(): void {
    this.checkpoints.forEach(cp => {
      if (cp.type === CheckpointType.QR_CODE && cp.qrCode?.trim()) {
        cp.checkpointCode = cp.qrCode.trim();
      }
    });
  }

  onSubmit(): void {
    if (this.isSubmitting || this.checkpoints.length === 0) return;

    this.syncCheckpointCodes();
    this.isSubmitting = true;
    this.formData.checkpoints = this.checkpoints;

    if (this.isEditMode && this.routeId) {
      const updateRequest: UpdatePatrollingRouteRequest = {
        name: this.formData.name,
        description: this.formData.description,
        code: this.formData.code,
        checkpoints: this.checkpoints,
        status: this.formData.status,
        scheduleType: this.formData.scheduleType,
        scheduleDays: this.formData.scheduleDays,
        scheduleTime: this.formData.scheduleTime,
        startTime: this.formData.startTime,
        endTime: this.formData.endTime,
        estimatedDuration: this.formData.estimatedDuration,
        requiresAllCheckpoints: this.formData.requiresAllCheckpoints,
        allowSkipping: this.formData.allowSkipping,
        maxLateMinutes: this.formData.maxLateMinutes,
        notes: this.formData.notes
      };

      this.routeService.updateRoute(this.routeId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/admin/guard-patrol/routes']);
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('Error updating route:', error);
            alert('Error updating route');
            this.isSubmitting = false;
          }
        });
    } else {
      this.routeService.createRoute(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/admin/guard-patrol/routes']);
            } else {
              alert('Error: ' + (response.errors?.join(', ') || response.message));
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('Error creating route:', error);
            alert('Error creating route');
            this.isSubmitting = false;
          }
        });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/guard-patrol/routes']);
  }
}

