import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { SessionContextService } from '../../core/services/session-context.service';
import { ToastService } from '../../core/services/toast.service';
import { SmartLockApiService } from './services/smart-lock-api.service';
import {
  LOCK_MANUFACTURERS,
  SMART_LOCK_STATUSES,
  SMART_LOCK_TYPES,
  SmartLockFormData,
  SmartLockRow,
  SmartLockStats,
  SmartLockStatus
} from './models/smart-lock.model';

interface FlatOption {
  id: string;
  flatNumber?: string;
  building?: string;
}

/** Admin smart lock registry — register devices, remote lock/unlock, usage guide. */
@Component({
  selector: 'app-smart-locks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <div>
          <h1><i class="material-icons">lock</i> Smart Lock Integration</h1>
          <p>Digital door lock management — register devices and control access remotely</p>
        </div>
        <button type="button" class="btn-guide" (click)="showGuide = !showGuide">
          <i class="material-icons">{{ showGuide ? 'expand_less' : 'help_outline' }}</i>
          {{ showGuide ? 'Hide guide' : 'How to use' }}
        </button>
      </div>

      <!-- How-to guide -->
      <div class="card guide-card" *ngIf="showGuide">
        <h2><i class="material-icons">menu_book</i> How to use Smart Locks</h2>
        <ol class="guide-steps">
          <li>
            <strong>Select your society</strong> — Go to
            <a routerLink="/admin/societies">Society Setup</a>
            and click <em>Select</em> on the society where locks will be installed.
          </li>
          <li>
            <strong>Register a lock</strong> — Click <em>Add lock</em>, choose the flat (or leave blank for common areas),
            enter lock name, location, manufacturer, and device ID from the vendor app.
          </li>
          <li>
            <strong>Set access policy</strong> — Enable <em>Allow remote unlock</em> for admin/guard override.
            Set <em>Auto-lock seconds</em> (e.g. 30) if the door should re-lock automatically after unlock.
          </li>
          <li>
            <strong>Test lock / unlock</strong> — Use the <em>Unlock</em> and <em>Lock</em> buttons on each row.
            Status changes immediately in this POC; production would call the vendor API (Yale, TTLock, etc.).
          </li>
          <li>
            <strong>Monitor status</strong> — Dashboard cards show locked, unlocked, and offline counts.
            Set status to <em>Maintenance</em> or <em>Offline</em> when hardware is being serviced.
          </li>
          <li>
            <strong>Battery alerts</strong> — Enter battery % when syncing from the vendor app.
            Replace batteries when level drops below 20%.
          </li>
        </ol>
        <div class="guide-tip">
          <i class="material-icons">lightbulb</i>
          <span>
            Tip: Flat main door locks should be linked to a flat number so residents can be identified.
            Clubhouse or basement locks can omit the flat field.
          </span>
        </div>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>
          to manage smart locks.
        </span>
      </div>

      <!-- Stats -->
      <div class="stats-grid" *ngIf="societyId && stats">
        <div class="stat-card">
          <i class="material-icons total">lock</i>
          <div>
            <h3>{{ stats.total }}</h3>
            <p>Total Locks</p>
          </div>
        </div>
        <div class="stat-card locked">
          <i class="material-icons">lock</i>
          <div>
            <h3>{{ stats.locked }}</h3>
            <p>Locked</p>
          </div>
        </div>
        <div class="stat-card unlocked">
          <i class="material-icons">lock_open</i>
          <div>
            <h3>{{ stats.unlocked }}</h3>
            <p>Unlocked</p>
          </div>
        </div>
        <div class="stat-card offline">
          <i class="material-icons">cloud_off</i>
          <div>
            <h3>{{ stats.offline }}</h3>
            <p>Offline</p>
          </div>
        </div>
      </div>

      <div class="toolbar" *ngIf="societyId">
        <button type="button" class="btn-secondary" (click)="loadAll()" [disabled]="loading">
          <i class="material-icons">refresh</i> Refresh
        </button>
        <label class="filter">
          Status
          <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
            <option value="">All</option>
            <option *ngFor="let s of lockStatuses" [value]="s.value">{{ s.label }}</option>
          </select>
        </label>
        <button type="button" class="btn-primary" (click)="openCreateForm()">
          <i class="material-icons">add</i> Add lock
        </button>
      </div>

      <!-- Add / Edit form -->
      <div class="card form-panel" *ngIf="societyId && showForm">
        <h3>{{ editingId ? 'Edit smart lock' : 'Register new smart lock' }}</h3>
        <div class="form-grid">
          <label>
            Lock name <span class="req">*</span>
            <input type="text" [(ngModel)]="form.lockName" placeholder="e.g. Main door lock" />
          </label>
          <label>
            Flat (optional)
            <select [(ngModel)]="form.flatId" (ngModelChange)="onFlatSelected()">
              <option value="">— Common area / no flat —</option>
              <option *ngFor="let f of flats" [value]="f.id">{{ flatLabel(f) }}</option>
            </select>
          </label>
          <label class="full">
            Location <span class="req">*</span>
            <input type="text" [(ngModel)]="form.location" placeholder="e.g. Flat A-2001 main entrance" />
          </label>
          <label>
            Lock type
            <select [(ngModel)]="form.lockType">
              <option *ngFor="let t of lockTypes" [value]="t.value">{{ t.label }}</option>
            </select>
          </label>
          <label>
            Manufacturer
            <select [(ngModel)]="form.manufacturer">
              <option value="">— Select —</option>
              <option *ngFor="let m of manufacturers" [value]="m">{{ m }}</option>
            </select>
          </label>
          <label>
            Device ID
            <input type="text" [(ngModel)]="form.deviceId" placeholder="Vendor app device ID" />
          </label>
          <label>
            Serial number
            <input type="text" [(ngModel)]="form.serialNumber" placeholder="Hardware serial" />
          </label>
          <label>
            Status
            <select [(ngModel)]="form.status">
              <option *ngFor="let s of lockStatuses" [value]="s.value">{{ s.label }}</option>
            </select>
          </label>
          <label>
            Battery (%)
            <input type="number" min="0" max="100" [(ngModel)]="form.batteryLevel" placeholder="0–100" />
          </label>
          <label>
            Auto-lock (seconds)
            <input type="number" min="0" [(ngModel)]="form.autoLockSeconds" placeholder="e.g. 30" />
          </label>
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="form.allowRemoteUnlock" />
            Allow remote unlock
          </label>
          <label class="full">
            Notes
            <textarea rows="2" [(ngModel)]="form.notes" placeholder="Installation notes, Wi-Fi details, etc."></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="cancelForm()">Cancel</button>
          <button type="button" class="btn-primary" (click)="saveLock()" [disabled]="saving || !canSave()">
            {{ saving ? 'Saving…' : editingId ? 'Update lock' : 'Register lock' }}
          </button>
        </div>
      </div>

      <!-- Lock list -->
      <div class="card table-wrap" *ngIf="societyId">
        <div *ngIf="loading" class="muted">Loading smart locks…</div>
        <table class="data-table" *ngIf="!loading && filteredRows.length">
          <thead>
            <tr>
              <th>Lock</th>
              <th>Flat</th>
              <th>Type</th>
              <th>Device</th>
              <th>Status</th>
              <th>Battery</th>
              <th>Last unlock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let lock of filteredRows">
              <td>
                <strong>{{ lock.lockName }}</strong>
                <div class="sub">{{ lock.location }}</div>
              </td>
              <td>{{ lock.flatNumber || '—' }}</td>
              <td>{{ typeLabel(lock.lockType) }}</td>
              <td>
                <span *ngIf="lock.manufacturer">{{ lock.manufacturer }}</span>
                <div class="sub" *ngIf="lock.deviceId">{{ lock.deviceId }}</div>
              </td>
              <td>
                <span class="status-pill" [class]="lock.status.toLowerCase()">{{ lock.status }}</span>
              </td>
              <td>
                <span *ngIf="lock.batteryLevel != null" [class.low-battery]="lock.batteryLevel < 20">
                  {{ lock.batteryLevel }}%
                </span>
                <span *ngIf="lock.batteryLevel == null">—</span>
              </td>
              <td>{{ formatDate(lock.lastUnlockedAt) }}</td>
              <td class="actions">
                <button
                  type="button"
                  class="btn-unlock"
                  (click)="unlockLock(lock)"
                  [disabled]="actionBusy || lock.status === 'UNLOCKED' || !lock.allowRemoteUnlock"
                  title="Remote unlock"
                >
                  <i class="material-icons">lock_open</i>
                </button>
                <button
                  type="button"
                  class="btn-lock"
                  (click)="lockDevice(lock)"
                  [disabled]="actionBusy || lock.status === 'LOCKED'"
                  title="Remote lock"
                >
                  <i class="material-icons">lock</i>
                </button>
                <button type="button" class="link" (click)="editLock(lock)">Edit</button>
                <button type="button" class="link danger" (click)="removeLock(lock)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="!loading && !filteredRows.length" class="muted empty-msg">
          No smart locks registered yet. Click <strong>Add lock</strong> to register your first device.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .module-page {
      max-width: 1200px;
      margin: 0 auto;
      padding-bottom: 48px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 28px;
      margin: 0 0 8px;
      color: #2c3e50;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
    }

    .btn-guide {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border: 1px solid #3498db;
      background: #ebf5fb;
      color: #2980b9;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
    }

    .guide-card h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      font-size: 18px;
      color: #2c3e50;
    }

    .guide-steps {
      margin: 0 0 16px;
      padding-left: 20px;
      color: #444;
      line-height: 1.6;
    }

    .guide-steps li {
      margin-bottom: 10px;
    }

    .guide-steps a {
      color: #3498db;
    }

    .guide-tip {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: #fff8e6;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 14px;
      color: #856404;
    }

    .guide-tip .material-icons {
      color: #f39c12;
      flex-shrink: 0;
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

    .inline-link {
      color: #3498db;
      font-weight: 600;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .stat-card h3 {
      margin: 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .stat-card p {
      margin: 0;
      font-size: 13px;
      color: #7f8c8d;
    }

    .stat-card .material-icons {
      font-size: 32px;
      color: #95a5a6;
    }

    .stat-card.locked .material-icons { color: #e74c3c; }
    .stat-card.unlocked .material-icons { color: #27ae60; }
    .stat-card.offline .material-icons { color: #95a5a6; }

    .toolbar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter select {
      margin-left: 6px;
      padding: 8px 10px;
      border: 1px solid #dfe6e9;
      border-radius: 6px;
    }

    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-primary { background: #3498db; color: #fff; }
    .btn-secondary { background: #ecf0f1; color: #2c3e50; }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

    .card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      margin-bottom: 16px;
    }

    .form-panel h3 { margin: 0 0 16px; color: #2c3e50; }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }

    .form-grid label {
      display: block;
      font-size: 13px;
      color: #555;
    }

    .form-grid label.full { grid-column: 1 / -1; }

    .form-grid input, .form-grid select, .form-grid textarea {
      display: block;
      width: 100%;
      margin-top: 4px;
      padding: 8px 10px;
      border: 1px solid #dfe6e9;
      border-radius: 6px;
      box-sizing: border-box;
    }

    .checkbox-label {
      display: flex !important;
      align-items: center;
      gap: 8px;
      padding-top: 24px;
    }

    .checkbox-label input { width: auto; margin: 0; }

    .req { color: #e74c3c; }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .data-table th, .data-table td {
      text-align: left;
      padding: 12px 10px;
      border-bottom: 1px solid #ecf0f1;
      vertical-align: top;
    }

    .sub {
      font-size: 12px;
      color: #95a5a6;
      margin-top: 2px;
    }

    .status-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .status-pill.locked { background: #fdecea; color: #c0392b; }
    .status-pill.unlocked { background: #d5f5e3; color: #1e8449; }
    .status-pill.offline { background: #ecf0f1; color: #7f8c8d; }
    .status-pill.maintenance { background: #fff3cd; color: #856404; }

    .low-battery { color: #e74c3c; font-weight: 700; }

    .actions {
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .btn-unlock, .btn-lock {
      border: none;
      border-radius: 6px;
      padding: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
    }

    .btn-unlock { background: #d5f5e3; color: #1e8449; }
    .btn-lock { background: #fdecea; color: #c0392b; }
    .btn-unlock:disabled, .btn-lock:disabled { opacity: 0.4; cursor: not-allowed; }

    .link {
      background: none;
      border: none;
      color: #3498db;
      cursor: pointer;
      font-size: 13px;
      padding: 4px 6px;
    }

    .link.danger { color: #e74c3c; }

    .muted {
      color: #95a5a6;
      padding: 12px;
    }

    .empty-msg {
      text-align: center;
      padding: 32px 16px;
    }
  `]
})
export class SmartLocksComponent implements OnInit {
  societyId = '';
  rows: SmartLockRow[] = [];
  filteredRows: SmartLockRow[] = [];
  flats: FlatOption[] = [];
  stats: SmartLockStats | null = null;
  loading = false;
  saving = false;
  actionBusy = false;
  showForm = false;
  showGuide = true;
  editingId: string | null = null;
  statusFilter = '';

  lockTypes = SMART_LOCK_TYPES;
  lockStatuses = SMART_LOCK_STATUSES;
  manufacturers = LOCK_MANUFACTURERS;

  form: SmartLockFormData = this.emptyForm();

  constructor(
    private api: SmartLockApiService,
    private session: SessionContextService,
    private toast: ToastService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.societyId = this.session.getSocietyId() ?? '';
    if (this.societyId) {
      this.loadAll();
    }
  }

  loadAll(): void {
    if (!this.societyId) return;
    this.loading = true;
    forkJoin({
      locks: this.api.listBySociety(this.societyId),
      stats: this.api.getStats(this.societyId),
      flats: this.http
        .get<FlatOption[]>(`/flats/society/${encodeURIComponent(this.societyId)}`)
        .pipe(catchError(() => of([])))
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ locks, stats, flats }) => {
          this.rows = locks;
          this.stats = stats;
          this.flats = flats ?? [];
          this.applyFilter();
        },
        error: () => this.toast.error('Could not load smart locks.')
      });
  }

  applyFilter(): void {
    const q = this.statusFilter.trim();
    this.filteredRows = q ? this.rows.filter(r => r.status === q) : [...this.rows];
  }

  openCreateForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = this.emptyForm();
  }

  editLock(lock: SmartLockRow): void {
    this.editingId = lock.id;
    this.form = {
      flatId: lock.flatId ?? '',
      lockName: lock.lockName,
      location: lock.location,
      lockType: lock.lockType,
      manufacturer: lock.manufacturer ?? '',
      deviceId: lock.deviceId ?? '',
      serialNumber: lock.serialNumber ?? '',
      status: lock.status,
      batteryLevel: lock.batteryLevel ?? null,
      allowRemoteUnlock: lock.allowRemoteUnlock,
      autoLockSeconds: lock.autoLockSeconds ?? null,
      notes: lock.notes ?? ''
    };
    this.showForm = true;
  }

  onFlatSelected(): void {
    const flat = this.flats.find(f => f.id === this.form.flatId);
    if (flat?.flatNumber && !this.form.location.trim()) {
      this.form.location = `Flat ${flat.flatNumber} main entrance`;
    }
  }

  canSave(): boolean {
    return !!this.form.lockName.trim() && !!this.form.location.trim();
  }

  saveLock(): void {
    if (!this.societyId || !this.canSave()) return;
    this.saving = true;
    const req = this.editingId
      ? this.api.update(this.editingId, this.form, this.societyId)
      : this.api.create(this.societyId, this.form);
    req.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toast.success(this.editingId ? 'Smart lock updated.' : 'Smart lock registered.');
        this.cancelForm();
        this.loadAll();
      },
      error: err => {
        const msg = err?.error?.message || 'Save failed.';
        this.toast.error(msg);
      }
    });
  }

  unlockLock(lock: SmartLockRow): void {
    this.actionBusy = true;
    this.api
      .unlock(lock.id)
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.success(`${lock.lockName} unlocked remotely.`);
          this.loadAll();
        },
        error: err => this.toast.error(err?.error?.message || 'Unlock failed.')
      });
  }

  lockDevice(lock: SmartLockRow): void {
    this.actionBusy = true;
    this.api
      .lock(lock.id)
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.success(`${lock.lockName} locked remotely.`);
          this.loadAll();
        },
        error: err => this.toast.error(err?.error?.message || 'Lock failed.')
      });
  }

  removeLock(lock: SmartLockRow): void {
    this.api.delete(lock.id).subscribe({
      next: () => {
        this.toast.warning(`"${lock.lockName}" removed.`);
        this.loadAll();
      },
      error: () => this.toast.error('Delete failed.')
    });
  }

  flatLabel(f: FlatOption): string {
    return f.building ? `${f.flatNumber} (${f.building})` : (f.flatNumber ?? f.id);
  }

  typeLabel(type: string): string {
    return this.lockTypes.find(t => t.value === type)?.label ?? type;
  }

  formatDate(d?: Date): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private emptyForm(): SmartLockFormData {
    return {
      flatId: '',
      lockName: '',
      location: '',
      lockType: 'SMART_DEADBOLT',
      manufacturer: '',
      deviceId: '',
      serialNumber: '',
      status: 'LOCKED',
      batteryLevel: null,
      allowRemoteUnlock: true,
      autoLockSeconds: 30,
      notes: ''
    };
  }
}
