import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MobileAuthService, MobileUser, UserRole } from '../services/mobile-auth.service';
import { VisitorApiService } from '../features/visitors/visitor-api.service';
import { MobileNotificationsService } from '../services/mobile-notifications.service';
import { ToastContainerComponent } from '../../core/components/toast-container.component';
import { Subscription } from 'rxjs';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
}

interface MenuItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-mobile-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastContainerComponent],
  template: `
    <div class="mobile-layout">
      <!-- Top App Bar -->
      <header class="mobile-header">
        <div class="header-content">
          <h1 class="app-title">{{ pageTitle }}</h1>
          <div class="header-actions">
            <button class="notification-btn" type="button" (click)="openNotifications()" aria-label="Notifications">
              <i class="material-icons">notifications</i>
              <span class="badge" *ngIf="notificationCount > 0">{{ notificationCount }}</span>
            </button>
            <button class="logout-btn-header" (click)="logout()" title="Logout">
              <i class="material-icons">logout</i>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="mobile-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav">
        <a *ngFor="let item of navItems" 
           [routerLink]="item.route" 
           routerLinkActive="active"
           class="nav-item">
          <i class="material-icons">{{ item.icon }}</i>
          <span class="nav-label">{{ item.label }}</span>
          <span class="nav-badge" *ngIf="item.badge && item.badge > 0">{{ item.badge }}</span>
        </a>
      </nav>

      <!-- Toast notifications (success / warning / error) -->
      <app-toast-container class="mobile-toasts"></app-toast-container>
    </div>
  `,
  styles: [`
    .mobile-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #f5f5f5;
    }

    /* Header Styles */
    .mobile-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      height: 56px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .notification-btn, .logout-btn-header {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: background 0.2s;
    }

    .notification-btn:active, .logout-btn-header:active {
      background: rgba(255,255,255,0.1);
    }

    .logout-btn-header .material-icons {
      font-size: 24px;
    }

    .app-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      flex: 1;
      text-align: center;
    }

    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #ff4444;
      color: white;
      font-size: 10px;
      padding: 2px 5px;
      border-radius: 10px;
      min-width: 16px;
      text-align: center;
    }

    /* Main Content */
    .mobile-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding-bottom: 70px; /* Space for bottom nav */
    }

    /* Bottom Navigation */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      display: flex;
      justify-content: space-around;
      padding: 8px 0;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      z-index: 99;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-decoration: none;
      color: #999;
      padding: 4px 12px;
      border-radius: 8px;
      transition: all 0.2s;
      position: relative;
      min-width: 60px;
    }

    .nav-item i {
      font-size: 24px;
      margin-bottom: 2px;
    }

    .nav-label {
      font-size: 11px;
      font-weight: 500;
    }

    .nav-item.active {
      color: #667eea;
    }

    .nav-item.active i {
      color: #667eea;
    }

    .nav-badge {
      position: absolute;
      top: 0;
      right: 8px;
      background: #ff4444;
      color: white;
      font-size: 10px;
      padding: 2px 5px;
      border-radius: 10px;
      min-width: 16px;
      text-align: center;
    }

    /* Safe area for notched devices */
    @supports(padding: max(0px)) {
      .mobile-header {
        padding-top: max(12px, env(safe-area-inset-top));
      }
      
      .bottom-nav {
        padding-bottom: max(8px, env(safe-area-inset-bottom));
      }
    }

    /* Mobile toasts sit above bottom navigation */
    :host ::ng-deep .mobile-toasts .toast-stack {
      top: auto;
      bottom: 76px;
      left: 12px;
      right: 12px;
      max-width: none;
    }
  `]
})
export class MobileLayoutComponent implements OnInit, OnDestroy {
  pageTitle = 'Dashboard';
  notificationCount = 0;

  // Navigation items
  navItems: NavItem[] = [];

  private userSubscription?: Subscription;
  private unreadSubscription?: Subscription;

  constructor(
    private router: Router,
    private authService: MobileAuthService,
    private visitorApi: VisitorApiService,
    private notificationsService: MobileNotificationsService
  ) {}

