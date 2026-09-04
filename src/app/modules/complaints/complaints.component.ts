import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ComplaintsApiService, ComplaintRow } from '../../core/services/complaints-api.service';
import { SessionContextService } from '../../core/services/session-context.service';
import { ToastService } from '../../core/services/toast.service';
import { UserManagementService } from '../user-management/services/user-management.service';
import { User } from '../user-management/models/user.model';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

/** Flat row from GET /flats/society/:id (Jackson camelCase). */
interface FlatListItem {
  id: string;
  flatNumber?: string;
  flat_number?: string;
  ownerId?: string;
  owner_id?: string;
}

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">report_problem</i> Complaint Management</h1>
        <p>View society complaints, update status, assign, and resolve</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society (so flats can be loaded) or log in with a user that has a society context.
          <a class="inline-link" routerLink="/admin/societies">Open Society Setup</a>
        </span>
      </div>

      <div *ngIf="societyId" class="banner info">
        <i class="material-icons">apartment</i>
        <span>
          Showing complaints for active society
          <strong class="mono">{{ societyId.slice(0, 8) }}…</strong>.
          Owner complaints appear here when this matches their society —
          <a class="inline-link" routerLink="/admin/societies">change in Society Setup</a>.
        </span>
      </div>

      <div *ngIf="errorMessage" class="banner error">
        <i class="material-icons">error_outline</i>
        <span>{{ errorMessage }}</span>
      </div>

      <div class="toolbar" *ngIf="societyId">
        <button type="button" class="btn-secondary" (click)="load()" [disabled]="loading">
          <i class="material-icons">refresh</i>
          Refresh
        </button>
        <label class="filter">
          Status
          <select [ngModel]="statusFilter" (ngModelChange)="applyFilter($event)">
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <button type="button" class="btn-primary" (click)="showCreate = !showCreate">
          <i class="material-icons">add</i>
          {{ showCreate ? 'Hide form' : 'New complaint' }}
        </button>
      </div>

      <div class="create-panel card" *ngIf="societyId && showCreate">
        <h3>Log complaint</h3>
        <p class="hint">Uses the logged-in user as complainant; pick the affected flat.</p>
        <div *ngIf="!loadingFlats && flats.length === 0" class="banner warn">
          <i class="material-icons">info</i>
          <span>
            No flats found for this society. Create/seed flats in
            <a class="inline-link" routerLink="/admin/societies">Society Setup</a>.
          </span>
        </div>
        <div class="form-grid">
          <label>
            Flat
            <select [(ngModel)]="newFlatId" [disabled]="loadingFlats">
              <option value="">— Select flat —</option>
              <option *ngFor="let f of flats" [value]="f.id">{{ flatLabel(f) }}</option>
            </select>
          </label>
          <label>
            Category
            <select [(ngModel)]="newCategory">
              <option value="MAINTENANCE">Maintenance</option>
              <option value="SECURITY">Security</option>
              <option value="CLEANING">Cleaning</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELEVATOR">Elevator</option>
              <option value="PARKING">Parking</option>
              <option value="NOISE">Noise</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label class="full">
            Title
            <input type="text" [(ngModel)]="newTitle" placeholder="Short summary" />
          </label>
          <label class="full">
            Description
            <textarea rows="3" [(ngModel)]="newDescription" placeholder="Details"></textarea>
          </label>
          <label>
            Priority
            <select [(ngModel)]="newPriority">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>
        </div>
        <div class="actions">
          <button type="button" class="btn-primary" (click)="submitNew()" [disabled]="saving || !newFlatId || !newTitle.trim()">
            Submit
          </button>
        </div>
      </div>

      <div class="layout" *ngIf="societyId">
        <div class="card table-wrap">
          <div *ngIf="loading" class="muted">Loading…</div>
          <table *ngIf="!loading && filtered.length">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Flat</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let c of filtered"
                (click)="select(c)"
                [class.active]="selected?.id === c.id"
              >
                <td>{{ c.complaintNumber || c.id.slice(0, 8) }}</td>
                <td>{{ c.title }}</td>
                <td>{{ c.category }}</td>
                <td><span class="pill" [attr.data-p]="c.priority">{{ c.priority }}</span></td>
                <td><span class="pill status" [attr.data-s]="c.status">{{ c.status }}</span></td>
                <td>{{ c.complainantName || '—' }}</td>
                <td>{{ c.flatNumber || c.flatId.slice(0, 8) + '…' }}</td>
                <td>{{ c.createdAt | date: 'medium' }}</td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="!loading && !filtered.length" class="muted empty">No complaints match this filter.</div>
        </div>

        <div class="card detail" *ngIf="selected">
          <h3>Detail</h3>
          <p class="title">{{ selected.title }}</p>
          <dl>
            <dt>Complaint #</dt>
            <dd>{{ selected.complaintNumber }}</dd>
            <dt>Owner</dt>
            <dd>{{ selected.complainantName || selected.complainantId }}</dd>
            <dt>Flat</dt>
            <dd>{{ selected.flatNumber || selected.flatId }}</dd>
            <dt>Status</dt>
            <dd>{{ selected.status }}</dd>
            <dt>Category</dt>
            <dd>{{ selected.category }}</dd>
            <dt>Priority</dt>
            <dd>{{ selected.priority }}</dd>
            <dt>Description</dt>
            <dd class="desc">{{ selected.description }}</dd>
            <dt *ngIf="selected.resolution">Resolution</dt>
            <dd *ngIf="selected.resolution">{{ selected.resolution }}</dd>
          </dl>
          <div
            class="detail-actions"
            *ngIf="!showResolveForm && selected.status !== 'RESOLVED' && selected.status !== 'CLOSED' && selected.status !== 'REJECTED'">
            <button type="button" class="btn-secondary" (click)="assignToMe()" [disabled]="actionBusy">
              Assign to me
            </button>
            <button type="button" class="btn-secondary" (click)="setInProgress()" [disabled]="actionBusy">
              Mark in progress
            </button>
            <button type="button" class="btn-primary" (click)="openResolveForm()" [disabled]="actionBusy">
              Resolve
            </button>
          </div>

          <div class="resolve-panel" *ngIf="showResolveForm">
            <label>
              Resolution notes
              <textarea
                rows="3"
                [(ngModel)]="resolutionNotes"
                placeholder="Describe how the issue was addressed"></textarea>
            </label>
            <div class="detail-actions">
              <button type="button" class="btn-secondary" (click)="cancelResolve()" [disabled]="actionBusy">
                Cancel
              </button>
              <button
                type="button"
                class="btn-primary"
                (click)="confirmResolve()"
                [disabled]="actionBusy || !resolutionNotes.trim()">
                Confirm resolve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .module-page {
        max-width: 1400px;
        margin: 0 auto;
        padding-bottom: 48px;
      }
      .page-header {
        margin-bottom: 24px;
      }
      .page-header h1 {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 28px;
        margin: 0 0 8px 0;
        color: #2c3e50;
      }
      .page-header h1 .material-icons {
        font-size: 36px;
        color: #3498db;
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
      .banner.info {
        background: #eff6ff;
        color: #1e40af;
      }
      .banner.error {
        background: #fdecea;
        color: #c0392b;
      }
      .inline-link {
        margin-left: 8px;
        color: inherit;
        font-weight: 600;
        text-decoration: underline;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }
      .filter {
        display: flex;
        flex-direction: column;
        font-size: 12px;
        color: #7f8c8d;
      }
      .filter select {
        margin-top: 4px;
        min-width: 160px;
        padding: 8px;
        border-radius: 6px;
        border: 1px solid #dfe6e9;
      }
      .card {
        background: #fff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
      }
      .create-panel {
        margin-bottom: 20px;
      }
      .create-panel h3 {
        margin: 0 0 8px 0;
      }
      .hint {
        margin: 0 0 16px 0;
        color: #7f8c8d;
        font-size: 14px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
      }
      .form-grid label.full {
        grid-column: 1 / -1;
      }
      .form-grid input,
      .form-grid textarea,
      .form-grid select {
        width: 100%;
        margin-top: 6px;
        padding: 8px 10px;
        border: 1px solid #dfe6e9;
        border-radius: 6px;
        box-sizing: border-box;
      }
      .actions {
        margin-top: 16px;
      }
      .layout {
        display: grid;
        grid-template-columns: 1fr minmax(280px, 360px);
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 960px) {
        .layout {
          grid-template-columns: 1fr;
        }
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
      th {
        color: #7f8c8d;
        font-weight: 600;
      }
      tbody tr {
        cursor: pointer;
      }
      tbody tr:hover {
        background: #f8f9fa;
      }
      tbody tr.active {
        background: #e8f4fc;
      }
      .mono {
        font-family: ui-monospace, monospace;
        font-size: 12px;
      }
      .muted {
        color: #95a5a6;
        padding: 16px;
      }
      .empty {
        text-align: center;
      }
      .pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        background: #ecf0f1;
        color: #2c3e50;
      }
      .pill[data-p='URGENT'],
      .pill[data-p='HIGH'] {
        background: #fadbd8;
        color: #c0392b;
      }
      .pill.status[data-s='OPEN'] {
        background: #d6eaf8;
        color: #2874a6;
      }
      .detail .title {
        font-weight: 600;
        margin: 0 0 12px 0;
      }
      dl {
        margin: 0;
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 8px 12px;
        font-size: 14px;
      }
      dt {
        color: #7f8c8d;
        margin: 0;
      }
      dd {
        margin: 0;
      }
      .desc {
        white-space: pre-wrap;
      }
      .detail-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 20px;
      }
      .resolve-panel {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #ecf0f1;
      }
      .resolve-panel label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #475569;
      }
      .resolve-panel textarea {
        width: 100%;
        margin-top: 8px;
        padding: 10px 12px;
        border: 1px solid #dfe6e9;
        border-radius: 8px;
        box-sizing: border-box;
        font-size: 14px;
        resize: vertical;
      }
      .btn-primary,
      .btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        cursor: pointer;
      }
      .btn-primary {
        background: #3498db;
        color: #fff;
      }
      .btn-primary:disabled,
      .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: #ecf0f1;
        color: #2c3e50;
      }
    `
  ]
})
export class ComplaintsComponent implements OnInit {
  societyId = '';
  loading = false;
  loadingFlats = false;
  saving = false;
  actionBusy = false;
  errorMessage = '';
  rows: ComplaintRow[] = [];
  filtered: ComplaintRow[] = [];
  selected: ComplaintRow | null = null;
  statusFilter = '';
  showCreate = false;
  showResolveForm = false;
  resolutionNotes = 'Issue addressed.';
  flats: FlatListItem[] = [];
  users: User[] = [];

  newFlatId = '';
  newCategory = 'MAINTENANCE';
  newTitle = '';
  newDescription = '';
  newPriority = 'MEDIUM';

  constructor(
    private complaintsApi: ComplaintsApiService,
    private session: SessionContextService,
    private http: HttpClient,
    private userService: UserManagementService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.societyId = this.session.getSocietyId() ?? '';
    if (this.societyId) {
      this.loadFlats();
      this.load();
    }
  }

  flatLabel(f: FlatListItem): string {
    const num = f.flatNumber ?? f.flat_number ?? f.id;
    return `${num} (${f.id.slice(0, 8)}…)`;
  }

  /** Load flats for the society so admins can pick a unit when logging a complaint. */
  loadFlats(): void {
    if (!this.societyId) return;
    this.loadingFlats = true;
    this.http.get<FlatListItem[]>(`/flats/society/${encodeURIComponent(this.societyId)}`).subscribe({
      next: list => {
        this.flats = list ?? [];
        this.loadingFlats = false;
      },
      error: () => {
        this.flats = [];
        this.loadingFlats = false;
      }
    });
  }

  load(): void {
    if (!this.societyId) return;
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      complaints: this.complaintsApi.listBySociety(this.societyId),
      flats: this.http
        .get<FlatListItem[]>(`/flats/society/${encodeURIComponent(this.societyId)}`)
        .pipe(catchError(() => of(this.flats))),
      users: this.userService.getAllUsers().pipe(catchError(() => of([] as User[])))
    }).subscribe({
      next: ({ complaints, flats, users }) => {
        this.flats = flats ?? [];
        this.users = users ?? [];
        this.rows = complaints
          .map(row => this.enrichComplaint(row))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        this.applyFilter();
        if (this.selected) {
          this.selected = this.rows.find(r => r.id === this.selected!.id) ?? null;
        }
        this.loading = false;
      },
      error: err => {
        this.errorMessage = err?.message || 'Could not load complaints.';
        this.loading = false;
      }
    });
  }

  /** Apply a normalized status filter so API casing/whitespace cannot break the dropdown. */
  applyFilter(value: string = this.statusFilter): void {
    this.statusFilter = String(value ?? '').trim().toUpperCase();
    this.filtered = this.statusFilter
      ? this.rows.filter(r => String(r.status ?? '').trim().toUpperCase() === this.statusFilter)
      : [...this.rows];
    if (this.selected && !this.filtered.some(row => row.id === this.selected?.id)) {
      this.selected = null;
    }
  }

  /** Resolve readable owner and flat values when older API rows only contain UUIDs. */
  private enrichComplaint(row: ComplaintRow): ComplaintRow {
    const flat = this.flats.find(item => item.id === row.flatId);
    const flatOwnerId = flat?.ownerId ?? flat?.owner_id;
    const user =
      this.users.find(item => item.id === row.complainantId) ||
      this.users.find(item => !!flatOwnerId && item.id === flatOwnerId);
    const ownerName = user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : '';

    return {
      ...row,
      flatNumber: row.flatNumber || flat?.flatNumber || flat?.flat_number,
      complainantName: row.complainantName || ownerName || undefined
    };
  }

  select(c: ComplaintRow): void {
    this.selected = c;
    this.showResolveForm = false;
    this.resolutionNotes = 'Issue addressed.';
  }

  submitNew(): void {
    const uid = this.session.getCurrentUserId();
    if (!this.societyId || !uid || !this.newFlatId) {
      this.errorMessage = 'Missing society, user, or flat.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.complaintsApi
      .create({
        societyId: this.societyId,
        flatId: this.newFlatId,
        complainantId: uid,
        category: this.newCategory,
        title: this.newTitle.trim(),
        description: this.newDescription.trim(),
        priority: this.newPriority
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: created => {
          this.rows = [this.enrichComplaint(created), ...this.rows];
          this.applyFilter();
          this.select(created);
          this.newTitle = '';
          this.newDescription = '';
          this.showCreate = false;
          this.toast.success('Complaint logged successfully.');
        },
        error: () => {
          this.errorMessage = 'Failed to create complaint.';
          this.toast.error('Failed to create complaint.');
        }
      });
  }

  assignToMe(): void {
    const id = this.session.getCurrentUserId();
    if (!this.selected || !id) return;
    this.runAction(this.complaintsApi.assign(this.selected.id, id), 'Complaint assigned to you.');
  }

  setInProgress(): void {
    if (!this.selected) return;
    this.runAction(
      this.complaintsApi.updateStatus(this.selected.id, 'IN_PROGRESS'),
      'Complaint marked in progress.'
    );
  }

  openResolveForm(): void {
    this.showResolveForm = true;
    this.resolutionNotes = 'Issue addressed.';
  }

  cancelResolve(): void {
    this.showResolveForm = false;
    this.resolutionNotes = 'Issue addressed.';
  }

  confirmResolve(): void {
    if (!this.selected) return;
    const uid = this.session.getCurrentUserId();
    const resolution = this.resolutionNotes.trim();
    if (!uid) {
      this.toast.error('No user id in session.');
      return;
    }
    if (!resolution) {
      this.toast.warning('Enter resolution notes before resolving.');
      return;
    }
    this.runAction(
      this.complaintsApi.resolve(this.selected.id, resolution, uid),
      'Complaint resolved successfully.'
    );
  }

  private runAction(obs: ReturnType<ComplaintsApiService['assign']>, successMessage: string): void {
    this.actionBusy = true;
    this.errorMessage = '';
    obs.pipe(finalize(() => (this.actionBusy = false))).subscribe({
      next: updated => {
        const enriched = this.enrichComplaint(updated);
        const idx = this.rows.findIndex(r => r.id === enriched.id);
        if (idx >= 0) this.rows[idx] = enriched;
        this.applyFilter();
        if (this.selected?.id === enriched.id) this.selected = enriched;
        this.showResolveForm = false;
        this.toast.success(successMessage);
      },
      error: () => {
        this.errorMessage = 'Action failed. Check network or permissions.';
        this.toast.error('Action failed. Check network or permissions.');
      }
    });
  }
}
