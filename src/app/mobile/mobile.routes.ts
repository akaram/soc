import { Routes } from '@angular/router';
import { routeDataRoleGuard } from './guards/route-data-role.guard';

// Mobile application routes configuration
export const MOBILE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  
  // Auth Routes
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/mobile-login.component').then(m => m.MobileLoginComponent)
      },
      {
        path: 'biometric',
        loadComponent: () => import('./auth/biometric/biometric-login.component').then(m => m.BiometricLoginComponent)
      },
      {
        path: 'biometric-setup',
        loadComponent: () => import('./auth/biometric/biometric-setup.component').then(m => m.BiometricSetupComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/registration/multi-step-registration.component').then(m => m.MultiStepRegistrationComponent)
      },
      {
        path: 'registration-success',
        loadComponent: () => import('./auth/registration/registration-success.component').then(m => m.RegistrationSuccessComponent)
      },
      {
        path: 'otp-verify',
        loadComponent: () => import('./auth/otp-verification/otp-verification.component').then(m => m.OtpVerificationComponent)
      },
      {
        path: 'otp-login',
        loadComponent: () => import('./auth/otp-verification/otp-login.component').then(m => m.OtpLoginComponent)
      }
    ]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboards/owner-dashboard.component').then(m => m.OwnerDashboardComponent),
    canActivate: [routeDataRoleGuard],
    data: { roles: ['owner', 'tenant'] }
  },
  {
    path: 'guard/dashboard',
    loadComponent: () => import('./dashboards/guard-dashboard.component').then(m => m.GuardDashboardComponent),
    canActivate: [routeDataRoleGuard],
    data: { roles: ['guard'] }
  },
  {
    path: 'staff/dashboard',
    loadComponent: () => import('./dashboards/staff/staff-dashboard.component').then(m => m.StaffDashboardComponent),
    canActivate: [routeDataRoleGuard],
    data: { roles: ['staff', 'domestic'] }
  },
  {
    path: 'staff/tasks',
    loadComponent: () => import('./features/staff/staff-tasks.component').then(m => m.StaffTasksComponent),
    canActivate: [routeDataRoleGuard],
    data: { roles: ['staff', 'domestic'] }
  },
  {
    path: 'staff/scan',
    loadComponent: () => import('./features/scan/qr-scanner.component').then(m => m.QrScannerComponent),
    canActivate: [routeDataRoleGuard],
    data: { roles: ['staff', 'domestic'] }
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./dashboards/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [routeDataRoleGuard],
    data: { roles: ['admin', 'superadmin'] }
  },
  
  // Visitor Management Routes (residents only — guards use visitor-approvals)
  {
    path: 'visitors',
    canActivate: [routeDataRoleGuard],
    data: { roles: ['owner', 'tenant'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/visitors/visitor-list.component').then(m => m.VisitorListComponent)
      },
      {
        path: 'add',
        loadComponent: () => import('./features/visitors/add-visitor.component').then(m => m.AddVisitorComponent)
      },
      {
        path: 'pre-invite',
        loadComponent: () => import('./features/visitors/add-visitor.component').then(m => m.AddVisitorComponent),
        data: { preInvite: true }
      },
      {
        path: 'history',
        loadComponent: () => import('./features/visitors/visitor-history.component').then(m => m.VisitorHistoryComponent)
      }
    ]
  },
  
  // Payment & Billing Routes (residents only)
  {
    path: 'payments',
    canActivate: [routeDataRoleGuard],
    data: { roles: ['owner', 'tenant'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./features/payments/payment-dashboard.component').then(m => m.PaymentDashboardComponent)
      },
      {
        path: 'pending',
        loadComponent: () => import('./features/payments/pending-bills.component').then(m => m.PendingBillsComponent)
      },
      {
        path: 'history',
        loadComponent: () => import('./features/payments/payment-history.component').then(m => m.PaymentHistoryComponent)
      },
      {
        path: 'pay/:id',
        loadComponent: () => import('./features/payments/make-payment.component').then(m => m.MakePaymentComponent)
      }
    ]
  },
  {
    path: 'bills',
    redirectTo: 'payments/pending',
    pathMatch: 'full'
  },

  // Complaint & Helpdesk Routes (flat paths — nested children without a shell break navigation)
  {
    path: 'complaints',
    loadComponent: () => import('./features/complaints/complaint-list.component').then(m => m.ComplaintListComponent)
  },
  {
    path: 'complaints/add',
    loadComponent: () => import('./features/complaints/add-complaint.component').then(m => m.AddComplaintComponent)
  },
  {
    path: 'complaints/detail/:id',
    loadComponent: () => import('./features/complaints/complaint-detail.component').then(m => m.ComplaintDetailComponent)
  },
  
  // Amenity Booking Routes
  {
    path: 'amenities',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/amenities/amenity-list.component').then(m => m.AmenityListComponent)
      },
      {
        path: 'book/:id',
        loadComponent: () => import('./features/amenities/book-amenity.component').then(m => m.BookAmenityComponent)
      },
      {
        path: 'my-bookings',
        loadComponent: () => import('./features/amenities/my-bookings.component').then(m => m.MyBookingsComponent)
      }
    ]
  },
  
  // Community Features Routes
  {
    path: 'community',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/community/community-feed.component').then(m => m.CommunityFeedComponent)
      },
      {
        path: 'polls',
        loadComponent: () => import('./features/community/polls.component').then(m => m.PollsComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./features/community/events.component').then(m => m.EventsComponent)
      },
      {
        path: 'marketplace',
        loadComponent: () => import('./features/community/marketplace.component').then(m => m.MarketplaceComponent)
      }
    ]
  },
  
  // Delivery Management Routes
  {
    path: 'deliveries',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/deliveries/delivery-list.component').then(m => m.DeliveryListComponent)
      },
      {
        path: 'track/:id',
        loadComponent: () => import('./features/deliveries/track-delivery.component').then(m => m.TrackDeliveryComponent)
      }
    ]
  },
  
  // Emergency & Safety Routes (flat paths)
  {
    path: 'emergency',
    loadComponent: () => import('./features/emergency/emergency-dashboard.component').then(m => m.EmergencyDashboardComponent)
  },
  {
    path: 'emergency/contacts',
    loadComponent: () => import('./features/emergency/emergency-contacts.component').then(m => m.EmergencyContactsComponent)
  },
  
  // Profile & Settings Routes
  {
    path: 'profile',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/profile/my-profile.component').then(m => m.MyProfileComponent)
      },
      {
        path: 'edit',
        loadComponent: () => import('./features/profile/edit-profile.component').then(m => m.EditProfileComponent)
      },
      {
        path: 'family',
        loadComponent: () => import('./features/profile/family-members.component').then(m => m.FamilyMembersComponent)
      },
      {
        path: 'family/add',
        loadComponent: () => import('./features/profile/family-member-form.component').then(m => m.FamilyMemberFormComponent)
      },
      {
        path: 'family/edit/:id',
        loadComponent: () => import('./features/profile/family-member-form.component').then(m => m.FamilyMemberFormComponent)
      },
      {
        path: 'vehicles',
        loadComponent: () => import('./features/profile/my-vehicles.component').then(m => m.MyVehiclesComponent)
      },
      {
        path: 'vehicles/add',
        loadComponent: () => import('./features/profile/vehicle-form.component').then(m => m.VehicleFormComponent)
      },
      {
        path: 'vehicles/edit/:id',
        loadComponent: () => import('./features/profile/vehicle-form.component').then(m => m.VehicleFormComponent)
      },
      {
        path: 'pets',
        loadComponent: () => import('./features/profile/my-pets.component').then(m => m.MyPetsComponent)
      }
      ,
      {
        path: 'pets/add',
        loadComponent: () => import('./features/profile/pet-form.component').then(m => m.PetFormComponent)
      },
      {
        path: 'pets/edit/:id',
        loadComponent: () => import('./features/profile/pet-form.component').then(m => m.PetFormComponent)
      }
    ]
  },
  
  // Guard Specific Routes
  {
    path: 'guard',
    children: [
      {
        path: 'patrol',
        loadComponent: () => import('./features/guard/patrol-screen.component').then(m => m.PatrolScreenComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'attendance',
        loadComponent: () => import('./features/guard/attendance.component').then(m => m.AttendanceComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'incidents',
        loadComponent: () => import('./features/guard/incident-list.component').then(m => m.IncidentListComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'incidents/report',
        loadComponent: () => import('./features/guard/incident-report.component').then(m => m.IncidentReportComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'incidents/:id',
        loadComponent: () => import('./features/guard/incident-detail.component').then(m => m.IncidentDetailComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'gatepasses',
        loadComponent: () =>
          import('./features/guard/guard-monthly-gatepass-list.component').then(
            m => m.GuardMonthlyGatepassListComponent
          ),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'recurring-visitors',
        loadComponent: () =>
          import('./features/guard/guard-recurring-visitor-list.component').then(
            m => m.GuardRecurringVisitorListComponent
          ),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        // More specific paths first so "verify" / ":id" are not swallowed by the list route.
        path: 'domestic-staff/verify',
        loadComponent: () =>
          import('./features/domestic-staff/guard-passcode-verify.component').then(
            m => m.GuardPasscodeVerifyComponent
          ),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'domestic-staff/:id',
        loadComponent: () =>
          import('./features/guard/guard-domestic-staff-detail.component').then(
            m => m.GuardDomesticStaffDetailComponent
          ),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'domestic-staff',
        loadComponent: () =>
          import('./features/guard/guard-domestic-staff-list.component').then(
            m => m.GuardDomesticStaffListComponent
          ),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'visitor-approvals',
        loadComponent: () => import('./features/guard/visitor-approval-card.component').then(m => m.VisitorApprovalCardComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'packages',
        loadComponent: () => import('./features/guard/package-holding.component').then(m => m.PackageHoldingComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'walk-in',
        loadComponent: () => import('../modules/gate-security/components/visitor-photo-capture.component').then(m => m.VisitorPhotoCaptureComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      },
      {
        path: 'scan',
        loadComponent: () => import('./features/scan/qr-scanner.component').then(m => m.QrScannerComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      }
    ]
  },
  
  // User Management Dashboard
  {
    path: 'user-management',
    loadComponent: () => import('./features/user-management-dashboard.component').then(m => m.UserManagementDashboardComponent),
    canActivate: [routeDataRoleGuard],
    data: { roles: ['admin'] }
  },
  
  // Bulk Import Routes
  {
    path: 'bulk-import',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/bulk-import/bulk-import.component').then(m => m.BulkImportComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['admin'] }
      }
    ]
  },
  
  // Pet Management Routes
  {
    path: 'pets',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/pets/pet-list.component').then(m => m.PetListComponent)
      },
      {
        path: 'add',
        loadComponent: () => import('./features/pets/add-pet.component').then(m => m.AddPetComponent)
      },
      {
        path: 'detail/:id',
        loadComponent: () => import('./features/pets/pet-detail.component').then(m => m.PetDetailComponent)
      },
      {
        path: 'vaccinations/:id',
        loadComponent: () => import('./features/pets/vaccination-records.component').then(m => m.VaccinationRecordsComponent)
      },
      {
        path: 'health-records/:id',
        loadComponent: () => import('./features/pets/health-records.component').then(m => m.HealthRecordsComponent)
      },
      {
        path: 'activities/:id',
        loadComponent: () => import('./features/pets/pet-activities.component').then(m => m.PetActivitiesComponent)
      }
    ]
  },
  
  // Owner / Tenant — cooks & domestic staff for their flat only
  {
    path: 'my-staff',
    canActivate: [routeDataRoleGuard],
    data: { roles: ['owner', 'tenant'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/resident/resident-domestic-staff-list.component').then(
            m => m.ResidentDomesticStaffListComponent
          )
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/resident/resident-domestic-staff-detail.component').then(
            m => m.ResidentDomesticStaffDetailComponent
          )
      }
    ]
  },

  // Domestic Staff Routes (admin / general)
  {
    path: 'domestic-staff',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/domestic-staff/domestic-staff-list.component').then(m => m.DomesticStaffListComponent)
      },
      {
        path: 'add',
        loadComponent: () => import('./features/domestic-staff/add-domestic-staff.component').then(m => m.AddDomesticStaffComponent)
      },
      {
        path: 'detail/:id',
        loadComponent: () => import('./features/domestic-staff/domestic-staff-detail.component').then(m => m.DomesticStaffDetailComponent)
      },
      {
        path: 'access-log/:id',
        loadComponent: () => import('./features/domestic-staff/staff-access-log.component').then(m => m.StaffAccessLogComponent)
      },
      {
        path: 'verify-passcode',
        loadComponent: () => import('./features/domestic-staff/guard-passcode-verify.component').then(m => m.GuardPasscodeVerifyComponent),
        canActivate: [routeDataRoleGuard],
        data: { roles: ['guard'] }
      }
    ]
  },
  
  // Settings Route
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
  },

  // Profile menu destinations (placeholders so links don't fall through to app wildcard routes)
  {
    path: 'settings/privacy',
    loadComponent: () => import('./shared/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
    data: { title: 'Privacy & Security', message: 'This feature is coming soon.' }
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./shared/notifications/notifications.component').then(m => m.NotificationsComponent)
  },
  {
    path: 'settings/notifications',
    redirectTo: 'notifications',
    pathMatch: 'full'
  },
  {
    path: 'payment-methods',
    loadComponent: () => import('./shared/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
    data: { title: 'Payment Methods', message: 'This feature is coming soon.' }
  },
  {
    path: 'billing-history',
    loadComponent: () => import('./shared/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
    data: { title: 'Billing History', message: 'This feature is coming soon.' }
  },
  {
    path: 'support',
    loadComponent: () => import('./features/support/support.component').then(m => m.SupportComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./shared/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
    data: { title: 'About', message: 'This feature is coming soon.' }
  },

  // My Society Route
  {
    path: 'society',
    loadComponent: () => import('./features/society/my-society.component').then(m => m.MySocietyComponent)
  },

  // Short aliases for profile sub-pages (must be before the ** wildcard).
  {
    path: 'family',
    redirectTo: 'profile/family',
    pathMatch: 'full'
  },
  {
    path: 'vehicles',
    redirectTo: 'profile/vehicles',
    pathMatch: 'full'
  },
  {
    path: 'my-pets',
    redirectTo: 'profile/pets',
    pathMatch: 'full'
  },

  // Helpdesk Route (alias to complaints)
  {
    path: 'helpdesk',
    redirectTo: 'complaints',
    pathMatch: 'full'
  },

  // Mobile safety: keep unknown mobile paths inside mobile (avoid global app wildcard redirect).
  { path: '**', redirectTo: 'dashboard' }
];
