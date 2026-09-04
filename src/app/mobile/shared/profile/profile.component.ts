import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MobileAuthService, MobileUser, UserRole } from '../../services/mobile-auth.service';
import { VisitorApiService } from '../../features/visitors/visitor-api.service';
import { BillsApiService } from '../../../core/services/bills-api.service';
import { MobileNotificationsService } from '../../services/mobile-notifications.service';
import { AmenityApiService } from '../../features/amenities/amenity-api.service';
import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';
import { ToastService } from '../../../core/services/toast.service';

interface ProfileMenuItem {
  icon: string;
  label: string;
  route?: string;
  action?: string;
  badge?: string;
  divider?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ProfileAvatarComponent],
  template: `
    <div class="profile-page">
      <!-- Header -->
      <div class="profile-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Profile</h2>
        <button class="btn-edit" (click)="editProfile()">
          <i class="material-icons">edit</i>
        </button>
      </div>

      <!-- Profile Card -->
      <div class="profile-card">
        <app-profile-avatar
          [photoUrl]="user?.profilePhoto"
          [name]="user?.name || 'User'"
          [role]="user?.role"
          size="lg"
          [editable]="true"
          [preferCamera]="isGuard"
          [fallbackGradient]="guardAvatarGradient"
          (photoChange)="onProfilePhotoChange($event)"
          (uploadError)="onPhotoUploadError($event)"
        ></app-profile-avatar>
        <h3>{{ user?.name }}</h3>
        <p class="role-badge">{{ getRoleLabel() }}</p>
        <div class="profile-details">
          <div class="detail-item" *ngIf="user?.flatNumber">
            <i class="material-icons">home</i>
            <span>{{ user?.flatNumber }}, {{ user?.tower }}</span>
          </div>
          <div class="detail-item" *ngIf="user?.employeeId">
            <i class="material-icons">badge</i>
            <span>ID: {{ user?.employeeId }}</span>
          </div>
          <div class="detail-item">
            <i class="material-icons">phone</i>
            <span>{{ user?.phone }}</span>
          </div>
          <div class="detail-item">
            <i class="material-icons">email</i>
            <span>{{ user?.email }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Stats (for residents) -->
      <div class="quick-stats" *ngIf="isResident">
        <div class="stat-item stat-link" routerLink="/mobile/payments/pending">
          <i class="material-icons">account_balance_wallet</i>
          <div class="stat-content">
            <span class="stat-value">{{ outstandingLabel }}</span>
            <span class="stat-label">Outstanding</span>
          </div>
        </div>
        <div class="stat-item stat-link" routerLink="/mobile/amenities/my-bookings">
          <i class="material-icons">event_available</i>
          <div class="stat-content">
            <span class="stat-value">{{ bookingsCount }}</span>
            <span class="stat-label">Bookings</span>
          </div>
        </div>
        <div class="stat-item stat-link" routerLink="/mobile/visitors">
          <i class="material-icons">group</i>
          <div class="stat-content">
            <span class="stat-value">{{ visitorsCount }}</span>
            <span class="stat-label">Visitors</span>
          </div>
        </div>
      </div>

      <!-- Menu Items -->
      <div class="profile-menu">
        <div *ngFor="let item of menuItems" class="menu-section">
          <a *ngIf="!item.divider && !item.action" 
             [routerLink]="item.route"
             class="menu-item">
            <i class="material-icons">{{ item.icon }}</i>
            <span>{{ item.label }}</span>
            <span class="menu-badge" *ngIf="item.badge">{{ item.badge }}</span>
            <i class="material-icons arrow">chevron_right</i>
          </a>
          
          <button *ngIf="!item.divider && item.action"
                  class="menu-item"
                  (click)="handleAction(item.action)">
            <i class="material-icons">{{ item.icon }}</i>
            <span>{{ item.label }}</span>
            <span class="menu-badge" *ngIf="item.badge">{{ item.badge }}</span>
            <i class="material-icons arrow">chevron_right</i>
          </button>

          <div *ngIf="item.divider" class="menu-divider"></div>
        </div>
      </div>

      <!-- App Info -->
      <div class="app-info">
        <p>Society Management App</p>
        <p class="version">Version 1.0.0</p>
        <p class="copyright">© 2024 All Rights Reserved</p>
      </div>

      <!-- Logout Button -->
      <div class="logout-section">
        <button class="btn-logout" (click)="confirmLogout()">
          <i class="material-icons">logout</i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      min-height: 100vh;
      background: #f5f7fa;
      padding-bottom: 100px;
    }

    .profile-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .profile-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
      flex: 1;
      text-align: center;
    }

    .btn-back, .btn-edit {
      background: none;
      border: none;
      color: #2c3e50;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .btn-edit {
      color: #667eea;
    }

    .profile-card {
      background: white;
      margin: 16px;
      padding: 32px 24px;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .profile-card app-profile-avatar {
      display: block;
      margin: 0 auto 16px;
      width: fit-content;
    }

    .profile-card h3 {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 600;
      color: #2c3e50;
    }

    .role-badge {
      display: inline-block;
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
      padding: 6px 16px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .profile-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #666;
      font-size: 14px;
    }

    .detail-item .material-icons {
      font-size: 20px;
      color: #667eea;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 0 16px 16px;
    }

    .stat-item {
      background: white;
      padding: 16px 12px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .stat-item.stat-link {
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }

    .stat-item .material-icons {
      font-size: 28px;
      color: #667eea;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-label {
      font-size: 11px;
      color: #999;
      margin-top: 2px;
    }

    .profile-menu {
      margin: 0 16px;
    }

    .menu-section {
      background: white;
      margin-bottom: 8px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 16px;
      background: none;
      border: none;
      width: 100%;
      cursor: pointer;
      text-decoration: none;
      color: #2c3e50;
      transition: background 0.2s;
      gap: 12px;
    }

    .menu-item:active {
      background: #f5f5f5;
    }

    .menu-item .material-icons {
      font-size: 24px;
      color: #667eea;
    }

    .menu-item span {
      flex: 1;
      text-align: left;
      font-size: 15px;
      font-weight: 500;
    }

    .menu-item .arrow {
      color: #ccc;
      font-size: 20px;
    }

    .menu-badge {
      background: #ff4757;
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px !important;
      font-weight: 600;
    }

    .menu-divider {
      height: 1px;
      background: #f0f0f0;
    }

    .app-info {
      text-align: center;
      padding: 24px;
      color: #999;
    }

    .app-info p {
      margin: 4px 0;
      font-size: 14px;
    }

    .version {
      font-size: 12px !important;
    }

    .copyright {
      font-size: 12px !important;
      opacity: 0.7;
    }

    .logout-section {
      padding: 0 16px 24px;
    }

    .btn-logout {
      width: 100%;
      padding: 16px;
      background: white;
      color: #ff6b6b;
      border: 2px solid #ff6b6b;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .btn-logout:active {
      background: #ff6b6b;
      color: white;
    }

    .btn-logout .material-icons {
      font-size: 24px;
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: MobileUser | null = null;
  isResident = false;
  isGuard = false;
  readonly guardAvatarGradient = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
  notificationCount = 0;
  outstandingLabel = '₹0';
  bookingsCount = 0;
  visitorsCount = 0;
  statsLoading = false;

  menuItems: ProfileMenuItem[] = [
    { icon: 'person', label: 'Edit Profile', route: '/mobile/profile/edit' },
    { icon: 'security', label: 'Privacy & Security', route: '/mobile/settings/privacy' },
    { divider: true, icon: '', label: '' },
    { icon: 'family_restroom', label: 'Family Members', route: '/mobile/profile/family' },
    { icon: 'pets', label: 'My Pets', route: '/mobile/profile/pets' },
    { icon: 'directions_car', label: 'My Vehicles', route: '/mobile/profile/vehicles' },
    { divider: true, icon: '', label: '' },
    { icon: 'payment', label: 'Payment Methods', route: '/mobile/payment-methods' },
    { icon: 'receipt_long', label: 'Billing History', route: '/mobile/billing-history' },
    { divider: true, icon: '', label: '' },
    // Badge is intentionally dynamic; until wired, keep it empty to avoid misleading hardcoded values.
    { icon: 'notifications', label: 'Notifications', route: '/mobile/notifications' },
    { icon: 'language', label: 'Language', action: 'changeLanguage' },
    { icon: 'help', label: 'Help & Support', route: '/mobile/support' },
    { icon: 'info', label: 'About', route: '/mobile/about' }
  ];

  constructor(
    private authService: MobileAuthService,
    private router: Router,
    private visitorApi: VisitorApiService,
    private billsApi: BillsApiService,
    private notificationsService: MobileNotificationsService,
    private amenityApi: AmenityApiService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.notificationsService.unreadCount$.subscribe(count => {
      this.notificationCount = count;
      this.setNotificationsBadge(count);
    });

    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      this.isResident = this.authService.isResident();
      this.isGuard = user?.role === UserRole.GUARD || user?.role === UserRole.SECURITY_STAFF;

      if (user) {
        this.notificationsService.refresh();
      }
      
      // Filter menu items based on role
      if (!this.isResident) {
        this.menuItems = this.menuItems.filter(item =>
          ![
            'Family Members',
            'My Pets',
            'My Vehicles',
            'Payment Methods',
            'Billing History'
          ].includes(item.label)
        );
      }

      if (user && this.isResident) {
        this.loadProfileStats(user);
      } else {
        this.outstandingLabel = '₹0';
        this.bookingsCount = 0;
        this.visitorsCount = 0;
      }
    });
  }

  /** Load outstanding bills, visitor count, and amenity bookings from API / local POC storage. */
  private loadProfileStats(user: MobileUser): void {
    this.statsLoading = true;
    const role = String(user.role || '').toUpperCase();
    const isResident = role === 'OWNER' || role === 'TENANT';

    forkJoin({
      // Facility Manager / staff: no flat owner bills — skip broken /bills/owner calls.
      bills: isResident
        ? this.billsApi.listOutstanding().pipe(catchError(() => of([])))
        : of([]),
      visitors: isResident
        ? this.visitorApi.listByHost(user.id).pipe(catchError(() => of([])))
        : this.visitorApi.listForPortalUser(user).pipe(catchError(() => of([]))),
      bookings: this.amenityApi.countUpcoming(user.id)
    }).subscribe({
      next: ({ bills, visitors, bookings }) => {
        const total = (bills ?? []).reduce(
          (sum, b) => sum + (b.pendingAmount ?? b.totalAmount ?? 0),
          0
        );
        this.outstandingLabel =
          total > 0 ? `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';
        this.visitorsCount = (visitors ?? []).length;
        this.bookingsCount = bookings;
        this.statsLoading = false;
      },
      error: () => {
        this.outstandingLabel = '₹0';
        this.visitorsCount = 0;
        this.bookingsCount = 0;
        this.statsLoading = false;
      }
    });
  }

  /**
   * Update the Notifications menu badge.
   * This is centralized so it can be wired to a real API later.
   */
  private setNotificationsBadge(count: number): void {
    const badge = count > 0 ? String(count) : undefined;
    this.menuItems = this.menuItems.map(i =>
      i.label === 'Notifications' ? { ...i, badge } : i
    );
  }

  getRoleLabel(): string {
    const labels: Record<string, string> = {
      'SUPER_ADMIN': 'Super Administrator',
      'SOCIETY_ADMIN': 'Society Admin',
      'GUARD': 'Security Guard',
      'SECURITY_STAFF': 'Security Staff',
      'FACILITY_MANAGER': 'Facility Manager',
      'ACCOUNTANT': 'Accountant',
      'COMMITTEE_MEMBER': 'Committee Member',
      'OWNER': 'Owner',
      'TENANT': 'Tenant',
      'DOMESTIC_STAFF': 'Domestic Staff'
    };
    return this.user?.role ? labels[this.user.role] : 'User';
  }

  editProfile() {
    this.router.navigate(['/mobile/profile/edit']);
  }

  handleAction(action: string) {
    switch (action) {
      case 'changeLanguage':
        this.showLanguageSelector();
        break;
    }
  }

  showLanguageSelector() {
    // Implement language selector
    console.log('Show language selector');
  }

  /** Save captured/selected profile photo (guard ID photo or resident avatar). */
  onProfilePhotoChange(dataUrl: string): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return;
    }
    this.authService.persistProfilePhoto(user.id, dataUrl, {
      onSuccess: () => this.toast.success(this.isGuard ? 'Guard photo saved.' : 'Profile photo updated.'),
      onError: () => this.toast.warning('Photo saved on device. Server sync failed — try again when online.')
    });
  }

  onPhotoUploadError(message: string): void {
    this.toast.warning(message);
  }

  confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      // Mobile auth routes live under /mobile/auth/...
      this.router.navigate(['/mobile/auth/login']);
    }
  }

  goBack() {
    this.router.navigate(['/mobile']);
  }
}
