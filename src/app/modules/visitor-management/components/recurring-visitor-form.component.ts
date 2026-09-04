import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  CreateRecurringVisitorRequest,
  RecurringVisitorResponse,
  RecurringVisitor,
  DailyHelpType
} from '../models/recurring-visitor.model';
import { RecurringPattern } from '../models/visitor.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-recurring-visitor-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="form-container">
      <div class="page-header">
        <button class="btn-back" routerLink="/admin/visitors/recurring">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1>{{ isEditMode ? 'Edit' : 'Add' }} Recurring Visitor</h1>
        <p>Setup recurring visitor for daily help services</p>
      </div>

      <div class="form-wrapper">
        <form (ngSubmit)="onSubmit()" #recurringForm="ngForm">
          <!-- Basic Information -->
          <div class="form-section">
            <h3><i class="material-icons">person</i> Visitor Information</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="name">Name <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="name" 
                  name="name"
                  [(ngModel)]="formData.name"
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
                <label for="purpose">Purpose/Service Type <span class="required">*</span></label>
                <select 
                  id="purpose" 
                  name="purpose"
                  [(ngModel)]="formData.purpose"
                  required>
                  <option value="">Select purpose</option>
                  <option value="Daily Help - Maid">Daily Help - Maid</option>
                  <option value="Daily Help - Cook">Daily Help - Cook</option>
                  <option value="Daily Help - Driver">Daily Help - Driver</option>
                  <option value="Daily Help - Nanny">Daily Help - Nanny</option>
                  <option value="Daily Help - Gardener">Daily Help - Gardener</option>
                  <option value="Daily Help - Security">Daily Help - Security</option>
                  <option value="Other">Other</option>
                </select>
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

            <div class="form-row">
              <div class="form-group">
                <label for="visitTime">Visit Time <span class="required">*</span></label>
                <input 
                  type="time" 
                  id="visitTime" 
                  name="visitTime"
                  [(ngModel)]="formData.visitTime"
                  required>
              </div>

              <div class="form-group">
                <label for="expectedDuration">Expected Duration (minutes)</label>
                <input 
                  type="number" 
                  id="expectedDuration" 
                  name="expectedDuration"
                  [(ngModel)]="formData.expectedDuration"
                  min="15"
                  value="120"
                  placeholder="120">
              </div>
            </div>
          </div>

          <!-- Recurring Pattern -->
          <div class="form-section">
            <h3><i class="material-icons">repeat</i> Recurring Pattern</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="recurringPattern">Pattern <span class="required">*</span></label>
                <select 
                  id="recurringPattern" 
                  name="recurringPattern"
                  [(ngModel)]="formData.recurringPattern"
                  required
                  (change)="onPatternChange()">
                  <option [value]="null">Select pattern</option>
                  <option [value]="recurringPatterns.DAILY">Daily</option>
                  <option [value]="recurringPatterns.WEEKLY">Weekly</option>
                  <option [value]="recurringPatterns.MONTHLY">Monthly</option>
                </select>
              </div>

              <div class="form-group">
                <label for="startDate">Start Date <span class="required">*</span></label>
                <input 
                  type="date" 
                  id="startDate" 
                  name="startDate"
                  [(ngModel)]="startDateString"
                  required
                  [min]="minDate">
              </div>
            </div>

            <div class="form-row" *ngIf="formData.recurringPattern === recurringPatterns.WEEKLY">
              <div class="form-group">
                <label>Days of Week <span class="required">*</span></label>
                <div class="days-selector">
                  <label class="day-checkbox" *ngFor="let day of daysOfWeek; let i = index">
                    <input 
                      type="checkbox" 
                      [value]="i"
                      [checked]="isDaySelected(i)"
                      (change)="toggleDay(i)">
                    <span>{{ day }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="endDate">End Date (Optional)</label>
                <input 
                  type="date" 
                  id="endDate" 
                  name="endDate"
                  [(ngModel)]="endDateString"
                  [min]="startDateString">
                <small>Leave empty for indefinite recurring visits</small>
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

          <!-- Settings -->
          <div class="form-section">
            <h3><i class="material-icons">settings</i> Settings</h3>
            
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    id="autoApprove"
                    name="autoApprove"
                    [(ngModel)]="formData.autoApprove"
                    [checked]="formData.autoApprove !== false">
                  <span>Auto-approve recurring visits</span>
                </label>
                <small>When enabled, visits will be automatically approved</small>
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
                placeholder="Any additional information about the recurring visitor..."></textarea>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button 
              type="button" 
              class="btn-secondary"
              routerLink="/admin/visitors/recurring">
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              [disabled]="!recurringForm.valid || isSubmitting">
              <i class="material-icons" *ngIf="!isSubmitting">{{ isEditMode ? 'save' : 'add' }}</i>
              <span *ngIf="isSubmitting">Saving...</span>
              <span *ngIf="!isSubmitting">{{ isEditMode ? 'Update' : 'Create' }} Recurring Visitor</span>
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

    .days-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .day-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      padding: 8px 12px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .day-checkbox:hover {
      border-color: #667eea;
    }

    .day-checkbox input[type="checkbox"]:checked + span {
      font-weight: 600;
      color: #667eea;
    }

    .day-checkbox input[type="checkbox"]:checked ~ span,
    .day-checkbox:has(input[type="checkbox"]:checked) {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.1);
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
export class RecurringVisitorFormComponent implements OnInit {
  formData: CreateRecurringVisitorRequest = {
    name: '',
    phone: '',
    email: '',
    visitingFlat: '',
    visitingUnit: '',
    purpose: '',
    visitTime: '',
    expectedDuration: 120,
    recurringPattern: RecurringPattern.DAILY,
    startDate: new Date(),
    autoApprove: true
  };

  startDateString: string = '';
  endDateString: string = '';
  minDate: string = '';
  isSubmitting = false;
  isEditMode = false;
  visitorId: string = '';

  recurringPatterns = RecurringPattern;
  daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  selectedDays: number[] = [];

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

    // Set default time to 9 AM
    this.formData.visitTime = '09:00';

    // Check if editing
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.visitorId = params['id'];
        this.loadVisitor();
      }
    });
  }

  loadVisitor(): void {
    this.visitorService.getRecurringVisitorById(this.visitorId).subscribe({
      next: (visitor) => {
        if (visitor) {
          this.formData = {
            name: visitor.name,
            phone: visitor.phone,
            email: visitor.email,
            visitingFlat: visitor.visitingFlat,
            visitingUnit: visitor.visitingUnit,
            purpose: visitor.purpose,
            visitTime: visitor.visitTime,
            expectedDuration: visitor.expectedDuration,
            vehicleNumber: visitor.vehicleNumber,
            vehicleType: visitor.vehicleType,
            idProofNumber: visitor.idProofNumber,
            recurringPattern: visitor.recurringPattern,
            daysOfWeek: visitor.daysOfWeek,
            startDate: visitor.startDate,
            endDate: visitor.endDate,
            autoApprove: visitor.autoApprove,
            notes: visitor.notes
          };
          this.startDateString = new Date(visitor.startDate).toISOString().split('T')[0];
          if (visitor.endDate) {
            this.endDateString = new Date(visitor.endDate).toISOString().split('T')[0];
          }
          if (visitor.daysOfWeek) {
            this.selectedDays = [...visitor.daysOfWeek];
          }
        }
      },
      error: (error) => {
        console.error('Error loading visitor:', error);
      }
    });
  }

  onPatternChange(): void {
    if (this.formData.recurringPattern === RecurringPattern.DAILY) {
      this.selectedDays = [0, 1, 2, 3, 4, 5, 6]; // All days
    } else if (this.formData.recurringPattern === RecurringPattern.WEEKLY) {
      this.selectedDays = [1, 2, 3, 4, 5]; // Weekdays by default
    } else {
      this.selectedDays = [];
    }
  }

  isDaySelected(day: number): boolean {
    return this.selectedDays.includes(day);
  }

  toggleDay(day: number): void {
    const index = this.selectedDays.indexOf(day);
    if (index > -1) {
      this.selectedDays.splice(index, 1);
    } else {
      this.selectedDays.push(day);
    }
    this.selectedDays.sort();
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    // Convert date strings to Date objects
    this.formData.startDate = new Date(this.startDateString);
    if (this.endDateString) {
      this.formData.endDate = new Date(this.endDateString);
    }
    
    // Set days of week for weekly pattern
    if (this.formData.recurringPattern === RecurringPattern.WEEKLY) {
      this.formData.daysOfWeek = this.selectedDays;
    }

    this.isSubmitting = true;

    if (this.isEditMode) {
      this.visitorService.updateRecurringVisitor(this.visitorId, this.formData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.toast.success('Recurring visitor updated successfully.');
            this.router.navigate(['/admin/visitors/recurring']);
          } else {
            this.toast.error(response.message || 'Failed to update recurring visitor.');
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error updating visitor:', error);
          this.toast.error('An error occurred. Please try again.');
        }
      });
    } else {
      this.visitorService.createRecurringVisitor(this.formData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.toast.success('Recurring visitor created successfully.');
            this.router.navigate(['/admin/visitors/recurring']);
          } else {
            this.toast.error(response.message || 'Failed to create recurring visitor.');
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error creating visitor:', error);
          this.toast.error('An error occurred. Please try again.');
        }
      });
    }
  }
}

