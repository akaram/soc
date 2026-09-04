import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { MOBILE_ROUTES } from './mobile/mobile.routes';
import { adminAuthGuard } from './admin/guards/admin-auth.guard';
import { mobileAuthGuard } from './mobile/guards/mobile-auth.guard';
import { viewDetectorGuard } from './guards/view-detector.guard';

export const routes: Routes = [
  // Landing Page
  {
    path: '',
    component: LandingComponent
  },
  
  // Admin Login (outside layout - no guard)
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/auth/admin-login.component').then(m => m.AdminLoginComponent)
  },
  
  // Admin routes with layout (protected)
  {
    path: 'admin',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'users', loadComponent: () => import('./modules/user-management/user-management.component').then(m => m.UserManagementComponent) },
      { 
        path: 'visitors',
        loadComponent: () => import('./modules/visitor-management/visitor-management.component').then(m => m.VisitorManagementComponent),
        loadChildren: () => import('./modules/visitor-management/visitor-management.routes').then(m => m.VISITOR_MANAGEMENT_ROUTES)
      },
      { 
        path: 'gate-security',
        loadComponent: () => import('./modules/gate-security/gate-security.component').then(m => m.GateSecurityComponent),
        loadChildren: () => import('./modules/gate-security/gate-security.routes').then(m => m.GATE_SECURITY_ROUTES)
      },
      { 
        path: 'hardware-integration',
        loadComponent: () => import('./modules/hardware-integration/hardware-integration-wrapper.component').then(m => m.HardwareIntegrationWrapperComponent),
        loadChildren: () => import('./modules/hardware-integration/hardware-integration.routes').then(m => m.HARDWARE_INTEGRATION_ROUTES)
      },
      { 
        path: 'guard-management',
        loadComponent: () => import('./modules/guard-management/guard-management.component').then(m => m.GuardManagementComponent),
        loadChildren: () => import('./modules/guard-management/guard-management.routes').then(m => m.GUARD_MANAGEMENT_ROUTES)
      },
      { 
        path: 'guard-patrol',
        loadComponent: () => import('./modules/guard-patrol/guard-patrol.component').then(m => m.GuardPatrolComponent),
        loadChildren: () => import('./modules/guard-patrol/guard-patrol.routes').then(m => m.GUARD_PATROL_ROUTES)
      },
      { 
        path: 'guard-app',
        loadComponent: () => import('./admin/pages/guard-app-feature/guard-app-feature.component').then(m => m.GuardAppFeatureComponent)
      },
      { path: 'billing', loadComponent: () => import('./modules/billing/billing.component').then(m => m.BillingComponent) },
      { path: 'billing/maintenance-bills', loadComponent: () => import('./modules/billing/pages/maintenance-bills/maintenance-bills.component').then(m => m.MaintenanceBillsComponent) },
      { path: 'billing/utility-bills', loadComponent: () => import('./modules/billing/pages/utility-bills/utility-bills.component').then(m => m.UtilityBillsComponent) },
      { path: 'billing/invoices', loadComponent: () => import('./modules/billing/pages/invoices/invoices.component').then(m => m.InvoicesComponent) },
      { path: 'billing/payment-tracking', loadComponent: () => import('./modules/billing/pages/payment-tracking/payment-tracking.component').then(m => m.PaymentTrackingComponent) },
      { path: 'billing/bulk-invoice-generation', loadComponent: () => import('./modules/billing/pages/bulk-invoice-generation/bulk-invoice-generation.component').then(m => m.BulkInvoiceGenerationComponent) },
      { path: 'billing/customizable-billing-cycles', loadComponent: () => import('./modules/billing/pages/customizable-billing-cycles/customizable-billing-cycles.component').then(m => m.CustomizableBillingCyclesComponent) },
      { path: 'billing/late-payment-penalties', loadComponent: () => import('./modules/billing/pages/late-payment-penalties/late-payment-penalties.component').then(m => m.LatePaymentPenaltiesComponent) },
      { path: 'billing/advance-payment-discounts', loadComponent: () => import('./modules/billing/pages/advance-payment-discounts/advance-payment-discounts.component').then(m => m.AdvancePaymentDiscountsComponent) },
      { path: 'billing/metered-utilities-billing', loadComponent: () => import('./modules/billing/pages/metered-utilities-billing/metered-utilities-billing.component').then(m => m.MeteredUtilitiesBillingComponent) },
      { path: 'billing/pro-rata-billing', loadComponent: () => import('./modules/billing/pages/pro-rata-billing/pro-rata-billing.component').then(m => m.ProRataBillingComponent) },
      { path: 'billing/gst-compliant-invoices', loadComponent: () => import('./modules/billing/pages/gst-compliant-invoices/gst-compliant-invoices.component').then(m => m.GSTCompliantInvoicesComponent) },
      { path: 'billing/custom-charges', loadComponent: () => import('./modules/billing/pages/custom-charges/custom-charges.component').then(m => m.CustomChargesComponent) },
      { path: 'payments', loadComponent: () => import('./modules/payments/payments.component').then(m => m.PaymentsComponent) },
      { path: 'payments/multiple-payment-methods', loadComponent: () => import('./modules/payments/pages/multiple-payment-methods/multiple-payment-methods.component').then(m => m.MultiplePaymentMethodsComponent) },
      { path: 'payments/neft-auto-reconciliation', loadComponent: () => import('./modules/payments/pages/neft-auto-reconciliation/neft-auto-reconciliation.component').then(m => m.NEFTAutoReconciliationComponent) },
      { path: 'payments/saved-payment-methods', loadComponent: () => import('./modules/payments/pages/saved-payment-methods/saved-payment-methods.component').then(m => m.SavedPaymentMethodsComponent) },
      { path: 'payments/auto-pay-recurring', loadComponent: () => import('./modules/payments/pages/auto-pay-recurring/auto-pay-recurring.component').then(m => m.AutoPayRecurringComponent) },
      { path: 'payments/installment-plans', loadComponent: () => import('./modules/payments/pages/installment-plans/installment-plans.component').then(m => m.InstallmentPlansComponent) },
      { path: 'payments/payment-reminders', loadComponent: () => import('./modules/payments/pages/payment-reminders/payment-reminders.component').then(m => m.PaymentRemindersComponent) },
      { path: 'payments/digital-receipts', loadComponent: () => import('./modules/payments/pages/digital-receipts/digital-receipts.component').then(m => m.DigitalReceiptsComponent) },
      { path: 'accounting', loadComponent: () => import('./modules/accounting/accounting.component').then(m => m.AccountingComponent) },
      { path: 'accounting/vendor-payments', loadComponent: () => import('./modules/accounting/pages/vendor-payments/vendor-payments.component').then(m => m.VendorPaymentsComponent) },
      { path: 'accounting/gst-return-preparation', loadComponent: () => import('./modules/accounting/pages/gst-return-preparation/gst-return-preparation.component').then(m => m.GSTReturnPreparationComponent) },
      { path: 'accounting/form26as-reconciliation', loadComponent: () => import('./modules/accounting/pages/form26as-reconciliation/form26as-reconciliation.component').then(m => m.Form26ASReconciliationComponent) },
      { path: 'accounting/tds-certificates', loadComponent: () => import('./modules/accounting/pages/tds-certificates/tds-certificates.component').then(m => m.TdsCertificatesComponent) },
      { path: 'accounting/balance-sheet', loadComponent: () => import('./modules/accounting/pages/balance-sheet/balance-sheet.component').then(m => m.BalanceSheetComponent) },
      { path: 'accounting/income-expenditure', loadComponent: () => import('./modules/accounting/pages/income-expenditure/income-expenditure.component').then(m => m.IncomeExpenditureComponent) },
      { path: 'accounting/receipt-payment', loadComponent: () => import('./modules/accounting/pages/receipt-payment/receipt-payment.component').then(m => m.ReceiptPaymentComponent) },
      { path: 'accounting/defaulters-report', loadComponent: () => import('./modules/accounting/pages/defaulters-report/defaulters-report.component').then(m => m.DefaultersReportComponent) },
      { path: 'accounting/budget-variance', loadComponent: () => import('./modules/accounting/pages/budget-variance/budget-variance.component').then(m => m.BudgetVarianceComponent) },
      { path: 'accounting/cash-bank-reconciliation', loadComponent: () => import('./modules/accounting/pages/cash-bank-reconciliation/cash-bank-reconciliation.component').then(m => m.CashBankReconciliationComponent) },
      { path: 'accounting/petty-cash', loadComponent: () => import('./modules/accounting/pages/petty-cash/petty-cash.component').then(m => m.PettyCashComponent) },
      { path: 'accounting/member-statement', loadComponent: () => import('./modules/accounting/pages/member-statement/member-statement.component').then(m => m.MemberStatementComponent) },
      { path: 'accounting/tax-management', loadComponent: () => import('./modules/accounting/pages/tax-management/tax-management.component').then(m => m.TaxManagementComponent) },
      { path: 'accounting/audit-ready-reports', loadComponent: () => import('./modules/accounting/pages/audit-ready-reports/audit-ready-reports.component').then(m => m.AuditReadyReportsComponent) },
      { path: 'accounting/export-reports', loadComponent: () => import('./modules/accounting/pages/export-reports/export-reports.component').then(m => m.ExportReportsComponent) },
      { path: 'assets', loadComponent: () => import('./modules/asset-management/asset-management.component').then(m => m.AssetManagementComponent) },
      { path: 'vendors', loadComponent: () => import('./modules/vendor-management/vendor-management.component').then(m => m.VendorManagementComponent) },
      { path: 'contracts', loadComponent: () => import('./modules/contract-management/contract-management.component').then(m => m.ContractManagementComponent) },
      { path: 'budget', loadComponent: () => import('./modules/budget-management/budget-management.component').then(m => m.BudgetManagementComponent) },
      { path: 'amenities', loadComponent: () => import('./modules/amenity-booking/amenity-booking.component').then(m => m.AmenityBookingComponent) },
      { path: 'helpdesk', loadComponent: () => import('./modules/helpdesk/helpdesk.component').then(m => m.HelpdeskComponent) },
      { path: 'complaints', loadComponent: () => import('./modules/complaints/complaints.component').then(m => m.ComplaintsComponent) },
      { path: 'community', loadComponent: () => import('./modules/community/community.component').then(m => m.CommunityComponent) },
      { path: 'announcements', loadComponent: () => import('./modules/announcements/announcements.component').then(m => m.AnnouncementsComponent) },
      { path: 'events', loadComponent: () => import('./modules/events/events.component').then(m => m.EventsComponent) },
      { path: 'agm', loadComponent: () => import('./modules/agm/agm.component').then(m => m.AgmComponent) },
      { path: 'parking', loadComponent: () => import('./modules/parking/parking.component').then(m => m.ParkingComponent) },
      { path: 'ai-assistant', loadComponent: () => import('./modules/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent) },
      { path: 'move-management', loadComponent: () => import('./modules/move-management/move-management.component').then(m => m.MoveManagementComponent) },
      { path: 'emergency', loadComponent: () => import('./modules/emergency/emergency.component').then(m => m.EmergencyComponent) },
      { path: 'deliveries', loadComponent: () => import('./modules/delivery-management/delivery-management.component').then(m => m.DeliveryManagementComponent) },
      { path: 'marketplace', loadComponent: () => import('./modules/marketplace/marketplace.component').then(m => m.MarketplaceComponent) },
      { path: 'smart-locks', loadComponent: () => import('./modules/smart-locks/smart-locks.component').then(m => m.SmartLocksComponent) },
      { path: 'multi-society', loadComponent: () => import('./modules/multi-society/multi-society.component').then(m => m.MultiSocietyComponent) },
      {
        path: 'societies',
        loadComponent: () =>
          import('./admin/pages/society-setup/society-setup.component').then(m => m.SocietySetupComponent)
      },
      { path: 'settings', loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent) },
      {
        path: 'profile',
        loadComponent: () =>
          import('./admin/pages/profile/admin-profile.component').then(m => m.AdminProfileComponent)
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./admin/pages/placeholder/admin-placeholder.component').then(m => m.AdminPlaceholderComponent),
        data: { title: 'Notifications' }
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./admin/pages/placeholder/admin-placeholder.component').then(m => m.AdminPlaceholderComponent),
        data: { title: 'Messages' }
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./admin/pages/analytics/analytics.component').then(m => m.AnalyticsComponent)
      },
      
      // User Management Sub-Features (Admin Routes)
      { 
        path: 'domestic-staff', 
        loadComponent: () => import('./mobile/features/domestic-staff/domestic-staff-list.component').then(m => m.DomesticStaffListComponent)
      },
      { 
        path: 'domestic-staff/add', 
        loadComponent: () => import('./mobile/features/domestic-staff/add-domestic-staff.component').then(m => m.AddDomesticStaffComponent)
      },
      { 
        path: 'domestic-staff/detail/:id', 
        loadComponent: () => import('./mobile/features/domestic-staff/domestic-staff-detail.component').then(m => m.DomesticStaffDetailComponent)
      },
      { 
        path: 'domestic-staff/access-log/:id', 
        loadComponent: () => import('./mobile/features/domestic-staff/staff-access-log.component').then(m => m.StaffAccessLogComponent)
      },
      { 
        path: 'domestic-staff/verify-passcode', 
        loadComponent: () => import('./mobile/features/domestic-staff/guard-passcode-verify.component').then(m => m.GuardPasscodeVerifyComponent)
      },
      { 
        path: 'pets/add', 
        loadComponent: () => import('./mobile/features/pets/add-pet.component').then(m => m.AddPetComponent)
      },
      {
        path: 'pets/vaccinations/:id',
        loadComponent: () =>
          import('./mobile/features/pets/vaccination-records.component').then(m => m.VaccinationRecordsComponent)
      },
      {
        path: 'pets/health-records/:id',
        loadComponent: () =>
          import('./mobile/features/pets/health-records.component').then(m => m.HealthRecordsComponent)
      },
      {
        path: 'pets/activities/:id',
        loadComponent: () =>
          import('./mobile/features/pets/pet-activities.component').then(m => m.PetActivitiesComponent)
      },
      {
        path: 'pets/detail/:id',
        loadComponent: () =>
          import('./mobile/features/pets/pet-detail.component').then(m => m.PetDetailComponent)
      },
      { 
        path: 'pets', 
        loadComponent: () => import('./mobile/features/pets/pet-list.component').then(m => m.PetListComponent)
      },
      { 
        path: 'bulk-import', 
        loadComponent: () => import('./mobile/features/bulk-import/bulk-import.component').then(m => m.BulkImportComponent)
      },
      {
        path: 'user-registration',
        loadComponent: () =>
          import('./mobile/auth/registration/multi-step-registration.component').then(m => m.MultiStepRegistrationComponent)
      },
      {
        path: 'family-profiles',
        loadComponent: () =>
          import('./modules/family-management/components/family-member-list.component').then(m => m.FamilyMemberListComponent)
      },
      { 
        path: 'vehicles',
        loadChildren: () => import('./modules/vehicle-registration/vehicle-registration.routes').then(m => m.VEHICLE_REGISTRATION_ROUTES)
      },
      { 
        path: 'users-list',
        loadChildren: () => import('./modules/user-management/user-management.routes').then(m => m.USER_MANAGEMENT_ROUTES)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Mobile routes
  {
    path: 'mobile',
    children: [
      // Auth routes (outside layout - no guard)
      { 
        path: 'auth',
        children: [
          { path: 'login', loadComponent: () => import('./mobile/auth/mobile-login.component').then(m => m.MobileLoginComponent) },
          { path: 'register', loadComponent: () => import('./mobile/auth/registration/multi-step-registration.component').then(m => m.MultiStepRegistrationComponent) },
          { path: 'facial-recognition', loadComponent: () => import('./mobile/auth/registration/facial-recognition/facial-recognition-setup.component').then(m => m.FacialRecognitionSetupComponent) },
          { path: 'registration-success', loadComponent: () => import('./mobile/auth/registration/registration-success.component').then(m => m.RegistrationSuccessComponent) },
          { path: 'biometric', loadComponent: () => import('./mobile/auth/biometric/biometric-login.component').then(m => m.BiometricLoginComponent) },
          { path: 'biometric-setup', loadComponent: () => import('./mobile/auth/biometric/biometric-setup.component').then(m => m.BiometricSetupComponent) },
          { path: 'otp-login', loadComponent: () => import('./mobile/auth/otp-verification/otp-login.component').then(m => m.OtpLoginComponent) },
          { path: 'otp-verify', loadComponent: () => import('./mobile/auth/otp-verification/otp-verification.component').then(m => m.OtpVerificationComponent) },
          { path: 'social', loadComponent: () => import('./mobile/auth/social-login/social-login.component').then(m => m.SocialLoginComponent) }
        ]
      },
      // Main mobile routes (with layout - protected)
      {
        path: '',
        canActivate: [mobileAuthGuard],
        loadComponent: () => import('./mobile/layout/mobile-layout.component').then(m => m.MobileLayoutComponent),
        children: MOBILE_ROUTES
      }
    ]
  },
  
  { path: '**', redirectTo: '' }
];
