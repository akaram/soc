/**
 * Single source of truth for admin portal navigation.
 * Used by the admin sidebar and the marketing landing page preview.
 */

export interface AdminNavItem {
  titleKey: string;
  icon: string;
  route?: string;
  badgeKey?: string;
  children?: AdminNavItem[];
}

export interface AdminNavSection {
  titleKey: string;
  items: AdminNavItem[];
}

/** Main dashboard link shown above sidebar sections */
export const ADMIN_DASHBOARD_NAV: AdminNavItem = {
  titleKey: 'nav.dashboard',
  icon: 'dashboard',
  route: '/admin/dashboard'
};

/** Admin sidebar sections — keep in sync with sidebar.component.ts */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    titleKey: 'section.accessSecurity',
    items: [
      { titleKey: 'nav.userManagement', icon: 'people', route: '/admin/users' },
      { titleKey: 'nav.allUsers', icon: 'list', route: '/admin/users-list' },
      { titleKey: 'nav.visitorManagement', icon: 'group_add', route: '/admin/visitors' },
      { titleKey: 'nav.visitorPhotoGallery', icon: 'photo_library', route: '/admin/gate-security/visitor-photos' },
      { titleKey: 'nav.gateSecurity', icon: 'security', route: '/admin/gate-security' },
      {
        titleKey: 'nav.hardwareIntegration',
        icon: 'settings_input_antenna',
        children: [
          { titleKey: 'nav.allDevices', icon: 'devices', route: '/admin/hardware-integration' },
          { titleKey: 'nav.rfidReaders', icon: 'nfc', route: '/admin/hardware-integration/rfid-readers' },
          { titleKey: 'nav.biometricDevices', icon: 'fingerprint', route: '/admin/hardware-integration/biometric-devices' },
          { titleKey: 'nav.anprCameras', icon: 'camera_alt', route: '/admin/hardware-integration/anpr-cameras' },
          { titleKey: 'nav.boomBarriers', icon: 'remove_road', route: '/admin/hardware-integration/boom-barriers' },
          { titleKey: 'nav.accessControl', icon: 'lock', route: '/admin/hardware-integration/access-control' }
        ]
      },
      {
        titleKey: 'nav.guardStaffManagement',
        icon: 'shield',
        children: [
          { titleKey: 'nav.staffAttendance', icon: 'badge', route: '/admin/guard-management' },
          { titleKey: 'nav.guardPatrol', icon: 'route', route: '/admin/guard-patrol' },
          { titleKey: 'nav.incidentReporting', icon: 'report_problem', route: '/admin/guard-patrol/incidents' },
          { titleKey: 'nav.guardApp', icon: 'phone_android', route: '/admin/guard-app' }
        ]
      },
      { titleKey: 'nav.smartLocks', icon: 'lock', route: '/admin/smart-locks' }
    ]
  },
  {
    titleKey: 'section.financial',
    items: [
      { titleKey: 'nav.billing', icon: 'receipt_long', route: '/admin/billing', badgeKey: 'badge.new' },
      { titleKey: 'nav.payments', icon: 'payment', route: '/admin/payments' },
      { titleKey: 'nav.accounting', icon: 'account_balance', route: '/admin/accounting' },
      { titleKey: 'nav.budget', icon: 'pie_chart', route: '/admin/budget' }
    ]
  },
  {
    titleKey: 'section.operations',
    items: [
      { titleKey: 'nav.assets', icon: 'inventory_2', route: '/admin/assets' },
      { titleKey: 'nav.vendors', icon: 'business', route: '/admin/vendors' },
      { titleKey: 'nav.contracts', icon: 'description', route: '/admin/contracts' },
      { titleKey: 'nav.deliveries', icon: 'local_shipping', route: '/admin/deliveries' }
    ]
  },
  {
    titleKey: 'section.facilities',
    items: [
      { titleKey: 'nav.amenities', icon: 'event_available', route: '/admin/amenities' },
      { titleKey: 'nav.parking', icon: 'local_parking', route: '/admin/parking' },
      { titleKey: 'nav.moveManagement', icon: 'moving', route: '/admin/move-management' }
    ]
  },
  {
    titleKey: 'section.supportCommunity',
    items: [
      { titleKey: 'nav.helpdesk', icon: 'support_agent', route: '/admin/helpdesk' },
      { titleKey: 'nav.complaints', icon: 'report_problem', route: '/admin/complaints' },
      { titleKey: 'nav.announcements', icon: 'campaign', route: '/admin/announcements' },
      { titleKey: 'nav.community', icon: 'forum', route: '/admin/community' },
      { titleKey: 'nav.events', icon: 'celebration', route: '/admin/events' },
      { titleKey: 'nav.agm', icon: 'how_to_vote', route: '/admin/agm' },
      { titleKey: 'nav.marketplace', icon: 'storefront', route: '/admin/marketplace' }
    ]
  },
  {
    titleKey: 'section.advanced',
    items: [
      { titleKey: 'nav.aiAssistant', icon: 'smart_toy', route: '/admin/ai-assistant', badgeKey: 'badge.ai' },
      { titleKey: 'nav.emergency', icon: 'emergency', route: '/admin/emergency' },
      { titleKey: 'nav.multiSociety', icon: 'apartment', route: '/admin/multi-society' },
      { titleKey: 'nav.societySetup', icon: 'domain_add', route: '/admin/societies' },
      { titleKey: 'nav.analytics', icon: 'analytics', route: '/admin/analytics' },
      { titleKey: 'nav.settings', icon: 'settings', route: '/admin/settings' }
    ]
  }
];

/** Gate Security sub-modules — from gate-security.component.ts menuCards */
export const GATE_SECURITY_FEATURES: { title: string; icon: string; route: string; description: string }[] = [
  { title: 'Facial Recognition', icon: 'face', route: '/admin/gate-security/facial-recognition', description: 'Touchless entry using facial recognition technology' },
  { title: 'ANPR', icon: 'camera_alt', route: '/admin/gate-security/anpr', description: 'Automatic Number Plate Recognition for vehicle access' },
  { title: 'RFID/FASTag', icon: 'nfc', route: '/admin/gate-security/rfid-fastag', description: 'Automatic gate opening with RFID and FASTag integration' },
  { title: 'Live Camera Feed', icon: 'videocam', route: '/admin/gate-security/camera-feed', description: 'Real-time monitoring of gate cameras and security feeds' },
  { title: 'E-Intercom', icon: 'phone', route: '/admin/gate-security/e-intercom', description: 'Electronic intercom system for visitor communication' },
  { title: 'Video Calling', icon: 'videocam', route: '/admin/gate-security/video-calling', description: 'Video calling system for direct communication with guards' },
  { title: 'Visitor Photo Gallery', icon: 'photo_library', route: '/admin/gate-security/visitor-photos', description: 'Guard walk-in entries and gate photos with 7-day storage' },
  { title: 'Blacklist', icon: 'block', route: '/admin/gate-security/blacklist', description: 'Manage blacklisted individuals and restricted access' },
  { title: 'Investigation', icon: 'search', route: '/admin/gate-security/investigation', description: 'Investigation module for security incidents and logs' },
  { title: 'Empty Flat Logs', icon: 'apartment', route: '/admin/gate-security/empty-flat-logs', description: 'Track and monitor access logs for empty or vacant flats' },
  { title: 'IVR', icon: 'phone_in_talk', route: '/admin/gate-security/ivr', description: 'Interactive Voice Response system for automated approvals' }
];
