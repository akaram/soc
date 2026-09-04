import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from '../../core/services/session-context.service';
import { MobileAuthService } from './mobile-auth.service';
import { VisitorManagementService } from '../../modules/visitor-management/services/visitor-management.service';
import { Visitor } from '../../modules/visitor-management/models/visitor.model';
import { MonthlyGatepass } from '../../modules/visitor-management/models/monthly-gatepass.model';
import { RecurringVisitor } from '../../modules/visitor-management/models/recurring-visitor.model';
import { CheckpointScanService } from '../../modules/guard-patrol/services/checkpoint-scan.service';
import { PatrollingRouteService } from '../../modules/guard-patrol/services/patrolling-route.service';
import { IncidentReportService } from '../../modules/guard-patrol/services/incident-report.service';
import { ShiftManagementService } from '../../modules/guard-management/services/shift-management.service';
import { Checkpoint, PatrollingRoute, RouteStatus } from '../../modules/guard-patrol/models/patrolling-route.model';
import { CheckpointScan } from '../../modules/guard-patrol/models/checkpoint-scan.model';
import { SosAlertRow, SosApiService } from '../../core/services/sos-api.service';

/** Pending visitor row shown on the guard dashboard. */
export interface GuardDashboardPendingVisitor {
  id: string;
  name: string;
  flatNumber: string;
  purpose: string;
  arrivalTime: string;
  photo?: string;
  ownerName: string;
  vehicleNumber?: string;
}

/** Patrol checkpoint row with scan status for today. */
export interface GuardDashboardCheckpoint {
  id: string;
  location: string;
  status: 'pending' | 'completed' | 'missed';
  time?: string;
  icon: string;
  checkpointCode?: string;
  routeId?: string;
}

/** Active monthly gatepass row for guard gate verification. */
export interface GuardActiveGatepass {
  id: string;
  visitorName: string;
  phone: string;
  flatNumber: string;
  purpose: string;
  validityDays: number;
  endDate: Date;
  photo?: string;
  notes?: string;
}

/** Active recurring visitor (daily help) row for guard gate. */
export interface GuardActiveRecurringVisitor {
  id: string;
  name: string;
  phone: string;
  flatNumber: string;
  purpose: string;
  visitTime: string;
  expectedDuration: number;
  recurringPattern: string;
  photo?: string;
}

/** Summary counters for dashboard stat cards. */
export interface GuardDashboardStats {
  pendingVisitors: number;
  approvedToday: number;
  activeGatepasses: number;
  activeRecurringVisitors: number;
  patrolsCompleted: number;
  totalPatrols: number;
  incidents: number;
}

/** Recent activity feed item. */
export interface GuardDashboardActivity {
  icon: string;
  type: string;
  title: string;
  description: string;
  time: string;
}

/** Current shift banner details. */
export interface GuardShiftInfo {
  shiftLabel: string;
  timeRemaining: string;
}

/** Aggregated payload for the guard home screen. */
export interface GuardDashboardData {
  shift: GuardShiftInfo;
  stats: GuardDashboardStats;
  pendingVisitors: GuardDashboardPendingVisitor[];
  activeGatepasses: GuardActiveGatepass[];
  activeRecurringVisitors: GuardActiveRecurringVisitor[];
  patrolCheckpoints: GuardDashboardCheckpoint[];
  recentActivities: GuardDashboardActivity[];
  activeSosAlerts: SosAlertRow[];
}

/**
 * Loads and mutates guard dashboard data from existing visitor, patrol, shift, and incident APIs.
 */
@Injectable({ providedIn: 'root' })
export class GuardDashboardService {
  constructor(
    private session: SessionContextService,
    private mobileAuth: MobileAuthService,
    private visitorService: VisitorManagementService,
    private checkpointScanService: CheckpointScanService,
    private routeService: PatrollingRouteService,
    private incidentService: IncidentReportService,
    private shiftService: ShiftManagementService,
    private sosApi: SosApiService
  ) {}

  /** Active SOS alerts for the guard's society — polled independently for timely visibility. */
  loadActiveSosAlerts(): Observable<SosAlertRow[]> {
    const societyId = this.session.getSocietyId();
    return this.sosApi.listActiveBySociety(societyId).pipe(catchError(() => of([])));
  }

  /** Guard acknowledges an SOS alert — lets the resident/admin know help is on the way. */
  acknowledgeSos(alertId: string): Observable<SosAlertRow> {
    return this.sosApi.acknowledge(alertId, this.getGuardName());
  }

  /** Logged-in guard user id (mobile session). */
  getGuardId(): string {
    return this.session.getCurrentUserId();
  }

  /** Display name for the logged-in guard. */
  getGuardName(): string {
    return this.mobileAuth.getCurrentUser()?.name ?? 'Guard';
  }

