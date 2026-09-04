import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, filter } from 'rxjs';
import { AdminHeaderCountsService } from '../../services/admin-header-counts.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LocaleService } from '../../../core/i18n/locale.service';
import { AppLogoComponent } from '../../../core/components/app-logo.component';
import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';
import { isValidProfilePhoto } from '../../../core/utils/profile-photo.util';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, AppLogoComponent, ProfileAvatarComponent],
  template: `
    <header class="admin-header" [class.sidebar-collapsed]="!sidebarOpen">
      <div class="header-left">
        <button
          type="button"
          class="menu-toggle"
          (click)="toggleSidebar.emit()"
          [title]="sidebarOpen ? ('header.hideMenu' | t) : ('header.showMenu' | t)"
          [attr.aria-label]="sidebarOpen ? ('header.hideMenu' | t) : ('header.showMenu' | t)"
          [attr.aria-expanded]="sidebarOpen">
          <i class="material-icons">{{ sidebarOpen ? 'menu_open' : 'menu' }}</i>
        </button>
        <div class="logo">
          <app-logo size="sm"></app-logo>
        </div>
      </div>
      
      <div class="header-center">
        <div class="search-bar">
          <i class="material-icons">search</i>
          <input type="text" [placeholder]="'header.searchPlaceholder' | t">
        </div>
      </div>
      
      <div class="header-right">
        <button class="header-btn" [routerLink]="['/mobile/auth/login']" [title]="'header.switchMobile' | t">
          <i class="material-icons">phone_android</i>
        </button>
        
        <button class="header-btn" [routerLink]="['/admin/complaints']" [title]="'header.openComplaints' | t">
          <i class="material-icons">notifications</i>
          <span class="badge" *ngIf="notificationCount > 0">{{ formatBadge(notificationCount) }}</span>
        </button>
        
        <button class="header-btn" [routerLink]="['/admin/users-list']" [title]="'header.pendingApprovals' | t">
          <i class="material-icons">mail</i>
          <span class="badge" *ngIf="messageCount > 0">{{ formatBadge(messageCount) }}</span>
        </button>
        
        <!-- User Profile -->
        <div class="user-menu">
          <button class="user-btn" (click)="showUserMenu = !showUserMenu">
            <app-profile-avatar
              class="header-profile-avatar"
              [photoUrl]="profilePhoto"
              [name]="displayName"
              size="sm"
              fallbackGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            ></app-profile-avatar>
            <div class="user-info">
              <span class="user-name">{{ displayName }}</span>
              <span class="user-role">{{ displayRole }}</span>
            </div>
            <i class="material-icons">arrow_drop_down</i>
          </button>
          
          <div class="dropdown-menu" *ngIf="showUserMenu">
            <a [routerLink]="['/admin/profile']" class="dropdown-item" (click)="showUserMenu = false">
              <i class="material-icons">person</i>
              <span>{{ 'header.myProfile' | t }}</span>
            </a>
            <a [routerLink]="['/admin/settings']" class="dropdown-item">
              <i class="material-icons">settings</i>
              <span>{{ 'header.settings' | t }}</span>
            </a>
            <div class="dropdown-divider"></div>
            <a (click)="logout(); $event.preventDefault()" class="dropdown-item">
              <i class="material-icons">logout</i>
              <span>{{ 'header.logout' | t }}</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .admin-header {
      height: 64px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      padding: 0 20px;
      position: fixed;
      top: 0;
      left: 260px;
      right: 0;
      z-index: 100;
      transition: left 0.3s ease;
    }

    .admin-header.sidebar-collapsed {
      left: 0;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .menu-toggle {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #2c3e50;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      transition: background 0.2s, border-color 0.2s;
    }

    .menu-toggle:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }
    
    .menu-toggle .material-icons {
      font-size: 22px;
    }
    
    .logo {
      display: flex;
      align-items: center;
    }
    
    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
      padding: 0 40px;
    }
    
    .search-bar {
      max-width: 600px;
      width: 100%;
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .search-bar .material-icons {
      position: absolute;
      left: 15px;
      color: #95a5a6;
      font-size: 20px;
    }
    
    .search-bar input {
      width: 100%;
      padding: 10px 15px 10px 45px;
      border: 2px solid #ecf0f1;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s;
    }
    
    .search-bar input:focus {
      outline: none;
      border-color: #3498db;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .header-btn {
      position: relative;
      background: transparent;
      border: none;
      color: #2c3e50;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background 0.3s;
    }
    
    .header-btn:hover {
      background: #f8f9fa;
    }
    
    .header-btn .material-icons {
      font-size: 22px;
    }
    
    .header-btn .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #e74c3c;
      color: white;
      font-size: 10px;
      padding: 2px 5px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }
    
    .user-menu {
      position: relative;
    }
    
    .user-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 8px;
      transition: background 0.3s;
    }
    
    .user-btn:hover {
      background: #f8f9fa;
    }

    .header-profile-avatar {
      flex-shrink: 0;
    }

    .header-profile-avatar ::ng-deep .profile-avatar {
      width: 40px;
      height: 40px;
    }

    .header-profile-avatar ::ng-deep .avatar-photo,
    .header-profile-avatar ::ng-deep .avatar-fallback {
      border-width: 2px;
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }
    
    .user-name {
      font-weight: 600;
      font-size: 14px;
      color: #2c3e50;
    }
    
    .user-role {
      font-size: 11px;
      color: #95a5a6;
    }
    
    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 200px;
      z-index: 1000;
    }
    
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: #2c3e50;
      text-decoration: none;
      transition: background 0.2s;
      cursor: pointer;
    }
    
    .dropdown-item:first-child {
      border-radius: 8px 8px 0 0;
    }
    
    .dropdown-item:last-child {
      border-radius: 0 0 8px 8px;
    }
    
    .dropdown-item:hover {
      background: #f8f9fa;
    }
    
    .dropdown-item .material-icons {
      font-size: 20px;
      color: #95a5a6;
    }
    
    .dropdown-divider {
      height: 1px;
      background: #ecf0f1;
      margin: 4px 0;
    }
    
    @media (max-width: 768px) {
      .admin-header,
      .admin-header.sidebar-collapsed {
        left: 0;
      }
      
      .search-bar {
        display: none;
      }
      
      .user-info {
        display: none;
      }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  /** Whether the left navigation panel is visible. */
  @Input() sidebarOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();
  
  showUserMenu = false;
  notificationCount = 0;
  messageCount = 0;
  displayName = 'Admin User';
  displayRole = 'Administrator';
  profilePhoto?: string;
  private countsSub?: Subscription;
  private navSub?: Subscription;
  private localeSub?: Subscription;

  constructor(
    private router: Router,
    private http: HttpClient,
    private headerCounts: AdminHeaderCountsService,
    private locale: LocaleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLoggedInUser();
    this.headerCounts.refresh();
    this.countsSub = this.headerCounts.notificationCount$.subscribe(n => {
      this.notificationCount = n;
    });
    this.countsSub.add(this.headerCounts.messageCount$.subscribe(n => {
      this.messageCount = n;
    }));
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.headerCounts.refresh();
        this.loadLoggedInUser();
      });
    this.localeSub = this.locale.languageChanged$.subscribe(() => this.cdr.markForCheck());
  }

  /** Read admin session and resolve a valid photo or initials fallback via profile-avatar. */
  private loadLoggedInUser(): void {
    const rawUser =
      sessionStorage.getItem('adminUser') ?? localStorage.getItem('adminUser');
    const rawSession =
      sessionStorage.getItem('adminSession') ?? localStorage.getItem('adminSession');

    let name = '';
    let role = '';
    let userId = '';
    let photo: string | undefined;

    if (rawUser) {
      try {
        const u = JSON.parse(rawUser) as {
          id?: string;
          userId?: string;
          name?: string;
          role?: string;
          profilePhoto?: string;
          profileImage?: string;
        };
        name = u.name?.trim() ?? '';
        role = u.role?.trim() ?? '';
        userId = u.id ?? u.userId ?? '';
        photo = u.profilePhoto ?? u.profileImage;
      } catch {
        /* ignore */
      }
    }

    if (rawSession) {
      try {
        const s = JSON.parse(rawSession) as {
          userId?: string;
          name?: string;
          role?: string;
          profilePhoto?: string;
        };
        if (!name) name = s.name?.trim() ?? '';
        if (!role) role = s.role?.trim() ?? '';
        if (!userId) userId = s.userId ?? '';
        if (!photo) photo = s.profilePhoto;
      } catch {
        /* ignore */
      }
    }

    if (userId) {
      try {
        const persisted = localStorage.getItem(`poc:profilePhoto:${userId}`);
        if (isValidProfilePhoto(persisted)) {
          photo = persisted!.trim();
        }
      } catch {
        /* ignore */
      }
    }

    this.displayName = name || this.locale.t('header.adminUser') || 'Admin User';
    this.displayRole = this.formatRoleLabel(role) || this.locale.t('header.administrator') || 'Administrator';
    this.profilePhoto = isValidProfilePhoto(photo) ? photo!.trim() : undefined;
    this.cdr.markForCheck();
  }

  /** Human-readable role for the header subtitle. */
  private formatRoleLabel(role: string): string {
    if (!role) return '';
    const map: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      SOCIETY_ADMIN: 'Society Admin',
      ADMIN: 'Administrator',
      SECURITY_GUARD: 'Security Guard',
      FACILITY_MANAGER: 'Facility Manager',
      ACCOUNTANT: 'Accountant'
    };
    return map[role.toUpperCase()] ?? role.replace(/_/g, ' ');
  }

  ngOnDestroy(): void {
    this.countsSub?.unsubscribe();
    this.navSub?.unsubscribe();
    this.localeSub?.unsubscribe();
  }

  /** Cap badge display at 99+. */
  formatBadge(count: number): string {
    return count > 99 ? '99+' : String(count);
  }
  
  logout() {
    // Close the menu
    this.showUserMenu = false;

    // Get auth token for API logout call
    const authToken =
      sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

    // Call logout API if token exists
    if (authToken) {
      this.http.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).subscribe({
        next: () => {
          console.log('Logged out successfully from server');
          this.clearSession();
        },
        error: (err) => {
          console.error('Logout API error:', err);
          // Still clear local session even if API call fails
          this.clearSession();
        }
      });
    } else {
      // No token, just clear local session
      this.clearSession();
    }
  }

  private clearSession() {
    // Clear all admin session data
    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminUser');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminAuthToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('societyId');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('adminAuthToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('societyId');

    // Redirect to admin login page
    this.router.navigate(['/admin/login']);
  }
}
