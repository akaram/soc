import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { AnnouncementApiService, AnnouncementRow } from './announcement-api.service';

interface SocietySummary {
  id: string;
  name: string;
  address?: string;
  city?: string;
  totalFlats?: number;
}

/**
 * My Society Component
 * Displays society information, announcements, and quick actions for owners
 */
@Component({
  selector: 'app-my-society',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="society-container">
      <!-- Society Header -->
      <div class="society-header">
        <div class="society-info">
          <h1>{{ societyName }}</h1>
          <p class="society-address">{{ societyAddress }}</p>
          <div class="society-stats">
            <div class="stat-item">
              <i class="material-icons">apartment</i>
              <span>{{ totalFlats }} Flats</span>
            </div>
            <div class="stat-item">
              <i class="material-icons">people</i>
              <span>{{ totalResidents }} Residents</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <a routerLink="/mobile/visitors" class="action-card">
            <i class="material-icons">group_add</i>
            <span>Invite Visitor</span>
          </a>
          <a routerLink="/mobile/amenities" class="action-card">
            <i class="material-icons">event_available</i>
            <span>Book Amenity</span>
          </a>
          <a routerLink="/mobile/complaints/add" class="action-card">
            <i class="material-icons">support_agent</i>
            <span>Raise Complaint</span>
          </a>
          <a routerLink="/mobile/payments" class="action-card">
            <i class="material-icons">receipt</i>
            <span>Pay Bills</span>
          </a>
        </div>
      </div>

      <!-- Announcements -->
      <div class="announcements-section">
        <h2>Announcements</h2>
        <p class="loading-hint" *ngIf="announcementsLoading">Loading announcements…</p>
        <div class="announcements-list" *ngIf="!announcementsLoading && announcements.length > 0">
          <div *ngFor="let announcement of announcements" class="announcement-card">
            <div class="announcement-header">
              <h3>{{ announcement.title }}</h3>
              <span class="announcement-date">{{ announcement.date | date:'medium' }}</span>
            </div>
            <p>{{ announcement.message }}</p>
            <div class="announcement-footer" *ngIf="announcement.category">
              <span class="category-badge">{{ announcement.category }}</span>
            </div>
          </div>
        </div>
        <div *ngIf="!announcementsLoading && announcements.length === 0" class="empty-state">
          <i class="material-icons">campaign</i>
          <p>No announcements at the moment</p>
          <p class="empty-sub">Society admin can publish notices from Admin → Announcements.</p>
        </div>
      </div>

      <!-- Society Services -->
      <div class="services-section">
        <h2>Society Services</h2>
        <div class="services-grid">
          <div class="service-card" *ngFor="let service of services">
            <i class="material-icons">{{ service.icon }}</i>
            <h3>{{ service.name }}</h3>
            <p>{{ service.description }}</p>
            <a [routerLink]="service.route" class="service-link">View Details</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .society-container {
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .society-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 24px;
      color: white;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .society-info h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .society-address {
      margin: 0 0 16px 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .society-stats {
      display: flex;
      gap: 24px;
      margin-top: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-item i {
      font-size: 20px;
    }

    .stat-item span {
      font-size: 14px;
      font-weight: 500;
    }

    .quick-actions {
      margin-bottom: 24px;
    }

    .quick-actions h2 {
      font-size: 18px;
      margin: 0 0 16px 0;
      color: #333;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .action-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      text-decoration: none;
      color: #333;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .action-card:active {
      transform: scale(0.98);
    }

    .action-card i {
      font-size: 32px;
      color: #667eea;
    }

    .action-card span {
      font-size: 14px;
      font-weight: 500;
    }

    .announcements-section,
    .services-section {
      margin-bottom: 24px;
    }

    .announcements-section h2,
    .services-section h2 {
      font-size: 18px;
      margin: 0 0 16px 0;
      color: #333;
    }

    .announcements-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .announcement-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .announcement-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 8px;
    }

    .announcement-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
      flex: 1;
    }

    .announcement-date {
      font-size: 12px;
      color: #999;
    }

    .announcement-card p {
      margin: 8px 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }

    .announcement-footer {
      margin-top: 12px;
    }

    .category-badge {
      display: inline-block;
      background: #f0f0f0;
      color: #667eea;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }

    .empty-sub {
      font-size: 13px;
      margin-top: 8px;
      color: #b0b0b0;
    }

    .loading-hint {
      color: #64748b;
      font-size: 14px;
      margin: 0 0 12px;
    }

    .empty-state i {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }

    .service-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .service-card i {
      font-size: 36px;
      color: #667eea;
      margin-bottom: 12px;
    }

    .service-card h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #333;
    }

    .service-card p {
      margin: 0 0 12px 0;
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }

    .service-link {
      display: inline-block;
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .actions-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .services-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class MySocietyComponent implements OnInit {
  societyName = '';
  societyAddress = '';
  totalFlats = 0;
  totalResidents = 0;
  announcements: AnnouncementRow[] = [];
  announcementsLoading = false;

  services = [
    {
      name: 'Security',
      description: '24/7 security services',
      icon: 'security',
      route: '/mobile/emergency'
    },
    {
      name: 'Maintenance',
      description: 'Building maintenance services',
      icon: 'build',
      route: '/mobile/complaints'
    },
    {
      name: 'Parking',
      description: 'Parking management',
      icon: 'local_parking',
      route: '/mobile/profile/vehicles'
    },
    {
      name: 'Amenities',
      description: 'Book community amenities',
      icon: 'pool',
      route: '/mobile/amenities'
    }
  ];

  constructor(
    private auth: MobileAuthService,
    private http: HttpClient,
    private announcementsApi: AnnouncementApiService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.societyId) {
      return;
    }
    this.loadSocietyData(user.societyId, user.societyName);
  }

  /** Load society header stats and announcements from the API. */
  private loadSocietyData(societyId: string, fallbackName?: string): void {
    this.announcementsLoading = true;
    forkJoin({
      society: this.http
        .get<SocietySummary>(`/societies/${encodeURIComponent(societyId)}`)
        .pipe(catchError(() => of(null))),
      residentCount: this.http
        .get<number>(`/users/society/${encodeURIComponent(societyId)}/count`)
        .pipe(catchError(() => of(0))),
      flatCount: this.http
        .get<unknown[]>(`/flats/society/${encodeURIComponent(societyId)}`)
        .pipe(catchError(() => of([]))),
      announcements: this.announcementsApi.listForSociety(societyId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ society, residentCount, flatCount, announcements }) => {
        this.societyName = society?.name || fallbackName || 'My Society';
        const parts = [society?.address, society?.city].filter(Boolean);
        this.societyAddress = parts.join(', ') || '—';
        this.totalFlats = society?.totalFlats ?? flatCount.length;
        this.totalResidents = residentCount ?? 0;
        this.announcements = announcements;
        this.announcementsLoading = false;
      },
      error: () => {
        this.announcementsLoading = false;
      }
    });
  }
}

