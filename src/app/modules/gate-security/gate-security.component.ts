import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interface for menu card items
interface MenuCard {
  title: string;
  icon: string;
  route: string;
  description: string;
  gradient: string;
}

@Component({
  selector: 'app-gate-security',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  template: `
    <div class="gate-security-wrapper">
      <div class="page-header">
        <h1><i class="material-icons">security</i> Gate Security</h1>
        <p>Advanced security and access control management system</p>
        <div class="demo-banner" *ngIf="gateDemoMode">
          <i class="material-icons">info</i>
          <span>Camera feeds may use placeholder streams until RTSP URLs are configured. ANPR, RFID/FASTag, E-Intercom, Visitor Photos, Blacklist, Investigation, and IVR use live APIs.</span>
        </div>
      </div>

      <!-- Cards Grid - Show only on main route -->
      <div class="cards-container" *ngIf="showCards">
        <div class="cards-grid">
          <a 
            *ngFor="let card of menuCards" 
            [routerLink]="card.route"
            (click)="openFeature(card.route, $event)"
            class="menu-card"
            [style.background]="card.gradient">
            <div class="card-icon">
              <i class="material-icons">{{ card.icon }}</i>
            </div>
            <div class="card-content">
              <h3>{{ card.title }}</h3>
              <p>{{ card.description }}</p>
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
    .gate-security-wrapper {
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

    .demo-banner {
      margin-top: 16px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #e8f4fd;
      border: 1px solid #b8daff;
      color: #0c5460;
      font-size: 14px;
      line-height: 1.45;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .demo-banner .material-icons {
      font-size: 20px;
      color: #17a2b8;
      flex-shrink: 0;
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
      margin: 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.5;
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
      .gate-security-wrapper {
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
export class GateSecurityComponent {
  /** Shown in dev when gate UIs still mix demo data with partial live APIs. Hidden in prod when `environment.prod` disables it. */
  readonly gateDemoMode = environment.features.gateHardwareDemoMode;

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

  // Hub menu only on /admin/gate-security; child routes (camera-feed, anpr, etc.) show router-outlet content.
  updateCardsVisibility(url: string): void {
    const path = url.split('?')[0].replace(/\/$/, '');
    this.showCards = path === '/admin/gate-security';
  }

  /** Navigate into a feature (avoids staying on hub when route matches current URL). */
  openFeature(route: string, event: Event): void {
    event.preventDefault();
    const path = this.router.url.split('?')[0].replace(/\/$/, '');
    if (path === route.replace(/\/$/, '')) {
      this.showCards = false;
      return;
    }
    void this.router.navigateByUrl(route);
  }

  // Menu cards configuration with icons, routes, descriptions, and gradient colors
  menuCards: MenuCard[] = [
    {
      title: 'Facial Recognition',
      icon: 'face',
      route: '/admin/gate-security/facial-recognition',
      description: 'Touchless entry using facial recognition technology',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'ANPR',
      icon: 'camera_alt',
      route: '/admin/gate-security/anpr',
      description: 'Automatic Number Plate Recognition for vehicle access',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      title: 'RFID/FASTag',
      icon: 'nfc',
      route: '/admin/gate-security/rfid-fastag',
      description: 'Automatic gate opening with RFID and FASTag integration',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      title: 'Live Camera Feed',
      icon: 'videocam',
      route: '/admin/gate-security/camera-feed',
      description: 'Real-time monitoring of gate cameras and security feeds',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    {
      title: 'E-Intercom',
      icon: 'phone',
      route: '/admin/gate-security/e-intercom',
      description: 'Electronic intercom system for visitor communication',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
    {
      title: 'Video Calling',
      icon: 'videocam',
      route: '/admin/gate-security/video-calling',
      description: 'Video calling system for direct communication with guards',
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
    },
    {
      title: 'Visitor Photo Gallery',
      icon: 'photo_library',
      route: '/admin/gate-security/visitor-photos',
      description: 'Guard walk-in entries and gate photos (7-day storage)',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    },
    {
      title: 'Blacklist',
      icon: 'block',
      route: '/admin/gate-security/blacklist',
      description: 'Manage blacklisted individuals and restricted access',
      gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    },
    {
      title: 'Investigation',
      icon: 'search',
      route: '/admin/gate-security/investigation',
      description: 'Investigation module for security incidents and logs',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    },
    {
      title: 'Empty Flat Logs',
      icon: 'apartment',
      route: '/admin/gate-security/empty-flat-logs',
      description: 'Track and monitor access logs for empty or vacant flats',
      gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
    },
    {
      title: 'IVR',
      icon: 'phone_in_talk',
      route: '/admin/gate-security/ivr',
      description: 'Interactive Voice Response system for automated approvals',
      gradient: 'linear-gradient(135deg, #c471ed 0%, #f64f59 100%)'
    }
  ];
}
