import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModuleRecordService, SocietyModuleRecordRow } from '../../core/services/module-record.service';
import { SessionContextService } from '../../core/services/session-context.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Generic list + CRUD for society-scoped admin modules backed by /module-records.
 */
@Component({
  selector: 'app-generic-society-module',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ icon }}</i>
          {{ title }}
        </h1>
        <p>{{ subtitle }}</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>Select a society in session to manage records.</span>
      </div>

      <div *ngIf="error" class="banner error">{{ error }}</div>

      <div class="toolbar" *ngIf="societyId">
        <button type="button" class="btn-secondary" (click)="load()" [disabled]="loading">
          <i class="material-icons">refresh</i>
          Refresh
        </button>
        <button type="button" class="btn-primary" (click)="showForm = !showForm">
          <i class="material-icons">add</i>
          {{ showForm ? 'Cancel' : 'Add record' }}
        </button>
      </div>

      <div class="card form-card" *ngIf="societyId && showForm">
        <label>
          Title
          <input class="ctrl" [(ngModel)]="draft.title" />
        </label>
        <label>
          {{ statusLabel }}
          <select class="ctrl" [(ngModel)]="draft.status">
            <option *ngFor="let opt of effectiveStatusOptions" [value]="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </label>
        <label class="full">
          Details
          <textarea class="ctrl" rows="5" [(ngModel)]="draft.body"></textarea>
        </label>
        <button
          type="button"
          class="btn-primary"
          [disabled]="saving || !draft.title.trim()"
          (click)="save()"
        >
          {{ saving ? 'Saving…' : editingId ? 'Update' : 'Create' }}
        </button>
      </div>

      <div class="card table-wrap" *ngIf="societyId">
        <div *ngIf="loading" class="muted">Loading…</div>
        <table *ngIf="!loading && rows.length">
          <thead>
            <tr>
              <th>Title</th>
              <th>{{ statusLabel }}</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of rows">
              <td>{{ r.title }}</td>
              <td>{{ r.status }}</td>
              <td>{{ r.createdAt | date: 'short' }}</td>
              <td class="actions">
                <button type="button" class="link" (click)="edit(r)">Edit</button>
                <button type="button" class="link danger" (click)="remove(r)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="!loading && !rows.length" class="muted">No records yet. Add one to get started.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .module-page {
        max-width: 1100px;
        margin: 0 auto;
        padding-bottom: 48px;
      }
      .page-header h1 {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 28px;
        margin: 0 0 8px 0;
        color: #2c3e50;
      }
      .page-header p {
        margin: 0;
        color: #7f8c8d;
      }
      .banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
      }
      .banner.warn {
        background: #fff8e6;
        color: #856404;
      }
      .banner.error {
        background: #fdecea;
        color: #c0392b;
      }
      .toolbar {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .btn-primary,
      .btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-size: 14px;
      }
      .btn-primary {
        background: #3498db;
        color: #fff;
      }
      .btn-secondary {
        background: #ecf0f1;
        color: #2c3e50;
      }
      .card {
        background: #fff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
        margin-bottom: 16px;
      }
      .form-card label {
        display: block;
        margin-bottom: 12px;
        font-size: 13px;
        color: #555;
      }
      .form-card label.full {
        width: 100%;
      }
      .ctrl {
        display: block;
        width: 100%;
        margin-top: 4px;
        padding: 8px 10px;
        border: 1px solid #dfe6e9;
        border-radius: 6px;
        box-sizing: border-box;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      th,
      td {
        text-align: left;
        padding: 10px 8px;
        border-bottom: 1px solid #ecf0f1;
      }
      .actions {
        white-space: nowrap;
      }
      .link {
        background: none;
        border: none;
        color: #3498db;
        cursor: pointer;
        margin-right: 12px;
        font-size: 13px;
      }
      .link.danger {
        color: #e74c3c;
      }
      .muted {
        color: #95a5a6;
        padding: 12px;
      }
    `
  ]
})
export class GenericSocietyModuleComponent implements OnInit {
  @Input({ required: true }) moduleCode!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  @Input() icon = 'folder';
  /** Column / field label for the status dropdown (e.g. Category for announcements). */
  @Input() statusLabel = 'Status';
  /** When set, replaces the default workflow status options. */
  @Input() statusOptions: Array<{ value: string; label: string }> | null = null;

  private readonly defaultStatusOptions = [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'DRAFT', label: 'Draft' }
  ];

  get effectiveStatusOptions(): Array<{ value: string; label: string }> {
    return this.statusOptions?.length ? this.statusOptions : this.defaultStatusOptions;
  }

  get defaultDraftStatus(): string {
    return this.effectiveStatusOptions[0]?.value ?? 'OPEN';
  }

  societyId = '';
  rows: SocietyModuleRecordRow[] = [];
  loading = false;
  saving = false;
  error = '';
  showForm = false;
  editingId: string | null = null;

  draft = { title: '', body: '', status: 'OPEN' };

  constructor(
    private api: ModuleRecordService,
    private session: SessionContextService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.draft.status = this.defaultDraftStatus;
    this.societyId = this.session.getSocietyId() ?? '';
    if (this.societyId) {
      this.load();
    }
  }

  load(): void {
    if (!this.societyId) return;
    this.loading = true;
    this.error = '';
    this.api.list(this.societyId, this.moduleCode).subscribe({
      next: list => {
        this.rows = list ?? [];
        this.loading = false;
      },
      error: err => {
        const status = err?.status;
        const msg = err?.error?.message;
        if (status === 401) {
          this.error = 'Session expired — please log in again.';
        } else if (status === 403) {
          this.error = msg || 'Access denied for this society.';
        } else if (status === 0) {
          this.error = 'Cannot reach API — check nginx proxy for /module-records.';
        } else {
          this.error = msg || `Could not load records (HTTP ${status ?? 'error'}).`;
        }
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.societyId || !this.draft.title.trim()) return;
    this.saving = true;
    this.error = '';
    const reset = () => {
      this.saving = false;
      this.showForm = false;
      this.editingId = null;
      this.draft = { title: '', body: '', status: this.defaultDraftStatus };
      this.load();
    };
    if (this.editingId) {
      this.api
        .update(this.editingId, {
          title: this.draft.title.trim(),
          body: this.draft.body,
          status: this.draft.status
        })
        .subscribe({
          next: () => reset(),
          error: () => {
            this.saving = false;
            this.error = 'Update failed.';
          }
        });
    } else {
      this.api
        .create({
          societyId: this.societyId,
          moduleCode: this.moduleCode,
          title: this.draft.title.trim(),
          body: this.draft.body || undefined,
          status: this.draft.status
        })
        .subscribe({
          next: () => reset(),
          error: () => {
            this.saving = false;
            this.error = 'Create failed.';
          }
        });
    }
  }

  edit(r: SocietyModuleRecordRow): void {
    this.editingId = r.id;
    this.draft = {
      title: r.title,
      body: r.body ?? '',
      status: r.status ?? this.defaultDraftStatus
    };
    this.showForm = true;
  }

  remove(r: SocietyModuleRecordRow): void {
    this.api.delete(r.id).subscribe({
      next: () => {
        this.toast.warning('Record deleted.');
        this.load();
      },
      error: () => {
        this.error = 'Delete failed.';
        this.toast.error('Delete failed.');
      }
    });
  }
}
