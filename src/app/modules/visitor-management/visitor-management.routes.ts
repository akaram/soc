import { Routes } from '@angular/router';
import { VisitorListComponent } from './components/visitor-list.component';
import { PreInviteVisitorComponent } from './components/pre-invite-visitor.component';
import { VisitorQRCodeComponent } from './components/visitor-qr-code.component';
import { VisitorDetailComponent } from './components/visitor-detail.component';
import { RecurringVisitorListComponent } from './components/recurring-visitor-list.component';
import { RecurringVisitorFormComponent } from './components/recurring-visitor-form.component';
import { RecurringVisitorDetailComponent } from './components/recurring-visitor-detail.component';
import { RecurringVisitorQRComponent } from './components/recurring-visitor-qr.component';
import { MonthlyGatepassListComponent } from './components/monthly-gatepass-list.component';
import { MonthlyGatepassFormComponent } from './components/monthly-gatepass-form.component';
import { MonthlyGatepassDetailComponent } from './components/monthly-gatepass-detail.component';
import { BulkApprovalComponent } from './components/bulk-approval.component';
import { MultiTierApprovalComponent } from './components/multi-tier-approval.component';
import { DeliveryTrackingListComponent } from './components/delivery-tracking-list.component';
import { DeliveryTrackingDetailComponent } from './components/delivery-tracking-detail.component';
import { DeliveryExecutiveAppComponent } from './components/delivery-executive-app.component';
import { CabTaxiEntryListComponent } from './components/cab-taxi-entry-list.component';
import { CabTaxiEntryFormComponent } from './components/cab-taxi-entry-form.component';
import { SchoolBusTrackingComponent } from './components/school-bus-tracking.component';
import { SchoolBusDetailComponent } from './components/school-bus-detail.component';
import { SchoolBusFormComponent } from './components/school-bus-form.component';

export const VISITOR_MANAGEMENT_ROUTES: Routes = [
  {
    path: 'list',
    component: VisitorListComponent,
    title: 'Visitor List'
  },
  {
    path: 'pre-invite',
    component: PreInviteVisitorComponent,
    title: 'Pre-Invite Visitor'
  },
  {
    path: 'bulk-approval',
    component: BulkApprovalComponent,
    title: 'Bulk Visitor Approval'
  },
  {
    path: 'multi-tier-approval',
    component: MultiTierApprovalComponent,
    title: 'Multi-Tier Approval'
  },
  {
    path: 'recurring',
    component: RecurringVisitorListComponent,
    title: 'Recurring Visitors - Daily Help'
  },
  {
    path: 'recurring/add',
    component: RecurringVisitorFormComponent,
    title: 'Add Recurring Visitor'
  },
  {
    path: 'recurring/:id/edit',
    component: RecurringVisitorFormComponent,
    title: 'Edit Recurring Visitor'
  },
  {
    path: 'recurring/:id/qr',
    component: RecurringVisitorQRComponent,
    title: 'Recurring Visitor QR Code'
  },
  {
    path: 'recurring/:id',
    component: RecurringVisitorDetailComponent,
    title: 'Recurring Visitor Details'
  },
  {
    path: 'gatepass',
    component: MonthlyGatepassListComponent,
    title: 'Monthly Gatepass'
  },
  {
    path: 'gatepass/add',
    component: MonthlyGatepassFormComponent,
    title: 'Create Monthly Gatepass'
  },
  {
    path: 'gatepass/:id/edit',
    component: MonthlyGatepassFormComponent,
    title: 'Edit Monthly Gatepass'
  },
  {
    path: 'gatepass/:id/qr',
    component: VisitorQRCodeComponent,
    title: 'Gatepass QR Code'
  },
  {
    path: 'gatepass/:id',
    component: MonthlyGatepassDetailComponent,
    title: 'Monthly Gatepass Details'
  },
  {
    path: 'deliveries',
    component: DeliveryTrackingListComponent,
    title: 'Delivery Tracking'
  },
  {
    path: 'deliveries/executive/app',
    component: DeliveryExecutiveAppComponent,
    title: 'Delivery Executive App'
  },
  {
    path: 'cab-taxi',
    component: CabTaxiEntryListComponent,
    title: 'Cab/Taxi Entry Management'
  },
  {
    path: 'cab-taxi/add',
    component: CabTaxiEntryFormComponent,
    title: 'New Cab/Taxi Entry'
  },
  {
    path: 'school-bus',
    component: SchoolBusTrackingComponent,
    title: 'School Bus Tracking'
  },
  {
    path: 'school-bus/add',
    component: SchoolBusFormComponent,
    title: 'Add School Bus'
  },
  {
    path: 'school-bus/:id',
    component: SchoolBusDetailComponent,
    title: 'Bus Details'
  },
  {
    path: 'deliveries/:id',
    component: DeliveryTrackingDetailComponent,
    title: 'Delivery Details'
  },
  {
    path: ':id/qr',
    component: VisitorQRCodeComponent,
    title: 'Visitor QR Code'
  },
  {
    path: ':id',
    component: VisitorDetailComponent,
    title: 'Visitor Details'
  }
];

