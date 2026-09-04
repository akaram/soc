import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { VisitorApiService, VisitorUi } from './visitor-api.service';

@Component({
  selector: 'app-visitor-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Visitor history</h2>
        <span style="width:40px"></span>
      </div>

      <p class="hint" *ngIf="loading">Loading…</p>
      <p class="hint" *ngIf="!loading && history.length === 0">No past visitors yet.</p>

      <div class="list">
        <div class="card" *ngFor="let v of history">
          <h3>{{ v.name }}</h3>
          <p>{{ v.purpose }} · Flat {{ v.flatNumber }}</p>
          <p class="meta">{{ v.date }} {{ v.time }} · {{ v.status }}</p>
          <p class="meta" *ngIf="v.checkOutTime">Out: {{ v.checkOutTime }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; }
      .header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; background: white;
      }
      h2 { margin: 0; font-size: 18px; }
      .icon-btn { background: none; border: none; cursor: pointer; width: 40px; height: 40px; }
      .hint { padding: 16px; color: #64748b; }
      .list { padding: 16px; }
      .card {
        background: white; border-radius: 12px; padding: 14px; margin-bottom: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .card h3 { margin: 0 0 6px; font-size: 16px; }
      .card p { margin: 0; font-size: 14px; color: #475569; }
      .meta { font-size: 12px !important; color: #94a3b8 !important; margin-top: 6px !important; }
    `
  ]
})
export class VisitorHistoryComponent implements OnInit {
  history: VisitorUi[] = [];
  loading = false;

  constructor(
    private auth: MobileAuthService,
    private visitorApi: VisitorApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.id && !user?.societyId) return;
    this.loading = true;
    // Owners/tenants: only their flat's visitor history, not the whole society.
    this.visitorApi.listForPortalUser(user).subscribe({
      next: rows => {
        this.history = rows.filter(v => this.isPastVisit(v));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private isPastVisit(v: VisitorUi): boolean {
    if (v.status === 'checked-out' || v.status === 'rejected') return true;
    const today = new Date().toISOString().slice(0, 10);
    if (v.visitDateIso) {
      return v.visitDateIso < today;
    }
    return v.date !== 'Today' && v.date !== '';
  }

  goBack(): void {
    this.router.navigate(['/mobile/visitors']);
  }
}
