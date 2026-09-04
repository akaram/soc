import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { IncidentReportService } from '../services/incident-report.service';
import {
  IncidentReport,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  Priority,
  CreateIncidentReportRequest,
  UpdateIncidentReportRequest
} from '../models/incident-report.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-incident-report-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="incident-report-form-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
          Back
        </button>
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit Incident Report' : 'Report New Incident' }}
        </h1>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Incident Information</h3>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>Title *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.title" 
                  name="title" 
                  required
                  placeholder="Brief description of the incident"
                  class="form-control">
              </div>
              <div class="form-group full-width">
                <label>Description *</label>
                <textarea 
                  [(ngModel)]="formData.description" 
                  name="description" 
                  required
                  rows="4"
                  placeholder="Detailed description of what happened..."
                  class="form-control"></textarea>
              </div>
              <div class="form-group">
                <label>Incident Type *</label>
                <select [(ngModel)]="formData.type" name="type" required class="form-control">
                  <option [value]="IncidentType.THEFT">Theft</option>
                  <option [value]="IncidentType.VANDALISM">Vandalism</option>
                  <option [value]="IncidentType.UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                  <option [value]="IncidentType.TRESPASSING">Trespassing</option>
                  <option [value]="IncidentType.MEDICAL_EMERGENCY">Medical Emergency</option>
                  <option [value]="IncidentType.FIRE">Fire</option>
                  <option [value]="IncidentType.SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                  <option [value]="IncidentType.EQUIPMENT_FAILURE">Equipment Failure</option>
                  <option [value]="IncidentType.SECURITY_BREACH">Security Breach</option>
                  <option [value]="IncidentType.ASSAULT">Assault</option>
                  <option [value]="IncidentType.VEHICLE_ACCIDENT">Vehicle Accident</option>
                  <option [value]="IncidentType.NATURAL_DISASTER">Natural Disaster</option>
                  <option [value]="IncidentType.OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Severity *</label>
                <select [(ngModel)]="formData.severity" name="severity" required class="form-control">
                  <option [value]="IncidentSeverity.LOW">Low</option>
                  <option [value]="IncidentSeverity.MEDIUM">Medium</option>
                  <option [value]="IncidentSeverity.HIGH">High</option>
                  <option [value]="IncidentSeverity.CRITICAL">Critical</option>
                </select>
              </div>
              <div class="form-group">
                <label>Priority *</label>
                <select [(ngModel)]="formData.priority" name="priority" required class="form-control">
                  <option [value]="Priority.LOW">Low</option>
                  <option [value]="Priority.NORMAL">Normal</option>
                  <option [value]="Priority.HIGH">High</option>
                  <option [value]="Priority.URGENT">Urgent</option>
                </select>
              </div>
              <div class="form-group">
                <label>Incident Date & Time *</label>
                <input 
                  type="datetime-local" 
                  [(ngModel)]="incidentDateTimeInput"
                  (change)="onIncidentDateTimeChange()"
                  name="incidentDateTime"
                  required
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Location Information -->
          <div class="form-section">
            <h3>Location Information</h3>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>Location *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.location" 
                  name="location" 
                  required
                  placeholder="e.g., Main Gate - Building A"
                  class="form-control">
              </div>
              <div class="form-group full-width">
                <label>Location Details</label>
                <textarea 
                  [(ngModel)]="formData.locationDetails" 
                  name="locationDetails"
                  rows="2"
                  placeholder="Additional location details..."
                  class="form-control"></textarea>
              </div>
            </div>
          </div>

          <!-- Patrol Information (Optional) -->
          <div class="form-section">
            <h3>Patrol Information (Optional)</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Route Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.routeName" 
                  name="routeName"
                  placeholder="e.g., Main Building Perimeter Route"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Checkpoint Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.checkpointName" 
                  name="checkpointName"
                  placeholder="e.g., Main Gate"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Reporting Guard -->
          <div class="form-section">
            <h3>Reporting Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Guard Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.reportedByGuardName" 
                  name="reportedByGuardName" 
                  required
                  placeholder="Your name"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Guard ID *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.reportedByGuardId" 
                  name="reportedByGuardId" 
                  required
                  placeholder="e.g., GUARD-001"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="form-section">
            <h3>Tags (Optional)</h3>
            <div class="form-group full-width">
              <input 
                type="text" 
                [(ngModel)]="tagsInput"
                (blur)="updateTags()"
                name="tags"
                placeholder="Enter tags separated by commas (e.g., urgent, security-breach)"
                class="form-control">
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <i class="material-icons">{{ isEditMode ? 'save' : 'report' }}</i>
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Incident' : 'Report Incident') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .incident-report-form-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .btn-back {
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

    .btn-back:hover {
      background: #e0e0e0;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f0f0f0;
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .form-section h3 {
      font-size: 18px;
      margin: 0 0 20px 0;
      color: #2c3e50;
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

    .form-control {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .btn-secondary {
      padding: 12px 24px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-primary {
      padding: 12px 24px;
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
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class IncidentReportFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  isSubmitting = false;
  incidentId: string | null = null;

  formData: {
    title: string;
    description: string;
    type: IncidentType;
    severity: IncidentSeverity;
    priority: Priority;
    location: string;
    locationDetails?: string;
    routeName?: string;
    checkpointName?: string;
    reportedByGuardId: string;
    reportedByGuardName: string;
    incidentDateTime: Date;
    tags?: string[];
  } = {
    title: '',
    description: '',
    type: IncidentType.OTHER,
    severity: IncidentSeverity.MEDIUM,
    priority: Priority.NORMAL,
    location: '',
    locationDetails: '',
    reportedByGuardId: 'GUARD-001',
    reportedByGuardName: 'Current Guard',
    incidentDateTime: new Date()
  };

  incidentDateTimeInput = '';
  tagsInput = '';

  IncidentType = IncidentType;
  IncidentSeverity = IncidentSeverity;
  Priority = Priority;

  private destroy$ = new Subject<void>();

  constructor(
    private incidentService: IncidentReportService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      if (params['id']) {
        this.incidentId = params['id'];
        this.isEditMode = this.activatedRoute.snapshot.url[this.activatedRoute.snapshot.url.length - 1].path !== 'edit' 
          ? false 
          : true;
        if (this.incidentId && this.isEditMode) {
          this.loadIncident(this.incidentId);
        }
      }
    });

    // Set default incident date/time to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.incidentDateTimeInput = now.toISOString().slice(0, 16);
    this.formData.incidentDateTime = now;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadIncident(id: string): void {
    this.incidentService.getIncidentById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (incident) => {
          if (incident) {
            const dt = new Date(incident.incidentDateTime);
            dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
            this.incidentDateTimeInput = dt.toISOString().slice(0, 16);
            
            this.formData = {
              title: incident.title,
              description: incident.description,
              type: incident.type,
              severity: incident.severity,
              priority: incident.priority,
              location: incident.location,
              locationDetails: incident.locationDetails,
              routeName: incident.routeName,
              checkpointName: incident.checkpointName,
              reportedByGuardId: incident.reportedByGuardId,
              reportedByGuardName: incident.reportedByGuardName,
              incidentDateTime: incident.incidentDateTime,
              tags: incident.tags
            };
            
            if (incident.tags) {
              this.tagsInput = incident.tags.join(', ');
            }
          }
        },
        error: (error) => {
          console.error('Error loading incident:', error);
        }
      });
  }

  onIncidentDateTimeChange(): void {
    if (this.incidentDateTimeInput) {
      this.formData.incidentDateTime = new Date(this.incidentDateTimeInput);
    }
  }

  updateTags(): void {
    if (this.tagsInput) {
      this.formData.tags = this.tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } else {
      this.formData.tags = [];
    }
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.updateTags();

    if (this.isEditMode && this.incidentId) {
      // Update existing incident
      const updateRequest: UpdateIncidentReportRequest = {
        title: this.formData.title,
        description: this.formData.description,
        type: this.formData.type,
        severity: this.formData.severity,
        priority: this.formData.priority,
        location: this.formData.location,
        locationDetails: this.formData.locationDetails,
        tags: this.formData.tags
      };
      
      this.incidentService.updateIncident(this.incidentId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/guard-patrol/incidents', this.incidentId]);
            } else {
              window.alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error updating incident:', error);
            this.isSubmitting = false;
            window.alert('Error updating incident');
          }
        });
    } else {
      // Create new incident
      const createRequest: CreateIncidentReportRequest = {
        title: this.formData.title,
        description: this.formData.description,
        type: this.formData.type,
        severity: this.formData.severity,
        priority: this.formData.priority,
        location: this.formData.location,
        locationDetails: this.formData.locationDetails,
        routeName: this.formData.routeName,
        checkpointName: this.formData.checkpointName,
        reportedByGuardId: this.formData.reportedByGuardId,
        reportedByGuardName: this.formData.reportedByGuardName,
        incidentDateTime: this.formData.incidentDateTime,
        tags: this.formData.tags
      };
      
      this.incidentService.createIncident(createRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success && response.incident) {
              this.router.navigate(['/admin/guard-patrol/incidents', response.incident.id]);
            } else {
              window.alert('Error: ' + (response.errors?.join(', ') || response.message));
            }
          },
          error: (error) => {
            console.error('Error creating incident:', error);
            this.isSubmitting = false;
            window.alert('Error creating incident');
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/guard-patrol/incidents']);
  }
}

