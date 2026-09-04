import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';

import { MobileAuthService } from '../../services/mobile-auth.service';

import { ToastService } from '../../../core/services/toast.service';

import { FamilyMemberApiService } from './family-member-api.service';



/**

 * Add / edit family member — persisted to backend so admin can view the same list.

 */

@Component({

  selector: 'app-family-member-form',

  standalone: true,

  imports: [CommonModule, ReactiveFormsModule],

  template: `

    <div class="page">

      <div class="header">

        <button class="icon-btn" type="button" (click)="goBack()">

          <i class="material-icons">arrow_back</i>

        </button>

        <h2>{{ isEditMode ? 'Edit Family Member' : 'Add Family Member' }}</h2>

        <span style="width: 40px;"></span>

      </div>



      <div class="card" *ngIf="form">

        <form [formGroup]="form" (ngSubmit)="save()">

          <label>

            Name

            <input class="ctrl" formControlName="name" placeholder="Full name" />

          </label>



          <label>

            Relation

            <input class="ctrl" formControlName="relation" placeholder="e.g., Spouse, Son, Daughter" />

          </label>



          <label>

            Phone

            <input class="ctrl" formControlName="phone" placeholder="Phone number" />

          </label>



          <button class="btn primary" type="submit" [disabled]="form.invalid || saving || loading">

            {{ saving ? 'Saving…' : (isEditMode ? 'Update Member' : 'Save Member') }}

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

export class FamilyMemberFormComponent implements OnInit {

  form!: FormGroup;

  saving = false;

  loading = false;

  isEditMode = false;

  /** Backend family member id when editing. */

  private editingId: string | null = null;



  constructor(

    private fb: FormBuilder,

    private auth: MobileAuthService,

    private router: Router,

    private route: ActivatedRoute,

    private toast: ToastService,

    private familyApi: FamilyMemberApiService

  ) {}



  ngOnInit(): void {

    const user = this.auth.getCurrentUser();

    const memberId = this.route.snapshot.paramMap.get('id');

    this.isEditMode = !!memberId;

    this.editingId = memberId;



    const returnUrl = this.isEditMode

      ? `/mobile/profile/family/edit/${memberId}`

      : '/mobile/profile/family/add';



    if (!user) {

      this.router.navigate(['/mobile/auth/login'], { queryParams: { returnUrl } });

      return;

    }



    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      relation: ['', [Validators.required]],
      phone: ['', [Validators.required]]
    });

    // Pick up flat link from admin without requiring logout/login.
    this.auth.refreshProfileFromServer().subscribe();

    if (this.isEditMode && memberId) {

      this.loading = true;

      this.familyApi.getById(memberId).subscribe(member => {

        this.loading = false;

        if (!member) {

          this.toast.error('Family member not found.');

          this.router.navigate(['/mobile/profile/family']);

          return;

        }

        this.form.patchValue({

          name: member.name,

          relation: member.relation,

          phone: member.phone ?? ''

        });

      });

    }

  }



  save(): void {
    const user = this.auth.getCurrentUser();
    if (!user || this.form.invalid) return;
    this.saving = true;
    const v = this.form.value as { name: string; relation: string; phone: string };

    // Refresh flatId from server right before save (admin may have linked flat recently).
    this.auth.refreshProfileFromServer().subscribe(freshUser => {
      const active = freshUser ?? user;
      this.familyApi.saveForUser(active, v, this.isEditMode ? this.editingId : null).subscribe(result => {
        this.saving = false;
        if (!result.success) {
          this.toast.warning(result.message);
          return;
        }
        this.toast.success(
          this.isEditMode ? 'Family member updated successfully.' : 'Family member added successfully.'
        );
        this.router.navigate(['/mobile/profile/family']);
      });
    });
  }



  goBack(): void {

    this.router.navigate(['/mobile/profile/family']);

  }

}


