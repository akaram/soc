import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { MobileAuthService } from '../../services/mobile-auth.service';

interface SocietyContact {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
}

interface QuickHelpLink {
  icon: string;
  title: string;
  subtitle: string;
  route: string;
}

/**
 * Help & Support — society office contact and quick help links for residents.
 */
@Component({
  selector: 'app-mobile-support',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="page-inner">
        <p class="intro">Need help? Contact your society office or use the options below.</p>

        <div class="card society-card" *ngIf="loading">
          <p class="muted">Loading contact details…</p>
        </div>

        <div class="card society-card" *ngIf="!loading && society">
          <h3>{{ society.name }}</h3>
          <p class="addr" *ngIf="fullAddress">{{ fullAddress }}</p>

          <div class="contact-row" *ngIf="society.phone">
            <i class="material-icons">phone</i>
            <div>
              <span class="label">Society office</span>
              <a [href]="'tel:' + dialPhone(society.phone)">{{ society.phone }}</a>
            </div>
            <a class="action-btn" [href]="'tel:' + dialPhone(society.phone)">Call</a>
          </div>

          <div class="contact-row" *ngIf="society.email">
            <i class="material-icons">email</i>
            <div>
              <span class="label">Email</span>
              <a [href]="'mailto:' + society.email">{{ society.email }}</a>
            </div>
            <a class="action-btn outline" [href]="'mailto:' + society.email">Email</a>
          </div>

          <p class="muted small" *ngIf="!society.phone && !society.email">
            Society phone/email not set yet. Ask admin to update society details, or use Helpdesk below.
          </p>
        </div>

        <h4 class="section-title">Quick help</h4>
        <div class="links">
          <button
            type="button"
            class="link-card"
            *ngFor="let link of quickHelpLinks"
            (click)="openQuickHelp(link.route)"
          >
            <i class="material-icons">{{ link.icon }}</i>
            <div>
              <strong>{{ link.title }}</strong>
              <span>{{ link.subtitle }}</span>
            </div>
            <i class="material-icons chev">chevron_right</i>
          </button>
        </div>

        <h4 class="section-title">App support</h4>
        <div class="card app-support">
          <div class="contact-row">
            <i class="material-icons">support_agent</i>
            <div>
              <span class="label">Technical help</span>
              <a [href]="'mailto:' + appSupportEmail">{{ appSupportEmail }}</a>
            </div>
          </div>
          <div class="contact-row">
            <i class="material-icons">schedule</i>
            <div>
              <span class="label">Hours</span>
              <span class="value">Mon–Sat, 9 AM – 6 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100%;
        background: #f5f7fa;
        padding: 16px;
        box-sizing: border-box;
      }
      .page-inner {
        max-width: 480px;
        margin: 0 auto;
      }
      .intro {
        margin: 0 0 16px;
        font-size: 14px;
        line-height: 1.5;
        color: #64748b;
        text-align: center;
      }
      .card {
        background: #fff;
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        margin-bottom: 16px;
      }
      .society-card h3 {
        margin: 0 0 8px;
        font-size: 18px;
        color: #0f172a;
      }
      .addr {
        margin: 0 0 14px;
        font-size: 13px;
        color: #64748b;
        line-height: 1.4;
      }
      .contact-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-top: 1px solid #f1f5f9;
      }
      .contact-row:first-of-type {
        border-top: none;
      }
      .contact-row > .material-icons {
        color: #667eea;
      }
      .contact-row > div {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .label {
        font-size: 12px;
        color: #94a3b8;
      }
      .contact-row a {
        color: #2563eb;
        text-decoration: none;
        font-size: 15px;
        word-break: break-all;
      }
      .value {
        font-size: 15px;
        color: #0f172a;
      }
      .action-btn {
        padding: 8px 14px;
        border-radius: 10px;
        background: #667eea;
        color: #fff;
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
      }
      .action-btn.outline {
        background: #eef2ff;
        color: #4338ca;
      }
      .section-title {
        margin: 8px 0 10px;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #94a3b8;
      }
      .links {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 16px;
      }
      .link-card {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #fff;
        border: none;
        border-radius: 14px;
        padding: 14px 16px;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        width: 100%;
        text-align: left;
        cursor: pointer;
        font: inherit;
        -webkit-tap-highlight-color: transparent;
      }
      .link-card:active {
        background: #f8fafc;
        transform: scale(0.99);
      }
      .link-card .material-icons {
        color: #667eea;
      }
      .link-card div {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .link-card strong {
        font-size: 15px;
        color: #0f172a;
      }
      .link-card span {
        font-size: 12px;
        color: #64748b;
      }
      .chev {
        color: #cbd5e1 !important;
      }
      .muted {
        color: #64748b;
        margin: 0;
      }
      .muted.small {
        font-size: 13px;
        line-height: 1.4;
        margin-top: 8px;
      }
    `
  ]
})
export class SupportComponent implements OnInit {
  readonly appSupportEmail = 'support@societyapp.local';

  /** Quick help destinations — use programmatic navigation for reliable mobile taps */
  readonly quickHelpLinks: QuickHelpLink[] = [
    {
      icon: 'report_problem',
      title: 'Raise a complaint',
      subtitle: 'Maintenance, security, parking, etc.',
      route: '/mobile/complaints/add'
    },
    {
      icon: 'list_alt',
      title: 'My complaints',
      subtitle: 'Track status of your requests',
      route: '/mobile/complaints'
    },
    {
      icon: 'emergency',
      title: 'Emergency & SOS',
      subtitle: 'Security, police, ambulance',
      route: '/mobile/emergency'
    },
    {
      icon: 'campaign',
      title: 'Society announcements',
      subtitle: 'Notices from management',
      route: '/mobile/society'
    }
  ];

  loading = false;
  society: SocietyContact | null = null;

  constructor(
    private auth: MobileAuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.societyId) {
      this.society = { name: user?.societyName || 'Your society' };
      return;
    }
    this.loading = true;
    this.http
      .get<Record<string, unknown>>(`/societies/${encodeURIComponent(user.societyId)}`)
      .pipe(catchError(() => of(null)))
      .subscribe(raw => {
        this.loading = false;
        if (raw) {
          this.society = {
            name: String(raw['name'] ?? user.societyName ?? 'Your society'),
            phone: raw['phone'] != null ? String(raw['phone']) : undefined,
            email: raw['email'] != null ? String(raw['email']) : undefined,
            address: raw['address'] != null ? String(raw['address']) : undefined,
            city: raw['city'] != null ? String(raw['city']) : undefined
          };
        } else {
          this.society = { name: user.societyName || 'Your society' };
        }
      });
  }

  /** Navigate to a quick-help screen (button avoids dead routerLink on some mobile views). */
  openQuickHelp(route: string): void {
    this.router.navigateByUrl(route);
  }

  get fullAddress(): string {
    if (!this.society) return '';
    return [this.society.address, this.society.city].filter(Boolean).join(', ');
  }

  dialPhone(phone: string): string {
    return phone.replace(/\s+/g, '');
  }
}
