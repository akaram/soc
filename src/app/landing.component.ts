import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ADMIN_NAV_SECTIONS,
  AdminNavSection,
  GATE_SECURITY_FEATURES
} from './core/config/admin-navigation.config';
import {
  adminNavLabel,
  flattenAdminNav,
  getNavSectionFilters,
  filterFlatNav,
  countNavItems,
  getNavItemDescription,
  FlatNavItem
} from './core/config/admin-nav-labels';
import { AppLogoComponent } from './core/components/app-logo.component';

interface PillarFeature {
  icon: string;
  title: string;
  description: string;
}

interface PillarHighlight {
  icon: string;
  title: string;
  subtitle: string;
}

interface FeaturePillar {
  anchor: string;
  icon: string;
  title: string;
  valueCopy: string;
  moduleCount: string;
  features: PillarFeature[];
  highlights: PillarHighlight[];
}

interface AiFeature {
  icon: string;
  title: string;
  description: string;
  bullets: string[];
}

interface ProductStat {
  value: string;
  label: string;
  detail: string;
}

interface Differentiator {
  icon: string;
  title: string;
  description: string;
}

interface PlatformSurface {
  icon: string;
  title: string;
  subtitle: string;
  capabilities: string[];
  route: string;
  ctaLabel: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AppLogoComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
  heroEmail = '';
  activePillar = 0;
  activeModuleSection = 'all';
  mobileMenuOpen = false;

  /** Same navigation tree as the live admin sidebar */
  readonly adminNavSections: AdminNavSection[] = ADMIN_NAV_SECTIONS;
  readonly gateSecurityFeatures = GATE_SECURITY_FEATURES;
  readonly flatNavItems: FlatNavItem[] = flattenAdminNav(ADMIN_NAV_SECTIONS);
  readonly navSectionFilters = getNavSectionFilters(ADMIN_NAV_SECTIONS);
  readonly navLabel = adminNavLabel;

  productStats: ProductStat[] = [
    { value: String(countNavItems(ADMIN_NAV_SECTIONS)), label: 'Admin Nav Items', detail: 'Mirrors live sidebar' },
    { value: '11', label: 'Gate Security Modules', detail: 'ANPR, FR, RFID, IVR & more' },
    { value: '300+', label: 'Built-in Features', detail: 'Across admin & mobile' },
    { value: '11', label: 'Mobile User Roles', detail: 'Owner to guard to accountant' },
    { value: '30+', label: 'Financial Reports', detail: 'GST, TDS & audit-ready' },
    { value: '12', label: 'Billing Workflows', detail: 'Maintenance to metered utilities' }
  ];

