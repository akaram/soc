import { Routes } from '@angular/router';
import { GuardPatrolDashboardComponent } from './components/guard-patrol-dashboard.component';
import { PatrollingRouteListComponent } from './components/patrolling-route-list.component';
import { PatrollingRouteFormComponent } from './components/patrolling-route-form.component';
import { PatrollingRouteDetailComponent } from './components/patrolling-route-detail.component';
import { CheckpointScannerComponent } from './components/checkpoint-scanner.component';
import { PatrolMonitoringDashboardComponent } from './components/patrol-monitoring-dashboard.component';
import { MissedPatrolAlertsListComponent } from './components/missed-patrol-alerts-list.component';
import { MissedPatrolAlertDetailComponent } from './components/missed-patrol-alert-detail.component';
import { PatrolCompletionReportsListComponent } from './components/patrol-completion-reports-list.component';
import { PatrolCompletionReportDetailComponent } from './components/patrol-completion-report-detail.component';
import { IncidentReportsListComponent } from './components/incident-reports-list.component';
import { IncidentReportFormComponent } from './components/incident-report-form.component';
import { IncidentReportDetailComponent } from './components/incident-report-detail.component';

export const GUARD_PATROL_ROUTES: Routes = [
  {
    path: '',
    component: GuardPatrolDashboardComponent,
    title: 'Guard & Patrolling System Dashboard',
    pathMatch: 'full'
  },
  {
    path: 'incidents',
    component: IncidentReportsListComponent,
    title: 'Incident Reporting'
  },
  {
    path: 'incidents/add',
    component: IncidentReportFormComponent,
    title: 'Report New Incident'
  },
  {
    path: 'incidents/:id/edit',
    component: IncidentReportFormComponent,
    title: 'Edit Incident Report'
  },
  {
    path: 'incidents/:id',
    component: IncidentReportDetailComponent,
    title: 'Incident Report Details'
  },
  {
    path: 'completion-reports',
    component: PatrolCompletionReportsListComponent,
    title: 'Patrol Completion Reports'
  },
  {
    path: 'completion-reports/:id',
    component: PatrolCompletionReportDetailComponent,
    title: 'Patrol Completion Report Details'
  },
  {
    path: 'missed-alerts',
    component: MissedPatrolAlertsListComponent,
    title: 'Missed Patrol Alerts'
  },
  {
    path: 'missed-alerts/:id',
    component: MissedPatrolAlertDetailComponent,
    title: 'Missed Patrol Alert Details'
  },
  {
    path: 'monitoring',
    component: PatrolMonitoringDashboardComponent,
    title: 'Real-Time Patrol Monitoring'
  },
  {
    path: 'scanner',
    component: CheckpointScannerComponent,
    title: 'Checkpoint Scanner'
  },
  {
    path: 'routes/add',
    component: PatrollingRouteFormComponent,
    title: 'Create Patrolling Route'
  },
  {
    path: 'routes/:id/edit',
    component: PatrollingRouteFormComponent,
    title: 'Edit Patrolling Route'
  },
  {
    path: 'routes/:id',
    component: PatrollingRouteDetailComponent,
    title: 'Patrolling Route Details'
  },
  {
    path: 'routes',
    component: PatrollingRouteListComponent,
    title: 'Define Patrolling Routes'
  },
];

