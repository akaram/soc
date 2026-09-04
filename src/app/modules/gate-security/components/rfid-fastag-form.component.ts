import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { RFIDFastagService } from '../services/rfid-fastag.service';
import {
  CreateRFIDRegistrationRequest,
  TagType,
  VehicleCategory
} from '../models/rfid-fastag.model';

@Component({
  selector: 'app-rfid-fastag-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="rfid-form-container">
      <div class="page-header">
        <h1><i class="material-icons">add_circle</i> Register RFID/FASTag</h1>
        <p>Add a new RFID or FASTag for automatic gate opening</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <div class="form-section">
            <h3>Tag Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Tag ID *</label>
                <input type="text" [(ngModel)]="formData.tagId" name="tagId" required 
                       placeholder="e.g., RFID-1234567890" class="form-control">
              </div>
              <div class="form-group">
                <label>Tag Type *</label>
                <select [(ngModel)]="formData.tagType" name="tagType" required class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="TagType.RFID">RFID</option>
                  <option [value]="TagType.FASTAG">FASTag</option>
                  <option [value]="TagType.NFC">NFC</option>
                  <option [value]="TagType.BLUETOOTH">Bluetooth</option>
                </select>
              </div>
            </div>
          </div>

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

          <div class="form-section">
            <h3>Access Configuration</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Allowed Gates</label>
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="gates['MAIN_GATE']" name="mainGate">
                    Main Gate
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="gates['SIDE_GATE']" name="sideGate">
                    Side Gate
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="gates['PARKING_GATE']" name="parkingGate">
                    Parking Gate
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="gates['EMERGENCY_GATE']" name="emergencyGate">
                    Emergency Gate
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label class="checkbox-control">
                  <input type="checkbox" [(ngModel)]="formData.autoOpen" name="autoOpen">
                  <span>Enable Automatic Gate Opening</span>
                </label>
                <small>When enabled, gate will open automatically when tag is detected</small>
              </div>
              <div class="form-group">
                <label class="checkbox-control">
                  <input type="checkbox" [(ngModel)]="formData.requiresApproval" name="requiresApproval">
                  <span>Require Manual Approval</span>
                </label>
                <small>When enabled, entry requires guard approval even if tag is recognized</small>
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
              {{ isSubmitting ? 'Registering...' : 'Register Tag' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .rfid-form-container {
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

    .form-group small {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .checkbox-control {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .checkbox-control input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
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
export class RFIDFastagFormComponent implements OnInit {
  formData: CreateRFIDRegistrationRequest = {
    tagId: '',
    tagType: TagType.RFID,
    vehicleNumber: '',
    vehicleType: '',
    ownerName: '',
    ownerPhone: '',
    ownerType: VehicleCategory.RESIDENT,
    autoOpen: true,
    requiresApproval: false
  };
  gates: { [key: string]: boolean } = {
    'MAIN_GATE': true,
    'SIDE_GATE': false,
    'PARKING_GATE': false,
    'EMERGENCY_GATE': false
  };
  isSubmitting = false;

  TagType = TagType;
  VehicleCategory = VehicleCategory;

  constructor(
    private rfidService: RFIDFastagService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Load existing data for editing
    }
  }

  onSubmit(): void {
    if (!this.formData.tagId || !this.formData.tagType || 
        !this.formData.vehicleNumber || !this.formData.vehicleType ||
        !this.formData.ownerName || !this.formData.ownerPhone) {
      alert('Please fill in all required fields');
      return;
    }

    // Get selected gates
    this.formData.allowedGates = Object.keys(this.gates).filter(key => this.gates[key as keyof typeof this.gates]) as string[];

    this.isSubmitting = true;
    this.rfidService.createRegistration(this.formData).subscribe({
      next: (response) => {
        if (response.success) {
          alert('RFID/FASTag registered successfully!');
          this.router.navigate(['/admin/gate-security/rfid-fastag']);
        } else {
          alert(response.message || 'Failed to register tag');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error registering tag:', error);
        alert('An error occurred while registering tag');
        this.isSubmitting = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/rfid-fastag']);
  }
}

