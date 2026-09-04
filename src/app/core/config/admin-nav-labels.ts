import { ADMIN_TRANSLATIONS } from '../i18n/admin-translations';
import { AdminNavItem, AdminNavSection } from './admin-navigation.config';

/** Resolve an admin nav translation key to its English label */
export function adminNavLabel(key: string): string {
  return ADMIN_TRANSLATIONS.en[key] ?? key;
}

/** Flatten nav tree for landing module cards */
export interface FlatNavItem {
  titleKey: string;
  label: string;
  icon: string;
  route?: string;
  badgeKey?: string;
  sectionKey: string;
  sectionLabel: string;
  isChild: boolean;
}

export function flattenAdminNav(sections: AdminNavSection[]): FlatNavItem[] {
  const flat: FlatNavItem[] = [];

  for (const section of sections) {
    const sectionLabel = adminNavLabel(section.titleKey);
    for (const item of section.items) {
      flat.push({
        titleKey: item.titleKey,
        label: adminNavLabel(item.titleKey),
        icon: item.icon,
        route: item.route,
        badgeKey: item.badgeKey,
        sectionKey: section.titleKey,
        sectionLabel,
        isChild: false
      });
      if (item.children) {
        for (const child of item.children) {
          flat.push({
            titleKey: child.titleKey,
            label: adminNavLabel(child.titleKey),
            icon: child.icon,
            route: child.route,
            badgeKey: child.badgeKey,
            sectionKey: section.titleKey,
            sectionLabel,
            isChild: true
          });
        }
      }
    }
  }
  return flat;
}

/** Count top-level + child nav entries */
export function countNavItems(sections: AdminNavSection[]): number {
  return flattenAdminNav(sections).length;
}

/** Section filter tabs for landing page module browser */
export function getNavSectionFilters(sections: AdminNavSection[]): { key: string; label: string }[] {
  return [
    { key: 'all', label: 'All' },
    ...sections.map(s => ({ key: s.titleKey, label: adminNavLabel(s.titleKey) }))
  ];
}

export function filterFlatNav(flat: FlatNavItem[], sectionKey: string): FlatNavItem[] {
  if (sectionKey === 'all') return flat;
  return flat.filter(item => item.sectionKey === sectionKey);
}

/** Sidebar preview row for hero mockup */
export interface NavPreviewRow {
  label: string;
  icon: string;
  active?: boolean;
  indent?: boolean;
  badge?: string;
}

export function buildNavPreviewRows(sections: AdminNavSection[], maxPerSection = 2): NavPreviewRow[] {
  const rows: NavPreviewRow[] = [
    { label: adminNavLabel('section.main'), icon: '', active: false },
    { label: adminNavLabel('nav.dashboard'), icon: 'dashboard' }
  ];

  for (const section of sections) {
    rows.push({ label: adminNavLabel(section.titleKey), icon: '' });
    const items = section.items.slice(0, maxPerSection);
    for (const item of items) {
      rows.push({
        label: adminNavLabel(item.titleKey),
        icon: item.icon,
        active: item.titleKey === 'nav.gateSecurity',
        badge: item.badgeKey ? adminNavLabel(item.badgeKey) : undefined
      });
    }
  }
  return rows;
}

export function getNavItemDescription(item: AdminNavItem): string {
  const descriptions: Record<string, string> = {
    'nav.userManagement': 'Onboard residents with multi-step registration, facial recognition, and family profiles',
    'nav.allUsers': 'Searchable registered-user list with flat linking',
    'nav.visitorManagement': 'End-to-end visitor lifecycle from pre-invite to school-bus tracking',
    'nav.gateSecurity': 'Advanced security and access control management system',
    'nav.hardwareIntegration': 'Central device registry for RFID, biometrics, ANPR, and boom barriers',
    'nav.guardStaffManagement': 'Attendance, patrol routes, shift fraud detection, and guard mobile app',
    'nav.smartLocks': 'Digital door lock management synced with access control',
    'nav.billing': '12 specialized billing workflows from maintenance to GST invoices',
    'nav.payments': 'UPI, cards, wallets, NEFT reconciliation, and auto-pay',
    'nav.accounting': '30+ financial reports with GST/TDS compliance and audit-ready exports',
    'nav.budget': 'Annual planning with real-time variance and over-budget alerts',
    'nav.assets': 'QR-tagged asset registry, depreciation, AMC, and inventory',
    'nav.vendors': 'Vendor database with rating system',
    'nav.contracts': 'AMC tracking and contract renewals',
    'nav.deliveries': 'Package tracking and delivery integration',
    'nav.amenities': 'Book clubhouse, gym, and other facilities',
    'nav.parking': 'IoT-based parking slot management',
    'nav.moveManagement': 'Complete relocation workflow for move-in/move-out',
    'nav.helpdesk': 'Ticket system with auto-escalation',
    'nav.complaints': 'Priority-based complaint tracking with assign/resolve workflow',
    'nav.announcements': 'Broadcast notices that appear on mobile My Society',
    'nav.community': 'Social features and discussion forums',
    'nav.events': 'Organize society events and gatherings',
    'nav.agm': 'Annual General Meeting with secret ballot',
    'nav.marketplace': 'Buy/sell/rent classifieds',
    'nav.aiAssistant': 'Claude AI-powered 24/7 support hub',
    'nav.emergency': 'SOS button and emergency response',
    'nav.multiSociety': 'Manage multiple societies centrally',
    'nav.societySetup': 'Create societies, generate flats, set active session context',
    'nav.analytics': 'Society-wide analytics and reporting',
    'nav.settings': 'Admin configuration and preferences'
  };
  return descriptions[item.titleKey] ?? 'Part of the Society App admin portal';
}
