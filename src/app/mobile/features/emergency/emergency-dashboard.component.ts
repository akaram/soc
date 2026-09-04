import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { SosApiService, EmergencyContactRow, SosAlertRow } from '../../../core/services/sos-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-emergency-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page">
      <h2>Emergency</h2>
      <p class="hint">Use SOS for immediate help. For non-urgent issues, use Helpdesk.</p>

      <button class="sos" type="button" (click)="openSosConfirm()">
        <i class="material-icons">sos</i>
        <span>SOS — Alert security</span>
      </button>

      <a class="card" *ngFor="let c of nationalContacts" [href]="telHref(c.phone)">
        <i class="material-icons">{{ c.icon }}</i>
        <div><strong>{{ c.label }}</strong><span>{{ c.phone }}</span></div>
      </a>

      <a class="card link" routerLink="/mobile/emergency/contacts">
        <i class="material-icons">contacts</i>
        <div><strong>Society contacts</strong><span>Guard, admin, maintenance</span></div>
        <i class="material-icons chev">chevron_right</i>
      </a>

      <a class="card link" routerLink="/mobile/complaints/add">
        <i class="material-icons">report_problem</i>
        <div><strong>Report issue</strong><span>Non-emergency helpdesk</span></div>
        <i class="material-icons chev">chevron_right</i>
      </a>

      <!-- Recent SOS -->
      <section *ngIf="myAlerts.length > 0" class="history">
        <h3>Your recent SOS</h3>
        <div class="hist-card" *ngFor="let a of myAlerts.slice(0, 3)">
          <span class="pill" [class]="a.status.toLowerCase()">{{ a.status }}</span>
          <p>{{ a.message || 'SOS alert' }}</p>
          <small>{{ formatDate(a.createdAt) }}</small>
        </div>
      </section>

      <!-- SOS modal -->
      <div class="modal-overlay" *ngIf="sosModal !== 'none'" (click)="closeSosModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <ng-container *ngIf="sosModal === 'confirm'">
            <div class="modal-icon confirm"><i class="material-icons">sos</i></div>
            <h3>Trigger SOS Alert?</h3>
            <p>Security and society admin will be notified immediately with your flat details.</p>
            <label>
              Additional details (optional)
              <textarea rows="2" [(ngModel)]="sosMessage" placeholder="e.g. Medical emergency at my flat"></textarea>
            </label>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeSosModal()">Cancel</button>
              <button type="button" class="btn-send" (click)="confirmSos()" [disabled]="sosSending">
                {{ sosSending ? 'Sending…' : 'Send SOS' }}
              </button>
            </div>
          </ng-container>

          <ng-container *ngIf="sosModal === 'success'">
            <div class="modal-icon success"><i class="material-icons">check_circle</i></div>
            <h3>SOS Alert Sent</h3>
            <p>Security has been notified. Help is on the way.</p>
            <p class="note">For life-threatening emergencies, also call <strong>112</strong> or tap Police below.</p>
            <div class="modal-actions stack">
              <a *ngIf="guardPhone" class="btn-call" [href]="telHref(guardPhone)">Call gate security</a>
              <button type="button" class="btn-send" (click)="closeSosModal()">OK</button>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page { padding: 16px; padding-bottom: 24px; }
      h2 { margin: 0 0 6px; }
      h3 { font-size: 15px; color: #475569; margin: 20px 0 10px; }
      .hint { color: #64748b; font-size: 14px; margin-bottom: 20px; }
      .sos {
        width: 100%; padding: 20px; border: none; border-radius: 16px; margin-bottom: 16px;
        background: linear-gradient(135deg, #ff6b6b, #ee5a6f); color: white;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        font-size: 18px; font-weight: 700; cursor: pointer;
      }
      .card {
        display: flex; align-items: center; gap: 14px; background: white;
        border-radius: 14px; padding: 16px; margin-bottom: 10px; text-decoration: none; color: inherit;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .card .material-icons { color: #667eea; }
      .card div { flex: 1; display: flex; flex-direction: column; }
      .card span { font-size: 13px; color: #64748b; }
      .chev { color: #cbd5e1 !important; }
      .history .hist-card {
        background: white; border-radius: 12px; padding: 12px; margin-bottom: 8px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      }
      .hist-card p { margin: 6px 0 4px; font-size: 14px; }
      .hist-card small { color: #94a3b8; font-size: 12px; }
      .pill {
        font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 8px;
        text-transform: uppercase; background: #fee2e2; color: #b91c1c;
      }
      .pill.resolved { background: #dcfce7; color: #047857; }
      .modal-overlay {
        position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 1000;
        display: flex; align-items: center; justify-content: center; padding: 20px;
      }
      .modal {
        background: white; border-radius: 20px; padding: 24px; max-width: 360px; width: 100%;
      }
      .modal-icon {
        width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center;
        justify-content: center; margin: 0 auto 12px;
      }
      .modal-icon.confirm { background: #fee2e2; color: #dc2626; }
      .modal-icon.success { background: #dcfce7; color: #16a34a; }
      .modal h3 { text-align: center; margin: 0 0 8px; }
      .modal p { text-align: center; color: #64748b; font-size: 14px; margin: 0 0 12px; }
      .modal .note { font-size: 12px; }
      .modal label { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
      .modal textarea {
        margin-top: 6px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px;
      }
      .modal-actions { display: flex; gap: 10px; }
      .modal-actions.stack { flex-direction: column; }
      .btn-cancel, .btn-send, .btn-call {
        flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer;
        text-align: center; text-decoration: none; font-size: 15px;
      }
      .btn-cancel { background: #f1f5f9; color: #475569; }
      .btn-send { background: #667eea; color: white; }
      .btn-send:disabled { opacity: 0.6; }
      .btn-call { background: #10b981; color: white; display: block; }
    `
  ]
})
export class EmergencyDashboardComponent implements OnInit {
  nationalContacts = this.api.defaultNationalContacts();
  myAlerts: SosAlertRow[] = [];
  guardPhone = '';

  sosModal: 'none' | 'confirm' | 'success' = 'none';
  sosSending = false;
  sosMessage = '';

  constructor(
    private api: SosApiService,
    private session: SessionContextService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const societyId = this.session.getSocietyId();
    const userId = this.session.getCurrentUserId();
    if (societyId) {
      this.api.getContacts(societyId).subscribe(contacts => {
        this.nationalContacts = contacts.filter(c => c.role === 'NATIONAL');
        const guard = contacts.find(c => c.role === 'SECURITY_GUARD');
        this.guardPhone = guard?.phone ?? '';
      });
    }
    if (userId) {
      this.api.listForUser(userId).subscribe(rows => (this.myAlerts = rows));
    }
  }

  openSosConfirm(): void {
    if (!this.session.getSocietyId()) {
      this.toast.error('Sign in to send SOS.');
      return;
    }
    this.sosModal = 'confirm';
    this.sosSending = false;
    this.sosMessage = '';
  }

  confirmSos(): void {
    this.sosSending = true;
    const msg = this.sosMessage.trim() || undefined;
    this.api
      .triggerForResident(msg)
      .pipe(finalize(() => (this.sosSending = false)))
      .subscribe({
        next: () => {
          this.sosModal = 'success';
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          const userId = this.session.getCurrentUserId();
          if (userId) {
            this.api.listForUser(userId).subscribe(rows => (this.myAlerts = rows));
          }
        },
        error: err => {
          this.toast.error(String(err));
          this.closeSosModal();
        }
      });
  }

  closeSosModal(): void {
    this.sosModal = 'none';
    this.sosSending = false;
  }

  telHref(phone: string): string {
    return `tel:${(phone || '').replace(/\s/g, '')}`;
  }

  formatDate(d?: Date): string {
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
