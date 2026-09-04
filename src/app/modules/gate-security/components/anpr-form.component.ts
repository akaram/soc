import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ANPRService } from '../services/anpr.service';
import {
  CreateVehicleRegistrationRequest,
  VehicleCategory
} from '../models/anpr.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-anpr-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="anpr-form-container">
      <div class="page-header">
        <h1><i class="material-icons">add_circle</i> Register Vehicle for ANPR</h1>
        <p>Add a new vehicle to the Automatic Number Plate Recognition system</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <div class="form-section">
            <h3>Vehicle Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Vehicle Number *</label>
                <input type="text" [(ngModel)]="formData.vehicleNumber" name="vehicleNumber" required 
                       placeholder="e.g., MH-12-AB-1234" class="form-control">
              </div>
              <div class="form-group">
                <label>Vehicle Type *</label>
                <select [(ngModel)]="formData.vehicleType" name="vehicleType" required class="form-control">
                  <option value="">Select Type</option>
                  <option value="CAR">Car</option>
                  <option value="BIKE">Bike</option>
                  <option value="AUTO">Auto Rickshaw</option>
                  <option value="TRUCK">Truck</option>
                  <option value="BUS">Bus</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Vehicle Make</label>
                <input type="text" [(ngModel)]="formData.vehicleMake" name="vehicleMake" 
                       placeholder="e.g., Honda" class="form-control">
              </div>
              <div class="form-group">
                <label>Vehicle Model</label>
                <input type="text" [(ngModel)]="formData.vehicleModel" name="vehicleModel" 
                       placeholder="e.g., City" class="form-control">
              </div>
              <div class="form-group">
                <label>Vehicle Color</label>
                <input type="text" [(ngModel)]="formData.vehicleColor" name="vehicleColor" 
                       placeholder="e.g., White" class="form-control">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Owner Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Owner Name *</label>
                <input type="text" [(ngModel)]="formData.ownerName" name="ownerName" required 
                       class="form-control">
              </div>
              <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" [(ngModel)]="formData.ownerPhone" name="ownerPhone" required 
                       placeholder="+91 98765 43210" class="form-control">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" [(ngModel)]="formData.ownerEmail" name="ownerEmail" 
                       class="form-control">
              </div>
              <div class="form-group">
                <label>Owner Type *</label>
                <select [(ngModel)]="formData.ownerType" name="ownerType" required class="form-control">
                  <option [value]="VehicleCategory.RESIDENT">Resident</option>
                  <option [value]="VehicleCategory.STAFF">Staff</option>
                  <option [value]="VehicleCategory.VISITOR">Visitor</option>
                  <option [value]="VehicleCategory.VENDOR">Vendor</option>
                  <option [value]="VehicleCategory.DELIVERY">Delivery</option>
                  <option [value]="VehicleCategory.EMERGENCY">Emergency</option>
                </select>
              </div>
              <div class="form-group">
                <label>Flat Number</label>
                <input type="text" [(ngModel)]="formData.flatNumber" name="flatNumber" 
                       placeholder="e.g., A-101" class="form-control">
              </div>
              <div class="form-group">
                <label>Unit Number</label>
                <input type="text" [(ngModel)]="formData.unitNumber" name="unitNumber" 
                       class="form-control">
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              <i class="material-icons">arrow_back</i>
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <i class="material-icons">save</i>
              {{ isSubmitting ? 'Registering...' : 'Register Vehicle' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .anpr-form-container {
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
    }

    .form-section h3 {
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
      text-transform: uppercase;
    }

    .form-control {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-actions {
      display: flex;
      gap: 16px;
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
      border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }
  `]
})
export class ANPRFormComponent implements OnInit {
  formData: CreateVehicleRegistrationRequest = {
    vehicleNumber: '',
    vehicleType: '',
    ownerName: '',
    ownerPhone: '',
    ownerType: VehicleCategory.RESIDENT
  };
  isSubmitting = false;

  VehicleCategory = VehicleCategory;

  constructor(
    private anprService: ANPRService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Check if editing existing registration
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Load existing data for editing
      // For now, just show form
    }
  }

  onSubmit(): void {
    if (!this.formData.vehicleNumber || !this.formData.vehicleType || 
        !this.formData.ownerName || !this.formData.ownerPhone) {
      this.toast.warning('Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;
    this.anprService.createRegistration(this.formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success(response.message || 'Vehicle registered successfully!');
          this.router.navigate(['/admin/gate-security/anpr']);
        } else {
          this.toast.error(response.message || 'Failed to register vehicle');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error registering vehicle:', error);
        this.toast.error('An error occurred while registering vehicle');
        this.isSubmitting = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/anpr']);
  }
}

