import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RegistrationService, DocumentUpload, VerificationResult, RegistrationSocietyOption } from './registration.service';
import {
  DocumentAiValidationService,
  DocumentSlotConfig,
  RegistrationDocumentVariant
} from './document-ai-validation.service';

@Component({
  selector: 'app-multi-step-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './multi-step-registration.component.html',
  styleUrls: ['./multi-step-registration.component.scss']
})
export class MultiStepRegistrationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Forms for each step
  step1Form!: FormGroup;
  step2Form!: FormGroup;
  
  // Stepper control
  currentStep = 1;
  totalSteps = 5;
  
  // Loading states
  isLoading = false;
  isSavingStep = false;
  isVerifyingDocuments = false;
  isSubmitting = false;
  
  // Document upload
  uploadedDocuments: DocumentUpload[] = [];
  requiredDocuments: DocumentSlotConfig[] = [];
  /** Selected document variant per upload slot */
  selectedDocumentVariants: Record<string, RegistrationDocumentVariant> = {};
  /** Per-slot validation error from AI check */
  documentValidationErrors: Record<string, string> = {};
  /** Per-slot validating spinner */
  validatingDocumentSlot: Record<string, boolean> = {};
  
  // Verification results
  verificationResults: VerificationResult[] = [];
  allDocumentsVerified = false;
  
  // Dropdowns data (loaded from API)
  allSocieties: RegistrationSocietyOption[] = [];
  societies: RegistrationSocietyOption[] = [];
  cities: string[] = [];
  states: string[] = [];
  dropdownsLoading = false;
  dropdownLoadWarning = '';
  pincodeLookupMessage = '';
  
  // User Type options - matches backend User.UserType enum
  userTypes = [
    { value: 'OWNER', label: 'Owner' },
    { value: 'TENANT', label: 'Tenant' },
    { value: 'FAMILY_MEMBER', label: 'Family Member' },
    { value: 'PG_GUEST', label: 'PG Guest' }
  ];
  
  // User Status options - matches backend User.UserStatus enum
  userStatuses = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];
  
  // Success/Error messages
  successMessage = '';
  errorMessage = '';
  registrationId = '';
  
  // Password visibility
  showPassword = false;
  showConfirmPassword = false;

  // Terms acceptance
  termsAccepted = false;

  constructor(
    private fb: FormBuilder,
    private registrationService: RegistrationService,
    private documentAiValidation: DocumentAiValidationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.requiredDocuments = this.documentAiValidation.getDocumentSlots();
    this.requiredDocuments.forEach(slot => {
      this.selectedDocumentVariants[slot.type] = slot.defaultVariant;
    });
    this.initializeForms();
    this.loadDropdownData();
    this.loadSavedProgress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialize all forms
  private initializeForms(): void {
    // Step 1: Basic Information
    this.step1Form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
      email: ['', [Validators.required, Validators.email], [this.emailAsyncValidator.bind(this)]],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/), Validators.minLength(10), Validators.maxLength(10)], [this.phoneAsyncValidator.bind(this)]],
      userType: ['OWNER', [Validators.required]], // Default to OWNER
      userStatus: ['INACTIVE', [Validators.required]], // Default to INACTIVE (new registrations should be inactive)
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Step 2: Address & Personal Details
    this.step2Form = this.fb.group({
      flatNumber: ['', [Validators.required]],
      tower: ['', [Validators.required]],
      societyId: ['', [Validators.required]],
      society: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      dateOfBirth: ['', [Validators.required, this.ageValidator]],
      gender: ['', [Validators.required]],
      occupation: ['', [Validators.required]]
    });

    // Reload cities when state changes; filter societies list.
    this.step2Form.get('state')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.step2Form.patchValue({ city: '' }, { emitEvent: false });
        this.loadCitiesForState(state);
        this.filterSocieties();
      });

    this.step2Form.get('city')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.filterSocieties());
  }

  /** Load states, cities, and societies from backend. */
  private loadDropdownData(): void {
    this.dropdownsLoading = true;
    this.dropdownLoadWarning = '';

    this.registrationService.getStatesList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.states = data;
          if (!data.length) {
            this.dropdownLoadWarning = 'Could not load states. Check that the API is running.';
          }
        },
        error: () => {
          this.dropdownLoadWarning = 'Could not load states. Check that the API is running.';
        }
      });

    this.registrationService.getCitiesList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.cities = data;
      });

    this.registrationService.getSocietiesList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.allSocieties = data;
          this.societies = data;
          this.dropdownsLoading = false;
          // Restore city list when returning to a saved step 2 with state already set.
          const savedState = this.step2Form.get('state')?.value;
          if (savedState) {
            this.loadCitiesForState(savedState);
          }
        },
        error: () => {
          this.dropdownsLoading = false;
        }
      });
  }

  private loadCitiesForState(state: string): void {
    this.registrationService.getCitiesList(state).pipe(takeUntil(this.destroy$)).subscribe(c => {
      this.cities = c;
      // Pincode lookup may return a district name not in the reference list — keep it selectable.
      const currentCity = String(this.step2Form.get('city')?.value || '').trim();
      if (currentCity && !this.cities.some(x => x.toLowerCase() === currentCity.toLowerCase())) {
        this.cities = [currentCity, ...this.cities];
      }
    });
  }

  /** Narrow society list by selected state/city. */
  private filterSocieties(): void {
    const state = (this.step2Form.get('state')?.value || '').trim();
    const city = (this.step2Form.get('city')?.value || '').trim();
    this.societies = this.allSocieties.filter(s => {
      const stateOk = !state || !s.state || s.state.toLowerCase() === state.toLowerCase();
      const cityOk = !city || !s.city || s.city.toLowerCase() === city.toLowerCase();
      return stateOk && cityOk;
    });
  }

  /** When user picks a society, auto-fill location fields from its record. */
  onSocietySelected(): void {
    const societyId = this.step2Form.get('societyId')?.value;
    const selected = this.allSocieties.find(s => s.id === societyId);
    if (!selected) {
      return;
    }
    this.step2Form.patchValue({
      society: selected.name,
      city: selected.city || this.step2Form.get('city')?.value,
      state: selected.state || this.step2Form.get('state')?.value,
      pincode: selected.pincode || this.step2Form.get('pincode')?.value
    });
    if (selected.state) {
      this.loadCitiesForState(selected.state);
    }
    this.filterSocieties();
  }

  /** Pincode blur — lookup city/state from India Post API. */
  onPincodeBlur(): void {
    const pincode = String(this.step2Form.get('pincode')?.value || '').trim();
    this.pincodeLookupMessage = '';
    if (pincode.length !== 6) {
      return;
    }
    this.registrationService.lookupPincode(pincode).pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result.success && result.city && result.state) {
        this.step2Form.patchValue({ city: result.city, state: result.state });
        this.loadCitiesForState(result.state);
        this.filterSocieties();
        this.pincodeLookupMessage = `Location verified: ${result.city}, ${result.state}`;
      } else if (result.message) {
        this.pincodeLookupMessage = result.message;
      }
    });
  }

  // Load saved progress
  private loadSavedProgress(): void {
    const savedData = this.registrationService.getRegistrationData();
    this.currentStep = savedData.currentStep;
    
    if (savedData.step1) {
      this.step1Form.patchValue(savedData.step1);
    }
    
    if (savedData.step2) {
      this.step2Form.patchValue(savedData.step2);
    }
    
    this.uploadedDocuments = savedData.documents;
    this.uploadedDocuments.forEach(doc => {
      if (doc.selectedDocumentType) {
        this.selectedDocumentVariants[doc.documentType] =
          doc.selectedDocumentType as RegistrationDocumentVariant;
      }
    });
  }

  // Custom Validators
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    return !passwordValid ? { passwordStrength: true } : null;
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) return null;

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  private ageValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const birthDate = new Date(control.value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    return age >= 18 ? null : { underage: true };
  }

  private emailAsyncValidator(control: AbstractControl): Promise<ValidationErrors | null> {
    if (!control.value) return Promise.resolve(null);

    return new Promise((resolve) => {
      this.registrationService.checkEmailAvailability(control.value)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            resolve(result.available ? null : { emailTaken: true });
          },
          error: () => resolve(null)
        });
    });
  }

  private phoneAsyncValidator(control: AbstractControl): Promise<ValidationErrors | null> {
    if (!control.value) return Promise.resolve(null);

    return new Promise((resolve) => {
      this.registrationService.checkPhoneAvailability(control.value)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            resolve(result.available ? null : { phoneTaken: true });
          },
          error: () => resolve(null)
        });
    });
  }

  // Navigation Methods
  nextStep(): void {
    this.errorMessage = '';
    this.successMessage = '';

    switch(this.currentStep) {
      case 1:
        if (this.step1Form.valid) {
          this.saveStep1();
        } else {
          this.markFormGroupTouched(this.step1Form);
          this.errorMessage = 'Please fill all required fields correctly';
        }
        break;

      case 2:
        if (this.step2Form.valid) {
          this.saveStep2();
        } else {
          this.markFormGroupTouched(this.step2Form);
          this.errorMessage = 'Please fill all required fields correctly';
        }
        break;

      case 3:
        if (this.areAllDocumentsUploaded()) {
          this.currentStep++;
        } else {
          this.errorMessage = 'Please upload all required documents';
        }
        break;

      case 4:
        if (this.allDocumentsVerified) {
          this.currentStep++;
        } else {
          this.errorMessage = 'Please verify all documents before proceeding';
        }
        break;
    }
  }

  previousStep(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step <= this.currentStep && step >= 1) {
      this.currentStep = step;
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  // Save Step 1
  private saveStep1(): void {
    this.isSavingStep = true;
    this.registrationService.saveStep1Data(this.step1Form.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSavingStep = false;
          this.successMessage = response.message;
          setTimeout(() => {
            this.currentStep++;
            this.successMessage = '';
          }, 1000);
        },
        error: (error) => {
          this.isSavingStep = false;
          this.errorMessage = error.message || 'Error saving data';
        }
      });
  }

  // Save Step 2
  private saveStep2(): void {
    this.isSavingStep = true;
    this.registrationService.saveStep2Data(this.step2Form.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSavingStep = false;
          this.successMessage = response.message;
          setTimeout(() => {
            this.currentStep++;
            this.successMessage = '';
          }, 1000);
        },
        error: (error) => {
          this.isSavingStep = false;
          this.errorMessage = error.message || 'Error saving data';
        }
      });
  }

  // Document Upload Handling — AI validation before accept
  async onFileSelected(event: Event, documentType: string): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      this.documentValidationErrors[documentType] = 'Invalid file type. Please upload JPG, PNG, or PDF';
      return;
    }

    if (file.size > maxSize) {
      this.documentValidationErrors[documentType] = 'File size too large. Maximum size is 5MB';
      return;
    }

    const selectedVariant = this.getSelectedVariant(documentType);
    this.validatingDocumentSlot[documentType] = true;
    this.documentValidationErrors[documentType] = '';
    this.errorMessage = '';

    try {
      const base64 = await this.documentAiValidation.readFileAsDataUrl(file);
      this.documentAiValidation
        .validateFile(file, documentType, selectedVariant, base64)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: result => {
            this.validatingDocumentSlot[documentType] = false;
            if (!result.valid) {
              this.documentValidationErrors[documentType] = result.message;
              input.value = '';
              return;
            }

            this.registrationService
              .uploadDocument(file, documentType, selectedVariant, base64, {
                message: result.message,
                confidence: result.confidence,
                detectedType: result.detectedType
              })
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: response => {
                  this.uploadedDocuments = this.registrationService.getUploadedDocuments();
                  this.successMessage = response.message;
                  delete this.documentValidationErrors[documentType];
                  setTimeout(() => (this.successMessage = ''), 2500);
                },
                error: err => {
                  this.documentValidationErrors[documentType] =
                    err.message || 'Error saving document';
                }
              });
          },
          error: () => {
            this.validatingDocumentSlot[documentType] = false;
            this.documentValidationErrors[documentType] =
              'Document validation failed. Ensure backend is running.';
            input.value = '';
          }
        });
    } catch {
      this.validatingDocumentSlot[documentType] = false;
      this.documentValidationErrors[documentType] = 'Error reading file';
      input.value = '';
    }
  }

  /** User changed document type dropdown — clear prior upload for that slot. */
  onDocumentVariantChange(slotType: string): void {
    const uploaded = this.getUploadedDocument(slotType);
    if (uploaded) {
      this.removeDocument(uploaded.fileName);
    }
    this.documentValidationErrors[slotType] = '';
  }

  getSelectedVariant(slotType: string): RegistrationDocumentVariant {
    return this.selectedDocumentVariants[slotType] ?? 'AADHAAR';
  }

  getVariantLabel(slotType: string): string {
    const slot = this.requiredDocuments.find(s => s.type === slotType);
    const variant = this.getSelectedVariant(slotType);
    return slot?.variants.find(v => v.value === variant)?.label ?? variant;
  }

  isValidatingSlot(slotType: string): boolean {
    return !!this.validatingDocumentSlot[slotType];
  }

  getSlotValidationError(slotType: string): string {
    return this.documentValidationErrors[slotType] ?? '';
  }

  // Check if all documents are uploaded
  areAllDocumentsUploaded(): boolean {
    return this.requiredDocuments.every(reqDoc => 
      this.uploadedDocuments.some(uploadedDoc => uploadedDoc.documentType === reqDoc.type)
    );
  }

  // Remove Document
  removeDocument(fileName: string): void {
    const removed = this.uploadedDocuments.find(d => d.fileName === fileName);
    this.registrationService.removeDocument(fileName);
    this.uploadedDocuments = this.registrationService.getUploadedDocuments();
    if (removed?.documentType) {
      delete this.documentValidationErrors[removed.documentType];
    }
  }

  // Get Uploaded Document
  getUploadedDocument(documentType: string): DocumentUpload | undefined {
    return this.uploadedDocuments.find(doc => doc.documentType === documentType);
  }

  // Verify Documents
  verifyDocuments(): void {
    this.isVerifyingDocuments = true;
    this.errorMessage = '';
    this.verificationResults = [];

    this.registrationService.verifyDocuments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.isVerifyingDocuments = false;
          this.verificationResults = results;
          this.uploadedDocuments = this.registrationService.getUploadedDocuments();
          
          this.allDocumentsVerified = results.every(r => r.success);
          
          if (this.allDocumentsVerified) {
            this.successMessage = 'All documents verified successfully!';
          } else {
            this.errorMessage = 'Some documents failed verification. Please re-upload.';
          }
        },
        error: (error) => {
          this.isVerifyingDocuments = false;
          this.errorMessage = error.message || 'Error verifying documents';
        }
      });
  }

  // Get Verification Result
  getVerificationResult(documentType: string): VerificationResult | undefined {
    return this.verificationResults.find(r => r.documentType === documentType);
  }

  // Submit Registration
  submitRegistration(): void {
    this.isSubmitting = true;
    this.errorMessage = '';

    this.registrationService.submitRegistration()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.successMessage = response.message;
          this.registrationId = response.registrationId;
          
          // Navigate to success page after 3 seconds
          setTimeout(() => {
            const fromAdmin = sessionStorage.getItem('fromAdmin') === 'true';
            this.router.navigate(
              [fromAdmin ? '/admin/users-list' : '/mobile/auth/registration-success'],
              { queryParams: { registrationId: this.registrationId } }
            );
          }, 3000);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error.message || 'Error submitting registration';
        }
      });
  }

  // Utility Methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // Form field getters for template
  get step1() { return this.step1Form.controls; }
  get step2() { return this.step2Form.controls; }

  // Get max date for date of birth (18 years ago)
  getMaxDate(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split('T')[0];
  }

  // Format key for display
  formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  // Get object keys
  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  // Password validation helpers for template
  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.step1Form.get('password')?.value || '');
  }

  hasLowerCase(): boolean {
    return /[a-z]/.test(this.step1Form.get('password')?.value || '');
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.step1Form.get('password')?.value || '');
  }

  hasSpecialChar(): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(this.step1Form.get('password')?.value || '');
  }

  hasMinLength(): boolean {
    return (this.step1Form.get('password')?.value?.length || 0) >= 8;
  }

  /**
   * Get user type label for display
   */
  getUserTypeLabel(): string {
    const userTypeValue = this.step1Form.get('userType')?.value;
    if (!userTypeValue) {
      return 'Owner'; // Default
    }
    const userType = this.userTypes.find(t => t.value === userTypeValue);
    return userType?.label || userTypeValue;
  }

  /**
   * Get user status label for display
   */
  getUserStatusLabel(): string {
    const userStatusValue = this.step1Form.get('userStatus')?.value;
    if (!userStatusValue) {
      return 'Inactive'; // Default
    }
    const userStatus = this.userStatuses.find(s => s.value === userStatusValue);
    return userStatus?.label || userStatusValue;
  }
}