  pillars: FeaturePillar[] = [
    {
      anchor: 'security',
      icon: 'shield',
      title: 'Elite Security & Access Control',
      moduleCount: adminNavLabel('section.accessSecurity'),
      valueCopy:
        'The same modules you see in the admin sidebar—User Management, Visitor Management, Gate Security, Hardware Integration, Guard Staff, and Smart Locks—powered by facial recognition, ANPR, WebRTC video calling, and QR/NFC patrol.',
      features: [
        { icon: 'people', title: 'User Management', description: 'Multi-step registration, family/pet/vehicle profiles, bulk Excel import' },
        { icon: 'group_add', title: 'Visitor Management', description: 'Pre-invite, recurring passes, school bus GPS tracking' },
        { icon: 'face', title: 'Facial Recognition', description: 'Register, verify, and manage biometric profiles at the gate' },
        { icon: 'camera_alt', title: 'ANPR', description: 'Automatic Number Plate Recognition with vehicle registry' },
        { icon: 'videocam', title: 'Video Calling', description: 'WebRTC live video between residents and guards' },
        { icon: 'settings_input_antenna', title: 'Hardware Integration', description: 'RFID readers, biometrics, boom barriers, access control' },
        { icon: 'shield', title: 'Guard Patrolling System', description: 'QR/NFC routes, missed patrol alerts, incident reports' },
        { icon: 'lock', title: 'Smart Locks', description: 'Digital door locks synced with access control' }
      ],
      highlights: GATE_SECURITY_FEATURES.slice(0, 5).map(f => ({
        icon: f.icon,
        title: f.title,
        subtitle: f.description
      }))
    },
    {
      anchor: 'financials',
      icon: 'account_balance',
      title: 'Automated Financials & Budgeting',
      moduleCount: adminNavLabel('section.financial'),
      valueCopy:
        'Billing, Payments, Accounting, and Budget Management—the four FINANCIAL sidebar modules—with GST-compliant invoices, NEFT auto-reconciliation, GSTR-1/3B, and Tally export.',
      features: [
        { icon: 'receipt_long', title: 'Billing', description: '12 workflows: maintenance, utilities, GST invoices, penalties' },
        { icon: 'payment', title: 'Payments', description: 'UPI, cards, NEFT auto-match, auto-pay, installments' },
        { icon: 'account_balance', title: 'Accounting', description: 'Balance sheet, P&L, defaulters, petty cash, member statements' },
        { icon: 'pie_chart', title: 'Budget Management', description: 'Department allocation, variance reports, over-budget alerts' }
      ],
      highlights: [
        { icon: 'receipt', title: 'GST-Compliant Invoicing', subtitle: 'CGST/SGST/IGST with e-way bill support' },
        { icon: 'sync', title: 'NEFT Auto-Reconciliation', subtitle: 'Bank transfers matched to invoices automatically' },
        { icon: 'assessment', title: '30+ Financial Reports', subtitle: 'Audit-ready trial balance & ledgers' }
      ]
    },
    {
      anchor: 'operations',
      icon: 'hub',
      title: 'Connected Operations & Community',
      moduleCount: adminNavLabel('section.supportCommunity'),
      valueCopy:
        'Operations, Facilities, and Support & Community modules—Amenity Booking, Smart Parking, Helpdesk, Complaints, Announcements, Community Feed, Events, AGM Management, and Marketplace.',
      features: [
        { icon: 'event_available', title: 'Amenity Booking', description: 'Self-serve facility reservations 24/7' },
        { icon: 'local_parking', title: 'Smart Parking', description: 'IoT slot allocation and visitor passes' },
        { icon: 'support_agent', title: 'Helpdesk', description: 'Tickets with auto-escalation' },
        { icon: 'report_problem', title: 'Complaints', description: 'Priority tracking with assign & resolve' },
        { icon: 'how_to_vote', title: 'AGM Management', description: 'Secret ballot with quorum tracking' },
        { icon: 'storefront', title: 'Marketplace', description: 'Buy/sell/rent classifieds in the society' }
      ],
      highlights: [
        { icon: 'phone_iphone', title: '11 Mobile User Roles', subtitle: 'Custom nav per role on mobile' },
        { icon: 'forum', title: 'Community Feed', subtitle: 'Polls, events & discussions' },
        { icon: 'campaign', title: 'Announcements', subtitle: '6 categories synced to mobile My Society' }
      ]
    }
  ];

  platforms: PlatformSurface[] = [
    {
      icon: 'desktop_windows',
      title: 'Admin Portal',
      subtitle: 'The exact navigation you see in production—MAIN, Access & Security, Financial, Operations, Facilities, Support & Community, and Advanced.',
      route: '/admin/login',
      ctaLabel: 'Access Admin Portal',
      capabilities: [
        `${countNavItems(ADMIN_NAV_SECTIONS)} sidebar items including expandable Hardware & Guard menus`,
        'Gate Security hub with 11 sub-modules (ANPR, Facial Recognition, Video Calling…)',
        'Society Setup—create societies, generate flats, set active context',
        'Multi-Society management for enterprise property managers',
        'Live complaints, announcements & billing API integration',
        'Guard App hub routing to mobile guard workflows'
      ]
    },
    {
      icon: 'phone_android',
      title: 'Mobile App',
      subtitle: 'Role-tailored mobile experience for residents, guards, staff, and committee members',
      route: '/mobile/auth/login',
      ctaLabel: 'Get Mobile App',
      capabilities: [
        '11 user roles with custom bottom navigation per role',
        '5-step registration with facial recognition & document verification',
        'Biometric, OTP, and social login options',
        'Visitors, payments, complaints, amenities & deliveries',
        'Guard: patrol, attendance, visitor approvals, incident reports',
        'Community feed, marketplace, AGM voting & emergency SOS'
      ]
    }
  ];

