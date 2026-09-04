import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { InvestigationService } from '../services/investigation.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  Investigation,
  InvestigationType,
  InvestigationPriority,
  CreateInvestigationRequest,
  UpdateInvestigationRequest
} from '../models/investigation.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-investigation-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="investigation-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit Investigation' : 'New Investigation' }}
        </h1>
        <p>{{ isEditMode ? 'Update investigation details' : 'Create a new security investigation' }}</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Investigation Type *</label>
                <select 
                  [(ngModel)]="formData.type" 
                  name="type" 
                  required
                  class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="InvestigationType.SECURITY_INCIDENT">Security Incident</option>
                  <option [value]="InvestigationType.THEFT">Theft</option>
                  <option [value]="InvestigationType.VANDALISM">Vandalism</option>
                  <option [value]="InvestigationType.UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                  <option [value]="InvestigationType.SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                  <option [value]="InvestigationType.EMPTY_FLAT_INVESTIGATION">Empty Flat Investigation</option>
                  <option [value]="InvestigationType.VISITOR_VIOLATION">Visitor Violation</option>
                  <option [value]="InvestigationType.VEHICLE_VIOLATION">Vehicle Violation</option>
                  <option [value]="InvestigationType.OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Priority *</label>
                <select 
                  [(ngModel)]="formData.priority" 
                  name="priority" 
                  required
                  class="form-control">
                  <option value="">Select Priority</option>
                  <option [value]="InvestigationPriority.URGENT">Urgent</option>
                  <option [value]="InvestigationPriority.HIGH">High</option>
                  <option [value]="InvestigationPriority.MEDIUM">Medium</option>
                  <option [value]="InvestigationPriority.LOW">Low</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Title *</label>
              <input 
                type="text" 
                [(ngModel)]="formData.title" 
                name="title" 
                required
                placeholder="Brief title of the investigation"
                class="form-control">
            </div>
            <div class="form-group">
              <label>Description *</label>
              <textarea 
                [(ngModel)]="formData.description" 
                name="description"
                required
                rows="5"
                placeholder="Detailed description of the incident..."
                class="form-control"></textarea>
            </div>
          </div>

          <!-- Location Information -->
          <div class="form-section">
            <h3>Location Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Flat Number</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.flatNumber" 
                  name="flatNumber"
                  placeholder="e.g., A-101"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Unit Number</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.unitNumber" 
                  name="unitNumber"
                  placeholder="Unit number"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Building Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.buildingName" 
                  name="buildingName"
                  placeholder="Building name"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Gate</label>
                <select [(ngModel)]="formData.gateId" name="gateId" class="form-control">
                  <option value="">Select Gate</option>
                  <option value="MAIN_GATE">Main Gate</option>
                  <option value="SIDE_GATE">Side Gate</option>
                  <option value="PARKING_GATE">Parking Gate</option>
                  <option value="EMERGENCY_GATE">Emergency Gate</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Location Details</label>
              <input 
                type="text" 
                [(ngModel)]="formData.location" 
                name="location"
                placeholder="Additional location details"
                class="form-control">
            </div>
          </div>

          <!-- Additional Information -->
          <div class="form-section">
            <h3>Additional Information</h3>
            <div class="form-group">
              <label>Notes</label>
              <textarea 
                [(ngModel)]="formData.notes" 
                name="notes"
                rows="3"
                placeholder="Additional notes..."
                class="form-control"></textarea>
            </div>
            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  [(ngModel)]="formData.isConfidential" 
                  name="isConfidential">
                Mark as Confidential
              </label>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              <i class="material-icons">arrow_back</i>
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <i class="material-icons">save</i>
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Investigation' : 'Create Investigation') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .investigation-form-container {
      padding: 24px;
      max-width: 1000px;
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

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f0f0f0;
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .form-section h3 {
      font-size: 18px;
      color: #2c3e50;
      margin: 0 0 20px 0;
      font-weight: 600;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
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
      padding: 12px;
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

    .btn-secondary {
      padding: 12px 24px;
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

    .btn-secondary:hover {
      background: #e0e0e0;
    }
  `]
})
export class InvestigationFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  investigationId: string | null = null;
  isSubmitting = false;
  formData: CreateInvestigationRequest = {
    type: InvestigationType.SECURITY_INCIDENT,
    title: '',
    description: '',
    priority: InvestigationPriority.MEDIUM,
    reportedBy: '',
    isConfidential: false
  };

  InvestigationType = InvestigationType;
  InvestigationPriority = InvestigationPriority;

  private destroy$ = new Subject<void>();

  constructor(
    private investigationService: InvestigationService,
    private session: SessionContextService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.formData.reportedBy = this.session.getCurrentUserId();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.investigationId = params['id'];
        this.isEditMode = this.route.snapshot.url.some(segment => segment.path === 'edit');
        if (this.isEditMode) {
          this.loadInvestigation();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInvestigation(): void {
    if (!this.investigationId) return;

    this.investigationService.getInvestigationById(this.investigationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (investigation) => {
          if (investigation) {
            this.formData = {
              type: investigation.type,
              title: investigation.title,
              description: investigation.description,
              priority: investigation.priority,
              flatNumber: investigation.flatNumber,
              unitNumber: investigation.unitNumber,
              buildingName: investigation.buildingName,
              gateId: investigation.gateId,
              location: investigation.location,
              reportedBy: investigation.reportedBy,
              isConfidential: investigation.isConfidential,
              notes: investigation.notes
            };
          }
        },
        error: (error) => {
          console.error('Error loading investigation:', error);
        }
      });
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.isEditMode && this.investigationId) {
      const updateRequest: UpdateInvestigationRequest = {
        priority: this.formData.priority,
        notes: this.formData.notes,
        isConfidential: this.formData.isConfidential
      };

      this.investigationService.updateInvestigation(this.investigationId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/gate-security/investigation']);
            } else {
              alert(response.message || 'Failed to update investigation');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error updating investigation:', error);
            alert('An error occurred while updating the investigation');
          }
        });
    } else {
      this.investigationService.createInvestigation(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/gate-security/investigation']);
            } else {
              alert(response.message || 'Failed to create investigation');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error creating investigation:', error);
            alert('An error occurred while creating the investigation');
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/investigation']);
  }
}
















































