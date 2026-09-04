import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { ResidentProfileAssetsService } from './resident-profile-assets.service';
import { makePocId } from './poc-profile-list.util';
import { ToastService } from '../../../core/services/toast.service';

type Vehicle = {
  id: string;
  backendId?: string;
  registrationNumber: string;
  make: string;
  model: string;
  status: 'ACTIVE' | 'INACTIVE';
};

/**
 * Add / edit vehicle (Mobile, POC).
 * Stores vehicles in localStorage scoped to the logged-in user.
 */
@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>{{ isEditMode ? 'Edit Vehicle' : 'Add Vehicle' }}</h2>
        <span style="width: 40px;"></span>
      </div>

      <div class="card" *ngIf="form">
        <form [formGroup]="form" (ngSubmit)="save()">
          <label>
            Registration number
            <input class="ctrl" formControlName="registrationNumber" placeholder="e.g., DL 01 AB 1234" />
          </label>

          <label>
            Make
            <input class="ctrl" formControlName="make" placeholder="e.g., Honda" />
          </label>

          <label>
            Model
            <input class="ctrl" formControlName="model" placeholder="e.g., City" />
          </label>

          <label>
            Status
            <select class="ctrl" formControlName="status">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>

          <button class="btn primary" type="submit" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Vehicle' : 'Save Vehicle') }}
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
export class VehicleFormComponent implements OnInit {
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
    const vehicleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!vehicleId;
    this.editingId = vehicleId;

    const returnUrl = this.isEditMode
      ? `/mobile/profile/vehicles/edit/${vehicleId}`
      : '/mobile/profile/vehicles/add';

    if (!user) {
      this.router.navigate(['/mobile/auth/login'], { queryParams: { returnUrl } });
      return;
    }

    this.form = this.fb.group({
      registrationNumber: ['', [Validators.required, Validators.minLength(4)]],
      make: ['', [Validators.required]],
      model: ['', [Validators.required]],
      status: ['ACTIVE', [Validators.required]]
    });

    if (this.isEditMode && vehicleId) {
      const vehicle = this.read(this.storageKey(user.id)).find(v => v.id === vehicleId);
      if (!vehicle) {
        this.toast.error('Vehicle not found.');
        this.router.navigate(['/mobile/profile/vehicles']);
        return;
      }
      this.form.patchValue(vehicle);
    }
  }

  save(): void {
    const user = this.auth.getCurrentUser();
    if (!user || this.form.invalid) return;
    this.saving = true;

    const key = this.storageKey(user.id);
    const current = this.read(key);
    const v = this.form.value as Vehicle;
    let row: Vehicle;

    if (this.isEditMode && this.editingId) {
      const idx = current.findIndex(item => item.id === this.editingId);
      if (idx === -1) {
        this.saving = false;
        this.toast.error('Vehicle not found.');
        this.router.navigate(['/mobile/profile/vehicles']);
        return;
      }
      row = {
        ...current[idx],
        registrationNumber: String(v.registrationNumber).trim(),
        make: String(v.make).trim(),
        model: String(v.model).trim(),
        status: v.status || 'ACTIVE'
      };
      current[idx] = row;
      this.write(key, current);
    } else {
      row = {
        id: makePocId('veh'),
        registrationNumber: String(v.registrationNumber).trim(),
        make: String(v.make).trim(),
        model: String(v.model).trim(),
        status: v.status || 'ACTIVE'
      };
      this.write(key, [row, ...current]);
    }

    this.assets.syncVehicle(row).subscribe(backendId => {
      this.saving = false;
      if (backendId) {
        const list = this.read(key);
        const i = list.findIndex(item => item.id === row.id);
        if (i >= 0) {
          list[i] = { ...list[i], backendId };
          this.write(key, list);
        }
        this.toast.success(
          this.isEditMode ? 'Vehicle updated and synced to admin.' : 'Vehicle added and synced to admin.'
        );
      } else {
        this.toast.warning(
          this.isEditMode
            ? 'Vehicle saved on this device. Start the backend to sync to admin.'
            : 'Vehicle saved on this device. Backend sync failed — ensure the API is running on port 9999.'
        );
      }
      this.router.navigate(['/mobile/profile/vehicles']);
    });
  }

  goBack(): void {
    this.router.navigate(['/mobile/profile/vehicles']);
  }

  private storageKey(userId: string): string {
    return `poc:vehicles:${userId}`;
  }
  private read(key: string): Vehicle[] {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as Vehicle[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  private write(key: string, vehicles: Vehicle[]): void {
    localStorage.setItem(key, JSON.stringify(vehicles));
  }
}
