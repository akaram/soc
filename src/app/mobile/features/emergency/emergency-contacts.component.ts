import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmergencyContactRow, SosApiService } from '../../../core/services/sos-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';

@Component({
  selector: 'app-emergency-contacts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" routerLink="/mobile/emergency">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Emergency contacts</h2>
        <span style="width:40px"></span>
      </div>

      <p class="loading" *ngIf="loading">Loading contacts…</p>

      <a class="card" *ngFor="let c of contacts" [href]="telHref(c.phone)">
        <i class="material-icons">{{ c.icon || 'phone' }}</i>
        <div>
          <strong>{{ c.label }}</strong>
          <span>{{ c.phone }}</span>
        </div>
        <i class="material-icons chev">call</i>
      </a>

      <p class="empty" *ngIf="!loading && contacts.length === 0">No society contacts configured yet.</p>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; }
      .header { display: flex; align-items: center; padding: 14px 16px; background: white; }
      h2 { margin: 0; flex: 1; text-align: center; font-size: 18px; }
      .icon-btn { background: none; border: none; cursor: pointer; }
      .loading, .empty { padding: 24px; text-align: center; color: #64748b; font-size: 14px; }
      .card {
        display: flex; align-items: center; gap: 14px; margin: 12px 16px;
        background: white; border-radius: 14px; padding: 16px; text-decoration: none; color: inherit;
      }
      .card .material-icons { color: #667eea; }
      .card div { flex: 1; display: flex; flex-direction: column; }
      .card span { font-size: 14px; color: #64748b; }
      .chev { color: #16a34a !important; }
    `
  ]
})
export class EmergencyContactsComponent implements OnInit {
  contacts: EmergencyContactRow[] = [];
  loading = false;

  constructor(
    private api: SosApiService,
    private session: SessionContextService
  ) {}

  ngOnInit(): void {
    const societyId = this.session.getSocietyId();
    this.loading = true;
    this.api.getContacts(societyId || '').subscribe({
      next: rows => {
        // Society-specific contacts only (national lines are on main emergency page)
        this.contacts = rows.filter(c => c.role !== 'NATIONAL');
        this.loading = false;
      },
      error: () => {
        this.contacts = [];
        this.loading = false;
      }
    });
  }

  telHref(phone: string): string {
    return `tel:${(phone || '').replace(/\s/g, '')}`;
  }
}
