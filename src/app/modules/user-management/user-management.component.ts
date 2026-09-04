import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserManagementService } from './services/user-management.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">people</i> User Management</h1>
        <p>Manage all residents, tenants, and family members</p>
      </div>

      <div class="setup-banner warn" *ngIf="societyFlatCount === 0">
        <strong>No flats in the active society.</strong>
        Go to <a routerLink="/admin/societies">Society Setup</a> and create flats (Generate flats &gt; 0) before linking users.
      </div>
      <div class="setup-banner info" *ngIf="societyFlatCount !== null && societyFlatCount > 0 && usersWithoutFlatLink > 0">
        <strong>{{ usersWithoutFlatLink }} user(s) not linked to a flat.</strong>
        Open <a routerLink="/admin/users-list">All Users</a>, click View, then use <em>Link to flat</em> (required for mobile complaints).
      </div>
      
      <div class="action-bar">
        <a class="btn-primary" routerLink="/admin/users-list">
          <i class="material-icons">list</i>
          View All Users
        </a>
        <a class="btn-secondary" routerLink="/admin/bulk-import">
          <i class="material-icons">upload_file</i>
          Bulk Import
        </a>
        <form class="search-box" (submit)="searchUsers(); $event.preventDefault()">
          <i class="material-icons">search</i>
          <input
            type="search"
            name="userSearch"
            [(ngModel)]="userSearch"
            placeholder="Search users..."
            aria-label="Search users">
        </form>
      </div>
      
      <div class="feature-grid">
        <a class="feature-card"
           *ngFor="let feature of features"
           [routerLink]="feature.route"
           (click)="markAdminLaunch(feature)">
          <i class="material-icons">{{ feature.icon }}</i>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </a>
      </div>
      
      <div class="stats-row">
        <div class="stat-box" *ngFor="let stat of userStats">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-page {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .page-header {
      margin-bottom: 30px;
    }
    
    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 32px;
      margin: 0 0 10px 0;
      color: #2c3e50;
    }
    
    .page-header h1 .material-icons {
      font-size: 40px;
      color: #3498db;
    }
    
    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    .setup-banner {
      margin-bottom: 20px;
      padding: 14px 16px;
      border-radius: 10px;
      font-size: 14px;
      line-height: 1.5;
    }

    .setup-banner strong {
      display: block;
      margin-bottom: 4px;
    }

    .setup-banner a {
      color: inherit;
      font-weight: 600;
      text-decoration: underline;
    }

    .setup-banner.warn {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      color: #92400e;
    }

    .setup-banner.info {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      color: #1e40af;
    }
    
    .action-bar {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }
    
    .btn-primary, .btn-secondary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #3498db;
      color: white;
    }
    
    .btn-primary:hover {
      background: #2980b9;
    }
    
    .btn-secondary {
      background: white;
      color: #3498db;
      border: 2px solid #3498db;
    }
    
    .btn-secondary:hover {
      background: #ecf0f1;
    }
    
    .search-box {
      display: flex;
      align-items: center;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 8px 16px;
      gap: 10px;
      flex: 1;
      max-width: 400px;
    }
    
    .search-box input {
      border: none;
      outline: none;
      flex: 1;
      font-size: 14px;
    }
    
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .feature-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
      text-decoration: none;
      color: inherit;
      display: block;
      transition: all 0.2s;
    }
    
    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
    }
    
    .feature-card {
      position: relative;
    }
    
    .feature-card .material-icons {
      font-size: 48px;
      color: #3498db;
      margin-bottom: 16px;
    }
    
    .feature-card h3 {
      margin: 0 0 12px 0;
      font-size: 18px;
      color: #2c3e50;
    }
    
    .feature-card p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }
    
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .stat-box {
      background: white;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: 600;
      color: #3498db;
      margin-bottom: 8px;
    }
    
    .stat-label {
      color: #7f8c8d;
      font-size: 14px;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  societyFlatCount: number | null = null;
  usersWithoutFlatLink = 0;
  /** Hub search box — submits to All Users with ?q= */
  userSearch = '';

  /** Live society metrics; replaced on init (no hardcoded demo numbers). */
  userStats: Array<{ value: string; label: string }> = [
    { value: '—', label: 'Total Residents' },
    { value: '—', label: 'Flats' },
    { value: '—', label: 'Tenants' },
    { value: '—', label: 'Staff Members' }
  ];

  constructor(
    private router: Router,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.loadOverviewStats();
  }

  /** Load flat-link banners and summary stat cards from the active society APIs. */
  private loadOverviewStats(): void {
    const societyId = this.userService.getActiveSocietyId();
    if (!societyId) {
      this.societyFlatCount = 0;
      this.userStats = this.buildStatCards({ totalResidents: 0, flats: 0, tenants: 0, staffMembers: 0 });
      return;
    }

    this.userService.getOverviewStats().subscribe({
      next: stats => {
        this.societyFlatCount = stats.flats;
        this.usersWithoutFlatLink = stats.usersWithoutFlatLink;
        this.userStats = this.buildStatCards(stats);
      },
      error: () => {
        this.societyFlatCount = 0;
        this.userStats = this.buildStatCards({ totalResidents: 0, flats: 0, tenants: 0, staffMembers: 0 });
      }
    });
  }

  /** Format overview numbers for the stat row (e.g. 1 → "1", 1250 → "1,250"). */
  private buildStatCards(stats: {
    totalResidents: number;
    flats: number;
    tenants: number;
    staffMembers: number;
  }): Array<{ value: string; label: string }> {
    const fmt = (n: number) => n.toLocaleString('en-US');
    return [
      { value: fmt(stats.totalResidents), label: 'Total Residents' },
      { value: fmt(stats.flats), label: 'Flats' },
      { value: fmt(stats.tenants), label: 'Tenants' },
      { value: fmt(stats.staffMembers), label: 'Staff Members' }
    ];
  }
  
  /** All tiles stay inside the admin layout (same pattern as Pet Registration). */
  features = [
    { 
      icon: 'person_add', 
      title: 'User Registration', 
      description: 'Multi-step registration with document verification',
      route: '/admin/user-registration'
    },
    { 
      icon: 'face', 
      title: 'Facial Recognition', 
      description: 'Biometric setup for touchless access',
      route: '/admin/gate-security/facial-recognition'
    },
    { 
      icon: 'directions_car', 
      title: 'Vehicle Registration', 
      description: 'RFID/FASTag integration',
      route: '/admin/vehicles'
    },
    { 
      icon: 'family_restroom', 
      title: 'Family Profiles', 
      description: 'Manage family member details',
      route: '/admin/family-profiles'
    },
    { 
      icon: 'cleaning_services', 
      title: 'Domestic Staff', 
      description: '6-digit passcode for daily help',
      route: '/admin/domestic-staff'
    },
    { 
      icon: 'pets', 
      title: 'Pet Registration', 
      description: 'Vaccination record tracking',
      route: '/admin/pets'
    }
  ];

  /** Open All Users, applying the hub search box when it has text. */
  searchUsers(): void {
    const q = this.userSearch.trim();
    this.router.navigate(['/admin/users-list'], q ? { queryParams: { q } } : {});
  }

  /** Registration launched from this hub should return to admin when finished. */
  markAdminLaunch(feature: { route: string }): void {
    if (feature.route.includes('user-registration')) {
      sessionStorage.setItem('fromAdmin', 'true');
    }
  }
}