  ngOnInit() {
    // Subscribe to current user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.updateNavItems(user.role);
        this.refreshVisitorNavBadge(user);
        this.notificationsService.refresh();
      } else {
        this.notificationCount = 0;
      }
    });

    this.unreadSubscription = this.notificationsService.unreadCount$.subscribe(count => {
      this.notificationCount = count;
    });

    // Update page title based on route
    this.updatePageTitle();
    this.router.events.subscribe(() => {
      this.updatePageTitle();
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.unreadSubscription?.unsubscribe();
  }

  openNotifications(): void {
    this.router.navigate(['/mobile/notifications']);
  }

  updateNavItems(role: UserRole) {
    // Owner/Tenant navigation
    if (role === UserRole.OWNER || role === UserRole.TENANT) {
      this.navItems = [
        { icon: 'home', label: 'Home', route: '/mobile/dashboard' },
        { icon: 'group_add', label: 'Visitors', route: '/mobile/visitors' },
        { icon: 'restaurant', label: 'My Staff', route: '/mobile/my-staff' },
        { icon: 'receipt', label: 'Payments', route: '/mobile/payments' },
        { icon: 'person', label: 'Profile', route: '/mobile/profile' }
      ];
    }
    // Guard navigation
    else if (role === UserRole.GUARD || role === UserRole.SECURITY_STAFF) {
      // Staff tab = cooks/maids for gate approve (Attendance stays on dashboard menu).
      this.navItems = [
        { icon: 'home', label: 'Home', route: '/mobile/guard/dashboard' },
        { icon: 'restaurant', label: 'Staff', route: '/mobile/guard/domestic-staff' },
        { icon: 'group_add', label: 'Visitors', route: '/mobile/guard/visitor-approvals' },
        { icon: 'security', label: 'Patrol', route: '/mobile/guard/patrol' },
        { icon: 'person', label: 'Profile', route: '/mobile/profile' }
      ];
    }
    // Facility Manager / domestic staff — field ops only (no Users / Billing).
    else if (role === UserRole.FACILITY_MANAGER || role === UserRole.DOMESTIC_STAFF) {
      this.navItems = [
        { icon: 'home', label: 'Home', route: '/mobile/staff/dashboard' },
        { icon: 'assignment', label: 'Tasks', route: '/mobile/staff/tasks' },
        { icon: 'qr_code_scanner', label: 'Scan', route: '/mobile/staff/scan' },
        { icon: 'support_agent', label: 'Complaints', route: '/mobile/complaints' },
        { icon: 'person', label: 'Profile', route: '/mobile/profile' }
      ];
    }
    // Accountant — desk role; keep mobile light (no owner billing).
    else if (role === UserRole.ACCOUNTANT) {
      this.navItems = [
        { icon: 'home', label: 'Home', route: '/mobile/staff/dashboard' },
        { icon: 'support_agent', label: 'Complaints', route: '/mobile/complaints' },
        { icon: 'person', label: 'Profile', route: '/mobile/profile' }
      ];
    }
    // Admin navigation
    else if (role === UserRole.SOCIETY_ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.COMMITTEE_MEMBER) {
      this.navItems = [
        { icon: 'home', label: 'Home', route: '/mobile/admin/dashboard' },
        { icon: 'group', label: 'Users', route: '/mobile/user-management' },
        { icon: 'receipt', label: 'Billing', route: '/mobile/payments' },
        { icon: 'support_agent', label: 'Complaints', route: '/mobile/complaints' },
        { icon: 'person', label: 'Profile', route: '/mobile/profile' }
      ];
    }
    // Default navigation
    else {
      this.navItems = [
        { icon: 'home', label: 'Home', route: '/mobile/dashboard' },
        { icon: 'person', label: 'Profile', route: '/mobile/profile' }
      ];
    }
  }


  /** Red badge on Visitors tab = pending approvals for this society (not a demo number). */
  private refreshVisitorNavBadge(user: MobileUser): void {
    const isResident = user.role === UserRole.OWNER || user.role === UserRole.TENANT;
    const visitorsNav = this.navItems.find(i => i.route === '/mobile/visitors');
    if (!isResident || !visitorsNav || !user.societyId) {
      if (visitorsNav) {
        delete visitorsNav.badge;
      }
      return;
    }

    this.visitorApi.listForPortalUser(user).subscribe(rows => {
      const pending = (rows ?? []).filter(v => v.status === 'pending').length;
      if (pending > 0) {
        visitorsNav.badge = pending;
      } else {
        delete visitorsNav.badge;
      }
    });
  }

  updatePageTitle() {
    const route = this.router.url;
    if (route.includes('/mobile/guard/gatepasses')) this.pageTitle = 'Monthly Gatepass';
    else if (route.includes('/mobile/guard/recurring-visitors')) this.pageTitle = 'Daily Help';
    else if (route.includes('/mobile/staff/tasks')) this.pageTitle = 'My Tasks';
    else if (route.includes('/mobile/staff/scan')) this.pageTitle = 'Scan Asset';
    else if (route.includes('/mobile/staff/dashboard')) this.pageTitle = 'Dashboard';
    else if (route.includes('/mobile/my-staff/')) this.pageTitle = 'Staff Details';
    else if (route.includes('/mobile/my-staff')) this.pageTitle = 'My Cook & Staff';
    else if (route.includes('/mobile/guard/domestic-staff/verify')) this.pageTitle = 'Staff Passcode';
    else if (/\/mobile\/guard\/domestic-staff\/[^/]+/.test(route)) this.pageTitle = 'Approve Staff';
    else if (route.includes('/mobile/guard/domestic-staff')) this.pageTitle = 'Cooks & Staff';
    else if (route.includes('/mobile/guard/walk-in')) this.pageTitle = 'Walk-in Entry';
    else if (route.includes('/mobile/guard/scan')) this.pageTitle = 'Scan QR';
    else if (route.includes('/mobile/guard/patrol')) this.pageTitle = 'Patrol';
    else if (route.includes('/mobile/guard/visitor-approvals')) this.pageTitle = 'Visitors';
    else if (route.includes('/mobile/guard/packages')) this.pageTitle = 'Packages';
    else if (route.includes('/mobile/guard/incidents/report')) this.pageTitle = 'Report Incident';
    else if (route.includes('/mobile/guard/incidents')) this.pageTitle = 'Incidents';
    else if (route.includes('/mobile/guard/attendance')) this.pageTitle = 'Attendance';
    else if (route.includes('/mobile/guard/dashboard')) this.pageTitle = 'Dashboard';
    else if (route.includes('dashboard')) this.pageTitle = 'Dashboard';
    else if (route.includes('notifications')) this.pageTitle = 'Notifications';
    else if (route.includes('amenities')) this.pageTitle = 'Amenities';
    else if (route.includes('visitors')) this.pageTitle = 'Visitors';
    else if (route.includes('community')) this.pageTitle = 'Community';
    else if (route.includes('payments')) this.pageTitle = 'Payments';
    else if (route.includes('complaints/add')) this.pageTitle = 'Raise Complaint';
    else if (route.includes('complaints')) this.pageTitle = 'Complaints';
    else if (route.includes('emergency')) this.pageTitle = 'Emergency';
    else if (route.includes('society')) this.pageTitle = 'My Society';
    else if (route.includes('support')) this.pageTitle = 'Help & Support';
    else if (route.includes('profile')) this.pageTitle = 'Profile';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/mobile/auth/login']);
  }
}
