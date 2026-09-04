import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PetService, ResolvedFlat } from './services/pet.service';
import { PetSpecies, PetGender, RegistrationStatus } from './models/pet.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { UserManagementService } from '../../../modules/user-management/services/user-management.service';
import { User, UserRole } from '../../../modules/user-management/models/user.model';

@Component({
  selector: 'app-add-pet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="add-pet-container">
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Register Pet</h1>
        <div class="placeholder"></div>
      </div>

      <div class="success-message" *ngIf="submitSuccess">
        <div class="success-icon">✓</div>
        <h2>Pet Registered Successfully!</h2>
        <p>Your pet registration is pending approval.</p>
        <button class="btn btn-primary" (click)="goBack()">Back to Pet List</button>
      </div>

      <form [formGroup]="petForm" (ngSubmit)="onSubmit()" *ngIf="!submitSuccess" class="pet-form">
        <div class="photo-section">
          <div class="photo-upload" (click)="triggerFileInput()">
            <img *ngIf="photoPreview" [src]="photoPreview" alt="Pet photo">
            <div class="upload-placeholder" *ngIf="!photoPreview">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>Add Photo</span>
            </div>
          </div>
          <input type="file" #fileInput (change)="onPhotoSelected($event)" accept="image/*" style="display: none;">
        </div>

        <div class="form-section">
          <h3>🐾 Basic Information</h3>
          
          <div class="form-group">
            <label>Pet Name <span class="required">*</span></label>
            <input type="text" formControlName="name" placeholder="Enter pet name" class="form-control"
              [class.invalid]="petForm.get('name')?.invalid && petForm.get('name')?.touched">
            <div class="error-message" *ngIf="petForm.get('name')?.invalid && petForm.get('name')?.touched">
              Pet name is required
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Species <span class="required">*</span></label>
              <select formControlName="species" class="form-control">
                <option value="">Select Species</option>
                <option *ngFor="let species of petSpecies" [value]="species">{{ species }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>Gender <span class="required">*</span></label>
              <select formControlName="gender" class="form-control">
                <option value="">Select Gender</option>
                <option *ngFor="let gender of petGenders" [value]="gender">{{ gender }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Breed <span class="required">*</span></label>
            <input type="text" formControlName="breed" placeholder="e.g., Golden Retriever" class="form-control">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Date of Birth</label>
              <input type="date" formControlName="dateOfBirth" class="form-control">
            </div>
            <div class="form-group">
              <label>Color</label>
              <input type="text" formControlName="color" placeholder="e.g., Golden" class="form-control">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Weight (kg)</label>
              <input type="number" formControlName="weight" placeholder="0.0" step="0.1" class="form-control">
            </div>
            <div class="form-group">
              <label>Microchip Number</label>
              <input type="text" formControlName="microchipNumber" placeholder="Optional" class="form-control">
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>👤 Owner Information</h3>

          <div class="hint loading-hint" *ngIf="optionsLoading">Loading flats and residents…</div>
          <div class="error-message" *ngIf="optionsLoadError">{{ optionsLoadError }}</div>
          
          <div class="form-group">
            <label>Flat Number <span class="required">*</span></label>
            <select
              formControlName="flatId"
              class="form-control"
              (change)="onFlatSelected()"
              [class.invalid]="petForm.get('flatId')?.invalid && petForm.get('flatId')?.touched">
              <option value="">Select flat</option>
              <option *ngFor="let flat of societyFlats" [value]="flat.id">
                {{ flatOptionLabel(flat) }}
              </option>
            </select>
            <small class="hint">All flats configured for this society</small>
          </div>

          <div class="form-group">
            <label>Flat Owner <span class="required">*</span></label>
            <select
              formControlName="ownerId"
              class="form-control"
              (change)="onOwnerSelected()"
              [class.invalid]="petForm.get('ownerId')?.invalid && petForm.get('ownerId')?.touched">
              <option value="">Select resident / owner</option>
              <option *ngFor="let resident of societyResidents" [value]="resident.id">
                {{ residentLabel(resident) }}
              </option>
            </select>
            <small class="hint">Registered residents in this society</small>
          </div>

          <div class="form-group">
            <label>Owner Name</label>
            <input type="text" formControlName="ownerName" class="form-control" readonly>
          </div>

          <div class="form-group">
            <label>Contact Number</label>
            <input type="tel" formControlName="contactNumber" placeholder="+91 9876543210" class="form-control">
          </div>
        </div>

        <div class="form-section">
          <h3>📋 Additional Information</h3>
          
          <div class="form-group">
            <label>Special Notes</label>
            <textarea formControlName="specialNotes" placeholder="Any special care instructions..." rows="3" class="form-control"></textarea>
          </div>

          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="isNeutered">
              <span>Pet is neutered/spayed</span>
            </label>
          </div>

          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="isVaccinated">
              <span>Pet has up-to-date vaccinations</span>
            </label>
          </div>
        </div>

        <div class="error-box" *ngIf="submitError">
          <span>⚠️</span> {{ submitError }}
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="goBack()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="isSubmitting || petForm.invalid">
            <span *ngIf="!isSubmitting">Register Pet</span>
            <span *ngIf="isSubmitting">Registering...</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .add-pet-container { min-height: 100vh; background: #f5f5f5; padding-bottom: 2rem; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
    .header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .back-btn { background: rgba(255,255,255,0.2); border: none; border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .placeholder { width: 40px; }
    .success-message { text-align: center; padding: 3rem 2rem; background: white; margin: 1rem; border-radius: 16px; }
    .success-icon { width: 80px; height: 80px; background: #d1fae5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 1.5rem; }
    .success-message h2 { margin: 0 0 0.5rem; color: #1f2937; }
    .success-message p { color: #6b7280; margin-bottom: 1.5rem; }
    .pet-form { padding: 1rem; }
    .photo-section { display: flex; justify-content: center; margin-bottom: 1.5rem; }
    .photo-upload { width: 150px; height: 150px; border-radius: 50%; background: white; border: 3px dashed #d1d5db; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; }
    .photo-upload img { width: 100%; height: 100%; object-fit: cover; }
    .upload-placeholder { display: flex; flex-direction: column; align-items: center; color: #9ca3af; }
    .upload-placeholder span { margin-top: 0.5rem; font-size: 0.9rem; }
    .form-section { background: white; border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem; }
    .form-section h3 { margin: 0 0 1rem; font-size: 1.1rem; color: #1f2937; padding-bottom: 0.75rem; border-bottom: 1px solid #f3f4f6; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.9rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
    .required { color: #ef4444; }
    .form-control { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 1rem; box-sizing: border-box; }
    .form-control:focus { outline: none; border-color: #10b981; }
    .form-control.invalid { border-color: #ef4444; }
    .error-message { font-size: 0.8rem; color: #ef4444; margin-top: 0.25rem; }
    .hint { display: block; font-size: 0.8rem; color: #6b7280; margin-top: 0.35rem; }
    .loading-hint { margin-bottom: 0.75rem; color: #059669; }
    .checkbox-group { margin-bottom: 0.75rem; }
    .checkbox-label { display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; color: #374151; }
    .checkbox-label input { margin-right: 0.75rem; width: 18px; height: 18px; accent-color: #10b981; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 1rem; border-radius: 10px; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
    .btn { flex: 1; padding: 1rem; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; }
    .btn-primary { background: #10b981; color: white; }
    .btn-primary:hover:not(:disabled) { background: #059669; }
    .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; }
    @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
  `]
})
export class AddPetComponent implements OnInit {
  petForm!: FormGroup;
  petSpecies = Object.values(PetSpecies);
  petGenders = Object.values(PetGender);

  societyFlats: ResolvedFlat[] = [];
  societyResidents: User[] = [];
  optionsLoading = false;
  optionsLoadError = '';
  
  photoPreview: string | null = null;
  selectedFile: File | null = null;
  
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  constructor(
    private fb: FormBuilder,
    private petService: PetService,
    private userService: UserManagementService,
    private router: Router,
    private session: SessionContextService,
    private mobileAuth: MobileAuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadSocietyOptions();
  }

  /** Load flat and resident dropdowns for the active society. */
  private loadSocietyOptions(): void {
    const mobileUser = this.mobileAuth.getCurrentUser();
    const societyId = mobileUser?.societyId || this.session.getSocietyId();
    if (!societyId) {
      this.optionsLoadError = 'Society context missing. Sign in again.';
      return;
    }

    this.optionsLoading = true;
    this.optionsLoadError = '';

    forkJoin({
      flats: this.petService.listFlatsBySociety(societyId),
      users: this.userService.getAllUsers().pipe(catchError(() => of([] as User[])))
    }).subscribe({
      next: ({ flats, users }) => {
        this.societyFlats = flats;
        this.societyResidents = (users ?? []).filter(u => u.userRole === UserRole.RESIDENT);
        if (mobileUser && !this.societyResidents.some(r => r.id === mobileUser.id)) {
          this.societyResidents = [
            {
              id: mobileUser.id,
              firstName: mobileUser.name.split(' ')[0] || mobileUser.name,
              lastName: mobileUser.name.split(' ').slice(1).join(' '),
              email: mobileUser.email,
              phone: mobileUser.phone,
              flatNumber: mobileUser.flatNumber,
              flatId: mobileUser.flatId,
              userRole: UserRole.RESIDENT
            } as User,
            ...this.societyResidents
          ];
        }
        this.optionsLoading = false;
        this.applyDefaultSelection(mobileUser);
      },
      error: () => {
        this.optionsLoading = false;
        this.optionsLoadError = 'Could not load flats and residents for this society.';
      }
    });
  }

  /** Pre-select logged-in resident flat/owner when available. */
  private applyDefaultSelection(mobileUser: ReturnType<MobileAuthService['getCurrentUser']>): void {
    if (!mobileUser) {
      return;
    }
    const refresh$ = this.mobileAuth.refreshProfileFromServer();
    refresh$.subscribe(updated => {
      const u = updated ?? mobileUser;
      const resident =
        this.societyResidents.find(r => r.id === u.id) ||
        this.societyResidents.find(
          r => (r.flatNumber ?? '').trim().toLowerCase() === (u.flatNumber ?? '').trim().toLowerCase()
        );
      if (resident) {
        this.applyResidentSelection(resident);
        return;
      }
      const flat =
        this.societyFlats.find(f => f.id === u.flatId) ||
        this.societyFlats.find(
          f => f.flatNumber.trim().toLowerCase() === (u.flatNumber ?? '').trim().toLowerCase()
        );
      if (flat) {
        this.petForm.patchValue({ flatId: flat.id });
        this.onFlatSelected();
      }
    });
  }

  flatOptionLabel(flat: ResolvedFlat): string {
    const owner = flat.ownerId
      ? this.societyResidents.find(r => r.id === flat.ownerId)
      : undefined;
    const ownerName = owner
      ? this.residentLabel(owner).split('·')[0].trim()
      : flat.ownerId
        ? 'Owner assigned'
        : 'Vacant';
    return `${flat.flatNumber} — ${ownerName}`;
  }

  residentLabel(resident: User): string {
    const name = `${resident.firstName ?? ''} ${resident.lastName ?? ''}`.trim() || resident.email;
    const flat = resident.flatNumber ? ` · ${resident.flatNumber}` : '';
    return `${name}${flat}`;
  }

  onFlatSelected(): void {
    const flatId = String(this.petForm.get('flatId')?.value ?? '');
    const flat = this.societyFlats.find(f => f.id === flatId);
    if (!flat?.ownerId) {
      return;
    }
    const owner = this.societyResidents.find(r => r.id === flat.ownerId);
    if (owner) {
      this.applyResidentSelection(owner);
    } else {
      this.petForm.patchValue({ ownerId: flat.ownerId });
    }
  }

  onOwnerSelected(): void {
    const ownerId = String(this.petForm.get('ownerId')?.value ?? '');
    const resident = this.societyResidents.find(r => r.id === ownerId);
    if (resident) {
      this.applyResidentSelection(resident);
    }
  }

  private applyResidentSelection(resident: User): void {
    const name = `${resident.firstName ?? ''} ${resident.lastName ?? ''}`.trim() || resident.email;
    const flatId =
      resident.flatId ||
      this.societyFlats.find(
        f => f.flatNumber.trim().toLowerCase() === (resident.flatNumber ?? '').trim().toLowerCase()
      )?.id ||
      this.petForm.get('flatId')?.value;
    this.petForm.patchValue({
      ownerId: resident.id,
      ownerName: name,
      contactNumber: resident.phone || this.petForm.get('contactNumber')?.value,
      flatId: flatId || ''
    });
  }

  private initForm(): void {
    this.petForm = this.fb.group({
      name: ['', Validators.required],
      species: ['', Validators.required],
      breed: ['', Validators.required],
      gender: ['', Validators.required],
      dateOfBirth: [''],
      color: [''],
      weight: [''],
      microchipNumber: [''],
      flatId: ['', Validators.required],
      ownerId: ['', Validators.required],
      ownerName: ['', Validators.required],
      contactNumber: [''],
      specialNotes: [''],
      isNeutered: [false],
      isVaccinated: [false]
    });
  }

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  onSubmit(): void {
    if (this.petForm.invalid) {
      Object.keys(this.petForm.controls).forEach(key => {
        this.petForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';
    const v = this.petForm.value;
    const societyId = this.session.getSocietyId();
    const mobileUser = this.mobileAuth.getCurrentUser();
    if (!societyId) {
      this.submitError = 'Society context missing. Sign in again.';
      this.isSubmitting = false;
      return;
    }

    const flat = this.societyFlats.find(f => f.id === v.flatId);
    const owner = this.societyResidents.find(r => r.id === v.ownerId);
    if (!flat?.id) {
      this.submitError = 'Please select a flat from the list.';
      this.isSubmitting = false;
      return;
    }
    if (!v.ownerId) {
      this.submitError = 'Please select a flat owner from the list.';
      this.isSubmitting = false;
      return;
    }

    const dob = v.dateOfBirth ? new Date(v.dateOfBirth) : new Date();
    const w = v.weight !== '' && v.weight != null ? Number(v.weight) : undefined;
    const notes = [v.specialNotes, v.ownerName ? `Owner: ${v.ownerName}` : '', v.contactNumber ? `Phone: ${v.contactNumber}` : '']
      .filter(Boolean)
      .join(' | ');

    this.petService
      .addPet({
        name: v.name,
        species: v.species,
        breed: v.breed,
        gender: v.gender,
        dateOfBirth: dob,
        color: v.color || '',
        weight: Number.isFinite(w as number) ? w : undefined,
        microchipNumber: v.microchipNumber || undefined,
        flatId: flat.id,
        flatNumber: flat.flatNumber,
        ownerId: v.ownerId,
        ownerName: v.ownerName || (owner ? this.residentLabel(owner).split('·')[0].trim() : ''),
        ownerPhone: v.contactNumber || owner?.phone || '',
        societyId: mobileUser?.societyId || societyId,
        registrationNumber: `REG-${Date.now()}`,
        registrationDate: new Date(),
        registrationStatus: RegistrationStatus.PENDING,
        isNeutered: !!v.isNeutered,
        isFriendlyWithPets: true,
        isFriendlyWithChildren: true,
        isAggressive: false,
        hasInsurance: false,
        identificationMarks: notes || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: mobileUser?.id || v.ownerId
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = true;
        },
        error: err => {
          this.isSubmitting = false;
          this.submitError = err?.error?.message || err?.message || 'Registration failed';
        }
      });
  }

  goBack(): void {
    const base = this.router.url.startsWith('/admin/') ? '/admin/pets' : '/mobile/pets';
    this.router.navigate([base]);
  }
}
