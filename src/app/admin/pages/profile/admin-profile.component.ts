import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserManagementService } from '../../../modules/user-management/services/user-management.service';

/** Logged-in admin user snapshot from login (adminUser or adminSession). */
interface AdminProfileUser {
  id?: string;
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  societyId?: string;
  societyName?: string;
  phone?: string;
}

/**
 * Admin "My Profile" — professional account overview from session + society API.
 */
@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="profile-page">
      <ng-container *ngIf="user; else noUser">
        <!-- Hero banner -->
        <section class="profile-hero">
          <div class="hero-bg"></div>
          <div class="hero-content">
            <div class="avatar-ring">
              <div class="avatar">{{ initials }}</div>
              <span class="status-dot" title="Active session"></span>
            </div>
            <div class="hero-text">
              <h1>{{ user.name || 'Administrator' }}</h1>
              <p class="email">{{ user.email || '—' }}</p>
              <div class="hero-badges">
                <span class="role-pill">{{ formatRole(user.role) }}</span>
                <span class="society-pill" *ngIf="displaySociety">
                  <i class="material-icons">apartment</i>
                  {{ displaySociety }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div class="profile-body">
          <!-- Account details -->
          <section class="panel details-panel">
            <div class="panel-head">
              <h2><i class="material-icons">badge</i> Account Details</h2>
              <span class="panel-sub">Information from your login session</span>
            </div>
            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-icon"><i class="material-icons">person</i></div>
                <div class="detail-body">
                  <span class="label">Full name</span>
                  <span class="value">{{ user.name || '—' }}</span>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-icon"><i class="material-icons">mail</i></div>
                <div class="detail-body">
                  <span class="label">Email address</span>
                  <span class="value">{{ user.email || '—' }}</span>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-icon"><i class="material-icons">phone</i></div>
                <div class="detail-body">
                  <span class="label">Phone</span>
                  <span class="value">{{ user.phone || '—' }}</span>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-icon"><i class="material-icons">admin_panel_settings</i></div>
                <div class="detail-body">
                  <span class="label">Role</span>
                  <span class="value">{{ formatRole(user.role) }}</span>
                </div>
              </div>
              <div class="detail-item">
                <div class="detail-icon"><i class="material-icons">domain</i></div>
                <div class="detail-body">
                  <span class="label">Society</span>
                  <span class="value">{{ displaySociety || '—' }}</span>
                </div>
              </div>
              <div class="detail-item" *ngIf="user.societyId">
                <div class="detail-icon"><i class="material-icons">fingerprint</i></div>
                <div class="detail-body">
                  <span class="label">User ID</span>
                  <span class="value mono">{{ user.id || user.userId || '—' }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Quick actions -->
          <aside class="panel actions-panel">
            <div class="panel-head">
              <h2><i class="material-icons">bolt</i> Quick Actions</h2>
            </div>
            <nav class="action-list">
              <a routerLink="/admin/settings" class="action-row">
                <i class="material-icons">settings</i>
                <div>
                  <strong>Account settings</strong>
                  <span>Notifications, society preferences</span>
                </div>
                <i class="material-icons chevron">chevron_right</i>
              </a>
              <a routerLink="/admin/societies" class="action-row">
                <i class="material-icons">domain_add</i>
                <div>
                  <strong>Society setup</strong>
                  <span>Switch or manage societies</span>
                </div>
                <i class="material-icons chevron">chevron_right</i>
              </a>
              <a routerLink="/admin/users-list" class="action-row">
                <i class="material-icons">people</i>
                <div>
                  <strong>User management</strong>
                  <span>Residents, approvals, flat linking</span>
                </div>
                <i class="material-icons chevron">chevron_right</i>
              </a>
              <button type="button" class="action-row danger" (click)="logout()">
                <i class="material-icons">logout</i>
                <div>
                  <strong>Sign out</strong>
                  <span>End this admin session</span>
                </div>
                <i class="material-icons chevron">chevron_right</i>
              </button>
            </nav>
          </aside>
        </div>
      </ng-container>

      <ng-template #noUser>
        <section class="empty-panel">
          <i class="material-icons">lock</i>
          <h2>Not signed in</h2>
          <p>No profile found in this browser session. Please log in again.</p>
          <a routerLink="/admin/login" class="btn-primary">Go to login</a>
        </section>
      </ng-template>
    </div>
  `,
  styles: [`
    .profile-page {
      max-width: 960px;
      margin: 0 auto;
    }

    .profile-hero {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 45%, #6366f1 100%);
    }

    .hero-content {
      position: relative;
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 32px 28px;
      color: #fff;
      flex-wrap: wrap;
    }

    .avatar-ring {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 3px solid rgba(255, 255, 255, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      backdrop-filter: blur(4px);
    }

    .status-dot {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #22c55e;
      border: 3px solid #2563eb;
    }

    .hero-text h1 {
      margin: 0 0 4px;
      font-size: 1.75rem;
      font-weight: 700;
    }

    .hero-text .email {
      margin: 0 0 12px;
      opacity: 0.9;
      font-size: 0.95rem;
    }

    .hero-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .role-pill {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.22);
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .society-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.2);
      font-size: 0.8rem;
      font-weight: 500;
    }

    .society-pill .material-icons {
      font-size: 16px;
    }

    .profile-body {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 20px;
      align-items: start;
    }

    .panel {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e8ecf1;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
      overflow: hidden;
    }

    .panel-head {
      padding: 18px 20px;
      border-bottom: 1px solid #f0f2f5;
    }

    .panel-head h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .panel-head h2 .material-icons {
      font-size: 20px;
      color: #2563eb;
    }

    .panel-sub {
      display: block;
      margin-top: 4px;
      font-size: 0.8rem;
      color: #64748b;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }

    .detail-item {
      display: flex;
      gap: 14px;
      padding: 18px 20px;
      border-bottom: 1px solid #f4f6f8;
      border-right: 1px solid #f4f6f8;
    }

    .detail-item:nth-child(2n) {
      border-right: none;
    }

    .detail-item:nth-last-child(-n+2) {
      border-bottom: none;
    }

    .detail-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eff6ff;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .detail-icon .material-icons {
      font-size: 20px;
    }

    .detail-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .detail-body .label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }

    .detail-body .value {
      font-size: 0.95rem;
      font-weight: 500;
      color: #1e293b;
      word-break: break-word;
    }

    .detail-body .value.mono {
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
      color: #64748b;
    }

    .action-list {
      display: flex;
      flex-direction: column;
    }

    .action-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      border: none;
      border-bottom: 1px solid #f4f6f8;
      background: #fff;
      text-align: left;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s;
    }

    .action-row:last-child {
      border-bottom: none;
    }

    .action-row:hover {
      background: #f8fafc;
    }

    .action-row > .material-icons:first-child {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #f1f5f9;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .action-row div {
      flex: 1;
      min-width: 0;
    }

    .action-row strong {
      display: block;
      font-size: 0.9rem;
      color: #1e293b;
    }

    .action-row span {
      display: block;
      font-size: 0.78rem;
      color: #64748b;
      margin-top: 2px;
    }

    .action-row .chevron {
      color: #cbd5e1;
      font-size: 22px;
    }

    .action-row.danger > .material-icons:first-child {
      background: #fef2f2;
      color: #dc2626;
    }

    .action-row.danger strong {
      color: #dc2626;
    }

    .empty-panel {
      text-align: center;
      padding: 48px 24px;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e8ecf1;
    }

    .empty-panel .material-icons {
      font-size: 56px;
      color: #cbd5e1;
      margin-bottom: 12px;
    }

    .empty-panel h2 {
      margin: 0 0 8px;
      color: #1e293b;
    }

    .empty-panel p {
      margin: 0 0 20px;
      color: #64748b;
    }

    .btn-primary {
      display: inline-block;
      padding: 12px 24px;
      background: #2563eb;
      color: #fff;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
    }

    @media (max-width: 768px) {
      .profile-body {
        grid-template-columns: 1fr;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }

      .detail-item {
        border-right: none;
      }

      .detail-item:nth-last-child(-n+2) {
        border-bottom: 1px solid #f4f6f8;
      }

      .detail-item:last-child {
        border-bottom: none;
      }
    }
  `]
})
export class AdminProfileComponent implements OnInit {
  user: AdminProfileUser | null = null;
  displaySociety = '';
  initials = 'AD';

  constructor(
    private router: Router,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.user = this.loadUser();
    if (this.user) {
      this.initials = this.buildInitials(this.user.name || this.user.email || 'Admin');
      this.displaySociety = this.user.societyName || '';
      this.resolveSocietyLabel();
    }
  }

  formatRole(role?: string): string {
    if (!role) {
      return 'Administrator';
    }
    return role
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  logout(): void {
    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('societyId');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('societyId');
    this.router.navigate(['/admin/login']);
  }

  private resolveSocietyLabel(): void {
    if (!this.user?.societyId) {
      return;
    }
    if (this.displaySociety && !this.looksLikeUuid(this.displaySociety)) {
      return;
    }
    this.userService.resolveSocietyName(this.user.societyId).subscribe(name => {
      if (name && name !== '—') {
        this.displaySociety = name;
      } else if (!this.displaySociety) {
        this.displaySociety = this.user?.societyId ?? '';
      }
    });
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f-]{30,}$/i.test(value);
  }

  private buildInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private loadUser(): AdminProfileUser | null {
    const rawUser =
      sessionStorage.getItem('adminUser') ||
      localStorage.getItem('adminUser');
    if (rawUser) {
      try {
        return JSON.parse(rawUser) as AdminProfileUser;
      } catch {
        /* fall through */
      }
    }
    const rawSession =
      sessionStorage.getItem('adminSession') ||
      localStorage.getItem('adminSession');
    if (rawSession) {
      try {
        const s = JSON.parse(rawSession) as AdminProfileUser;
        return {
          id: s.userId ?? s.id,
          name: s.name,
          email: s.email,
          role: s.role,
          societyId: s.societyId,
          societyName: s.societyName,
          phone: s.phone
        };
      } catch {
        return null;
      }
    }
    return null;
  }
}
