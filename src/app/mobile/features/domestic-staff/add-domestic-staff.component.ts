import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomesticStaffService } from './services/domestic-staff.service';
import { StaffRole, DocumentType, DayOfWeek, StaffStatus } from './models/domestic-staff.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-add-domestic-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="add-staff-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Add Domestic Staff</h1>
        <div style="width: 40px;"></div>
      </div>

      <!-- Form -->
      <form [formGroup]="staffForm" (ngSubmit)="onSubmit()" class="staff-form">
        
        <!-- Photo Upload -->
        <div class="photo-upload-section">
          <div class="photo-preview">
            <img [src]="photoPreview || 'assets/default-avatar.png'" alt="Staff Photo">
          </div>
          <button type="button" class="upload-btn" (click)="fileInput.click()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload Photo
          </button>
          <input #fileInput type="file" accept="image/*" style="display: none" (change)="onFileSelected($event)">
        </div>

        <!-- Basic Information -->
        <div class="form-section">
          <h3 class="section-title">Basic Information</h3>
          
          <div class="form-group">
            <label>Full Name *</label>
            <input 
              type="text" 
              formControlName="name" 
              placeholder="Enter full name"
              [class.error]="isFieldInvalid('name')"
            >
            <span class="error-msg" *ngIf="isFieldInvalid('name')">Name is required</span>
          </div>

          <div class="form-group">
            <label>Assigned Flat *</label>
            <select formControlName="flatId" [class.error]="isFieldInvalid('flatId')">
              <option value="">Select flat</option>
              <option *ngFor="let flat of flats" [value]="flat.id">{{ flat.flatNumber }}</option>
            </select>
            <span class="error-msg" *ngIf="isFieldInvalid('flatId')">Flat is required</span>
            <span class="hint" *ngIf="!flats.length">No flats found for this society — add flats in Society Setup first.</span>
          </div>

          <div class="form-group">
            <label>Role *</label>
            <select formControlName="role" [class.error]="isFieldInvalid('role')">
              <option value="">Select role</option>
              <option *ngFor="let role of staffRoles" [value]="role">{{ role }}</option>
            </select>
            <span class="error-msg" *ngIf="isFieldInvalid('role')">Role is required</span>
          </div>

          <div class="form-group">
            <label>Phone Number *</label>
            <input 
              type="tel" 
              formControlName="phoneNumber" 
              placeholder="+91 XXXXX XXXXX"
              [class.error]="isFieldInvalid('phoneNumber')"
            >
            <span class="error-msg" *ngIf="isFieldInvalid('phoneNumber')">Valid phone number is required</span>
          </div>

          <div class="form-group">
            <label>Alternate Phone</label>
            <input type="tel" formControlName="alternatePhone" placeholder="+91 XXXXX XXXXX">
          </div>

          <div class="form-group">
            <label>Address</label>
            <textarea formControlName="address" rows="3" placeholder="Enter residential address"></textarea>
          </div>
        </div>

        <!-- Identity Documents -->
        <div class="form-section">
          <h3 class="section-title">Identity Documents</h3>
          
          <div class="form-group">
            <label>Document Type</label>
            <select formControlName="documentType">
              <option value="">Select document type</option>
              <option *ngFor="let doc of documentTypes" [value]="doc">{{ doc }}</option>
            </select>
          </div>

          <div class="form-group">
            <label>Document Number</label>
            <input
              type="text"
              formControlName="documentNumber"
              [placeholder]="documentNumberPlaceholder"
            >
          </div>

          <div class="form-group">
            <label>Upload {{ staffForm.get('documentType')?.value || 'ID' }} scan</label>
            <div class="doc-upload-row">
              <button type="button" class="upload-btn" (click)="docFileInput.click()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                {{ documentPreview ? 'Change document' : 'Upload Aadhaar / PAN / ID' }}
              </button>
              <input
                #docFileInput
                type="file"
                accept="image/*,.pdf"
                style="display: none"
                (change)="onDocumentSelected($event)"
              >
            </div>
            <span class="hint" *ngIf="documentFileName">{{ documentFileName }}</span>
            <div class="doc-preview" *ngIf="documentPreview && !documentPreview.startsWith('data:application/pdf')">
              <img [src]="documentPreview" alt="ID document preview">
            </div>
          </div>
        </div>

        <!-- Emergency Contact -->
        <div class="form-section">
          <h3 class="section-title">Emergency Contact</h3>
          
          <div formGroupName="emergencyContact">
            <div class="form-group">
              <label>Contact Name</label>
              <input type="text" formControlName="name" placeholder="Enter contact name">
            </div>

            <div class="form-group">
              <label>Relationship</label>
              <input type="text" formControlName="relationship" placeholder="e.g., Husband, Wife, Brother">
            </div>

            <div class="form-group">
              <label>Contact Number</label>
              <input type="tel" formControlName="phoneNumber" placeholder="+91 XXXXX XXXXX">
            </div>
          </div>
        </div>

        <!-- Work Schedule -->
        <div class="form-section">
          <h3 class="section-title">Work Schedule</h3>
          
          <div formGroupName="workSchedule">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="isFullTime">
                <span>Full-time employee</span>
              </label>
            </div>

            <div class="form-group">
              <label>Working Days</label>
              <div class="days-grid">
                <label *ngFor="let day of daysOfWeek" class="day-checkbox">
                  <input 
                    type="checkbox" 
                    [checked]="isWorkingDaySelected(day)"
                    (change)="toggleWorkingDay(day)"
                  >
                  <span>{{ day.substring(0, 3) }}</span>
                </label>
              </div>
            </div>

            <div class="time-inputs">
              <div class="form-group">
                <label>Start Time</label>
                <input type="time" formControlName="startTime">
              </div>

              <div class="form-group">
                <label>End Time</label>
                <input type="time" formControlName="endTime">
              </div>
            </div>
          </div>
        </div>

        <!-- Passcode Section -->
        <div class="form-section passcode-section">
          <h3 class="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            6-Digit Access Passcode
          </h3>
          
          <div class="passcode-info">
            <p>A unique 6-digit passcode will be automatically generated for gate entry verification.</p>
            <div class="passcode-display-box">
              <span class="passcode-label">Generated Passcode:</span>
              <span class="passcode-value">{{ generatedPasscode }}</span>
              <button type="button" class="regenerate-small-btn" (click)="generateNewPasscode()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Submit Buttons -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="goBack()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="staffForm.invalid || submitting">
            <span *ngIf="!submitting">Add Staff Member</span>
            <span *ngIf="submitting">Adding...</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .add-staff-container {
      min-height: 100vh;
      background: #f5f5f5;
      padding-bottom: 2rem;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .back-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .back-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .staff-form {
      padding: 1rem;
    }

    .photo-upload-section {
      background: white;
      padding: 2rem;
      border-radius: 16px;
      text-align: center;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .photo-preview {
      width: 120px;
      height: 120px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      overflow: hidden;
      border: 4px solid #f0f0f0;
    }

    .photo-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .upload-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.3s;
    }

    .upload-btn:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .doc-upload-row {
      display: flex;
      gap: 8px;
    }

    .doc-preview {
      margin-top: 12px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      max-height: 220px;
    }

    .doc-preview img {
      width: 100%;
      max-height: 220px;
      object-fit: contain;
      background: #f9fafb;
      display: block;
    }

    .form-section {
      background: white;
      padding: 1.5rem;
      border-radius: 16px;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .section-title {
      margin: 0 0 1.5rem 0;
      font-size: 1.1rem;
      color: #333;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .hint {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #6b7280;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group input.error,
    .form-group select.error {
      border-color: #ef4444;
    }

    .error-msg {
      display: block;
      color: #ef4444;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
      cursor: pointer;
    }

    .days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.5rem;
    }

    .day-checkbox {
      text-align: center;
      cursor: pointer;
    }

    .day-checkbox input[type="checkbox"] {
      display: none;
    }

    .day-checkbox span {
      display: block;
      padding: 0.5rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.3s;
    }

    .day-checkbox input:checked + span {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .time-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .passcode-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .passcode-section .section-title {
      color: white;
    }

    .passcode-info p {
      margin-bottom: 1rem;
      opacity: 0.9;
    }

    .passcode-display-box {
      background: rgba(255,255,255,0.2);
      padding: 1rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .passcode-label {
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .passcode-value {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      font-family: 'Courier New', monospace;
    }

    .regenerate-small-btn {
      background: rgba(255,255,255,0.3);
      border: none;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .regenerate-small-btn:hover {
      background: rgba(255,255,255,0.4);
      transform: rotate(180deg);
    }

    .form-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn {
      padding: 1rem;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #d1d5db;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
    }
  `]
})
export class AddDomesticStaffComponent implements OnInit {
  staffForm: FormGroup;
  staffRoles = Object.values(StaffRole);
  documentTypes = Object.values(DocumentType);
  daysOfWeek = Object.values(DayOfWeek);
  photoPreview: string | null = null;
  documentPreview: string | null = null;
  documentFileName = '';
  generatedPasscode: string = '';
  submitting = false;
  flats: Array<{ id: string; flatNumber: string }> = [];

  constructor(
    private fb: FormBuilder,
    private domesticStaffService: DomesticStaffService,
    private router: Router,
    private toast: ToastService
  ) {
    this.staffForm = this.fb.group({
      flatId: ['', Validators.required],
      name: ['', Validators.required],
      role: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s-()]+$/)]],
      alternatePhone: [''],
      address: [''],
      documentType: [''],
      documentNumber: [''],
      emergencyContact: this.fb.group({
        name: [''],
        relationship: [''],
        phoneNumber: ['']
      }),
      workSchedule: this.fb.group({
        isFullTime: [false],
        workingDays: [[]],
        startTime: [''],
        endTime: ['']
      })
    });

    this.generateNewPasscode();
  }

  ngOnInit(): void {
    this.domesticStaffService.loadFlatsForSociety().subscribe({
      next: flats => {
        this.flats = flats ?? [];
        if (this.flats.length === 1) {
          this.staffForm.patchValue({ flatId: this.flats[0].id });
        }
      },
      error: () => {
        this.flats = [];
      }
    });
  }

  generateNewPasscode() {
    this.generatedPasscode = this.domesticStaffService.generatePasscode();
  }

  get documentNumberPlaceholder(): string {
    const t = String(this.staffForm.get('documentType')?.value || '');
    if (t.includes('Aadhaar') || t.includes('Aadhar')) return '12-digit Aadhaar number';
    if (t.includes('PAN')) return '10-character PAN (e.g. ABCDE1234F)';
    if (t.includes('Voter')) return 'Voter ID number';
    if (t.includes('Driving')) return 'Driving licence number';
    if (t.includes('Passport')) return 'Passport number';
    return 'Enter document number';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.readImageAsDataUrl(file, url => {
      this.photoPreview = url;
    });
  }

  onDocumentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.documentFileName = file.name;
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        this.documentPreview = String(reader.result || '');
      };
      reader.readAsDataURL(file);
      return;
    }
    this.readImageAsDataUrl(file, url => {
      this.documentPreview = url;
    });
  }

  /** Shrink camera photos so they fit in the API payload. */
  private readImageAsDataUrl(file: File, done: (dataUrl: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      if (!raw.startsWith('data:image')) {
        done(raw);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          done(raw);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => done(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  }

  isWorkingDaySelected(day: DayOfWeek): boolean {
    const workingDays = this.staffForm.get('workSchedule.workingDays')?.value || [];
    return workingDays.includes(day);
  }

  toggleWorkingDay(day: DayOfWeek) {
    const workingDays = this.staffForm.get('workSchedule.workingDays')?.value || [];
    const index = workingDays.indexOf(day);
    
    if (index > -1) {
      workingDays.splice(index, 1);
    } else {
      workingDays.push(day);
    }
    
    this.staffForm.patchValue({
      workSchedule: { workingDays }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.staffForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit() {
    if (this.staffForm.valid) {
      this.submitting = true;
      const admin = this.domesticStaffService.getAdminFromSession();
      const selectedFlat = this.flats.find(f => f.id === this.staffForm.value.flatId);

      const staffData = {
        ...this.staffForm.value,
        passcode: this.generatedPasscode,
        photoUrl: this.photoPreview || undefined,
        documentUrl: this.documentPreview || undefined,
        flatNumber: selectedFlat?.flatNumber ?? '',
        societyId: this.domesticStaffService.getSocietyId(),
        status: StaffStatus.ACTIVE,
        createdBy: admin.name
      };

      this.domesticStaffService.addDomesticStaff(staffData).subscribe({
        next: (newStaff) => {
          this.submitting = false;
          this.toast.success(
            `${newStaff.name} added · Passcode ${newStaff.passcode}` +
              (newStaff.documentUrl ? ' · ID proof saved' : '')
          );
          // Open detail so the attached Aadhaar / PAN scan is visible immediately.
          this.router.navigate(['/admin/domestic-staff/detail', newStaff.id]);
        },
        error: (err) => {
          console.error('Error adding staff:', err);
          this.toast.error(err?.error?.message || 'Failed to add staff member. Is the backend running?');
          this.submitting = false;
        }
      });
    } else {
      Object.keys(this.staffForm.controls).forEach(key => {
        this.staffForm.get(key)?.markAsTouched();
      });
    }
  }

  goBack() {
    this.router.navigate(['/admin/domestic-staff']);
  }
}
