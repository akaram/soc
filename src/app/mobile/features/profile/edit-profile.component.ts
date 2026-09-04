import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MobileAuthService, MobileUser } from '../../services/mobile-auth.service';

/**
 * Edit Profile (Mobile)
 * Minimal POC screen to edit the currently logged-in user's profile fields.
 *
 * Note: Backend update wiring can be added later; for now it updates local session storage
 * so the UI immediately reflects changes after save.
 */
@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Edit Profile</h2>
        <span style="width: 40px;"></span>
      </div>

      <div class="card" *ngIf="form">
        <form [formGroup]="form" (ngSubmit)="save()">
          <label>
            Full name
            <input class="ctrl" formControlName="name" placeholder="Your name" />
          </label>

          <label>
            Email
            <input class="ctrl" formControlName="email" placeholder="Email" />
          </label>

          <label>
            Phone
            <input class="ctrl" formControlName="phone" placeholder="Phone" />
          </label>

          <label>
            Flat number
            <input class="ctrl" formControlName="flatNumber" placeholder="e.g., A-101" />
          </label>

          <label>
            Tower
            <input class="ctrl" formControlName="tower" placeholder="e.g., Tower A" />
          </label>

          <p class="hint">
            This POC screen updates your local session immediately. Backend sync can be wired once the
            <code>/users/:id</code> update flow is finalized.
          </p>

          <button class="btn primary" type="submit" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100vh;
        background: #f5f7fa;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #2c3e50;
      }
      .icon-btn {
        background: none;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #2c3e50;
      }
      .card {
        margin: 16px;
        background: white;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
      }
      label {
        display: block;
        margin: 10px 0;
        font-size: 13px;
        color: #64748b;
      }
      .ctrl {
        width: 100%;
        margin-top: 6px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-sizing: border-box;
        outline: none;
      }
      .hint {
        margin: 10px 0 0 0;
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.4;
      }
      .btn {
        width: 100%;
        margin-top: 14px;
        padding: 12px 14px;
        border: none;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
      }
      .btn.primary {
        background: #667eea;
        color: white;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `
  ]
})
export class EditProfileComponent implements OnInit {
  form!: FormGroup;
  saving = false;

  private user: MobileUser | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: MobileAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser();
    if (!this.user) {
      // If session is missing, go back to login (guard should normally prevent this).
      this.router.navigate(['/mobile/auth/login'], { queryParams: { returnUrl: '/mobile/profile/edit' } });
      return;
    }

    this.form = this.fb.group({
      name: [this.user.name ?? '', [Validators.required, Validators.minLength(2)]],
      email: [this.user.email ?? '', [Validators.required, Validators.email]],
      phone: [this.user.phone ?? '', [Validators.required]],
      flatNumber: [this.user.flatNumber ?? ''],
      tower: [this.user.tower ?? '']
    });
  }

  /** Save to local session so dashboard/profile update instantly. */
  save(): void {
    if (!this.user || this.form.invalid) return;
    this.saving = true;

    const v = this.form.value as {
      name: string;
      email: string;
      phone: string;
      flatNumber?: string;
      tower?: string;
    };

    const nextUser: MobileUser = {
      ...this.user,
      name: v.name?.trim() || this.user.name,
      email: v.email?.trim() || this.user.email,
      phone: v.phone?.trim() || this.user.phone,
      flatNumber: v.flatNumber?.trim() || undefined,
      tower: v.tower?.trim() || undefined
    };

    // Persist to mobile auth session so all screens (dashboard/profile/header) update instantly.
    this.auth.setCurrentUser(nextUser);

    this.saving = false;
    alert('Profile updated (local).');
    this.router.navigate(['/mobile/profile']);
  }

  goBack(): void {
    this.router.navigate(['/mobile/profile']);
  }
}

