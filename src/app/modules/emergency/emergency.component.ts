import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { SessionContextService } from '../../core/services/session-context.service';
import { ToastService } from '../../core/services/toast.service';
import { EmergencyContactRow, SosAlertRow, SosApiService, SOS_STATUSES } from '../../core/services/sos-api.service';

/**
 * Admin SOS — view active alerts, acknowledge, resolve, and trigger society-wide SOS.
 */
@Component({
  selector: 'app-emergency',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">emergency</i> Emergency &amp; Safety</h1>
        <p>Monitor SOS alerts from residents — acknowledge and dispatch security</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>
          to manage SOS alerts.
        </span>
      </div>

      <div class="toolbar" *ngIf="societyId">
        <button type="button" class="btn-secondary" (click)="loadAll()" [disabled]="loading">
          <i class="material-icons">refresh</i> Refresh
        </button>
        <label class="filter">
          Status
          <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
            <option value="">All</option>
            <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
          </select>
        </label>
        <button type="button" class="btn-danger" (click)="showAdminSos = !showAdminSos">
          <i class="material-icons">sos</i>
          {{ showAdminSos ? 'Hide' : 'Trigger admin SOS' }}
        </button>
      </div>

      <!-- Emergency contacts -->
      <div class="card contacts-panel" *ngIf="societyId && contacts.length">
        <h3><i class="material-icons">contact_phone</i> Emergency Contacts</h3>
        <div class="contact-grid">
          <a class="contact-item" *ngFor="let c of contacts" [href]="'tel:' + c.phone">
            <i class="material-icons">{{ c.icon }}</i>
            <div class="contact-info">
              <strong>{{ c.label }}</strong>
              <span>{{ c.phone }}</span>
            </div>
          </a>
        </div>
      </div>

      <!-- Admin trigger -->
      <div class="card admin-sos" *ngIf="societyId && showAdminSos">
        <h3>Trigger society SOS (admin)</h3>
        <p class="hint">Use for drills or society-wide emergencies. All guards will see this alert.</p>
        <label class="full">
          Message
          <textarea rows="2" [(ngModel)]="adminMessage" placeholder="e.g. Fire drill — all residents evacuate"></textarea>
        </label>
        <button type="button" class="btn-danger" (click)="triggerAdminSos()" [disabled]="adminSending">
          {{ adminSending ? 'Sending…' : 'Send admin SOS' }}
        </button>
      </div>

      <!-- Active alerts -->
      <div class="card active-panel" *ngIf="societyId && activeRows.length > 0">
        <h3><i class="material-icons pulse">notifications_active</i> Active SOS ({{ activeRows.length }})</h3>
        <div class="alert-list">
          <div class="alert-item" *ngFor="let a of activeRows">
            <div class="alert-head">
              <strong>{{ a.alertNumber }}</strong>
              <span class="pill" [class]="a.status.toLowerCase()">{{ a.status }}</span>
            </div>
            <p class="msg">{{ a.message || 'SOS alert' }}</p>
            <p class="meta">
              {{ a.triggeredByName || 'Resident' }}
              <span *ngIf="a.flatNumber"> · Flat {{ a.flatNumber }}</span>
              · {{ formatDate(a.createdAt) }}
              · {{ a.alertType }}
            </p>
            <div class="actions">
              <button
                *ngIf="a.status === 'ACTIVE'"
                type="button"
                class="btn-ack"
                (click)="acknowledge(a)"
                [disabled]="actionBusy"
              >
                Acknowledge
              </button>
              <button type="button" class="btn-resolve" (click)="openResolve(a)" [disabled]="actionBusy">
                Mark resolved
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resolve inline -->
      <div class="card" *ngIf="resolveTarget">
        <h3>Resolve {{ resolveTarget.alertNumber }}</h3>
        <label>
          Resolution notes
          <textarea rows="2" [(ngModel)]="resolveNotes" placeholder="Security dispatched, resident safe…"></textarea>
        </label>
        <div class="actions">
          <button type="button" class="btn-secondary" (click)="resolveTarget = null">Cancel</button>
          <button type="button" class="btn-resolve" (click)="resolveAlert()" [disabled]="actionBusy">
            Confirm resolved
          </button>
        </div>
      </div>

      <!-- All alerts -->
      <div class="card" *ngIf="societyId">
        <h3>SOS history</h3>
        <p class="loading-hint" *ngIf="loading">Loading…</p>
        <p class="error" *ngIf="loadError && !loading">{{ loadError }}</p>
        <p class="empty-hint" *ngIf="!loading && !loadError && filtered.length === 0">No SOS alerts yet.</p>

        <div class="table-wrap" *ngIf="!loading && filtered.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Alert</th>
                <th>Resident</th>
                <th>Flat</th>
                <th>Type</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of filtered" [class.urgent]="api.isOpen(a.status)">
                <td>{{ a.alertNumber }}</td>
                <td>{{ a.triggeredByName || '—' }}</td>
                <td>{{ a.flatNumber || '—' }}</td>
                <td>{{ a.alertType }}</td>
                <td><span class="pill" [class]="a.status.toLowerCase()">{{ a.status }}</span></td>
                <td>{{ formatDate(a.createdAt) }}</td>
                <td class="actions">
                  <button
                    *ngIf="a.status === 'ACTIVE'"
                    type="button"
                    class="btn-ack"
                    (click)="acknowledge(a)"
                    [disabled]="actionBusy"
                  >
                    Ack
                  </button>
                  <button
                    *ngIf="api.isOpen(a.status)"
                    type="button"
                    class="btn-resolve"
                    (click)="openResolve(a)"
                    [disabled]="actionBusy"
                  >
                    Resolve
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .module-page { padding: 24px; max-width: 1200px; }
      .page-header h1 { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 26px; }
      .page-header p { margin: 0; color: #64748b; }
      .banner { display: flex; gap: 10px; padding: 14px 16px; border-radius: 10px; margin: 16px 0; }
      .banner.warn { background: #fffbeb; color: #92400e; }
      .inline-link { color: #667eea; font-weight: 600; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 20px 0; }
      .filter { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; color: #475569; }
      .filter select { margin-top: 4px; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      .card h3 { margin: 0 0 12px; font-size: 18px; display: flex; align-items: center; gap: 8px; }
      .hint { color: #64748b; font-size: 14px; margin: 0 0 12px; }
      .active-panel { border-left: 4px solid #ef4444; background: #fef2f2; }
      .admin-sos { border-left: 4px solid #f59e0b; }
      .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
      .contact-item {
        display: flex; align-items: center; gap: 12px; padding: 12px 14px;
        border: 1px solid #e2e8f0; border-radius: 10px; text-decoration: none; color: inherit;
        transition: border-color 0.2s, background 0.2s;
      }
      .contact-item:hover { border-color: #667eea; background: #f8faff; }
      .contact-item .material-icons { color: #667eea; font-size: 26px; }
      .contact-info { display: flex; flex-direction: column; }
      .contact-info strong { font-size: 14px; color: #1e293b; }
      .contact-info span { font-size: 13px; color: #64748b; }
      .alert-list { display: flex; flex-direction: column; gap: 12px; }
      .alert-item { background: white; border-radius: 10px; padding: 14px; border: 1px solid #fecaca; }
      .alert-head { display: flex; justify-content: space-between; align-items: center; }
      .msg { margin: 8px 0 4px; font-weight: 500; }
      .meta { font-size: 13px; color: #64748b; margin: 0 0 10px; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .table-wrap { overflow-x: auto; }
      .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
      .data-table tr.urgent { background: #fff1f2; }
      .pill {
        display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px;
        font-weight: 700; text-transform: uppercase;
      }
      .pill.active { background: #fee2e2; color: #b91c1c; }
      .pill.acknowledged { background: #fef3c7; color: #b45309; }
      .pill.resolved { background: #d1fae5; color: #047857; }
      .pill.cancelled { background: #e2e8f0; color: #475569; }
      .btn-primary, .btn-secondary, .btn-danger, .btn-ack, .btn-resolve {
        display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
        border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 14px;
      }
      .btn-secondary { background: #ecf0f1; color: #2c3e50; }
      .btn-danger { background: linear-gradient(135deg, #ff6b6b, #ee5a6f); color: white; }
      .btn-ack { background: #f59e0b; color: white; padding: 6px 12px; font-size: 13px; }
      .btn-resolve { background: #10b981; color: white; padding: 6px 12px; font-size: 13px; }
      .btn-danger:disabled, .btn-ack:disabled, .btn-resolve:disabled { opacity: 0.6; cursor: not-allowed; }
      .loading-hint, .empty-hint { color: #64748b; text-align: center; padding: 16px; }
      .error { color: #dc2626; padding: 8px; }
      label.full { display: flex; flex-direction: column; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
      textarea { margin-top: 6px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; }
      .pulse { color: #ef4444; animation: pulse 1.2s infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    `
  ]
})
export class EmergencyComponent implements OnInit {
  societyId = '';
  loading = false;
  actionBusy = false;
  adminSending = false;
  showAdminSos = false;
  statusFilter = '';
  loadError = '';
  adminMessage = '';
  resolveNotes = '';
  resolveTarget: SosAlertRow | null = null;

  statuses = [...SOS_STATUSES];
  alerts: SosAlertRow[] = [];
  filtered: SosAlertRow[] = [];
  activeRows: SosAlertRow[] = [];
  contacts: EmergencyContactRow[] = [];

  constructor(
    public api: SosApiService,
    private session: SessionContextService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.societyId = this.session.getSocietyId() ?? '';
    if (this.societyId) {
      this.loadAll();
      this.api.getContacts(this.societyId).subscribe(contacts => (this.contacts = contacts));
    }
  }

  loadAll(): void {
    if (!this.societyId) return;
    this.loading = true;
    this.loadError = '';
    this.api.listBySociety(this.societyId).subscribe({
      next: rows => {
        this.alerts = rows;
        this.activeRows = rows.filter(r => this.api.isOpen(r.status));
        this.applyFilter();
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.loadError = String(err);
        this.toast.error(this.loadError);
      }
    });
  }

  applyFilter(): void {
    const f = (this.statusFilter || '').toUpperCase();
    this.filtered = f ? this.alerts.filter(a => (a.status || '').toUpperCase() === f) : [...this.alerts];
  }

  triggerAdminSos(): void {
    const userId = this.session.getCurrentUserId();
    if (!this.societyId || !userId) return;
    this.adminSending = true;
    this.api
      .trigger({
        societyId: this.societyId,
        triggeredById: userId,
        alertType: 'ADMIN',
        message: this.adminMessage.trim() || 'Admin SOS — society-wide emergency alert'
      })
      .pipe(finalize(() => (this.adminSending = false)))
      .subscribe({
        next: () => {
          this.toast.success('Admin SOS sent — guards and staff notified.');
          this.adminMessage = '';
          this.loadAll();
        },
        error: err => this.toast.error(String(err))
      });
  }

  acknowledge(a: SosAlertRow): void {
    this.actionBusy = true;
    this.api
      .acknowledge(a.id, 'Admin')
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.success('SOS acknowledged.');
          this.loadAll();
        },
        error: err => this.toast.error(String(err))
      });
  }

  openResolve(a: SosAlertRow): void {
    this.resolveTarget = a;
    this.resolveNotes = '';
  }

  resolveAlert(): void {
    if (!this.resolveTarget) return;
    this.actionBusy = true;
    this.api
      .resolve(this.resolveTarget.id, 'Admin', this.resolveNotes.trim() || 'Resolved by admin')
      .pipe(finalize(() => (this.actionBusy = false)))
      .subscribe({
        next: () => {
          this.toast.success('SOS marked resolved.');
          this.resolveTarget = null;
          this.loadAll();
        },
        error: err => this.toast.error(String(err))
      });
  }

  formatDate(d?: Date): string {
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
