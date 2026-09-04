import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FacialRecognitionService } from '../services/facial-recognition.service';
import {
  CreateFacialProfileRequest,
  EntryType
} from '../models/facial-recognition.model';

@Component({
  selector: 'app-facial-recognition-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="facial-form-container">
      <div class="page-header">
        <h1><i class="material-icons">add_circle</i> Register New Face</h1>
        <p>Add a new facial recognition profile for touchless entry</p>
      </div>

      <div class="poc-notice">
        <i class="material-icons">info</i>
        <span>Use a clear front-facing face photo (JPG/PNG, min 120×120). POC stores an exact image fingerprint — verify with the same file later.</span>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <div class="form-section">
            <h3>Person Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Person Name *</label>
                <input type="text" [(ngModel)]="formData.personName" name="personName" required 
                       class="form-control">
              </div>
              <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" [(ngModel)]="formData.phone" name="phone" required 
                       placeholder="+91 98765 43210" class="form-control">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" [(ngModel)]="formData.email" name="email" 
                       class="form-control">
              </div>
              <div class="form-group">
                <label>Person Type *</label>
                <select [(ngModel)]="formData.personType" name="personType" required class="form-control">
                  <option [value]="EntryType.RESIDENT">Resident</option>
                  <option [value]="EntryType.STAFF">Staff</option>
                  <option [value]="EntryType.VISITOR">Visitor</option>
                  <option [value]="EntryType.DOMESTIC_HELP">Domestic Help</option>
                  <option [value]="EntryType.VENDOR">Vendor</option>
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
            <h3>Facial Recognition Configuration</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Face Image *</label>
                <div class="image-upload">
                  <div class="image-preview" *ngIf="formData.faceImage">
                    <img [src]="formData.faceImage" alt="Face preview">
                    <button type="button" class="btn-remove" (click)="removeImage()">
                      <i class="material-icons">close</i>
                    </button>
                  </div>
                  <div class="upload-placeholder" *ngIf="!formData.faceImage">
                    <i class="material-icons">camera_alt</i>
                    <p>Click to upload face image</p>
                    <input type="file" accept="image/*" (change)="onImageSelected($event)" class="file-input">
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Confidence Threshold</label>
                <input type="number" [(ngModel)]="formData.confidenceThreshold" name="confidenceThreshold" 
                       min="0" max="100" value="85" class="form-control">
                <small>Minimum confidence level for face recognition (0-100%)</small>
              </div>
              <div class="form-group">
                <label>Access Level</label>
                <select [(ngModel)]="formData.accessLevel" name="accessLevel" class="form-control">
                  <option value="FULL">Full Access</option>
                  <option value="RESTRICTED">Restricted</option>
                  <option value="TIME_BASED">Time Based</option>
                </select>
              </div>
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
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              <i class="material-icons">arrow_back</i>
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <i class="material-icons">save</i>
              {{ isSubmitting ? 'Registering...' : 'Register Face' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .facial-form-container {
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

    .poc-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      color: #9a3412;
      font-size: 13px;
      line-height: 1.5;
    }

    .poc-notice .material-icons {
      font-size: 20px;
      flex-shrink: 0;
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

    .image-upload {
      border: 2px dashed #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }

    .image-preview {
      position: relative;
      width: 100%;
      height: 200px;
    }

    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .btn-remove {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(220, 53, 69, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .upload-placeholder {
      padding: 40px;
      text-align: center;
      cursor: pointer;
      position: relative;
    }

    .upload-placeholder .material-icons {
      font-size: 48px;
      color: #999;
      margin-bottom: 12px;
    }

    .upload-placeholder p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .file-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
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
export class FacialRecognitionFormComponent implements OnInit {
  formData: CreateFacialProfileRequest = {
    personId: '',
    personName: '',
    personType: EntryType.RESIDENT,
    phone: '',
    confidenceThreshold: 85,
    accessLevel: 'FULL',
    allowedGates: []
  };
  gates: { [key: string]: boolean } = {
    MAIN_GATE: true,
    SIDE_GATE: false,
    PARKING_GATE: false,
    EMERGENCY_GATE: false
  };
  isSubmitting = false;

  EntryType = EntryType;

  constructor(
    private facialService: FacialRecognitionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Load existing data for editing
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    void this.facialService.fileToDataUrl(file).then(dataUrl => {
      this.formData.faceImage = dataUrl;
    }).catch(err => {
      console.error(err);
      alert('Could not read image file');
    });
  }

  removeImage(): void {
    this.formData.faceImage = '';
  }

  onSubmit(): void {
    if (!this.formData.personName || !this.formData.phone || !this.formData.faceImage) {
      alert('Please fill in all required fields including face image');
      return;
    }

    // Get selected gates
    this.formData.allowedGates = Object.keys(this.gates).filter(key => this.gates[key as keyof typeof this.gates]) as string[];

    this.isSubmitting = true;
    this.facialService.createProfile(this.formData).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Face profile registered successfully!');
          this.router.navigate(['/admin/gate-security/facial-recognition']);
        } else {
          alert(response.message || 'Failed to register face profile');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error registering face profile:', error);
        alert('An error occurred while registering face profile');
        this.isSubmitting = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/facial-recognition']);
  }
}

