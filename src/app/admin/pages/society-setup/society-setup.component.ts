import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SocietySetupApiService, SocietyRow } from './society-setup-api.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Society Setup — create, edit, select societies; flats via setup wizard.
 */
@Component({
  selector: 'app-society-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <h1><i class="material-icons">apartment</i> Society Setup</h1>
        <p>Create or select a society. Flats are saved in the database for Complaints and resident linking.</p>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Create society</h3>
          <label>
            Society name
            <input class="ctrl" [(ngModel)]="draft.name" placeholder="e.g., Green Valley Apartments" />
          </label>
          <label>
            Address
            <textarea class="ctrl" rows="2" [(ngModel)]="draft.address" placeholder="Society address"></textarea>
          </label>
          <label>
            City
            <input class="ctrl" [(ngModel)]="draft.city" placeholder="City" />
          </label>
          <label>
            Generate flats (count)
            <input class="ctrl" type="number" min="0" [(ngModel)]="draft.flatCount" />
          </label>
          <label>
            Flat prefix
            <input class="ctrl" [(ngModel)]="draft.flatPrefix" placeholder="e.g., A-" />
          </label>
          <button class="btn primary" type="button" (click)="createSociety()" [disabled]="!draft.name.trim() || busy">
            {{ busy ? 'Creating…' : 'Create in database' }}
          </button>
        </div>

        <div class="card">
          <div class="list-head">
            <h3>Societies (from API)</h3>
            <span class="muted" *ngIf="!loading">{{ totalCount }} total</span>
          </div>

          <p class="muted" *ngIf="loading">Loading…</p>
          <div *ngIf="!loading && !societies.length" class="muted">
            No societies in the database yet. Create one on the left.
          </div>

          <div class="society" *ngFor="let s of paginatedSocieties" [class.active-row]="s.id === activeSocietyId">
            <div class="society-main">
              <div class="name">{{ s.name }}</div>
              <div class="addr">{{ s.address || s.city || '—' }}</div>
              <div class="meta">
                ID: <span class="mono">{{ s.id }}</span>
                · Flats: {{ flatCounts[s.id] ?? 0 }}
              </div>
            </div>
            <div class="society-actions">
              <button class="btn" type="button" (click)="selectSociety(s.id)">Select</button>
              <button class="btn edit" type="button" (click)="openEdit(s)">Edit</button>
              <button class="btn danger" type="button" (click)="requestDelete(s)">Delete</button>
            </div>
          </div>

          <div class="pagination" *ngIf="!loading && totalCount > 0">
            <label class="page-size">
              Per page
              <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                <option *ngFor="let n of pageSizeOptions" [ngValue]="n">{{ n }}</option>
              </select>
            </label>
            <span class="page-info">{{ pageRangeStart }}–{{ pageRangeEnd }} of {{ totalCount }}</span>
            <button class="btn sm" type="button" (click)="changePage(currentPage - 1)" [disabled]="currentPage === 1">←</button>
            <span class="page-num">{{ currentPage }} / {{ totalPages }}</span>
            <button class="btn sm" type="button" (click)="changePage(currentPage + 1)" [disabled]="currentPage === totalPages">→</button>
          </div>

          <div class="selected" *ngIf="activeSocietyId">
            Active society: <strong>{{ activeSocietyName }}</strong>
            <span class="meta mono">({{ activeSocietyId }})</span>
            <a class="link" routerLink="/admin/complaints">Go to Complaints</a>
            <a class="link" routerLink="/admin/users">Link users to flats</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit society modal -->
    <div class="modal-overlay" *ngIf="editOpen" (click)="cancelEdit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h3>Edit society</h3>
          <button type="button" class="icon-btn" (click)="cancelEdit()">×</button>
        </div>
        <label>
          Society name
          <input class="ctrl" [(ngModel)]="editDraft.name" />
        </label>
        <label>
          Address
          <textarea class="ctrl" rows="2" [(ngModel)]="editDraft.address"></textarea>
        </label>
        <label>
          City
          <input class="ctrl" [(ngModel)]="editDraft.city" />
        </label>
        <label>
          State
          <input class="ctrl" [(ngModel)]="editDraft.state" />
        </label>
        <label>
          Pincode
          <input class="ctrl" [(ngModel)]="editDraft.pincode" />
        </label>
        <label>
          Total flats (target count)
          <input class="ctrl" type="number" min="0" [(ngModel)]="editDraft.flatCount" />
        </label>
        <label>
          Flat prefix (for new flats)
          <input class="ctrl" [(ngModel)]="editDraft.flatPrefix" placeholder="e.g., A-" />
        </label>
        <p class="hint">
          Current flats in database: <strong>{{ editDraft.currentFlatCount }}</strong>.
          Increase the count to generate more flats (e.g. A-001, A-002).
          Lowering the count removes vacant unassigned flats only.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn" (click)="cancelEdit()" [disabled]="editBusy">Cancel</button>
          <button type="button" class="btn primary" (click)="saveEdit()" [disabled]="!editDraft.name.trim() || editBusy">
            {{ editBusy ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm modal (no browser alert) -->
    <div class="modal-overlay" *ngIf="pendingDelete" (click)="cancelDelete()">
      <div class="modal modal-sm" (click)="$event.stopPropagation()">
        <h3>Delete society?</h3>
        <p>Delete <strong>{{ pendingDelete.name }}</strong>? This may fail if users or flats are linked.</p>
        <div class="modal-actions">
          <button type="button" class="btn" (click)="cancelDelete()" [disabled]="deleteBusy">Cancel</button>
          <button type="button" class="btn danger solid" (click)="confirmDelete()" [disabled]="deleteBusy">
            {{ deleteBusy ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page { max-width: 1200px; margin: 0 auto; padding-bottom: 48px; }
      .header h1 { display: flex; align-items: center; gap: 10px; margin: 0 0 6px; color: #2c3e50; }
      .header p { margin: 0 0 16px; color: #7f8c8d; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 960px) { .grid { grid-template-columns: 1fr; } }
      .card { background: #fff; border-radius: 14px; padding: 18px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
      .list-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
      h3 { margin: 0 0 12px; }
      label { display: block; margin: 10px 0; font-size: 13px; color: #566573; }
      .ctrl { width: 100%; margin-top: 6px; padding: 10px 12px; border: 1px solid #dfe6e9; border-radius: 10px; box-sizing: border-box; }
      .btn { padding: 10px 14px; border: none; border-radius: 10px; cursor: pointer; background: #ecf0f1; color: #2c3e50; font-weight: 600; }
      .btn.sm { padding: 6px 12px; font-size: 13px; }
      .btn.primary { background: #3498db; color: #fff; width: 100%; margin-top: 10px; }
      .btn.edit { background: #e8f4fd; color: #1d6fa5; }
      .btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .btn.danger { background: #fdecea; color: #c0392b; }
      .btn.danger.solid { background: #e74c3c; color: #fff; }
      .society { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid #ecf0f1; }
      .society.active-row { background: #f8fafc; margin: 0 -8px; padding: 12px 8px; border-radius: 8px; }
      .society:last-child { border-bottom: none; }
      .name { font-weight: 700; color: #2c3e50; }
      .addr { color: #7f8c8d; font-size: 13px; margin-top: 4px; }
      .meta { margin-top: 6px; font-size: 12px; color: #95a5a6; }
      .mono { font-family: ui-monospace, monospace; }
      .society-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
      .muted { color: #95a5a6; padding: 10px 0; font-size: 13px; }
      .selected { margin-top: 14px; padding-top: 12px; border-top: 1px solid #ecf0f1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .link { color: #3498db; text-decoration: none; font-weight: 600; }
      .pagination { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 1px solid #ecf0f1; }
      .page-size { font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 6px; }
      .page-size select { padding: 4px 8px; border-radius: 6px; border: 1px solid #dfe6e9; }
      .page-info, .page-num { font-size: 13px; color: #6b7280; }
      .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 9000; display: flex; align-items: center; justify-content: center; padding: 16px; }
      .modal { background: #fff; border-radius: 14px; padding: 20px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 16px 48px rgba(0,0,0,0.2); }
      .modal-sm { max-width: 400px; }
      .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .modal-head h3 { margin: 0; }
      .icon-btn { border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 20px; }
      .hint { font-size: 12px; color: #94a3b8; margin: 8px 0 0; }
      .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
      .modal-actions .btn.primary { width: auto; margin-top: 0; }
    `
  ]
})
export class SocietySetupComponent implements OnInit {
  societies: SocietyRow[] = [];
  flatCounts: Record<string, number> = {};
  activeSocietyId = '';
  loading = false;
  busy = false;

  currentPage = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20];

  editOpen = false;
  editBusy = false;
  editingId = '';
  editDraft = {
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    flatCount: 0,
    currentFlatCount: 0,
    flatPrefix: 'A-'
  };

  pendingDelete: SocietyRow | null = null;
  deleteBusy = false;

  draft = {
    name: '',
    address: '',
    city: '',
    flatCount: 12,
    flatPrefix: 'A-'
  };

  constructor(
    private api: SocietySetupApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.activeSocietyId = sessionStorage.getItem('societyId') || localStorage.getItem('societyId') || '';
    this.loadSocieties();
  }

  get totalCount(): number {
    return this.societies.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get paginatedSocieties(): SocietyRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.societies.slice(start, start + this.pageSize);
  }

  get pageRangeStart(): number {
    return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageRangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  get activeSocietyName(): string {
    return this.societies.find(s => s.id === this.activeSocietyId)?.name ?? this.activeSocietyId;
  }

  loadSocieties(): void {
    this.loading = true;
    this.api.listSocieties().subscribe({
      next: rows => {
        this.societies = rows;
        this.loading = false;
        rows.forEach(s => {
          this.flatCounts[s.id] = s.flatCount ?? s.totalFlats ?? 0;
        });
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }
      },
      error: err => {
        this.loading = false;
        this.toast.error(String(err));
      }
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  selectSociety(societyId: string): void {
    sessionStorage.setItem('societyId', societyId);
    localStorage.setItem('societyId', societyId);
    this.activeSocietyId = societyId;
    const name = this.societies.find(s => s.id === societyId)?.name ?? societyId;
    this.toast.success(`Society "${name}" selected for admin modules.`);
  }

  createSociety(): void {
    this.busy = true;
    this.api
      .setup({
        name: this.draft.name.trim(),
        address: this.draft.address.trim() || undefined,
        city: this.draft.city.trim() || undefined,
        flatCount: Math.max(0, Number(this.draft.flatCount) || 0),
        flatPrefix: this.draft.flatPrefix || 'A-'
      })
      .subscribe({
        next: res => {
          this.busy = false;
          this.flatCounts[res.societyId] = res.flatsCreated;
          this.toast.success(`Created "${res.societyName}" with ${res.flatsCreated} flats.`);
          this.selectSociety(res.societyId);
          this.draft.name = '';
          this.draft.address = '';
          this.loadSocieties();
        },
        error: err => {
          this.busy = false;
          this.toast.error(String(err));
        }
      });
  }

  openEdit(s: SocietyRow): void {
    this.editingId = s.id;
    const current = s.flatCount ?? s.totalFlats ?? 0;
    this.editDraft = {
      name: s.name,
      address: s.address ?? '',
      city: s.city ?? '',
      state: '',
      pincode: '',
      flatCount: current,
      currentFlatCount: current,
      flatPrefix: 'A-'
    };
    this.editOpen = true;
    this.api.getSocietyById(s.id).subscribe({
      next: row => {
        if (this.editingId !== row.id) {
          return;
        }
        const count = row.flatCount ?? row.totalFlats ?? current;
        this.editDraft = {
          name: row.name,
          address: row.address ?? '',
          city: row.city ?? '',
          state: row.state ?? '',
          pincode: row.pincode ?? '',
          flatCount: count,
          currentFlatCount: count,
          flatPrefix: this.editDraft.flatPrefix
        };
      },
      error: () => {
        this.toast.warning('Could not load full society details; editing basic fields only.');
      }
    });
    this.api.listFlats(s.id).subscribe(flats => {
      if (this.editingId !== s.id || !flats.length) {
        return;
      }
      this.editDraft.currentFlatCount = flats.length;
      this.editDraft.flatCount = flats.length;
      this.editDraft.flatPrefix = this.inferFlatPrefix(flats[0]?.flatNumber);
    });
  }

  /** Guess prefix from flat number like A-403 → A- */
  private inferFlatPrefix(flatNumber?: string): string {
    if (!flatNumber?.trim()) {
      return 'A-';
    }
    const m = flatNumber.trim().match(/^(.+?)(\d+)$/);
    return m ? m[1] : 'A-';
  }

  saveEdit(): void {
    if (!this.editingId || !this.editDraft.name.trim()) {
      this.toast.warning('Society name is required.');
      return;
    }
    this.editBusy = true;
    this.api
      .updateSociety(this.editingId, {
        name: this.editDraft.name.trim(),
        address: this.editDraft.address.trim() || undefined,
        city: this.editDraft.city.trim() || undefined,
        state: this.editDraft.state.trim() || undefined,
        pincode: this.editDraft.pincode.trim() || undefined,
        flatCount: Math.max(0, Number(this.editDraft.flatCount) || 0),
        flatPrefix: this.editDraft.flatPrefix?.trim() || 'A-'
      })
      .subscribe({
        next: res => {
          this.editBusy = false;
          this.editOpen = false;
          if (res.flatsAdded && res.flatsAdded > 0) {
            this.toast.success(`Society updated. ${res.flatsAdded} flat(s) created.`);
          } else if (res.flatsRemoved && res.flatsRemoved > 0) {
            this.toast.success(`Society updated. ${res.flatsRemoved} vacant flat(s) removed.`);
          } else {
            this.toast.success('Society updated successfully.');
          }
          if (res.id) {
            this.flatCounts[res.id] = res.flatCount ?? this.editDraft.flatCount;
          }
          this.loadSocieties();
        },
        error: err => {
          this.editBusy = false;
          this.toast.error(String(err));
        }
      });
  }

  cancelEdit(): void {
    if (this.editBusy) {
      return;
    }
    this.editOpen = false;
    this.toast.warning('Edit cancelled — no changes saved.');
  }

  requestDelete(s: SocietyRow): void {
    this.pendingDelete = s;
  }

  cancelDelete(): void {
    if (this.deleteBusy) {
      return;
    }
    this.pendingDelete = null;
    this.toast.warning('Delete cancelled.');
  }

  confirmDelete(): void {
    if (!this.pendingDelete) {
      return;
    }
    const s = this.pendingDelete;
    this.deleteBusy = true;
    this.api.deleteSociety(s.id).subscribe({
      next: () => {
        this.deleteBusy = false;
        this.pendingDelete = null;
        if (this.activeSocietyId === s.id) {
          sessionStorage.removeItem('societyId');
          localStorage.removeItem('societyId');
          this.activeSocietyId = '';
        }
        this.toast.success(`Society "${s.name}" deleted.`);
        this.loadSocieties();
      },
      error: err => {
        this.deleteBusy = false;
        this.toast.error(String(err));
      }
    });
  }
}