  /** Fetch all dashboard sections in parallel. */
  loadDashboard(): Observable<GuardDashboardData> {
    const guardId = this.getGuardId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString().slice(0, 10);

    return forkJoin({
      pending: this.visitorService.getVisitorsPendingGateApproval().pipe(catchError(() => of([] as Visitor[]))),
      activeGatepasses: this.visitorService.getActiveMonthlyGatepasses().pipe(catchError(() => of([] as MonthlyGatepass[]))),
      activeRecurringVisitors: this.visitorService.getActiveRecurringVisitors().pipe(catchError(() => of([] as RecurringVisitor[]))),
      stats: this.visitorService.getVisitorStatistics().pipe(catchError(() => of(null))),
      routes: this.routeService.getAllRoutes().pipe(catchError(() => of([] as PatrollingRoute[]))),
      scans: this.checkpointScanService
        .getAllScans({ guardId, startDate: todayStart })
        .pipe(catchError(() => of([] as CheckpointScan[]))),
      incidents: this.incidentService.getStatistics().pipe(catchError(() => of(null))),
      assignments: this.shiftService
        .getAssignments({ from: todayIso, to: todayIso })
        .pipe(catchError(() => of([]))),
      activeSosAlerts: this.loadActiveSosAlerts()
    }).pipe(
      map(({ pending, activeGatepasses, activeRecurringVisitors, stats, routes, scans, incidents, assignments, activeSosAlerts }) => {
        const gatepassRows = activeGatepasses.map(gp => this.mapGatepass(gp));
        const recurringRows = activeRecurringVisitors.map(rv => this.mapRecurringVisitor(rv));
        const activeRoute = this.pickTodayRoute(routes);
        const checkpoints = this.buildCheckpoints(activeRoute, scans);
        const completedPatrols = scans.filter(s => s.isValid).length;
        const totalPatrols = checkpoints.length || activeRoute?.checkpoints.length || 0;

        const guardAssignment = assignments.find(a => a.staffId === guardId);
        const shift = this.buildShiftInfo(guardAssignment);

        const approvedToday = stats?.approvedToday ?? 0;

        return {
          shift,
          stats: {
            pendingVisitors: pending.length,
            approvedToday,
            activeGatepasses: gatepassRows.length,
            activeRecurringVisitors: recurringRows.length,
            patrolsCompleted: completedPatrols,
            totalPatrols,
            incidents: incidents?.openIncidents ?? incidents?.incidentsToday ?? 0
          },
          pendingVisitors: pending.slice(0, 5).map(v => this.mapVisitor(v)),
          activeGatepasses: gatepassRows,
          activeRecurringVisitors: recurringRows,
          patrolCheckpoints: checkpoints,
          recentActivities: this.buildRecentActivities(pending, scans),
          activeSosAlerts
        };
      })
    );
  }

  /** Fetch today's patrol progress for the patrol details screen. */
  loadTodayPatrolProgress(): Observable<{
    completed: number;
    total: number;
    checkpoints: GuardDashboardCheckpoint[];
  }> {
    const guardId = this.getGuardId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return forkJoin({
      routes: this.routeService.getAllRoutes().pipe(catchError(() => of([] as PatrollingRoute[]))),
      scans: this.checkpointScanService
        .getAllScans({ guardId, startDate: todayStart })
        .pipe(catchError(() => of([] as CheckpointScan[])))
    }).pipe(
      map(({ routes, scans }) => {
        const activeRoute = this.pickTodayRoute(routes);
        const checkpoints = this.buildCheckpoints(activeRoute, scans);
        return {
          completed: scans.filter(s => s.isValid).length,
          total: checkpoints.length || activeRoute?.checkpoints.length || 0,
          checkpoints
        };
      })
    );
  }

  /** Gate-level approval for a pending visitor. */
  approveVisitor(visitorId: string): Observable<unknown> {
    return this.visitorService.approveAtGateLevel({
      visitorId,
      approvedBy: this.getGuardId()
    });
  }

  /** Gate-level rejection with reason. */
  rejectVisitor(visitorId: string, reason: string): Observable<unknown> {
    return this.visitorService.rejectAtGateLevel({
      visitorId,
      rejectedBy: this.getGuardId(),
      reason
    });
  }

  /** Map API visitor to dashboard card shape. */
  private mapVisitor(v: Visitor): GuardDashboardPendingVisitor {
    return {
      id: v.id,
      name: v.name,
      flatNumber: v.visitingFlat || '—',
      ownerName: v.hostName || 'Resident',
      purpose: v.purpose || 'Visit',
      arrivalTime: v.visitTime || '—',
      photo: v.photo,
      vehicleNumber: v.vehicleNumber
    };
  }

