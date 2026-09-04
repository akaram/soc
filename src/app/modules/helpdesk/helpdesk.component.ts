import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SessionContextService } from '../../core/services/session-context.service';
import { ToastService } from '../../core/services/toast.service';
import { HelpdeskService, HelpdeskTicket, PRIORITIES, SLA_HOURS, TicketPriority, TicketStatus } from './helpdesk.service';

@Component({
  selector: 'app-helpdesk',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">support_agent</i> Helpdesk</h1>
        <p>Ticket system with SLA-based auto-escalation</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>
          to manage tickets.
        </span>
      </div>

      <ng-container *ngIf="societyId">
        <div class="stat-row">
          <div class="stat-card">
            <span class="stat-value">{{ counts.open }}</span>
            <span class="stat-label">Open</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ counts.inProgress }}</span>
            <span class="stat-label">In Progress</span>
          </div>
          <div class="stat-card danger" *ngIf="counts.escalated > 0">
            <span class="stat-value">{{ counts.escalated }}</span>
            <span class="stat-label">Escalated</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ counts.resolved }}</span>
            <span class="stat-label">Resolved</span>
          </div>
        </div>

        <div class="toolbar">
          <button type="button" class="btn-secondary" (click)="load()" [disabled]="loading">
            <i class="material-icons">refresh</i> Refresh
          </button>
          <button type="button" class="btn-primary" (click)="showForm = !showForm">
            <i class="material-icons">add</i> {{ showForm ? 'Cancel' : 'New ticket' }}
          </button>
          <label class="filter">
            Status
            <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
          <label class="filter">
            Priority
            <select [(ngModel)]="priorityFilter" (ngModelChange)="applyFilter()">
              <option value="">All</option>
              <option *ngFor="let p of priorities" [value]="p">{{ p }}</option>
            </select>
          </label>
        </div>

        <div class="card form-card" *ngIf="showForm">
          <label class="full">
            Title
            <input class="ctrl" [(ngModel)]="draft.title" placeholder="e.g. Lift not working in Block B" />
          </label>
          <label>
            Priority
            <select class="ctrl" [(ngModel)]="draft.priority">
              <option *ngFor="let p of priorities" [value]="p">{{ p }} (SLA {{ slaFor(p) }}h)</option>
            </select>
          </label>
          <label class="full">
            Details
            <textarea class="ctrl" rows="4" [(ngModel)]="draft.description" placeholder="Describe the issue…"></textarea>
          </label>
          <button type="button" class="btn-primary" [disabled]="creating || !draft.title.trim()" (click)="createTicket()">
            {{ creating ? 'Creating…' : 'Create ticket' }}
          </button>
        </div>

        <p class="loading-hint" *ngIf="loading">Loading tickets…</p>

        <div class="ticket-list" *ngIf="!loading">
          <div class="ticket-card" *ngFor="let t of filtered" [class.escalated]="t.status === 'ESCALATED'">
            <div class="ticket-head">
              <span class="ref">{{ t.ref }}</span>
              <span class="pill priority" [class]="t.priority.toLowerCase()">{{ t.priority }}</span>
              <span class="pill status" [class]="t.status.toLowerCase()">{{ t.status.replace('_', ' ') }}</span>
            </div>
            <h4 class="ticket-title">{{ t.title }}</h4>
            <p class="ticket-desc" *ngIf="t.description">{{ t.description }}</p>
            <p class="ticket-meta">
              Opened {{ formatAge(t.hoursOpen) }} ago · SLA {{ t.slaHours }}h
              <span class="breach" *ngIf="t.isBreached"> · breached by {{ formatAge(t.hoursOverdue) }}</span>
            </p>
            <div class="ticket-actions">
              <button *ngIf="t.status === 'OPEN'" class="btn-action" (click)="setStatus(t, 'IN_PROGRESS')">Start progress</button>
              <button *ngIf="t.status === 'ESCALATED'" class="btn-action" (click)="setStatus(t, 'IN_PROGRESS')">Acknowledge &amp; work</button>
              <button *ngIf="t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'ESCALATED'" class="btn-resolve" (click)="setStatus(t, 'RESOLVED')">Resolve</button>
              <button *ngIf="t.status === 'RESOLVED'" class="btn-action" (click)="setStatus(t, 'CLOSED')">Close</button>
              <button *ngIf="t.status === 'RESOLVED' || t.status === 'CLOSED'" class="btn-action" (click)="setStatus(t, 'OPEN')">Reopen</button>
              <button class="btn-delete" (click)="remove(t)">Delete</button>
            </div>
          </div>
          <p class="muted" *ngIf="!filtered.length">No tickets match this filter.</p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .module-page { padding: 24px; max-width: 1000px; }
      .page-header h1 { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 26px; color: #2c3e50; }
      .page-header p { margin: 0; color: #64748b; }
      .banner { display: flex; gap: 10px; padding: 14px 16px; border-radius: 10px; margin: 16px 0; }
      .banner.warn { background: #fffbeb; color: #92400e; }
      .inline-link { color: #667eea; font-weight: 600; }

      .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 20px 0; }
      .stat-card { background: white; border-radius: 12px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center; }
      .stat-card.danger { background: #fef2f2; }
      .stat-value { display: block; font-size: 22px; font-weight: 700; color: #1e293b; }
      .stat-label { font-size: 12px; color: #64748b; }

      .toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 16px; }
      .filter { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; color: #475569; }
      .filter select { margin-top: 4px; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .btn-primary, .btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; }
      .btn-primary { background: #3498db; color: #fff; }
      .btn-primary:disabled { background: #a5d0ea; cursor: not-allowed; }
      .btn-secondary { background: #ecf0f1; color: #2c3e50; }

      .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 20px; }
      .form-card label { display: block; margin-bottom: 12px; font-size: 13px; color: #555; }
      .form-card label.full { width: 100%; }
      .ctrl { display: block; width: 100%; margin-top: 4px; padding: 8px 10px; border: 1px solid #dfe6e9; border-radius: 6px; box-sizing: border-box; }

      .loading-hint { color: #64748b; padding: 12px 0; }
      .ticket-list { display: flex; flex-direction: column; gap: 14px; }
      .ticket-card { background: white; border-radius: 12px; padding: 16px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid #cbd5e1; }
      .ticket-card.escalated { border-left-color: #ef4444; background: #fef2f2; }
      .ticket-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ref { font-size: 12px; color: #94a3b8; font-weight: 600; }
      .pill { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 10px; border-radius: 999px; }
      .pill.priority.urgent { background: #fee2e2; color: #b91c1c; }
      .pill.priority.high { background: #ffedd5; color: #c2410c; }
      .pill.priority.medium { background: #fef3c7; color: #b45309; }
      .pill.priority.low { background: #e0f2fe; color: #0369a1; }
      .pill.status.open { background: #e2e8f0; color: #334155; }
      .pill.status.in_progress { background: #dbeafe; color: #1d4ed8; }
      .pill.status.escalated { background: #fee2e2; color: #b91c1c; }
      .pill.status.resolved { background: #d1fae5; color: #047857; }
      .pill.status.closed { background: #e2e8f0; color: #64748b; }
      .ticket-title { margin: 8px 0 4px; font-size: 15px; color: #1e293b; }
      .ticket-desc { margin: 0 0 6px; font-size: 13px; color: #475569; }
      .ticket-meta { margin: 0 0 10px; font-size: 12px; color: #94a3b8; }
      .ticket-meta .breach { color: #dc2626; font-weight: 600; }
      .ticket-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .btn-action, .btn-resolve, .btn-delete {
        border: none; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .btn-action { background: #eef2ff; color: #4338ca; }
      .btn-resolve { background: #10b981; color: white; }
      .btn-delete { background: none; color: #ef4444; }
      .muted { color: #94a3b8; padding: 16px 0; }
    `
  ]
})
export class HelpdeskComponent implements OnInit {
  societyId = '';
  loading = false;
  creating = false;
  showForm = false;
  statusFilter = '';
  priorityFilter = '';

  tickets: HelpdeskTicket[] = [];
  filtered: HelpdeskTicket[] = [];
  priorities = PRIORITIES;

  counts = { open: 0, inProgress: 0, escalated: 0, resolved: 0 };

  draft = { title: '', description: '', priority: 'MEDIUM' as TicketPriority };

  constructor(
    private helpdesk: HelpdeskService,
    private session: SessionContextService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.societyId = this.session.getSocietyId() ?? '';
    if (this.societyId) {
      this.load();
    }
  }

  load(): void {
    if (!this.societyId) return;
    this.loading = true;
    this.helpdesk.list(this.societyId).subscribe({
      next: tickets => {
        this.tickets = tickets;
        this.computeCounts();
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Could not load helpdesk tickets.');
      }
    });
  }

  applyFilter(): void {
    this.filtered = this.tickets.filter(
      t => (!this.statusFilter || t.status === this.statusFilter) && (!this.priorityFilter || t.priority === this.priorityFilter)
    );
  }

  private computeCounts(): void {
    this.counts = {
      open: this.tickets.filter(t => t.status === 'OPEN').length,
      inProgress: this.tickets.filter(t => t.status === 'IN_PROGRESS').length,
      escalated: this.tickets.filter(t => t.status === 'ESCALATED').length,
      resolved: this.tickets.filter(t => t.status === 'RESOLVED').length
    };
  }

  createTicket(): void {
    if (!this.societyId || !this.draft.title.trim()) return;
    this.creating = true;
    this.helpdesk
      .create(this.societyId, {
        title: this.draft.title.trim(),
        description: this.draft.description.trim(),
        priority: this.draft.priority
      })
      .subscribe({
        next: () => {
          this.creating = false;
          this.showForm = false;
          this.draft = { title: '', description: '', priority: 'MEDIUM' };
          this.toast.success('Ticket created.');
          this.load();
        },
        error: () => {
          this.creating = false;
          this.toast.error('Could not create ticket.');
        }
      });
  }

  setStatus(ticket: HelpdeskTicket, status: TicketStatus): void {
    this.helpdesk.setStatus(ticket, status).subscribe({
      next: () => {
        this.toast.success(`Ticket ${ticket.ref} marked ${status.replace(/_/g, ' ').toLowerCase()}.`);
        this.load();
      },
      error: () => this.toast.error('Could not update ticket status.')
    });
  }

  remove(ticket: HelpdeskTicket): void {
    this.helpdesk.remove(ticket.id).subscribe({
      next: () => {
        this.toast.warning(`Ticket ${ticket.ref} deleted.`);
        this.load();
      },
      error: () => this.toast.error('Could not delete ticket.')
    });
  }

  slaFor(p: TicketPriority): number {
    return SLA_HOURS[p];
  }

  formatAge(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 48) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  }
}
