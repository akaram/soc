import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ComplaintsApiService } from '../../../core/services/complaints-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-add-complaint',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-inner">
        <div class="card" *ngIf="!done">
          <p class="hint">Tell us what went wrong. We will assign it to the right team.</p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <label>
              Category
              <select formControlName="category" class="ctrl">
                <option *ngFor="let c of categories" [value]="c">{{ formatLabel(c) }}</option>
              </select>
            </label>
            <label>
              Priority
              <select formControlName="priority" class="ctrl">
                <option *ngFor="let p of priorities" [value]="p">{{ formatLabel(p) }}</option>
              </select>
            </label>
            <label>
              Title
              <input class="ctrl" formControlName="title" placeholder="Short summary" />
            </label>
            <label>
              Description
              <textarea class="ctrl" rows="4" formControlName="description" placeholder="Describe the issue in detail"></textarea>
            </label>
            <p class="err" *ngIf="error">{{ error }}</p>
            <button type="submit" class="btn primary" [disabled]="form.invalid || busy">
              {{ busy ? 'Sending…' : 'Submit complaint' }}
            </button>
          </form>
        </div>

        <div class="card done-card" *ngIf="done">
          <div class="done-icon">✓</div>
          <h3>Complaint logged</h3>
          <p>We have received your complaint. You can track status in the list.</p>
          <button type="button" class="btn secondary" (click)="goList()">Back to list</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100%;
        background: #f5f7fa;
        padding: 16px;
        box-sizing: border-box;
      }

      /* Center form on mobile and wider screens */
      .page-inner {
        width: 100%;
        max-width: 480px;
        margin: 0 auto;
      }

      .card {
        background: #fff;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      }

      .hint {
        margin: 0 0 16px;
        font-size: 13px;
        line-height: 1.5;
        color: #64748b;
        text-align: center;
      }

      label {
        display: block;
        margin: 14px 0 0;
        font-size: 13px;
        font-weight: 600;
        color: #475569;
      }

      .ctrl {
        display: block;
        width: 100%;
        margin-top: 8px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-sizing: border-box;
        font-size: 15px;
        color: #0f172a;
        background: #fff;
        outline: none;
      }

      .ctrl:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
      }

      textarea.ctrl {
        resize: vertical;
        min-height: 110px;
      }

      .btn {
        width: 100%;
        margin-top: 20px;
        padding: 14px;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      }

      .btn.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
      }

      .btn.secondary {
        background: #e2e8f0;
        color: #0f172a;
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .err {
        margin: 12px 0 0;
        padding: 10px 12px;
        border-radius: 10px;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 13px;
        line-height: 1.4;
        text-align: center;
      }

      .done-card {
        text-align: center;
      }

      .done-icon {
        width: 56px;
        height: 56px;
        margin: 0 auto 12px;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 700;
      }

      .done-card h3 {
        margin: 0 0 8px;
        color: #0f172a;
        font-size: 18px;
      }

      .done-card p {
        margin: 0;
        color: #64748b;
        font-size: 14px;
        line-height: 1.5;
      }
    `
  ]
})
export class AddComplaintComponent {
  categories = [
    'MAINTENANCE',
    'SECURITY',
    'CLEANING',
    'ELECTRICAL',
    'PLUMBING',
    'ELEVATOR',
    'PARKING',
    'NOISE',
    'OTHER'
  ];
  priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  form: FormGroup;
  busy = false;
  done = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private api: ComplaintsApiService,
    private session: SessionContextService,
    private router: Router
  ) {
    this.form = this.fb.group({
      category: [this.categories[0], Validators.required],
      priority: ['MEDIUM', Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const societyId = this.session.getSocietyId();
    const complainantId = this.session.getCurrentUserId();
    if (!societyId || !complainantId) {
      this.error = 'Missing society or user. Sign in again.';
      return;
    }
    this.busy = true;
    this.error = '';
    const v = this.form.value;
    this.api
      .resolveFlatId()
      .pipe(
        switchMap(flatId => {
          if (!flatId) {
            throw new Error('Flat is not linked to your profile. Contact admin.');
          }
          return this.api.create({
            societyId,
            flatId,
            complainantId,
            category: v.category,
            title: v.title,
            description: v.description,
            priority: v.priority
          });
        })
      )
      .subscribe({
        next: () => {
          this.busy = false;
          this.done = true;
        },
        error: err => {
          this.busy = false;
          this.error = err?.message || 'Could not create complaint';
        }
      });
  }

  goList(): void {
    this.router.navigate(['/mobile/complaints']);
  }

  /** Human-readable labels for enum values in dropdowns. */
  formatLabel(value: string): string {
    return (value || '').replace(/_/g, ' ');
  }
}
