import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { AmenityApiService, AmenityUi } from './amenity-api.service';

@Component({
  selector: 'app-amenity-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="hero">
        <h2>Book amenities</h2>
        <p>Reserve society facilities for your flat</p>
        <a class="bookings-link" routerLink="/mobile/amenities/my-bookings">
          <i class="material-icons">event</i>
          My bookings
          <span class="pill" *ngIf="upcomingCount > 0">{{ upcomingCount }}</span>
        </a>
      </div>

      <p class="loading" *ngIf="loading">Loading amenities…</p>
      <p class="error" *ngIf="error">{{ error }}</p>

      <div class="amenity-card" *ngFor="let a of amenities">
        <div class="amenity-head">
          <div class="icon-wrap">
            <i class="material-icons">{{ a.icon }}</i>
          </div>
          <div class="amenity-info">
            <h3>{{ a.name }}</h3>
            <p>{{ a.description }}</p>
            <span class="meta">
              Up to {{ a.capacity || '—' }} guests · {{ a.slots.length }} slots/day
            </span>
          </div>
        </div>
        <a class="book-btn" [routerLink]="['/mobile/amenities/book', a.id]">
          <i class="material-icons">event_available</i>
          Book now
        </a>
      </div>

      <p class="empty" *ngIf="!loading && !error && amenities.length === 0">No amenities configured for your society.</p>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f7fa; padding-bottom: 88px; }
      .hero {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; padding: 20px 16px 24px;
      }
      .hero h2 { margin: 0 0 6px; font-size: 22px; }
      .hero p { margin: 0 0 14px; opacity: 0.9; font-size: 14px; }
      .bookings-link {
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(255,255,255,0.2); color: white; text-decoration: none;
        padding: 8px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;
      }
      .pill {
        background: #ff4444; font-size: 11px; min-width: 18px; height: 18px;
        border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
      }
      .loading, .error, .empty { padding: 16px; text-align: center; color: #64748b; }
      .error { color: #dc2626; }
      .amenity-card {
        margin: 12px 16px; background: white; border-radius: 16px;
        padding: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      }
      .amenity-head { display: flex; gap: 14px; margin-bottom: 14px; }
      .icon-wrap {
        width: 52px; height: 52px; border-radius: 14px;
        background: rgba(102, 126, 234, 0.12); display: flex; align-items: center; justify-content: center;
      }
      .icon-wrap .material-icons { color: #667eea; font-size: 28px; }
      .amenity-info h3 { margin: 0 0 4px; font-size: 17px; color: #1e293b; }
      .amenity-info p { margin: 0; font-size: 13px; color: #64748b; line-height: 1.4; }
      .meta { display: block; margin-top: 6px; font-size: 12px; color: #94a3b8; }
      .book-btn {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%; padding: 12px; border-radius: 12px;
        background: #667eea; color: white; text-decoration: none; font-weight: 600;
      }
    `
  ]
})
export class AmenityListComponent implements OnInit {
  amenities: AmenityUi[] = [];
  upcomingCount = 0;
  loading = false;
  error = '';

  constructor(
    private api: AmenityApiService,
    private auth: MobileAuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.societyId) {
      this.error = 'Sign in with a society account to book amenities.';
      return;
    }
    this.loading = true;
    this.api.listAmenitiesBySociety(user.societyId).subscribe({
      next: rows => {
        this.amenities = rows;
        this.loading = false;
      },
      error: err => {
        this.error = String(err);
        this.loading = false;
      }
    });
    if (user.id) {
      this.api.countUpcoming(user.id).subscribe(c => (this.upcomingCount = c));
    }
  }
}
