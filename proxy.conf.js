/**
 * Dev proxy for ng serve (Vite): forward API paths to Spring Boot on :9999.
 * Uses a regex so new endpoints (e.g. sos-alerts) are proxied without per-path entries.
 */
const BACKEND = 'http://localhost:9999';

/** First URL segment must be a backend API root (not /mobile, /admin, static assets). */
const API_ROOTS = [
  'auth',
  'users',
  'complaints',
  'deliveries',
  'amenities',
  'amenity-bookings',
  'flats',
  'societies',
  'pets',
  'vehicles',
  'family-members',
  'visitors',
  'documents',
  'locations',
  'module-records',
  'video-calls',
  'sos-alerts',
  'api',
  'actuator',
  'api-docs',
  'swagger-ui',
  'v3',
  'patrol-completion-reports',
  'patrol-incidents',
  'patrol-routes',
  'patrol-notifications',
  'patrol-monitoring-guards',
  'patrol-monitoring-alerts',
  'patrol-active-patrols',
  'checkpoint-scans',
  'gate-hardware',
  'hardware-devices',
  'bills',
  'billing-cycles',
  'maintenance-bills',
  'maintenance-bill-templates',
  'maintenance-bill-automation-settings',
  'payment-transactions',
  'utility-bills',
  'utility-rates',
  'utility-meter-readings',
  'invoices',
  'invoice-templates',
  'vendor-payments',
  'petty-cash',
  'domestic-staff',
  'empty-flat-logs',
  'recurring-visitors',
  'monthly-gatepass',
  'smart-locks',
  'shift-management',
  'leave-management',
  'overtime-tracking',
  'fingerprint-attendance',
  'facial-attendance',
  'investigations',
  'ivr',
  'tax-management',
  'gst-returns',
  'defaulters-reports',
  'member-statements',
  'receipt-payment-statements',
  'income-expenditure-statements',
  'late-payment-penalties',
  'proxy-attendance-detection',
  'double-shift-detection',
  'missed-patrol-alerts'
].join('|');

module.exports = {
  [`^/(${API_ROOTS})(/|$)`]: {
    target: BACKEND,
    changeOrigin: true,
    secure: false
  }
};
