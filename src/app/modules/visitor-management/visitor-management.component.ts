import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

// Interface for menu card items
interface MenuCard {
  title: string;
  icon: string;
  route: string;
  description: string;
  badge?: string;
  gradient: string;
}

@Component({
  selector: 'app-visitor-management',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="visitor-management-wrapper">
      <!-- Hub title only on /admin/visitors; child routes render their own headers -->
      <div class="page-header" *ngIf="showCards">
        <h1><i class="material-icons">group_add</i> Visitor Management</h1>
        <p>Comprehensive visitor tracking and pre-approval system</p>
      </div>

      <!-- Cards Grid - Show only on main route -->
      <div class="cards-container" *ngIf="showCards">
        <div class="cards-grid">
          <a 
            *ngFor="let card of menuCards" 
            [routerLink]="card.route"
            class="menu-card"
            [style.background]="card.gradient">
            <div class="card-icon">
              <i class="material-icons">{{ card.icon }}</i>
            </div>
            <div class="card-content">
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
              <span class="card-badge" *ngIf="card.badge">{{ card.badge }}</span>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </a>
        </div>
      </div>

      <!-- Content Area - Always render, but only visible when cards are hidden -->
      <div class="content-area" [class.hidden]="showCards">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .visitor-management-wrapper {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header h1 .material-icons {
      font-size: 40px;
      color: #667eea;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    /* Cards Container */
    .cards-container {
      margin-bottom: 32px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }

    .menu-card {
      position: relative;
      background: white;
      border-radius: 16px;
      padding: 24px;
      text-decoration: none;
      color: white;
      display: flex;
      flex-direction: column;
      min-height: 180px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      overflow: hidden;
      cursor: pointer;
    }

    .menu-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: inherit;
      opacity: 0.95;
      z-index: 0;
    }

    .menu-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }

    .menu-card .card-icon {
      position: relative;
      z-index: 1;
      width: 56px;
      height: 56px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      backdrop-filter: blur(10px);
    }

    .menu-card .card-icon .material-icons {
      font-size: 32px;
      color: white;
    }

    .menu-card .card-content {
      position: relative;
      z-index: 1;
      flex: 1;
    }

    .menu-card .card-content h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: white;
    }

    .menu-card .card-content p {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.5;
    }

    .menu-card .card-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.25);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      backdrop-filter: blur(10px);
    }

    .menu-card .card-arrow {
      position: absolute;
      bottom: 24px;
      right: 24px;
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      z-index: 1;
    }

    .menu-card:hover .card-arrow {
      background: rgba(255, 255, 255, 0.3);
      transform: translateX(4px);
    }

    .menu-card .card-arrow .material-icons {
      font-size: 20px;
      color: white;
    }

    /* Active card state */
    .menu-card.active-card {
      transform: scale(1.02);
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      border: 2px solid rgba(255, 255, 255, 0.5);
    }

    .content-area {
      min-height: 400px;
    }

    .content-area.hidden {
      display: none;
    }

    @media (max-width: 768px) {
      .visitor-management-wrapper {
        padding: 16px;
      }

      .cards-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
      }

      .menu-card {
        min-height: 160px;
        padding: 20px;
      }
    }
  `]
})
export class VisitorManagementComponent {
  showCards = true; // Show cards by default

  constructor(private router: Router) {
    // Subscribe to route changes to show/hide cards
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateCardsVisibility(event.url);
      });
    
    // Check initial route
    this.updateCardsVisibility(this.router.url);
  }

  // Update cards visibility based on current route
  // Show cards only on the main list route, hide for all other routes
  updateCardsVisibility(url: string): void {
    // Hub cards on /admin/visitors only; child routes (list, recurring, etc.) show their content.
    const path = url.split('?')[0].replace(/\/$/, '');
    this.showCards = path === '/admin/visitors';
  }

  // Menu cards configuration with icons, routes, descriptions, and gradient colors
  menuCards: MenuCard[] = [
    {
      title: 'All Visitors',
      icon: 'people',
      route: '/admin/visitors/list',
      description: 'View and manage all visitor entries and their status',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'Recurring Visitors',
      icon: 'repeat',
      route: '/admin/visitors/recurring',
      description: 'Manage daily help and recurring visitor access',
      badge: 'Daily Help',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      title: 'Monthly Gatepass',
      icon: 'card_membership',
      route: '/admin/visitors/gatepass',
      description: 'Create and manage monthly gatepasses for regular visitors',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      title: 'Bulk Approval',
      icon: 'event',
      route: '/admin/visitors/bulk-approval',
      description: 'Approve multiple visitors for events and gatherings',
      badge: 'Events',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    {
      title: 'Multi-Tier Approval',
      icon: 'verified_user',
      route: '/admin/visitors/multi-tier-approval',
      description: 'Multi-level approval system for gate and tower access',
      badge: 'Gate + Tower',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
    {
      title: 'Delivery Tracking',
      icon: 'local_shipping',
      route: '/admin/visitors/deliveries',
      description: 'Track deliveries from Amazon, Zomato, Swiggy and more',
      badge: 'Amazon, Zomato, Swiggy',
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
    },
    {
      title: 'Delivery Executive App',
      icon: 'phone_android',
      route: '/admin/visitors/deliveries/executive/app',
      description: 'Mobile app interface for delivery executives',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    },
    {
      title: 'Cab/Taxi Entry',
      icon: 'directions_car',
      route: '/admin/visitors/cab-taxi',
      description: 'Manage cab and taxi entry permissions and tracking',
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    },
    {
      title: 'School Bus Tracking',
      icon: 'school',
      route: '/admin/visitors/school-bus',
      description: 'Track and manage school bus arrivals and departures',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    }
  ];

}
