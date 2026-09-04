import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { VehicleRegistrationService } from '../services/vehicle-registration.service';
import { UserManagementService } from '../../user-management/services/user-management.service';
import { User } from '../../user-management/models/user.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  VehicleType,
  OwnerType,
  VehicleRegistrationRequest,
  RFIDTagType
} from '../models/vehicle.model';

@Component({
  selector: 'app-vehicle-registration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './vehicle-registration-form.component.html',
  styleUrls: ['./vehicle-registration-form.component.scss']
})
export class VehicleRegistrationFormComponent implements OnInit {
  registrationForm!: FormGroup;
  vehicleMakes: string[] = [];
  parkingSlots: string[] = [];
  
  // Enums for template
  vehicleTypes = Object.values(VehicleType);
  ownerTypes = Object.values(OwnerType);
  rfidTagTypes = Object.values(RFIDTagType);

  currentStep = 1;
  totalSteps = 4;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';
  registeredVehicleId = '';
  societyResidents: User[] = [];
  residentsLoadError = '';

  // File upload
  selectedFiles: File[] = [];
  maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(
    private fb: FormBuilder,
    private vehicleService: VehicleRegistrationService,
    private userService: UserManagementService,
    private session: SessionContextService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadVehicleMakes();
    this.loadParkingSlots(this.registrationForm?.get('vehicleType')?.value ?? VehicleType.FOUR_WHEELER);
    this.loadSocietyResidents();
  }

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      // Step 1: Vehicle Details
      registrationNumber: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)]],
      vehicleType: [VehicleType.FOUR_WHEELER, Validators.required],
      make: ['', Validators.required],
      model: ['', Validators.required],
      color: ['', Validators.required],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(1990), Validators.max(new Date().getFullYear() + 1)]],
      
      // Step 2: Owner Details
      ownerId: ['', Validators.required],
      ownerName: ['', Validators.required],
      ownerType: [OwnerType.RESIDENT, Validators.required],
      unitNumber: [''],
      parkingSlot: [''],
      
      // Step 3: RFID/FASTag
      requestRFID: [true],
      rfidTagType: [RFIDTagType.STANDARD],
      rfidValidityMonths: [12],
      requestFASTag: [false],
      fasTagNumber: [''],
      fasTagAccountId: [''],
      fasTagBankName: [''],
      fasTagVehicleClass: [''],
      
      // Step 4: Additional Info
      remarks: ['']
    });

    // Dynamic validators
    this.setupConditionalValidators();
  }

  private setupConditionalValidators(): void {
    // When RFID is requested, make tag type required
    this.registrationForm.get('requestRFID')?.valueChanges.subscribe(value => {
      const rfidTagType = this.registrationForm.get('rfidTagType');
      if (value) {
        rfidTagType?.setValidators([Validators.required]);
      } else {
        rfidTagType?.clearValidators();
      }
      rfidTagType?.updateValueAndValidity();
    });

    // When FASTag is requested, make fields required
    this.registrationForm.get('requestFASTag')?.valueChanges.subscribe(value => {
      const controls = ['fasTagNumber', 'fasTagAccountId', 'fasTagBankName', 'fasTagVehicleClass'];
      controls.forEach(controlName => {
        const control = this.registrationForm.get(controlName);
        if (value) {
          control?.setValidators([Validators.required]);
        } else {
          control?.clearValidators();
        }
        control?.updateValueAndValidity();
      });
    });

    // When unit number changes, try to match flat owner / resident
    this.registrationForm.get('unitNumber')?.valueChanges.subscribe(unit => {
      this.onUnitNumberChanged(String(unit ?? ''));
    });

    // Load parking slots when vehicle type changes
    this.registrationForm.get('vehicleType')?.valueChanges.subscribe(type => {
      this.loadParkingSlots(type);
    });
  }
  private loadSocietyResidents(): void {
    this.userService.getAllUsers().subscribe({
      next: users => {
        this.societyResidents = users ?? [];
        this.residentsLoadError = '';
        this.prefillOwnerFromSession();
      },
      error: () => {
        this.societyResidents = [];
        this.residentsLoadError = 'Could not load residents. Sign in again or check the API.';
      }
    });
  }

  /** Pre-select logged-in user when they are a society resident (not society id fallback). */
  private prefillOwnerFromSession(): void {
    const uid = this.session.getCurrentUserId();
    const sid = this.session.getSocietyId();
    if (!uid || uid === sid) {
      return;
    }
    const resident = this.societyResidents.find(u => u.id === uid);
    if (resident) {
      this.applyResidentSelection(resident);
    }
  }

  /** Owner dropdown changed — sync name and unit fields. */
  onOwnerSelected(ownerId: string): void {
    const resident = this.societyResidents.find(u => u.id === ownerId);
    if (resident) {
      this.applyResidentSelection(resident);
    }
  }

  private applyResidentSelection(resident: User): void {
    const name = `${resident.firstName ?? ''} ${resident.lastName ?? ''}`.trim() || resident.email;
    this.registrationForm.patchValue({
      ownerId: resident.id,
      ownerName: name,
      unitNumber: resident.flatNumber || this.registrationForm.get('unitNumber')?.value
    });
  }

  /** Resolve flat owner when user types a unit number. */
  private onUnitNumberChanged(unitNumber: string): void {
    const trimmed = unitNumber.trim();
    if (!trimmed) {
      return;
    }
    const byFlat = this.societyResidents.find(
      r => (r.flatNumber ?? '').trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (byFlat) {
      this.applyResidentSelection(byFlat);
      return;
    }
    this.vehicleService.resolveFlatByNumber(trimmed).subscribe(flat => {
      if (!flat?.ownerId) {
        return;
      }
      const owner = this.societyResidents.find(u => u.id === flat.ownerId);
      if (owner) {
        this.applyResidentSelection(owner);
      } else {
        this.registrationForm.patchValue({ ownerId: flat.ownerId });
      }
    });
  }

  residentLabel(resident: User): string {
    const name = `${resident.firstName ?? ''} ${resident.lastName ?? ''}`.trim() || resident.email;
    const flat = resident.flatNumber ? ` · ${resident.flatNumber}` : '';
    return `${name}${flat}`;
  }

  private loadVehicleMakes(): void {
    this.vehicleService.getVehicleMakes().subscribe((makes: string[]) => {
      this.vehicleMakes = makes;
    });
  }

  private loadParkingSlots(vehicleType: VehicleType): void {
    this.vehicleService.getAvailableParkingSlots(vehicleType).subscribe((slots: string[]) => {
      this.parkingSlots = slots;
    });
  }

  // Step navigation
  nextStep(): void {
    if (this.validateCurrentStep()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step <= this.currentStep || this.validateStepsUpTo(step - 1)) {
      this.currentStep = step;
    }
  }

  private validateCurrentStep(): boolean {
    const step1Fields = ['registrationNumber', 'vehicleType', 'make', 'model', 'color', 'year'];
    const step2Fields = ['ownerId', 'ownerName', 'ownerType'];
    const step3Fields: string[] = [];
    
    if (this.registrationForm.get('requestFASTag')?.value) {
      step3Fields.push('fasTagNumber', 'fasTagAccountId', 'fasTagBankName', 'fasTagVehicleClass');
    }

    let fieldsToValidate: string[] = [];
    
    switch (this.currentStep) {
      case 1:
        fieldsToValidate = step1Fields;
        break;
      case 2:
        fieldsToValidate = step2Fields;
        break;
      case 3:
        fieldsToValidate = step3Fields;
        break;
    }

    let isValid = true;
    fieldsToValidate.forEach(field => {
      const control = this.registrationForm.get(field);
      if (control?.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    });

    return isValid;
  }

  private validateStepsUpTo(step: number): boolean {
    // Implement validation logic for previous steps
    return true;
  }

  // File upload handlers
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size <= this.maxFileSize) {
        this.selectedFiles.push(file);
      } else {
        alert(`File ${file.name} exceeds maximum size of 5MB`);
      }
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Form submission
  onSubmit(): void {
    if (this.registrationForm.invalid) {
      Object.keys(this.registrationForm.controls).forEach(key => {
        this.registrationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';
    
    const formValue = this.registrationForm.value;
    const request: VehicleRegistrationRequest = {
      registrationNumber: formValue.registrationNumber.toUpperCase(),
      vehicleType: formValue.vehicleType,
      make: formValue.make,
      model: formValue.model,
      color: formValue.color,
      year: formValue.year,
      ownerId: formValue.ownerId,
      ownerName: formValue.ownerName,
      ownerType: formValue.ownerType,
      unitNumber: formValue.unitNumber,
      parkingSlot: formValue.parkingSlot,
      requestRFID: formValue.requestRFID,
      requestFASTag: formValue.requestFASTag,
      documents: this.selectedFiles,
      remarks: formValue.remarks
    };

    this.vehicleService.registerVehicle(request).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        if (response.success) {
          this.submitSuccess = true;
          this.registeredVehicleId = response.vehicleId || '';
          
          // Handle RFID request
          if (formValue.requestRFID && response.vehicleId) {
            this.requestRFID(response.vehicleId, formValue.rfidTagType, formValue.rfidValidityMonths);
          }
          
          // Handle FASTag linking
          if (formValue.requestFASTag && response.vehicleId) {
            this.linkFASTag(response.vehicleId, formValue);
          }
        } else {
          this.submitError = response.message;
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.submitError = 'An error occurred while registering the vehicle. Please try again.';
        console.error('Registration error:', error);
      }
    });
  }

  private requestRFID(vehicleId: string, tagType: RFIDTagType, validityMonths: number): void {
    this.vehicleService.issueRFIDTag({
      vehicleId,
      tagType,
      validityPeriod: validityMonths,
      remarks: 'Auto-requested during registration'
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          console.log('RFID tag issued:', response.rfidTag);
        }
      },
      error: (error: any) => {
        console.error('RFID issuance error:', error);
      }
    });
  }

  private linkFASTag(vehicleId: string, formValue: any): void {
    this.vehicleService.linkFASTag({
      vehicleId,
      tagNumber: formValue.fasTagNumber,
      accountId: formValue.fasTagAccountId,
      bankName: formValue.fasTagBankName,
      vehicleClass: formValue.fasTagVehicleClass,
      remarks: 'Linked during registration'
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          console.log('FASTag linked:', response.fasTag);
        }
      },
      error: (error: any) => {
        console.error('FASTag linking error:', error);
      }
    });
  }

  resetForm(): void {
    this.registrationForm.reset({
      vehicleType: VehicleType.FOUR_WHEELER,
      ownerType: OwnerType.RESIDENT,
      requestRFID: true,
      rfidTagType: RFIDTagType.STANDARD,
      rfidValidityMonths: 12,
      requestFASTag: false,
      year: new Date().getFullYear()
    });
    this.selectedFiles = [];
    this.currentStep = 1;
    this.submitSuccess = false;
    this.submitError = '';
  }

  // Helper methods for template
  get isStep1Valid(): boolean {
    const fields = ['registrationNumber', 'vehicleType', 'make', 'model', 'color', 'year'];
    return fields.every(field => this.registrationForm.get(field)?.valid);
  }

  get isStep2Valid(): boolean {
    const fields = ['ownerId', 'ownerName', 'ownerType'];
    return fields.every(field => this.registrationForm.get(field)?.valid);
  }

  get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  getVehicleTypeLabel(type: VehicleType): string {
    return type.replace(/_/g, ' ');
  }

  getOwnerTypeLabel(type: OwnerType): string {
    return type.replace(/_/g, ' ');
  }
}
