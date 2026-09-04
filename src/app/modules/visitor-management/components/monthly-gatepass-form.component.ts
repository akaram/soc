import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  CreateMonthlyGatepassRequest,
  MonthlyGatepassResponse,
  MonthlyGatepass
} from '../models/monthly-gatepass.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-monthly-gatepass-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="form-container">
      <div class="page-header">
        <button class="btn-back" routerLink="/admin/visitors/gatepass">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1>{{ isEditMode ? 'Edit' : 'Create' }} Monthly Gatepass</h1>
        <p>Setup monthly gatepass for frequent visitors</p>
      </div>

      <div class="form-wrapper">
        <form (ngSubmit)="onSubmit()" #gatepassForm="ngForm">
          <!-- Visitor Information -->
          <div class="form-section">
            <h3><i class="material-icons">person</i> Visitor Information</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="visitorName">Visitor Name <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="visitorName" 
                  name="visitorName"
                  [(ngModel)]="formData.visitorName"
                  required
                  placeholder="Enter visitor's full name">
              </div>

              <div class="form-group">
                <label for="phone">Phone Number <span class="required">*</span></label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone"
                  [(ngModel)]="formData.phone"
                  required
                  placeholder="+91 98765 43210">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="email">Email (Optional)</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  [(ngModel)]="formData.email"
                  placeholder="visitor@example.com">
              </div>

              <div class="form-group">
                <label for="purpose">Purpose <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="purpose" 
                  name="purpose"
                  [(ngModel)]="formData.purpose"
                  required
                  placeholder="e.g., Frequent Business Visitor, Family Friend">
              </div>
            </div>
          </div>

          <!-- Visit Details -->
          <div class="form-section">
            <h3><i class="material-icons">home</i> Visit Details</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="visitingFlat">Visiting Flat/Unit <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="visitingFlat" 
                  name="visitingFlat"
                  [(ngModel)]="formData.visitingFlat"
                  required
                  placeholder="A-101">
              </div>

              <div class="form-group">
                <label for="visitingUnit">Tower/Block (Optional)</label>
                <input 
                  type="text" 
                  id="visitingUnit" 
                  name="visitingUnit"
                  [(ngModel)]="formData.visitingUnit"
                  placeholder="Tower A">
              </div>
            </div>
          </div>

          <!-- Validity Period -->
          <div class="form-section">
            <h3><i class="material-icons">calendar_today</i> Validity Period</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="startDate">Start Date <span class="required">*</span></label>
                <input 
                  type="date" 
                  id="startDate" 
                  name="startDate"
                  [(ngModel)]="startDateString"
                  required
                  [min]="minDate"
                  (change)="onDateChange()">
              </div>

              <div class="form-group">
                <label for="endDate">End Date <span class="required">*</span></label>
                <input 
                  type="date" 
                  id="endDate" 
                  name="endDate"
                  [(ngModel)]="endDateString"
                  required
                  [min]="startDateString"
                  (change)="onDateChange()">
                <small *ngIf="validityDays > 0">Valid for {{ validityDays }} days</small>
              </div>
            </div>
          </div>

          <!-- Visit Limits -->
          <div class="form-section">
            <h3><i class="material-icons">settings</i> Visit Limits & Settings</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="maxVisitsPerMonth">Max Visits Per Month (Optional)</label>
                <input 
                  type="number" 
                  id="maxVisitsPerMonth" 
                  name="maxVisitsPerMonth"
                  [(ngModel)]="formData.maxVisitsPerMonth"
                  min="1"
                  placeholder="Leave empty for unlimited">
                <small>Set a limit on number of visits per month</small>
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    id="autoApprove"
                    name="autoApprove"
                    [(ngModel)]="formData.autoApprove"
                    [checked]="formData.autoApprove !== false">
                  <span>Auto-approve gatepass</span>
                </label>
                <small>When enabled, gatepass will be automatically approved</small>
              </div>
            </div>
          </div>

          <!-- Vehicle Information -->
          <div class="form-section">
            <h3><i class="material-icons">directions_car</i> Vehicle Information (Optional)</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="vehicleNumber">Vehicle Number</label>
                <input 
                  type="text" 
                  id="vehicleNumber" 
                  name="vehicleNumber"
                  [(ngModel)]="formData.vehicleNumber"
                  placeholder="DL 01 AB 1234">
              </div>

              <div class="form-group">
                <label for="vehicleType">Vehicle Type</label>
                <input 
                  type="text" 
                  id="vehicleType" 
                  name="vehicleType"
                  [(ngModel)]="formData.vehicleType"
                  placeholder="Two Wheeler / Four Wheeler">
              </div>
            </div>
          </div>

          <!-- ID Proof -->
          <div class="form-section">
            <h3><i class="material-icons">badge</i> ID Proof</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="idProofNumber">ID Proof Number</label>
                <input 
                  type="text" 
                  id="idProofNumber" 
                  name="idProofNumber"
                  [(ngModel)]="formData.idProofNumber"
                  placeholder="Aadhaar/PAN/DL Number">
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-section">
            <div class="form-group">
              <label for="notes">Additional Notes (Optional)</label>
              <textarea 
                id="notes" 
                name="notes"
                [(ngModel)]="formData.notes"
                rows="3"
                placeholder="Any additional information about the gatepass..."></textarea>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button 
              type="button" 
              class="btn-secondary"
              routerLink="/admin/visitors/gatepass">
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              [disabled]="!gatepassForm.valid || isSubmitting || validityDays <= 0">
              <i class="material-icons" *ngIf="!isSubmitting">{{ isEditMode ? 'save' : 'add' }}</i>
              <span *ngIf="isSubmitting">Saving...</span>
              <span *ngIf="!isSubmitting">{{ isEditMode ? 'Update' : 'Create' }} Gatepass</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 1000px;
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
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    .form-wrapper {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .form-section {
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 1px solid #e0e0e0;
    }

    .form-section:last-child {
      border-bottom: none;
    }

    .form-section h3 {
      font-size: 20px;
      margin: 0 0 24px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-section h3 .material-icons {
      color: #667eea;
      font-size: 24px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 8px;
      font-weight: 500;
      color: #2c3e50;
      font-size: 14px;
    }

    .required {
      color: #e74c3c;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group small {
      margin-top: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
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

    .form-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
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

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .form-container {
        padding: 16px;
      }

      .form-wrapper {
        padding: 20px;
      }
    }
  `]
})
export class MonthlyGatepassFormComponent implements OnInit {
  formData: CreateMonthlyGatepassRequest = {
    visitorName: '',
    phone: '',
    email: '',
    visitingFlat: '',
    visitingUnit: '',
    purpose: '',
    startDate: new Date(),
    endDate: new Date(),
    autoApprove: true
  };

  startDateString: string = '';
  endDateString: string = '';
  minDate: string = '';
  validityDays: number = 0;
  isSubmitting = false;
  isEditMode = false;
  gatepassId: string = '';

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.startDateString = this.minDate;
    this.formData.startDate = today;

    // Set end date to one month from today
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.endDateString = nextMonth.toISOString().split('T')[0];
    this.formData.endDate = nextMonth;
    this.calculateValidityDays();

    // Check if editing
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.gatepassId = params['id'];
        this.loadGatepass();
      }
    });
  }

  loadGatepass(): void {
    this.visitorService.getMonthlyGatepassById(this.gatepassId).subscribe({
      next: (gatepass) => {
        if (gatepass) {
          this.formData = {
            visitorName: gatepass.visitorName,
            phone: gatepass.phone,
            email: gatepass.email,
            visitingFlat: gatepass.visitingFlat,
            visitingUnit: gatepass.visitingUnit,
            purpose: gatepass.purpose,
            vehicleNumber: gatepass.vehicleNumber,
            vehicleType: gatepass.vehicleType,
            idProofNumber: gatepass.idProofNumber,
            startDate: gatepass.startDate,
            endDate: gatepass.endDate,
            autoApprove: gatepass.autoApprove,
            maxVisitsPerMonth: gatepass.maxVisitsPerMonth,
            notes: gatepass.notes
          };
          this.startDateString = new Date(gatepass.startDate).toISOString().split('T')[0];
          this.endDateString = new Date(gatepass.endDate).toISOString().split('T')[0];
          this.calculateValidityDays();
        }
      },
      error: (error) => {
        console.error('Error loading gatepass:', error);
      }
    });
  }

  onDateChange(): void {
    if (this.startDateString && this.endDateString) {
      this.formData.startDate = new Date(this.startDateString);
      this.formData.endDate = new Date(this.endDateString);
      this.calculateValidityDays();
    }
  }

  calculateValidityDays(): void {
    if (this.formData.startDate && this.formData.endDate) {
      const diff = this.formData.endDate.getTime() - this.formData.startDate.getTime();
      this.validityDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  onSubmit(): void {
    if (this.isSubmitting || this.validityDays <= 0) return;

    // Convert date strings to Date objects
    this.formData.startDate = new Date(this.startDateString);
    this.formData.endDate = new Date(this.endDateString);

    this.isSubmitting = true;

    if (this.isEditMode) {
      this.visitorService.updateMonthlyGatepass(this.gatepassId, this.formData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.toast.success('Monthly gatepass updated successfully.');
            this.router.navigate(['/admin/visitors/gatepass']);
          } else {
            this.toast.error(response.message || 'Failed to update gatepass.');
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error updating gatepass:', error);
          this.toast.error('An error occurred. Please try again.');
        }
      });
    } else {
      this.visitorService.createMonthlyGatepass(this.formData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.toast.success('Monthly gatepass created successfully.');
            this.router.navigate(['/admin/visitors/gatepass']);
          } else {
            this.toast.error(response.message || 'Failed to create gatepass.');
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error creating gatepass:', error);
          this.toast.error('An error occurred. Please try again.');
        }
      });
    }
  }
}