  /** Map monthly gatepass for guard gate list. */
  private mapGatepass(gp: MonthlyGatepass): GuardActiveGatepass {
    return {
      id: gp.id,
      visitorName: gp.visitorName,
      phone: gp.phone,
      flatNumber: gp.visitingFlat || '—',
      purpose: gp.purpose || 'Visit',
      validityDays: gp.validityDays,
      endDate: gp.endDate,
      photo: gp.photo,
      notes: gp.notes
    };
  }

  /** Map recurring visitor (daily help) for guard gate list. */
  private mapRecurringVisitor(rv: RecurringVisitor): GuardActiveRecurringVisitor {
    return {
      id: rv.id,
      name: rv.name,
      phone: rv.phone,
      flatNumber: rv.visitingFlat || '—',
      purpose: rv.purpose || 'Daily Help',
      visitTime: rv.visitTime || '—',
      expectedDuration: rv.expectedDuration || 120,
      recurringPattern: rv.recurringPattern || 'DAILY',
      photo: rv.photo
    };
  }

  /** Full active gatepass list for guard gatepass screen. */
  loadActiveGatepasses(): Observable<GuardActiveGatepass[]> {
    return this.visitorService.getActiveMonthlyGatepasses().pipe(
      map(rows => rows.map(gp => this.mapGatepass(gp))),
      catchError(() => of([]))
    );
  }

  /** Full active recurring visitor list for guard daily-help screen. */
  loadActiveRecurringVisitors(): Observable<GuardActiveRecurringVisitor[]> {
    return this.visitorService.getActiveRecurringVisitors().pipe(
      map(rows => rows.map(rv => this.mapRecurringVisitor(rv))),
      catchError(() => of([]))
    );
  }

  /** Prefer first active route for today's patrol timeline. */
  private pickTodayRoute(routes: PatrollingRoute[]): PatrollingRoute | null {
    const active = routes.filter(r => r.status === RouteStatus.ACTIVE);
    return active[0] ?? routes[0] ?? null;
  }

  /** Merge route checkpoints with today's scan records. */
  private buildCheckpoints(
    route: PatrollingRoute | null,
    scans: CheckpointScan[]
  ): GuardDashboardCheckpoint[] {
    if (!route?.checkpoints?.length) {
      return [];
    }
    const scanByCheckpoint = new Map(scans.map(s => [s.checkpointId, s]));
    return route.checkpoints
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(cp => {
        const scan = scanByCheckpoint.get(cp.id);
        const status: GuardDashboardCheckpoint['status'] = scan
          ? scan.isValid
            ? 'completed'
            : 'missed'
          : 'pending';
        return {
          id: cp.id,
          location: cp.name || cp.location,
          status,
          time: scan
            ? scan.scanTimestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : undefined,
          icon: this.checkpointIcon(cp),
          checkpointCode: cp.checkpointCode ?? cp.qrCode ?? cp.id,
          routeId: route.id
        };
      });
  }

  /** Material icon hint per checkpoint type/location. */
  private checkpointIcon(cp: Checkpoint): string {
    const name = (cp.name || cp.location || '').toLowerCase();
    if (name.includes('gate')) return 'location_on';
    if (name.includes('park')) return 'local_parking';
    if (name.includes('pool')) return 'pool';
    if (name.includes('basement') || name.includes('garage')) return 'garage';
    if (name.includes('play')) return 'child_care';
    if (name.includes('generator') || name.includes('power')) return 'power';
    if (name.includes('terrace') || name.includes('roof')) return 'roofing';
    return 'sensors';
  }

  /** Build shift banner from today's assignment or a default label. */
  private buildShiftInfo(
    assignment?: { shiftName?: string; status?: string } | null
  ): GuardShiftInfo {
    if (assignment?.shiftName) {
      return {
        shiftLabel: assignment.shiftName,
        timeRemaining: assignment.status === 'completed' ? 'Shift completed' : 'On duty'
      };
    }
    return { shiftLabel: 'No shift assigned', timeRemaining: 'Contact supervisor' };
  }

  /** Compose a short activity feed from visitors and scans. */
  private buildRecentActivities(
    pending: Visitor[],
    scans: CheckpointScan[]
  ): GuardDashboardActivity[] {
    const activities: GuardDashboardActivity[] = [];

    scans.slice(0, 3).forEach(scan => {
      activities.push({
        icon: 'route',
        type: 'patrol',
        title: 'Checkpoint Scanned',
        description: `${scan.checkpointName} on ${scan.routeName}`,
        time: this.relativeTime(scan.scanTimestamp)
      });
    });

    pending.slice(0, 3).forEach(v => {
      activities.push({
        icon: 'group_add',
        type: 'pending',
        title: 'Visitor Pending',
        description: `${v.name} for ${v.visitingFlat}`,
        time: this.relativeTime(new Date(v.visitDate))
      });
    });

    return activities.slice(0, 5);
  }

  /** Human-readable relative time for activity feed. */
  private relativeTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }
}