  differentiators: Differentiator[] = [
    {
      icon: 'menu',
      title: 'Real Admin Navigation',
      description: 'Landing page modules are pulled from the same config as the live admin sidebar—not marketing filler.'
    },
    {
      icon: 'camera_alt',
      title: 'ANPR Vehicle Registry',
      description: 'Register vehicles, test plate detection, view entry history—exactly as in Gate Security → ANPR.'
    },
    {
      icon: 'videocam',
      title: 'WebRTC Guard Video Calling',
      description: 'Residents initiate live video calls with guards in-browser without exposing phone numbers.'
    },
    {
      icon: 'gavel',
      title: 'Indian Compliance Depth',
      description: 'GST (GSTR-1/3B), TDS, Form 26AS, Form 16/16A, and direct Tally export.'
    },
    {
      icon: 'directions_bus',
      title: 'School Bus GPS Tracking',
      description: 'Live bus stats, students on board, and delay alerts in Visitor Management.'
    },
    {
      icon: 'upload_file',
      title: 'Bulk Resident Import',
      description: '26-field Excel/CSV template with validation for mass onboarding.'
    }
  ];

  aiFeatures: AiFeature[] = [
    {
      icon: 'smart_toy',
      title: adminNavLabel('nav.aiAssistant'),
      description: 'Claude AI-powered 24/7 support hub for society administrators.',
      bullets: [
        'Natural-language queries across billing, visitors, and complaints',
        'Document AI verification during 5-step resident registration',
        'Listed under ADVANCED in the admin sidebar'
      ]
    },
    {
      icon: 'insights',
      title: adminNavLabel('nav.analytics'),
      description: 'Society-wide analytics and reporting for data-driven decisions.',
      bullets: [
        'Forecast collection gaps before month-end',
        'Identify maintenance trends across assets',
        'Dedicated Analytics item in ADVANCED section'
      ]
    },
    {
      icon: 'apartment',
      title: adminNavLabel('nav.multiSociety'),
      description: 'Enterprise command center for property managers overseeing multiple communities.',
      bullets: [
        'Unified dashboards across societies',
        'Society Setup with flat auto-generation',
        'Role-based access with per-society session context'
      ]
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    const adminSession =
      sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
    const authToken =
      sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

    if (adminSession || authToken) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  get filteredNavItems(): FlatNavItem[] {
    return filterFlatNav(this.flatNavItems, this.activeModuleSection);
  }

  moduleDescription(titleKey: string): string {
    return getNavItemDescription({ titleKey, icon: '' });
  }

  setActivePillar(index: number): void {
    this.activePillar = index;
  }

  setModuleSection(sectionKey: string): void {
    this.activeModuleSection = sectionKey;
  }

  onHeroSubmit(): void {
    const email = this.heroEmail.trim();
    if (!email) return;
    this.router.navigate(['/mobile/auth/login'], { queryParams: { email } });
  }

  scrollTo(event: Event, anchorId: string): void {
    event.preventDefault();
    this.closeMobileMenu();

    const el = document.getElementById(anchorId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const pillarIndex = this.pillars.findIndex(p => p.anchor === anchorId);
    if (pillarIndex >= 0) {
      this.activePillar = pillarIndex;
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToTop(event: Event): void {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 960) {
      this.mobileMenuOpen = false;
    }
  }
}
