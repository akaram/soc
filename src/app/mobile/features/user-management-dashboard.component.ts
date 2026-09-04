import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface ManagementCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  status?: 'active' | 'coming-soon';
  badge?: number;
}

@Component({
  selector: 'app-user-management-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="management-dashboard">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <h1>User Management</h1>
          <p>Manage residents, staff, pets, and bulk operations</p>
        </div>
        <div class="header-actions">
          <button class="btn-icon" (click)="router.navigate(['/mobile/dashboard'])">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-bar">
        <button class="btn btn-primary" (click)="router.navigate(['/mobile/bulk-import'])">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Bulk Import
        </button>
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            placeholder="Search users..." 
            [(ngModel)]="searchTerm"
            (ngModelChange)="filterCards()"
          >
        </div>
      </div>

      <!-- Management Cards Grid -->
      <div class="cards-grid">
        <div 
          *ngFor="let card of filteredCards" 
          class="management-card"
          [class.coming-soon]="card.status === 'coming-soon'"
          (click)="navigateToCard(card)">
          <div class="card-icon" [style.background]="card.color">
            <div [innerHTML]="card.icon"></div>
          </div>
          <div class="card-content">
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
            <div class="card-footer">
              <span class="status-badge" *ngIf="card.status === 'coming-soon'">Coming Soon</span>
              <span class="count-badge" *ngIf="card.badge">{{ card.badge }} records</span>
            </div>
          </div>
          <div class="card-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="filteredCards.length === 0">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <h3>No Results Found</h3>
        <p>Try searching with different keywords</p>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <h3>Quick Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalResidents }}</div>
            <div class="stat-label">Total Residents</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ totalStaff }}</div>
            <div class="stat-label">Domestic Staff</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ totalPets }}</div>
            <div class="stat-label">Registered Pets</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ totalVehicles }}</div>
            <div class="stat-label">Vehicles</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .management-dashboard {
      min-height: 100vh;
      background: #f5f7fa;
      padding-bottom: 2rem;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .header-content p {
      margin: 0;
      opacity: 0.9;
      font-size: 0.95rem;
    }

    .btn-icon {
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 8px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-icon:hover {
      background: rgba(255,255,255,0.3);
    }

    .action-bar {
      padding: 1rem;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .btn {
      padding: 0.75rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      background: #f5f7fa;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      gap: 0.5rem;
    }

    .search-box svg {
      color: #9ca3af;
    }

    .search-box input {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      font-size: 0.95rem;
    }

    .cards-grid {
      padding: 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .management-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      position: relative;
    }

    .management-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .management-card.coming-soon {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .management-card.coming-soon:hover {
      transform: none;
    }

    .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }

    .card-content {
      flex: 1;
    }

    .card-content h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      color: #1f2937;
    }

    .card-content p {
      margin: 0 0 0.75rem 0;
      font-size: 0.9rem;
      color: #6b7280;
      line-height: 1.4;
    }

    .card-footer {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .status-badge {
      background: #fef3c7;
      color: #92400e;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .count-badge {
      background: #e0e7ff;
      color: #3730a3;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .card-arrow {
      color: #d1d5db;
      flex-shrink: 0;
    }

    .management-card:hover .card-arrow {
      color: #667eea;
      transform: translateX(4px);
      transition: all 0.3s;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-state svg {
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 1rem 0 0.5rem 0;
      color: #374151;
    }

    .empty-state p {
      color: #6b7280;
    }

    .quick-stats {
      padding: 1rem;
    }

    .quick-stats h3 {
      margin: 0 0 1rem 0;
      color: #1f2937;
      font-size: 1.25rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }

      .header {
        padding: 1.5rem 1rem;
      }

      .header-content h1 {
        font-size: 1.5rem;
      }

      .action-bar {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class UserManagementDashboardComponent implements OnInit {
  searchTerm = '';
  filteredCards: ManagementCard[] = [];
  
  // Sample stats
  totalResidents = 145;
  totalStaff = 5;
  totalPets = 6;
  totalVehicles = 89;

  managementCards: ManagementCard[] = [
    {
      id: 'user-registration',
      title: 'User Registration',
      description: 'Multi-step registration with document verification',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>`,
      route: '/mobile/auth/register',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'facial-recognition',
      title: 'Facial Recognition',
      description: 'Biometric setup for touchless access',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
        <line x1="9" y1="9" x2="9.01" y2="9"></line>
        <line x1="15" y1="9" x2="15.01" y2="9"></line>
      </svg>`,
      route: '/mobile/auth/facial-recognition',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 'vehicle-registration',
      title: 'Vehicle Registration',
      description: 'RFID/FASTag integration',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
        <circle cx="7" cy="17" r="2"></circle>
        <path d="M9 17h6"></path>
        <circle cx="17" cy="17" r="2"></circle>
      </svg>`,
      route: '/admin/vehicles',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      badge: this.totalVehicles
    },
    {
      id: 'family-profiles',
      title: 'Family Profiles',
      description: 'Manage family member details',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>`,
      route: '/mobile/profile/family',
      color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
    {
      id: 'domestic-staff',
      title: 'Domestic Staff',
      description: '6-digit passcode for daily help',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <rect x="14" y="11" width="8" height="10" rx="1" ry="1"></rect>
        <line x1="17" y1="14" x2="17" y2="14.01"></line>
        <line x1="19" y1="14" x2="19" y2="14.01"></line>
        <line x1="17" y1="17" x2="17" y2="17.01"></line>
        <line x1="19" y1="17" x2="19" y2="17.01"></line>
      </svg>`,
      route: '/mobile/domestic-staff',
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      badge: this.totalStaff
    },
    {
      id: 'pet-registration',
      title: 'Pet Registration',
      description: 'Vaccination record tracking',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="4" r="2"></circle>
        <circle cx="18" cy="8" r="2"></circle>
        <circle cx="20" cy="16" r="2"></circle>
        <circle cx="9" cy="10" r="2"></circle>
        <circle cx="15" cy="11" r="2"></circle>
        <path d="M9 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0"></path>
      </svg>`,
      route: '/mobile/pets',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      badge: this.totalPets
    },
    {
      id: 'bulk-import',
      title: 'Bulk Resident Import',
      description: 'Import from Excel/CSV with validation',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <line x1="9" y1="15" x2="15" y2="15"></line>
      </svg>`,
      route: '/mobile/bulk-import',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
  ];

  constructor(public router: Router) {}

  ngOnInit() {
    this.filteredCards = [...this.managementCards];
  }

  filterCards() {
    if (!this.searchTerm.trim()) {
      this.filteredCards = [...this.managementCards];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredCards = this.managementCards.filter(card =>
      card.title.toLowerCase().includes(term) ||
      card.description.toLowerCase().includes(term)
    );
  }

  navigateToCard(card: ManagementCard) {
    if (card.status === 'coming-soon') {
      alert(`${card.title} feature is coming soon!`);
      return;
    }

    if (card.route === '#' || !card.route) {
      alert(`${card.title} feature is under development.`);
      return;
    }

    // Mark that we're coming from mobile view
    if (card.route.includes('facial-recognition')) {
      sessionStorage.setItem('fromAdmin', 'false');
      sessionStorage.setItem('fromMobile', 'true');
    }

    this.router.navigate([card.route]);
  }
}
