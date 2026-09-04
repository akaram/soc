import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { ResidentProfileAssetsService } from './resident-profile-assets.service';
import { makePocId } from './poc-profile-list.util';
import { ToastService } from '../../../core/services/toast.service';

type Pet = {
  id: string;
  backendId?: string;
  name: string;
  type: string;
  breed: string;
  status: 'ACTIVE' | 'INACTIVE';
};

/**
 * Add / edit pet (Mobile, POC).
 * Stores pets in localStorage scoped to the logged-in user.
 */
@Component({
  selector: 'app-pet-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>{{ isEditMode ? 'Edit Pet' : 'Add Pet' }}</h2>
        <span style="width: 40px;"></span>
      </div>

      <div class="card" *ngIf="form">
        <form [formGroup]="form" (ngSubmit)="save()">
          <label>
            Pet name
            <input class="ctrl" formControlName="name" placeholder="e.g., Bruno" />
          </label>

          <label>
            Type
            <input class="ctrl" formControlName="type" placeholder="e.g., Dog, Cat" />
          </label>

          <label>
            Breed
            <input class="ctrl" formControlName="breed" placeholder="e.g., Labrador" />
          </label>

          <label>
            Status
            <select class="ctrl" formControlName="status">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>

          <button class="btn primary" type="submit" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Pet' : 'Save Pet') }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      h2 { margin: 0; font-size: 18px; font-weight: 700; color: #2c3e50; }
      .icon-btn {
        background: none; border: none; width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; cursor: pointer; color: #2c3e50;
      }
      .card { margin: 16px; background: white; border-radius: 16px; padding: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
      label { display: block; margin: 10px 0; font-size: 13px; color: #64748b; }
      .ctrl {
        width: 100%; margin-top: 6px; padding: 12px; border: 1px solid #e2e8f0;
        border-radius: 12px; box-sizing: border-box; outline: none;
      }
      .btn {
        width: 100%; margin-top: 14px; padding: 12px 14px; border: none; border-radius: 12px;
        font-weight: 700; cursor: pointer;
      }
      .btn.primary { background: #667eea; color: white; }
      .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    `
  ]
})
export class PetFormComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  isEditMode = false;
  private editingId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: MobileAuthService,
    private assets: ResidentProfileAssetsService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    const petId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!petId;
    this.editingId = petId;

    const returnUrl = this.isEditMode
      ? `/mobile/profile/pets/edit/${petId}`
      : '/mobile/profile/pets/add';

    if (!user) {
      this.router.navigate(['/mobile/auth/login'], { queryParams: { returnUrl } });
      return;
    }

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['', [Validators.required]],
      breed: ['', [Validators.required]],
      status: ['ACTIVE', [Validators.required]]
    });

    if (this.isEditMode && petId) {
      const pet = this.read(this.storageKey(user.id)).find(p => p.id === petId);
      if (!pet) {
        this.toast.error('Pet not found.');
        this.router.navigate(['/mobile/profile/pets']);
        return;
      }
      this.form.patchValue(pet);
    }
  }

  save(): void {
    const user = this.auth.getCurrentUser();
    if (!user || this.form.invalid) return;
    this.saving = true;

    const key = this.storageKey(user.id);
    const current = this.read(key);
    const v = this.form.value as Pet;
    let row: Pet;

    if (this.isEditMode && this.editingId) {
      const idx = current.findIndex(p => p.id === this.editingId);
      if (idx === -1) {
        this.saving = false;
        this.toast.error('Pet not found.');
        this.router.navigate(['/mobile/profile/pets']);
        return;
      }
      row = {
        ...current[idx],
        name: String(v.name).trim(),
        type: String(v.type).trim(),
        breed: String(v.breed).trim(),
        status: v.status || 'ACTIVE'
      };
      current[idx] = row;
      this.write(key, current);
    } else {
      row = {
        id: makePocId('pet'),
        name: String(v.name).trim(),
        type: String(v.type).trim(),
        breed: String(v.breed).trim(),
        status: v.status || 'ACTIVE'
      };
      this.write(key, [row, ...current]);
    }

    this.assets.syncPet(row).subscribe(backendId => {
      this.saving = false;
      if (backendId) {
        const list = this.read(key);
        const i = list.findIndex(p => p.id === row.id);
        if (i >= 0) {
          list[i] = { ...list[i], backendId };
          this.write(key, list);
        }
        this.toast.success(
          this.isEditMode ? 'Pet updated and synced to admin.' : 'Pet added and synced to admin.'
        );
      } else {
        this.toast.warning(
          this.isEditMode
            ? 'Pet saved on this device. Start the backend and ensure your flat is set up to sync to admin.'
            : 'Pet saved on this device. Backend sync failed — check society/flat setup and that the API is running.'
        );
      }
      this.router.navigate(['/mobile/profile/pets']);
    });
  }

  goBack(): void {
    this.router.navigate(['/mobile/profile/pets']);
  }

  private storageKey(userId: string): string {
    return `poc:pets:${userId}`;
  }
  private read(key: string): Pet[] {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as Pet[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  private write(key: string, pets: Pet[]): void {
    localStorage.setItem(key, JSON.stringify(pets));
  }
}
