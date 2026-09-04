import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  CreateCabTaxiEntryRequest,
  VehicleType,
  CabTaxiEntryResponse
} from '../models/cab-taxi-entry.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-cab-taxi-entry-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="form-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1><i class="material-icons">local_taxi</i> New Cab/Taxi Entry</h1>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <div class="form-section">
            <h2>Vehicle Information</h2>
            <div class="form-grid">
              <div class="form-group">
                <label>Vehicle Type *</label>
                <select [(ngModel)]="formData.entryType" name="entryType" required>
                  <option [value]="VehicleType.CAB">Cab</option>
                  <option [value]="VehicleType.TAXI">Taxi</option>
                  <option [value]="VehicleType.AUTO_RICKSHAW">Auto Rickshaw</option>
                  <option [value]="VehicleType.PRIVATE_CAR">Private Car</option>
                  <option [value]="VehicleType.OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Vehicle Number *</label>
                <input type="text" [(ngModel)]="formData.vehicleNumber" name="vehicleNumber" required>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Driver Information</h2>
            <div class="form-grid">
              <div class="form-group">
                <label>Driver Name *</label>
                <input type="text" [(ngModel)]="formData.driverName" name="driverName" required>
              </div>
              <div class="form-group">
                <label>Driver Phone *</label>
                <input type="tel" [(ngModel)]="formData.driverPhone" name="driverPhone" required>
              </div>
              <div class="form-group">
                <label>Driver License</label>
                <input type="text" [(ngModel)]="formData.driverLicense" name="driverLicense">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Passenger Information</h2>
            <div class="form-grid">
              <div class="form-group">
                <label>Passenger Name *</label>
                <input type="text" [(ngModel)]="formData.passengerName" name="passengerName" required>
              </div>
              <div class="form-group">
                <label>Passenger Phone *</label>
                <input type="tel" [(ngModel)]="formData.passengerPhone" name="passengerPhone" required>
              </div>
              <div class="form-group">
                <label>Passenger Email</label>
                <input type="email" [(ngModel)]="formData.passengerEmail" name="passengerEmail">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Visit Details</h2>
            <div class="form-grid">
              <div class="form-group">
                <label>Visiting Flat *</label>
                <input type="text" [(ngModel)]="formData.visitingFlat" name="visitingFlat" required>
              </div>
              <div class="form-group">
                <label>Visiting Unit</label>
                <input type="text" [(ngModel)]="formData.visitingUnit" name="visitingUnit">
              </div>
              <div class="form-group">
                <label>Purpose *</label>
                <input type="text" [(ngModel)]="formData.purpose" name="purpose" required>
              </div>
              <div class="form-group">
                <label>Expected Duration (minutes)</label>
                <input type="number" [(ngModel)]="formData.expectedDuration" name="expectedDuration" min="1">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Additional Information</h2>
            <div class="form-group">
              <label>Notes</label>
              <textarea [(ngModel)]="formData.notes" name="notes" rows="3"></textarea>
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" [(ngModel)]="formData.requiresApproval" name="requiresApproval">
                Requires Approval
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <i class="material-icons" *ngIf="!isSubmitting">save</i>
              <i class="material-icons" *ngIf="isSubmitting">hourglass_empty</i>
              {{ isSubmitting ? 'Creating...' : 'Create Entry' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .btn-back {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
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
    }

    .form-section h2 {
      font-size: 18px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
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
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .checkbox-group input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .btn-primary,
    .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
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
  `]
})
export class CabTaxiEntryFormComponent implements OnInit {
  formData: CreateCabTaxiEntryRequest = {
    entryType: VehicleType.CAB,
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    driverLicense: '',
    passengerName: '',
    passengerPhone: '',
    passengerEmail: '',
    visitingFlat: '',
    visitingUnit: '',
    hostId: 'CURRENT_USER', // In real app, get from auth service
    purpose: '',
    expectedDuration: undefined,
    requiresApproval: false,
    notes: ''
  };

  isSubmitting = false;
  VehicleType = VehicleType;

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.visitorService.createCabTaxiEntry(this.formData).subscribe({
      next: (response: CabTaxiEntryResponse) => {
        this.isSubmitting = false;
        if (response.success && response.entry) {
          this.toast.success('Cab/Taxi entry created successfully.');
          this.router.navigate(['/admin/visitors/cab-taxi']);
        } else {
          this.toast.error(response.message || 'Failed to create entry.');
        }
      },
      error: (error) => {
        console.error('Error creating entry:', error);
        this.isSubmitting = false;
        this.toast.error('An error occurred while creating the entry.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/visitors/cab-taxi']);
  }
}
