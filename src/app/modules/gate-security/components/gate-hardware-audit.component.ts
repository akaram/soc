import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SessionContextService } from '../../../core/services/session-context.service';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';

type AnyRow = Record<string, unknown> & { id?: string };

/**
 * Minimal production audit screen: shows recent gate-hardware events/actions stored by the backend.
 * Helps during installation/commissioning before real vendor adapters are integrated.
 */
@Component({
  selector: 'app-gate-hardware-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audit-container">
      <div class="page-header">
        <h1><i class="material-icons">receipt_long</i> Gate Hardware Audit</h1>
        <p>Recent gate events and actions (society-scoped)</p>
      </div>

      <div class="actions">
        <button class="btn-primary" type="button" (click)="load()" [disabled]="isLoading">
          <i class="material-icons">refresh</i>
          {{ isLoading ? 'Loading…' : 'Refresh' }}
        </button>
        <div class="hint" *ngIf="!societyId">
          Select a society (login context) to view audit logs.
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Events</h3>
          <div class="empty" *ngIf="!isLoading && events.length === 0">No events yet.</div>
          <table *ngIf="events.length > 0">
            <thead>
              <tr>
                <th>Time</th>
                <th>Gate</th>
                <th>Device</th>
                <th>Type</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of events">
                <td>{{ asText(e['occurredAt'] ?? e['createdAt'] ?? '') }}</td>
                <td>{{ asText(e['gateId'] ?? '') }}</td>
                <td>{{ asText(e['deviceId'] ?? '') }}</td>
                <td>{{ asText(e['eventType'] ?? '') }}</td>
                <td class="mono">{{ stringify(e['payload']) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <h3>Actions</h3>
          <div class="empty" *ngIf="!isLoading && actions.length === 0">No actions yet.</div>
          <table *ngIf="actions.length > 0">
            <thead>
              <tr>
                <th>Time</th>
                <th>Gate</th>
                <th>Device</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of actions">
                <td>{{ asText(a['requestedAt'] ?? a['createdAt'] ?? '') }}</td>
                <td>{{ asText(a['gateId'] ?? '') }}</td>
                <td>{{ asText(a['deviceId'] ?? '') }}</td>
                <td>{{ asText(a['actionType'] ?? '') }}</td>
                <td class="mono">{{ stringify(a) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .audit-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 18px; }
    .page-header h1 { font-size: 28px; margin: 0 0 8px 0; color: #2c3e50; display:flex; align-items:center; gap:12px; }
    .page-header p { margin: 0; color: #7f8c8d; font-size: 15px; }
    .actions { display:flex; align-items:center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
    .hint { color: #64748b; font-size: 13px; }
    .btn-primary { padding: 10px 14px; background:#667eea; color:#fff; border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; font-weight:600; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { background:#fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow:auto; }
    .card h3 { margin: 0 0 12px 0; color:#2c3e50; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #eef2f7; padding: 8px 10px; text-align:left; vertical-align: top; }
    th { color:#475569; font-weight: 700; background: #f8fafc; position: sticky; top: 0; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; color:#334155; max-width: 520px; white-space: pre-wrap; word-break: break-word; }
    .empty { color: #94a3b8; font-size: 13px; padding: 10px 0; }
    @media (max-width: 1024px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class GateHardwareAuditComponent implements OnInit, OnDestroy {
  events: AnyRow[] = [];
  actions: AnyRow[] = [];
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  get societyId(): string {
    return this.session.getSocietyId();
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    const sid = this.societyId;
    if (!sid) {
      this.events = [];
      this.actions = [];
      return;
    }
    this.isLoading = true;
    forkJoin({
      events: this.http.get<AnyRow[]>(`/gate-hardware/events/society/${encodeURIComponent(sid)}`).pipe(catchError(() => of([]))),
      actions: this.http.get<AnyRow[]>(`/gate-hardware/actions/society/${encodeURIComponent(sid)}`).pipe(catchError(() => of([])))
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe(({ events, actions }) => {
        this.events = (events ?? []).slice(0, 100);
        this.actions = (actions ?? []).slice(0, 100);
      });
  }

  stringify(v: unknown): string {
    if (v == null) return '';
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }

  asText(v: unknown): string {
    return v == null ? '' : String(v);
  }
}

